import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Học viện - Tạm ẩn",
  description:
    "Trang học viện hiện không xuất hiện trên menu chính.",
  path: "/hoc-vien",
  image: "/images/hoc-vien.webp",
  noIndex: true,
});

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
