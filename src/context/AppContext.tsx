/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch, runTransaction, serverTimestamp } from "firebase/firestore";
import { normalizePrintFileUrl } from "../lib/productPrintFile";
import { availableProductSku } from "../lib/productSku";
import { Product, ProductVariant, ProductCombo, SalesProgram, Solution, Article, Branch, Dealer, HomeContent, AboutContent, Job, ContactSubmission, WarrantyRecord, ToastMessage, QuoteRequest, Course, CartItem } from "../types";
import { getProductSlug } from "../lib/productRoutes";
import { isValidProductSize } from "../lib/productSize";
import { PRODUCTS_DATA, SOLUTIONS_DATA, ARTICLES_DATA, BRANCHES_DATA, DEALERS_DATA, JOBS_DATA, COURSES_DATA } from "../data";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { isAdminEmail } from "../lib/adminAuth";
import { trashProduct } from "../lib/productTrash";
import { revalidateProductCache } from "../lib/productCacheClient";
import { invalidateAdminProductPages } from "../lib/adminProductPages";

export interface MenuItem {
  name: string;
  path: string;
  hidden?: boolean;
  bannerImage?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  hidden?: boolean;
  children?: Array<{
    id: string;
    name: string;
    hidden?: boolean;
  }>;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bannerImage: string;
  logoTextImage?: string;
  useLogoImage?: boolean;
}

export interface HeroSettings {
  title: string;
  subtitle: string;
  description: string;
  bannerImage: string;
  logoTextImage?: string;
  useLogoImage?: boolean;
  slides?: HeroSlide[];
  autoplaySpeed?: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source?: string;
  date: string;
}

export interface SiteContactSettings {
  companyName: string;
  address: string;
  hotline: string;
  email: string;
  workingHours: string;
  googleMapEmbedUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  zaloUrl: string;
  tiktokUrl: string;
}

export interface PromoOverlaySettings {
  enabled: boolean;
  imageUrl: string;
  fileName?: string;
  endDate?: string;
  library?: Array<{
    url: string;
    fileName: string;
    createdAt: string;
  }>;
  updatedAt?: string;
}

export interface DealerPricingSettings {
  level2DiscountPercent: number;
  level1DiscountPercent: number;
  level1ExtraDiscountPercent?: number;
  updatedAt?: string;
}

function sortProductsNewestFirst(items: Product[]) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (aTime !== bTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id), "vi");
  });
}

function sortWarrantiesNewestFirst(items: WarrantyRecord[]) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (aTime !== bTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id), "vi");
  });
}

function sortCoursesNewestFirst(items: Course[]) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (aTime !== bTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id), "vi");
  });
}

function omitUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => omitUndefinedValues(item)) as T;
  }

  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, omitUndefinedValues(item)])
    ) as T;
  }

  return value;
}

interface AppContextType {
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  productCategories: ProductCategory[];
  setProductCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  solutions: Solution[];
  setSolutions: React.Dispatch<React.SetStateAction<Solution[]>>;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  dealers: Dealer[];
  setDealers: React.Dispatch<React.SetStateAction<Dealer[]>>;
  heroSettings: HeroSettings;
  setHeroSettings: React.Dispatch<React.SetStateAction<HeroSettings>>;
  homeContent: HomeContent;
  setHomeContent: React.Dispatch<React.SetStateAction<HomeContent>>;
  aboutContent: AboutContent;
  setAboutContent: React.Dispatch<React.SetStateAction<AboutContent>>;
  
  // New States
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  contactSubmissions: ContactSubmission[];
  setContactSubmissions: React.Dispatch<React.SetStateAction<ContactSubmission[]>>;
  warranties: WarrantyRecord[];
  setWarranties: React.Dispatch<React.SetStateAction<WarrantyRecord[]>>;
  academyCourses: Course[];
  setAcademyCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  
  // Dynamic State Modifiers for Easy Administration
  updateProduct: (product: Product, printFileUrl?: string) => Promise<boolean>;
  addProduct: (product: Product, printFileUrl?: string) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateMenuItem: (index: number, updatedItem: MenuItem) => void;
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (index: number) => void;

  // Articles Modifiers
  addArticle: (art: Article) => Promise<boolean>;
  updateArticle: (art: Article) => Promise<boolean>;
  deleteArticle: (id: string) => Promise<boolean>;

  // Jobs Modifiers
  addJob: (jb: Job) => void;
  updateJob: (jb: Job) => void;
  deleteJob: (id: string) => void;

  // Submissions Modifiers
  addSubmission: (sub: ContactSubmission) => void;
  deleteSubmission: (id: string) => void;

  // Warranty Modifiers
  addWarranty: (w: WarrantyRecord) => void;
  addWarrantiesBulk: (items: WarrantyRecord[]) => Promise<void>;
  updateWarranty: (w: WarrantyRecord) => void;
  deleteWarranty: (id: string) => void;

  // Academy Modifiers
  addAcademyCourse: (course: Course) => void;
  updateAcademyCourse: (course: Course) => void;
  deleteAcademyCourse: (id: string) => void;

  // Solutions Modifiers
  addSolution: (sol: Solution) => void;
  updateSolution: (sol: Solution) => void;
  deleteSolution: (id: string) => void;

  // Branch Modifiers
  addBranch: (br: Branch) => void;
  updateBranch: (br: Branch) => void;
  deleteBranch: (id: string) => void;

  // Dealer Modifiers
  addDealer: (dl: Dealer) => void;
  updateDealer: (dl: Dealer) => void;
  deleteDealer: (id: string) => void;

  // Quote Requests System
  quoteRequests: QuoteRequest[];
  setQuoteRequests: React.Dispatch<React.SetStateAction<QuoteRequest[]>>;
  addQuoteRequest: (req: QuoteRequest) => void;
  updateQuoteRequest: (req: QuoteRequest) => void;
  deleteQuoteRequest: (id: string) => void;
  newsletterSubscribers: NewsletterSubscriber[];
  setNewsletterSubscribers: React.Dispatch<React.SetStateAction<NewsletterSubscriber[]>>;
  addNewsletterSubscriber: (email: string) => Promise<void>;
  deleteNewsletterSubscriber: (email: string) => Promise<void>;
  contactSettings: SiteContactSettings;
  updateContactSettings: (settings: SiteContactSettings) => Promise<void>;
  promoOverlaySettings: PromoOverlaySettings;
  updatePromoOverlaySettings: (settings: PromoOverlaySettings) => Promise<void>;
  dealerPricingSettings: DealerPricingSettings;
  updateDealerPricingSettings: (settings: DealerPricingSettings) => Promise<void>;
  salesPrograms: SalesProgram[];
  addSalesProgram: (program: SalesProgram) => void;
  updateSalesProgram: (program: SalesProgram) => void;
  deleteSalesProgram: (id: string) => void;
  cartItems: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant | null, combo?: ProductCombo | null) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string, comboId?: string) => void;
  removeFromCart: (productId: string, variantId?: string, comboId?: string) => void;
  clearCart: () => void;
  cartCount: number;

  // Custom Toast Notification System
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const defaultPromoOverlaySettings: PromoOverlaySettings = {
  enabled: false,
  imageUrl: "",
  fileName: "",
  endDate: "",
  library: [],
};

export const defaultDealerPricingSettings: DealerPricingSettings = {
  level2DiscountPercent: 10,
  level1DiscountPercent: 15,
};

function normalizeDealerPricingSettings(settings?: Partial<DealerPricingSettings>): DealerPricingSettings {
  const level2 = Number(settings?.level2DiscountPercent ?? defaultDealerPricingSettings.level2DiscountPercent);
  const legacyExtra = Number(settings?.level1ExtraDiscountPercent ?? 0);
  return {
    ...defaultDealerPricingSettings,
    ...settings,
    level2DiscountPercent: level2,
    level1DiscountPercent: Number(settings?.level1DiscountPercent ?? (level2 + legacyExtra || defaultDealerPricingSettings.level1DiscountPercent)),
  };
}

const defaultMenuBannerImages: Record<string, string> = {
  "/": "/images/voltara_banner.webp",
  "/gioi-thieu": "/images/lien-he.webp",
  "/san-pham": "/images/san-pham.webp",
  "/in-3d-theo-yeu-cau": "/images/in-3d-theo-yeu-cau.webp",
  "/giai-phap": "/images/giai-phap.webp",
  "/du-an-da-thuc-hien": "/images/du-an-da-thuc-hien.webp",
  "/dai-ly": "/images/dai-ly.webp",
  "/bao-hanh": "/images/bao-hanh.webp",
  "/hoc-vien": "/images/hoc-vien.webp",
  "/kien-thuc": "/images/kien-thuc.webp",
  "/tuyen-dung": "/images/tuyen-dung.webp",
  "/lien-he": "/images/lien-he.webp",
};

function withMenuDefaults(item: MenuItem): MenuItem {
  const legacyBannerReplacements: Record<string, string[]> = {
    "/gioi-thieu": ["/images/voltara_banner.webp"],
    "/in-3d-theo-yeu-cau": ["/images/san-pham.webp"],
    "/du-an-da-thuc-hien": ["/images/giai-phap.webp"],
  };
  const shouldMigrateBanner = legacyBannerReplacements[item.path]?.includes(item.bannerImage || "");

  return {
    ...item,
    hidden: item.hidden ?? false,
    bannerImage: shouldMigrateBanner
      ? defaultMenuBannerImages[item.path]
      : item.bannerImage || defaultMenuBannerImages[item.path] || "",
  };
}

const defaultMenuItems: MenuItem[] = [
  { name: "TRANG CHỦ", path: "/" },
  { name: "SẢN PHẨM", path: "/san-pham" },
  { name: "IN 3D THEO YÊU CẦU", path: "/in-3d-theo-yeu-cau" },
  { name: "GIẢI PHÁP DOANH NGHIỆP", path: "/giai-phap" },
  { name: "DỰ ÁN ĐÃ THỰC HIỆN", path: "/du-an-da-thuc-hien" },
  { name: "KIẾN THỨC 3D", path: "/kien-thuc" },
  { name: "GIỚI THIỆU - LIÊN HỆ", path: "/gioi-thieu" },
  { name: "HỌC VIỆN", path: "/hoc-vien", hidden: true },
  { name: "TUYỂN DỤNG", path: "/tuyen-dung", hidden: true },
].map(withMenuDefaults);

export const defaultProductCategories: ProductCategory[] = [
  { id: "den-do-decor-trang-tri", name: "ĐÈN - ĐỒ DECOR - TRANG TRÍ" },
  { id: "do-dung-tien-ich-phu-kien", name: "ĐỒ DÙNG TIỆN ÍCH - PHỤ KIỆN" },
  { id: "qua-tang-do-dung-gia-dinh", name: "QUÀ TẶNG - ĐỒ DÙNG GIA ĐÌNH" },
  { id: "mo-hinh-tuong-nhan-vat", name: "MÔ HÌNH - TƯỢNG - NHÂN VẬT" },
  { id: "do-cong-nghe", name: "ĐỒ CÔNG NGHỆ" },
  { id: "chau-cay-trang-tri-cay", name: "CHẬU CÂY - TRANG TRÍ CÂY" },
  { id: "trang-tri-ho-ca-be-ca", name: "TRANG TRÍ HỒ CÁ - BỂ CÁ" },
  { id: "doanh-nghiep-posm", name: "DOANH NGHIỆP - POSM" },
  { id: "kien-truc-sa-ban", name: "KIẾN TRÚC - SA BÀN" },
];

function restoreMissingMenuItems(items: MenuItem[]) {
  const hasAcademy = items.some((item) => item.path === "/hoc-vien");
  if (hasAcademy) return items.map(withMenuDefaults);

  const nextItems = [...items];
  const warrantyIndex = nextItems.findIndex((item) => item.path === "/bao-hanh");
  nextItems.splice(warrantyIndex >= 0 ? warrantyIndex + 1 : nextItems.length, 0, {
    name: "HỌC VIỆN",
    path: "/hoc-vien",
  });
  return nextItems.map(withMenuDefaults);
}

const defaultHeroSettings: HeroSettings = {
  title: "XƯỞNG IN 3D",
  subtitle: "HIỆN THỰC HÓA MỌI Ý TƯỞNG",
  description: "Nhận thiết kế và in 3D theo yêu cầu cho cá nhân, gia đình và doanh nghiệp. Từ một sản phẩm độc bản đến mẫu thử, POSM và mô hình dự án.",
  bannerImage: "/images/voltara_banner.webp",
  logoTextImage: "",
  useLogoImage: false,
  autoplaySpeed: 5000,
  slides: [
    {
      id: "slide-1",
      title: "XƯỞNG IN 3D",
      subtitle: "HIỆN THỰC HÓA MỌI Ý TƯỞNG",
      description: "Nhận thiết kế và in 3D theo yêu cầu cho cá nhân, gia đình và doanh nghiệp. Từ một sản phẩm độc bản đến mẫu thử, POSM và mô hình dự án.",
      bannerImage: "/images/voltara_banner.webp",
      logoTextImage: "",
      useLogoImage: false
    },
    {
      id: "slide-2",
      title: "IN 3D THEO YÊU CẦU",
      subtitle: "THIẾT KẾ RIÊNG - SẢN XUẤT LINH HOẠT",
      description: "Gửi file 3D, bản vẽ, hình ảnh tham khảo hoặc mẫu thật. Xưởng tư vấn vật liệu, kích thước và phương án hoàn thiện phù hợp nhu cầu.",
      bannerImage: "/images/voltara_banner-1.webp",
      logoTextImage: "",
      useLogoImage: false
    }
  ]
};

const defaultContactSettings: SiteContactSettings = {
  companyName: "Công Ty Tập Đoàn Thay Đổi Liên Tục",
  address: "71/1E Võ Văn Hát, Long Trường, TP.HCM",
  hotline: "0822 426 639",
  email: "xuongin3d@gmail.com",
  workingHours: "24/7",
  googleMapEmbedUrl: "",
  facebookUrl: "#facebook",
  youtubeUrl: "#youtube",
  zaloUrl: "#zalo",
  tiktokUrl: "#tiktok",
};

const defaultHomeContent: HomeContent = {
  section2Title: "Sản Phẩm In 3D Theo Nhu Cầu",
  section2Desc: "Đa dạng mẫu mã, vật liệu và kích thước cho trang trí, tiện ích, quà tặng, mô hình và dự án doanh nghiệp.",
  feature1Title: "Thiết Kế Theo Yêu Cầu",
  feature1Desc: "Nhận file, hình ảnh, bản vẽ hoặc mẫu thật.",
  feature2Title: "Đa Dạng Vật Liệu",
  feature2Desc: "Tư vấn PLA, PETG, ABS, TPU và Resin.",
  feature3Title: "Nhận In Từ Một Sản Phẩm",
  feature3Desc: "Linh hoạt từ mẫu độc bản đến lô nhỏ.",
  feature4Title: "Hỗ Trợ 24/7",
  feature4Desc: "Tư vấn nhanh qua hotline 0822 426 639.",
};

const defaultAboutContent: AboutContent = {
  section1Subtitle: "VỀ XƯỞNG IN 3D",
  section1Title: "TỪ Ý TƯỞNG ĐẾN SẢN PHẨM THỰC TẾ",
  section1Desc: "Xưởng In 3D cung cấp dịch vụ thiết kế, tạo mẫu và sản xuất sản phẩm in 3D theo yêu cầu cho cá nhân, gia đình và doanh nghiệp. Chúng tôi tiếp nhận từ ý tưởng, hình ảnh, bản vẽ, file 3D hoặc mẫu thật để tư vấn phương án phù hợp.",
  section1BannerImage: "/images/voltara_banner.webp",
  strategicTitle: "CÁCH CHÚNG TÔI LÀM VIỆC",
  strategic1Year: "01",
  strategic1Title: "TIẾP NHẬN Ý TƯỞNG",
  strategic1Desc: "Khách hàng gửi file, hình ảnh tham khảo, kích thước, bản vẽ hoặc mẫu thật cùng mục đích sử dụng.",
  strategic2Year: "02",
  strategic2Title: "TƯ VẤN VÀ TẠO MẪU",
  strategic2Desc: "Xưởng đề xuất công nghệ in, vật liệu, độ hoàn thiện và phương án sản xuất phù hợp ngân sách.",
  strategic3Year: "03",
  strategic3Title: "SẢN XUẤT VÀ BÀN GIAO",
  strategic3Desc: "Sản phẩm được kiểm tra trước khi bàn giao; các yêu cầu điều chỉnh được trao đổi rõ ràng theo từng dự án.",
  missionTitle: "SỨ MỆNH",
  missionDesc: "Giúp cá nhân và doanh nghiệp hiện thực hóa ý tưởng nhanh chóng bằng công nghệ in 3D linh hoạt, dễ tiếp cận và phù hợp nhu cầu thực tế.",
  coreValuesTitle: "GIÁ TRỊ CỐT LÕI",
  coreValue1Title: "Chất lượng",
  coreValue1Desc: "Kiểm tra sản phẩm trước khi bàn giao.",
  coreValue2Title: "Đổi mới",
  coreValue2Desc: "Linh hoạt thiết kế, vật liệu và cách hoàn thiện.",
  coreValue3Title: "Hợp tác",
  coreValue3Desc: "Trao đổi rõ ràng trong suốt quá trình thực hiện.",
  coreValue4Title: "Trách nhiệm",
  coreValue4Desc: "Tôn trọng mục đích sử dụng và tiến độ đã thống nhất.",
  stat1Num: "FDM",
  stat1Label: "Công nghệ in sợi nhựa",
  stat2Num: "RESIN",
  stat2Label: "Công nghệ in chi tiết",
  stat3Num: "1+",
  stat3Label: "Nhận từ một sản phẩm",
  stat4Num: "24/7",
  stat4Label: "Tiếp nhận yêu cầu",
  factorySubtitle: "NĂNG LỰC THỰC HIỆN",
  factoryTitle: "Thiết Kế, Tạo Mẫu Và Sản Xuất Linh Hoạt",
  factoryDesc: "Xưởng tiếp nhận nhiều nhóm sản phẩm từ decor, quà tặng và phụ kiện đến mô hình kỹ thuật, POSM và sa bàn. Mỗi yêu cầu được tư vấn vật liệu và công nghệ dựa trên công năng thực tế.",
  factoryImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
  quoteText: "Mỗi ý tưởng đều có thể bắt đầu từ một mẫu thử. In 3D giúp rút ngắn khoảng cách từ bản vẽ đến sản phẩm có thể cầm trên tay.",
  quoteAuthor: "XƯỞNG IN 3D",
};

const defaultWarranties: WarrantyRecord[] = [];
const defaultQuoteRequests: QuoteRequest[] = [];

const LEGACY_CACHE_CLEANUP_KEY = "xuongin3d_legacy_voltara_cleanup_v1";
const LEGACY_CONTENT_CACHE_KEYS = [
  "xuongin3d_products",
  "xuongin3d_solutions",
  "xuongin3d_articles",
  "xuongin3d_branches",
  "xuongin3d_dealers",
  "xuongin3d_hero_settings",
  "xuongin3d_home_content",
  "xuongin3d_about_content",
  "xuongin3d_jobs",
  "xuongin3d_warranties",
  "xuongin3d_academy_courses",
  "xuongin3d_sales_programs",
  "xuongin3d_cart_items",
  "xuongin3d_promo_overlay_settings",
];

function clearLegacyVoltaraCache() {
  if (typeof window === "undefined") return;

  const cachedProducts = localStorage.getItem("xuongin3d_products") || "";
  const containsLegacyCatalog = /voltara|pin lithium|lifepo4|ắc quy|bộ lưu điện|makita|dewalt|milwaukee|bosch/i.test(cachedProducts);

  if (containsLegacyCatalog) {
    LEGACY_CONTENT_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  if (containsLegacyCatalog || !localStorage.getItem(LEGACY_CACHE_CLEANUP_KEY)) {
    localStorage.setItem(LEGACY_CACHE_CLEANUP_KEY, new Date().toISOString());
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  clearLegacyVoltaraCache();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  // Load or Initialize Navigation Menus
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem("xuongin3d_menu_items");
    return saved ? restoreMissingMenuItems(JSON.parse(saved)) : defaultMenuItems;
  });

  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => {
    const saved = localStorage.getItem("xuongin3d_product_categories");
    return saved ? JSON.parse(saved) : defaultProductCategories;
  });

  // Load or Initialize Products
  const [products, setProducts] = useState<Product[]>(() => {
    if (isAdminRoute) return [];
    const saved = localStorage.getItem("xuongin3d_products");
    return saved ? JSON.parse(saved) : PRODUCTS_DATA;
  });

  // Load or Initialize Solutions
  const [solutions, setSolutions] = useState<Solution[]>(() => {
    const saved = localStorage.getItem("xuongin3d_solutions");
    return saved ? JSON.parse(saved) : SOLUTIONS_DATA;
  });

  // Load or Initialize Articles
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem("xuongin3d_articles");
    const seedVersion = "2026-10-03-articles-v3";
    const currentSeedVersion = localStorage.getItem("xuongin3d_articles_seed_version");

    if (!saved) {
      localStorage.setItem("xuongin3d_articles_seed_version", seedVersion);
      return ARTICLES_DATA;
    }

    const savedArticles = JSON.parse(saved) as Article[];
    if (currentSeedVersion === seedVersion) return savedArticles;

    const seedIds = new Set(ARTICLES_DATA.map((article) => article.id));
    const customArticles = savedArticles.filter((article) => !seedIds.has(article.id));
    localStorage.setItem("xuongin3d_articles_seed_version", seedVersion);
    return [...ARTICLES_DATA, ...customArticles];
  });

  // Load or Initialize Branches
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem("xuongin3d_branches");
    return saved ? JSON.parse(saved) : BRANCHES_DATA;
  });

  // Load or Initialize Dealers
  const [dealers, setDealers] = useState<Dealer[]>(() => {
    const saved = localStorage.getItem("xuongin3d_dealers");
    return saved ? JSON.parse(saved) : DEALERS_DATA;
  });

  // Load or Initialize Hero Settings
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(() => {
    const saved = localStorage.getItem("xuongin3d_hero_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.bannerImage && (parsed.bannerImage.endsWith(".png") || parsed.bannerImage.includes("voltara_banner_1780714848034"))) {
        parsed.bannerImage = "/images/voltara_banner.webp";
      }
      if (parsed.slides && Array.isArray(parsed.slides)) {
        parsed.slides = parsed.slides.map((s: any) => {
          if (s.bannerImage?.includes("photo-1544383835-bda2bc66a55d")) {
            return { ...s, bannerImage: "/images/voltara_banner-1.webp" };
          }
          if (s.bannerImage && (s.bannerImage.includes("voltara_banner_1780714848034") || s.bannerImage.endsWith(".png"))) {
            return { ...s, bannerImage: "/images/voltara_banner.webp" };
          }
          return s;
        });
      }
      return parsed;
    }
    return defaultHeroSettings;
  });

  // Load or Initialize Home Content
  const [homeContent, setHomeContent] = useState<HomeContent>(() => {
    const saved = localStorage.getItem("xuongin3d_home_content");
    return saved ? { ...defaultHomeContent, ...JSON.parse(saved) } : defaultHomeContent;
  });

  // Load or Initialize About Content
  const [aboutContent, setAboutContent] = useState<AboutContent>(() => {
    const saved = localStorage.getItem("xuongin3d_about_content");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.section1BannerImage && (parsed.section1BannerImage.includes("unsplash.com") || parsed.section1BannerImage.includes("voltara_banner_1780714848034"))) {
        parsed.section1BannerImage = "/images/voltara_banner.webp";
      }
      return { ...defaultAboutContent, ...parsed };
    }
    return defaultAboutContent;
  });

  // Load or Initialize Jobs (Recruitment)
  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem("xuongin3d_jobs");
    return saved ? JSON.parse(saved) : JOBS_DATA;
  });

  // Load or Initialize Contact Submissions
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>(() => {
    const saved = localStorage.getItem("xuongin3d_contact_submissions");
    return saved ? JSON.parse(saved) : [];
  });

  // Load or Initialize Warranties
  const [warranties, setWarranties] = useState<WarrantyRecord[]>(() => {
    const saved = localStorage.getItem("xuongin3d_warranties");
    return saved ? JSON.parse(saved) : defaultWarranties;
  });

  // Load or Initialize Academy Courses
  const [academyCourses, setAcademyCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem("xuongin3d_academy_courses");
    return saved ? sortCoursesNewestFirst(JSON.parse(saved)) : sortCoursesNewestFirst(COURSES_DATA);
  });

  // Load or Initialize Quote Requests
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>(() => {
    const saved = localStorage.getItem("xuongin3d_quote_requests");
    return saved ? JSON.parse(saved) : defaultQuoteRequests;
  });

  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [contactSettings, setContactSettings] = useState<SiteContactSettings>(() => {
    const saved = localStorage.getItem("xuongin3d_contact_settings");
    return saved ? { ...defaultContactSettings, ...JSON.parse(saved) } : defaultContactSettings;
  });
  const [promoOverlaySettings, setPromoOverlaySettings] = useState<PromoOverlaySettings>(() => {
    const saved = localStorage.getItem("xuongin3d_promo_overlay_settings");
    return saved ? { ...defaultPromoOverlaySettings, ...JSON.parse(saved) } : defaultPromoOverlaySettings;
  });
  const [dealerPricingSettings, setDealerPricingSettings] = useState<DealerPricingSettings>(() => {
    const saved = localStorage.getItem("xuongin3d_dealer_pricing_settings");
    return saved ? normalizeDealerPricingSettings(JSON.parse(saved)) : defaultDealerPricingSettings;
  });
  const [salesPrograms, setSalesPrograms] = useState<SalesProgram[]>(() => {
    const saved = localStorage.getItem("xuongin3d_sales_programs");
    return saved ? JSON.parse(saved) : [];
  });
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("xuongin3d_cart_items");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Toast status state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [canReadAdminData, setCanReadAdminData] = useState(false);
  const [menuSettingsReady, setMenuSettingsReady] = useState(!isFirebaseConfigured);
  const [productCategoriesReady, setProductCategoriesReady] = useState(!isFirebaseConfigured);
  const hasSyncedMenuSettings = useRef(!isFirebaseConfigured);
  const hasSyncedProductCategories = useRef(!isFirebaseConfigured);
  const lastMenuSettingsJson = useRef("");
  const lastProductCategoriesJson = useRef("");

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 3500);
  }, [dismissToast]);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth, (currentUser) => {
      setCanReadAdminData(Boolean(currentUser?.emailVerified && isAdminEmail(currentUser.email)));
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let cancelled = false;

    const syncArticlesWithFirestore = async () => {
      try {
        const snapshot = await getDocs(collection(db, "articles"));
        if (cancelled) return;

        if (!snapshot.empty) {
          const remoteArticles = snapshot.docs.map((articleDoc) => articleDoc.data() as Article);
          setArticles(remoteArticles);
          return;
        }

        if (canReadAdminData && articles.length > 0) {
          const batch = writeBatch(db);
          articles.forEach((article) => {
            batch.set(doc(db, "articles", article.id), omitUndefinedValues(article));
          });
          await batch.commit();
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Could not synchronize articles with Firestore:", error);
        }
      }
    };

    syncArticlesWithFirestore();
    return () => { cancelled = true; };
  }, [canReadAdminData]);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    const applyMenuSnapshot = (snapshot: Awaited<ReturnType<typeof getDoc>>) => {
      hasSyncedMenuSettings.current = true;
      setMenuSettingsReady(true);
      if (!snapshot.exists()) return;

      const data = snapshot.data() as { items?: MenuItem[] };
      if (!Array.isArray(data.items)) return;

      const normalizedItems = restoreMissingMenuItems(data.items);
      lastMenuSettingsJson.current = JSON.stringify(normalizedItems);
      setMenuItems(normalizedItems);
    };

    const applyProductCategoriesSnapshot = (snapshot: Awaited<ReturnType<typeof getDoc>>) => {
      hasSyncedProductCategories.current = true;
      setProductCategoriesReady(true);
      if (!snapshot.exists()) {
        lastProductCategoriesJson.current = JSON.stringify(productCategories);
        return;
      }

      const data = snapshot.data() as { items?: ProductCategory[] };
      if (Array.isArray(data.items)) {
        lastProductCategoriesJson.current = JSON.stringify(data.items);
        setProductCategories(data.items);
      }
    };

    if (isAdminRoute) {
      let cancelled = false;
      Promise.all([
        getDoc(doc(db, "siteSettings", "contact")),
        getDoc(doc(db, "siteSettings", "promoOverlay")),
        getDoc(doc(db, "siteSettings", "menu")),
        getDoc(doc(db, "siteSettings", "productCategories")),
        getDoc(doc(db, "siteSettings", "dealerPricing")),
      ]).then(([contactSnapshot, promoOverlaySnapshot, menuSnapshot, productCategoriesSnapshot, dealerPricingSnapshot]) => {
        if (cancelled) return;
        if (contactSnapshot.exists()) setContactSettings({ ...defaultContactSettings, ...(contactSnapshot.data() as Partial<SiteContactSettings>) });
        if (promoOverlaySnapshot.exists()) setPromoOverlaySettings({ ...defaultPromoOverlaySettings, ...(promoOverlaySnapshot.data() as Partial<PromoOverlaySettings>) });
        applyMenuSnapshot(menuSnapshot);
        applyProductCategoriesSnapshot(productCategoriesSnapshot);
        if (dealerPricingSnapshot.exists()) setDealerPricingSettings(normalizeDealerPricingSettings(dealerPricingSnapshot.data() as Partial<DealerPricingSettings>));
      }).catch((error) => {
        if (cancelled) return;
        hasSyncedMenuSettings.current = true;
        hasSyncedProductCategories.current = true;
        setMenuSettingsReady(true);
        setProductCategoriesReady(true);
        console.error("Could not load admin site settings from Firestore:", error);
      });
      return () => { cancelled = true; };
    }

    let cancelled = false;

    const loadPublicFirestoreData = async () => {
      try {
        const [contactSnapshot, promoOverlaySnapshot, menuSnapshot, productCategoriesSnapshot, dealerPricingSnapshot] = await Promise.all([
          getDoc(doc(db, "siteSettings", "contact")),
          getDoc(doc(db, "siteSettings", "promoOverlay")),
          getDoc(doc(db, "siteSettings", "menu")),
          getDoc(doc(db, "siteSettings", "productCategories")),
          getDoc(doc(db, "siteSettings", "dealerPricing")),
        ]);

        if (cancelled) return;

        if (contactSnapshot.exists()) {
          setContactSettings({ ...defaultContactSettings, ...(contactSnapshot.data() as Partial<SiteContactSettings>) });
        }
        if (promoOverlaySnapshot.exists()) {
          setPromoOverlaySettings({ ...defaultPromoOverlaySettings, ...(promoOverlaySnapshot.data() as Partial<PromoOverlaySettings>) });
        }
        applyMenuSnapshot(menuSnapshot);
        applyProductCategoriesSnapshot(productCategoriesSnapshot);
        if (dealerPricingSnapshot.exists()) {
          setDealerPricingSettings(normalizeDealerPricingSettings(dealerPricingSnapshot.data() as Partial<DealerPricingSettings>));
        }
      } catch (error) {
        if (cancelled) return;
        hasSyncedMenuSettings.current = true;
        hasSyncedProductCategories.current = true;
        setMenuSettingsReady(true);
        setProductCategoriesReady(true);
        console.error("Could not load public site settings from Firestore:", error);
      }

      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error(`Product catalog request failed with ${response.status}`);

        const data = await response.json() as { products?: Product[]; source?: "firestore" | "fallback" };
        if (!cancelled && Array.isArray(data.products)) {
          setProducts(sortProductsNewestFirst(data.products));
          localStorage.removeItem("xuongin3d_products_last_firestore_sync_v2");
        }

      } catch (error) {
        if (!cancelled) {
          console.error("Could not load public collection data from Firestore:", error);
        }
      }
    };

    loadPublicFirestoreData();

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);

  // Save changes to localStorage whenever states change
  useEffect(() => {
    const menuJson = JSON.stringify(menuItems);
    localStorage.setItem("xuongin3d_menu_items", menuJson);

    if (!isFirebaseConfigured || !canReadAdminData || !menuSettingsReady || !hasSyncedMenuSettings.current) return;
    if (lastMenuSettingsJson.current === menuJson) return;

    lastMenuSettingsJson.current = menuJson;
    setDoc(doc(db, "siteSettings", "menu"), {
      items: menuItems,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((error) => {
      console.error("Could not save menu settings to Firestore:", error);
      showToast("Không thể lưu cấu hình menu lên Firebase. Vui lòng kiểm tra Firestore rules.", "error");
    });
  }, [canReadAdminData, menuItems, menuSettingsReady, showToast]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_product_categories", JSON.stringify(productCategories));

    if (!isFirebaseConfigured || !canReadAdminData || !productCategoriesReady || !hasSyncedProductCategories.current) return;
    const categoriesJson = JSON.stringify(productCategories);
    if (lastProductCategoriesJson.current === categoriesJson) return;

    lastProductCategoriesJson.current = categoriesJson;
    setDoc(doc(db, "siteSettings", "productCategories"), {
      items: productCategories,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((error) => {
      console.warn("Could not save product categories to Firestore:", error);
    });
  }, [canReadAdminData, productCategories, productCategoriesReady]);

  useEffect(() => {
    // Admin pages only have a partial catalog; never replace the public catalog cache.
    if (!isAdminRoute) localStorage.setItem("xuongin3d_products", JSON.stringify(products));
  }, [products, isAdminRoute]);

  useEffect(() => {
    const syncProductsAcrossTabs = (event: StorageEvent) => {
      if (event.key !== "xuongin3d_products" || !event.newValue) return;
      try {
        setProducts(sortProductsNewestFirst(JSON.parse(event.newValue) as Product[]));
      } catch (error) {
        console.warn("Could not sync product prices across tabs:", error);
      }
    };
    window.addEventListener("storage", syncProductsAcrossTabs);
    return () => window.removeEventListener("storage", syncProductsAcrossTabs);
  }, []);

  useEffect(() => {
    localStorage.setItem("xuongin3d_solutions", JSON.stringify(solutions));
  }, [solutions]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_articles", JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_branches", JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_dealers", JSON.stringify(dealers));
  }, [dealers]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_hero_settings", JSON.stringify(heroSettings));
  }, [heroSettings]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_home_content", JSON.stringify(homeContent));
  }, [homeContent]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_about_content", JSON.stringify(aboutContent));
  }, [aboutContent]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_jobs", JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_contact_submissions", JSON.stringify(contactSubmissions));
  }, [contactSubmissions]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_warranties", JSON.stringify(warranties));
  }, [warranties]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_academy_courses", JSON.stringify(academyCourses));
  }, [academyCourses]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_quote_requests", JSON.stringify(quoteRequests));
  }, [quoteRequests]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_contact_settings", JSON.stringify(contactSettings));
  }, [contactSettings]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_promo_overlay_settings", JSON.stringify(promoOverlaySettings));
  }, [promoOverlaySettings]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_dealer_pricing_settings", JSON.stringify(dealerPricingSettings));
  }, [dealerPricingSettings]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_sales_programs", JSON.stringify(salesPrograms));
  }, [salesPrograms]);

  useEffect(() => {
    localStorage.setItem("xuongin3d_cart_items", JSON.stringify(cartItems));
  }, [cartItems]);

  const updateProduct = async (updatedProduct: Product, printFileUrl?: string) => {
    const printUrl = printFileUrl === undefined ? undefined : normalizePrintFileUrl(printFileUrl);
    const nextProduct = omitUndefinedValues({
      ...updatedProduct,
      ...(printUrl === undefined ? {} : { hasPrintFile: Boolean(printUrl) }),
      slug: updatedProduct.slug || getProductSlug(updatedProduct),
      createdAt: updatedProduct.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "products", nextProduct.id), nextProduct, { merge: true });
        if (printUrl !== undefined) batch.set(doc(db, 'productPrintFiles', nextProduct.id), { url: printUrl, updatedAt: serverTimestamp() });
        await batch.commit();
      } catch (error) {
        console.error("Could not update product in Firestore:", error);
        showToast("Không thể lưu sản phẩm lên Firebase.", "error");
        return false;
      }
    }

    setProducts(prev => sortProductsNewestFirst(prev.map(p => p.id === nextProduct.id ? nextProduct : p)));
    invalidateAdminProductPages();
    return true;
  };

  const addProduct = async (newProduct: Product, printFileUrl?: string) => {
    const printUrl = printFileUrl === undefined ? undefined : normalizePrintFileUrl(printFileUrl);
    const nextProduct = omitUndefinedValues({
      ...newProduct,
      ...(printUrl === undefined ? {} : { hasPrintFile: Boolean(printUrl) }),
      slug: newProduct.slug || getProductSlug(newProduct),
      createdAt: newProduct.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (products.some(p => p.id === nextProduct.id)) {
      showToast("ID Sản phẩm đã tồn tại!", "error");
      return false;
    }

    if (isFirebaseConfigured) {
      try {
          if (/^IN3D-\d{4}$/.test(nextProduct.sku || '')) {
            const registryRef = doc(db, "productSkuRegistry", "shortCodes");
            // Index legacy short SKUs once, not a full collection read per new product.
            const registryBefore = await getDoc(registryRef);
            const legacyOwners: Record<string, string> = {};
            if (!registryBefore.data()?.legacyIndexed) {
              const existing = await getDocs(collection(db, "products"));
              existing.docs.forEach(item => {
                [String(item.data().sku || ''), item.id].filter(code => /^IN3D-\d{4}$/.test(code)).forEach(code => { legacyOwners[code] = item.id; });
              });
            }
            const productRef = doc(db, "products", nextProduct.id);
            const assigned = await runTransaction(db, async transaction => {
              const registry = await transaction.get(registryRef);
              const saved = await transaction.get(productRef);
              if (saved.exists()) {
                const value = saved.data();
                if (value.name === nextProduct.name && value.image === nextProduct.image && /^IN3D-\d{4}$/.test(value.sku || '')) {
                  if (printUrl !== undefined) {
                    transaction.update(productRef, { hasPrintFile: Boolean(printUrl) });
                    transaction.set(doc(db, 'productPrintFiles', nextProduct.id), { url: printUrl, updatedAt: serverTimestamp() });
                  }
                  return value.sku as string;
                }
                throw new Error('ID sản phẩm đã tồn tại.');
              }
              const owners = { ...legacyOwners, ...(registry.data()?.owners || {}) } as Record<string, string>;
              const sku = availableProductSku(nextProduct.sku || '', Object.keys(owners));
              transaction.set(registryRef, { owners: { ...owners, [sku]: nextProduct.id }, legacyIndexed: true });
              transaction.set(productRef, { ...nextProduct, sku });
              if (printUrl) transaction.set(doc(db, 'productPrintFiles', nextProduct.id), { url: printUrl, updatedAt: serverTimestamp() });
              return sku;
            });
            nextProduct.sku = assigned;
            newProduct.sku = assigned;
          } else {
            const batch = writeBatch(db);
            batch.set(doc(db, "products", nextProduct.id), nextProduct);
            if (printUrl) batch.set(doc(db, 'productPrintFiles', nextProduct.id), { url: printUrl, updatedAt: serverTimestamp() });
            await batch.commit();
          }
      } catch (error) {
        console.error("Could not add product to Firestore:", error);
        showToast(error instanceof Error && error.message.startsWith('Đã hết 10.000 mã') ? error.message : "Không thể thêm sản phẩm lên Firebase.", "error");
        return false;
      }
    }

    setProducts(prev => sortProductsNewestFirst([nextProduct, ...prev]));
    invalidateAdminProductPages();
    return true;
  };

  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return false;
    if (!isFirebaseConfigured) {
      showToast("Cần kết nối Firebase để lưu lịch sử xóa 7 ngày. Sản phẩm chưa bị xóa.", "error");
      return false;
    }
    try {
      await trashProduct(product);
    } catch (error) {
      console.error("Could not move product to trash:", error);
      showToast(error instanceof Error ? error.message : "Không thể chuyển sản phẩm vào mục Đã xóa.", "error");
      return false;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    invalidateAdminProductPages();
    showToast("Đã chuyển vào mục Đã xóa. Có thể khôi phục trong 7 ngày.", "success");
    if (!await revalidateProductCache()) showToast("Đã xóa tạm nhưng chưa làm mới cache web được. Không cần xóa lại.", "warning");
    return true;
  };

  const updateMenuItem = (index: number, updatedItem: MenuItem) => {
    setMenuItems(prev => {
      const copy = [...prev];
      copy[index] = withMenuDefaults(updatedItem);
      return copy;
    });
  };

  const addMenuItem = (item: MenuItem) => {
    setMenuItems(prev => [...prev, withMenuDefaults(item)]);
  };

  const deleteMenuItem = (index: number) => {
    setMenuItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Article (Knowledge) Helper Operations
  const addArticle = async (art: Article) => {
    if (articles.some(a => a.id === art.id)) {
      showToast("Mã ID bài viết đã tồn tại!", "error");
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, "articles", art.id), omitUndefinedValues(art));
      } catch (error) {
        console.error("Could not add article to Firestore:", error);
        showToast("Không thể thêm bài viết lên Firebase.", "error");
        return false;
      }
    }

    setArticles(prev => {
      return [art, ...prev];
    });
    return true;
  };

  const updateArticle = async (art: Article) => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, "articles", art.id), omitUndefinedValues(art), { merge: true });
      } catch (error) {
        console.error("Could not update article in Firestore:", error);
        showToast("Không thể cập nhật bài viết trên Firebase.", "error");
        return false;
      }
    }

    setArticles(prev => prev.map(a => a.id === art.id ? art : a));
    return true;
  };

  const deleteArticle = async (id: string) => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, "articles", id));
      } catch (error) {
        console.error("Could not delete article from Firestore:", error);
        showToast("Không thể xóa bài viết trên Firebase.", "error");
        return false;
      }
    }

    setArticles(prev => prev.filter(a => a.id !== id));
    return true;
  };

  // Job (Recruitment) Helper Operations
  const addJob = (jb: Job) => {
    setJobs(prev => {
      if (prev.some(j => j.id === jb.id)) {
        showToast("Mã vị trí tuyển dụng này đã tồn tại!", "error");
        return prev;
      }
      return [jb, ...prev];
    });
  };

  const updateJob = (jb: Job) => {
    setJobs(prev => prev.map(j => j.id === jb.id ? jb : j));
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  // Contacts Submissions Helper Operations
  const addSubmission = (sub: ContactSubmission) => {
    setContactSubmissions(prev => [sub, ...prev]);
    if (isFirebaseConfigured) {
      setDoc(doc(db, "contactSubmissions", sub.id), sub).catch((error) => {
        console.error("Could not save contact submission to Firestore:", error);
        showToast("ChÆ°a lÆ°u Ä‘Æ°á»£c liÃªn há»‡ lÃªn Firebase. Dá»¯ liá»‡u táº¡m thá»i váº«n á»Ÿ trÃ¬nh duyá»‡t.", "warning");
      });
    }
  };

  const deleteSubmission = (id: string) => {
    setContactSubmissions(prev => prev.filter(s => s.id !== id));
    if (isFirebaseConfigured) {
      deleteDoc(doc(db, "contactSubmissions", id)).catch((error) => {
        console.error("Could not delete contact submission from Firestore:", error);
        showToast("KhÃ´ng xÃ³a Ä‘Æ°á»£c liÃªn há»‡ trÃªn Firebase.", "error");
      });
    }
  };

  // Warranty CRUD Operations
  const addWarranty = (w: WarrantyRecord) => {
    const nextWarranty = {
      ...w,
      createdAt: w.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWarranties(prev => sortWarrantiesNewestFirst([nextWarranty, ...prev]));

    if (isFirebaseConfigured) {
      setDoc(doc(db, "warranties", nextWarranty.id), nextWarranty).catch((error) => {
        console.error("Could not save warranty to Firestore:", error);
        showToast("Không lưu được bảo hành lên Firebase.", "error");
      });
    }
  };

  const addWarrantiesBulk = async (items: WarrantyRecord[]) => {
    if (!items.length) return;

    const now = new Date().toISOString();
    const nextItems = items.map((item) => ({
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: now,
    }));

    setWarranties(prev => sortWarrantiesNewestFirst([...nextItems, ...prev]));

    if (isFirebaseConfigured) {
      try {
        for (let index = 0; index < nextItems.length; index += 450) {
          const batch = writeBatch(db);
          nextItems.slice(index, index + 450).forEach((item) => {
            batch.set(doc(db, "warranties", item.id), item, { merge: false });
          });
          await batch.commit();
        }
      } catch (error) {
        console.error("Could not save warranty serials to Firestore:", error);
        showToast("Không lưu được danh sách serial lên Firebase.", "error");
        throw error;
      }
    }
  };

  const updateWarranty = (w: WarrantyRecord) => {
    const nextWarranty = {
      ...w,
      createdAt: w.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWarranties(prev => sortWarrantiesNewestFirst(prev.map(item => item.id === nextWarranty.id ? nextWarranty : item)));

    if (isFirebaseConfigured) {
      setDoc(doc(db, "warranties", nextWarranty.id), nextWarranty, { merge: true }).catch((error) => {
        console.error("Could not update warranty in Firestore:", error);
        showToast("Không cập nhật được bảo hành trên Firebase.", "error");
      });
    }
  };
  const deleteWarranty = (id: string) => {
    setWarranties(prev => prev.filter(item => item.id !== id));

    if (isFirebaseConfigured) {
      deleteDoc(doc(db, "warranties", id)).catch((error) => {
        console.error("Could not delete warranty from Firestore:", error);
        showToast("Không xóa được bảo hành trên Firebase.", "error");
      });
    }
  };

  // Academy Course Helper Operations
  const addAcademyCourse = (course: Course) => {
    const nextCourse = {
      ...course,
      hidden: course.hidden ?? false,
      createdAt: course.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAcademyCourses(prev => {
      if (prev.some(item => item.id === nextCourse.id)) {
        showToast("ID khóa học đã tồn tại!", "error");
        return prev;
      }
      return sortCoursesNewestFirst([nextCourse, ...prev]);
    });

    if (isFirebaseConfigured && !academyCourses.some(item => item.id === nextCourse.id)) {
      setDoc(doc(db, "academyCourses", nextCourse.id), nextCourse).catch((error) => {
        console.error("Could not save academy course to Firestore:", error);
        showToast("Không lưu được khóa học lên Firebase.", "error");
      });
    }
  };

  const updateAcademyCourse = (course: Course) => {
    const nextCourse = {
      ...course,
      hidden: course.hidden ?? false,
      createdAt: course.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAcademyCourses(prev => sortCoursesNewestFirst(prev.map(item => item.id === nextCourse.id ? nextCourse : item)));

    if (isFirebaseConfigured) {
      setDoc(doc(db, "academyCourses", nextCourse.id), nextCourse, { merge: true }).catch((error) => {
        console.error("Could not update academy course in Firestore:", error);
        showToast("Không cập nhật được khóa học trên Firebase.", "error");
      });
    }
  };

  const deleteAcademyCourse = (id: string) => {
    setAcademyCourses(prev => prev.filter(item => item.id !== id));

    if (isFirebaseConfigured) {
      deleteDoc(doc(db, "academyCourses", id)).catch((error) => {
        console.error("Could not delete academy course from Firestore:", error);
        showToast("Không xóa được khóa học trên Firebase.", "error");
      });
    }
  };

  // Solutions Helper Operations
  const addSolution = (sol: Solution) => {
    setSolutions(prev => [sol, ...prev]);
  };
  const updateSolution = (sol: Solution) => {
    setSolutions(prev => prev.map(s => s.id === sol.id ? sol : s));
  };
  const deleteSolution = (id: string) => {
    setSolutions(prev => prev.filter(s => s.id !== id));
  };

  // Branch Helper Operations
  const addBranch = (br: Branch) => {
    setBranches(prev => [br, ...prev]);
  };
  const updateBranch = (br: Branch) => {
    setBranches(prev => prev.map(b => b.id === br.id ? br : b));
  };
  const deleteBranch = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };

  // Dealer Helper Operations
  const addDealer = (dl: Dealer) => {
    setDealers(prev => [dl, ...prev]);
  };
  const updateDealer = (dl: Dealer) => {
    setDealers(prev => prev.map(d => d.id === dl.id ? dl : d));
  };
  const deleteDealer = (id: string) => {
    setDealers(prev => prev.filter(d => d.id !== id));
  };

  // Quote Request Helper Operations
  const addQuoteRequest = (req: QuoteRequest) => {
    setQuoteRequests(prev => [req, ...prev]);
    if (isFirebaseConfigured) {
      setDoc(doc(db, "quoteRequests", req.id), req).catch((error) => {
        console.error("Could not save quote request to Firestore:", error);
        showToast("ChÆ°a lÆ°u Ä‘Æ°á»£c yÃªu cáº§u bÃ¡o giÃ¡ lÃªn Firebase. Dá»¯ liá»‡u táº¡m thá»i váº«n á»Ÿ trÃ¬nh duyá»‡t.", "warning");
      });
    }
  };
  const updateQuoteRequest = (req: QuoteRequest) => {
    setQuoteRequests(prev => prev.map(q => q.id === req.id ? req : q));
    if (isFirebaseConfigured) {
      setDoc(doc(db, "quoteRequests", req.id), req).catch((error) => {
        console.error("Could not update quote request in Firestore:", error);
        showToast("KhÃ´ng cáº­p nháº­t Ä‘Æ°á»£c yÃªu cáº§u bÃ¡o giÃ¡ trÃªn Firebase.", "error");
      });
    }
  };
  const deleteQuoteRequest = (id: string) => {
    setQuoteRequests(prev => prev.filter(q => q.id !== id));
    if (isFirebaseConfigured) {
      deleteDoc(doc(db, "quoteRequests", id)).catch((error) => {
        console.error("Could not delete quote request from Firestore:", error);
        showToast("KhÃ´ng xÃ³a Ä‘Æ°á»£c yÃªu cáº§u bÃ¡o giÃ¡ trÃªn Firebase.", "error");
      });
    }
  };

  const addNewsletterSubscriber = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    if (!isFirebaseConfigured) {
      throw new Error("Firebase chưa được cấu hình.");
    }

    await setDoc(doc(db, "newsletterSubscribers", normalizedEmail), {
      id: normalizedEmail,
      email: normalizedEmail,
      source: "footer",
      date: new Date().toISOString(),
    }, { merge: true });
  };

  const deleteNewsletterSubscriber = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    setNewsletterSubscribers(prev => prev.filter(item => item.email !== normalizedEmail));

    if (isFirebaseConfigured) {
      await deleteDoc(doc(db, "newsletterSubscribers", normalizedEmail));
    }
  };

  const updateContactSettings = async (settings: SiteContactSettings) => {
    const nextSettings = { ...defaultContactSettings, ...settings };
    setContactSettings(nextSettings);

    if (isFirebaseConfigured) {
      await setDoc(doc(db, "siteSettings", "contact"), nextSettings, { merge: true });
    }
  };

  const updatePromoOverlaySettings = async (settings: PromoOverlaySettings) => {
    const nextSettings = {
      ...defaultPromoOverlaySettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    setPromoOverlaySettings(nextSettings);

    if (isFirebaseConfigured) {
      await setDoc(doc(db, "siteSettings", "promoOverlay"), nextSettings, { merge: true });
    }
  };

  const updateDealerPricingSettings = async (settings: DealerPricingSettings) => {
    const nextSettings = {
      ...normalizeDealerPricingSettings(settings),
      updatedAt: new Date().toISOString(),
    };
    setDealerPricingSettings(nextSettings);
    if (isFirebaseConfigured) {
      await setDoc(doc(db, "siteSettings", "dealerPricing"), nextSettings, { merge: true });
    }
  };

  const addSalesProgram = (program: SalesProgram) => {
    setSalesPrograms(prev => [
      ...prev,
      {
        ...program,
        createdAt: program.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  const updateSalesProgram = (program: SalesProgram) => {
    setSalesPrograms(prev => prev.map((item) =>
      item.id === program.id ? { ...program, updatedAt: new Date().toISOString() } : item
    ));
  };

  const deleteSalesProgram = (id: string) => {
    setSalesPrograms(prev => prev.filter((program) => program.id !== id));
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (product: Product, quantity = 1, variant?: ProductVariant | null, combo?: ProductCombo | null) => {
    const colors = (product.colors || []).map(value => value.trim()).filter(Boolean);
    if (!isValidProductSize(product, variant?.id, variant?.selectedSize) || (colors.length > 0 && !colors.includes(variant?.selectedColor || ""))) {
      showToast("Vui lòng mở sản phẩm và chọn đầy đủ kích thước, màu sắc trước khi thêm giỏ hàng.", "warning");
      return;
    }
    const safeQuantity = Math.max(1, Math.floor(quantity || 1));
    const variantId = variant?.id || "";
    const comboId = combo?.id || "";
    setCartItems(prev => {
      const existing = prev.find(item =>
        item.productId === product.id &&
        (item.variantId || "") === variantId &&
        (item.comboId || "") === comboId
      );
      if (existing) {
        return prev.map(item =>
          item.productId === product.id && (item.variantId || "") === variantId && (item.comboId || "") === comboId
            ? { ...item, quantity: item.quantity + safeQuantity }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          selectedSize: variant?.selectedSize || "",
          selectedColor: variant?.selectedColor || "",
          variantId: variant?.id,
          variantName: variant?.name,
          variantPrice: variant?.price,
          variantSalePrice: variant?.salePrice,
          variantSku: variant?.sku,
          variantImage: variant?.image,
          comboId: combo?.id,
          comboName: combo?.name,
          comboOriginalPrice: combo?.originalPrice,
          comboPrice: combo?.comboPrice,
          comboSku: combo?.sku,
          comboImage: combo?.image,
          quantity: safeQuantity,
          addedAt: new Date().toISOString(),
        },
      ];
    });
    showToast(`Đã thêm "${combo?.name || product.name}" vào giỏ hàng.`, "success");
  };

  const updateCartQuantity = (productId: string, quantity: number, variantId = "", comboId = "") => {
    const safeQuantity = Math.max(0, Math.floor(quantity || 0));
    setCartItems(prev =>
      safeQuantity <= 0
        ? prev.filter(item => !(item.productId === productId && (item.variantId || "") === variantId && (item.comboId || "") === comboId))
        : prev.map(item => item.productId === productId && (item.variantId || "") === variantId && (item.comboId || "") === comboId ? { ...item, quantity: safeQuantity } : item)
    );
  };

  const removeFromCart = (productId: string, variantId = "", comboId = "") => {
    setCartItems(prev => prev.filter(item => !(item.productId === productId && (item.variantId || "") === variantId && (item.comboId || "") === comboId)));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <AppContext.Provider
      value={{
        menuItems,
        setMenuItems,
        productCategories,
        setProductCategories,
        products,
        setProducts,
        solutions,
        setSolutions,
        articles,
        setArticles,
        branches,
        setBranches,
        dealers,
        setDealers,
        heroSettings,
        setHeroSettings,
        homeContent,
        setHomeContent,
        aboutContent,
        setAboutContent,
        jobs,
        setJobs,
        contactSubmissions,
        setContactSubmissions,
        warranties,
        setWarranties,
        academyCourses,
        setAcademyCourses,
        quoteRequests,
        setQuoteRequests,
        addQuoteRequest,
        updateQuoteRequest,
        deleteQuoteRequest,
        newsletterSubscribers,
        setNewsletterSubscribers,
        addNewsletterSubscriber,
        deleteNewsletterSubscriber,
        contactSettings,
        updateContactSettings,
        promoOverlaySettings,
        updatePromoOverlaySettings,
        dealerPricingSettings,
        updateDealerPricingSettings,
        salesPrograms,
        addSalesProgram,
        updateSalesProgram,
        deleteSalesProgram,
        cartItems,
        isCartOpen,
        openCart,
        closeCart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        updateProduct,
        addProduct,
        deleteProduct,
        updateMenuItem,
        addMenuItem,
        deleteMenuItem,
        addArticle,
        updateArticle,
        deleteArticle,
        addJob,
        updateJob,
        deleteJob,
        addSubmission,
        deleteSubmission,
        addWarranty,
        addWarrantiesBulk,
        updateWarranty,
        deleteWarranty,
        addAcademyCourse,
        updateAcademyCourse,
        deleteAcademyCourse,
        addSolution,
        updateSolution,
        deleteSolution,
        addBranch,
        updateBranch,
        deleteBranch,
        addDealer,
        updateDealer,
        deleteDealer,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
