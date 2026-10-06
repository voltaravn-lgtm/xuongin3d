import test from 'node:test';
import assert from 'node:assert/strict';
import { watermarkBounds, watermarkImageFile } from '../src/lib/watermark.ts';
const options = { position: 'bottom-right' as const, size: 20, opacity: 70, margin: 3 };
test('watermark theo phần trăm ảnh, giữ tỷ lệ logo và lề', () => {
  assert.deepEqual(watermarkBounds(1000, 800, 400, 200, options), { width: 200, height: 100, x: 776, y: 676 });
  assert.deepEqual(watermarkBounds(2000, 1600, 400, 200, options), { width: 400, height: 200, x: 1552, y: 1352 });
});
test('căn giữa và góc trên trái đúng vị trí', () => {
  assert.deepEqual(watermarkBounds(1000, 800, 400, 200, { ...options, position: 'center' }), { width: 200, height: 100, x: 400, y: 350 });
  assert.deepEqual(watermarkBounds(1000, 800, 400, 200, { ...options, position: 'top-left' }), { width: 200, height: 100, x: 24, y: 24 });
});

test('ghép logo trước khi xuất WebP, giữ tên và kích thước ảnh gốc', async () => {
  const oldImage = Object.getOwnPropertyDescriptor(globalThis,'Image');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis,'document');
  const draws: unknown[][]=[];
  let exportType='', exportQuality=0;
  const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args: unknown[]){draws.push(args);}};
  const canvas={width:0,height:0,getContext:()=>ctx,toBlob(callback:(blob:Blob)=>void,type:string,quality:number){exportType=type;exportQuality=quality;callback(new Blob(['webp'],{type}));}};
  class MockImage {
    naturalWidth=600;naturalHeight=900;crossOrigin='';onload?:()=>void;
    set src(value:string) { if(value==='logo') {this.naturalWidth=200;this.naturalHeight=100;} queueMicrotask(()=>this.onload?.()); }
  }
  Object.defineProperty(globalThis,'Image',{configurable:true,value:MockImage});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
  try {
    const file=new File(['image'],'anh-san-pham.png',{type:'image/png',lastModified:123});
    const result=await watermarkImageFile(file,'logo',{...options,position:'top-right'});
    assert.equal(result.name,'anh-san-pham.webp');
    assert.equal(result.type,'image/webp');
    assert.equal(result.lastModified,123);
    assert.deepEqual([canvas.width,canvas.height],[600,900]);
    assert.equal(draws.length,2);
    assert.deepEqual(draws[1].slice(1),[462,18,120,60]);
    assert.equal(exportType,'image/webp');
    assert.equal(exportQuality,0.7);
  } finally {
    if(oldImage) Object.defineProperty(globalThis,'Image',oldImage); else Reflect.deleteProperty(globalThis,'Image');
    if(oldDocument) Object.defineProperty(globalThis,'document',oldDocument); else Reflect.deleteProperty(globalThis,'document');
  }
});

test('không âm thầm đăng GIF chưa đóng watermark', async () => {
  await assert.rejects(watermarkImageFile(new File(['gif'],'a.gif',{type:'image/gif'}),'logo',options),/JPG, PNG hoặc WebP/);
});
