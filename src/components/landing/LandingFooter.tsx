import Link from 'next/link';

export default function LandingFooter() {
  return <footer className="border-t border-[#d99d1a]/20 bg-black px-5 py-10 text-center text-white"><Link href="/" className="text-sm font-black uppercase tracking-[.16em]">XƯỞNG <span className="text-gold-light">IN 3D</span></Link><p className="mt-4 text-xs text-white/45">Thiết kế và in 3D theo yêu cầu cho cá nhân và doanh nghiệp.</p></footer>;
}
