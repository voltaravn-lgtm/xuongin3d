import { PRODUCTS_DATA } from '../../../../data';
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

export function generateStaticParams() {
  const categoryIds = new Set(DEFAULT_CATEGORY_IDS);
  PRODUCTS_DATA.forEach((product) => {
    if (product.category) categoryIds.add(product.category);
  });

  return Array.from(categoryIds).map((category) => ({ category }));
}

export default function ProductCategoryPage() {
  return <ProductCategoryClientPage />;
}
