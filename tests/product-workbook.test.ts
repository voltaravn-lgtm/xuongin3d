import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../src/types.ts';
import { productWorkbookMatrix,readProductWorkbookExtras } from '../src/lib/productWorkbook.ts';
import { readProductExcelOptions } from '../src/lib/productExcelOptions.ts';

test('schema xuất giữ phân loại hơn ba size, giá số và trường nâng cao', () => {
  const p: Product = {id:'P',name:'Test',voltage:'',capacity:'',brand:'',cellType:'',warranty:'',image:'',category:'decor',description:'<p>Mô tả</p>',specs:{'Kích thước':'10 cm'},colors:['Đen'],retailPrice:'2.000.000đ',dealerLevel1Price:'1000000',dealerLevel1DiscountPercent:0,combos:[{id:'combo',name:'Combo'}],variants:Array.from({length:4},(_,i)=>({id:`v${i}`,name:`Size ${i}`,price:'200000',size:'10 cm',stockQuantity:'0'})),defaultVariantId:'v3'};
  const [headers,row] = productWorkbookMatrix([p]);
  const get = (label:string) => String(row[headers.indexOf(label)] ?? '');
  assert.equal(row[headers.indexOf('Giá bán lẻ')],2000000);
  assert.ok(headers.includes('Phân loại 4 - Kích thước'));
  const options=readProductExcelOptions(headers.map(String),get,p.id);
  assert.equal(options.variants?.length,4);
  assert.equal(options.variants?.[3].stockQuantity,'0');
  assert.equal(options.defaultVariantId,'v3');
  const extra=readProductWorkbookExtras(get);
  assert.equal(extra.description,p.description);
  assert.deepEqual(extra.combos,p.combos);
  assert.deepEqual(extra.specs,p.specs);
  assert.equal(extra.dealerLevel1DiscountPercent,0);
});

test('chặn JSON và chiết khấu sai trước khi ghi dữ liệu', () => {
  assert.throws(()=>readProductWorkbookExtras(l=>l==='Combo JSON'?'{}':''),/Combo JSON/);
  assert.throws(()=>readProductWorkbookExtras(l=>l==='Chiết khấu cấp 1 (%)'?'101':''),/0 đến 100/);
});
