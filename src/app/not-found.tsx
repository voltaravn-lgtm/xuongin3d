"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function NotFound() {
  useEffect(() => {
    const match = window.location.pathname.match(/^\/san-pham\/([^/?#]+)$/);
    if (!match) return;

    window.location.replace(`/san-pham?select=${encodeURIComponent(decodeURIComponent(match[1]))}`);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl font-black text-gold-light">404</div>
        <h1 className="mb-3 font-display text-xl font-black uppercase">Không tìm thấy trang</h1>
        <p className="mb-6 text-sm text-gray-400">
          Nếu đây là link sản phẩm, hệ thống đang chuyển về trang chi tiết phù hợp.
        </p>
        <Link
          href="/san-pham"
          className="inline-flex border border-gold-dark/40 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gold-light hover:border-gold-light hover:text-white"
        >
          Về trang sản phẩm
        </Link>
      </div>
    </main>
  );
}
