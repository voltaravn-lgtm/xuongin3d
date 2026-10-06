/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Menu, X, Search, ShoppingCart, Sun, Moon } from "lucide-react";
import { useApp } from "../context/AppContext";
import CartDrawer from "./CartDrawer";
import { getProductHref } from "../lib/productRoutes";

function getCategoryHref(categoryId: string, subCategoryId?: string) {
  const query = subCategoryId ? `?sub=${encodeURIComponent(subCategoryId)}` : "";
  return `/san-pham/danh-muc/${encodeURIComponent(categoryId)}${query}`;
}

function formatSearchPrice(price: string | undefined) {
  const raw = (price || "").trim();
  if (!raw) return "";

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits || !/^[\d\s.,]+(?:đ|₫|vnd)?$/i.test(raw)) return raw;
  return `${Number(digits).toLocaleString("vi-VN")}đ`;
}

export const SiteLogo: React.FC<{ className?: string; iconOnly?: boolean }> = ({
  className = "w-[132px] sm:w-[146px] xl:w-[158px]",
  iconOnly = false,
}) => (
  <img
    src={iconOnly ? "/favicon.webp" : "/images/logo-x3d.webp"}
    alt="Xưởng In 3D"
    className={`block h-auto max-h-[62px] select-none object-contain object-left ${className}`}
    width={iconOnly ? 64 : 1328}
    height={iconOnly ? 64 : 575}
    decoding="async"
  />
);

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDayMode, setIsDayMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileCategoriesOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const savedMode = localStorage.getItem("xuongin3d_display_mode");
    const nextIsDayMode = savedMode === "day";
    setIsDayMode(nextIsDayMode);
    document.body.classList.toggle("day-mode", nextIsDayMode);
  }, []);

  const toggleDisplayMode = () => {
    const nextIsDayMode = !isDayMode;
    setIsDayMode(nextIsDayMode);
    document.body.classList.toggle("day-mode", nextIsDayMode);
    localStorage.setItem("xuongin3d_display_mode", nextIsDayMode ? "day" : "night");
  };

  const { menuItems, productCategories, products, articles, openCart, cartCount } = useApp();
  const isDealerOrderPage = location.pathname === "/dai-ly/dat-hang";
  const handleCartClick = () => {
    if (isDealerOrderPage) {
      if (window.matchMedia("(max-width: 1023px)").matches) {
        window.dispatchEvent(new CustomEvent("xuongin3d:open-dealer-cart"));
        return;
      }
      document.getElementById("dealer-order-cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    openCart();
  };
  const visibleMenuItems = menuItems.filter((item) => !item.hidden);
  const visibleProductCategories = productCategories.filter((category) => !category.hidden);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    navigate(`/san-pham?search=${encodeURIComponent(query)}`);
    setIsSearchOpen(false);
    setSearchQuery("");
  };
  const searchResults = normalizedSearch
    ? [
        ...products
          .filter(product =>
            !product.hidden &&
            (product.name.toLowerCase().includes(normalizedSearch) ||
              product.id.toLowerCase().includes(normalizedSearch) ||
              (product.sku || "").toLowerCase().includes(normalizedSearch) ||
              product.description.toLowerCase().includes(normalizedSearch) ||
              product.category.toLowerCase().includes(normalizedSearch) ||
              product.voltage.toLowerCase().includes(normalizedSearch) ||
              product.capacity.toLowerCase().includes(normalizedSearch))
          )
          .slice(0, 5)
          .map(product => ({
            type: "Sản phẩm",
            title: product.name,
            subtitle: `${product.sku || product.id} · ${product.category}`,
            href: getProductHref(product),
            image: product.image,
            price: formatSearchPrice(product.salePrice || product.price || product.retailPrice),
          })),
        ...articles
          .filter(article =>
            article.title.toLowerCase().includes(normalizedSearch) ||
            article.brief.toLowerCase().includes(normalizedSearch) ||
            article.category.toLowerCase().includes(normalizedSearch)
          )
          .slice(0, 4)
          .map(article => ({
            type: "Kiến thức",
            title: article.title,
            subtitle: article.category,
            href: `/kien-thuc?postId=${encodeURIComponent(article.id)}`,
            image: article.image,
            price: "",
          })),
      ].slice(0, 8)
    : [];

  return (
    <>
      <header
        id="main-header"
        className="sticky top-0 z-50 w-full border-b border-gold-dark/15 bg-[#050505]/95 py-3.5 shadow-lg backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-nowrap lg:gap-2 xl:gap-4">
          <Link to="/" id="logo-link" className="shrink-0">
            <SiteLogo />
          </Link>

          {/* Desktop Navigation Menu */}
          <nav id="desktop-nav" className="hidden xl:flex items-center gap-0.5 whitespace-nowrap">
            {visibleMenuItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);

              return (
                <div key={item.path} className="group/nav relative shrink-0">
                  <Link
                    id={`nav-item-${item.path}`}
                    to={item.path}
                    className={`relative block px-1.5 xl:px-3 py-2 text-[10.5px] xl:text-xs font-display font-semibold uppercase tracking-wide xl:tracking-wider transition-colors duration-200 ${
                      isActive ? "text-gold-light font-bold" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    {item.name}
                    {isActive && (
                      <span
                        id={`nav-active-line-${item.name}`}
                        className="absolute bottom-[-14px] left-0 w-full h-[2px] bg-gradient-to-r from-gold-dark to-gold-light shadow-[0_2px_10px_rgba(245,196,90,0.8)]"
                      />
                    )}
                  </Link>

                  {item.path === "/san-pham" && visibleProductCategories.length > 0 && (
                    <div className="invisible absolute left-0 top-full z-50 min-w-[260px] translate-y-3 rounded-lg border border-gold-dark/30 bg-[#070707]/98 p-2.5 opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.72),0_0_24px_rgba(216,154,43,0.08)] backdrop-blur-md transition-all duration-200 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100">
                      {visibleProductCategories.map((category) => {
                        const children = (category.children || []).filter((child) => !child.hidden);
                        const categoryHref = getCategoryHref(category.id);
                        return (
                          <div key={category.id} className="group/category relative">
                            <Link
                              to={categoryHref}
                              className="flex min-h-10 items-center justify-between gap-3 rounded-md px-3.5 py-2.5 text-[11px] font-display font-bold uppercase tracking-wider text-gray-300 transition-all duration-150 hover:bg-gold-dark/15 hover:text-gold-light focus-visible:bg-gold-dark/15 focus-visible:text-gold-light focus-visible:outline-none"
                            >
                              <span>{category.name}</span>
                              {children.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover/category:text-gold-light" />}
                            </Link>
                            {children.length > 0 && (
                              <div className="invisible absolute left-full top-0 min-w-[240px] rounded-lg border border-gold-dark/30 bg-[#070707]/98 p-2.5 opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.72),0_0_24px_rgba(216,154,43,0.08)] transition-all group-hover/category:visible group-hover/category:opacity-100">
                                {children.map((child) => (
                                  <Link
                                    key={child.id}
                                    to={getCategoryHref(category.id, child.id)}
                                    className="flex min-h-10 items-center rounded-md px-3.5 py-2.5 text-[11px] font-display font-bold uppercase tracking-wider text-gray-400 transition-all duration-150 hover:bg-gold-dark/15 hover:text-gold-light focus-visible:bg-gold-dark/15 focus-visible:text-gold-light focus-visible:outline-none"
                                  >
                                    {child.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div id="header-actions" className="hidden xl:flex items-center gap-1.5 shrink-0">
            <button
              id="search-header-btn"
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-gray-400 hover:text-gold-light transition-colors"
              title="Tìm kiếm"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              id="theme-toggle-btn"
              onClick={toggleDisplayMode}
              className="p-1.5 text-gray-400 hover:text-gold-light transition-colors"
              title={isDayMode ? "Chế độ ban đêm" : "Chế độ ban ngày"}
            >
              {isDayMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            
            <button
              id="cart-header-btn"
              onClick={handleCartClick}
              className="relative p-1.5 text-gray-400 hover:text-gold-light transition-colors"
              title="Sản phẩm"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-gold-dark px-1 text-center text-[9px] font-bold leading-4 text-black shadow-[0_0_5px_#F5C45A]">
                  {cartCount}
                </span>
              )}
            </button>

            <Link
              id="header-cta-btn"
              to="/in-3d-theo-yeu-cau"
              className="gold-border bg-transparent text-[10px] xl:text-xs font-display font-semibold tracking-wider xl:tracking-widest text-[#ECECEC] px-3.5 xl:px-6 py-2 rounded-md hover:bg-gold-dark hover:text-black transition-all duration-300 uppercase shadow-[0_0_15px_rgba(216,154,43,0.1)] hover:shadow-[0_0_20px_rgba(216,154,43,0.4)] shrink-0"
            >
              Gửi Yêu Cầu
            </Link>
          </div>

          {/* Mobile Header Actions */}
          <div id="mobile-menu-trigger" className="flex xl:hidden items-center gap-1 sm:gap-2">
            <button
              id="search-mobile-btn"
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOpen(true);
              }}
              className="rounded-full border border-gold-dark/50 bg-gold-dark/10 p-2 text-gold-light shadow-[0_0_12px_rgba(216,154,43,0.12)] transition-colors hover:bg-gold-dark/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              title="Tìm kiếm sản phẩm"
              aria-label="Tìm kiếm sản phẩm"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              id="cart-mobile-btn"
              type="button"
              onClick={handleCartClick}
              className="relative p-2 text-gray-400 hover:text-gold-light transition-colors"
              aria-label="Mở giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 min-w-4 h-4 rounded-full bg-gold-dark px-1 text-center text-[9px] font-bold leading-4 text-black">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              id="mobile-nav-toggle"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
              aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-drawer"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      <div
        id="mobile-drawer"
        className={`fixed inset-y-0 right-0 max-w-full w-80 bg-[#0A0A0A]/95 backdrop-blur-lg border-l border-gold-dark/15 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 flex flex-col h-full justify-between gap-6">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
              <SiteLogo />
              <button
                id="close-mobile-drawer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              {visibleMenuItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);

                return (
                  <div key={item.path}>
                  <div className="flex items-center border-b border-white/5">
                  <Link
                    key={item.path}
                    id={`mobile-nav-item-${item.path}`}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block flex-1 py-2 text-sm font-display font-medium uppercase tracking-wider pb-2 transition-colors duration-200 ${
                      isActive ? "text-gold-light font-bold" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {isActive && <div className="w-1.5 h-1.5 bg-gold-light rounded-full" />}
                    </div>
                  </Link>
                  {item.path === '/san-pham' && <button type="button" aria-label="Mở danh mục sản phẩm" aria-expanded={isMobileCategoriesOpen} aria-controls="mobile-product-categories" onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)} className="p-3 text-gold-light"><ChevronRight className={`h-4 w-4 transition-transform ${isMobileCategoriesOpen ? 'rotate-90' : ''}`} /></button>}
                  </div>
                  {item.path === '/san-pham' && isMobileCategoriesOpen && (
                    <div id="mobile-product-categories" className="mt-2 space-y-1 border-l border-gold-dark/30 pl-3 uppercase">
                      <Link to="/san-pham" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-xs text-gold-light">Tất cả sản phẩm</Link>
                      {visibleProductCategories.map(category => <div key={category.id}>
                        <Link to={getCategoryHref(category.id)} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-xs text-gray-200">{category.name}</Link>
                        {(category.children || []).filter(child => !child.hidden).map(child => <Link key={child.id} to={getCategoryHref(category.id, child.id)} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 pl-3 text-xs text-gray-400">{child.name}</Link>)}
                      </div>)}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 pt-6 border-t border-white/5 flex flex-col gap-3">
            <Link
              id="mobile-drawer-cta"
              to="/in-3d-theo-yeu-cau"
              className="w-full text-center bg-gradient-to-r from-gold-dark to-gold-light text-black font-display font-semibold py-3 text-xs tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all"
            >
              Gửi Yêu Cầu In 3D
            </Link>
            
            <Link
              id="mobile-drawer-contact"
              to="/lien-he"
              className="w-full text-center border border-white/10 hover:border-white/20 text-gray-400 py-3 text-xs tracking-widest uppercase hover:text-white transition-all"
            >
              Liên Hệ Trợ Giúp
            </Link>
          </div>
        </div>
      </div>

      {/* Background Dim Backdrop for Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 xl:hidden"
        />
      )}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[75] bg-black/85 p-3 backdrop-blur-sm sm:p-4" onClick={() => setIsSearchOpen(false)}>
          <div className="mx-auto mt-12 w-full max-w-2xl border border-gold-dark/30 bg-[#0A0A0A] p-3 shadow-2xl sm:mt-24 sm:p-4" onClick={(event) => event.stopPropagation()}>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 border border-white/10 bg-black px-4 py-3">
              <Search className="h-5 w-5 text-gold-light" />
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm sản phẩm, bài viết..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
              />
              <button type="button" onClick={() => setIsSearchOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </form>
            {normalizedSearch && (
              <p className="mt-2 px-1 text-[9px] font-mono uppercase tracking-wider text-gray-600">
                Nhấn Enter để xem tất cả sản phẩm phù hợp
              </p>
            )}

            <div className="mt-3 max-h-[65vh] overflow-y-auto sm:mt-4 sm:max-h-[55vh]">
              {!normalizedSearch ? (
                <p className="px-2 py-8 text-center text-xs font-display font-bold uppercase tracking-widest text-gray-600">Nhập từ khóa để tìm kiếm</p>
              ) : searchResults.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs font-display font-bold uppercase tracking-widest text-gray-600">Không tìm thấy kết quả</p>
              ) : (
                <div className="divide-y divide-white/10 border border-white/10">
                  {searchResults.map((result) => (
                    <Link
                      key={`${result.type}-${result.href}`}
                      to={result.href}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="group flex min-h-[76px] items-center gap-3 bg-[#111] p-2.5 transition-colors hover:bg-[#181818] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gold-light sm:min-h-[88px] sm:gap-4 sm:p-3"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-white sm:h-16 sm:w-16">
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Search className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[8px] font-display font-bold uppercase tracking-widest text-gold-light sm:text-[9px]">{result.type}</div>
                        <div className="mt-1 line-clamp-2 text-[11px] font-display font-bold uppercase leading-4 text-white sm:text-xs">{result.title}</div>
                        <div className="mt-1 truncate font-mono text-[9px] text-gray-500 sm:text-[10px]">{result.subtitle}</div>
                        {result.price && <div className="mt-1 text-[10px] font-display font-bold text-gold-light sm:hidden">{result.price}</div>}
                      </div>
                      {result.price && (
                        <div className="hidden shrink-0 text-right text-xs font-display font-bold text-gold-light sm:block">
                          {result.price}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <CartDrawer />
    </>
  );
}
