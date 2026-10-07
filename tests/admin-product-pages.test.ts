import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness() {
  const products = Array.from({ length: 2000 }, (_, i) => ({ id: `IN3D-${String(i).padStart(4, '0')}`, sku: `IN3D-${String(i).padStart(4, '0')}`, name: `SP ${i}` }));
  const stats = { documents: 0, counts: 0, queries: [] as any[] };
  const auth = { currentUser: { uid: 'employee-a' } };
  let time = 1000, fail = false;
  const storage: any = { getItem(key: string) { return this[key] ?? null; }, setItem(key: string, value: string) { this[key] = value; }, removeItem(key: string) { delete this[key]; } };
  const events: any[] = [];
  const firestore = {
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (_db: unknown, name: string, id: string) => ({ name, id }),
    documentId: () => '__name__',
    orderBy: (field: string, direction: string) => ({ orderBy: field, direction }),
    startAfter: (id: string) => ({ cursor: id }),
    limit: (value: number) => ({ limit: value }),
    where: (field: string, op: string, value: string) => ({ field, op, value }),
    query: (collection: unknown, ...constraints: any[]) => ({ collection, constraints }),
    getDocs: async (request: any) => {
      stats.queries.push(request);
      if (fail) throw new Error('offline');
      const constraints = request.constraints || [];
      let rows: any[] = (request.collection || request).name === 'productPrintFiles'
        ? [{ id: 'IN3D-1999', url: 'https://example.com/file' }, { id: 'IN3D-1998', url: '' }]
        : [...products].reverse();
      const cursor = constraints.find((item: any) => item.cursor)?.cursor;
      if (cursor) rows = rows.filter(item => item.id < cursor);
      const filter = constraints.find((item: any) => item.field);
      if (filter) rows = rows.filter((item: any) => filter.op === 'in' ? filter.value.includes(item.id) : item[filter.field] === filter.value);
      const size = constraints.find((item: any) => item.limit)?.limit;
      if (size) rows = rows.slice(0, size);
      stats.documents += rows.length;
      return { docs: rows.map(item => ({ id: item.id, data: () => item })) };
    },
    getCountFromServer: async () => { stats.counts++; return { data: () => ({ count: products.length }) }; },
    getDoc: async (ref: any) => { stats.documents++; const item = products.find(item => item.id === ref.id); return { id: ref.id, exists: () => !!item, data: () => item }; },
  };
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/adminProductPages.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  class Clock extends Date { static now() { return time; } }
  vm.runInNewContext(code, { exports: module.exports, module, require: (name: string) => name === 'firebase/firestore' ? firestore : { db: {}, auth }, sessionStorage: storage, Date: Clock, Event: class { type: string; constructor(type: string) { this.type = type; } }, window: { dispatchEvent: (event: unknown) => events.push(event) } });
  return { api: module.exports, stats, auth, events, advance: (ms: number) => { time += ms; }, fail: (value: boolean) => { fail = value; } };
}

test('2000-product catalog reads only requested page and uses cursor, never offset', async () => {
  const h = harness();
  const first = await h.api.loadAdminProductPage(12);
  assert.equal(first.products.length, 12);
  assert.equal(h.stats.documents, 12);
  assert.equal(await h.api.loadAdminProductTotal(), 2000);
  const next = await h.api.loadAdminProductPage(12, first.cursor);
  assert.equal(next.products.length, 12);
  assert.equal(h.stats.documents, 24);
  assert.equal(new Set([...first.products, ...next.products].map(item => item.id)).size, 24);
  assert.ok(h.stats.queries.every(request => request.constraints.some((item: any) => item.limit === 12)));
  assert.ok(h.stats.queries.every(request => !request.constraints.some((item: any) => item.offset)));
  await assert.rejects(h.api.loadAdminProductPage(2000), /không hợp lệ/);
});

test('repeat requests and concurrent mounts share cache; TTL and user changes reload', async () => {
  const h = harness();
  await Promise.all([h.api.loadAdminProductPage(24), h.api.loadAdminProductPage(24)]);
  await h.api.loadAdminProductPage(24);
  await h.api.loadAdminProductTotal(); await h.api.loadAdminProductTotal();
  assert.equal(h.stats.documents, 24); assert.equal(h.stats.counts, 1);
  h.advance(h.api.ADMIN_PRODUCT_CACHE_MS + 1);
  await h.api.loadAdminProductPage(24); assert.equal(h.stats.documents, 48);
  h.auth.currentUser.uid = 'employee-b';
  await h.api.loadAdminProductPage(24); assert.equal(h.stats.documents, 72);
});

test('invalidation after mutations discards page/count caches; failure does not cache empty rows', async () => {
  const h = harness(); await h.api.loadAdminProductPage(48); await h.api.loadAdminProductTotal();
  h.api.invalidateAdminProductPages();
  await h.api.loadAdminProductPage(48); await h.api.loadAdminProductTotal();
  assert.equal(h.stats.documents, 96); assert.equal(h.stats.counts, 2); assert.equal(h.events.length, 1);
  h.api.invalidateAdminProductPages(); h.fail(true);
  await assert.rejects(h.api.loadAdminProductPage(12), /offline/);
  h.fail(false); const next = await h.api.loadAdminProductPage(12);
  assert.equal(next.products.length, 12);
});

test('exact SKU lookup avoids full scan; full catalog is a separate deliberate action', async () => {
  const h = harness();
  const matches = await h.api.findAdminProductCode(' in3d-0042 ');
  assert.equal(matches.length, 1); assert.equal(matches[0].id, 'IN3D-0042');
  assert.equal(h.stats.documents, 2);
  const all = await h.api.loadAdminProductCatalogue(); assert.equal(all.length, 2000);
  await h.api.loadAdminProductCatalogue(); assert.equal(h.stats.documents, 2002);
});
test('legacy print flags query only visible IDs, cache results, and update without page rereads', async () => {
  const h = harness();
  const page = await h.api.loadAdminProductPage(48);
  const flags = await h.api.loadAdminPrintFileStatuses(page.products);
  assert.equal(flags['IN3D-1999'], true);
  assert.equal(flags['IN3D-1998'], false);
  assert.equal(flags['IN3D-1997'], false);
  const lookups = h.stats.queries.filter(q => q.collection.name === 'productPrintFiles');
  assert.equal(lookups.length, 2);
  assert.ok(lookups.every(q => q.constraints[0].value.length <= 30));
  await h.api.loadAdminPrintFileStatuses(page.products);
  assert.equal(h.stats.queries.length, 3);
  h.api.cacheAdminPrintFileStatus('IN3D-1999', false);
  const restored = await h.api.loadAdminProductPage(48);
  assert.equal(restored.products[0].hasPrintFile, false);
  assert.equal((await h.api.loadAdminPrintFileStatuses(page.products))['IN3D-1999'], false);
});
test('products with explicit print flags need no private collection lookup', async () => {
  const h = harness();
  assert.deepEqual(JSON.parse(JSON.stringify(await h.api.loadAdminPrintFileStatuses([
    { id: 'a', hasPrintFile: true }, { id: 'b', hasPrintFile: false },
  ]))), { a: true, b: false });
  assert.equal(h.stats.queries.length, 0);
});
