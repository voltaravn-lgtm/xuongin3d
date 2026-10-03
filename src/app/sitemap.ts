import { MetadataRoute } from "next";
import { getBuildProducts } from "../lib/productData";
import { getProductSlug } from "../lib/productRoutes";
import { siteUrl } from "../lib/seo";
import { listPublishedLandingsForSitemap } from "../lib/landing/landingSitemapRepository";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const [products, landings] = await Promise.all([getBuildProducts(), listPublishedLandingsForSitemap()]);

  const pageRoutes = routes.map((route) => ({
    url: new URL(route || "/", siteUrl).toString(),
    lastModified,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : route === "/san-pham" ? 0.9 : 0.7,
  }));

  const productRoutes = products.filter((product) => !product.hidden).map((product) => ({
    url: new URL(`/san-pham/${getProductSlug(product)}`, siteUrl).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const landingRoutes = landings.map((landing) => ({
    url: new URL(`/landing/${landing.slug}`, siteUrl).toString(),
    lastModified: landing.updatedAt ? new Date(landing.updatedAt) : lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [...pageRoutes, ...productRoutes, ...landingRoutes];
}
