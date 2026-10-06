import test from 'node:test';
import assert from 'node:assert/strict';
import { watermarkBounds } from '../src/lib/watermark.ts';
const options = { position: 'bottom-right' as const, size: 20, opacity: 70, margin: 3 };
test('watermark theo phần trăm ảnh, giữ tỷ lệ logo và lề', () => {
  assert.deepEqual(watermarkBounds(1000, 800, 400, 200, options), { width: 200, height: 100, x: 776, y: 676 });
  assert.deepEqual(watermarkBounds(2000, 1600, 400, 200, options), { width: 400, height: 200, x: 1552, y: 1352 });
});
test('căn giữa và góc trên trái đúng vị trí', () => {
  assert.deepEqual(watermarkBounds(1000, 800, 400, 200, { ...options, position: 'center' }), { width: 200, height: 100, x: 400, y: 350 });
  assert.deepEqual(watermarkBounds(1000, 800, 400, 200, { ...options, position: 'top-left' }), { width: 200, height: 100, x: 24, y: 24 });
});
