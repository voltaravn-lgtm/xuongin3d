import React from "react";
import { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import AdminAuthGate from "../../components/AdminAuthGate";

export const metadata: Metadata = buildMetadata({
  title: "Xưởng In 3D - Quản trị",
  description: "Khu vực quản trị nội bộ Xưởng In 3D.",
  path: "/admin",
  noIndex: true,
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGate>{children}</AdminAuthGate>;
}
