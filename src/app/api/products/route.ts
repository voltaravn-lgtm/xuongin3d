import { NextResponse } from "next/server";
import { PRODUCTS_DATA } from "../../../data";
import { readProductCatalogue } from "../../../lib/productData";
import { Product } from "../../../types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function newestFirst(products: Product[]) {
  return [...products].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime || String(b.id).localeCompare(String(a.id), "vi");
  });
}

export async function GET() {
  try {
    const products = newestFirst(await readProductCatalogue());

    return NextResponse.json(
      { products, source: "firestore" },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Could not load the public product catalog:", error);
    return NextResponse.json(
      { products: newestFirst(PRODUCTS_DATA), source: "fallback" },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
