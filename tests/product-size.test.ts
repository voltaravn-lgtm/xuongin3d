import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../src/types.ts';
import { isValidProductSize, resolveProductVariant } from '../src/lib/productSize.ts';

const product = {voltage:'15cm, 20cm',variants:[{id:'small',name:'Size S',size:'Cao 16 cm'}, {id:'large',name:'Size L',size:'Cao 30 cm'}, {id:'other',name:'Khác'}]} as Product;
test('kích thước riêng khóa theo phân loại, không theo kích thước chung', () => {
  assert.equal(isValidProductSize(product,'small--size-cao16--color-trang','Cao 16 cm'),true);
  assert.equal(isValidProductSize(product,'small','20cm'),false);
  assert.equal(isValidProductSize(product,'large','Cao 16 cm'),false);
  assert.equal(isValidProductSize(product,'small',''),false);
});
test('phân loại không có kích thước riêng giữ lựa chọn chung', () => {
  assert.equal(isValidProductSize(product,'other','15cm'),true);
  assert.equal(isValidProductSize(product,'other',''),false);
  assert.equal(isValidProductSize({voltage:'',variants:[]} as unknown as Product,undefined,''),true);
});
test('nhận dạng ID giỏ hàng có màu/size và chặn ID không hợp lệ', () => {
  assert.equal(resolveProductVariant(product,'small--color-trang')?.id,'small');
  assert.equal(isValidProductSize(product,'fake','Cao 16 cm'),false);
  assert.equal(isValidProductSize(product,undefined,'15cm'),false);
});
test('phân loại ẩn không được chọn kể cả dùng ID giỏ hàng cũ; hiện lại thì dùng được', () => {
  const changed = { ...product, variants: product.variants!.map(v => ({ ...v, hidden: v.id === 'small' })) };
  assert.equal(resolveProductVariant(changed, 'small--color-trang'), undefined);
  assert.equal(isValidProductSize(changed, 'small--size-cao16', 'Cao 16 cm'), false);
  assert.equal(isValidProductSize(changed, 'large', 'Cao 30 cm'), true);
  changed.variants[0].hidden = false;
  assert.equal(isValidProductSize(changed, 'small', 'Cao 16 cm'), true);
});
test('ẩn hết phân loại không biến sản phẩm thành loại không có phân loại để mua', () => {
  const changed = { ...product, variants: product.variants!.map(v => ({ ...v, hidden: true })) };
  assert.equal(isValidProductSize(changed, undefined, '15cm'), false);
});
