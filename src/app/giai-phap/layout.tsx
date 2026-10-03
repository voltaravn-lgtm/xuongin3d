import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Giải pháp in 3D cho doanh nghiệp",
  description:
    "Giải pháp tạo mẫu nhanh, POSM, mô hình sản phẩm, đồ gá và chi tiết in 3D theo yêu cầu cho doanh nghiệp.",
  path: "/giai-phap",
  image: "/images/giai-phap.webp",
});

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
