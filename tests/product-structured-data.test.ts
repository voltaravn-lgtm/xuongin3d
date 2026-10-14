import assert from 'node:assert/strict';
import test from 'node:test';
import type { Product } from '../src/types.ts';
import { buildProductJsonLd, getProductStructuredDataPrice } from '../src/lib/productStructuredData.ts';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Sản phẩm thử',
    voltage: '',
    capacity: '',
    brand: 'Xưởng In 3D',
    cellType: '',
    warranty: '',
    image: 'https://example.com/product.webp',
    description: 'Mô tả',
    category: 'decor',
    specs: {},
    ...overrides,
  };
}

test('uses the real sale price for a single-price product', () => {
  const item = product({ price: '250.000đ', salePrice: '199.000đ' });
  assert.equal(getProductStructuredDataPrice(item), 199000);
  assert.equal(buildProductJsonLd({ product: item, url: 'https://example.com/p', description: 'Mô tả' })?.offers.price, 199000);
});

test('uses the lowest visible variant price', () => {
  const item = product({
    pricingMode: 'variants',
    variants: [
      { id: 'small', name: 'Nhỏ', price: '120000' },
      { id: 'large', name: 'Lớn', price: '180000', salePrice: '150000' },
      { id: 'hidden', name: 'Ẩn', price: '50000', hidden: true },
    ],
  });
  assert.equal(getProductStructuredDataPrice(item), 120000);
});

test('does not create Product rich-result data for quote-only products', () => {
  const item = product({ price: 'Liên hệ' });
  assert.equal(getProductStructuredDataPrice(item), null);
  assert.equal(buildProductJsonLd({ product: item, url: 'https://example.com/p', description: 'Mô tả' }), null);
});

test('maps stock status to schema availability', () => {
  const item = product({ price: '100000', stockStatus: 'out-of-stock' });
  const jsonLd = buildProductJsonLd({ product: item, url: 'https://example.com/p', description: 'Mô tả' });
  assert.equal(jsonLd?.offers.availability, 'https://schema.org/OutOfStock');
});
