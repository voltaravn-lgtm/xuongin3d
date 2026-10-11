import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../lib/adminAuth";
import { firebaseConfig } from "../../../lib/firebase";

async function authenticatedAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !firebaseConfig.apiKey) return false;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    },
  );
  if (!response.ok) return false;

  const data = await response.json() as { users?: Array<{ email?: string }> };
  return isAdminEmail(data.users?.[0]?.email);
}

export async function POST(request: NextRequest) {
  if (!await authenticatedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/api/products");
  revalidateTag("public-products", { expire: 0 });
  revalidatePath("/sitemap.xml");
  revalidatePath("/san-pham", "layout");
  return NextResponse.json({ revalidated: true });
}
