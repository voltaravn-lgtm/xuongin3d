import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sản phẩm in 3D - Decor, mô hình, POSM và sa bàn",
  description:
    "Khám phá sản phẩm in 3D: đồ decor, tiện ích, quà tặng, mô hình, chậu cây, POSM doanh nghiệp và sa bàn kiến trúc.",
  path: "/san-pham",
  image: "/images/san-pham.webp",
});

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
