import type { Product, ProductVariant } from '../types.ts';

/** Hidden variants stay in storage, but cannot remain the default choice. */
export function editProductVariants(product: Pick<Product, 'defaultVariantId'>, variants: ProductVariant[]) {
  const visible = variants.filter(variant => !variant.hidden && variant.name.trim());
  return {
    variants,
    defaultVariantId: visible.some(variant => variant.id === product.defaultVariantId)
      ? product.defaultVariantId || '' : visible[0]?.id || '',
  };
}
