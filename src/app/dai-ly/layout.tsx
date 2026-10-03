import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trang hệ thống phân phối - Tạm ẩn",
  description:
    "Trang hệ thống phân phối hiện không xuất hiện trên menu chính.",
  path: "/dai-ly",
  image: "/images/dai-ly.webp",
  noIndex: true,
});

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
