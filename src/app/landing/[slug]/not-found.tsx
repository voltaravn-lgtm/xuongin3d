import Link from 'next/link';

export default function LandingNotFound() {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#070707] px-5 text-center text-white"><img src="/images/logo-x3d.webp" alt="Xưởng In 3D" className="h-14 w-auto" /><h1 className="mt-8 text-3xl font-black uppercase">Landing Page không tồn tại</h1><p className="mt-3 text-sm text-white/50">Trang chưa được xuất bản, đã bị xóa hoặc đường dẫn không đúng.</p><Link href="/" className="mt-7 bg-gold-light px-6 py-3 text-xs font-black uppercase text-black">Về trang chủ</Link></div>;
}
