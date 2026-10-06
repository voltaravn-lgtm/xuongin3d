import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueProviders, providerRequest } from '../src/lib/aiCatalogueProviders.ts';
import { parseCatalogue, catalogueSections } from '../src/lib/aiCatalogue.ts';

test('supported providers disable thinking; extra profiles cannot choose thinking-only models or public keys', () => {
  const providers = catalogueProviders({});
  const ds = providerRequest(providers[0], 's', 't', ['data:image/jpeg;base64,YQ==']) as any;
  assert.deepEqual(ds.thinking, { type: 'disabled' });
  const gemini = providerRequest(providers[2], 's', 't', []) as any;
  assert.equal(gemini.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal((providerRequest(providers[1], 's', 't', []) as any).model, 'gpt-4.1-mini');
  assert.throws(() => catalogueProviders({ AI_CATALOGUE_PROFILES: JSON.stringify([{ id: 'bad', provider: 'gemini', model: 'gemini-3-pro', keyEnv: 'SECRET' }]) }));
  assert.throws(() => catalogueProviders({ AI_CATALOGUE_PROFILES: JSON.stringify([{ id: 'bad', provider: 'deepseek', model: 'deepseek-flash', keyEnv: 'NEXT_PUBLIC_SECRET' }]) }));
  assert.equal(catalogueProviders({ AI_CATALOGUE_PROFILES: JSON.stringify([{ id: 'ds2', provider: 'deepseek', model: 'deepseek-flash', keyEnv: 'DEEPSEEK_TWO_KEY' }]) }).length, 4);
});
test('unsupported visual guesses become Cần xác nhận; only seller evidence is confirmed', () => {
  const d = parseCatalogue({ name: 'Bình hoa', category: 'DEC', specs: [{ label: 'Chất liệu', value: 'PLA', evidence: 'Chất liệu: PLA' }, { label: 'Công suất', value: '20W', evidence: 'Nhìn ảnh 20W' }] }, 'Chất liệu: PLA');
  assert.equal(d.specs[0].value, 'PLA'); assert.equal(d.specs[1].value, 'Cần xác nhận');
  assert.equal(catalogueSections(d).length, 5);
});
test('fake sources, quotes and prices never become market prices', () => {
  const source = [{ id: 'S1', url: 'https://example.vn/item', title: 'Bình hoa', content: 'Giá bình hoa: 200.000đ' }];
  const size = { name: 'S', dimensions: 'Cần xác nhận', marketPrice: 200000, proposedPrice: 190000, salePrice: 180000, sourceId: 'S1', quote: '200.000đ', reference: true };
  const d = parseCatalogue({ name: 'Bình hoa', category: 'DEC', sizes: [size] }, '', source);
  assert.equal(d.sizes[0].marketPrice, 200000);
  for (const bad of [{ sourceId: 'FAKE' }, { quote: 'Giá thấp: 200.000đ' }, { marketPrice: 300000 }]) {
    const x = parseCatalogue({ name: 'Bình hoa', sizes: [{ ...size, ...bad }] }, '', source);
    assert.equal(x.sizes[0].marketPrice, null); assert.equal(x.sizes[0].proposedPrice, null); assert.equal(x.sizes[0].salePrice, null);
  }
});
test('no research means no prices, and sale cannot exceed proposed price', () => {
  const raw = { name: 'Bình hoa', category: 'invalid', sizes: [{ name: 'S', marketPrice: 200000, proposedPrice: 190000, salePrice: 210000, sourceId: 'S1', quote: '200.000đ' }] };
  assert.equal(parseCatalogue(raw, '').sizes[0].marketPrice, null);
  assert.equal(parseCatalogue(raw, '').category, '');
  assert.equal(parseCatalogue(raw, '', [{ id: 'S1', url: 'https://example.vn', title: '', content: '200.000đ' }]).sizes[0].salePrice, null);
});
