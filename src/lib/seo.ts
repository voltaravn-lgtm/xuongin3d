import { Metadata } from "next";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xuong-in-3d.web.app";
export const siteName = "Xưởng In 3D";

export const defaultDescription =
  "Xưởng In 3D nhận thiết kế, tạo mẫu và in 3D theo yêu cầu cho cá nhân, gia đình và doanh nghiệp tại TP.HCM.";

const defaultImage = "/images/san-pham.webp";

export function buildMetadata({
  title,
  description = defaultDescription,
  path = "/",
  image = defaultImage,
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, siteUrl);
  const imageUrl = new URL(image, siteUrl);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName,
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${siteName} - ${title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl.toString()],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  alternateName: "Công Ty Tập Đoàn Thay Đổi Liên Tục",
  url: siteUrl,
  logo: new URL("/images/logo-x3d.webp", siteUrl).toString(),
  image: new URL("/images/san-pham.webp", siteUrl).toString(),
  email: "xuongin3d@gmail.com",
  telephone: "+84 822 426 639",
  address: {
    "@type": "PostalAddress",
    streetAddress: "71/1E Võ Văn Hát, Long Trường",
    addressLocality: "Thành phố Hồ Chí Minh",
    addressCountry: "VN",
  },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  inLanguage: "vi-VN",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/san-pham?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};
