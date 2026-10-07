import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProductCategory, useApp } from "../../context/AppContext";
import { Product, ProductVariant, ProductCombo } from "../../types";
import { PRODUCTS_DATA } from "../../data";
import { uploadImageToCloudinary, isCloudinaryConfigured } from "../../lib/cloudinary";
import { watermarkImageFile, type WatermarkOptions } from "../../lib/watermark";
import ProductWatermarkControls from "../../components/Admin/ProductWatermarkControls";
import ProductTrashPanel from "../../components/Admin/ProductTrashPanel";
import ProductPagination from "../../components/Admin/ProductPagination";
import ProductPrintFileButton from "../../components/Admin/ProductPrintFileButton";
import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../lib/firebase";
import { getProductSlug, slugifyProductText } from "../../lib/productRoutes";
import { cleanVideoUrls, getProductVideoEmbed } from "../../lib/video";
import { readProductExcelOptions } from "../../lib/productExcelOptions";
import { productWorkbookMatrix, productWorkbookGuide, readProductWorkbookExtras } from "../../lib/productWorkbook";
import { readVariantTemplates, variantsFromTemplates, VARIANT_TEMPLATES_KEY, type VariantTemplates } from "../../lib/variantTemplates";
import PriceInput from "../../components/Admin/PriceInput";
import { variantNameOptions } from "../../lib/variantNameOptions";
import { selectProductCover, removeProductImage } from "../../lib/productImageSelection";
import { parseSpecsClipboard } from "../../lib/productSpecsPaste";
import type { CatalogueTransfer } from "./AICatalogueAdmin";
import {
  Battery, Plus, Edit, Trash2, X, Save, Copy,
  Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Link as LinkIcon, List, Eye, Upload,
  Loader2, Search, LayoutGrid, Rows3, EyeOff, Download, Undo2, Redo2, ChevronRight
} from "lucide-react";
const fulfillmentOptions = ["Có sẵn", "In theo yêu cầu", "Thiết kế + in", "In + sơn hoàn thiện", "Thiết kế + in + sơn hoàn thiện"];
const ADMIN_PRODUCTS_PAGE_SIZE = 12;
const defaultSpecTemplate: Product["specs"] = {
  "Công suất tối đa": "",
  "Trọng lượng thân máy": "",
  "Động cơ": "",
  "Kích thước bộ": "",
  "Kích thước": "",
  "Mô-men xoắn tối đa": "",
};

const createBlankProductForm = (id = ""): Partial<Product> => ({
  id,
  slug: "",
  name: "",
  voltage: "",
  capacity: "",
  brand: "",
  cellType: "",
  warranty: "",
  image: "",
  images: [],
  videoUrls: [],
  colors: [],
  orderNote: "",
  defaultVariantId: "variant-default",
  description: "",
  category: "",
  subCategory: "",
  price: "",
  salePrice: "",
  retailPrice: "",
  dealerLevel1Price: "",
  dealerLevel2Price: "",
  dealerDiscountPercent: undefined,
  dealerLevel1DiscountPercent: undefined,
  dealerLevel2DiscountPercent: undefined,
  variants: [{
    id: "variant-default",
    name: "",
    price: "",
    salePrice: "",
    image: "",
    sku: "",
    stockQuantity: "",
    stockStatus: "",
  }],
  combos: [],
  sku: "",
  barcode: "",
  stockQuantity: "",
  stockStatus: "",
  syncChannel: "",
  externalProductId: "",
  externalVariantId: "",
  haravanProductId: "",
  haravanVariantId: "",
  syncEnabled: false,
  lastSyncedAt: "",
  hidden: false,
  specs: { ...defaultSpecTemplate },
});

const EMPLOYEE_SAMPLE_PRODUCT: Product = {
  ...PRODUCTS_DATA.find((product) => product.id === "mo-hinh-tuong-nhan-vat-3d")!,
  id: "san-pham-mau-mo-hinh-rong-3d",
  slug: "san-pham-mau-mo-hinh-rong-3d",
  sku: "MAU-MH001",
  name: "Mô hình rồng trang trí in 3D (Sản phẩm mẫu)",
  tag: "Sản phẩm mẫu",
  voltage: "Cao khoảng 20 cm",
  capacity: "In theo yêu cầu",
  cellType: "PLA / Resin",
  warranty: "Kiểm tra trước khi bàn giao",
  price: "Liên hệ",
  stockStatus: "preorder",
  stockQuantity: "",
  hidden: false,
  description: "Sản phẩm mẫu để nhân viên tham khảo cách trình bày nội dung khi đăng hàng. Mô hình rồng được sản xuất bằng công nghệ in 3D, phù hợp trưng bày tại bàn làm việc, kệ sách, quầy tiếp khách hoặc làm quà tặng. Khách hàng có thể yêu cầu điều chỉnh kích thước, màu sắc, vật liệu và mức độ hoàn thiện theo nhu cầu thực tế. Trước khi sản xuất, xưởng sẽ kiểm tra file, tư vấn phương án và xác nhận mẫu với khách hàng.",
  specs: {
    "Mã sản phẩm": "MAU-MH001",
    "Kích thước tham khảo": "Cao khoảng 20 cm",
    "Vật liệu": "PLA / Resin",
    "Công nghệ": "FDM / Resin",
    "Màu sắc": "Theo yêu cầu",
    "Hoàn thiện": "Có thể chà nhám và sơn màu",
    "Thời gian thực hiện": "Xác nhận sau khi duyệt mẫu",
  },
};

const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

function getDescriptionImages(description: string | undefined) {
  return Array.from((description || "").matchAll(markdownImageRegex)).map((match) => ({
    markdown: match[0],
    alt: match[1],
    url: match[2],
  }));
}

function parseDelimitedRows(source: string) {
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : (firstLine.split(";").length > firstLine.split(",").length ? ";" : ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function readProductImportRows(file: File) {
  if (/\.xlsx$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheetName = workbook.SheetNames.find(name => ['sản phẩm', 'san pham'].includes(name.trim().toLowerCase())) || workbook.SheetNames[0];
    if (!firstSheetName) return [];
    return XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[firstSheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
  }

  const source = await file.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(source)) {
    const document = new DOMParser().parseFromString(source, "text/html");
    return Array.from(document.querySelectorAll("tr")).map((tableRow) =>
      Array.from(tableRow.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() || ""),
    ).filter((row) => row.some(Boolean));
  }
  return parseDelimitedRows(source.replace(/^\uFEFF/, ""));
}

const allowedDescriptionHtmlTags = new Set([
  "A",
  "B",
  "BR",
  "DIV",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

function sanitizeDescriptionHtml(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.body.querySelectorAll("script, style, meta, link, object, iframe").forEach((node) => node.remove());

  const cleanNode = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode("");
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();

    if (!allowedDescriptionHtmlTags.has(tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(element.childNodes).forEach((child) => fragment.appendChild(cleanNode(child)));
      return fragment;
    }

    const cleanElement = document.createElement(tagName.toLowerCase());

    if (tagName === "A") {
      const href = element.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) {
        cleanElement.setAttribute("href", href);
        cleanElement.setAttribute("target", "_blank");
        cleanElement.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (tagName === "TD" || tagName === "TH") {
      const colSpan = element.getAttribute("colspan");
      const rowSpan = element.getAttribute("rowspan");
      if (colSpan && /^\d+$/.test(colSpan)) cleanElement.setAttribute("colspan", colSpan);
      if (rowSpan && /^\d+$/.test(rowSpan)) cleanElement.setAttribute("rowspan", rowSpan);
    }

    Array.from(element.childNodes).forEach((child) => cleanElement.appendChild(cleanNode(child)));
    return cleanElement;
  };

  const wrapper = document.createElement("div");
  Array.from(doc.body.childNodes).forEach((child) => wrapper.appendChild(cleanNode(child)));

  return wrapper.innerHTML
    .replace(/&nbsp;/g, " ")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/<div>\s*<\/div>/g, "")
    .trim();
}

function slugifyCategoryName(value: string) {
  return value
    .trim()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `danh-muc-${Date.now()}`;
}

function makeUniqueCategoryId(baseId: string, existingIds: string[]) {
  let nextId = baseId;
  let index = 2;
  while (existingIds.includes(nextId)) {
    nextId = `${baseId}-${index}`;
    index += 1;
  }
  return nextId;
}

// Helper to render markdown and layout codes inside product descriptions
export function formatDescriptionToHtml(desc: string | undefined): string {
  if (!desc) return "";
  
  let html = desc
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

  if (/<(p|div|table|tbody|thead|tr|td|th|ul|ol|li|h[1-6]|strong|b|em|i|br|img|a)(\s|>|\/)/i.test(html)) {
    return html;
  }
  
  // Convert standard markdown bold **text** to <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Convert *text* to <em>text</em>
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  
  // Convert ### Heading to styled title
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-xs font-display font-semibold tracking-wide text-[#F5C45A] mt-3 mb-1 uppercase">$1</h3>');
  
  // Convert markdown image ![alt](url) to img tags
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-3 h-auto w-full object-contain filter drop-shadow-md border border-white/5 p-1" referrerPolicy="no-referrer" />');
  
  // Convert markdown link [text](url) to anchor tags
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-gold-light underline hover:text-white" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert list bullet lines starting with "- "
  html = html.replace(/^-[ ]+(.*?)$/gm, '<li class="list-disc ml-4 my-0.5 text-gray-300">$1</li>');
  
  // Convert double newlines to paragraphs or simple paragraph breaks
  html = html.replace(/\n/g, "<br />");
  
  return html;
}

function productDescriptionToExportText(description: string | undefined) {
  if (!description) return "";

  const html = formatDescriptionToHtml(description);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.body.querySelectorAll("script, style, meta, link, object, iframe, img").forEach((node) => node.remove());

  const blockTags = new Set([
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "DIV",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "MAIN",
    "NAV",
    "P",
    "SECTION",
  ]);

  const renderNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();
    const childText = Array.from(element.childNodes).map(renderNode).join("");

    if (tagName === "BR") return "\n";
    if (tagName === "LI") return `- ${childText.trim()}\n`;
    if (tagName === "TD" || tagName === "TH") return `${childText.trim()}\t`;
    if (tagName === "TR") return `${childText.replace(/\t+$/g, "").trim()}\n`;
    if (tagName === "UL" || tagName === "OL" || tagName === "TABLE" || tagName === "TBODY" || tagName === "THEAD") {
      return `${childText.trim()}\n`;
    }
    if (blockTags.has(tagName)) return `${childText.trim()}\n\n`;

    return childText;
  };

  return Array.from(doc.body.childNodes)
    .map(renderNode)
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ProductsAdmin({ catalogueTransfer, onCatalogueConsumed }: { catalogueTransfer?: CatalogueTransfer | null; onCatalogueConsumed?: () => void } = {}) {
  const [catalogueFiles, setCatalogueFiles] = useState<File[]>([]);
  const {
    products,
    setProducts,
    salesPrograms,
    productCategories,
    setProductCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    showToast
  } = useApp();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const deletingProductIds = useRef(new Set<string>());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isToolbarPreviewMode, setIsToolbarPreviewMode] = useState(false);
  const [isQuickImagePanelOpen, setIsQuickImagePanelOpen] = useState(false);
  const [uploadingImageTarget, setUploadingImageTarget] = useState<string | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState('/images/logo-x3d.webp');
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({position:'top-right',size:20,opacity:70,margin:3});
  useEffect(() => () => { if (watermarkLogoUrl.startsWith('blob:')) URL.revokeObjectURL(watermarkLogoUrl); }, [watermarkLogoUrl]);
  const [variantImagePickerId, setVariantImagePickerId] = useState<string | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<"grid" | "list">("grid");
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);
  const [isComboPanelOpen, setIsComboPanelOpen] = useState(false);
  const [comboProductQueries, setComboProductQueries] = useState<Record<number, string>>({});
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productVisibilityFilter, setProductVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [productPriceFilter, setProductPriceFilter] = useState<"all" | "missing" | "complete" | "variants">("all");
  const [productPageSize, setProductPageSize] = useState(ADMIN_PRODUCTS_PAGE_SIZE);
  const [productPage, setProductPage] = useState(1);
  const paginationTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setProductPage(1);
  }, [productSearchQuery, productVisibilityFilter, productPriceFilter, productPageSize]);
  const [quickPriceDrafts, setQuickPriceDrafts] = useState<Record<string, string>>({});
  const [quickVariantPriceDrafts, setQuickVariantPriceDrafts] = useState<Record<string, string>>({});
  const [savingQuickPriceId, setSavingQuickPriceId] = useState<string | null>(null);
  const [expandedVariantPriceIds, setExpandedVariantPriceIds] = useState<Set<string>>(() => new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newChildCategoryNames, setNewChildCategoryNames] = useState<Record<string, string>>({});
  
  const [productForm, setProductForm] = useState<Partial<Product>>(createBlankProductForm());
  const [productColorsDraft, setProductColorsDraft] = useState("");
  const [isCustomFulfillment, setIsCustomFulfillment] = useState(false);
  const [variantTemplates, setVariantTemplates] = useState<VariantTemplates>({});

  useEffect(() => {
    try { setVariantTemplates(readVariantTemplates(localStorage.getItem(VARIANT_TEMPLATES_KEY))); }
    catch { /* Storage may be disabled; product editing remains available. */ }
  }, []);

  const persistVariantTemplates = (templates: VariantTemplates) => {
    try {
      localStorage.setItem(VARIANT_TEMPLATES_KEY, JSON.stringify(templates));
      setVariantTemplates(templates);
    } catch { showToast("Không lưu được mẫu trên máy. Kiểm tra quyền lưu trữ của trình duyệt.", "error"); }
  };

  const handleRememberVariant = (variant: ProductVariant, remember: boolean) => {
    if (remember && !variant.name?.trim()) {
      showToast("Hãy chọn hoặc nhập tên phân loại trước khi lưu mẫu.", "error");
      return;
    }
    const next = { ...variantTemplates };
    if (remember) next[variant.id] = { name: variant.name.trim(), size: variant.size?.trim() || "" };
    else delete next[variant.id];
    persistVariantTemplates(next);
  };

  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null);
  const descriptionSelectionRef = useRef<Range | null>(null);
  const hasDescriptionSelectionRef = useRef(false);
  const hasManualDescriptionSelectionRef = useRef(false);
  const descriptionInsertAnchorRef = useRef<Node | null>(null);
  const descriptionUndoStackRef = useRef<string[]>([]);
  const descriptionRedoStackRef = useRef<string[]>([]);
  const descriptionCustomUndoIsLatestRef = useRef(false);
  const descriptionDraftRef = useRef("");
  // Initialize only when mounting: re-rendering the toolbar must not replace
  // contentEditable's DOM, which would invalidate the saved insertion range.
  const mountDescriptionEditor = useCallback((editor: HTMLDivElement | null) => {
    descriptionEditorRef.current = editor;
    if (editor) editor.innerHTML = descriptionDraftRef.current;
  }, []);
  const productFormScrollRef = useRef<HTMLFormElement | null>(null);
  const hasSyncedProductPreviewRef = useRef(false);
  const bulkImportInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || hasSyncedProductPreviewRef.current) return;
    hasSyncedProductPreviewRef.current = true;
    let cancelled = false;
    Promise.all([
      getDocs(collection(db, "products")),
      getDoc(doc(db, "siteSettings", "employeeSampleProductSeed")),
    ]).then(async ([snapshot, seedMarker]) => {
      if (cancelled) return;
      let remoteItems = snapshot.docs.map((item) => item.data() as Product);

      if (snapshot.empty && !seedMarker.exists()) {
        const now = new Date().toISOString();
        const sampleProduct = { ...EMPLOYEE_SAMPLE_PRODUCT, createdAt: now, updatedAt: now };
        const batch = writeBatch(db);
        batch.set(doc(db, "products", sampleProduct.id), sampleProduct);
        batch.set(doc(db, "siteSettings", "employeeSampleProductSeed"), {
          productId: sampleProduct.id,
          seededAt: now,
        });
        await batch.commit();
        remoteItems = [sampleProduct];
      }

      if (cancelled) return;
      setProducts(() => {
        return remoteItems.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime || String(b.id).localeCompare(String(a.id), "vi");
        });
      });
    }).catch((error) => console.error("Could not sync product preview:", error));
    return () => { cancelled = true; };
  }, [setProducts]);

  const activeProductCategory = productCategories.find((category) => category.id === productForm.category);
  const activeProductSubCategories = (activeProductCategory?.children || []).filter((child) => !child.hidden);
  const cleanImageUrls = (images: Partial<Product>["images"]) =>
    (images || [])
      .map((imageUrl) => String(imageUrl || "").trim())
      .filter(Boolean);
  const cleanProductSpecs = (specs: Partial<Product>["specs"]): Record<string, string> =>
    Object.fromEntries(
      Object.entries(specs || {})
        .map(([key, value]) => [key.trim(), String(value || "").trim()])
        .filter(([key, value]) => Boolean(key && value)),
    ) as Record<string, string>;
  const cleanProductVariants = (variants: Partial<Product>["variants"]): ProductVariant[] =>
    (variants || [])
      .map((variant, index) => ({
        id: String(variant.id || `variant-${index + 1}`).trim() || `variant-${index + 1}`,
        name: String(variant.name || "").trim(),
        size: String(variant.size || "").trim(),
        price: String(variant.price || "").trim(),
        salePrice: String(variant.salePrice || "").trim(),
        image: String(variant.image || "").trim(),
        sku: String(variant.sku || "").trim(),
        stockQuantity: String(variant.stockQuantity || "").trim(),
        stockStatus: (variant.stockStatus || "") as ProductVariant["stockStatus"],
      }))
      .filter((variant) => Boolean(variant.name));
  const getProductRawPrice = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    return product?.salePrice || product?.price || "";
  };
  const parsePriceValue = (value: string | undefined) => {
    const numeric = String(value || "").replace(/[^\d]/g, "");
    return numeric ? Number(numeric) : 0;
  };
  const formatAdminPrice = (value: number) => value ? String(value) : "";
  const getQuickPriceValue = (product: Product) => quickPriceDrafts[product.id] ?? product.retailPrice ?? product.price ?? "";
  const hasQuickPriceChange = (product: Product) =>
    Object.prototype.hasOwnProperty.call(quickPriceDrafts, product.id) &&
    quickPriceDrafts[product.id] !== (product.retailPrice ?? product.price ?? "");
  const handleSaveQuickPrice = async (product: Product) => {
    if ((product.variants || []).length > 0) {
      showToast("Sản phẩm có phân loại: vui lòng chỉnh giá theo phân loại.", "warning");
      return;
    }
    const draft = String(quickPriceDrafts[product.id] || "").trim();
    if (!parsePriceValue(draft)) {
      showToast("Vui lòng nhập giá bán lẻ hợp lệ.", "warning");
      return;
    }
    if (!window.confirm(`Xác nhận đổi giá bán lẻ của "${product.name}" thành ${draft}?`)) return;
    setSavingQuickPriceId(product.id);
    try {
      await updateProduct({ ...product, price: draft, retailPrice: draft });
      setQuickPriceDrafts((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      showToast("Đã cập nhật giá bán lẻ và lưu lên Firebase.", "success");
    } finally {
      setSavingQuickPriceId(null);
    }
  };
  const getVariantDraftKey = (productId: string, variantId: string) => `${productId}::${variantId}`;
  const getQuickVariantPriceValue = (product: Product, variant: ProductVariant) =>
    quickVariantPriceDrafts[getVariantDraftKey(product.id, variant.id)] ?? variant.price ?? "";
  const hasQuickVariantPriceChange = (product: Product, variant: ProductVariant) => {
    const key = getVariantDraftKey(product.id, variant.id);
    return Object.prototype.hasOwnProperty.call(quickVariantPriceDrafts, key) && quickVariantPriceDrafts[key] !== (variant.price ?? "");
  };
  const handleSaveQuickVariantPrice = async (product: Product, variant: ProductVariant) => {
    const key = getVariantDraftKey(product.id, variant.id);
    const draft = String(quickVariantPriceDrafts[key] || "").trim();
    if (!parsePriceValue(draft)) {
      showToast("Vui lòng nhập giá phân loại hợp lệ.", "warning");
      return;
    }
    if (!window.confirm(`Xác nhận đổi giá phân loại "${variant.name}" thành ${draft}?`)) return;
    setSavingQuickPriceId(key);
    try {
      await updateProduct({
        ...product,
        variants: (product.variants || []).map((item) => item.id === variant.id ? { ...item, price: draft } : item),
      });
      setQuickVariantPriceDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      showToast("Đã cập nhật giá phân loại và lưu lên Firebase.", "success");
    } finally {
      setSavingQuickPriceId(null);
    }
  };
  const productHasMissingPrice = (product: Product) => {
    const variants = product.variants || [];
    if (variants.length > 0) return variants.some((variant) => !parsePriceValue(variant.salePrice || variant.price));
    return !parsePriceValue(product.retailPrice || product.salePrice || product.price);
  };
  const getComboOriginalPrice = (combo: ProductCombo) =>
    (combo.items || []).reduce((total, item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      return total + parsePriceValue(getProductRawPrice(item.productId)) * quantity;
    }, 0);
  const cleanProductCombos = (combos: Partial<Product>["combos"]): ProductCombo[] =>
    (combos || [])
      .map((combo, index) => {
        const items = (combo.items || [])
          .map((item) => ({
            productId: String(item.productId || "").trim(),
            quantity: Math.max(1, Number(item.quantity || 1)),
          }))
          .filter((item) => Boolean(item.productId));
        const calculatedOriginalPrice = getComboOriginalPrice({ ...combo, items } as ProductCombo);
        return {
          id: String(combo.id || `combo-${index + 1}`).trim() || `combo-${index + 1}`,
          name: String(combo.name || "").trim(),
          items,
          originalPrice: String(combo.originalPrice || formatAdminPrice(calculatedOriginalPrice)).trim(),
          comboPrice: String(combo.comboPrice || "").trim(),
          description: String(combo.description || "").trim(),
          sku: String(combo.sku || "").trim(),
          image: String(combo.image || "").trim(),
          startsAt: String(combo.startsAt || "").trim(),
          endsAt: String(combo.endsAt || "").trim(),
          hidden: combo.hidden ?? false,
        };
      })
      .filter((combo) => Boolean(combo.name));

  const galleryImageUrls = cleanImageUrls(productForm.images);
  const quickInsertImages = Array.from(new Set([productForm.image, ...galleryImageUrls].filter((imageUrl): imageUrl is string => Boolean(imageUrl))));
  const productVideoUrls = cleanVideoUrls(productForm.videoUrls);
  const productVideoEmbeds = productVideoUrls
    .map((videoUrl, index) => getProductVideoEmbed(videoUrl, index))
    .filter(Boolean);
  const visibleSpecEntries = Object.entries(cleanProductSpecs(productForm.specs));
  const productVariants = cleanProductVariants(productForm.variants);
  const productCombos = cleanProductCombos(productForm.combos);
  const getProductSalesProgramCount = (productId: string) =>
    salesPrograms.filter((program) =>
      program.type === "combo" &&
      (program.primaryProductId === productId || (!program.primaryProductId && (program.items || []).some((item) => item.productId === productId)))
    ).length;

  useEffect(() => {
    if (!isProductModalOpen) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isProductModalOpen]);

  const handleProductModalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) return;

    const target = event.target as HTMLElement;
    if (target.closest("textarea, [contenteditable='true']")) return;

    const scroller = productFormScrollRef.current;
    if (!scroller) return;

    event.preventDefault();
    scroller.scrollTop += event.deltaY;
  };

  const restoreProductFormScroll = (scrollTop: number) => {
    const restore = () => {
      if (productFormScrollRef.current) {
        productFormScrollRef.current.scrollTop = scrollTop;
      }
    };

    restore();
    requestAnimationFrame(restore);
    window.setTimeout(restore, 0);
    window.setTimeout(restore, 120);
  };

  const getCategoryDisplayName = (categoryId?: string, subCategoryId?: string) => {
    const category = productCategories.find((item) => item.id === categoryId);
    const child = category?.children?.find((item) => item.id === subCategoryId);
    return [category?.name || categoryId, child?.name].filter(Boolean).join(" / ");
  };

  const handleAddProductCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;

    setProductCategories((prev) => {
      const id = makeUniqueCategoryId(slugifyCategoryName(name), prev.map((category) => category.id));
      return [...prev, { id, name: name.toUpperCase(), children: [] }];
    });
    setNewCategoryName("");
    showToast("Đã thêm danh mục sản phẩm.", "success");
  };

  const handleUpdateProductCategory = (categoryId: string, updates: Partial<ProductCategory>) => {
    setProductCategories((prev) =>
      prev.map((category) => category.id === categoryId ? { ...category, ...updates } : category)
    );
  };

  const handleDeleteProductCategory = (categoryId: string) => {
    const usedCount = products.filter((product) => product.category === categoryId).length;
    const message = usedCount
      ? `Danh mục này đang có ${usedCount} sản phẩm. Xóa danh mục không xóa sản phẩm, nhưng sản phẩm sẽ cần gán lại danh mục. Bạn vẫn muốn xóa?`
      : "Bạn có chắc muốn xóa danh mục này?";
    if (!window.confirm(message)) return;
    setProductCategories((prev) => prev.filter((category) => category.id !== categoryId));
  };

  const handleAddChildCategory = (categoryId: string) => {
    const name = (newChildCategoryNames[categoryId] || "").trim();
    if (!name) return;

    setProductCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        const children = category.children || [];
        const id = makeUniqueCategoryId(slugifyCategoryName(name), children.map((child) => child.id));
        return {
          ...category,
          children: [...children, { id, name: name.toUpperCase() }],
        };
      })
    );
    setNewChildCategoryNames((prev) => ({ ...prev, [categoryId]: "" }));
    showToast("Đã thêm danh mục con.", "success");
  };

  const handleUpdateChildCategory = (
    categoryId: string,
    childId: string,
    updates: { name?: string; hidden?: boolean },
  ) => {
    setProductCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          children: (category.children || []).map((child) => child.id === childId ? { ...child, ...updates } : child),
        };
      })
    );
  };

  const handleDeleteChildCategory = (categoryId: string, childId: string) => {
    const usedCount = products.filter((product) => product.category === categoryId && product.subCategory === childId).length;
    const message = usedCount
      ? `Danh mục con này đang có ${usedCount} sản phẩm. Bạn vẫn muốn xóa?`
      : "Bạn có chắc muốn xóa danh mục con này?";
    if (!window.confirm(message)) return;
    setProductCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return { ...category, children: (category.children || []).filter((child) => child.id !== childId) };
      })
    );
  };

  const handleOpenProductModal = (product?: Product) => {
    setCatalogueFiles([]);
    descriptionSelectionRef.current = null;
    hasDescriptionSelectionRef.current = false;
    hasManualDescriptionSelectionRef.current = false;
    descriptionInsertAnchorRef.current = null;
    descriptionUndoStackRef.current = [];
    descriptionRedoStackRef.current = [];
    descriptionCustomUndoIsLatestRef.current = false;
    setComboProductQueries({});

    if (product) {
      setEditingProduct(product);
      setIsCustomFulfillment(Boolean(product.capacity && !fulfillmentOptions.includes(product.capacity)));
      setProductColorsDraft((product.colors || []).join(", "));
      descriptionDraftRef.current = product.description || "";
      setProductForm({
        ...product,
        images: product.images || [],
        videoUrls: product.videoUrls || [],
        colors: product.colors || [],
        orderNote: product.orderNote || "",
        defaultVariantId: product.defaultVariantId || product.variants?.[0]?.id || "",
        variants: product.variants || [],
        combos: product.combos || [],
        subCategory: product.subCategory || "",
        hidden: product.hidden ?? false,
        syncChannel: product.syncChannel || (product.haravanProductId || product.haravanVariantId ? "haravan" : ""),
        externalProductId: product.externalProductId || product.haravanProductId || "",
        externalVariantId: product.externalVariantId || product.haravanVariantId || "",
      });
    } else {
      setEditingProduct(null);
      setIsCustomFulfillment(false);
      setProductColorsDraft("");
      const generatedCode = "IN3D-" + Math.floor(Math.random() * 90000 + 10000);
      const blankForm = { ...createBlankProductForm(generatedCode), sku: generatedCode };
      const rememberedVariants = variantsFromTemplates(variantTemplates);
      if (rememberedVariants.length) {
        blankForm.variants = rememberedVariants;
        blankForm.defaultVariantId = rememberedVariants[0].id;
      }
      descriptionDraftRef.current = blankForm.description || "";
      setProductForm(blankForm);
    }
    setIsProductModalOpen(true);
  };

  useEffect(() => {
    if (!catalogueTransfer) return;
    handleOpenProductModal();
    descriptionDraftRef.current = catalogueTransfer.product.description || "";
    setProductForm(prev => ({ ...prev, ...catalogueTransfer.product, hidden: true }));
    setCatalogueFiles(catalogueTransfer.files);
    onCatalogueConsumed?.();
  }, [catalogueTransfer]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingImageTarget) {
      showToast("Vui lòng đợi ảnh tải xong trước khi lưu sản phẩm.", "warning");
      return;
    }
    if (!productForm.id?.trim() || !productForm.sku?.trim() || !productForm.name) {
      showToast("Vui lòng điền đầy đủ Mã SP, ID và Tên sản phẩm!", "warning");
      return;
    }

    const currentForm = {
  ...productForm,
  images: galleryImageUrls,
  videoUrls: productVideoUrls,
  variants: productVariants,
  defaultVariantId: productVariants.some((variant) => variant.id === productForm.defaultVariantId)
    ? productForm.defaultVariantId
    : productVariants[0]?.id || "",
  combos: productCombos,
  colors: Array.from(new Set(productColorsDraft.split(/[,|\n]/).map((color) => color.trim()).filter(Boolean))),
  orderNote: String(productForm.orderNote || "").trim(),
  description: getDescriptionEditorHtml() || productForm.description,
  subCategory: activeProductSubCategories.length > 0 ? productForm.subCategory || "" : "",
  hidden: productForm.hidden ?? false,
  specs: cleanProductSpecs(productForm.specs),
} as Product;
    currentForm.id = currentForm.id.trim();
    currentForm.slug = slugifyProductText(currentForm.slug || `${currentForm.name}-${currentForm.id}`);
    const slugOwner = products.find((product) =>
      product.id !== editingProduct?.id &&
      getProductSlug(product) === currentForm.slug
    );

    if (slugOwner) {
      showToast("Slug URL sản phẩm bị trùng! Hãy đổi slug khác.", "error");
      return;
    }

    if (editingProduct) {
      const originalId = editingProduct.id;
      const nextId = currentForm.id;
      const isChangingId = nextId !== originalId;

      if (isChangingId && products.some((product) => product.id === nextId)) {
        showToast("ID Sản phẩm bị trùng lặp! Hãy đổi ID khác.", "error");
        return;
      }

      currentForm.id = nextId;

      if (isChangingId) {
        const didAdd = await addProduct(currentForm);
        if (!didAdd) return;
        if (!await deleteProduct(originalId)) return;
      } else {
        const didUpdate = await updateProduct(currentForm);
        if (!didUpdate) return;
      }
      showToast("Đã lưu chỉnh sửa sản phẩm thành công!", "success");
    } else {
      if (products.some(p => p.id === currentForm.id)) {
        showToast("ID Sản phẩm bị trùng lặp! Hãy đổi ID khác.", "error");
        return;
      }
      const didAdd = await addProduct(currentForm);
      if (!didAdd) return;
      showToast("Đã thêm sản phẩm mới thành công!", "success");
    }
    setIsProductModalOpen(false);
  };

  const handleDeleteProductPrompt = async (id: string, name: string) => {
    if (deletingProductIds.current.has(id)) return;
    if (!window.confirm(`Chuyển sản phẩm “${name}” vào mục Đã xóa?\n\nSản phẩm sẽ được gỡ khỏi website. Bạn có thể khôi phục trong 7 ngày; hết hạn bản lưu sẽ bị xóa tự động. Ảnh Cloudinary không bị xóa.`)) return;
    deletingProductIds.current.add(id);
    try { await deleteProduct(id); }
    finally { deletingProductIds.current.delete(id); }
  };

  const handleCopyProduct = (prod: Product) => {
    const newId = prod.id + "-copy-" + Math.floor(Math.random() * 900 + 100);
    setEditingProduct(null); // Save as new unique entry
    descriptionDraftRef.current = prod.description || "";
    setProductForm({
      ...prod,
      id: newId,
      slug: "",
      name: prod.name + " (Bản sao)",
    });
    setIsToolbarPreviewMode(false);
    setIsProductModalOpen(true);
  };

  const handleAddVariant = () => {
    const variantId = `variant-${Date.now()}`;
    setProductForm(prev => ({
      ...prev,
      defaultVariantId: prev.defaultVariantId || variantId,
      variants: [
        ...(prev.variants || []),
        {
          id: variantId,
          name: "",
          price: "",
          salePrice: "",
          image: "",
          sku: "",
          stockQuantity: "",
          stockStatus: "",
        },
      ],
    }));
  };

  const handleUpdateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const variant = productForm.variants?.[index];
    if (variant && variantTemplates[variant.id] && (updates.name !== undefined || updates.size !== undefined)) {
      const updated = { ...variant, ...updates };
      persistVariantTemplates({ ...variantTemplates, [variant.id]: { name: updated.name || "", size: updated.size || "" } });
    }
    setProductForm(prev => ({
      ...prev,
      variants: (prev.variants || []).map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...updates } : variant
      ),
    }));
  };

  const handleRemoveVariant = (index: number) => {
    setProductForm(prev => {
      const removedId = prev.variants?.[index]?.id;
      const variants = (prev.variants || []).filter((_, variantIndex) => variantIndex !== index);
      return {
        ...prev,
        variants,
        defaultVariantId: prev.defaultVariantId === removedId ? variants[0]?.id || "" : prev.defaultVariantId,
      };
    });
  };

  const handleAddCombo = () => {
    setProductForm(prev => ({
      ...prev,
      combos: [
        ...(prev.combos || []),
        {
          id: `combo-${Date.now()}`,
          name: "",
          originalPrice: "",
          comboPrice: "",
          description: "",
          sku: "",
          image: "",
          startsAt: "",
          endsAt: "",
          items: [{ productId: prev.id || "", quantity: 1 }].filter((item) => Boolean(item.productId)),
          hidden: false,
        },
      ],
    }));
  };

  const handleUpdateCombo = (index: number, updates: Partial<ProductCombo>) => {
    setProductForm(prev => ({
      ...prev,
      combos: (prev.combos || []).map((combo, comboIndex) =>
        comboIndex === index ? { ...combo, ...updates } : combo
      ),
    }));
  };

  const handleRemoveCombo = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      combos: (prev.combos || []).filter((_, comboIndex) => comboIndex !== index),
    }));
  };

  const handleAddProductToCombo = (comboIndex: number, productId: string) => {
    const normalizedId = productId.trim();
    const product = products.find((item) => item.id === normalizedId);
    if (!product) {
      showToast("Không tìm thấy mã sản phẩm để ghép combo.", "warning");
      return;
    }

    setProductForm(prev => ({
      ...prev,
      combos: (prev.combos || []).map((combo, index) => {
        if (index !== comboIndex) return combo;
        const items = combo.items || [];
        const nextItems = items.some((item) => item.productId === normalizedId)
          ? items.map((item) => item.productId === normalizedId ? { ...item, quantity: Math.max(1, Number(item.quantity || 1)) + 1 } : item)
          : [...items, { productId: normalizedId, quantity: 1 }];
        const originalPrice = formatAdminPrice(getComboOriginalPrice({ ...combo, items: nextItems } as ProductCombo));
        return {
          ...combo,
          items: nextItems,
          originalPrice,
          name: combo.name || `Combo ${product.name}`,
        };
      }),
    }));
    setComboProductQueries((prev) => ({ ...prev, [comboIndex]: "" }));
  };

  const handleUpdateComboItemQuantity = (comboIndex: number, productId: string, quantity: number) => {
    setProductForm(prev => ({
      ...prev,
      combos: (prev.combos || []).map((combo, index) => {
        if (index !== comboIndex) return combo;
        const items = (combo.items || []).map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(1, Math.floor(quantity || 1)) } : item
        );
        return { ...combo, items, originalPrice: formatAdminPrice(getComboOriginalPrice({ ...combo, items } as ProductCombo)) };
      }),
    }));
  };

  const handleRemoveComboItem = (comboIndex: number, productId: string) => {
    setProductForm(prev => ({
      ...prev,
      combos: (prev.combos || []).map((combo, index) => {
        if (index !== comboIndex) return combo;
        const items = (combo.items || []).filter((item) => item.productId !== productId);
        return { ...combo, items, originalPrice: formatAdminPrice(getComboOriginalPrice({ ...combo, items } as ProductCombo)) };
      }),
    }));
  };

  const handleToggleProductVisibility = (prod: Product) => {
    updateProduct({ ...prod, hidden: !prod.hidden });
    showToast(prod.hidden ? "Đã bật hiển thị sản phẩm." : "Đã ẩn sản phẩm khỏi trang công khai.", "info");
  };

  const normalizedSearchQuery = productSearchQuery.trim().toLowerCase();
  const filteredAdminProducts = products
    .filter((prod) => {
      const matchesSearch =
        !normalizedSearchQuery ||
        prod.name.toLowerCase().includes(normalizedSearchQuery) ||
        prod.id.toLowerCase().includes(normalizedSearchQuery) ||
        (prod.sku || "").toLowerCase().includes(normalizedSearchQuery) ||
        prod.category.toLowerCase().includes(normalizedSearchQuery) ||
        (prod.subCategory || "").toLowerCase().includes(normalizedSearchQuery) ||
        prod.brand.toLowerCase().includes(normalizedSearchQuery);
      const matchesVisibility =
        productVisibilityFilter === "all" ||
        (productVisibilityFilter === "hidden" ? Boolean(prod.hidden) : !prod.hidden);
      const missingPrice = productHasMissingPrice(prod);
      const matchesPrice =
        productPriceFilter === "all" ||
        (productPriceFilter === "missing" && missingPrice) ||
        (productPriceFilter === "complete" && !missingPrice) ||
        (productPriceFilter === "variants" && (prod.variants || []).length > 0);

      return matchesSearch && matchesVisibility && matchesPrice;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime || b.id.localeCompare(a.id);
    });
  // Display-only pagination: reuse the shared catalog without another API/Firestore read.
  const productPageCount = Math.max(1, Math.ceil(filteredAdminProducts.length / productPageSize));
  const currentProductPage = Math.min(productPage, productPageCount);
  useEffect(() => {
    setProductPage(page => Math.min(page, productPageCount));
  }, [productPageCount]);
  const visibleAdminProducts = filteredAdminProducts.slice((currentProductPage - 1) * productPageSize, currentProductPage * productPageSize);
  const changeProductPage = (page: number) => {
    setProductPage(Math.max(1, Math.min(page, productPageCount)));
    paginationTopRef.current?.scrollIntoView({ block: 'start' });
  };
  const changeProductPageSize = (size: number) => {
    setProductPageSize(size);
    setProductPage(1);
    paginationTopRef.current?.scrollIntoView({ block: 'start' });
  };

  const cleanDescriptionEditorHtml = (html: string) => {
    return html
      .replace(/<span[^>]*data-description-caret="true"[^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/<p>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, "")
      .replace(/<div>(?:&nbsp;|\s|<br\s*\/?>)*<\/div>/gi, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  };

  const getDescriptionEditorHtml = () => {
    const html = descriptionEditorRef.current?.innerHTML ?? descriptionDraftRef.current ?? "";
    return cleanDescriptionEditorHtml(html);
  };

  const getDescriptionEditorDocument = (): Document | null => null;

  const syncDescriptionFromEditor = (commitToState = false) => {
    const html = getDescriptionEditorHtml();
    descriptionDraftRef.current = html;
    if (commitToState) {
      setProductForm(prev => ({ ...prev, description: html }));
    }
    return html;
  };

  const pushDescriptionUndoSnapshot = () => {
    const snapshot = getDescriptionEditorHtml();
    const stack = descriptionUndoStackRef.current;
    if (stack[stack.length - 1] !== snapshot) {
      stack.push(snapshot);
      if (stack.length > 80) stack.shift();
    }
    descriptionRedoStackRef.current = [];
  };

  const setDescriptionEditorHtml = (html: string) => {
    const editor = descriptionEditorRef.current;
    if (!editor) return;

    editor.innerHTML = html;
    descriptionDraftRef.current = cleanDescriptionEditorHtml(html);
    setProductForm(prev => ({ ...prev, description: descriptionDraftRef.current }));
    moveDescriptionCaretToEnd();
  };

  const undoDescriptionEditorChange = () => {
    if (!descriptionCustomUndoIsLatestRef.current) return false;
    const previous = descriptionUndoStackRef.current.pop();
    if (previous === undefined) return false;

    descriptionRedoStackRef.current.push(getDescriptionEditorHtml());
    setDescriptionEditorHtml(previous);
    descriptionCustomUndoIsLatestRef.current = false;
    return true;
  };

  const redoDescriptionEditorChange = () => {
    const next = descriptionRedoStackRef.current.pop();
    if (next === undefined) return false;

    descriptionUndoStackRef.current.push(getDescriptionEditorHtml());
    setDescriptionEditorHtml(next);
    descriptionCustomUndoIsLatestRef.current = true;
    return true;
  };

  const rememberDescriptionSelection = () => {
    const editor = descriptionEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      descriptionSelectionRef.current = range.cloneRange();
      hasDescriptionSelectionRef.current = true;
      hasManualDescriptionSelectionRef.current = true;
      descriptionInsertAnchorRef.current = null;
    }
  };

  const isDescriptionRangeValid = (range: Range | null) => {
    const editor = descriptionEditorRef.current;
    return Boolean(editor && range && editor.contains(range.commonAncestorContainer));
  };

  const moveDescriptionCaretToEnd = () => {
    const editor = descriptionEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return false;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    descriptionSelectionRef.current = range.cloneRange();
    hasDescriptionSelectionRef.current = true;
    hasManualDescriptionSelectionRef.current = false;
    return true;
  };

  const restoreDescriptionSelection = () => {
    const editor = descriptionEditorRef.current;
    if (!editor) return false;

    editor.focus();
    const selection = window.getSelection();
    const savedRange = descriptionSelectionRef.current;
    if (!selection || !hasDescriptionSelectionRef.current || !savedRange || !isDescriptionRangeValid(savedRange)) {
      return moveDescriptionCaretToEnd();
    }

    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  };

  const insertHtmlIntoDescriptionEditor = (html: string) => {
    const editor = descriptionEditorRef.current;
    if (!editor) return;

    pushDescriptionUndoSnapshot();
    const range = document.createRange();
    const anchor = descriptionInsertAnchorRef.current;
    if (descriptionSelectionRef.current && isDescriptionRangeValid(descriptionSelectionRef.current)) {
      range.setStart(descriptionSelectionRef.current.startContainer, descriptionSelectionRef.current.startOffset);
      range.setEnd(descriptionSelectionRef.current.endContainer, descriptionSelectionRef.current.endOffset);
    } else if (anchor && editor.contains(anchor)) {
      range.setStartAfter(anchor);
      range.collapse(true);
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();

    editor.focus({ preventScroll: true });
    const fragment = range.createContextualFragment(html);
    // Images are block-level already; don't add blank lines after insertion.
    fragment.querySelectorAll('img').forEach(image => { image.style.margin = '0'; });
    const lastInsertedNode = fragment.lastChild;
    range.insertNode(fragment);

    const selection = window.getSelection();
    if (lastInsertedNode && editor.contains(lastInsertedNode)) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastInsertedNode);
      nextRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
      descriptionSelectionRef.current = nextRange.cloneRange();
      hasDescriptionSelectionRef.current = true;
      hasManualDescriptionSelectionRef.current = false;
      descriptionInsertAnchorRef.current = lastInsertedNode;
    }

    syncDescriptionFromEditor(false);
    descriptionCustomUndoIsLatestRef.current = true;
  };

  const normalizeDescriptionEditorAfterInput = () => {
    descriptionCustomUndoIsLatestRef.current = false;
    descriptionInsertAnchorRef.current = null;
    syncDescriptionFromEditor(false);
  };

  const handleDescriptionEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
      if (undoDescriptionEditorChange()) event.preventDefault();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
      if (redoDescriptionEditorChange()) event.preventDefault();
    }
  };

  const insertFormatting = (type: "bold" | "italic" | "align-left" | "align-center" | "align-right" | "align-justify" | "image" | "bullet" | "heading" | "link" | "undo" | "redo") => {
    if (descriptionEditorRef.current) {
      restoreDescriptionSelection();

      switch (type) {
        case "undo":
          if (!undoDescriptionEditorChange()) document.execCommand("undo");
          break;
        case "redo":
          if (!redoDescriptionEditorChange()) document.execCommand("redo");
          break;
        case "bold":
          document.execCommand("bold");
          break;
        case "italic":
          document.execCommand("italic");
          break;
        case "align-left":
          document.execCommand("justifyLeft");
          break;
        case "align-center":
          document.execCommand("justifyCenter");
          break;
        case "align-right":
          document.execCommand("justifyRight");
          break;
        case "align-justify":
  document.execCommand("justifyFull");
  break;
        case "bullet":
          document.execCommand("insertUnorderedList");
          break;
        case "heading":
          document.execCommand("formatBlock", false, "h3");
          break;
        case "image": {
          const url = window.prompt("DÃ¡n URL hÃ¬nh áº£nh cáº§n chÃ¨n:");
          if (url) {
            insertHtmlIntoDescriptionEditor(`<img src="${url}" alt="MÃ´ táº£ áº£nh" class="my-5 h-auto w-full object-contain border border-white/10 bg-black p-3" referrerPolicy="no-referrer" />`);
          }
          break;
        }
        case "link": {
          const url = window.prompt("Dán đường dẫn liên kết:", "https://xuong-in-3d.web.app");
          if (url) document.execCommand("createLink", false, url);
          break;
        }
      }

      syncDescriptionFromEditor(false);
      rememberDescriptionSelection();
      return;
    }

    const doc = getDescriptionEditorDocument();
    if (doc) {
      document.body.focus();

      switch (type) {
        case "undo":
          doc.execCommand("undo");
          break;
        case "redo":
          doc.execCommand("redo");
          break;
        case "bold":
          doc.execCommand("bold");
          break;
        case "italic":
          doc.execCommand("italic");
          break;
        case "align-left":
          doc.execCommand("justifyLeft");
          break;
        case "align-center":
          doc.execCommand("justifyCenter");
          break;
        case "align-right":
          doc.execCommand("justifyRight");
          break;
        case "align-justify":
  doc.execCommand("justifyFull");
  break;
        case "bullet":
          doc.execCommand("insertUnorderedList");
          break;
        case "heading":
          doc.execCommand("formatBlock", false, "h3");
          break;
        case "image": {
          const url = window.prompt("Dán URL hình ảnh cần chèn:");
          if (url) {
            insertHtmlIntoDescriptionEditor(`<img src="${url}" alt="Mô tả ảnh" class="my-5 h-auto w-full object-contain border border-white/10 bg-black p-3" referrerPolicy="no-referrer" />`);
          }
          break;
        }
        case "link": {
          const url = window.prompt("Dán đường dẫn liên kết:", "https://xuong-in-3d.web.app");
          if (url) doc.execCommand("createLink", false, url);
          break;
        }
      }

      normalizeDescriptionEditorAfterInput();
      return;
    }

    const textarea = document.getElementById("product-description-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value || "";
    const selectedText = text.substring(startPos, endPos);

    let replacement = "";
    switch (type) {
      case "bold":
        replacement = `**${selectedText || "Chữ in đậm"}**`;
        break;
      case "italic":
        replacement = `*${selectedText || "Chữ in nghiêng"}*`;
        break;
      case "align-left":
        replacement = `<div class="text-left">\n${selectedText || "Nội dung căn trái"}\n</div>`;
        break;
      case "align-center":
        replacement = `<div class="text-center">\n${selectedText || "Nội dung căn giữa"}\n</div>`;
        break;
      case "align-right":
        replacement = `<div class="text-right">\n${selectedText || "Nội dung căn phải"}\n</div>`;
        break;
      case "align-justify":
  replacement = `<div style="text-align: justify;">\n${selectedText || "Nội dung căn đều hai bên"}\n</div>`;
  break;
      case "image":
        replacement = `\n![Mô tả ảnh](${selectedText || "url_hinh_anh_san_pham.webp"})\n`;
        break;
      case "bullet":
        replacement = `\n- ${selectedText || "Mục dòng liệt kê"}`;
        break;
      case "heading":
        replacement = `\n### ${selectedText || "Tiêu đề phụ"}\n`;
        break;
      case "link":
        replacement = `[${selectedText || "Văn bản hiển thị"}](https://xuong-in-3d.web.app)`;
        break;
    }

    const newContent = text.substring(0, startPos) + replacement + text.substring(endPos);
    setProductForm(prev => ({ ...prev, description: newContent }));
    
    // reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + replacement.length, startPos + replacement.length);
    }, 50);
  };

  const setupDescriptionEditor = () => {
    const iframe = descriptionEditorRef.current;
    const doc = getDescriptionEditorDocument();
    if (!iframe || !doc) return;

    doc.open();
    doc.write(`<!doctype html>
      <html>
        <head>
          <style>
            html, body {
              min-height: 100%;
              margin: 0;
              background: #000;
              color: #ececec;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.7;
            }
            body {
              padding: 12px 14px;
              outline: none;
              white-space: normal;
            }
            body:empty:before {
              content: "Nhập hoặc dán mô tả từ Word/Excel vào đây...";
              color: #6b7280;
            }
            p, div { margin: 0 0 8px; }
            h3 {
              margin: 12px 0 6px;
              color: #f5c45a;
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
            }
            a { color: #f5c45a; }
            ul, ol { padding-left: 22px; margin: 8px 0; }
            img {
              display: block;
              max-width: 100%;
              max-height: 420px;
              object-fit: contain;
              margin: 12px auto;
              border: 1px solid rgba(255,255,255,.12);
              background: #000;
              padding: 8px;
            }
            table {
              width: 100%;
              min-width: 560px;
              margin: 16px 0;
              border-collapse: collapse;
              border: 1px solid rgba(245,196,90,.38);
              background: rgba(0,0,0,.24);
              color: #e5e7eb;
            }
            th, td {
              border: 1px solid rgba(255,255,255,.22);
              padding: 7px 10px;
              vertical-align: top;
              text-align: left;
            }
            th, tr:first-child td {
              background: rgba(245,196,90,.12);
              color: #fff;
              font-weight: 700;
            }
          </style>
        </head>
        <body contenteditable="true">${descriptionDraftRef.current || productForm.description || ""}</body>
      </html>`);
    doc.close();
    doc.designMode = "on";

    const handleInput = () => normalizeDescriptionEditorAfterInput();
    const handlePaste = (event: ClipboardEvent) => handleDescriptionPaste(event);
    doc.body.addEventListener("input", handleInput);
    doc.body.addEventListener("paste", handlePaste);
  };

  const handleCloudinaryUpload = async (
    files: FileList | File[] | null,
    target: "main" | "gallery" | "description" | `combo-${number}` | `variant-image:${string}`,
  ) => {
    const scrollTopBeforeUpload = productFormScrollRef.current?.scrollTop || 0;

    if (!files || files.length === 0) return;

    if (!isCloudinaryConfigured()) {
      showToast("Chưa cấu hình Cloudinary. Thêm NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME và NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.", "warning");
      restoreProductFormScroll(scrollTopBeforeUpload);
      return;
    }

    const selectedFiles = Array.from(files);
    const uploadProductId = productForm.id;
    setUploadingImageTarget(target);

    try {
      const urls: string[] = [];
      for (const file of selectedFiles) {
        const uploadFile = watermarkEnabled ? await watermarkImageFile(file, watermarkLogoUrl, watermarkOptions, 0.7) : file;
        urls.push(await uploadImageToCloudinary(uploadFile, { convertToWebp: true, webpQuality: 0.7 }));
      }

      if (target === "main") {
        setProductForm(prev => ({
          ...prev,
          image: urls[0],
          images: urls.length > 1 ? [...(prev.images || []), ...urls.slice(1)] : prev.images,
        }));
      }

      if (target === "gallery") {
        setProductForm(prev => ({
          ...prev,
          images: [...(prev.images || []), ...urls],
        }));
      }

      if (target.startsWith("variant-image:")) {
        const variantId = target.slice("variant-image:".length);
        setProductForm(prev => prev.id !== uploadProductId ? prev : ({
          ...prev,
          variants: (prev.variants || []).map(variant => variant.id === variantId ? { ...variant, image: urls[0] } : variant),
        }));
      }

      if (target === "description") {
        const imageHtml = urls.map((url, index) => (
          `<img src="${url}" alt="Ảnh sản phẩm ${index + 1}" class="my-5 h-auto w-full object-contain border border-white/10 bg-black p-3" referrerPolicy="no-referrer" />`
        )).join("");

        if (descriptionEditorRef.current && !isToolbarPreviewMode) {
          insertHtmlIntoDescriptionEditor(imageHtml);
        } else {
          setProductForm(prev => ({
            ...prev,
            description: prev.description ? `${prev.description}\n${imageHtml}` : imageHtml,
          }));
        }
      }

      if (target.startsWith("combo-")) {
        const comboIndex = Number(target.replace("combo-", ""));
        setProductForm(prev => ({
          ...prev,
          combos: (prev.combos || []).map((combo, index) =>
            index === comboIndex ? { ...combo, image: urls[0] } : combo
          ),
        }));
      }

      const convertedCount = selectedFiles.filter(file => /^image\/(png|jpe?g)$/i.test(file.type)).length;
      if (files === catalogueFiles) setCatalogueFiles([]);
      showToast(
        watermarkEnabled ? `Đã đóng watermark, chuyển WebP và tải ${selectedFiles.length} ảnh lên.` : convertedCount > 0
          ? `Đã tự chuyển ${convertedCount} ảnh sang WebP 70% và tải lên.`
          : `Đã tải ${selectedFiles.length} ảnh lên.`,
        "success",
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải ảnh lên Cloudinary.";
      showToast(message, "error");
    } finally {
      setUploadingImageTarget(null);
      restoreProductFormScroll(scrollTopBeforeUpload);
    }
  };

  const insertImageUrlToDescription = (url: string, alt = "Ảnh sản phẩm") => {
    if (!url.trim()) return;

    if (descriptionEditorRef.current && !isToolbarPreviewMode) {
      insertHtmlIntoDescriptionEditor(`<img src="${url.trim()}" alt="${alt.replace(/"/g, "&quot;")}" class="my-5 h-auto w-full object-contain border border-white/10 bg-black p-3" referrerPolicy="no-referrer" />`);
      return;
    }

    const markdownImage = `![${alt}](${url.trim()})`;
    setProductForm(prev => ({
      ...prev,
      description: prev.description ? `${prev.description}\n${markdownImage}` : markdownImage,
    }));
    setIsToolbarPreviewMode(false);
  };

  const appendAllImagesToDescription = () => {
    if (uploadingImageTarget || !quickInsertImages.length) return;
    const existing = getDescriptionEditorHtml() || productForm.description || '';
    const parsed = new DOMParser().parseFromString(existing, 'text/html');
    const inserted = new Set(Array.from(parsed.querySelectorAll('img')).map(img => img.getAttribute('src')));
    const missing = quickInsertImages.filter(url => !inserted.has(url) && /^https?:\/\//i.test(url));
    if (!missing.length) { showToast('Các ảnh đã có trong mô tả.', 'success'); return; }
    const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const appended = missing.map((url, index) => `<p><img src="${escape(url)}" alt="${escape(productForm.name || 'Ảnh sản phẩm')} — ảnh ${index + 1}" loading="lazy" style="max-width:100%;height:auto;display:block;margin:16px auto" referrerpolicy="no-referrer" /></p>`).join('');
    pushDescriptionUndoSnapshot();
    descriptionCustomUndoIsLatestRef.current = true;
    const next = existing + appended;
    descriptionDraftRef.current = next;
    if (descriptionEditorRef.current) setDescriptionEditorHtml(next);
    else setProductForm(prev => ({ ...prev, description: next }));
    setIsToolbarPreviewMode(false);
    showToast(`Đã chèn ${missing.length} ảnh vào cuối mô tả. Bấm Lưu sản phẩm để áp dụng.`, 'success');
  };

  const handleDescriptionPaste = (event: React.ClipboardEvent<HTMLDivElement> | ClipboardEvent) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    const html = clipboardData.getData("text/html");
    const text = clipboardData.getData("text/plain");

    if (html) {
      const sanitizedHtml = sanitizeDescriptionHtml(html);
      if (sanitizedHtml) {
        event.preventDefault();
        insertHtmlIntoDescriptionEditor(sanitizedHtml);
      }
      return;
    }

    if (!text) return;

    event.preventDefault();
    const escapedText = text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => {
        const div = document.createElement("div");
        div.textContent = paragraph;
        return `<p>${div.innerHTML.replace(/\n/g, "<br />")}</p>`;
      })
      .join("");
    insertHtmlIntoDescriptionEditor(escapedText);
  };

  const extractSpecsFromClipboard = (clipboardData: DataTransfer) => {
    const html = clipboardData.getData("text/html");
    const text = clipboardData.getData("text/plain");
    return parseSpecsClipboard(text, html);
  };

  const handleSpecsPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const rows = extractSpecsFromClipboard(event.clipboardData);
    if (!rows.length) return;

    event.preventDefault();

    setProductForm(prev => {
      const nextSpecs = { ...(prev.specs || {}) };
      rows.forEach(([key, value]) => {
        nextSpecs[key] = value;
      });
      return { ...prev, specs: nextSpecs };
    });

    setNewSpecKey("");
    setNewSpecValue("");
    showToast(`Da nhap ${rows.length} thong so tu bang.`, "success");
  };

  const descriptionImages = getDescriptionImages(productForm.description);

  
  const handleUpdateDescriptionImage = (imageIndex: number, nextUrl: string) => {
    const images = getDescriptionImages(productForm.description);
    const target = images[imageIndex];
    if (!target) return;

    setProductForm(prev => ({
      ...prev,
      description: (prev.description || "").replace(target.markdown, `![${target.alt}](${nextUrl})`),
    }));
  };

  const handleRemoveDescriptionImage = (imageIndex: number) => {
    const images = getDescriptionImages(productForm.description);
    const target = images[imageIndex];
    if (!target) return;

    setProductForm(prev => ({
      ...prev,
      description: (prev.description || "").replace(target.markdown, "").replace(/\n{3,}/g, "\n\n").trim(),
    }));
  };

  const handleAddSpecItem = () => {
    const specKey = newSpecKey.trim();
    const specValue = newSpecValue.trim();
    if (!specKey || !specValue) return;
    setProductForm(prev => ({
      ...prev,
      specs: {
        ...(prev.specs || {}),
        [specKey]: specValue,
      }
    }));
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const handleRemoveSpecItem = (key: string) => {
    setProductForm(prev => {
      const copy = { ...(prev.specs || {}) };
      delete copy[key];
      return { ...prev, specs: copy };
    });
  };

  const handleUpdateSpecValue = (key: string, value: string) => {
    setProductForm(prev => ({
      ...prev,
      specs: {
        ...(prev.specs || {}),
        [key]: value,
      },
    }));
  };

  const handleExportProductsExcel = async () => {
    const exportRows = filteredAdminProducts.length ? filteredAdminProducts : products;
    if (!exportRows.length) { showToast("Chưa có sản phẩm để xuất file.", "warning"); return; }
    try {
      const XLSX = await import("xlsx");
      const matrix = productWorkbookMatrix(exportRows);
      const sheet = XLSX.utils.aoa_to_sheet(matrix);
      sheet["!cols"] = matrix[0].map(label => ({ wch: /Mô tả|Thông số|Ảnh|Video|JSON/.test(String(label)) ? 45 : 24 }));
      sheet["!autofilter"] = { ref: sheet["!ref"] || "A1" };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Sản phẩm");
      const guide = XLSX.utils.aoa_to_sheet(productWorkbookGuide);
      guide["!cols"] = [{ wch: 28 }, { wch: 110 }];
      XLSX.utils.book_append_sheet(wb, guide, "Hướng dẫn");
      XLSX.writeFile(wb, `xuong-in-3d-products-${new Date().toISOString().slice(0,10)}.xlsx`);
      showToast(`Đã xuất ${exportRows.length} sản phẩm, gồm giá đại lý, màu sắc và phân loại.`, "success");
    } catch {
      showToast("Không thể xuất Excel. Vui lòng thử lại.", "error");
    }
  };
  const handleDownloadImportTemplate = () => {
    const link = document.createElement("a");
    link.href = "/downloads/mau-nhap-san-pham-xuong-in-3d.xlsx?v=20261006-2";
    link.download = "mau-nhap-san-pham-xuong-in-3d.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Đã tải mẫu Excel có màu sắc, kích thước và phân loại sản phẩm.", "success");
  };

  const handleImportProducts = async (file: File | undefined) => {
    if (!file) return;
    setBulkImporting(true);

    try {
      const matrix = await readProductImportRows(file);
      if (matrix.length < 2) throw new Error("File chưa có dòng dữ liệu sản phẩm.");

      const headers = matrix[0].map((header) => String(header ?? "").trim().toLowerCase());
      const headerIndex = new Map(headers.map((header, index) => [header, index]));
      const cell = (row: string[], label: string) => {
        const index = headerIndex.get(label.toLowerCase());
        return index === undefined ? "" : String(row[index] ?? "").trim();
      };
      const splitLines = (value: string) => value.split(/\r?\n|\s*\|\s*/).map((item) => item.trim()).filter(Boolean);
      const parseSpecs = (value: string) => Object.fromEntries(
        splitLines(value).map((line) => {
          const separatorIndex = line.indexOf(":");
          return separatorIndex > 0
            ? [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()]
            : [line, ""];
        }).filter(([key, value]) => key && value),
      );
      const existingById = new Map(products.map((product) => [product.id, product]));
      const normalizeProductCode = (value: string | undefined) => String(value || "").trim().toLocaleLowerCase("vi");
      const existingByCode = new Map<string, Product>();
      products.forEach((product) => {
        [product.id, product.sku, product.barcode].forEach((value) => {
          const normalized = normalizeProductCode(value);
          if (normalized) existingByCode.set(normalized, product);
        });
      });
      const candidates: Product[] = [];
      const normalizeCategoryValue = (value: string) => value.trim().toLocaleLowerCase("vi");
      const resolveCategoryId = (value: string, fallback: string) => {
        if (!value) return fallback;
        const normalized = normalizeCategoryValue(value);
        return productCategories.find((category) => (
          normalizeCategoryValue(category.id) === normalized
          || normalizeCategoryValue(category.name) === normalized
        ))?.id || value;
      };
      const resolveSubCategoryId = (categoryId: string, value: string, fallback: string) => {
        if (!value) return fallback;
        const normalized = normalizeCategoryValue(value);
        const category = productCategories.find((item) => item.id === categoryId);
        return category?.children?.find((child) => (
          normalizeCategoryValue(child.id) === normalized
          || normalizeCategoryValue(child.name) === normalized
        ))?.id || value;
      };

      matrix.slice(1).forEach((row) => {
        const name = cell(row, "Tên sản phẩm");
        const productCode = cell(row, "Mã SP") || cell(row, "SKU") || cell(row, "ID");
        const requestedId = cell(row, "ID");
        const existing = (requestedId ? existingById.get(requestedId) : undefined)
          || existingByCode.get(normalizeProductCode(productCode));
        const id = existing?.id || requestedId || slugifyProductText(productCode || name);
        if (!id || !name) return;

        const keep = (label: string, fallback = "") => cell(row, label) || fallback;
        const imageLines = splitLines(cell(row, "Ảnh bổ sung"));
        const videoLines = splitLines(cell(row, "Video"));
        const specsValue = cell(row, "Thông số kỹ thuật");
        const visibility = cell(row, "Trạng thái hiển thị").toLowerCase();
        const categoryId = resolveCategoryId(
          cell(row, "Danh mục"),
          existing?.category || productCategories[0]?.id || "khac",
        );
        const imported: Product = {
          ...(existing || {} as Product),
          id,
          slug: getProductSlug({ id, name } as Product),
          name,
          category: categoryId,
          subCategory: resolveSubCategoryId(categoryId, cell(row, "Danh mục con"), existing?.subCategory || ""),
          brand: keep("Thương hiệu", existing?.brand || "XƯỞNG IN 3D"),
          voltage: keep("Kích thước / quy mô", existing?.voltage || ""),
          capacity: keep("Hình thức thực hiện", existing?.capacity || ""),
          cellType: keep("Vật liệu", existing?.cellType || "Theo yêu cầu"),
          warranty: keep("Bảo hành", existing?.warranty || "Hỗ trợ sau bàn giao"),
          price: keep("Giá bán", existing?.price || "Liên hệ"),
          salePrice: cell(row, "Giá giảm") === '-' ? '' : keep("Giá giảm", existing?.salePrice || ""),
          image: keep("Ảnh đại diện", existing?.image || "/images/san-pham.webp"),
          images: imageLines.length ? imageLines : existing?.images || [],
          videoUrls: videoLines.length ? videoLines : existing?.videoUrls || [],
          description: keep("Mô tả", existing?.description || "Đang cập nhật nội dung sản phẩm."),
          specs: specsValue ? parseSpecs(specsValue) : existing?.specs || {},
          sku: productCode || keep("SKU", existing?.sku || ""),
          barcode: keep("Barcode", existing?.barcode || ""),
          stockQuantity: keep("Số tồn", existing?.stockQuantity || ""),
          stockStatus: (keep("Trạng thái kho", existing?.stockStatus || "") as Product["stockStatus"]),
          hidden: visibility ? /ẩn|hidden|true|1/.test(visibility) : existing?.hidden || false,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...readProductExcelOptions(headers, (label) => cell(row, label), id, existing),
          ...readProductWorkbookExtras((label) => cell(row, label), existing),
        };
        candidates.push(imported);
        existingById.set(id, imported);
        [imported.id, imported.sku, imported.barcode].forEach((value) => {
          const normalized = normalizeProductCode(value);
          if (normalized) existingByCode.set(normalized, imported);
        });
      });

      if (!candidates.length) throw new Error("Không tìm thấy sản phẩm hợp lệ. File cần có cột Mã SP và Tên sản phẩm.");
      const updateCount = candidates.filter((product) => products.some((current) => current.id === product.id)).length;
      const createCount = candidates.length - updateCount;
      if (!window.confirm(`Nhập ${candidates.length} sản phẩm: tạo mới ${createCount}, cập nhật ${updateCount}. Tiếp tục?`)) return;

      let successCount = 0;
      for (const product of candidates) {
        const exists = products.some((current) => current.id === product.id);
        const saved = exists ? await updateProduct(product) : await addProduct(product);
        if (saved) successCount += 1;
      }
      showToast(`Đã nhập thành công ${successCount}/${candidates.length} sản phẩm lên Firebase.`, successCount === candidates.length ? "success" : "warning");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không đọc được file sản phẩm.", "error");
    } finally {
      setBulkImporting(false);
      if (bulkImportInputRef.current) bulkImportInputRef.current.value = "";
    }
  };

  return (
    <div id="products-admin-module" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2 text-gold-light">
            <Battery className="w-4 h-4 scale-110" />
            QUẢN LÝ KHO HÀNG SẢN PHẨM ({products.length})
          </h2>
          <p className="text-xs text-gray-400">Quản lý danh mục, kích thước, vật liệu, giá và thông tin các sản phẩm in 3D.</p>
        </div>
        
        <button
          onClick={() => handleOpenProductModal()}
          className="gold-gradient-bg hover:opacity-95 text-black font-display font-bold py-2.5 px-4 text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Thêm sản phẩm
        </button>
      </div>

      <div className="border border-gold-dark/20 bg-black/50 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-[11px] font-display font-black uppercase tracking-widest text-[#F5C45A]">Danh mục sản phẩm</h3>
            <p className="mt-1 text-[10px] text-gray-500">
              {productCategories.length} danh mục cha. Mở khi cần thêm, sửa, ẩn/xóa danh mục.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCategoryPanelOpen((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 border border-gold-dark/35 px-4 py-2.5 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light transition-colors hover:border-gold-light hover:text-white"
          >
            {isCategoryPanelOpen ? "Thu gọn danh mục" : "Mở danh mục"}
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isCategoryPanelOpen ? "rotate-90" : ""}`} />
          </button>
        </div>

        {isCategoryPanelOpen && (
          <>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-t border-white/5 pt-4">
              <p className="max-w-xl text-[10px] text-gray-500">
                Thêm, sửa, ẩn/xóa danh mục cha và danh mục con. Khi thêm sản phẩm, nếu danh mục cha có danh mục con thì sẽ hiện thêm ở chọn bên dưới.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 lg:min-w-[420px]">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddProductCategory();
                }
              }}
              placeholder="Ten danh muc moi"
              className="flex-1 bg-black border border-[#1A1A1A] text-xs px-3 py-2.5 text-[#ECECEC] focus:outline-none focus:border-gold-light"
            />
            <button
              type="button"
              onClick={handleAddProductCategory}
              className="gold-gradient-bg text-black font-display font-bold px-4 py-2.5 text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Them danh muc
            </button>
              </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {productCategories.map((category) => (
            <div key={category.id} className="border border-white/10 bg-[#070707] p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => handleUpdateProductCategory(category.id, { name: e.target.value })}
                    className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none focus:border-gold-light font-display font-bold uppercase"
                  />
                  <div className="text-[9px] text-gray-600 font-mono">ID: {category.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateProductCategory(category.id, { hidden: !category.hidden })}
                  className={`border px-3 py-2 text-[9px] font-display font-bold uppercase tracking-wider ${category.hidden ? "border-gray-700 text-gray-400" : "border-emerald-500/25 text-emerald-400"}`}
                >
                  {category.hidden ? "Đang ẩn" : "Đang hiện"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProductCategory(category.id)}
                  className="border border-red-500/20 bg-red-500/10 px-3 py-2 text-[9px] font-display font-bold uppercase tracking-wider text-red-400 hover:bg-red-500 hover:text-white"
                >
                  Xóa
                </button>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newChildCategoryNames[category.id] || ""}
                    onChange={(e) => setNewChildCategoryNames((prev) => ({ ...prev, [category.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChildCategory(category.id);
                      }
                    }}
                    placeholder="Tên danh mục con"
                    className="flex-1 bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-[#ECECEC] focus:outline-none focus:border-gold-light"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddChildCategory(category.id)}
                    className="border border-gold-dark/40 px-3 py-2 text-[9px] font-display font-bold uppercase tracking-wider text-gold-light hover:border-gold-light"
                  >
                    Thêm con
                  </button>
                </div>

                {(category.children || []).length > 0 && (
                  <div className="space-y-1.5">
                    {(category.children || []).map((child) => (
                      <div key={child.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center bg-black/70 border border-white/5 p-2">
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => handleUpdateChildCategory(category.id, child.id, { name: e.target.value })}
                          className="w-full bg-[#050505] border border-[#1A1A1A] text-[11px] px-3 py-2 text-white focus:outline-none focus:border-gold-light font-display font-bold uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateChildCategory(category.id, child.id, { hidden: !child.hidden })}
                          className={`border px-2 py-2 text-[8.5px] font-display font-bold uppercase tracking-wider ${child.hidden ? "border-gray-700 text-gray-400" : "border-emerald-500/25 text-emerald-400"}`}
                        >
                          {child.hidden ? "Ẩn" : "Hiện"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChildCategory(category.id, child.id)}
                          className="text-red-400 hover:text-white text-[9px] font-display font-bold uppercase"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>

      <ProductTrashPanel />
      <div className="border border-white/5 bg-black/40 p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="search"
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, ID, thương hiệu hoặc danh mục..."
              className="w-full bg-black border border-[#1A1A1A] text-[#ECECEC] pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-gold-light"
            />
          </div>

          <select
            value={productVisibilityFilter}
            onChange={(e) => setProductVisibilityFilter(e.target.value as "all" | "visible" | "hidden")}
            className="lg:col-span-2 bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2.5 text-xs focus:outline-none focus:border-gold-light font-display font-bold uppercase"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đang ẩn</option>
          </select>

          <select
            value={productPriceFilter}
            onChange={(e) => setProductPriceFilter(e.target.value as "all" | "missing" | "complete" | "variants")}
            className="lg:col-span-2 bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2.5 text-xs focus:outline-none focus:border-gold-light font-display font-bold uppercase"
          >
            <option value="all">Tất cả giá</option>
            <option value="missing">Chưa đủ giá</option>
            <option value="complete">Đã đủ giá</option>
            <option value="variants">Có phân loại</option>
          </select>

          <div className="lg:col-span-4 flex items-stretch justify-between gap-2">
            <div className="flex border border-[#1A1A1A] bg-black">
              <button
                type="button"
                onClick={() => setAdminViewMode("grid")}
                className={`w-10 flex items-center justify-center transition-colors ${adminViewMode === "grid" ? "bg-gold-dark text-black" : "text-gray-400 hover:text-white"}`}
                title="Dạng thẻ"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode("list")}
                className={`w-10 flex items-center justify-center transition-colors ${adminViewMode === "list" ? "bg-gold-dark text-black" : "text-gray-400 hover:text-white"}`}
                title="Dạng danh sách"
              >
                <Rows3 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportProductsExcel}
              className="flex items-center justify-center gap-1.5 px-3 border border-gold-dark/40 bg-black text-[10px] text-gold-light font-display font-bold uppercase tracking-widest hover:border-gold-light transition-colors"
              title="Xuất file Excel sản phẩm"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>

            <button
              type="button"
              onClick={handleDownloadImportTemplate}
              className="flex items-center justify-center gap-1.5 px-3 border border-blue-500/35 bg-black text-[10px] text-blue-300 font-display font-bold uppercase tracking-widest hover:border-blue-400 transition-colors"
              title="Tải file Excel mẫu để nhập sản phẩm hàng loạt"
            >
              <Download className="w-3.5 h-3.5" />
              Tải mẫu
            </button>

            <button
              type="button"
              onClick={() => bulkImportInputRef.current?.click()}
              disabled={bulkImporting}
              className="flex items-center justify-center gap-1.5 px-3 border border-emerald-500/40 bg-black text-[10px] text-emerald-400 font-display font-bold uppercase tracking-widest hover:border-emerald-400 transition-colors disabled:opacity-50"
              title="Nhập hàng loạt từ file Excel mẫu hoặc CSV"
            >
              {bulkImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Nhập file
            </button>
            <input
              ref={bulkImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.ms-excel"
              hidden
              onChange={(event) => void handleImportProducts(event.target.files?.[0])}
            />

            <div className="flex items-center px-3 border border-[#1A1A1A] bg-black text-[10px] text-gray-500 font-mono uppercase">
              {filteredAdminProducts.length}/{products.length} sản phẩm
            </div>
          </div>
        </div>
      </div>

      {/* Catalog lists */}
      <div ref={paginationTopRef} className="scroll-mt-28">
        <ProductPagination total={filteredAdminProducts.length} page={currentProductPage} pageSize={productPageSize} onPageChange={changeProductPage} onPageSizeChange={changeProductPageSize} />
      </div>
      {filteredAdminProducts.length === 0 ? (
        <div className="border border-white/5 bg-black/50 py-14 text-center">
          <Search className="w-9 h-9 text-gray-600 mx-auto mb-3" />
          <p className="text-xs text-gray-400 font-display font-bold uppercase tracking-widest">Không tìm thấy sản phẩm phù hợp</p>
        </div>
      ) : (
        <div className={adminViewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 mt-4" : "space-y-2 mt-4"}>
          {visibleAdminProducts.map((prod) => (
            <div
              key={prod.id}
              className={`bg-black/80 border transition-all duration-300 ${
                prod.hidden
                  ? "border-gray-800 opacity-70 hover:opacity-100"
                  : "border-[#1A1A1A] hover:border-gold-dark/40"
              } ${adminViewMode === "grid" ? "p-2.5 flex flex-col justify-between" : "p-3 flex flex-col md:flex-row md:items-center gap-3"}`}
            >
              <div className={`flex items-start gap-3 ${adminViewMode === "list" ? "flex-1 min-w-0" : ""}`}>
                <div className="w-12 h-12 bg-[#111] border border-[#222] p-1 flex items-center justify-center shrink-0">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="px-1 text-center text-[9px] font-display font-bold uppercase leading-tight text-gray-600">
                      Chưa có ảnh
                    </span>
                  )}
                </div>
                <div className={`space-y-1 min-w-0 ${adminViewMode === "list" ? "flex-1" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-mono text-gold-light tracking-wide bg-gold-dark/10 p-0.5">{[prod.voltage, prod.capacity].filter(Boolean).join(" / ")}</span>
                    <span className="text-[9px] text-gray-500 font-mono" title={`ID nội bộ: ${prod.id}`}>Mã SP: {prod.sku || prod.id}</span>
                    {getProductSalesProgramCount(prod.id) > 0 && (
                      <span className="text-[9px] font-display font-bold uppercase px-2 py-0.5 border border-gold-dark/35 bg-gold-dark/10 text-gold-light">
                        Có combo ({getProductSalesProgramCount(prod.id)})
                      </span>
                    )}
                    <span className={`text-[9px] font-display font-bold uppercase px-2 py-0.5 border ${prod.hidden ? "text-gray-400 border-gray-700 bg-gray-900/60" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"}`}>
                      {prod.hidden ? "Đang ẩn" : "Đang hiện"}
                    </span>
                  </div>
                  <h3 className="text-[11px] font-display font-bold text-white uppercase line-clamp-1 leading-snug">{prod.name}</h3>
                  {(prod.variants || []).length === 0 && <div className="flex items-center gap-2 pt-1">
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-gray-500">Giá web</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={getQuickPriceValue(prod)}
                        onChange={(e) => setQuickPriceDrafts((current) => ({ ...current, [prod.id]: e.target.value }))}
                        placeholder="Nhập giá bán lẻ"
                        className={`h-8 min-w-0 flex-1 border bg-[#0b0b0b] px-2.5 text-[11px] font-bold text-white outline-none ${hasQuickPriceChange(prod) ? "border-gold-light" : "border-white/10 focus:border-gold-dark"}`}
                      />
                    </label>
                    {hasQuickPriceChange(prod) && (
                      <button
                        type="button"
                        disabled={savingQuickPriceId === prod.id}
                        onClick={() => handleSaveQuickPrice(prod)}
                        className="flex h-8 items-center gap-1 bg-gold-light px-2 text-[9px] font-black uppercase text-black disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingQuickPriceId === prod.id ? "Đang lưu" : "Xác nhận"}
                      </button>
                    )}
                    {prod.salePrice && <span className="shrink-0 text-[8px] font-bold text-emerald-400">KM: {prod.salePrice}</span>}
                  </div>}

                  {(prod.variants || []).length > 0 && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedVariantPriceIds((current) => {
                          const next = new Set(current);
                          if (next.has(prod.id)) next.delete(prod.id);
                          else next.add(prod.id);
                          return next;
                        })}
                        className="flex w-full items-center justify-between border border-white/5 bg-white/[.02] px-2.5 py-2 text-left hover:border-gold-dark/30"
                        aria-expanded={expandedVariantPriceIds.has(prod.id)}
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider text-gold-light">
                          Giá theo phân loại · {prod.variants?.length}
                        </span>
                        <span className="flex items-center gap-2 text-[9px] text-gray-500">
                          {expandedVariantPriceIds.has(prod.id) ? "Thu gọn" : "Xem giá"}
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedVariantPriceIds.has(prod.id) ? "rotate-90" : ""}`} />
                        </span>
                      </button>
                      {expandedVariantPriceIds.has(prod.id) && (
                        <div className="mt-1.5 space-y-1.5">
                          {(prod.variants || []).map((variant) => {
                        const key = getVariantDraftKey(prod.id, variant.id);
                        return (
                          <div key={variant.id} className={`grid grid-cols-[minmax(0,1fr)_125px_auto] items-center gap-2 border px-2 py-1.5 ${!parsePriceValue(variant.salePrice || variant.price) ? "border-red-500/25 bg-red-500/5" : "border-white/5 bg-white/[.02]"}`}>
                            <div className="min-w-0">
                              <b className="block truncate text-[10px] text-gray-300">{variant.name}</b>
                              <span className="font-mono text-[8px] text-gray-600">{variant.sku || variant.id}</span>
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getQuickVariantPriceValue(prod, variant)}
                              onChange={(e) => setQuickVariantPriceDrafts((current) => ({ ...current, [key]: e.target.value }))}
                              placeholder="Chưa có giá"
                              className={`w-full border bg-black px-2 py-1.5 text-[10px] font-bold text-white outline-none ${hasQuickVariantPriceChange(prod, variant) ? "border-gold-light" : "border-white/10"}`}
                            />
                            {hasQuickVariantPriceChange(prod, variant) ? (
                              <button
                                type="button"
                                disabled={savingQuickPriceId === key}
                                onClick={() => handleSaveQuickVariantPrice(prod, variant)}
                                className="bg-gold-light p-1.5 text-black disabled:opacity-50"
                                title="Xác nhận lưu giá phân loại"
                              ><Save className="h-3.5 w-3.5" /></button>
                            ) : <span className={`h-2 w-2 rounded-full ${parsePriceValue(variant.salePrice || variant.price) ? "bg-emerald-500" : "bg-red-500"}`} title={parsePriceValue(variant.salePrice || variant.price) ? "Đã có giá" : "Chưa có giá"} />}
                          </div>
                        );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              <div className={`${adminViewMode === "grid" ? "mt-2.5 pt-2 border-t border-[#1A1A1A] flex flex-wrap items-center justify-between gap-2" : "flex flex-wrap items-center justify-end gap-2 shrink-0"}`}>
                {adminViewMode === "grid" && (
                  <span className="min-w-0 truncate text-[8px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 font-bold uppercase">{getCategoryDisplayName(prod.category, prod.subCategory)}</span>
                )}

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <ProductPrintFileButton product={prod} />
                  <button
                    type="button"
                    onClick={() => handleToggleProductVisibility(prod)}
                    className={`bg-[#111] hover:bg-[#222] border border-white/5 text-[9px] font-display uppercase tracking-wider px-2 py-1 flex items-center gap-1 transition-all cursor-pointer ${prod.hidden ? "text-emerald-400" : "text-gray-400"}`}
                    title={prod.hidden ? "Bật hiển thị sản phẩm" : "Ẩn sản phẩm khỏi trang công khai"}
                  >
                    {prod.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {prod.hidden ? "Hiện" : "Ẩn"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyProduct(prod)}
                    className="bg-[#111] hover:bg-[#222] border border-white/5 text-[9px] font-display uppercase tracking-wider text-[#A3E635] px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                    title="Nhân bản sản phẩm"
                  >
                    <Copy className="w-3 h-3 text-[#A3E635]" />
                    Nhân bản
                  </button>
                  <button
                    onClick={() => handleOpenProductModal(prod)}
                    className="bg-[#111] hover:bg-[#222] border border-white/5 text-[9px] font-display uppercase tracking-wider text-white px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Edit className="w-3 h-3 text-[#F5C45A]" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteProductPrompt(prod.id, prod.name)}
                    className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-[10px] px-2 py-1 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredAdminProducts.length > 0 && <div className="border-t border-white/10 pt-4">
        <ProductPagination total={filteredAdminProducts.length} page={currentProductPage} pageSize={productPageSize} onPageChange={changeProductPage} onPageSizeChange={changeProductPageSize} />
      </div>}

      {/* POPUP MODAL */}
      {isProductModalOpen && (
        <div id="product-admin-modal" className="fixed inset-0 bg-black/95 z-50 flex min-h-0 overflow-hidden px-3 lg:px-6" onWheel={handleProductModalWheel}>
          <div className="bg-[#0A0A0A] border border-gold-dark/40 w-full max-w-6xl mx-auto h-full min-h-0 overflow-hidden shadow-[0_15px_50px_rgba(216,154,43,0.15)] flex flex-col">
            <div className="shrink-0 px-4 py-4 sm:px-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-display font-black tracking-widest text-[#F5C45A] uppercase flex items-center gap-2">
                <Battery className="w-4 h-4 text-gold-light" />
                {editingProduct ? "CHỈNH SỬA SẢN PHẨM" : "THÊM SẢN PHẨM MỚI"}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form ref={productFormScrollRef} id="product-admin-form" onSubmit={handleSaveProduct} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:p-6 sm:pb-8 space-y-4">
              <ProductWatermarkControls key={productForm.id} imageUrl={productForm.image} enabled={watermarkEnabled} onEnabledChange={setWatermarkEnabled} logoUrl={watermarkLogoUrl} onLogoChange={setWatermarkLogoUrl} options={watermarkOptions} onOptionsChange={setWatermarkOptions} disabled={Boolean(uploadingImageTarget)} />
              {catalogueFiles.length > 0 && <div className="border border-gold-dark/30 p-4 text-sm space-y-2">
                <p>Bản nháp từ AI đang để ẩn. Có {catalogueFiles.length} ảnh gốc chưa upload. Kiểm tra watermark ở trên, rồi tải ảnh lên khi sẵn sàng.</p>
                <button type="button" disabled={Boolean(uploadingImageTarget)} className="border border-gold-light px-4 py-2 text-gold-light" onClick={() => { void handleCloudinaryUpload(catalogueFiles, "main"); }}>Tải bộ ảnh gốc vào sản phẩm (ảnh đầu làm đại diện)</button>
                <button type="button" className="px-3 text-gray-400" onClick={() => setCatalogueFiles([])}>Bỏ qua ảnh nguồn</button>
              </div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gold-light">Mã SP / SKU</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku || ""}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value.trim().toUpperCase() }))}
                    placeholder="VD: MH001"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-500">Dùng trong Excel và đặt tên ảnh: MH001.jpg, MH001-1.jpg...</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Tên Sản phẩm</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>

                <details className="sm:col-span-2 border border-white/10 p-3">
                  <summary className="cursor-pointer text-xs text-gray-400">Nâng cao · ID hệ thống và URL SEO</summary>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-500">ID hệ thống (độc nhất)</label>
                  <input
                    type="text"
                    required
                    value={productForm.id}
                    readOnly={Boolean(editingProduct)}
                    onChange={(e) => setProductForm(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-gray-400 px-3.5 py-2.5 text-xs focus:outline-none font-mono read-only:cursor-not-allowed read-only:opacity-60"
                  />
                  <p className="text-[10px] text-gray-600">Mã kỹ thuật dùng bởi Firebase; không cần dùng để đặt tên ảnh và không thể đổi sau khi tạo.</p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Slug URL SEO</label>
                    <button
                      type="button"
                      onClick={() => setProductForm(prev => ({ ...prev, slug: slugifyProductText(`${prev.name || ""}-${prev.id || ""}`) }))}
                      className="text-[9px] font-display font-bold uppercase tracking-wider text-gold-light hover:text-white"
                    >
                      Tự tạo slug
                    </button>
                  </div>
                  <input
                    type="text"
                    value={productForm.slug || ""}
                    onChange={(e) => setProductForm(prev => ({ ...prev, slug: slugifyProductText(e.target.value) }))}
                    placeholder="tu-dong-tao-tu-ten-va-id-neu-de-trong"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-500">
                    URL: /san-pham/{productForm.slug || slugifyProductText(`${productForm.name || ""}-${productForm.id || ""}`) || "slug-san-pham"}
                  </p>
                </div>
                  </div>
                </details>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Kích thước / quy mô</label>
                  <input
                    type="text"
                    value={productForm.voltage}
                    onChange={(e) => setProductForm(prev => ({ ...prev, voltage: e.target.value }))}
                    placeholder="VD: 12 cm, 15 cm, 20 cm"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-600">Có thể để trống hoặc nhập nhiều kích thước cách nhau bằng dấu phẩy.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Màu sắc cho khách chọn</label>
                  <input
                    type="text"
                    value={productColorsDraft}
                    onChange={(e) => setProductColorsDraft(e.target.value)}
                    placeholder="VD: Trắng, Đen, Vàng, Xanh"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-600">Nhập các màu cách nhau bằng dấu phẩy. Khách phải chọn màu trước khi đặt hàng.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Hình thức thực hiện</label>
                  <select
                    aria-label="Hình thức thực hiện"
                    value={isCustomFulfillment ? "__custom__" : productForm.capacity || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIsCustomFulfillment(value === "__custom__");
                      setProductForm(prev => ({ ...prev, capacity: value === "__custom__" ? "" : value }));
                    }}
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="">Không chọn (không bắt buộc)</option>
                    {fulfillmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    <option value="__custom__">Khác — tự nhập</option>
                  </select>
                  {isCustomFulfillment && (
                    <input
                      type="text"
                      aria-label="Hình thức thực hiện tự nhập"
                      value={productForm.capacity || ""}
                      onChange={(e) => setProductForm(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="Nhập hình thức thực hiện của sản phẩm"
                      className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                    />
                  )}
                  <p className="text-[10px] text-gray-600">Chọn gợi ý, tự nhập nội dung khác hoặc để trống nếu không áp dụng.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Ghi chú sản phẩm khi đặt hàng</label>
                  <textarea
                    rows={1}
                    value={productForm.orderNote || ""}
                    onChange={(e) => setProductForm(prev => ({ ...prev, orderNote: e.target.value }))}
                    placeholder="VD: Màu sắc thực tế có thể chênh lệch nhẹ; xưởng sẽ liên hệ xác nhận trước khi in."
                    className="w-full resize-y bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Giá bán</label>
                  <PriceInput
                    value={productForm.price}
                    onValueChange={(value) => setProductForm(prev => ({ ...prev, price: value }))}
                    placeholder="VD: 600000 hoặc 600.000đ"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-500">Tự thêm dấu nghìn. Nhập 2 hoặc 35 để chọn nhanh mức giá.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Giá giảm (nếu có)</label>
                  <PriceInput
                    value={productForm.salePrice}
                    onValueChange={(value) => setProductForm(prev => ({ ...prev, salePrice: value }))}
                    placeholder="VD: 550000 hoặc 550.000đ"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Danh mục sản phẩm (Category)</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value, subCategory: "" }))}
                    className="w-full bg-black border border-[#1A1A1A] text-xs px-3.5 py-2.5 text-[#ECECEC] focus:outline-none uppercase font-bold"
                  >
                    <option value="">CHỌN DANH MỤC</option>
                    {productCategories
                      .filter((category) => !category.hidden)
                      .map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 border border-gold-dark/20 bg-[#080808] p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[11px] font-display font-black uppercase tracking-widest text-[#F5C45A]">Phân loại sản phẩm</h3>
                      <p className="mt-1 text-[10px] text-gray-500">Nếu giá riêng để trống, phân loại sẽ dùng giá của sản phẩm chính. Ảnh riêng sẽ hiện khi khách chọn phân loại.</p>
                      <p className="mt-1 text-[10px] text-gray-500">“Chọn sẵn” là phân loại hiện đầu tiên khi khách mở sản phẩm, với giá và ảnh tương ứng. Khách vẫn có thể đổi phân loại.</p>
                      <p className="mt-1 text-[10px] text-gray-500">“Lưu mẫu trên máy” giữ tên và kích thước cho sản phẩm mới trên trình duyệt này, không giữ giá, tồn kho hoặc ảnh. Bỏ tích để không dùng lại.</p>
                    </div>
                    <button type="button" onClick={handleAddVariant} className="inline-flex items-center gap-1.5 border border-gold-dark/40 px-3 py-2 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light hover:border-gold-light hover:text-white">
                      <Plus className="w-3.5 h-3.5" />
                      Thêm phân loại
                    </button>
                  </div>
                  {(productForm.variants || []).length > 0 ? (
                    <div className="space-y-3">
                      {(productForm.variants || []).map((variant, index) => (
                        <details key={variant.id || index} className="border border-white/10 bg-black/70 p-3 space-y-3">
                          <summary className="cursor-pointer text-xs text-gold-light">{variant.name || `Phân loại ${index + 1}`} · {variant.size || 'Chưa có kích thước'} · {variant.salePrice || variant.price || 'Giá chung'} — mở / thu gọn</summary>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">Phân loại {index + 1}</span>
                            <div className="flex items-center gap-3">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] text-gray-300">
                                <input type="checkbox" checked={Boolean(variantTemplates[variant.id])} onChange={(e) => handleRememberVariant(variant, e.target.checked)} className="h-3.5 w-3.5 accent-gold-dark" />
                                Lưu mẫu trên máy
                              </label>
                              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-display font-bold uppercase tracking-wider text-gold-light">
                                <input
                                  type="radio"
                                  name="default-product-variant"
                                  checked={productForm.defaultVariantId === variant.id}
                                  onChange={() => setProductForm(prev => ({ ...prev, defaultVariantId: variant.id }))}
                                  className="h-3.5 w-3.5 accent-gold-dark"
                                />
                                Chọn sẵn
                              </label>
                              <button type="button" onClick={() => handleRemoveVariant(index)} className="p-1.5 text-gray-500 hover:text-red-400" aria-label="Xóa phân loại">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2 flex flex-col gap-2">
                              <select aria-label={`Chọn tên phân loại ${index + 1}`} value={variantNameOptions.includes(variant.name || '') ? variant.name : ''} onChange={(e) => handleUpdateVariant(index, { name: e.target.value })} className="w-full bg-[#050505] border border-[#1A1A1A] text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none focus:border-gold-light">
                                <option value="">Tự nhập tên phân loại</option>
                                {variantNameOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                              </select>
                              <input aria-label={`Tên phân loại ${index + 1}`} type="text" value={variant.name || ""} onChange={(e) => handleUpdateVariant(index, { name: e.target.value })} placeholder="Tên phân loại (có thể tự sửa)" className="w-full bg-[#050505] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none" />
                            </div>
                            <PriceInput aria-label={`Giá phân loại ${index + 1}`} value={variant.price || ""} onValueChange={(value) => handleUpdateVariant(index, { price: value })} placeholder={productForm.price || "Giá riêng"} className="w-full bg-[#050505] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none" />
                            <PriceInput aria-label={`Giá giảm phân loại ${index + 1}`} value={variant.salePrice || ""} onValueChange={(value) => handleUpdateVariant(index, { salePrice: value })} placeholder={productForm.salePrice || "Giá giảm riêng"} className="w-full bg-[#050505] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none" />
                            <input type="number" min="0" value={variant.stockQuantity || ""} onChange={(e) => handleUpdateVariant(index, { stockQuantity: e.target.value })} placeholder="Số tồn" className="w-full bg-[#050505] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none" />
                            <input aria-label={`URL ảnh phân loại ${index + 1}`} type="text" value={variant.image || ""} onChange={(e) => handleUpdateVariant(index, { image: e.target.value })} placeholder="Ảnh riêng (không bắt buộc)" className="md:col-span-3 w-full bg-[#050505] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none font-mono" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <label className={`inline-flex items-center gap-1.5 border border-gold-dark/40 px-3 py-2 text-gold-light ${uploadingImageTarget ? 'opacity-50' : 'cursor-pointer hover:border-gold-light'}`}>
                              {uploadingImageTarget === `variant-image:${variant.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                              {uploadingImageTarget === `variant-image:${variant.id}` ? 'Đang tải...' : 'Tải ảnh từ máy'}
                              <input type="file" accept="image/*" className="hidden" disabled={Boolean(uploadingImageTarget)} onChange={(e) => { handleCloudinaryUpload(e.target.files, `variant-image:${variant.id}`); e.target.value = ''; }} />
                            </label>
                            <button type="button" aria-expanded={variantImagePickerId === variant.id} onClick={() => setVariantImagePickerId(current => current === variant.id ? null : variant.id)} className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-2 text-gray-300 hover:text-gold-light"><ImageIcon className="h-3.5 w-3.5" />Chọn ảnh sản phẩm</button>
                            {variant.image && <button type="button" onClick={() => handleUpdateVariant(index, { image: '' })} className="px-2 py-2 text-gray-400 hover:text-red-400">Bỏ ảnh riêng</button>}
                            <span className="text-gray-500">Để trống sẽ dùng ảnh chung của sản phẩm.</span>
                          </div>
                          {variantImagePickerId === variant.id && (
                            <div className="flex flex-wrap gap-2 border border-white/10 p-2">
                              {Array.from(new Set([productForm.image, ...(productForm.images || [])].filter((url): url is string => Boolean(url?.trim())))).map((url, imageIndex) => (
                                <button key={url} type="button" aria-label={`Chọn ảnh sản phẩm ${imageIndex + 1} cho phân loại ${index + 1}`} aria-pressed={variant.image === url} onClick={() => { handleUpdateVariant(index, { image: url }); setVariantImagePickerId(null); }} className={`h-16 w-16 border p-1 hover:border-gold-light ${variant.image === url ? 'border-gold-light' : 'border-white/15'}`}>
                                  <img src={url} alt={`Ảnh sản phẩm ${imageIndex + 1}`} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                </button>
                              ))}
                              {!productForm.image && !productForm.images?.length && <p className="text-[10px] text-gray-500">Chưa có ảnh sản phẩm. Tải bộ ảnh trong mục ảnh sản phẩm trước, hoặc tải ảnh riêng từ máy.</p>}
                            </div>
                          )}
                          <label className="block space-y-1 text-[10px] text-gray-400">
                            <span>Kích thước riêng của phân loại</span>
                            <input type="text" value={variant.size || ""} onChange={(e) => handleUpdateVariant(index, { size: e.target.value })} placeholder="VD: Cao 16 cm hoặc 15 × 10 × 20 cm" className="w-full bg-[#050505] border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none" />
                            <span className="block text-[9px] text-gray-500">Một kích thước cố định. Chọn phân loại này sẽ tự áp dụng kích thước trên, không cho chọn kích thước khác. Để trống để dùng lựa chọn chung.</span>
                          </label>
                          {variant.image && (
                            <div className="h-20 w-24 border border-white/10 bg-[#050505] p-1.5">
                              <img src={variant.image} alt={variant.name || ""} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/10 bg-black/40 px-4 py-5 text-[10px] text-gray-500">Chưa có phân loại. Sản phẩm sẽ hiện một giá và một ảnh đại diện như hiện tại.</div>
                  )}
                </div>


                {activeProductSubCategories.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Danh mục con</label>
                    <select
                      value={productForm.subCategory || ""}
                      onChange={(e) => setProductForm(prev => ({ ...prev, subCategory: e.target.value }))}
                      className="w-full bg-black border border-[#1A1A1A] text-xs px-3.5 py-2.5 text-[#ECECEC] focus:outline-none uppercase font-bold"
                    >
                      <option value="">KHÔNG CHỌN</option>
                      {activeProductSubCategories.map((child) => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Vật liệu</label>
                  <input
                    type="text"
                    value={productForm.cellType}
                    onChange={(e) => setProductForm(prev => ({ ...prev, cellType: e.target.value }))}
                    placeholder="VD: PLA / PETG / Resin"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Bảo hành</label>
                  <input
                    type="text"
                    value={productForm.warranty}
                    onChange={(e) => setProductForm(prev => ({ ...prev, warranty: e.target.value }))}
                    placeholder="VD: 24 tháng"
                    className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-3.5 py-2.5 text-xs focus:outline-none"
                  />
                </div>


                <label className="col-span-1 sm:col-span-2 flex items-center justify-between gap-4 border border-[#1A1A1A] bg-black/70 px-4 py-3 cursor-pointer">
                  <div className="space-y-1">
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-[#ECECEC]">
                      Đưa sản phẩm lên website
                    </span>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Bật để khách hàng nhìn thấy sản phẩm. Tắt để lưu bản nháp chỉ trong trang quản trị.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!Boolean(productForm.hidden)}
                    onChange={(e) => setProductForm(prev => ({ ...prev, hidden: !e.target.checked }))}
                    className="w-4 h-4 accent-gold-dark"
                  />
                </label>

                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-[#F5C45A]">Đường dẫn ảnh Đại diện chính</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      onMouseDown={(event) => event.preventDefault()}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-bold uppercase tracking-widest border cursor-pointer transition-colors ${uploadingImageTarget === "main" ? "border-gold-light text-gold-light" : "border-gold-dark/40 text-gold-light hover:border-gold-light"}`}
                    >
                      {uploadingImageTarget === "main" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingImageTarget === "main" ? "Đang tải..." : "Tải ảnh từ máy"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={Boolean(uploadingImageTarget)}
                        onChange={(e) => {
                          handleCloudinaryUpload(e.target.files, "main");
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {!isCloudinaryConfigured() && (
                      <span className="text-[10px] text-amber-400">Chưa cấu hình Cloudinary</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full bg-black border border-[#1A1A1A] text-xs px-3.5 py-2.5 text-[#ECECEC] focus:outline-none font-mono"
                  />
                  {productForm.image && (
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-24 h-20 bg-black border border-white/10 flex items-center justify-center p-1.5">
                        <img src={productForm.image} alt="Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertImageUrlToDescription(productForm.image || "", productForm.name || "Ảnh sản phẩm")}
                        className="border border-white/15 px-3 py-2 text-[10px] font-display font-bold uppercase tracking-widest text-gray-300 hover:border-gold-light hover:text-gold-light transition-colors"
                      >
                        Chèn ảnh này vào mô tả
                      </button>
                      <button type="button" disabled={Boolean(uploadingImageTarget)} onClick={() => setProductForm(prev => ({ ...prev, ...removeProductImage(prev.image, prev.images, prev.image || '') }))} className="border border-red-900/50 px-3 py-2 text-xs text-red-300 disabled:opacity-40">Xóa ảnh đại diện</button>
                    </div>
                  )}
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">Đường dẫn ảnh bổ sung (mỗi đường dẫn ảnh đặt trên một dòng)</label>
                  <label
                    onMouseDown={(event) => event.preventDefault()}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-bold uppercase tracking-widest border cursor-pointer transition-colors ${uploadingImageTarget === "gallery" ? "border-gold-light text-gold-light" : "border-white/15 text-gray-300 hover:border-gold-light hover:text-gold-light"}`}
                  >
                    {uploadingImageTarget === "gallery" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{uploadingImageTarget === "gallery" ? "Đang tải..." : "Tải ảnh bổ sung"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={Boolean(uploadingImageTarget)}
                      onChange={(e) => {
                        handleCloudinaryUpload(e.target.files, "gallery");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <textarea
  rows={4}
  placeholder={"https://example.com/image2.jpg\nhttps://example.com/image3.jpg"}
  value={(productForm.images || []).join("\n")}
  onChange={(e) => {
    const lines = e.target.value.split(/\r?\n/).map((line) => line.trim());
    setProductForm(prev => ({ ...prev, images: lines }));
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") e.stopPropagation();
  }}
  className="w-full bg-black border border-[#1A1A1A] text-xs px-3.5 py-2.5 text-[#ECECEC] focus:outline-none font-mono placeholder:text-gray-700 leading-relaxed resize-y"
/>
                  {galleryImageUrls.length > 0 && (
  <div className="flex flex-wrap gap-3">
    {galleryImageUrls.map((imageUrl, index) => (
                        <div key={`${imageUrl}-${index}`} className="space-y-2">
                          <div className="w-20 h-16 bg-black border border-white/10 flex items-center justify-center p-1.5">
                            <img src={imageUrl} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => insertImageUrlToDescription(imageUrl, `${productForm.name || "Ảnh sản phẩm"} ${index + 1}`)}
                            className="block w-20 border border-white/10 px-1.5 py-1 text-[8.5px] font-display font-bold uppercase tracking-wider text-gray-400 hover:border-gold-light hover:text-gold-light"
                          >
                            Chèn
                          </button>
                          <button type="button" disabled={Boolean(uploadingImageTarget)} onClick={() => setProductForm(prev => ({ ...prev, ...selectProductCover(prev.image, prev.images, imageUrl) }))} className="block w-20 border border-gold-dark/40 py-1 text-[9px] text-gold-light disabled:opacity-40">Chọn đại diện</button>
                          <button type="button" disabled={Boolean(uploadingImageTarget)} onClick={() => setProductForm(prev => ({ ...prev, ...removeProductImage(prev.image, prev.images, imageUrl) }))} className="block w-20 border border-red-900/50 py-1 text-[9px] text-red-300 disabled:opacity-40">Xóa ảnh</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" disabled={Boolean(uploadingImageTarget) || !quickInsertImages.length} onMouseDown={event => event.preventDefault()} onClick={appendAllImagesToDescription} className="border border-gold-dark/40 text-gold-light px-3 py-2 text-xs disabled:opacity-40">Chèn bộ ảnh vào cuối mô tả</button>
                  <p className="text-[10px] text-gray-500">Chọn ảnh bất kỳ làm đại diện: ảnh đại diện cũ được giữ trong ảnh bổ sung. Xóa ảnh chỉ gỡ khỏi bộ ảnh, không xóa file Cloudinary hay ảnh đã chèn trong mô tả. Bấm Lưu sản phẩm để áp dụng.</p>
                </div>

                {/* Dynamic specs builder */}
                <div className="col-span-1 sm:col-span-2 border border-[#1A1A1A] p-4 bg-black/50 space-y-3">
                  <p className="text-[10px] text-gray-500">
                    Dán bảng 2 cột hoặc các dòng “Tên thông số: Giá trị” vào một trong hai ô để nhập hàng loạt. Có thể có dấu đầu dòng. Dòng không có giá trị sẽ bỏ qua.
                  </p>
                  <span className="text-[9px] font-display font-extrabold uppercase tracking-widest text-[#F5C45A] block leading-none">Thông số kỹ thuật đi kèm</span>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Ten thong so (Vd: Dong xa lien tuc)"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      onPaste={handleSpecsPaste}
                      className="flex-1 bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Gia tri (Vd: 35A)"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      onPaste={handleSpecsPaste}
                      className="flex-1 bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpecItem}
                      className="bg-gold-dark/20 hover:bg-gold-dark text-gold-light hover:text-black border border-gold-dark/30 text-xs font-display font-black tracking-widest uppercase transition-all px-4 py-2 cursor-pointer"
                    >
                      Them thong so
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {visibleSpecEntries.length > 0 ? visibleSpecEntries.map(([key, value]) => (
                      <div key={key} className="grid grid-cols-1 sm:grid-cols-[220px_1fr_auto] items-center gap-2 bg-black/80 px-3 py-2 text-xs text-gray-300 border border-[#1D1D1D]">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{key}:</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleUpdateSpecValue(key, e.target.value)}
                          placeholder="Nhap gia tri"
                          className="w-full bg-[#050505] border border-[#1A1A1A] text-xs px-3 py-2 text-[#ECECEC] placeholder:text-gray-700 focus:outline-none focus:border-gold-light"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecItem(key)}
                          className="justify-self-end text-red-400 hover:text-red-500 text-[10px] uppercase font-bold"
                        >
                          Xóa
                        </button>
                      </div>
                    )) : (
                      <p className="border border-dashed border-white/10 bg-black/40 px-3 py-3 text-[10px] text-gray-500">
                        Chưa có thông số nào có giá trị. Khi cần thêm, nhập tên thông số và giá trị ở phía trên.
                      </p>
                    )}
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">
                    Video sản phẩm (YouTube, Instagram, Facebook hoặc link video, mỗi link một dòng)
                  </label>
                  <textarea
                    rows={3}
                    placeholder={"https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/reel/.../\nhttps://www.facebook.com/reel/...\nhttps://example.com/video.mp4"}
                    value={(productForm.videoUrls || []).join("\n")}
                    onChange={(e) => {
                      const lines = e.target.value.split(/\r?\n/).map((line) => line.trim());
                      setProductForm(prev => ({ ...prev, videoUrls: lines }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    className="w-full bg-black border border-[#1A1A1A] text-xs px-3.5 py-2.5 text-[#ECECEC] focus:outline-none font-mono placeholder:text-gray-700 leading-relaxed resize-y"
                  />
                  <p className="text-[10px] text-gray-500">
                    Hỗ trợ YouTube/Shorts, Instagram Post/Reel, Facebook Reel/Video công khai, link .mp4, .webm, .ogg.
                  </p>
                  {productVideoEmbeds.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {productVideoEmbeds.map((video, index) => video && (
                        <div key={`${video.originalUrl}-${index}`} className="border border-white/10 bg-black p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-[9px] font-display font-bold uppercase tracking-widest text-gold-light">
                              {video.provider === "youtube" ? "YouTube" : video.provider === "instagram" ? "Instagram" : video.provider === "facebook" ? "Facebook" : video.provider === "direct" ? "Video file" : "Link ngoài"}
                            </span>
                            <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] uppercase tracking-wider text-gray-500 hover:text-gold-light">
                              Mở link
                            </a>
                          </div>
                          {video.embedUrl ? (
                            <iframe
                              src={video.embedUrl}
                              title={`Video sản phẩm ${index + 1}`}
                              className={`${video.provider === "instagram" || /facebook\.com\/reel\//i.test(video.originalUrl) ? "mx-auto aspect-[9/16] max-w-sm" : "aspect-video"} w-full border border-white/10 bg-[#050505]`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          ) : video.directUrl ? (
                            <video controls src={video.directUrl} className="aspect-video w-full border border-white/10 bg-[#050505]" />
                          ) : (
                            <div className="flex aspect-video items-center justify-center border border-white/10 bg-[#050505] px-4 text-center text-[11px] text-gray-500">
                              Link này không hỗ trợ nhúng trực tiếp. Người dùng sẽ mở video bằng nút liên kết.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <div className="sticky top-0 z-30 border-b border-[#1A1A1A] bg-[#0A0A0A]/95 pb-2 pt-1 backdrop-blur">
                  <div className="flex items-center justify-between pb-1">
                    <label className="text-[9px] font-display font-extrabold uppercase tracking-widest text-gray-400">
                      Mô tả chi tiết và Trình soạn thảo
                    </label>
                    <div className="flex items-center gap-1.5 bg-black p-0.5 border border-[#111]">
                      <button
                        type="button"
                        onClick={() => setIsToolbarPreviewMode(false)}
                        className={`text-[9.5px] font-display font-bold uppercase py-1 px-2.5 tracking-wider transition-colors cursor-pointer ${!isToolbarPreviewMode ? "gold-gradient-bg text-black font-black" : "text-gray-400 hover:text-white"}`}
                      >
                        Soạn thảo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          syncDescriptionFromEditor(true);
                          setIsToolbarPreviewMode(true);
                        }}
                        className={`text-[9.5px] font-display font-bold uppercase py-1 px-2.5 tracking-wider transition-colors cursor-pointer ${isToolbarPreviewMode ? "gold-gradient-bg text-black font-black" : "text-gray-400 hover:text-white"}`}
                      >
                        Xem trước
                      </button>
                    </div>
                  </div>

                  {/* Toolbar Row (only visible in write mode) */}
                  {!isToolbarPreviewMode && (
                    <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#0D0D0D] border border-[#1A1A1A] select-none rounded-md">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("undo")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Hoàn tác"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("redo")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Làm lại"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-white/10 mx-1" />

                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("bold")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="In đậm (Bold)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("italic")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="In nghiêng (Italic)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="w-[1px] h-4 bg-white/10 mx-1" />

                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("heading")}
                        className="px-1.5 py-0.5 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer text-[10px] font-display font-black leading-none uppercase border border-white/5"
                        title="Thêm tiêu đề phụ"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("bullet")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Gạch đầu dòng (List)"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-white/10 mx-1" />

                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("align-left")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Căn lề trái"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("align-center")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Căn lề giữa"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("align-right")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Căn lề phải"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>

                      <button
  type="button"
  onMouseDown={(event) => event.preventDefault()}
  onClick={() => insertFormatting("align-justify")}
  className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
  title="Căn đều 2 bên"
>
  <AlignJustify className="w-3.5 h-3.5" />
</button>

                      <div className="w-[1px] h-4 bg-white/10 mx-1" />

                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setIsQuickImagePanelOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-1 px-1.5 py-1 text-[9px] font-display font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          isQuickImagePanelOpen ? "bg-gold-dark text-black" : "text-gray-400 hover:bg-gold-dark/20 hover:text-gold-light"
                        }`}
                        title="Mo khay anh co san de chen vao mo ta"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Anh co san
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("image")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Chèn ảnh sinh động dạng URL"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <label
                        onMouseDown={(event) => event.preventDefault()}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Tải ảnh và chèn vào mô tả"
                      >
                        {uploadingImageTarget === "description" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={Boolean(uploadingImageTarget)}
                          onChange={(e) => {
                            handleCloudinaryUpload(e.target.files, "description");
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertFormatting("link")}
                        className="p-1 hover:bg-gold-dark/20 text-gray-400 hover:text-gold-light transition-colors cursor-pointer"
                        title="Chèn liên kết"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {!isToolbarPreviewMode && isQuickImagePanelOpen && (
                    <div className="mt-2 border border-gold-dark/25 bg-black/95 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                      {quickInsertImages.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {quickInsertImages.map((imageUrl, index) => (
                            <div key={`${imageUrl}-${index}`} className="w-24 shrink-0 space-y-2">
                              <div className="h-20 w-24 border border-white/10 bg-[#080808] p-1.5">
                                <img src={imageUrl} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => insertImageUrlToDescription(imageUrl, `${productForm.name || "Ảnh sản phẩm"} ${index + 1}`)}
                                className="w-full border border-white/10 px-2 py-1.5 text-[8.5px] font-display font-bold uppercase tracking-wider text-gray-300 transition-colors hover:border-gold-light hover:text-gold-light"
                              >
                                Chèn
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500">
                          Chưa có ảnh đại diện hoặc ảnh bổ sung để chèn nhanh.
                        </p>
                      )}
                    </div>
                  )}
                  </div>

                  {isToolbarPreviewMode ? (
                    <div 
                      className="product-description-content w-full bg-black border border-[#1A1A1A] p-4 text-xs leading-relaxed min-h-[260px] text-gray-300 rounded-md font-sans"
                      dangerouslySetInnerHTML={{ __html: formatDescriptionToHtml(productForm.description) }}
                    />
                  ) : (
                    <div
                      key={`${productForm.id || "new"}-${isProductModalOpen ? "open" : "closed"}`}
                      ref={mountDescriptionEditor}
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Nhap hoac dan mo ta tu Word/Excel vao day..."
                      onInput={normalizeDescriptionEditorAfterInput}
                      onKeyDown={handleDescriptionEditorKeyDown}
                      onKeyUp={rememberDescriptionSelection}
                      onMouseUp={rememberDescriptionSelection}
                      onTouchEnd={rememberDescriptionSelection}
                      onPaste={handleDescriptionPaste}
                      title="Trình soạn thảo mô tả sản phẩm"
                      onBlur={() => { rememberDescriptionSelection(); syncDescriptionFromEditor(true); }}
                      className="product-description-content w-full bg-black border border-[#1A1A1A] text-xs px-3.5 py-2.5 text-[#ECECEC] focus:outline-none focus:border-gold-light leading-relaxed font-sans min-h-[260px]"
                    />
                  )}

                  {descriptionImages.length > 0 && (
                    <div className="border border-[#1A1A1A] bg-black/60 p-3 space-y-3">
                      <div className="text-[9px] font-display font-extrabold uppercase tracking-widest text-[#F5C45A]">
                        Ảnh trong mô tả
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {descriptionImages.map((image, index) => (
                          <div key={`${image.url}-${index}`} className="grid grid-cols-[88px_1fr_auto] gap-3 items-center border border-white/10 bg-black p-2">
                            <div className="w-20 h-16 border border-white/10 bg-[#080808] flex items-center justify-center p-1">
                              <img src={image.url} alt={image.alt} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <input
                              type="text"
                              value={image.url}
                              onChange={(e) => handleUpdateDescriptionImage(index, e.target.value)}
                              className="min-w-0 bg-[#050505] border border-[#1A1A1A] text-[11px] px-3 py-2 text-[#ECECEC] focus:outline-none focus:border-gold-light font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveDescriptionImage(index)}
                              className="px-3 py-2 text-[10px] font-display font-bold uppercase tracking-wider text-red-400 hover:text-white hover:bg-red-500/80 transition-colors"
                            >
                              Xóa
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Form triggers */}
              <div className="hidden">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-3 border border-white/5 text-xs font-display text-gray-400 font-bold tracking-widest uppercase hover:text-white transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="gold-gradient-bg text-black font-display font-bold py-3 px-6 text-xs tracking-widest uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Lưu sản phẩm
                </button>
              </div>

            </form>

            <div className="shrink-0 border-t border-[#1A1A1A] bg-[#080808]/95 px-4 py-3 sm:px-6 sm:py-4 shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-5 py-3 border border-white/5 text-xs font-display text-gray-400 font-bold tracking-widest uppercase hover:text-white transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="product-admin-form"
                className="gold-gradient-bg text-black font-display font-bold py-3 px-6 text-xs tracking-widest uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Lưu sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
