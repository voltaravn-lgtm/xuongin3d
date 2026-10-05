'use client';

import React, { useEffect, useState } from "react";
import { AppProvider } from "../context/AppContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import MobileQuickAccess from "../components/MobileQuickAccess";
import ToastContainer from "../components/ToastContainer";
import SiteBackground from "../components/SiteBackground";
import { usePathname } from "next/navigation";

export default function RootClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isCatalogPage = pathname === '/catalog';
  const isAdminPage = pathname === '/admin' || pathname?.startsWith('/admin/');
  const sceneRoutes = ['/san-pham', '/in-3d-theo-yeu-cau', '/giai-phap', '/du-an-da-thuc-hien', '/kien-thuc', '/gioi-thieu', '/lien-he'];
  const hasSceneBackground = pathname === '/' || sceneRoutes.some((route) => pathname === route || pathname?.startsWith(`${route}/`));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Landing Pages have their own lightweight shell and must not initialize
  // AppContext (which subscribes to the full Product catalog).
  if (pathname?.startsWith('/landing/')) return <>{children}</>;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-gold-light animate-pulse text-lg font-display tracking-widest uppercase">
          XƯỞNG IN 3D...
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#050505] text-[#ECECEC] font-sans antialiased flex flex-col justify-between">
        <Header />
        <main className={`flex-1 w-full${hasSceneBackground ? ' site-scene-content' : ''}`}>
          {hasSceneBackground && <SiteBackground subdued={pathname !== '/' && !pathname?.startsWith('/san-pham')} />}
          {hasSceneBackground ? <div className="site-scene-foreground">{children}</div> : children}
        </main>
        {!isCatalogPage && !isAdminPage && <Footer />}
        <MobileQuickAccess />
        <ToastContainer />
      </div>
    </AppProvider>
  );
}
