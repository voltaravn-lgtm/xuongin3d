import type { Product } from '../types';

export function getProductPricingMode(product: Product): 'single' | 'variants' {
  return product.pricingMode || ((product.variants || []).some(v => v.name?.trim()) ? 'variants' : 'single');
}

/** Customer-facing projection; never overwrite the saved variant data with this. */
export function getSellingProduct(product: Product): Product {
  if (product.pricingMode === 'variants') return { ...product, price: undefined, salePrice: undefined, retailPrice: undefined };
  if (product.pricingMode !== 'single') return product;
  return { ...product, variants: [], defaultVariantId: '', voltage: product.singleSize?.trim() || '' };
}
