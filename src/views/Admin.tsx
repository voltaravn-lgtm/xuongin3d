/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import WebpConverterAdmin from "../app/admin/tools/webp-converter/page";
import PromoOverlayAdmin from "../app/admin/tools/promo-overlay/page";
import React, { useEffect, useState } from "react";
import { useApp, MenuItem, HeroSlide } from "../context/AppContext";
import { Product } from "../types";
import { 
  Sliders, 
  Menu as MenuIcon, 
  Package, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Upload, 
  Check, 
  ChevronRight, 
  Eye, 
  EyeOff,
  Zap, 
  DollarSign, 
  FileText,
  Mail,
  BookOpen,
  Calculator,
  MapPin,
  PanelsTopLeft,
  ShoppingBag,
  Layers
} from "lucide-react";

import HomePageAdmin from "./Admin/HomePageAdmin";
import AboutPageAdmin from "./Admin/AboutPageAdmin";
import ProductsAdmin from "./Admin/ProductsAdmin";
import AICatalogueAdmin, { type CatalogueTransfer } from "./Admin/AICatalogueAdmin";
import KnowledgeAdmin from "./Admin/KnowledgeAdmin";
import ContactAdmin from "./Admin/ContactAdmin";
import SolutionsAdmin from "./Admin/SolutionsAdmin";
import QuotesAdmin from "./Admin/QuotesAdmin";
import NewsletterAdmin from "./Admin/NewsletterAdmin";
import SiteContactAdmin from "./Admin/SiteContactAdmin";
import LandingPagesAdmin from "./Admin/LandingPagesAdmin";
import LandingOrdersAdmin from "./Admin/LandingOrdersAdmin";
import { ADMIN_PRODUCT_CACHE_EVENT, loadAdminProductCatalogue, loadAdminProductTotal, subscribeAdminNewestProduct } from '../lib/adminProductPages';
import { subscribeNewLandingOrderCount } from '../lib/landing/landingOrderRepository';

export default function Admin() {
  const {
    menuItems,
    setMenuItems,
    products,
    setProducts,
    heroSettings,
    setHeroSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    addMenuItem,
    deleteMenuItem,
    showToast,
    quoteRequests,
    newsletterSubscribers,
    updateQuoteRequest,
    deleteQuoteRequest
  } = useApp();

  const [activeTab, setActiveTabState] = useState<"aiCatalogue" | "hero" | "menu" | "webp" | "promoOverlay" | "products" | "landingPages" | "landingOrders" | "homepage" | "aboutpage" | "knowledge" | "contacts" | "contactSettings" | "quotes" | "newsletter" | "solutions">("hero");
  const [loadingProductTool, setLoadingProductTool] = useState(false);
  const [productTotal, setProductTotal] = useState<number | null>(null);
  const [productTotalError, setProductTotalError] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState<number | null>(null);
  const [orderBadgeError, setOrderBadgeError] = useState(false);
  useEffect(() => {
    let cancelled = false, request = 0;
    const refresh = () => {
      const version = ++request;
      void loadAdminProductTotal().then(total => {
        if (!cancelled && version === request) { setProductTotal(total); setProductTotalError(false); }
      }).catch(() => { if (!cancelled && version === request) setProductTotalError(true); });
    };
    refresh();
    window.addEventListener(ADMIN_PRODUCT_CACHE_EVENT, refresh);
    return () => { cancelled = true; window.removeEventListener(ADMIN_PRODUCT_CACHE_EVENT, refresh); };
  }, []);
  useEffect(() => subscribeNewLandingOrderCount(count => {
    setNewOrderCount(count); setOrderBadgeError(false);
  }, () => { setOrderBadgeError(true); }), []);
  useEffect(() => subscribeAdminNewestProduct(() => {
    // Manual Firebase refresh remains available if live updates disconnect.
  }), []);
  const setActiveTab = async (tab: typeof activeTab) => {
    if (loadingProductTool) return;
    if (tab === 'aiCatalogue' || tab === 'promoOverlay') {
      if (!window.confirm('Công cụ này cần đọc toàn bộ kho để đối chiếu sản phẩm. Dữ liệu lưu tạm 5 phút. Tiếp tục?')) return;
      setLoadingProductTool(true);
      try { setProducts(await loadAdminProductCatalogue()); }
      catch { showToast('Không tải được kho cho công cụ. Chưa chuyển mục.', 'error'); return; }
      finally { setLoadingProductTool(false); }
    }
    setActiveTabState(tab);
  };
  const [catalogueTransfer, setCatalogueTransfer] = useState<CatalogueTransfer | null>(null);

  // Hero config state & multi-slides control
  const [heroTitle, setHeroTitle] = useState(heroSettings.title);
  const [heroSubtitle, setHeroSubtitle] = useState(heroSettings.subtitle);
  const [heroDesc, setHeroDesc] = useState(heroSettings.description);
  const [heroImgUrl, setHeroImgUrl] = useState(heroSettings.bannerImage);
  const [logoTextImage, setLogoTextImage] = useState(heroSettings.logoTextImage || "/images/logo-text-voltera.webp");
  const [useLogoImage, setUseLogoImage] = useState(heroSettings.useLogoImage ?? true);

  const [slides, setSlides] = useState<HeroSlide[]>(() => {
    if (heroSettings.slides && heroSettings.slides.length > 0) {
      return heroSettings.slides;
    }
    return [
      {
        id: "slide-1",
        title: heroSettings.title,
        subtitle: heroSettings.subtitle,
        description: heroSettings.description,
        bannerImage: heroSettings.bannerImage,
        logoTextImage: heroSettings.logoTextImage || "/images/logo-text-voltera.webp",
        useLogoImage: heroSettings.useLogoImage ?? true
      }
    ];
  });
  const [autoplaySpeed, setAutoplaySpeed] = useState(heroSettings.autoplaySpeed || 5000);

  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: "slide-" + Date.now(),
      title: "TIÊU ĐỀ SLIDE MỚI",
      subtitle: "KÍCH HOẠT SỨC MẠNH",
      description: "Mô tả ngắn gọn về sản phẩm, dịch vụ hoặc giải pháp in 3D trong slide này.",
      bannerImage: "/images/voltara_banner.webp",
      logoTextImage: "/images/logo-text-voltera.webp",
      useLogoImage: false
    };
    setSlides(prev => [...prev, newSlide]);
  };

  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      showToast("Hệ thống yêu cầu tối thiểu phải có ít nhất 1 slide hiển thị!", "error");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa slide này không?")) {
      setSlides(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleUpdateSlideField = (id: string, field: keyof HeroSlide, value: any) => {
    setSlides(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleSaveHero = () => {
    const firstSlide = slides[0] || {
      title: heroTitle,
      subtitle: heroSubtitle,
      description: heroDesc,
      bannerImage: heroImgUrl,
      logoTextImage: logoTextImage,
      useLogoImage: useLogoImage
    };

    setHeroSettings({
      title: firstSlide.title,
      subtitle: firstSlide.subtitle,
      description: firstSlide.description,
      bannerImage: firstSlide.bannerImage,
      logoTextImage: firstSlide.logoTextImage,
      useLogoImage: firstSlide.useLogoImage,
      slides: slides,
      autoplaySpeed: autoplaySpeed
    });
    showToast("Đã cập nhật cấu hình Banner và Slide trình chiếu thành công!", "success");
  };

  // Menu editing states
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuPath, setNewMenuPath] = useState("");
  const [newMenuBannerImage, setNewMenuBannerImage] = useState("");
  const [editMenuIdx, setEditMenuIdx] = useState<number | null>(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPath, setEditMenuPath] = useState("");
  const [editMenuBannerImage, setEditMenuBannerImage] = useState("");
  const [editMenuHidden, setEditMenuHidden] = useState(false);

  const handleAddMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName || !newMenuPath) return;
    addMenuItem({
      name: newMenuName.toUpperCase(),
      path: newMenuPath,
      hidden: false,
      bannerImage: newMenuBannerImage.trim(),
    });
    setNewMenuName("");
    setNewMenuPath("");
    setNewMenuBannerImage("");
  };

  const handleSaveEditMenu = (idx: number) => {
    const updated = [...menuItems];
    updated[idx] = {
      ...updated[idx],
      name: editMenuName.toUpperCase(),
      path: editMenuPath,
      bannerImage: editMenuBannerImage.trim(),
      hidden: editMenuHidden,
    };
    setMenuItems(updated);
    setEditMenuIdx(null);
  };

  const handleToggleMenuVisibility = (idx: number) => {
    setMenuItems(prev => prev.map((item, itemIdx) => (
      itemIdx === idx ? { ...item, hidden: !item.hidden } : item
    )));
  };

  return (
    <div id="admin-dashboard-page" className="relative min-h-screen pt-10 pb-24 bg-[#050505]">
      {/* Golden accent ambient ray */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#D89A2B]/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Info header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 mb-10 border-b border-gold-dark/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gold-dark/10 border border-gold-dark/30 rounded-md text-gold-light animate-pulse">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-gold-dark tracking-[0.25em] uppercase">QUẢN TRỊ VIÊN</p>
              <h1 className="text-2xl font-display font-black tracking-wider text-[#ECECEC]">BẢO MẬT HỆ THỐNG</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Dữ liệu: FIREBASE + LOCAL CACHE
            </span>
          </div>
        </div>

        {/* Dashboard Grid split into Left sidebar controls vs Right view editor */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          
          {/* 1. SIDEBAR CONTROLS */}
          <nav
            aria-label="Menu quản trị"
            tabIndex={0}
            className="flex flex-col gap-2 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2 [&>button]:shrink-0 [&>div]:shrink-0"
          >
            
            <button
              id="admin-tab-hero"
              onClick={() => setActiveTab("hero")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "hero"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Zap className="w-4 h-4" />
                Cấu hình Banner Hero
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "hero" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-homepage"
              onClick={() => setActiveTab("homepage")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "homepage"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Zap className="w-4 h-4" />
                Chỉnh sửa Trang Chủ
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "homepage" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-aboutpage"
              onClick={() => setActiveTab("aboutpage")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "aboutpage"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                Chỉnh sửa Giới Thiệu
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "aboutpage" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-menu"
              onClick={() => setActiveTab("menu")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "menu"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <MenuIcon className="w-4 h-4" />
                Quản lý Thanh Menu
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "menu" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-products"
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "products"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                <span title={productTotalError ? 'Không tải được tổng số sản phẩm' : 'Tổng sản phẩm trong kho'}>Kho sản phẩm ({productTotalError ? '?' : productTotal ?? '…'})</span>
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "products" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-landing-pages"
              onClick={() => setActiveTab("landingPages")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${activeTab === "landingPages" ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]" : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"}`}
            >
              <span className="flex items-center gap-3"><PanelsTopLeft className="w-4 h-4" /> Landing Pages</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "landingPages" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-landing-orders"
              onClick={() => setActiveTab("landingOrders")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${activeTab === "landingOrders" ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]" : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"}`}
            >
              <span className="flex items-center gap-3"><ShoppingBag className="w-4 h-4 shrink-0" /><span>Đơn Landing Page</span>
                {orderBadgeError ? <span title="Không kết nối được thông báo đơn mới. Mở mục đơn hàng để kiểm tra." className="text-orange-400">!</span> : newOrderCount !== null && newOrderCount > 0 && <span role="status" aria-label={`${newOrderCount >= 100 ? 'Ít nhất 100' : newOrderCount} đơn mới chưa xử lý`} title="Đơn mới chưa xử lý" className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold tracking-normal text-black">{newOrderCount >= 100 ? '99+' : newOrderCount}</span>}
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "landingOrders" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-knowledge"
              onClick={() => setActiveTab("knowledge")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "knowledge"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <BookOpen className="w-4 h-4" />
                Quản trị Kiến thức
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "knowledge" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-contacts"
              onClick={() => setActiveTab("contacts")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "contacts"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Mail className="w-4 h-4" />
                Tin nhắn Liên Hệ
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "contacts" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-contact-settings"
              onClick={() => setActiveTab("contactSettings")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "contactSettings"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <MapPin className="w-4 h-4" />
                Thông tin liên hệ
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "contactSettings" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-quotes"
              onClick={() => setActiveTab("quotes")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "quotes"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Calculator className="w-4 h-4" />
                Yêu cầu Báo Giá ({quoteRequests.length})
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "quotes" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-newsletter"
              onClick={() => setActiveTab("newsletter")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "newsletter"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Mail className="w-4 h-4" />
                Email nhận tin ({newsletterSubscribers.length})
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "newsletter" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-solutions"
              onClick={() => setActiveTab("solutions")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "solutions"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light shadow-[0_0_15px_rgba(216,154,43,0.15)]"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Zap className="w-4 h-4" />
                Quản lý Giải Pháp
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "solutions" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-webp"
              onClick={() => setActiveTab("webp")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "webp"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Upload className="w-4 h-4" />
                Công cụ WEBP
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "webp" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button
              id="admin-tab-promo-overlay"
              onClick={() => setActiveTab("promoOverlay")}
              className={`w-full flex items-center justify-between text-left px-5 py-4 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${
                activeTab === "promoOverlay"
                  ? "bg-gold-dark/10 border-gold-light text-gold-light"
                  : "bg-black/40 border-[#1A1A1A] text-gray-400 hover:border-gold-dark/30 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                Công cụ Promo Overlay
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "promoOverlay" ? "rotate-90 text-gold-light" : ""}`} />
            </button>

            <button onClick={() => setActiveTab("aiCatalogue")} className={`w-full text-left px-5 py-4 border font-bold text-xs ${activeTab === "aiCatalogue" ? "text-gold-light border-gold-light" : "text-gray-300 border-gray-700"}`}>BỘ TOOL AI · TẠO SẢN PHẨM TỪ ẢNH</button>
            {/* Quick Helper guidelines */}
            <div className="mt-8 p-4 bg-[#0A0A0A] border border-[#1A1A1A] select-none text-[#F5C45A]">
              <div className="flex items-center gap-1.5 mb-2 font-display text-[10px] tracking-widest uppercase font-bold">
                <Eye className="w-3.5 h-3.5" /> Gợi ý thao tác
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Mọi hành động thêm mới sản phẩm hoặc cập nhật banner sẽ được lưu trữ tự động vào trình duyệt của bạn thông qua localStorage. Nhấn phím F12 để kiểm tra.
              </p>
            </div>

          </nav>

          {/* 2. CHOSEN SECTION FRAME COMPONENT */}
          <div className="min-w-0 bg-[#0A0A0A] border border-[#1A1A1A] p-6 sm:p-8">
            
            {/* T1. HERO SETTINGS EDITOR */}
            {activeTab === "hero" && (
              <div id="admin-hero-tab" className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gold-light" />
                    BẢN TIN QUẢN TRỊ SLIDESHOW BANNER CHỦ ({slides.length})
                  </h2>
                  <p className="text-xs text-gray-400">Điều chỉnh ảnh banner, hiệu ứng chuyển slide và nội dung giới thiệu Xưởng In 3D.</p>
                </div>

                {/* Autoplay config */}
                <div className="p-4 bg-gold-dark/5 border border-gold-dark/20 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <h3 className="text-xs font-display font-medium tracking-wider text-gold-light uppercase">
                      TỐC ĐỘ CHUYỂN SLIDE TỰ ĐỘNG
                    </h3>
                    <p className="text-[11px] text-gray-500 italic">Đơn vị tính bằng mili-giây (Mặc định: 5000ms = 5 giây).</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={autoplaySpeed}
                      onChange={(e) => setAutoplaySpeed(Number(e.target.value))}
                      placeholder="Mặc định: 5000"
                      min={1000}
                      step={500}
                      className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-light font-mono text-center"
                    />
                  </div>
                </div>

                {/* Slide List */}
                <div className="space-y-8">
                  {slides.map((slide, idx) => (
                    <div key={slide.id || idx} className="p-5 bg-black border border-[#151515] relative space-y-4">
                      {/* Badge identifier & control */}
                      <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                        <span className="text-xs font-display font-black tracking-widest text-[#F5C45A] uppercase">
                          SLIDE #{idx + 1}
                        </span>
                        
                        {slides.length > 1 && (
                          <button
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-mono select-none uppercase cursor-pointer"
                            title="Xóa slide này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa Slide
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Logo Image toggle */}
                        <div className="col-span-1 md:col-span-2 p-3 bg-white/[0.02] border border-[#1c1c1c] space-y-3">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              id={`useLogoImage-${slide.id}`}
                              checked={slide.useLogoImage ?? false}
                              onChange={(e) => handleUpdateSlideField(slide.id, "useLogoImage", e.target.checked)}
                              className="w-4 h-4 rounded-sm accent-gold-dark bg-black border border-[#333] cursor-pointer"
                            />
                            <label htmlFor={`useLogoImage-${slide.id}`} className="text-xs text-[#ECECEC] font-medium tracking-wide cursor-pointer uppercase font-display select-none">
                              Sử dụng logo hình ảnh thay cho tiêu đề chữ Text
                            </label>
                          </div>

                          {slide.useLogoImage && (
                            <div className="pt-1.5">
                              <label className="text-[9px] font-display uppercase tracking-widest text-gray-500 block font-bold mb-1">
                                Đường dẫn ảnh logo chữ (WebP)
                              </label>
                              <input
                                type="text"
                                value={slide.logoTextImage || ""}
                                onChange={(e) => handleUpdateSlideField(slide.id, "logoTextImage", e.target.value)}
                                placeholder="Ví dụ: /images/logo-text-voltera.webp"
                                className="w-full bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2 text-xs focus:outline-none focus:border-gold-light font-mono"
                              />
                            </div>
                          )}
                        </div>

                        {/* Title text input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">
                            Chữ tiêu đề chính (Nếu không dùng logo ảnh)
                          </label>
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => handleUpdateSlideField(slide.id, "title", e.target.value)}
                            placeholder="Ví dụ: XƯỞNG IN 3D"
                            className="w-full bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2 text-xs focus:outline-none focus:border-gold-light"
                          />
                        </div>

                        {/* Subtitle text input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">
                            Slogan dòng phụ (Nếu không dùng logo ảnh)
                          </label>
                          <input
                            type="text"
                            value={slide.subtitle}
                            onChange={(e) => handleUpdateSlideField(slide.id, "subtitle", e.target.value)}
                            placeholder="Ví dụ: KÍCH HOẠT TƯƠNG LAI"
                            className="w-full bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2 text-xs focus:outline-none focus:border-gold-light"
                          />
                        </div>

                        {/* Description input */}
                        <div className="col-span-1 md:col-span-2 space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">
                            Nội dung mô tả (Description)
                          </label>
                          <textarea
                            rows={2}
                            value={slide.description}
                            onChange={(e) => handleUpdateSlideField(slide.id, "description", e.target.value)}
                            placeholder="Nhập giới thiệu tóm gọn về slide này..."
                            className="w-full bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2 text-xs focus:outline-none focus:border-gold-light leading-relaxed"
                          />
                        </div>

                        {/* Banner image URL input */}
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">
                            Đường dẫn ảnh Banner nền
                          </label>
                          <input
                            type="text"
                            value={slide.bannerImage}
                            onChange={(e) => handleUpdateSlideField(slide.id, "bannerImage", e.target.value)}
                            placeholder="Ví dụ: /images/... hoặc link Unsplash"
                            className="w-full bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2 text-xs focus:outline-none focus:border-gold-light font-mono"
                          />

                          {/* Quick pick templates */}
                          <div className="flex gap-2 pt-1 font-mono text-[9px] text-gray-500 overflow-x-auto whitespace-nowrap">
                            <span className="font-display font-bold uppercase text-[8px] text-gray-400">Chọn nhanh:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateSlideField(slide.id, "bannerImage", "/images/voltara_banner.webp")}
                              className="underline hover:text-gold-light cursor-pointer"
                            >
                              [Banner Lưới Sét Tròn]
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSlideField(slide.id, "bannerImage", "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=1600")}
                              className="underline hover:text-gold-light cursor-pointer"
                            >
                              [Trạm Năng lượng Mặt trời Unsplash]
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSlideField(slide.id, "bannerImage", "https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&q=80&w=1200")}
                              className="underline hover:text-gold-light cursor-pointer"
                            >
                              [Vi mạch Điện tử Xanh Unsplash]
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create slide / Save action bottom control */}
                <div className="pt-6 border-t border-gold-dark/15 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <button
                    onClick={handleAddSlide}
                    className="w-full sm:w-auto border border-gold-dark/30 hover:border-gold-light bg-black hover:bg-gold-light/5 text-[#ECECEC] font-display font-medium py-2.5 px-6 text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                  >
                    <Plus className="w-3.5 h-3.5 text-gold-light" />
                    Thêm Slide mới
                  </button>

                  <button
                    onClick={handleSaveHero}
                    className="w-full sm:w-auto gold-gradient-bg text-black font-display font-bold py-2.5 px-8 text-xs tracking-widest uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                  >
                    <Save className="w-4 h-4" />
                    LƯU TOÀN BỘ CẤU HÌNH BANNER SLIDESHOW
                  </button>
                </div>
              </div>
            )}

            {/* T2. MENU MANAGEMENT TAB */}
            {activeTab === "menu" && (
              <div id="admin-menu-tab" className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2 text-gold-light">
                    <MenuIcon className="w-4 h-4" />
                    QUẢN LÝ THANH MENU ĐIỀU HƯỚNG ({menuItems.length})
                  </h2>
                  <p className="text-xs text-gray-400">Thêm, bớt, đổi ảnh banner theo từng trang và bật/tắt mục hiển thị trên thanh điều hướng.</p>
                </div>

                {/* Form to insert new link */}
                <form onSubmit={handleAddMenu} className="p-4 bg-black border border-[#1A1A1A] grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[9px] font-display uppercase tracking-wider text-gray-400 block font-bold">Chữ Menu (Ví dụ: "DỊCH VỤ MỚI")</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: ĐỔI MỚI"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[9px] font-display uppercase tracking-wider text-gray-400 block font-bold">Đường dẫn Path (Ví dụ: "/dich-vu-moi")</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: /gioi-thieu"
                      value={newMenuPath}
                      onChange={(e) => setNewMenuPath(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-display uppercase tracking-wider text-gray-400 block font-bold">Ảnh banner trang (URL hoặc /images/...)</label>
                    <input
                      type="text"
                      placeholder="/images/hoc-vien.webp"
                      value={newMenuBannerImage}
                      onChange={(e) => setNewMenuBannerImage(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="md:col-span-2 w-full bg-[#1A1A1A] hover:bg-gold-dark hover:text-black hover:border-gold-light border border-white/5 text-xs text-[#ECECEC] py-2.5 px-3 font-display font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm mục mới
                  </button>
                </form>

                {/* Menu items listing table */}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] font-display uppercase tracking-widest text-[#F5C45A] block font-bold">Danh sách Menu hiện hành</span>
                  
                  <div className="border border-[#1A1A1A] divide-y divide-[#1A1A1A] bg-black">
                    {menuItems.map((item, idx) => (
                      <div key={idx} className={`flex flex-col gap-3 p-3.5 hover:bg-[#0E0E0E] transition-colors leading-none lg:flex-row lg:items-center lg:justify-between ${item.hidden ? "opacity-60" : ""}`}>
                        
                        {editMenuIdx === idx ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3 lg:mr-4">
                            <div className="xl:col-span-3 space-y-1">
                              <label className="text-[9px] font-display uppercase tracking-wider text-gray-500 font-bold">Tên menu</label>
                              <input
                                type="text"
                                value={editMenuName}
                                onChange={(e) => setEditMenuName(e.target.value)}
                                className="w-full bg-black border border-gold-dark/40 text-xs px-3 py-2 text-white focus:outline-none font-bold"
                              />
                            </div>
                            <div className="xl:col-span-3 space-y-1">
                              <label className="text-[9px] font-display uppercase tracking-wider text-gray-500 font-bold">Đường dẫn</label>
                              <input
                                type="text"
                                value={editMenuPath}
                                onChange={(e) => setEditMenuPath(e.target.value)}
                                className="w-full bg-black border border-gold-dark/40 text-xs px-3 py-2 text-[#F5C45A] focus:outline-none font-mono"
                              />
                            </div>
                            <div className="sm:col-span-2 xl:col-span-5 space-y-1">
                              <label className="text-[9px] font-display uppercase tracking-wider text-gray-500 font-bold">Ảnh banner</label>
                              <input
                                type="text"
                                value={editMenuBannerImage}
                                onChange={(e) => setEditMenuBannerImage(e.target.value)}
                                className="w-full bg-black border border-gold-dark/40 text-xs px-3 py-2 text-gray-200 focus:outline-none font-mono"
                                placeholder="/images/hoc-vien.webp"
                              />
                            </div>
                            <label className="xl:col-span-1 flex items-end gap-2 text-[10px] text-gray-300 uppercase font-display font-bold tracking-wider pb-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!editMenuHidden}
                                onChange={(e) => setEditMenuHidden(!e.target.checked)}
                                className="accent-[#D89A2B]"
                              />
                              Hiện
                            </label>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-500 font-bold">#{String(idx + 1).padStart(2, "0")}</span>
                            {item.bannerImage && (
                              <img
                                src={item.bannerImage}
                                alt=""
                                className="hidden sm:block w-14 h-9 object-cover border border-white/10 bg-[#050505]"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-display font-black text-[#ECECEC] tracking-wide">{item.name}</span>
                                <span className={`text-[9px] font-display font-black uppercase tracking-wider px-2 py-0.5 border ${item.hidden ? "text-gray-400 border-gray-600 bg-gray-500/10" : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"}`}>
                                  {item.hidden ? "Đang ẩn" : "Đang hiện"}
                                </span>
                                <span className="text-[10px] font-mono text-[#D89A2B] bg-[#D89A2B]/10 px-2.5 py-0.5 border border-[#D89A2B]/20">{item.path}</span>
                              </div>
                              {item.bannerImage && (
                                <p className="text-[10px] font-mono text-gray-500 truncate max-w-[620px] leading-relaxed">{item.bannerImage}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {editMenuIdx === idx ? (
                            <>
                              <button
                                onClick={() => handleSaveEditMenu(idx)}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border border-emerald-500/20 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditMenuIdx(null)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditMenuIdx(idx);
                                  setEditMenuName(item.name);
                                  setEditMenuPath(item.path);
                                  setEditMenuBannerImage(item.bannerImage || "");
                                  setEditMenuHidden(!!item.hidden);
                                }}
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 transition-all cursor-pointer"
                                title="Sửa menu"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleMenuVisibility(idx)}
                                className={`px-2 py-1.5 border text-[10px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                  item.hidden
                                    ? "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-black border-emerald-500/20"
                                    : "bg-gray-500/10 hover:bg-gray-500 text-gray-300 hover:text-black border-gray-500/20"
                                }`}
                                title={item.hidden ? "Hiện menu" : "Ẩn menu"}
                              >
                                {item.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                {item.hidden ? "Hiện" : "Ẩn"}
                              </button>
                              <button
                                onClick={() => deleteMenuItem(idx)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition-all cursor-pointer"
                                title="Xóa menu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>

                  <span className="text-[10px] text-gray-500 block leading-relaxed italic pt-2">
                    * Lưu ý: Khi chỉnh sửa đường dẫn path của menu, hãy đảm bảo đường dẫn đó tương thích với các Route hệ thống đã cấu hình. Ví dụ: /san-pham, /giai-phap.
                  </span>
                </div>
              </div>
            )}

            {/* T3. INVENTORY PRODUCTS MANAGEMENT */}
            {activeTab === "products" && <ProductsAdmin catalogueTransfer={catalogueTransfer} onCatalogueConsumed={() => setCatalogueTransfer(null)} />}
            {activeTab === "aiCatalogue" && <AICatalogueAdmin onTransfer={draft => { setCatalogueTransfer(draft); setActiveTab("products"); }} />}

            {activeTab === "landingPages" && <LandingPagesAdmin />}

            {activeTab === "landingOrders" && <LandingOrdersAdmin />}

            {/* T4. HOMEPAGE CONTENT EDITING */}
            {activeTab === "homepage" && <HomePageAdmin />}

            {/* T5. ABOUTPAGE CONTENT EDITING */}
            {activeTab === "aboutpage" && <AboutPageAdmin />}

            {/* T6. KNOWLEDGE/ARTICLES BASE MANAGEMENT */}
            {activeTab === "knowledge" && <KnowledgeAdmin />}

            {/* T12. CUSTOMER QUOTE REQUESTS */}
            {activeTab === "quotes" && <QuotesAdmin />}

            {activeTab === "newsletter" && <NewsletterAdmin />}

            {/* T8. CONTACT SUBMISSIONS VIEWER */}
            {activeTab === "contacts" && <ContactAdmin />}

            {activeTab === "contactSettings" && <SiteContactAdmin />}

            {/* T9. ENERGY SOLUTIONS EDITOR */}
            {activeTab === "solutions" && <SolutionsAdmin />}

            {activeTab === "webp" && <WebpConverterAdmin />}

            {activeTab === "promoOverlay" && <PromoOverlayAdmin />}

          </div>

        </div>
      </div>

    </div>
  );
}
