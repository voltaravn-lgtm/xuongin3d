import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "../../../components/ProductDetailClient";
import { findBuildProductByRoute, getBuildProducts } from "../../../lib/productData";
import { getProductDescriptionExcerpt } from "../../../lib/productDescription";
import { getProductSlug } from "../../../lib/productRoutes";
import { buildProductJsonLd } from "../../../lib/productStructuredData";
import { buildMetadata, serializeJsonLd, siteUrl } from "../../../lib/seo";
import { cleanVideoUrls, getProductVideoEmbed } from "../../../lib/video";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getBuildProducts();
  const ids = new Set<string>();

  products.forEach((product) => {
    ids.add(getProductSlug(product));
  });

  return Array.from(ids).map((id) => ({ id }));
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await findBuildProductByRoute(id);

  if (!product) {
    return buildMetadata({
      title: "Không tìm thấy sản phẩm - Xưởng In 3D",
      path: "/san-pham",
      noIndex: true,
    });
  }

  const description = getProductDescriptionExcerpt(product.description, product.name);

  return buildMetadata({
    title: `${product.name} - Xưởng In 3D`,
    description,
    path: `/san-pham/${getProductSlug(product)}`,
    image: product.image,
  });
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await findBuildProductByRoute(id);

  if (!product) {
    notFound();
  }

  const allProducts = await getBuildProducts();
  const relatedProducts = allProducts.filter(
    (item) => item.category === product.category && item.id !== product.id,
  ).slice(0, 12);
  const productVideos = cleanVideoUrls(product.videoUrls)
    .map((url, index) => getProductVideoEmbed(url, index))
    .filter(Boolean);
  const plainDescription = getProductDescriptionExcerpt(product.description, product.name);
  const productUrl = `${siteUrl}/san-pham/${getProductSlug(product)}`;
  const productJsonLd = buildProductJsonLd({
    product,
    url: productUrl,
    description: plainDescription,
    videos: productVideos.map((video, index) => ({
      name: `${product.name} - Video ${index + 1}`,
      description: plainDescription,
      thumbnailUrl: [product.image],
      uploadDate: product.updatedAt || product.createdAt || new Date().toISOString(),
      embedUrl: video?.embedUrl,
      contentUrl: video?.directUrl,
      url: video?.originalUrl,
    })),
  });

  return (
    <>
      {productJsonLd && (
        <script
          id={`product-jsonld-${product.id}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
        />
      )}
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
