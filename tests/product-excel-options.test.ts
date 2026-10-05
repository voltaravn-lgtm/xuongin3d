import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import type { Product } from '../src/types.ts';
import { readProductExcelOptions, variantExcelFields, variantExcelHeader } from '../src/lib/productExcelOptions.ts';

const parse = (row: Record<string, string>, existing?: Product) => readProductExcelOptions(Object.keys(row), (label) => row[label] || '', 'TEST001', existing);

test('mẫu Excel thực tế nhập được màu, giá ba size và chọn sẵn', () => {
  const wb = XLSX.readFile('public/downloads/mau-nhap-san-pham-xuong-in-3d.xlsx');
  const matrix = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {header:1,defval:'',raw:true});
  const row = Object.fromEntries(matrix[0].map((header, i) => [header, String(matrix[1][i] ?? '')]));
  const result = parse(row);
  assert.deepEqual(result.colors, ['Trắng', 'Vàng']);
  assert.equal(row['Kích thước / quy mô'], '12cm, 15cm, 20cm');
  assert.equal(result.variants?.length, 3);
  assert.equal(result.variants?.[1].price?.replace(/\D/g, ''), '150000');
  assert.equal(result.defaultVariantId, result.variants?.[1].id);
  assert.equal(result.variants?.[0].image, '');
});

test('file cũ không có cột mới giữ dữ liệu hiện tại', () => {
  const existing = { colors:['Trắng'], orderNote:'Ghi chú cũ', variants:[{id:'v1',name:'Size S',price:'120000'}], defaultVariantId:'v1' } as Product;
  const result = parse({}, existing);
  assert.deepEqual(result, { colors:existing.colors,orderNote:existing.orderNote,variants:existing.variants,defaultVariantId:'v1' });
});

test('xuất rồi nhập lại giữ ID, giá giảm, ảnh, tồn 0 và chọn sẵn', () => {
  const variants = [
    { id:'old-a',name:'Size S',price:'120000',salePrice:'100000',sku:'TEST-S',stockQuantity:'0',image:'https://example.com/s.jpg',stockStatus:'out-of-stock' },
    { id:'old-b',name:'Size M',price:'150000',salePrice:'',sku:'TEST-M',stockQuantity:'8',image:'',stockStatus:'in-stock' },
  ];
  const keys = ['id','name','price','salePrice','sku','stockQuantity','image','stockStatus'] as const;
  const row: Record<string,string> = {'Màu sắc':'Trắng, Vàng','Phân loại chọn sẵn':'2'};
  variants.forEach((variant,index) => variantExcelFields.forEach((field,i) => { row[variantExcelHeader(index+1,field)] = variant[keys[i]]; }));
  const parsed = parse(row);
  assert.deepEqual(parsed.variants, variants);
  assert.equal(parsed.defaultVariantId, 'old-b');
});

test('hỗ trợ phân loại 4 trở lên, bỏ màu trùng, xóa màu bằng dấu -', () => {
  assert.equal(parse({'Phân loại 4 - Tên':'Size XL','Phân loại 4 - Giá bán':'250000','Phân loại chọn sẵn':'4'}).variants?.[0].name,'Size XL');
  assert.deepEqual(parse({'Màu sắc':'Xanh, Trắng, Xanh'}).colors,['Xanh','Trắng']);
  assert.deepEqual(parse({'Màu sắc':'-'}).colors,[]);
});

test('chặn chỉ số chọn sẵn không tồn tại và ID phân loại trùng', () => {
  assert.throws(() => parse({'Phân loại 1 - Tên':'S','Phân loại chọn sẵn':'3'}), /chọn sẵn/);
  assert.throws(() => parse({'Phân loại 1 - Tên':'S','Phân loại 1 - ID':'same','Phân loại 2 - Tên':'M','Phân loại 2 - ID':'same'}), /trùng/);
});
