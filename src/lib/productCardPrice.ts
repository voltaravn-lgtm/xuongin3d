import type { Product } from "../types";

function moneyValue(price: string | undefined): number | null {
  const raw = (price || "").trim();
  if (!/^[\d\s.,]+(?:đ|₫|vnd)?$/i.test(raw)) return null;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/** Keep the original price paired with the cheapest purchasable variant. */
export function getProductCardPrice(product: Product) {
  const candidates = (product.variants || [])
    .filter((variant) => variant.name?.trim())
    .map((variant) => ({
      price: variant.price || product.price,
      salePrice: variant.salePrice || product.salePrice,
    }));
  const numericCandidates = candidates
    .map((candidate) => {
      const regular = moneyValue(candidate.price);
      const sale = moneyValue(candidate.salePrice);
      const discounted = sale !== null && sale > 0 && (regular === null || sale < regular);
      return { ...candidate, value: discounted ? sale : regular, discounted };
    })
    .filter((candidate) => candidate.value !== null && candidate.value > 0)
    .sort((a, b) => a.value! - b.value!);
  const lowest = numericCandidates[0];
  if (lowest) return { price: lowest.price, salePrice: lowest.discounted ? lowest.salePrice : "" };

  const regular = moneyValue(product.price);
  const sale = moneyValue(product.salePrice);
  return {
    price: product.price,
    salePrice: sale !== null && sale > 0 && (regular === null || sale < regular) ? product.salePrice : "",
  };
}
