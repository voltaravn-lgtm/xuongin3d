import type { Product, ProductVariant } from "../types";
import { getSellingProduct } from './productPricingMode.ts';

export function resolveProductVariant(product: Product, variantId?: string): ProductVariant | undefined {
  product = getSellingProduct(product);
  return (product.variants || []).filter((v) => !v.hidden && v.name.trim())
    .sort((a, b) => b.id.length - a.id.length)
    .find((v) => v.id === variantId || variantId?.startsWith(`${v.id}--size-`) || variantId?.startsWith(`${v.id}--color-`));
}

export function isValidProductSize(product: Product, variantId?: string, selectedSize = ""): boolean {
  product = getSellingProduct(product);
  if (product.pricingMode === 'single') {
    if (variantId && variantId !== 'default' && !variantId.startsWith('default--')) return false;
    return selectedSize === (product.singleSize?.trim() || '');
  }
  const variant = resolveProductVariant(product, variantId);
  if ((product.variants || []).some((v) => v.name.trim()) && !variant) return false;
  const lockedSize = variant?.size?.trim();
  if (lockedSize) return selectedSize === lockedSize;
  const sizes = String(product.voltage || "").split(/[,|\r\n]/).map((value) => value.trim()).filter(Boolean);
  return sizes.length === 0 || sizes.includes(selectedSize);
}
