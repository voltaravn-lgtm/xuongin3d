import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../src/types.ts';
import { getProductCardPrice } from '../src/lib/productCardPrice.ts';
import { readVariantTemplates, variantsFromTemplates } from '../src/lib/variantTemplates.ts';
import { readProductExcelOptions } from '../src/lib/productExcelOptions.ts';
import { productWorkbookMatrix } from '../src/lib/productWorkbook.ts';

const product = { id: 'p', name: 'SP', description: '', price: '999000', variants: [
  { id: 's', name: 'S', price: '10000', hidden: true },
  { id: 'm', name: 'M', price: '20000', hidden: false },
] } as Product;
test('card price ignores hidden cheapest variant and does not show base price if all hidden', () => {
  assert.equal(getProductCardPrice(product).price, '20000');
  assert.equal(getProductCardPrice({ ...product, variants: product.variants!.map(v => ({ ...v, hidden: true })) }).price, 'Liên hệ');
});
test('remembered local template keeps only name, never dimensions or hidden status', () => {
  const values = variantsFromTemplates(readVariantTemplates(JSON.stringify({ s: { name: 'S', size: '10cm', hidden: true, price: '10000' } })));
  assert.deepEqual(values, [{ id: 's', name: 'S' }]);
});
test('Excel backup preserves visibility and never defaults to a hidden variant', () => {
  const [headers, row] = productWorkbookMatrix([product]);
  const options = readProductExcelOptions(headers as string[], label => String(row[headers.indexOf(label)] ?? ''), product.id);
  assert.equal(options.variants![0].hidden, true);
  assert.equal(options.variants![1].hidden, false);
  assert.equal(options.defaultVariantId, 'm');
});
