import { auth } from "./firebase";

export async function revalidateProductCache() {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/product-revalidate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.ok) {
      localStorage.removeItem("xuongin3d_products_last_firestore_sync_v2");
    }
    return response.ok;
  } catch (error) {
    console.warn("Product saved but cache revalidation could not run:", error);
    return false;
  }
}
