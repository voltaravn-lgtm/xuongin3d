import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kiến thức 3D - Vật liệu, công nghệ và hướng dẫn",
  description:
    "Kiến thức về vật liệu PLA, PETG, ABS, TPU, Resin, công nghệ FDM và hướng dẫn đặt in 3D theo yêu cầu.",
  path: "/kien-thuc",
  image: "/images/kien-thuc.webp",
});

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
