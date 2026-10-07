import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { PRODUCTS_DATA } from "../data";
import { Product } from "../types";
import { db, isFirebaseConfigured } from "./firebase";
import { getProductSlug, slugifyProductText } from "./productRoutes";

export async function getBuildProducts(): Promise<Product[]> {
  if (!isFirebaseConfigured) return PRODUCTS_DATA;

  try {
    const snapshot = await getDocs(collection(db, "products"));
    const remoteProducts = snapshot.docs.map((item) => item.data() as Product);
    // Firestore is authoritative, including an empty catalog. Merging static
    // examples back in would resurrect deleted products in pages and sitemap.
    return remoteProducts.filter(product => Boolean(product?.id));
  } catch (error) {
    console.error("Could not load products for static product routes:", error);
    return PRODUCTS_DATA;
  }
}

export async function findBuildProductByRoute(id: string): Promise<Product | null> {
  const normalizedId = slugifyProductText(id);

  if (isFirebaseConfigured && normalizedId) {
    try {
      const snapshot = await getDocs(query(collection(db, "products"), where("slug", "==", normalizedId), limit(1)));
      const product = snapshot.docs[0]?.data() as Product | undefined;
      if (product) return product;
    } catch (error) {
      console.error("Could not load product by slug:", error);
    }
  }

  const products = await getBuildProducts();
  return products.find((item) =>
    item.id === id ||
    slugifyProductText(item.id) === normalizedId ||
    slugifyProductText(item.slug || "") === normalizedId ||
    getProductSlug(item) === normalizedId
  ) || null;
}
