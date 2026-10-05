import test from 'node:test';
import assert from 'node:assert/strict';
import { readVariantTemplates, variantsFromTemplates } from '../src/lib/variantTemplates.ts';

test('đọc mẫu đã lưu, giữ tên và kích thước nhưng không sao chép dữ liệu bán hàng', () => {
  const templates = readVariantTemplates(JSON.stringify({
    small: { name: ' Size S ', size: ' Cao 16 cm ', price: '299000', sku: 'OLD', image: 'old.jpg', stockQuantity: '5' },
    medium: { name: 'Trung' },
  }));
  assert.deepEqual(variantsFromTemplates(templates), [
    { id: 'small', name: 'Size S', size: 'Cao 16 cm' },
    { id: 'medium', name: 'Trung', size: '' },
  ]);
  assert.deepEqual(readVariantTemplates(JSON.stringify(templates)), templates);
});

test('dữ liệu local lỗi hoặc phân loại không tên không làm hỏng form', () => {
  for (const raw of [null, 'invalid', 'null', '[]', '123']) {
    assert.deepEqual(readVariantTemplates(raw), {});
  }
  assert.deepEqual(readVariantTemplates('{"empty":{"name":" "},"bad":{"name":123},"ok":{"name":"Lớn"}}'), {
    ok: { name: 'Lớn', size: '' },
  });
});
