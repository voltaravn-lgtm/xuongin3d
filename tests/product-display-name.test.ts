import test from 'node:test';
import assert from 'node:assert/strict';
import { productDisplayName, productNameWithSku } from '../src/lib/productDisplayName.ts';

test('public title appends existing SKU without changing the stored product name', () => {
  assert.equal(productNameWithSku('Đèn ngủ', 'IN3D-0123'), 'Đèn ngủ | IN3D-0123');
  assert.equal(productNameWithSku('Đèn ngủ', ''), 'Đèn ngủ');
  assert.equal(productNameWithSku('Đèn ngủ - IN3D-0123', 'IN3D-0123'), 'Đèn ngủ - IN3D-0123');
  assert.equal(productDisplayName('ĐÈN LED IN 3D', 'IN3D-0123'), 'Đèn LED in 3D | IN3D-0123');
});
