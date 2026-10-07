/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  slug?: string;
  name: string;
  voltage: string;
  capacity: string;
  brand: string;
  cellType: string;
  warranty: string;
  image: string;
  images?: string[];
  videoUrls?: string[];
  colors?: string[];
  orderNote?: string;
  defaultVariantId?: string;
  tag?: string;
  description: string;
  category: string;
  subCategory?: string;
  price?: string;
  salePrice?: string;
  retailPrice?: string;
  dealerLevel1Price?: string;
  dealerLevel2Price?: string;
  dealerDiscountPercent?: number;
  dealerLevel1DiscountPercent?: number;
  dealerLevel2DiscountPercent?: number;
  sku?: string;
  barcode?: string;
  stockQuantity?: string;
  stockStatus?: "in-stock" | "low-stock" | "out-of-stock" | "preorder" | "";
  syncChannel?: "" | "nhanh" | "haravan" | "kiotviet" | "sapo" | "other";
  externalProductId?: string;
  externalVariantId?: string;
  haravanProductId?: string;
  haravanVariantId?: string;
  syncEnabled?: boolean;
  lastSyncedAt?: string;
  hidden?: boolean;
  hasPrintFile?: boolean;
  createdAt?: string;
  updatedAt?: string;
  variants?: ProductVariant[];
  combos?: ProductCombo[];
  specs: {
    [key: string]: string;
  };
}

export interface ProductVariant {
  hidden?: boolean;
  size?: string;
  selectedSize?: string;
  selectedColor?: string;
  id: string;
  name: string;
  price?: string;
  salePrice?: string;
  image?: string;
  sku?: string;
  stockQuantity?: string;
  stockStatus?: Product["stockStatus"];
}

export interface ProductCombo {
  id: string;
  name: string;
  items?: ProductComboItem[];
  originalPrice?: string;
  comboPrice?: string;
  description?: string;
  sku?: string;
  image?: string;
  startsAt?: string;
  endsAt?: string;
  hidden?: boolean;
}

export interface ProductComboItem {
  productId: string;
  quantity?: number;
}

export type SalesProgramType = "combo" | "flash-sale" | "buy-x-get-y" | "quantity-discount";

export interface SalesProgram {
  id: string;
  type: SalesProgramType;
  name: string;
  primaryProductId?: string;
  items?: ProductComboItem[];
  giftItems?: ProductComboItem[];
  originalPrice?: string;
  promoPrice?: string;
  description?: string;
  sku?: string;
  image?: string;
  startsAt?: string;
  endsAt?: string;
  hidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  selectedSize?: string;
  selectedColor?: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  variantPrice?: string;
  variantSalePrice?: string;
  variantSku?: string;
  variantImage?: string;
  comboId?: string;
  comboName?: string;
  comboOriginalPrice?: string;
  comboPrice?: string;
  comboSku?: string;
  comboImage?: string;
  quantity: number;
  addedAt: string;
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  badge: string;
  iconName: string;
  image: string;
  details: string[];
}

export interface Project {
  id: string;
  title: string;
  solutionType: string;
  location: string;
  image: string;
  specs: string;
}

export interface Article {
  id: string;
  title: string;
  brief: string;
  content: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  featured?: boolean;
  views: number;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  difficulty: "Cơ bản" | "Trung cấp" | "Nâng cao";
  rating: number;
  reviews: number;
  progress: number;
  image: string;
  lecturer: string;
  lessonsCount: number;
  description?: string;
  hidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  deadline: string;
  experience: string;
  requirements: string[];
  benefits: string[];
}

export interface Branch {
  id: string;
  name: string;
  type: "TRỤ SỞ CHÍNH" | "CHI NHÁNH";
  address: string;
  phone: string;
  email: string;
  image: string;
}

export interface Dealer {
  id: string;
  name: string;
  province: string;
  district: string;
  address: string;
  phone: string;
  isHQ?: boolean;
}

export interface DealerAccount {
  uid: string;
  dealerCode: string;
  name: string;
  email: string;
  phone?: string;
  level: 1 | 2;
  status: "active" | "locked";
  customDiscountPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DealerOrderRecord {
  id: string;
  dealerUid: string;
  dealerCode: string;
  dealerName: string;
  dealerLevel: 1 | 2;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  province?: string;
  district?: string;
  ward?: string;
  streetAddress?: string;
  postMergerAddress?: string;
  note?: string;
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    image: string;
    quantity: number;
    retailPrice: number;
    dealerPrice: number;
  }>;
  retailTotal: number;
  discountTotal: number;
  total: number;
  status: "new" | "confirmed" | "contacting" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface HomeContent {
  section2Title: string;
  section2Desc: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
}

export interface AboutContent {
  section1Subtitle: string;
  section1Title: string;
  section1Desc: string;
  section1BannerImage?: string;
  strategicTitle: string;
  strategic1Year: string;
  strategic1Title: string;
  strategic1Desc: string;
  strategic2Year: string;
  strategic2Title: string;
  strategic2Desc: string;
  strategic3Year: string;
  strategic3Title: string;
  strategic3Desc: string;
  missionTitle: string;
  missionDesc: string;
  coreValuesTitle: string;
  coreValue1Title: string;
  coreValue1Desc: string;
  coreValue2Title: string;
  coreValue2Desc: string;
  coreValue3Title: string;
  coreValue3Desc: string;
  coreValue4Title: string;
  coreValue4Desc: string;
  stat1Num: string;
  stat1Label: string;
  stat2Num: string;
  stat2Label: string;
  stat3Num: string;
  stat3Label: string;
  stat4Num: string;
  stat4Label: string;
  factorySubtitle: string;
  factoryTitle: string;
  factoryDesc: string;
  factoryImage: string;
  quoteText: string;
  quoteAuthor: string;
}

export interface ContactSubmission {
  id: string;
  fullname: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  inquiryType: string;
  date: string;
}

export interface WarrantyRecord {
  id: string;
  serial: string;
  productCode?: string;
  productName: string;
  batchCode?: string;
  warrantyMonths?: number;
  qrUrl?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  dealerName?: string;
  purchasePlace?: string;
  purchaseDate?: string;
  activatedAt?: string;
  activatedDate: string;
  termMonths: number;
  expiryDate: string;
  status: string;
  specNotes: string;
  activationSource?: "admin" | "customer";
  createdAt?: string;
  updatedAt?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface QuoteRequest {
  orderItems?: CartItem[];
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  province?: string;
  address?: string;
  productName: string;
  batteryType?: string;
  voltage?: string;
  capacity?: string;
  notes?: string;
  date: string;
  status: "Chờ xử lý" | "Đã liên hệ" | "Đã báo giá" | "Hủy";
}

export * from "./types/landing";
