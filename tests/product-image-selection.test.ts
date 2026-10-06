import test from 'node:test';
import assert from 'node:assert/strict';
import { removeSelectedImage, selectProductCover, removeProductImage } from '../src/lib/productImageSelection.ts';

test('choosing a gallery cover retains the old cover and every other photo', () => {
  assert.deepEqual(selectProductCover('a', ['b', 'c', 'b'], 'c'), { image: 'c', images: ['a', 'b'] });
});

test('removal clears wrong cover or gallery photo without changing other photos', () => {
  assert.deepEqual(removeProductImage('a', ['b', 'c'], 'a'), { image: '', images: ['b', 'c'] });
  assert.deepEqual(removeProductImage('a', ['b', 'c'], 'b'), { image: 'a', images: ['c'] });
});

test('file deletion retains cover identity or picks the first remaining photo', () => {
  assert.deepEqual(removeSelectedImage(['a', 'b', 'c'], 2, 0), { files: ['b', 'c'], coverIndex: 1 });
  assert.deepEqual(removeSelectedImage(['a', 'b', 'c'], 1, 1), { files: ['a', 'c'], coverIndex: 0 });
  assert.deepEqual(removeSelectedImage(['a', 'b', 'c'], 0, 2), { files: ['a', 'b'], coverIndex: 0 });
  assert.deepEqual(removeSelectedImage(['a'], 0, 0), { files: [], coverIndex: 0 });
});
