import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickCatalogue, quickCatalogueProduct, quickCataloguePrice, quickCataloguePrompt, quickCatalogueContext, quickCatalogueExtras, quickCatalogueMaxDescription, quickCatalogueMaxOutputTokens, quickCatalogueDescriptionHtml, quickCatalogueParagraphs } from '../src/lib/quickCatalogue.ts';
import { providerRequest, catalogueProviders } from '../src/lib/aiCatalogueProviders.ts';

const raw = { identified: true, name: 'Bình hoa gân dọc', category: 'DEC', description: 'Bình hoa có thân tròn với các đường gân dọc.', specs: [] };
test('seller description guides identity/translation and context stays within server limit', () => {
  const facts = quickCatalogueContext('Đèn ngủ', 'Bedside lamp, not a planter', 'Chất liệu: PLA');
  assert.ok(facts.includes('Đèn ngủ')); assert.ok(facts.includes('Bedside lamp, not a planter'));
  assert.ok(quickCataloguePrompt.includes('không đổi thành chậu cây'));
  assert.ok(quickCataloguePrompt.includes('Dịch mô tả ngoại ngữ'));
  assert.ok(quickCatalogueContext('a'.repeat(140), 'b'.repeat(1000), 'c'.repeat(1500)).length <= 3000);
  assert.throws(() => quickCatalogueContext('', 'x'.repeat(1001), ''));
});
test('optional confirmed prices and variants are formatted and saved without AI guesses', () => {
  const extras = { salePrice: '180000', variants: [{ id: 's', name: 'Size S', price: '150000', salePrice: '120000', size: 'Cao 15 cm' }, { id: 'm', name: 'Size M' }] };
  const p = quickCatalogueProduct(parseQuickCatalogue(raw, ''), 'IN3D-ABCD12345678', ['https://cdn.example/a.webp'], '', '200000', extras);
  assert.equal(p.salePrice, '180.000đ'); assert.equal(p.defaultVariantId, 's');
  assert.equal(p.variants![0].price, '150.000đ'); assert.equal(p.variants![0].size, 'Cao 15 cm'); assert.equal(p.variants![1].price, '');
  assert.throws(() => quickCatalogueExtras('100000', { salePrice: '200000' }));
  assert.throws(() => quickCatalogueExtras('', { salePrice: '100000' }));
  assert.throws(() => quickCatalogueExtras('', { variants: [{ id: 'x', name: '' }] }));
  assert.throws(() => quickCatalogueExtras('100000', { variants: [{ id: 'x', name: 'S', salePrice: '200000' }] }));
});
test('quick output omits every unsupported field instead of generating Cần xác nhận', () => {
  const d = parseQuickCatalogue({ ...raw, specs: [{ label: 'Chất liệu', value: 'PLA', evidence: '' }, { label: 'Trọng lượng', value: '200g', evidence: '200g' }] }, '');
  assert.deepEqual(d.specs, {});
  const p = quickCatalogueProduct(d, 'IN3D-ABCD12345678', ['https://cdn.example/a.webp', 'https://cdn.example/b.webp']);
  assert.equal(p.sku, 'IN3D-9896'); assert.equal(p.hidden, false); assert.equal(p.price, 'Liên hệ');
  assert.equal(p.category, 'den-do-decor-trang-tri'); assert.equal(p.image, 'https://cdn.example/a.webp');
  assert.deepEqual(p.images, ['https://cdn.example/b.webp']); assert.deepEqual(p.variants, []);
  for (const key of ['cellType', 'warranty', 'capacity', 'voltage']) assert.equal(p[key], '');
  assert.equal(JSON.stringify(p).includes('Cần xác nhận'), false);
});
test('only confirmed seller facts are included in technical specs', () => {
  const d = parseQuickCatalogue({ ...raw, specs: [{ label: 'Chất liệu', value: 'PLA', evidence: 'Chất liệu: PLA' }, { label: 'Điện áp', value: '220V', evidence: '220V' }] }, 'Chất liệu: PLA');
  assert.deepEqual(d.specs, { 'Chất liệu': 'PLA' });
});
test('unidentified, uncertain, unknown category, and overlong descriptions stop before posting', () => {
  for (const bad of [{ identified: false }, { category: 'UNKNOWN' }, { name: 'Cần xác nhận' }, { description: 'Cần xác nhận' }, { description: '' }, { description: 'x'.repeat(quickCatalogueMaxDescription + 1) }]) assert.throws(() => parseQuickCatalogue({ ...raw, ...bad }, ''));
});
test('listing HTML is escaped, confirmed price is formatted and bad inputs cannot be published', () => {
  const d = parseQuickCatalogue({ ...raw, description: '<script>alert(1)</script>' }, '');
  const p = quickCatalogueProduct(d, 'IN3D-ABCD12345678', ['https://cdn.example/a.webp'], 'do-cong-nghe', '2.000.000');
  assert.equal(p.description.includes('<script>'), false); assert.equal(p.price, '2.000.000đ'); assert.equal(p.category, 'do-cong-nghe');
  assert.equal(quickCataloguePrice(''), 'Liên hệ'); assert.throws(() => quickCataloguePrice('0'));
  assert.throws(() => quickCatalogueProduct(d, 'IN3D-ABCD12345678', []));
  assert.throws(() => quickCatalogueProduct(d, 'bad-id', ['https://cdn.example/a.webp']));
});
test('quick request supports multi-paragraph copy with bounded output and thinking disabled', () => {
  assert.ok(quickCataloguePrompt.length < 2300);
  assert.equal(quickCatalogueMaxOutputTokens, 1200);
  const profiles = catalogueProviders({});
  for (const p of profiles) {
    const body: any = providerRequest(p, quickCataloguePrompt, '', ['data:image/jpeg;base64,YQ=='], quickCatalogueMaxOutputTokens);
    if (p.provider === 'gemini') { assert.equal(body.generationConfig.maxOutputTokens, 1200); assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0); }
    else { assert.equal(body.max_tokens, 1200); if (p.provider === 'deepseek') assert.equal(body.thinking.type, 'disabled'); }
  }
});
test('long copy keeps paragraph breaks on publication without permitting HTML injection', () => {
  const description = ['Giới thiệu ' + 'a'.repeat(180), 'Thiết kế ' + 'b'.repeat(180), 'Không gian ' + 'c'.repeat(180), 'Gợi ý <script>alert(1)</script>'].join('\n\n');
  const d = parseQuickCatalogue({ ...raw, description }, '');
  assert.equal(d.description, description);
  const p = quickCatalogueProduct(d, 'IN3D-ABCD12345678', ['https://cdn.example/a.webp']);
  assert.equal((p.description.match(/<p>/g) || []).length, 4);
  assert.equal(p.description.includes('<script>'), false);
  assert.equal(quickCatalogueDescriptionHtml('Một\r\n\r\nHai\nBa'), '<p>Một</p><p>Hai</p><p>Ba</p>');
});
test('one-block AI response is automatically split into paragraphs without another AI call', () => {
  const text = 'Đây là giá đỡ điện thoại. Thiết kế có thân uốn cong. Màu sắc là đen và xanh. Có thể đặt trên bàn làm việc. Đây có thể là gợi ý quà tặng.';
  const d = parseQuickCatalogue({ ...raw, description: text }, '');
  assert.equal(d.description.split('\n\n').length, 5);
  assert.equal(d.description.replace(/\s+/g, ' '), text);
  assert.equal((quickCatalogueDescriptionHtml(text).match(/<p>/g) || []).length, 5);
  assert.equal(quickCatalogueParagraphs('Một.\\n\\nHai.'), 'Một.\n\nHai.');
  assert.equal(quickCatalogueParagraphs('Đoạn một.\n\nĐoạn hai.'), 'Đoạn một.\n\nĐoạn hai.');
  assert.equal(quickCatalogueParagraphs('Ngắn gọn.'), 'Ngắn gọn.');
});
test('any of five uploaded photos can be cover without hiding or dropping others', () => {
  const urls = Array.from({ length: 5 }, (_, i) => `https://cdn.example/${i}.webp`);
  const d = parseQuickCatalogue(raw, '');
  for (let coverIndex = 0; coverIndex < 5; coverIndex++) {
    const p = quickCatalogueProduct(d, 'IN3D-ABCD12345678', urls, '', '', { coverIndex });
    assert.equal(p.image, urls[coverIndex]); assert.deepEqual(p.images, urls.filter((_, i) => i !== coverIndex));
    assert.equal(new Set([p.image, ...p.images!]).size, 5);
  }
  assert.throws(() => quickCatalogueProduct(d, 'IN3D-ABCD12345678', urls, '', '', { coverIndex: 5 }));
  assert.throws(() => quickCatalogueProduct(d, 'IN3D-ABCD12345678', urls, '', '', { coverIndex: -1 }));
});
