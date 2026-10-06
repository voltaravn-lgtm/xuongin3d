import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpecText, parseSpecsClipboard, confirmedSpecText } from '../src/lib/productSpecsPaste.ts';

test('colon pairs, bullets, numbering, CRLF and full-width colon', () => {
  assert.deepEqual(parseSpecText('3. THÔNG TIN KỸ THUẬT\r\n• Chất liệu: PLA\r\n- Kích thước：15 × 20 cm\n1. Nguồn điện: Không sử dụng điện.'), [
    ['Chất liệu', 'PLA'], ['Kích thước', '15 × 20 cm'], ['Nguồn điện', 'Không sử dụng điện.'],
  ]);
});
test('keep table separators, skip empty fields and retain value colons', () => {
  assert.deepEqual(parseSpecsClipboard('Chất liệu\tPLA\nKích thước  20 cm\nRỗng:\n: Thiếu tên\nLink: https://example.com/a\nGiờ: 12:30\nhttps://example.com'), [
    ['Chất liệu', 'PLA'], ['Kích thước', '20 cm'], ['Link', 'https://example.com/a'], ['Giờ', '12:30'],
  ]);
});
test('quick fields overwrite duplicate keys but do not confirm proposals', () => {
  assert.deepEqual(confirmedSpecText('Chất liệu: PETG\nChất liệu: PLA\nDung tích đề xuất: khoảng 300 ml\nCông suất: Cần xác nhận'), { 'Chất liệu': 'PLA' });
});
