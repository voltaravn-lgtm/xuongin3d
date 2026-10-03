import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Giới thiệu Xưởng In 3D tại TP.HCM",
  description:
    "Tìm hiểu dịch vụ thiết kế, tạo mẫu và sản xuất sản phẩm in 3D theo yêu cầu tại TP.HCM.",
  path: "/gioi-thieu",
  image: "/images/lien-he.webp",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
