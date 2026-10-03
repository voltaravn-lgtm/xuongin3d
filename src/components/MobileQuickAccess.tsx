import React from "react";
import { Home, PackageSearch, Phone, Printer } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function MobileQuickAccess() {
  const location = useLocation();
  const { contactSettings } = useApp();
  const phoneHref = contactSettings.hotline.replace(/[^\d+]/g, "");
  const active = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
  const itemClass = (path: string) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase ${active(path) ? "text-gold-light" : "text-gray-400"}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gold-dark/20 bg-[#080808]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Truy cập nhanh">
      <Link to="/" className={itemClass("/")}><Home className="h-5 w-5" /><span>Trang chủ</span></Link>
      <Link to="/san-pham" className={itemClass("/san-pham")}><PackageSearch className="h-5 w-5" /><span>Sản phẩm</span></Link>
      <Link to="/in-3d-theo-yeu-cau" className={itemClass("/in-3d-theo-yeu-cau")}><Printer className="h-5 w-5" /><span>Đặt in 3D</span></Link>
      <a href={`tel:${phoneHref}`} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase text-gold-light"><Phone className="h-5 w-5" /><span>Gọi tư vấn</span></a>
    </nav>
  );
}
