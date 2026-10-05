import type { Product, ProductVariant } from "../types";

export function resolveProductVariant(product: Product, variantId?: string): ProductVariant | undefined {
  return (product.variants || []).filter((v) => v.name.trim())
    .sort((a, b) => b.id.length - a.id.length)
    .find((v) => v.id === variantId || variantId?.startsWith(`${v.id}--size-`) || variantId?.startsWith(`${v.id}--color-`));
}

export function isValidProductSize(product: Product, variantId?: string, selectedSize = ""): boolean {
  const variant = resolveProductVariant(product, variantId);
  if ((product.variants || []).some((v) => v.name.trim()) && !variant) return false;
  const lockedSize = variant?.size?.trim();
  if (lockedSize) return selectedSize === lockedSize;
  const sizes = String(product.voltage || "").split(/[,|\r\n]/).map((value) => value.trim()).filter(Boolean);
  return sizes.length === 0 || sizes.includes(selectedSize);
}
