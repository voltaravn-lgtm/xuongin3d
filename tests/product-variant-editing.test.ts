import test from 'node:test';
import assert from 'node:assert/strict';
import { editProductVariants } from '../src/lib/productVariantEditing.ts';

test('hiding the default preserves its details and selects a visible variant', () => {
  const variants = [{ id: 's', name: 'S', hidden: true, price: '10000', size: '10cm' }, { id: 'm', name: 'M' }];
  const result = editProductVariants({ defaultVariantId: 's' }, variants);
  assert.equal(result.defaultVariantId, 'm');
  assert.deepEqual(result.variants, variants);
});

test('all hidden clears the default; showing or adding a variant restores a valid default', () => {
  assert.equal(editProductVariants({ defaultVariantId: 's' }, [{ id: 's', name: 'S', hidden: true }]).defaultVariantId, '');
  assert.equal(editProductVariants({ defaultVariantId: '' }, [{ id: 's', name: 'S', hidden: false }]).defaultVariantId, 's');
  assert.equal(editProductVariants({ defaultVariantId: 's' }, [{ id: 's', name: 'S' }, { id: 'new', name: 'M' }]).defaultVariantId, 's');
});
