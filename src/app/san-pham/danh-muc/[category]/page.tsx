import type { Metadata } from 'next';
import { PRODUCTS_DATA } from '../../../../data';
import { getBuildProducts } from '../../../../lib/productData';
import { buildMetadata } from '../../../../lib/seo';
import ProductCategoryClientPage from './ProductCategoryClientPage';

const DEFAULT_CATEGORY_IDS = [
  "den-do-decor-trang-tri",
  "do-dung-tien-ich-phu-kien",
  "qua-tang-do-dung-gia-dinh",
  "mo-hinh-tuong-nhan-vat",
  "do-cong-nghe",
  "chau-cay-trang-tri-cay",
  "trang-tri-ho-ca-be-ca",
  "doanh-nghiep-posm",
  "kien-truc-sa-ban",
];

export async function generateStaticParams() {
  const categoryIds = new Set(DEFAULT_CATEGORY_IDS);
  const products = await getBuildProducts();
  [...PRODUCTS_DATA, ...products].forEach((product) => {
    if (product.category) categoryIds.add(product.category);
  });

  return Array.from(categoryIds).map((category) => ({ category }));
}

function categoryTitle(category: string) {
  return category
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('vi') + part.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const title = categoryTitle(category);
  return buildMetadata({
    title: `${title} in 3D - Xưởng In 3D`,
    description: `Khám phá sản phẩm ${title.toLocaleLowerCase('vi')} được thiết kế và in 3D theo nhu cầu.`,
    path: `/san-pham/danh-muc/${encodeURIComponent(category)}`,
    image: '/images/san-pham.webp',
  });
}

export default function ProductCategoryPage() {
  return <ProductCategoryClientPage />;
}
