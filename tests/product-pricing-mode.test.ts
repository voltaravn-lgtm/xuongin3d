import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../src/types.ts';
import { getSellingProduct, getProductPricingMode } from '../src/lib/productPricingMode.ts';
import { getProductCardPrice } from '../src/lib/productCardPrice.ts';
import { isValidProductSize, resolveProductVariant } from '../src/lib/productSize.ts';
import { readProductExcelOptions } from '../src/lib/productExcelOptions.ts';
import { productWorkbookMatrix } from '../src/lib/productWorkbook.ts';

const original = { id: 'p', name: 'SP', description: '', price: '149000', salePrice: '', voltage: 'Old size', colors: ['Trắng', 'Đen'], specs: {}, variants: [{ id: 'm', name: 'M', price: '99000', size: '20cm' }, { id: 'l', name: 'L', price: '', size: '30cm' }] } as Product;
test('single mode hides sizes/variants, keeps colors and preserves saved variants', () => {
  const single = { ...original, pricingMode: 'single' as const, singleSize: '' };
  const view = getSellingProduct(single);
  assert.equal(view.variants!.length, 0);
  assert.equal(view.voltage, '');
  assert.deepEqual(view.colors, original.colors);
  assert.equal(single.variants!.length, 2);
  assert.equal(getProductCardPrice(single).price, '149000');
  assert.equal(isValidProductSize(single, 'default--color-trang', ''), true);
  assert.equal(isValidProductSize(single, 'm--color-trang', '20cm'), false);
  assert.equal(resolveProductVariant(single, 'm'), undefined);
});
test('single size is a fixed optional dimension, not old global sizes', () => {
  const single = { ...original, pricingMode: 'single' as const, singleSize: '20 × 9 cm' };
  assert.equal(getSellingProduct(single).voltage, '20 × 9 cm');
  assert.equal(isValidProductSize(single, 'default--color-trang', '20 × 9 cm'), true);
  assert.equal(isValidProductSize(single, undefined, ''), false);
});
test('switching back restores variants; blank variant price never inherits a retained single price', () => {
  const variants = { ...original, pricingMode: 'variants' as const };
  const view = getSellingProduct(variants);
  assert.equal(view.variants![1].price, '');
  assert.equal(view.price, undefined);
  assert.equal(getProductCardPrice(variants).price, '99000');
  assert.equal(getProductPricingMode(original), 'variants');
});
test('Excel round-trip preserves single mode and dimensions alongside old variants', () => {
  const single = { ...original, pricingMode: 'single' as const, singleSize: '20cm' };
  const [headers, row] = productWorkbookMatrix([single]);
  const fields = readProductExcelOptions(headers as string[], label => String(row[headers.indexOf(label)] ?? ''), 'p');
  assert.equal(fields.pricingMode, 'single');
  assert.equal(fields.singleSize, '20cm');
  assert.equal(fields.variants!.length, 2);
  assert.equal(fields.variants![1].price, '');
});
