import { Metadata } from "next";
import ArticleDetailClient from "../../../components/ArticleDetailClient";
import { ARTICLES_DATA } from "../../../data";
import { buildMetadata } from "../../../lib/seo";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

export function generateStaticParams() {
  return ARTICLES_DATA.map((article) => ({ slug: article.id }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES_DATA.find((item) => item.id === slug);

  return buildMetadata({
    title: article ? `${article.title} - Xưởng In 3D` : "Bài viết - Xưởng In 3D",
    description: article?.brief || "Kiến thức, vật liệu và hướng dẫn về công nghệ in 3D.",
    path: `/kien-thuc/${slug}`,
    image: article?.image || "/images/kien-thuc.webp",
    noIndex: !article,
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticleDetailClient articleId={slug} />;
}
