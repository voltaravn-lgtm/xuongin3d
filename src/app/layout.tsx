import React from "react";
import { Metadata } from "next";
import Script from "next/script";
import RootClientLayout from "./RootClientLayout";
import { buildMetadata, organizationJsonLd, siteName, siteUrl, websiteJsonLd } from "../lib/seo";
import "../index.css";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Xưởng In 3D - Thiết kế và in 3D theo yêu cầu",
    path: "/",
    image: "/images/san-pham.webp",
  }),
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  category: "3D printing",
  keywords: [
    "xưởng in 3D",
    "in 3D theo yêu cầu",
    "dịch vụ in 3D TP.HCM",
    "mô hình in 3D",
    "quà tặng in 3D",
    "POSM in 3D",
    "sa bàn kiến trúc",
    "in 3D FDM Resin",
  ],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.webp", sizes: "1334x1334", type: "image/webp" },
    ],
    shortcut: "/favicon.webp",
    apple: [{ url: "/favicon.webp", sizes: "1334x1334", type: "image/webp" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#050505] text-[#ECECEC] antialiased"
        suppressHydrationWarning
      >
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          id="website-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <RootClientLayout>{children}</RootClientLayout>
      </body>
    </html>
  );
}
