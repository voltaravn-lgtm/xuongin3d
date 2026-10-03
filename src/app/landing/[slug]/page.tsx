import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import LandingPageRenderer from '../../../components/landing/LandingPageRenderer';
import { getPublicLandingBySlug } from '../../../lib/landing/landingPublicRepository';

interface LandingRouteProps { params: Promise<{ slug: string }>; }

export const revalidate = 300;

function canonicalUrl(slug: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://xuong-in-3d.web.app';
  return `${origin.replace(/\/$/, '')}/landing/${slug}`;
}

export async function generateMetadata({ params }: LandingRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicLandingBySlug(slug);
  if (!data) return { title: 'Landing Page không tồn tại | Xưởng In 3D', robots: { index: false, follow: false } };
  const { page, product } = data;
  const title = page.seo.title || page.productOverrides?.title || product?.name || page.name;
  const description = page.seo.description || page.productOverrides?.description || product?.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const image = page.seo.image || page.productOverrides?.image || product?.image;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(page.slug) },
    robots: page.seo.noIndex ? { index: false, follow: false, googleBot: { index: false, follow: false } } : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { title, description, type: 'website', locale: 'vi_VN', siteName: 'Xưởng In 3D', url: canonicalUrl(page.slug), images: image ? [{ url: image, alt: title }] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function PublicLandingPage({ params }: LandingRouteProps) {
  const { slug } = await params;
  const data = await getPublicLandingBySlug(slug);
  if (!data) notFound();
  if (data.matchedHistoricalSlug && slug !== data.page.slug) redirect(`/landing/${data.page.slug}`);
  return <LandingPageRenderer page={data.page} product={data.product} products={data.products} />;
}
