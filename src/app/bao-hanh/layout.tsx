import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Bảo hành Xưởng In 3D - Tra cứu sản phẩm",
  description:
    "Tra cứu thông tin bảo hành và hỗ trợ sau bàn giao dành cho sản phẩm của Xưởng In 3D.",
  path: "/bao-hanh",
  image: "/images/bao-hanh.webp",
  noIndex: true,
});

export default function WarrantyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
