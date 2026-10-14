import { MetadataRoute } from "next";
import { getBuildProducts } from "../lib/productData";
import { getProductSlug } from "../lib/productRoutes";
import { siteUrl } from "../lib/seo";
import { listPublishedLandingsForSitemap } from "../lib/landing/landingSitemapRepository";
import { ARTICLES_DATA } from "../data";

export const dynamic = "force-dynamic";

const routes = [
  "",
  "/gioi-thieu",
  "/san-pham",
  "/in-3d-theo-yeu-cau",
  "/giai-phap",
  "/du-an-da-thuc-hien",
  "/kien-thuc",
  "/lien-he",
];

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  const vietnameseDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  const normalized = vietnameseDate
    ? `${vietnameseDate[3]}-${vietnameseDate[2].padStart(2, "0")}-${vietnameseDate[1].padStart(2, "0")}${vietnameseDate[4]}`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, landings] = await Promise.all([getBuildProducts(), listPublishedLandingsForSitemap()]);

  const pageRoutes = routes.map((route) => ({
    url: new URL(route || "/", siteUrl).toString(),
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : route === "/san-pham" ? 0.9 : 0.7,
  }));

  const visibleProducts = products.filter((product) => !product.hidden);
  const productRoutes = visibleProducts.map((product) => {
    const lastModified = validDate(product.updatedAt) || validDate(product.createdAt);
    return {
      url: new URL(`/san-pham/${getProductSlug(product)}`, siteUrl).toString(),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  const categoryRoutes = Array.from(new Set(visibleProducts.map((product) => product.category).filter(Boolean))).map((category) => ({
    url: new URL(`/san-pham/danh-muc/${encodeURIComponent(category)}`, siteUrl).toString(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const landingRoutes = landings.map((landing) => {
    const lastModified = validDate(landing.updatedAt);
    return {
      url: new URL(`/landing/${landing.slug}`, siteUrl).toString(),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    };
  });

  const articleRoutes = ARTICLES_DATA.map((article) => {
    const lastModified = validDate(article.date);
    return {
      url: new URL(`/kien-thuc/${article.id}`, siteUrl).toString(),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    };
  });

  return [...pageRoutes, ...categoryRoutes, ...productRoutes, ...articleRoutes, ...landingRoutes];
}
