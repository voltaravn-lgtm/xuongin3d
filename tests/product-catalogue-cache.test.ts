import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('public API, detail lookup and related catalog share one cached Firestore read', async () => {
  let reads = 0;
  let fail = false;
  const entries = new Map<string, Promise<unknown>>();
  const products = [{ id: 'p', slug: 'product', name: 'SP' }];
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/productData.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies: Record<string, unknown> = {
    'firebase/firestore': { collection: () => ({}), getDocs: async () => { reads++; if (fail) throw new Error('offline'); return { docs: products.map(p => ({ data: () => p })) }; } },
    './firebase': { db: {}, isFirebaseConfigured: true },
    '../data': { PRODUCTS_DATA: [] },
    './productRoutes': { slugifyProductText: (s: string) => s, getProductSlug: (p: any) => p.slug },
    'react': { cache: (fn: unknown) => fn },
    'next/cache': { unstable_cache: (fn: () => Promise<unknown>, keys: string[], options: any) => {
      assert.equal(options.revalidate, 300);
      assert.deepEqual(options.tags.join(','), 'public-products');
      return () => {
        const key = keys.join(',');
        if (!entries.has(key)) entries.set(key, fn().catch(error => { entries.delete(key); throw error; }));
        return entries.get(key);
      };
    } },
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name: string) => dependencies[name], console: { error() {} } });
  const api = module.exports;
  await Promise.all([api.readProductCatalogue(), api.getBuildProducts(), api.findBuildProductByRoute('product')]);
  assert.equal(reads, 1);
  assert.equal((await api.findBuildProductByRoute('product')).id, 'p');
  entries.clear(); fail = true;
  await assert.rejects(api.readProductCatalogue(), /offline/);
  fail = false;
  assert.equal((await api.readProductCatalogue()).length, 1);
  assert.equal(reads, 3);
});

test('admin mount contains no unbounded product preview query', () => {
  const source = readFileSync(new URL('../src/views/Admin/ProductsAdmin.tsx', import.meta.url), 'utf8');
  assert.ok(!source.includes('getDocs(collection(db, "products"))'));
});
