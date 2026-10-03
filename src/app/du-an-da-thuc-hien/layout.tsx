import type { Metadata } from 'next';
import { buildMetadata } from '../../lib/seo';
export const metadata: Metadata = buildMetadata({ title: 'Dự án in 3D đã thực hiện', description: 'Các dự án tạo mẫu, sản phẩm cá nhân hóa, POSM, mô hình kiến trúc và sa bàn của Xưởng In 3D.', path: '/du-an-da-thuc-hien', image: '/images/du-an-da-thuc-hien.webp' });
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
