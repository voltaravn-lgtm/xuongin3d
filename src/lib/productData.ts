import { collection, getDocs } from "firebase/firestore";
import { PRODUCTS_DATA } from "../data";
import { Product } from "../types";
import { db, isFirebaseConfigured } from "./firebase";
import { getProductSlug, slugifyProductText } from "./productRoutes";
import { unstable_cache } from "next/cache";
import { cache } from "react";

// Shared across API, metadata, related products and sitemap. Do not cache failures.
export const readProductCatalogue = unstable_cache(async (): Promise<Product[]> => {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured');
  const snapshot = await getDocs(collection(db, "products"));
  return snapshot.docs.map(item => item.data() as Product).filter(product => Boolean(product?.id));
}, ['public-product-catalogue-v1'], { revalidate: 300, tags: ['public-products'] });

export async function getBuildProducts(): Promise<Product[]> {
  if (!isFirebaseConfigured) return PRODUCTS_DATA;

  try {
    // Firestore is authoritative, including an empty catalog. Merging static
    // examples back in would resurrect deleted products in pages and sitemap.
    return await readProductCatalogue();
  } catch (error) {
    console.error("Could not load products for static product routes:", error);
    return PRODUCTS_DATA;
  }
}

export const findBuildProductByRoute = cache(async (id: string): Promise<Product | null> => {
  const normalizedId = slugifyProductText(id);

  const products = await getBuildProducts();
  return products.find((item) =>
    item.id === id ||
    slugifyProductText(item.id) === normalizedId ||
    slugifyProductText(item.slug || "") === normalizedId ||
    getProductSlug(item) === normalizedId
  ) || null;
});
