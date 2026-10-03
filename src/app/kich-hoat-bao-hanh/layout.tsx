import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kích hoạt bảo hành sản phẩm Xưởng In 3D",
  description:
    "Kích hoạt và tra cứu thông tin hỗ trợ sau bàn giao cho sản phẩm của Xưởng In 3D.",
  path: "/kich-hoat-bao-hanh",
  image: "/images/bao-hanh.webp",
  noIndex: true,
});

export default function WarrantyActivationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
