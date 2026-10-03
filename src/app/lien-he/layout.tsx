import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Liên hệ Xưởng In 3D - Tư vấn và báo giá",
  description:
    "Liên hệ Xưởng In 3D tại TP.HCM để gửi file, nhận tư vấn vật liệu, thiết kế và báo giá in 3D theo yêu cầu.",
  path: "/lien-he",
  image: "/images/lien-he.webp",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
