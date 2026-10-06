import test from 'node:test';
import assert from 'node:assert/strict';
import { publishCatalogueBatch, type BatchCatalogueRow, type BatchPending, type BatchWatermark } from '../src/lib/catalogueBatch.ts';
import { parseQuickCatalogue, quickCatalogueProduct, quickCatalogueSku } from '../src/lib/quickCatalogue.ts';
import { catalogueCategories } from '../src/lib/aiCatalogue.ts';

const draft = parseQuickCatalogue({ identified: true, name: 'Bình hoa', category: 'DEC', description: 'Bình hoa có thân gân dọc.', specs: [] }, '');
const wm: BatchWatermark = { enabled: true, logo: '/logo.webp', options: { position: 'top-right', size: 20, opacity: 70, margin: 3 } };
const row = (key: string, count = 1): BatchCatalogueRow => ({ key, name: '', facts: '', category: '', price: '', files: Array.from({ length: count }, (_, i) => new File(['image'], `${key}-${i}.png`, { type: 'image/png' })) });
function harness() {
  const calls = { ai: 0, uploads: [] as string[], saved: [] as any[], states: [] as any[] };
  let ids = 0;
  const deps = {
    identify: async (_row: BatchCatalogueRow) => { calls.ai++; return { draft, usage: { input: 100, output: 50 } }; },
    upload: async (file: File, _watermark: BatchWatermark) => { calls.uploads.push(file.name); return `https://cdn.example/${file.name}.webp`; },
    save: async (product: any) => { calls.saved.push(product); return true; },
    categoryAvailable: (_id: string) => true,
    newId: () => `IN3D-${String(++ids).padStart(12, '0')}`,
    shouldStop: () => false,
    progress: (key: string, state: any) => calls.states.push({ key, ...state }),
  };
  return { calls, deps, pending: new Map<string, BatchPending>() };
}
test('preview does not upload or publish; edited draft publishes without another AI call', async () => {
  const h = harness(); const r = row('preview', 2);
  await publishCatalogueBatch([r], h.pending, wm, { ...h.deps, previewOnly: true });
  assert.equal(h.calls.ai, 1); assert.equal(h.calls.uploads.length, 0); assert.equal(h.calls.saved.length, 0);
  assert.ok(h.calls.states.some(s => s.status === 'preview'));
  const pending = h.pending.get(r.key)!;
  pending.draft = { ...pending.draft, name: 'Tên đã sửa', description: 'Đoạn do người bán chỉnh.\n\nNội dung bổ sung.' };
  r.appendDescriptionImages = true;
  await publishCatalogueBatch([r], h.pending, wm, h.deps);
  assert.equal(h.calls.ai, 1); assert.equal(h.calls.saved[0].name, 'Tên đã sửa');
  assert.match(h.calls.saved[0].description, /<p>Nội dung bổ sung\.<\/p>/);
  assert.equal((h.calls.saved[0].description.match(/<img /g) || []).length, 2);
});

test('SKU stays IN3D for every category, including custom categories', () => {
  assert.equal(quickCatalogueSku('IN3D-ABCD12345678'), 'IN3D-9896');
  for (const category of [...Object.values(catalogueCategories), 'custom']) {
    const p = quickCatalogueProduct(draft, 'IN3D-ABCD12345678', ['https://cdn.example/a.webp'], category);
    assert.notEqual(p.sku, p.id); assert.equal(p.sku, 'IN3D-9896');
  }
});
test('each row owns photos, optional name/price/category and unique SKU', async () => {
  const h = harness(); const a = row('a', 2), b = row('b');
  a.name = 'Tên người bán'; a.price = '200.000'; b.category = 'do-cong-nghe';
  await publishCatalogueBatch([a, b], h.pending, wm, h.deps);
  assert.equal(h.calls.ai, 2); assert.equal(h.calls.saved.length, 2);
  const [p, q] = h.calls.saved;
  assert.equal(p.name, a.name); assert.equal(p.price, '200.000đ'); assert.equal(q.name, 'Bình hoa'); assert.equal(q.price, 'Liên hệ');
  assert.equal(p.sku, 'IN3D-0001'); assert.equal(q.sku, 'IN3D-0002');
  assert.deepEqual(p.images, ['https://cdn.example/a-1.png.webp']); assert.deepEqual(q.images, []);
  assert.equal(JSON.stringify(p).includes('Cần xác nhận'), false);
});
test('AI failure is isolated; following row still publishes', async () => {
  const h = harness(); const original = h.deps.identify;
  h.deps.identify = async r => { if (r.key === 'a') throw new Error('Không nhận diện được'); return original(r); };
  await publishCatalogueBatch([row('a'), row('b')], h.pending, wm, h.deps);
  assert.equal(h.calls.saved.length, 1); assert.equal(h.pending.has('a'), false);
  assert.ok(h.calls.states.some(s => s.key === 'a' && s.status === 'error'));
});
test('changing cover after partial upload keeps every image and resumes without AI or duplicate uploads', async () => {
  const h = harness(); const r = row('a', 5); r.coverIndex = 4;
  const original = h.deps.save; let fail = true;
  h.deps.save = async p => fail ? false : original(p);
  await publishCatalogueBatch([r], h.pending, wm, h.deps);
  r.coverIndex = 2; fail = false;
  await publishCatalogueBatch([r], h.pending, wm, h.deps);
  assert.equal(h.calls.ai, 1); assert.equal(h.calls.uploads.length, 5);
  assert.equal(h.calls.saved[0].image, 'https://cdn.example/a-2.png.webp');
  assert.deepEqual(h.calls.saved[0].images, [0, 1, 3, 4].map(i => `https://cdn.example/a-${i}.png.webp`));
});
test('batch supplies independent seller descriptions and saves optional variants', async () => {
  const h = harness(); const original = h.deps.identify;
  const a = row('a'), b = row('b'); a.description = 'Đèn ngủ, không phải chậu cây'; b.description = 'Bình hoa';
  a.price = '200000'; a.salePrice = '180000'; a.variants = [{ id: 's', name: 'Size S', size: '15 cm', price: '150000' }];
  const seen: string[] = [];
  h.deps.identify = async r => { seen.push(r.description || ''); return original(r); };
  await publishCatalogueBatch([a, b], h.pending, wm, h.deps);
  assert.deepEqual(seen, [a.description, b.description]); assert.equal(h.calls.saved[0].salePrice, '180.000đ');
  assert.equal(h.calls.saved[0].variants[0].price, '150.000đ'); assert.equal(h.calls.saved[1].variants.length, 0);
});
test('retry resumes uploads without another AI call and retains watermark snapshot', async () => {
  const h = harness(); const r = row('a', 2); const original = h.deps.upload;
  let fail = true;
  h.deps.upload = async (file, watermark) => { if (file.name === 'a-1.png' && fail) throw new Error('Upload lỗi'); return original(file, watermark); };
  await publishCatalogueBatch([r], h.pending, wm, h.deps);
  assert.equal(h.pending.get('a')!.urls.length, 1); assert.equal(h.calls.saved.length, 0);
  fail = false;
  await publishCatalogueBatch([r], h.pending, { ...wm, enabled: false, options: { ...wm.options, size: 50 } }, h.deps);
  assert.equal(h.calls.ai, 1); assert.deepEqual(h.calls.uploads, ['a-0.png', 'a-1.png']);
  assert.equal(h.pending.get('a')!.watermark.enabled, true); assert.equal(h.pending.get('a')!.watermark.options.size, 20);
});
test('save retry keeps ID without AI/upload; completed rows never rerun', async () => {
  const h = harness(); let canSave = false; const original = h.deps.save;
  h.deps.save = async p => canSave ? original(p) : false;
  await publishCatalogueBatch([row('a')], h.pending, wm, h.deps);
  const id = h.pending.get('a')!.id; canSave = true;
  await publishCatalogueBatch([row('a')], h.pending, wm, h.deps);
  await publishCatalogueBatch([row('a')], h.pending, wm, h.deps);
  assert.equal(h.calls.ai, 1); assert.equal(h.calls.uploads.length, 1); assert.equal(h.calls.saved.length, 1); assert.equal(h.calls.saved[0].id, id);
});
test('stop after analysis retains draft but prevents uploads, save and next row', async () => {
  const h = harness(); let stopped = false; const original = h.deps.identify;
  h.deps.identify = async r => { const result = await original(r); stopped = true; return result; };
  h.deps.shouldStop = () => stopped;
  await publishCatalogueBatch([row('a'), row('b')], h.pending, wm, h.deps);
  assert.equal(h.calls.ai, 1); assert.equal(h.calls.uploads.length, 0); assert.equal(h.calls.saved.length, 0); assert.ok(h.pending.has('a'));
});
test('invalid images, price and inactive category stop before paid AI calls', async () => {
  const h = harness(); const a = row('a', 13), b = row('b'), c = row('c'); b.price = '0'; c.category = 'hidden';
  h.deps.categoryAvailable = id => id !== 'hidden';
  await publishCatalogueBatch([a, b, c], h.pending, wm, h.deps);
  assert.equal(h.calls.ai, 0); assert.equal(h.calls.saved.length, 0);
  assert.equal(h.calls.states.filter(s => s.status === 'error').length, 3);
});
