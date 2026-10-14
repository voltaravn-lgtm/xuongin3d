import type { Product, ProductVariant } from "../types";
import { getSellingProduct } from "./productPricingMode.ts";

function parseMoney(value: string | undefined): number | null {
  const raw = String(value || "").trim();
  if (!raw || !/^[\d\s.,]+(?:đ|₫|vnd)?$/i.test(raw)) return null;

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function sellingPrice(regularValue: string | undefined, saleValue: string | undefined) {
  const regular = parseMoney(regularValue);
  const sale = parseMoney(saleValue);

  if (sale !== null && (regular === null || sale < regular)) return sale;
  return regular;
}

function variantSellingPrice(product: Product, variant: ProductVariant) {
  return sellingPrice(
    variant.price || product.price,
    variant.salePrice || product.salePrice,
  );
}

export function getProductStructuredDataPrice(product: Product): number | null {
  const sellingProduct = getSellingProduct(product);
  const variantPrices = (sellingProduct.variants || [])
    .filter((variant) => !variant.hidden && variant.name?.trim())
    .map((variant) => variantSellingPrice(sellingProduct, variant))
    .filter((price): price is number => price !== null);

  if (variantPrices.length > 0) return Math.min(...variantPrices);
  return sellingPrice(sellingProduct.price, sellingProduct.salePrice);
}

function availabilityFor(product: Product) {
  if (product.stockStatus === "out-of-stock") return "https://schema.org/OutOfStock";
  if (product.stockStatus === "preorder") return "https://schema.org/PreOrder";
  return "https://schema.org/InStock";
}

export function buildProductJsonLd({
  product,
  url,
  description,
  videos = [],
}: {
  product: Product;
  url: string;
  description: string;
  videos?: Array<{
    name: string;
    description: string;
    thumbnailUrl: string[];
    uploadDate: string;
    embedUrl?: string;
    contentUrl?: string;
    url?: string;
  }>;
}) {
  const price = getProductStructuredDataPrice(product);
  if (price === null) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.image, ...(product.images || [])].filter(Boolean),
    description,
    brand: {
      "@type": "Brand",
      name: product.brand || "Xưởng In 3D",
    },
    sku: product.sku || product.id,
    category: product.category,
    offers: {
      "@type": "Offer",
      url,
      price,
      priceCurrency: "VND",
      availability: availabilityFor(product),
      itemCondition: "https://schema.org/NewCondition",
    },
    additionalProperty: Object.entries(product.specs || {})
      .filter(([, value]) => String(value || "").trim())
      .map(([name, value]) => ({
        "@type": "PropertyValue",
        name,
        value,
      })),
    ...(videos.length > 0
      ? {
          video: videos.map((video) => ({
            "@type": "VideoObject",
            ...video,
          })),
        }
      : {}),
  };
}

