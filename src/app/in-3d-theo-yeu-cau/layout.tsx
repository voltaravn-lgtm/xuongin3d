import type { Metadata } from 'next';
import { buildMetadata } from '../../lib/seo';
export const metadata: Metadata = buildMetadata({ title: 'In 3D theo yêu cầu tại TP.HCM', description: 'Nhận thiết kế, tạo mẫu và in 3D theo yêu cầu từ file, bản vẽ, hình ảnh hoặc mẫu thật.', path: '/in-3d-theo-yeu-cau', image: '/images/in-3d-theo-yeu-cau.webp' });
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
