import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPriceInput, priceInputSuggestions } from '../src/lib/priceInput.ts';

test('thêm dấu nghìn, giữ nguyên giá liên hệ và xử lý xóa/rỗng', () => {
  assert.equal(formatPriceInput('2000000'), '2.000.000');
  assert.equal(formatPriceInput('2.000.000'), '2.000.000');
  assert.equal(formatPriceInput('035000'), '35.000');
  assert.equal(formatPriceInput('259.000đ'), '259.000');
  assert.equal(formatPriceInput('Liên hệ'), 'Liên hệ');
  assert.equal(formatPriceInput(''), '');
  assert.equal(formatPriceInput('0'), '0');
});
test('gợi ý theo số nhập, không tự thay giá hoặc gợi ý giá đã đủ dài', () => {
  assert.deepEqual(priceInputSuggestions('2'), ['20.000', '200.000', '2.000.000']);
  assert.deepEqual(priceInputSuggestions('35'), ['35.000', '350.000', '3.500.000']);
  assert.deepEqual(priceInputSuggestions('350.000'), []);
  assert.deepEqual(priceInputSuggestions('Liên hệ'), []);
  assert.deepEqual(priceInputSuggestions('0'), []);
});
