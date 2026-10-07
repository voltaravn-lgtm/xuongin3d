import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness() {
  const records = new Map<string, any>();
  let fail = false;
  let batchCount = 0;
  let failedBatch = 0;
  const module = { exports: {} as any };
  const firestore = {
    doc: (_db: unknown, collection: string, id: string) => `${collection}/${id}`,
    serverTimestamp: () => ({ serverTimestamp: true }),
    Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
    writeBatch: () => {
      const paths: string[] = [];
      return {
        delete: (path: string) => paths.push(path),
        commit: async () => {
          batchCount++;
          if (fail || batchCount === failedBatch) throw new Error('commit failed');
          paths.forEach(path => records.delete(path));
        },
      };
    },
    runTransaction: async (_db: unknown, operation: any) => {
      const writes: Array<() => void> = [];
      const result = await operation({
        get: async (path: string) => ({ exists: () => records.has(path), data: () => records.get(path) }),
        set: (path: string, value: any) => writes.push(() => records.set(path, value)),
        delete: (path: string) => writes.push(() => records.delete(path)),
      });
      if (fail) throw new Error('commit failed');
      writes.forEach(write => write());
      return result;
    },
  };
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/productTrash.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, require: (name: string) => name === 'firebase/firestore' ? firestore : { db: {} }, Date, JSON, Number, Error });
  return { api: module.exports, records, fail: () => { fail = true; }, failBatch: (index: number) => { failedBatch = index; } };
}
const product = { id: 'IN3D-ABC123456789', name: 'Đèn ngủ', sku: 'IN3D-1234', hidden: false, image: 'https://cdn.example/cover.webp', description: 'Nội dung', slug: 'den-ngu-in3d-1234', specs: { 'Chất liệu': 'PLA' } };

test('trash commits original server snapshot and removes active doc atomically', async () => {
  const h = harness(); const latest = { ...product, description: 'Bản mới nhất' };
  h.records.set(`products/${product.id}`, latest);
  const before = Date.now();
  await h.api.trashProduct(product);
  assert.equal(h.records.has(`products/${product.id}`), false);
  const trash = h.records.get(`productTrash/${product.id}`);
  assert.equal(trash.product, latest);
  assert.ok(trash.expiresAt.toMillis() >= before + 7 * 86400000);
  assert.ok(trash.expiresAt.toMillis() <= Date.now() + 7 * 86400000);
  assert.equal(trash.deletedAt.serverTimestamp, true);
  await assert.rejects(h.api.trashProduct(product), /đã nằm/);
});
test('failed commit never removes active product or creates trash', async () => {
  const h = harness(); h.records.set(`products/${product.id}`, product); h.fail();
  await assert.rejects(h.api.trashProduct(product), /commit failed/);
  assert.equal(h.records.get(`products/${product.id}`), product);
  assert.equal(h.records.has(`productTrash/${product.id}`), false);
});
test('restore keeps full original data, ID and URL, removes trash and cannot repeat', async () => {
  const h = harness(); h.records.set(`products/${product.id}`, product);
  await h.api.trashProduct(product);
  const restored = await h.api.restoreTrashedProduct(product.id);
  assert.equal(restored, product);
  assert.equal(h.records.get(`products/${product.id}`), product);
  assert.equal(h.records.has(`productTrash/${product.id}`), false);
  await assert.rejects(h.api.restoreTrashedProduct(product.id), /khôi phục trước/);
});
test('expiry boundary and conflicting ID prohibit restore without losing backup', async () => {
  const h = harness(); const now = Date.now();
  assert.equal(h.api.canRestoreProduct({ toMillis: () => now }, now), false);
  assert.equal(h.api.canRestoreProduct({ toMillis: () => now + 1 }, now), true);
  assert.equal(h.api.canRestoreProduct(undefined, now), false);
  h.records.set(`productTrash/${product.id}`, { product, expiresAt: { toMillis: () => now - 1 } });
  await assert.rejects(h.api.restoreTrashedProduct(product.id), /quá 7 ngày/);
  assert.equal(h.records.has(`productTrash/${product.id}`), true);
  h.records.set(`productTrash/${product.id}`, { product, expiresAt: { toMillis: () => Date.now() + 100000 } });
  h.records.set(`products/${product.id}`, { ...product, name: 'Sản phẩm khác' });
  await assert.rejects(h.api.restoreTrashedProduct(product.id), /đang được sử dụng/);
  assert.equal(h.records.get(`products/${product.id}`).name, 'Sản phẩm khác');
});

test('permanent delete removes selected expired or unexpired backups only', async () => {
  const h = harness();
  h.records.set(`products/${product.id}`, product);
  h.records.set(`productTrash/${product.id}`, { product, expiresAt: { toMillis: () => Date.now() + 100000 } });
  h.records.set('productTrash/expired', { product, expiresAt: { toMillis: () => 0 } });
  h.records.set('productTrash/keep', { product });
  h.records.set('productSkuRegistry/IN3D-1234', { id: product.id });
  const result = await h.api.permanentlyDeleteTrashedProducts([product.id, 'expired', product.id]);
  assert.deepEqual(Array.from(result.deletedIds), [product.id, 'expired']);
  assert.equal(result.failedIds.length, 0);
  assert.equal(h.records.has(`productTrash/${product.id}`), false);
  assert.equal(h.records.has('productTrash/expired'), false);
  assert.equal(h.records.has('productTrash/keep'), true);
  assert.equal(h.records.get(`products/${product.id}`), product);
  assert.equal(h.records.has('productSkuRegistry/IN3D-1234'), true);
});

test('bulk permanent delete reports failed chunks and retains their backups', async () => {
  const h = harness(); const ids = Array.from({ length: 405 }, (_, index) => `id-${index}`);
  ids.forEach(id => h.records.set(`productTrash/${id}`, { product }));
  h.failBatch(2);
  const result = await h.api.permanentlyDeleteTrashedProducts(ids);
  assert.equal(result.deletedIds.length, 400);
  assert.deepEqual(Array.from(result.failedIds), ids.slice(400));
  assert.match(result.error, /commit failed/);
  ids.slice(0, 400).forEach(id => assert.equal(h.records.has(`productTrash/${id}`), false));
  ids.slice(400).forEach(id => assert.equal(h.records.has(`productTrash/${id}`), true));
  await assert.rejects(h.api.permanentlyDeleteTrashedProducts(['products/another']), /không hợp lệ/);
});
