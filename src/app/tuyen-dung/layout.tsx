import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tuyển dụng - Tạm ẩn",
  description:
    "Trang tuyển dụng hiện không xuất hiện trên menu chính.",
  path: "/tuyen-dung",
  image: "/images/tuyen-dung.webp",
  noIndex: true,
});

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
