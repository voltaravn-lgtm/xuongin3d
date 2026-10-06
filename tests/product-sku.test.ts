import test from 'node:test';
import assert from 'node:assert/strict';
import { shortProductSku, availableProductSku } from '../src/lib/productSku.ts';

test('short display code keeps IN3D and exactly four digits including leading zeros', () => {
  assert.equal(shortProductSku('IN3D-000000000001'), 'IN3D-0001');
  assert.equal(shortProductSku('IN3D-ABCD12345678'), 'IN3D-9896');
  assert.equal(shortProductSku('IN3D-0738'), 'IN3D-0738');
  for (const id of ['IN3D-000000000000', 'IN3D-FFFFFFFFFFFF', 'IN3D-163ECCE2DF6B']) assert.match(shortProductSku(id), /^IN3D-\d{4}$/);
  assert.throws(() => shortProductSku('bad'));
});
test('collision chooses an unused random slot, not the next sequential code', () => {
  assert.equal(availableProductSku('IN3D-0738', ['IN3D-0737']), 'IN3D-0738');
  assert.equal(availableProductSku('IN3D-0738', ['IN3D-0738', 'IN3D-0000'], () => 0), 'IN3D-0001');
  const occupied = new Set(['IN3D-0738']);
  const next = availableProductSku('IN3D-0738', occupied, () => 0.8);
  assert.match(next, /^IN3D-\d{4}$/); assert.equal(occupied.has(next), false); assert.notEqual(next, 'IN3D-0739');
});
test('a full four-digit namespace stops rather than duplicates or silently expanding', () => {
  const used = Array.from({ length: 10000 }, (_, i) => `IN3D-${String(i).padStart(4, '0')}`);
  assert.throws(() => availableProductSku('IN3D-0738', used), /10.000/);
  assert.equal(availableProductSku('IN3D-0738', used.filter(s => s !== 'IN3D-0042')), 'IN3D-0042');
});
