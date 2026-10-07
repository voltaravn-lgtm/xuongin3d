"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Download, Eraser, ImagePlus, Layers, Loader2, Maximize2, Move, Palette, Save, Trash2, Upload } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import LoadAdminCatalogueButton from '../../../../components/Admin/LoadAdminCatalogueButton';
import { isCloudinaryConfigured, uploadImageToCloudinary } from "../../../../lib/cloudinary";
import { revalidateProductCache } from "../../../../lib/productCacheClient";
import { drawWatermark, type WatermarkOptions } from "../../../../lib/watermark";

type ExportSize = "original" | 800 | 1000 | 1200;
type BackgroundMode = "white" | "transparent" | "custom";
type ProductPublishMode = "filename-bulk" | "gallery-by-filename" | "primary-bulk" | "replace-all" | "append-gallery";

interface ImageAsset {
  file: File;
  url: string;
  width: number;
  height: number;
}

interface ProductItem extends ImageAsset {
  id: string;
  scale: number;
  offset: { x: number; y: number };
}

interface WritableFileStreamLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileHandleLike {
  createWritable(): Promise<WritableFileStreamLike>;
}

interface DirectoryHandleLike {
  name: string;
  getFileHandle(name: string, options: { create: true }): Promise<FileHandleLike>;
}

interface FilePickerWindow extends Window {
  showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
}

const PREVIEW_CANVAS_SIZE = 800;
const PRODUCT_UPLOAD_WEBP_QUALITY = 0.7;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function classNames(...items: Array<string | false | undefined>) {
  return items.filter(Boolean).join(" ");
}

function getBaseName(fileName: string) {
  return (
    fileName
      // Bỏ đuôi file nếu có
      .replace(/\.[^/.]+$/, "")

      // Tách dấu tiếng Việt
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

      // Xử lý riêng chữ đ/Đ
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")

      // Đưa về chữ thường
      .toLowerCase()

      // Ký tự không phải chữ/số thì đổi thành dấu -
      .replace(/[^a-z0-9]+/g, "-")

      // Gộp nhiều dấu - thành một
      .replace(/-+/g, "-")

      // Xóa dấu - ở đầu/cuối
      .replace(/^-|-$/g, "")
  ) || "promo";
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function getCrc32(bytes: Uint8Array) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function getZipDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

async function createZipArchive(files: Array<{ name: string; blob: Blob }>) {
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  const { time, date } = getZipDateTime();
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = getCrc32(data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034B50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, nameBytes.byteLength, true);
    localView.setUint16(28, 0, true);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014B50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, nameBytes.byteLength, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);

    localParts.push(localHeader as BlobPart, nameBytes as BlobPart, data as BlobPart);
    centralParts.push(centralHeader as BlobPart, nameBytes as BlobPart);
    localOffset += localHeader.byteLength + nameBytes.byteLength + data.byteLength;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + (part as Uint8Array).byteLength, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  endView.setUint32(0, 0x06054B50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, endHeader as BlobPart], { type: "application/zip" });
}

export default function PromoOverlayPage(): React.ReactElement {
  const {
    products: catalogProducts,
    updateProduct,
    promoOverlaySettings,
    updatePromoOverlaySettings,
    showToast,
  } = useApp();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<ImageAsset | null>(null);
  const [watermarkAsset, setWatermarkAsset] = useState<ImageAsset | null>(null);
  const [toolMode, setToolMode] = useState<'overlay' | 'watermark'>('overlay');
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({ position: 'bottom-right', size: 20, opacity: 70, margin: 3 });
  const [eventEnabled, setEventEnabled] = useState(promoOverlaySettings.enabled);
  const [eventEndDate, setEventEndDate] = useState(promoOverlaySettings.endDate || "");
  const [savingEventOverlay, setSavingEventOverlay] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [productDropActive, setProductDropActive] = useState(false);
  const [overlayDropActive, setOverlayDropActive] = useState(false);
  const [exportSize, setExportSize] = useState<ExportSize>(800);
  const [quality, setQuality] = useState<number>(82);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("white");
  const [customBackground, setCustomBackground] = useState("#ffffff");
  const [exportBaseName, setExportBaseName] = useState("may-khoan-qzj005");
  const [preserveOriginalNames, setPreserveOriginalNames] = useState(true);
  const [saveDirectoryHandle, setSaveDirectoryHandle] = useState<DirectoryHandleLike | null>(null);
  const [publishMode, setPublishMode] = useState<ProductPublishMode>("filename-bulk");
  const [bulkProductTargets, setBulkProductTargets] = useState<Record<string, string>>({});
  const [bulkProductQueries, setBulkProductQueries] = useState<Record<string, string>>({});
  const [replaceAllProductId, setReplaceAllProductId] = useState("");
  const [replaceAllProductQuery, setReplaceAllProductQuery] = useState("");
  const [publishingProducts, setPublishingProducts] = useState(false);
  const [publishProgress, setPublishProgress] = useState("");
  const dragState = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const productImgRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const overlayImgRef = useRef<HTMLImageElement | null>(null);
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);
  const productsRef = useRef<ProductItem[]>([]);
  const overlayRef = useRef<ImageAsset | null>(null);
  const watermarkAssetRef = useRef<ImageAsset | null>(null);
  watermarkAssetRef.current = watermarkAsset;

  const activeProduct = useMemo(() => products.find((item) => item.id === activeProductId) || products[0] || null, [activeProductId, products]);
  const activeProductIndex = activeProduct ? products.findIndex((item) => item.id === activeProduct.id) : -1;
  const unmatchedProductCount = products.filter((item) => !bulkProductTargets[item.id]).length;
  const replaceAllProduct = useMemo(
    () => catalogProducts.find((item) => item.id === replaceAllProductId),
    [catalogProducts, replaceAllProductId],
  );
  const previewOverlayUrl = toolMode === 'watermark' ? watermarkAsset?.url || '/images/logo-x3d.webp' : overlay?.url || promoOverlaySettings.imageUrl || "";
  const drawLayer = (ctx: CanvasRenderingContext2D, width: number, height = width) => {
    const image = overlayImgRef.current;
    if (!image) return;
    if (toolMode === 'watermark') drawWatermark(ctx, image, width, height, watermarkOptions);
    else ctx.drawImage(image, 0, 0, width, height);
  };

  useEffect(() => {
    setEventEnabled(promoOverlaySettings.enabled);
    setEventEndDate(promoOverlaySettings.endDate || "");
  }, [promoOverlaySettings.enabled, promoOverlaySettings.endDate]);

  const computeInitialFitScale = (imgW: number, imgH: number) => Math.min(PREVIEW_CANVAS_SIZE / imgW, PREVIEW_CANVAS_SIZE / imgH);

  const loadFileAsImage = (file: File): Promise<ImageAsset> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ file, url, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Không đọc được ảnh."));
      };
      img.src = url;
    });
  };

  const updateActiveProduct = (changes: Partial<Pick<ProductItem, "scale" | "offset">>) => {
    if (!activeProduct) return;
    setProducts((current) => current.map((item) => (item.id === activeProduct.id ? { ...item, ...changes } : item)));
  };

  const selectAdjacentProduct = (direction: -1 | 1) => {
    if (activeProductIndex < 0) return;
    const nextProduct = products[activeProductIndex + direction];
    if (nextProduct) setActiveProductId(nextProduct.id);
  };

  const resetFileInput = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height = width, preview = false) => {
    ctx.clearRect(0, 0, width, height);

    if (backgroundMode === "transparent") {
      if (!preview) return;
      const block = Math.min(width, height) / 20;
      for (let y = 0; y < height; y += block) {
        for (let x = 0; x < width; x += block) {
          ctx.fillStyle = (Math.floor(x / block) + Math.floor(y / block)) % 2 === 0 ? "#f7f7f7" : "#dedede";
          ctx.fillRect(x, y, block, block);
        }
      }
      return;
    }

    ctx.fillStyle = backgroundMode === "custom" ? customBackground : "#ffffff";
    ctx.fillRect(0, 0, width, height);
  };

  const drawProduct = (ctx: CanvasRenderingContext2D, product: ProductItem, img: HTMLImageElement, width: number, height = width) => {
    const base = Math.min(width / product.width, height / product.height);
    const displayScale = base * product.scale;
    const drawW = Math.round(product.width * displayScale);
    const drawH = Math.round(product.height * displayScale);
    const offsetX = product.offset.x * (width / PREVIEW_CANVAS_SIZE);
    const offsetY = product.offset.y * (height / PREVIEW_CANVAS_SIZE);
    const x = Math.round((width - drawW) / 2 + offsetX);
    const y = Math.round((height - drawH) / 2 + offsetY);
    ctx.drawImage(img, x, y, drawW, drawH);
  };

  const renderPreview = () => {
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    drawBackground(ctx, PREVIEW_CANVAS_SIZE, PREVIEW_CANVAS_SIZE, true);

    if (!activeProduct) {
      if (overlayImgRef.current) {
        drawLayer(ctx, PREVIEW_CANVAS_SIZE);
      }
      ctx.fillStyle = "#8A8A8A";
      ctx.font = "18px Inter, system-ui, Arial";
      ctx.textAlign = "center";
      ctx.fillText("Tải ảnh sản phẩm để bắt đầu", PREVIEW_CANVAS_SIZE / 2, PREVIEW_CANVAS_SIZE / 2);
      return;
    }

    const cachedProduct = productImgRefs.current.get(activeProduct.id);
    if (cachedProduct) {
      drawProduct(ctx, activeProduct, cachedProduct, PREVIEW_CANVAS_SIZE);
      drawLayer(ctx, PREVIEW_CANVAS_SIZE);
      return;
    }

    const img = new Image();
    img.src = activeProduct.url;
    img.onload = () => {
      productImgRefs.current.set(activeProduct.id, img);
      drawBackground(ctx, PREVIEW_CANVAS_SIZE, PREVIEW_CANVAS_SIZE, true);
      drawProduct(ctx, activeProduct, img, PREVIEW_CANVAS_SIZE);
      drawLayer(ctx, PREVIEW_CANVAS_SIZE);
    };
  };

  useEffect(() => {
    let cancelled = false;
    overlayImgRef.current = null;

    if (!previewOverlayUrl) {
      renderPreview();
      return undefined;
    }

    const img = new Image();
    if (/^https?:\/\//i.test(previewOverlayUrl)) img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      overlayImgRef.current = img;
      renderPreview();
    };
    img.onerror = () => {
      if (cancelled) return;
      overlayImgRef.current = null;
      renderPreview();
    };
    img.src = previewOverlayUrl;

    return () => {
      cancelled = true;
    };
  }, [previewOverlayUrl]);

  useEffect(() => {
    renderPreview();
  }, [activeProduct, previewOverlayUrl, backgroundMode, customBackground, toolMode, watermarkOptions]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    overlayRef.current = overlay;
  }, [overlay]);

  useEffect(() => {
    return () => {
      productsRef.current.forEach((product) => URL.revokeObjectURL(product.url));
      if (overlayRef.current) URL.revokeObjectURL(overlayRef.current.url);
      if (watermarkAssetRef.current) URL.revokeObjectURL(watermarkAssetRef.current.url);
    };
  }, []);

  const normalizeProductMatchKey = (value: string) => value
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  const normalizeProductBoundaryKey = (value: string) => value
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const findExactCatalogProducts = (value: string) => {
    const matchKey = normalizeProductMatchKey(value);
    if (!matchKey) return [];
    return catalogProducts.filter((product) =>
      [product.id, product.sku, product.barcode].some((code) => code && normalizeProductMatchKey(code) === matchKey)
    );
  };

  const getFileImagePosition = (fileName: string) => {
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    if (findExactCatalogProducts(baseName).length === 1) {
      return { productName: baseName, order: 0 };
    }
    const suffixMatch = baseName.match(/^(.*?)-(\d+)$/);
    if (suffixMatch) {
      return { productName: suffixMatch[1], order: Number(suffixMatch[2]) };
    }

    const baseBoundaryKey = normalizeProductBoundaryKey(baseName);
    const compactCandidates = catalogProducts.flatMap((product) =>
      [product.id, product.sku, product.barcode]
        .filter((code): code is string => Boolean(code))
        .map((code) => {
          const productBoundaryKey = normalizeProductBoundaryKey(code);
          const compactSuffix = baseBoundaryKey.startsWith(productBoundaryKey)
            ? baseBoundaryKey.slice(productBoundaryKey.length)
            : "";
          return { product, code, productBoundaryKey, compactSuffix };
        })
        .filter((candidate) => /^[1-9]\d?$/.test(candidate.compactSuffix))
    );
    if (compactCandidates.length) {
      const longestLength = Math.max(...compactCandidates.map((candidate) => candidate.productBoundaryKey.length));
      const longestCandidates = compactCandidates.filter((candidate) => candidate.productBoundaryKey.length === longestLength);
      const uniqueProductIds = new Set(longestCandidates.map((candidate) => candidate.product.id));
      if (uniqueProductIds.size === 1) {
        const candidate = longestCandidates[0];
        return { productName: candidate.code, order: Number(candidate.compactSuffix) };
      }
    }

    return {
      productName: baseName,
      order: 0,
    };
  };

  const getProductUploadFileName = (fileName: string) => `${fileName.replace(/\.[^/.]+$/, "") || "product"}.webp`;

  const findCatalogProductForFile = (fileName: string) => {
    const productName = getFileImagePosition(fileName).productName;
    const fileKey = normalizeProductMatchKey(productName);
    const fileBoundaryKey = normalizeProductBoundaryKey(productName);
    if (!fileKey) return undefined;
    const exactMatches = findExactCatalogProducts(fileKey);
    if (exactMatches.length === 1 || fileKey.length < 4) return exactMatches[0];
    if (exactMatches.length > 1) return undefined;

    const prefixMatches = catalogProducts.filter((product) =>
      [product.id, product.sku, product.barcode].some((value) => {
        if (!value) return false;
        const productBoundaryKey = normalizeProductBoundaryKey(value);
        return Boolean(productBoundaryKey) && (
          productBoundaryKey.startsWith(`${fileBoundaryKey}-`) ||
          fileBoundaryKey.startsWith(`${productBoundaryKey}-`)
        );
      })
    );
    return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
  };

  const rematchAllProductTargets = () => {
    const nextTargets: Record<string, string> = {};
    products.forEach((item) => {
      const matchedProduct = findCatalogProductForFile(item.file.name);
      if (matchedProduct) nextTargets[item.id] = matchedProduct.id;
    });
    setBulkProductTargets(nextTargets);
    setBulkProductQueries({});
    const matchedCount = Object.keys(nextTargets).length;
    showToast(`Đã nhận diện lại: ${matchedCount}/${products.length} ảnh khớp mã sản phẩm.`, matchedCount === products.length ? "success" : "warning");
  };

  const findCatalogProductByCode = (query: string) => {
    const queryKey = normalizeProductMatchKey(query);
    if (!queryKey) return undefined;
    const matches = catalogProducts.filter((product) =>
      [product.id, product.sku, product.barcode, product.name].some((value) => value && normalizeProductMatchKey(value) === queryKey)
    );
    return matches.length === 1 ? matches[0] : undefined;
  };

  const updateReplaceAllProductQuery = (query: string) => {
    setReplaceAllProductQuery(query);
    setReplaceAllProductId(findCatalogProductByCode(query)?.id || "");
  };

  const updateBulkProductQuery = (imageId: string, query: string) => {
    setBulkProductQueries((current) => ({ ...current, [imageId]: query }));
    const matchedProduct = findCatalogProductByCode(query);
    setBulkProductTargets((current) => {
      const next = { ...current };
      if (matchedProduct) next[imageId] = matchedProduct.id;
      else delete next[imageId];
      return next;
    });
  };

  const getBulkProductQueryValue = (imageId: string) => {
    if (bulkProductQueries[imageId] !== undefined) return bulkProductQueries[imageId];
    const selectedProduct = catalogProducts.find((product) => product.id === bulkProductTargets[imageId]);
    return selectedProduct?.sku || selectedProduct?.id || selectedProduct?.barcode || "";
  };

  const onProductFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files || []).filter((file) => /^image\/(png|jpeg|webp)$/.test(file.type));
    resetFileInput(productInputRef);
    if (!selectedFiles.length) return;

    try {
      const loadedProducts = await Promise.all(selectedFiles.map(async (file) => {
        const asset = await loadFileAsImage(file);
        return {
          ...asset,
          id: uid(),
          scale: 1,
          offset: { x: 0, y: 0 },
        };
      }));

      setProducts((current) => [...current, ...loadedProducts]);
      setActiveProductId((current) => current || loadedProducts[0]?.id || null);
      setBulkProductTargets((current) => {
        const next = { ...current };
        loadedProducts.forEach((item) => {
          const matchedProduct = findCatalogProductForFile(item.file.name);
          if (matchedProduct) next[item.id] = matchedProduct.id;
        });
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể thêm ảnh sản phẩm.";
      showToast(message, "error");
    }
  };

  const onOverlayFiles = async (files: FileList | null) => {
    const file = files?.[0];
    resetFileInput(overlayInputRef);
    if (!file || file.type !== "image/png") return;

    try {
      const asset = await loadFileAsImage(file);
      if (toolMode === 'watermark') {
        if (watermarkAsset) URL.revokeObjectURL(watermarkAsset.url);
        setWatermarkAsset(asset);
      } else {
        if (overlay) URL.revokeObjectURL(overlay.url);
        setOverlay(asset);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể thêm khung overlay.";
      showToast(message, "error");
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Không đọc được file overlay."));
      reader.readAsDataURL(file);
    });
  };

  const convertImageFileToWebp = (asset: ImageAsset, qualityValue = 0.86): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = asset.width;
        canvas.height = asset.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Không tạo được canvas để nén WebP."));
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Trình duyệt không thể xuất WebP."));
            return;
          }

          const webpName = asset.file.name.replace(/\.[^/.]+$/, "") + ".webp";
          resolve(new File([blob], webpName, { type: "image/webp" }));
        }, "image/webp", qualityValue);
      };
      img.onerror = () => reject(new Error("Không đọc được ảnh overlay để nén WebP."));
      img.src = asset.url;
    });
  };

  const saveEventOverlay = async () => {
    if (!overlay && !promoOverlaySettings.imageUrl) {
      showToast("Chọn khung overlay PNG trước khi bật sự kiện.", "warning");
      return;
    }

    setSavingEventOverlay(true);

    try {
      let imageUrl = promoOverlaySettings.imageUrl;
      let fileName = promoOverlaySettings.fileName || "";

      if (overlay) {
        const webpOverlay = await convertImageFileToWebp(overlay);
        imageUrl = isCloudinaryConfigured()
          ? await uploadImageToCloudinary(webpOverlay)
          : await fileToDataUrl(webpOverlay);
        fileName = webpOverlay.name;
      }

      const currentLibrary = promoOverlaySettings.library || [];
      const nextLibrary = imageUrl
        ? [
            {
              url: imageUrl,
              fileName: fileName || "promo-overlay.webp",
              createdAt: new Date().toISOString(),
            },
            ...currentLibrary.filter((item) => item.url !== imageUrl),
          ].slice(0, 24)
        : currentLibrary;

      await updatePromoOverlaySettings({
        enabled: eventEnabled,
        imageUrl,
        fileName,
        endDate: eventEndDate,
        library: nextLibrary,
      });
      showToast(eventEnabled ? "Đã lưu overlay sự kiện cho toàn bộ sản phẩm." : "Đã tắt overlay sự kiện.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể lưu overlay sự kiện.";
      showToast(message, "error");
    } finally {
      setSavingEventOverlay(false);
    }
  };

  const useLibraryOverlay = async (item: { url: string; fileName: string }) => {
    try {
      await updatePromoOverlaySettings({
        ...promoOverlaySettings,
        enabled: true,
        imageUrl: item.url,
        fileName: item.fileName,
        endDate: eventEndDate,
      });
      setEventEnabled(true);
      showToast("Đã chọn khung promo từ thư viện.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể chọn khung promo.";
      showToast(message, "error");
    }
  };

  const deleteLibraryOverlay = async (item: { url: string; fileName: string }) => {
    const confirmed = window.confirm("Xóa khung này khỏi thư viện promo? File gốc trên Cloudinary sẽ không bị xóa.");
    if (!confirmed) return;

    try {
      const nextLibrary = (promoOverlaySettings.library || []).filter((libraryItem) => libraryItem.url !== item.url);
      const isActiveOverlay = promoOverlaySettings.imageUrl === item.url;

      await updatePromoOverlaySettings({
        ...promoOverlaySettings,
        enabled: isActiveOverlay ? false : promoOverlaySettings.enabled,
        imageUrl: isActiveOverlay ? "" : promoOverlaySettings.imageUrl,
        fileName: isActiveOverlay ? "" : promoOverlaySettings.fileName,
        library: nextLibrary,
      });

      if (isActiveOverlay) {
        setEventEnabled(false);
      }

      showToast(isActiveOverlay ? "Đã xóa khung khỏi thư viện và tắt overlay đang dùng." : "Đã xóa khung khỏi thư viện promo.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xóa khung promo.";
      showToast(message, "error");
    }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!activeProduct) return;
    (event.target as Element).setPointerCapture(event.pointerId);
    setDragging(true);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: activeProduct.offset.x,
      startOffsetY: activeProduct.offset.y,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging || !dragState.current) return;
    updateActiveProduct({
      offset: {
        x: dragState.current.startOffsetX + event.clientX - dragState.current.startX,
        y: dragState.current.startOffsetY + event.clientY - dragState.current.startY,
      },
    });
  };

  const onPointerUp = () => {
    setDragging(false);
    dragState.current = null;
  };

  const generateExportCanvas = (size: ExportSize, product: ProductItem) => {
    if (toolMode === 'watermark' && !overlayImgRef.current) throw new Error('Logo watermark chưa tải xong hoặc không đọc được. Hãy chọn lại logo trước khi xuất/upload.');
    const width = size === "original" ? product.width : size;
    const height = size === "original" ? product.height : size;
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Không tạo được canvas.");

    drawBackground(ctx, width, height);

    const productImg = productImgRefs.current.get(product.id);
    if (productImg) drawProduct(ctx, product, productImg, width, height);
    drawLayer(ctx, width, height);

    return out;
  };

  const canvasToBlob = (canvas: HTMLCanvasElement, mime: string, qualityScalar: number | undefined) => {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Không thể tạo file ảnh để tải xuống."));
      }, mime, qualityScalar);
    });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const ensureProductImage = (product: ProductItem): Promise<HTMLImageElement> => {
    const cached = productImgRefs.current.get(product.id);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        productImgRefs.current.set(product.id, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = product.url;
    });
  };

  const selectSaveDirectory = async () => {
    const pickerWindow = window as FilePickerWindow;
    if (!pickerWindow.showDirectoryPicker) {
      showToast("Trình duyệt này không hỗ trợ chọn thư mục. Hãy dùng Chrome, Edge hoặc Cốc Cốc phiên bản mới.", "warning");
      return;
    }

    try {
      const directory = await pickerWindow.showDirectoryPicker();
      setSaveDirectoryHandle(directory);
      showToast(`Đã chọn thư mục: ${directory.name}`, "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "Không thể mở cửa sổ chọn thư mục.";
      showToast(message, "error");
    }
  };

  const downloadProducts = async (mime: "image/webp" | "image/png", all = false) => {
    const targets = all ? products : activeProduct ? [activeProduct] : [];
    if (!targets.length) return;

    const extension = mime === "image/webp" ? "webp" : "png";
    const cleanBaseName = getBaseName(exportBaseName || activeProduct?.file.name || "promo");
    const usedNames = new Map<string, number>();
    const filenames = targets.map((product, index) => {
      if (!preserveOriginalNames) {
        const fileIndex = all || targets.length > 1 ? `-${index + 1}` : "";
        return `${cleanBaseName}${fileIndex}.${extension}`;
      }

      const originalBaseName = product.file.name.replace(/\.[^/.]+$/, "") || "promo";
      const collisionKey = originalBaseName.toLocaleLowerCase();
      const occurrence = (usedNames.get(collisionKey) || 0) + 1;
      usedNames.set(collisionKey, occurrence);
      return `${originalBaseName}${occurrence > 1 ? `-${occurrence}` : ""}.${extension}`;
    });

    const directoryHandle = saveDirectoryHandle;

    try {
      await Promise.all(targets.map(ensureProductImage));
      const exportedFiles: Array<{ name: string; blob: Blob }> = [];

      for (let index = 0; index < targets.length; index += 1) {
        const blob = await canvasToBlob(
          generateExportCanvas(exportSize, targets[index]),
          mime,
          mime === "image/webp" ? quality / 100 : undefined,
        );

        if (directoryHandle) {
          const targetFile = await directoryHandle.getFileHandle(filenames[index], { create: true });
          const writable = await targetFile.createWritable();
          await writable.write(blob);
          await writable.close();
        } else if (all) {
          exportedFiles.push({ name: filenames[index], blob });
        } else {
          downloadBlob(blob, filenames[index]);
        }
      }

      if (directoryHandle) {
        showToast(`Đã lưu ${targets.length} ảnh.`, "success");
      } else if (all) {
        const zipBlob = await createZipArchive(exportedFiles);
        const today = new Date().toISOString().slice(0, 10);
        downloadBlob(zipBlob, `promo-overlay-${extension}-${today}.zip`);
        showToast(`Đã đóng gói đủ ${exportedFiles.length} ảnh vào một file ZIP.`, "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xuất ảnh.";
      showToast(message, "error");
    }
  };

  const createProcessedWebpFile = async (product: ProductItem) => {
    await ensureProductImage(product);
    const blob = await canvasToBlob(
      generateExportCanvas(exportSize, product),
      "image/webp",
      PRODUCT_UPLOAD_WEBP_QUALITY,
    );
    return new File([blob], getProductUploadFileName(product.file.name), { type: "image/webp" });
  };

  const finishProductPublishing = async (successMessage: string) => {
    setPublishProgress("Đang làm mới ảnh trên website...");
    const cacheRefreshed = await revalidateProductCache();
    showToast(
      cacheRefreshed
        ? `${successMessage} Cache website đã được làm mới.`
        : `${successMessage} Dữ liệu đã lưu nhưng chưa làm mới được cache; hãy tải lại website sau ít phút.`,
      cacheRefreshed ? "success" : "warning",
    );
  };

  const publishImagesToProducts = async () => {
    if (!products.length) {
      showToast("Chưa có ảnh đã xử lý để đăng.", "warning");
      return;
    }
    if (!isCloudinaryConfigured()) {
      showToast("Cloudinary chưa được cấu hình nên chưa thể đăng ảnh sản phẩm.", "error");
      return;
    }

    if (publishMode === 'append-gallery') {
      const target = catalogProducts.find(item => item.id === replaceAllProductId);
      if (!target) { showToast('Chọn sản phẩm cần thêm ảnh.', 'warning'); return; }
      if (!window.confirm(`Thêm ${products.length} ảnh đã xử lý vào “${target.name}”? Giữ nguyên ảnh đại diện và toàn bộ ảnh cũ.`)) return;
      setPublishingProducts(true);
      try {
        const urls: string[] = [];
        for (let index = 0; index < products.length; index++) {
          setPublishProgress(`Đang tải ảnh ${index + 1}/${products.length}...`);
          urls.push(await uploadImageToCloudinary(await createProcessedWebpFile(products[index])));
        }
        const updated = await updateProduct({ ...target, images: [...(target.images || []), ...urls] });
        if (!updated) throw new Error('Không lưu được ảnh vào sản phẩm.');
        await finishProductPublishing(`Đã thêm ${urls.length} ảnh vào “${target.name}”, giữ nguyên ảnh cũ.`);
      } catch (error) { showToast(error instanceof Error ? error.message : 'Không thể thêm ảnh.', 'error'); }
      finally { setPublishingProducts(false); setPublishProgress(''); }
      return;
    }
    const filenameGroups = new Map<string, Array<{ index: number; order: number }>>();
    const replaceAllEntries = products.map((item, index) => ({ index, order: getFileImagePosition(item.file.name).order }));

    if (publishMode !== "replace-all") {
      const missingTargets = products.filter((item) => !bulkProductTargets[item.id]);
      if (missingTargets.length) {
        showToast(`Còn ${missingTargets.length} ảnh chưa nhận diện được mã sản phẩm.`, "warning");
        return;
      }

      products.forEach((item, index) => {
        const targetId = bulkProductTargets[item.id];
        const group = filenameGroups.get(targetId) || [];
        group.push({ index, order: getFileImagePosition(item.file.name).order });
        filenameGroups.set(targetId, group);
      });

      for (const [targetId, entries] of filenameGroups.entries()) {
        const primaryCount = entries.filter((entry) => entry.order === 0).length;
        if (publishMode !== "gallery-by-filename" && primaryCount !== 1) {
          const target = catalogProducts.find((item) => item.id === targetId);
          const fileNames = entries.map((entry) => products[entry.index]?.file.name).filter(Boolean).join(", ");
          showToast(
            primaryCount === 0
              ? `“${target?.sku || target?.id || targetId}” chưa có ảnh chính. File đang ghép: ${fileNames}.`
              : `“${target?.sku || target?.id || targetId}” đang có ${primaryCount} ảnh chính: ${fileNames}.`,
            "warning",
          );
          return;
        }
        if (publishMode === "gallery-by-filename" && primaryCount > 0) {
          showToast("Chế độ cập nhật ảnh phụ chỉ nhận file có số thứ tự như MÃ-1 hoặc MÃ1.", "warning");
          return;
        }
        const orders = entries.map((entry) => entry.order);
        if (new Set(orders).size !== orders.length) {
          showToast("Một sản phẩm đang có ảnh trùng số thứ tự hậu tố.", "warning");
          return;
        }
        if (publishMode === "gallery-by-filename" || publishMode === "primary-bulk") {
          const target = catalogProducts.find((item) => item.id === targetId);
          if (!target) {
            showToast("Không tìm thấy một sản phẩm đã nhận diện.", "error");
            return;
          }
          let availableSlots = (target.images || []).length;
          for (const order of orders.filter((order) => order > 0).sort((a, b) => a - b)) {
            if (order > availableSlots + 1) {
              showToast(`Ảnh phụ -${order} của “${target.name}” tạo khoảng trống. Hãy bổ sung các số đứng trước.`, "warning");
              return;
            }
            if (order === availableSlots + 1) availableSlots += 1;
          }
        } else {
          const galleryOrders = orders.filter((order) => order > 0).sort((a, b) => a - b);
          if (galleryOrders.some((order, index) => order !== index + 1)) {
            showToast("Ảnh phụ phải được đánh số liên tiếp từ -1, -2... và không được bỏ khoảng trống.", "warning");
            return;
          }
        }
      }

      const confirmation = publishMode === "gallery-by-filename"
        ? `Cập nhật ${products.length} ảnh phụ cho ${filenameGroups.size} sản phẩm? Ảnh đại diện hiện tại sẽ được giữ nguyên.`
        : publishMode === "primary-bulk"
          ? `Thay ảnh đại diện cho ${filenameGroups.size} sản phẩm? File -1, -2... nếu có sẽ cập nhật đúng vị trí ảnh phụ.`
          : `Đăng ${products.length} ảnh cho ${filenameGroups.size} sản phẩm? File không hậu tố là ảnh đại diện; file MÃ-1 hoặc MÃ1 là ảnh phụ.`;
      if (!window.confirm(confirmation)) return;
    } else {
      if (!replaceAllProductId) {
        showToast("Chọn sản phẩm cần thay toàn bộ ảnh.", "warning");
        return;
      }
      const target = catalogProducts.find((item) => item.id === replaceAllProductId);
      if (!target) {
        showToast("Không tìm thấy sản phẩm đã chọn.", "error");
        return;
      }
      const primaryCount = replaceAllEntries.filter((entry) => entry.order === 0).length;
      const orders = replaceAllEntries.map((entry) => entry.order);
      if (primaryCount !== 1 || new Set(orders).size !== orders.length) {
        showToast("Bộ ảnh phải có đúng một ảnh chính không hậu tố và không được trùng số -1, -2...", "warning");
        return;
      }
      const galleryOrders = orders.filter((order) => order > 0).sort((a, b) => a - b);
      if (galleryOrders.some((order, index) => order !== index + 1)) {
        showToast("Ảnh phụ phải được đánh số liên tiếp từ -1, -2... và không được bỏ khoảng trống.", "warning");
        return;
      }
      if (!window.confirm(`Thay toàn bộ ảnh của “${target.name}” bằng ${products.length} ảnh hiện tại? File không hậu tố sẽ là ảnh đại diện.`)) return;
    }

    setPublishingProducts(true);
    setPublishProgress("Đang chuẩn bị ảnh...");
    try {
      const uploadedUrls: string[] = [];
      for (let index = 0; index < products.length; index += 1) {
        setPublishProgress(`Đang tải ảnh ${index + 1}/${products.length} lên Cloudinary...`);
        const file = await createProcessedWebpFile(products[index]);
        uploadedUrls.push(await uploadImageToCloudinary(file));
      }

      if (publishMode !== "replace-all") {
        let updatedCount = 0;
        for (const [targetId, entries] of filenameGroups.entries()) {
          const target = catalogProducts.find((item) => item.id === targetId);
          if (!target) throw new Error("Không tìm thấy một sản phẩm đã nhận diện.");
          const primary = entries.find((entry) => entry.order === 0);
          const galleryUrls = publishMode === "filename-bulk"
            ? entries
              .filter((entry) => entry.order > 0)
              .sort((a, b) => a.order - b.order)
              .map((entry) => uploadedUrls[entry.index])
            : [...(target.images || [])];
          if (publishMode !== "gallery-by-filename" && !primary) throw new Error(`Sản phẩm “${target.name}” thiếu ảnh đại diện.`);
          if (publishMode !== "filename-bulk") {
            entries.filter((entry) => entry.order > 0).forEach((entry) => {
              galleryUrls[entry.order - 1] = uploadedUrls[entry.index];
            });
          }
          updatedCount += 1;
          setPublishProgress(`Đang cập nhật sản phẩm ${updatedCount}/${filenameGroups.size}...`);
          const updated = await updateProduct({
            ...target,
            image: primary ? uploadedUrls[primary.index] : target.image,
            images: galleryUrls,
          });
          if (!updated) throw new Error(`Không thể cập nhật sản phẩm “${target.name}”.`);
        }
        await finishProductPublishing(
          publishMode === "gallery-by-filename"
            ? `Đã cập nhật ${products.length} ảnh phụ; ảnh đại diện được giữ nguyên.`
            : publishMode === "primary-bulk"
              ? `Đã thay ảnh đại diện cho ${filenameGroups.size} sản phẩm; ảnh phụ được cập nhật theo hậu tố nếu có.`
              : `Đã đăng ${products.length} ảnh cho ${filenameGroups.size} sản phẩm theo đúng vai trò tên file.`,
        );
      } else {
        const target = catalogProducts.find((item) => item.id === replaceAllProductId);
        if (!target) throw new Error("Không tìm thấy sản phẩm đã chọn.");
        setPublishProgress("Đang cập nhật bộ ảnh sản phẩm...");
        const primary = replaceAllEntries.find((entry) => entry.order === 0);
        if (!primary) throw new Error("Bộ ảnh thiếu ảnh đại diện không có hậu tố.");
        const galleryUrls = replaceAllEntries
          .filter((entry) => entry.order > 0)
          .sort((a, b) => a.order - b.order)
          .map((entry) => uploadedUrls[entry.index]);
        const updated = await updateProduct({
          ...target,
          image: uploadedUrls[primary.index],
          images: galleryUrls,
        });
        if (!updated) throw new Error(`Không thể cập nhật sản phẩm “${target.name}”.`);
        await finishProductPublishing(`Đã thay toàn bộ ${uploadedUrls.length} ảnh của “${target.name}”.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đăng ảnh sản phẩm.";
      showToast(message, "error");
    } finally {
      setPublishingProducts(false);
      setPublishProgress("");
    }
  };

  const removeProduct = (id: string) => {
    setBulkProductTargets((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setBulkProductQueries((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setProducts((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
        productImgRefs.current.delete(id);
      }
      const next = current.filter((item) => item.id !== id);
      if (activeProductId === id) setActiveProductId(next[0]?.id || null);
      resetFileInput(productInputRef);
      return next;
    });
  };

  const removeUnmatchedProducts = () => {
    const unmatchedIds = new Set(products.filter((item) => !bulkProductTargets[item.id]).map((item) => item.id));
    if (!unmatchedIds.size) return;

    setBulkProductTargets((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => !unmatchedIds.has(id)),
    ));
    setBulkProductQueries((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => !unmatchedIds.has(id)),
    ));
    setProducts((current) => {
      current.filter((item) => unmatchedIds.has(item.id)).forEach((item) => {
        URL.revokeObjectURL(item.url);
        productImgRefs.current.delete(item.id);
      });
      const next = current.filter((item) => !unmatchedIds.has(item.id));
      setActiveProductId((activeId) => activeId && !unmatchedIds.has(activeId) ? activeId : next[0]?.id || null);
      return next;
    });
    resetFileInput(productInputRef);
    showToast(`Đã xóa ${unmatchedIds.size} ảnh chưa ghép mã. Các chỉnh sửa còn lại được giữ nguyên.`, "success");
  };

  const clearProducts = () => {
    products.forEach((product) => URL.revokeObjectURL(product.url));
    productImgRefs.current.clear();
    setProducts([]);
    setActiveProductId(null);
    setBulkProductTargets({});
    setBulkProductQueries({});
    resetFileInput(productInputRef);
  };

  const onClearAll = () => {
    clearProducts();
    if (overlay) URL.revokeObjectURL(overlay.url);
    overlayImgRef.current = null;
    setOverlay(null);
    resetFileInput(overlayInputRef);
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-[#ECECEC] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-gold-dark/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 border border-gold-dark/30 bg-gold-dark/10 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light">
              <Layers className="h-3.5 w-3.5" />
              Công cụ ảnh quảng cáo
            </div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
              Ghép khung & watermark sản phẩm
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
              Ghép khung hoặc đóng watermark hàng loạt, tải ảnh về máy hoặc đăng trực tiếp vào sản phẩm.
            </p>
          </div>
          <a href="/admin" className="inline-flex h-10 items-center justify-center border border-white/10 px-4 text-[11px] font-display font-bold uppercase tracking-widest text-gray-300 hover:border-gold-light hover:text-gold-light">
            Về quản trị
          </a>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
          <section className="space-y-5">
            <div className="border border-white/10 bg-[#101010] p-4 space-y-4">
              <div className="flex gap-2">
                <ModeButton active={toolMode === 'overlay'} label="Ghép khung Overlay" onClick={() => setToolMode('overlay')} />
                <ModeButton active={toolMode === 'watermark'} label="Đóng Watermark hàng loạt" onClick={() => { setToolMode('watermark'); setExportSize('original'); setPreserveOriginalNames(true); }} />
              </div>
              {toolMode === 'watermark' && <>
                <p className="text-xs text-gray-300">Dùng logo Xưởng In 3D mặc định hoặc chọn PNG trong suốt bên dưới. Watermark được đóng trực tiếp vào mọi ảnh tải về/upload, không phải lớp phủ sự kiện. Nên chọn “Kích thước gốc” để giữ tỷ lệ ảnh.</p>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
                  <label>Vị trí<select value={watermarkOptions.position} onChange={e => setWatermarkOptions(current => ({ ...current, position: e.target.value as WatermarkOptions['position'] }))} className="mt-2 w-full bg-black p-2"><option value="top-left">Trên trái</option><option value="top-right">Trên phải</option><option value="bottom-left">Dưới trái</option><option value="bottom-right">Dưới phải</option><option value="center">Chính giữa</option></select></label>
                  <label>Độ rõ: {watermarkOptions.opacity}%<input type="range" min="10" max="100" value={watermarkOptions.opacity} onChange={e => setWatermarkOptions(current => ({ ...current, opacity: Number(e.target.value) }))} className="mt-3 w-full" /></label>
                  <label>Chiều rộng logo: {watermarkOptions.size}%<input type="range" min="5" max="50" value={watermarkOptions.size} onChange={e => setWatermarkOptions(current => ({ ...current, size: Number(e.target.value) }))} className="mt-3 w-full" /></label>
                  <label>Cách mép: {watermarkOptions.margin}%<input type="range" min="0" max="10" value={watermarkOptions.margin} onChange={e => setWatermarkOptions(current => ({ ...current, margin: Number(e.target.value) }))} className="mt-3 w-full" /></label>
                </div>
              </>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UploadBox
                icon={<ImagePlus className="h-5 w-5" />}
                title="Ảnh sản phẩm"
                subtitle="JPG, PNG hoặc WebP, chọn được nhiều ảnh"
                fileName={products.length ? `${products.length} ảnh đã chọn` : undefined}
                buttonText="Thêm ảnh"
                dropActive={productDropActive}
                onClick={() => productInputRef.current?.click()}
                onDropFiles={(files) => onProductFiles(files)}
                onDropActiveChange={setProductDropActive}
              />
              <UploadBox
                icon={<Layers className="h-5 w-5" />}
                title={toolMode === 'watermark' ? 'Logo watermark' : 'Khung overlay'}
                subtitle="PNG nền trong suốt"
                fileName={toolMode === 'watermark' ? watermarkAsset?.file.name || 'Logo Xưởng In 3D mặc định' : overlay?.file.name || promoOverlaySettings.fileName}
                buttonText={toolMode === 'watermark' ? 'Chọn logo PNG' : 'Chọn khung'}
                secondary
                dropActive={overlayDropActive}
                onClick={() => overlayInputRef.current?.click()}
                onDropFiles={(files) => onOverlayFiles(files)}
                onDropActiveChange={setOverlayDropActive}
              />
            </div>

            <input ref={productInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onProductFiles(e.target.files)} />
            <input ref={overlayInputRef} type="file" accept="image/png" className="hidden" onChange={(e) => onOverlayFiles(e.target.files)} />

            <div className={classNames("border border-gold-dark/25 bg-gold-dark/5 p-4 sm:p-5", toolMode === 'watermark' && 'hidden')}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light">
                    <Layers className="h-4 w-4" />
                    Sự kiện overlay toàn site
                  </div>
                  <p className="max-w-2xl text-xs leading-relaxed text-gray-400">
                    Dùng khung overlay hiện tại làm lớp phủ tạm thời trên ảnh đại diện sản phẩm ngoài website. Khi lưu, khung sẽ được nén WebP trước khi upload Cloudinary.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3 border border-white/10 bg-black px-3 py-2">
                  <input
                    type="checkbox"
                    checked={eventEnabled}
                    onChange={(e) => setEventEnabled(e.target.checked)}
                    className="h-4 w-4 accent-gold-dark"
                  />
                  <span className="text-[11px] font-display font-bold uppercase tracking-widest text-white">
                    Bật sự kiện
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">
                    <Calendar className="h-3.5 w-3.5 text-gold-light" />
                    Ngày kết thúc
                  </span>
                  <input
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="h-10 w-full border border-white/10 bg-black px-3 text-xs font-mono text-white outline-none focus:border-gold-light"
                  />
                  <span className="block text-[10px] text-gray-500">Để trống nếu muốn overlay chạy tới khi tắt thủ công.</span>
                </label>

                <button
                  type="button"
                  onClick={saveEventOverlay}
                  disabled={savingEventOverlay}
                  className="self-end inline-flex h-10 items-center justify-center gap-2 bg-gradient-to-r from-gold-dark to-gold-light px-5 text-[11px] font-display font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingEventOverlay ? "Đang lưu..." : "Lưu sự kiện"}
                </button>
              </div>

              {promoOverlaySettings.imageUrl && (
                <div className="mt-4 flex items-center gap-3 border border-white/10 bg-black/50 p-3">
                  <img src={promoOverlaySettings.imageUrl} alt="" className="h-14 w-14 object-contain" />
                  <div className="min-w-0 text-xs">
                    <div className="font-display font-bold uppercase tracking-widest text-white">
                      Overlay đang lưu: {promoOverlaySettings.enabled ? "đang bật" : "đang tắt"}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-gray-500">
                      {promoOverlaySettings.fileName || promoOverlaySettings.imageUrl}
                    </div>
                  </div>
                </div>
              )}

              {(promoOverlaySettings.library || []).length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-display font-black uppercase tracking-widest text-white">
                      Thư viện promo
                    </h3>
                    <span className="text-[10px] text-gray-500">{promoOverlaySettings.library?.length || 0} khung</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {(promoOverlaySettings.library || []).map((item) => (
                      <div
                        key={item.url}
                        className={classNames(
                          "group relative border bg-black/70 p-2 text-left transition-colors hover:border-gold-light",
                          promoOverlaySettings.imageUrl === item.url ? "border-gold-light" : "border-white/10",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => useLibraryOverlay(item)}
                          className="block w-full text-left"
                        >
                          <div className="aspect-square bg-[#080808] p-2">
                            <img src={item.url} alt="" className="h-full w-full object-contain" />
                          </div>
                          <div className="mt-2 truncate text-[10px] font-mono text-gray-500 group-hover:text-gold-light">
                            {item.fileName}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLibraryOverlay(item)}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center border border-red-500/30 bg-black/80 text-red-300 opacity-100 transition-colors hover:border-red-400 hover:bg-red-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Xóa khung promo khỏi thư viện"
                          title="Xóa khỏi thư viện"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {products.length > 0 && (
              <div className="border border-white/5 bg-[#0B0B0B] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-display text-xs font-black uppercase tracking-widest text-white">Danh sách ảnh sản phẩm</h2>
                  <span className="text-[11px] text-gray-500">{products.length} ảnh</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <label>
                    <span className="sr-only">Chọn ảnh cần chỉnh</span>
                    <select
                      value={activeProduct?.id || ""}
                      onChange={(event) => setActiveProductId(event.target.value)}
                      className="h-10 w-full border border-gold-dark/35 bg-black px-3 text-xs font-mono text-white outline-none focus:border-gold-light"
                    >
                      {products.map((item, index) => (
                        <option key={item.id} value={item.id}>Ảnh {index + 1} — {item.file.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={clearProducts}
                    className="inline-flex h-10 items-center justify-center gap-1.5 border border-red-500/25 px-3 text-[10px] font-display font-bold uppercase tracking-widest text-red-300 transition-colors hover:border-red-400 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa tất cả
                  </button>
                </div>
                <details className="mt-3 border border-white/5 bg-black/30">
                  <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-display font-bold uppercase tracking-widest text-gray-400 hover:text-gold-light">
                    Mở danh sách thu nhỏ để xem hoặc xóa từng ảnh
                  </summary>
                  <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto border-t border-white/5 p-2 sm:grid-cols-2">
                  {products.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveProductId(item.id)}
                      className={classNames(
                        "flex min-w-0 items-center gap-3 border p-2 text-left transition-colors",
                        activeProduct?.id === item.id ? "border-gold-light bg-gold-dark/10" : "border-white/5 bg-black/40 hover:border-white/20",
                      )}
                    >
                      <img src={item.url} alt="" className="h-11 w-11 shrink-0 object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-display font-bold uppercase tracking-widest text-white">Ảnh {index + 1}</span>
                        <span className="block truncate text-[11px] font-mono text-gray-500">{item.file.name}</span>
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeProduct(item.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            removeProduct(item.id);
                          }
                        }}
                        className="shrink-0 px-2 py-1 text-[10px] font-display font-bold uppercase tracking-widest text-gray-500 hover:text-red-400"
                      >
                        Xóa
                      </span>
                    </button>
                  ))}
                  </div>
                </details>
              </div>
            )}

            <div className="border border-white/5 bg-[#0B0B0B] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-gold-light">
                <Maximize2 className="h-4 w-4" />
                Tùy chỉnh xuất ảnh
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">Kích thước xuất</span>
                  <select
                    value={exportSize}
                    onChange={(e) => setExportSize(e.target.value === "original" ? "original" : (Number(e.target.value) as ExportSize))}
                    className="h-10 w-full border border-white/10 bg-black px-3 text-xs font-mono text-white outline-none focus:border-gold-light"
                  >
                    <option value="original">Kích thước gốc</option>
                    <option value={800}>800 x 800</option>
                    <option value={1000}>1000 x 1000</option>
                    <option value={1200}>1200 x 1200</option>
                  </select>
                </label>
                <ControlRange label="Chất lượng WebP" value={quality} min={50} max={100} step={1} display={`${quality}%`} onChange={setQuality} />
              </div>

              <label className="space-y-2">
                <span className="block text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">
                  Tên file xuất
                </span>
                <input
                  type="text"
                  value={exportBaseName}
                  onChange={(e) => setExportBaseName(e.target.value)}
                  placeholder="may-khoan-qzj005"
                  className="h-10 w-full border border-white/10 bg-black px-3 text-xs font-mono text-white outline-none focus:border-gold-light"
                />
              </label>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 border border-white/10 bg-black px-3 py-3 text-[11px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={preserveOriginalNames}
                    onChange={(e) => setPreserveOriginalNames(e.target.checked)}
                    className="h-4 w-4 accent-[#E3A62F]"
                  />
                  <span>
                    <span className="block font-display font-bold uppercase tracking-wider text-white">Giữ tên file gốc</span>
                    <span className="mt-1 block text-[10px] text-gray-500">Ví dụ: QZ004.png → QZ004.webp</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 border border-white/10 bg-black px-3 py-3 text-[11px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(saveDirectoryHandle)}
                    onChange={(e) => {
                      if (e.target.checked) void selectSaveDirectory();
                      else setSaveDirectoryHandle(null);
                    }}
                    className="h-4 w-4 accent-[#E3A62F]"
                  />
                  <span>
                    <span className="block font-display font-bold uppercase tracking-wider text-white">
                      {saveDirectoryHandle ? "Thư mục đã chọn" : "Chọn thư mục lưu"}
                    </span>
                    <span className="mt-1 block text-[10px] text-gray-500">
                      {saveDirectoryHandle ? saveDirectoryHandle.name : "Bấm để mở cửa sổ chọn thư mục"}
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-5 border-t border-white/5 pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-gold-light">
                  <Palette className="h-4 w-4" />
                  Nền ảnh xuất
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <ModeButton active={backgroundMode === "white"} label="Nền trắng" onClick={() => setBackgroundMode("white")} />
                  <ModeButton active={backgroundMode === "transparent"} label="Không nền" onClick={() => setBackgroundMode("transparent")} />
                  <ModeButton active={backgroundMode === "custom"} label="Màu tùy chọn" onClick={() => setBackgroundMode("custom")} />
                  <label className={classNames("flex h-10 items-center gap-2 border border-white/10 bg-black px-3", backgroundMode !== "custom" && "opacity-45")}>
                    <span className="h-5 w-5 border border-white/20" style={{ backgroundColor: customBackground }} />
                    <input
                      type="color"
                      value={customBackground}
                      disabled={backgroundMode !== "custom"}
                      onChange={(e) => setCustomBackground(e.target.value)}
                      className="h-6 w-10 cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed"
                      aria-label="Chọn màu nền"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ActionButton disabled={!activeProduct} onClick={() => downloadProducts("image/webp")} icon={<Download className="h-4 w-4" />} label="Tải WebP" />
                <ActionButton disabled={!activeProduct} onClick={() => downloadProducts("image/png")} icon={<Download className="h-4 w-4" />} label="Tải PNG" variant="outline" />
                <ActionButton onClick={onClearAll} icon={<Eraser className="h-4 w-4" />} label="Xóa tất cả" variant="ghost" />
              </div>
              {products.length > 1 && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ActionButton disabled={!products.length} onClick={() => downloadProducts("image/webp", true)} icon={<Download className="h-4 w-4" />} label={saveDirectoryHandle ? "Lưu tất cả WebP" : "Tải tất cả WebP (ZIP)"} variant="outline" />
                  <ActionButton disabled={!products.length} onClick={() => downloadProducts("image/png", true)} icon={<Download className="h-4 w-4" />} label={saveDirectoryHandle ? "Lưu tất cả PNG" : "Tải tất cả PNG (ZIP)"} variant="outline" />
                </div>
              )}
            </div>

            <div className="border border-gold-dark/30 bg-[#0B0B0B] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-gold-light">
                <Upload className="h-4 w-4" />
                Đăng ảnh vào sản phẩm
              </div>
              <LoadAdminCatalogueButton />
              <p className="mb-4 text-[11px] leading-relaxed text-gray-500">
                Đăng trực tiếp kết quả đang xem trước lên Cloudinary dưới dạng WebP 70% và cập nhật sản phẩm — không cần tải về rồi thêm lại. Thumbnail bên dưới là đầu ra sau khi chỉnh nền, vị trí, tỷ lệ và overlay.
              </p>

              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ModeButton active={publishMode === "filename-bulk"} label="Đăng theo mã file" description="Tự ghép ảnh với sản phẩm theo ID/SKU/barcode. File MÃ là ảnh đại diện; MÃ-1, MÃ-2… là ảnh phụ. Thay ảnh đại diện và toàn bộ bộ ảnh phụ bằng các file đã chọn." onClick={() => setPublishMode("filename-bulk")} />
                <ModeButton active={publishMode === "gallery-by-filename"} label="Cập nhật ảnh phụ theo mã" description="Chỉ cập nhật ảnh phụ theo tên MÃ-1, MÃ-2… Giữ nguyên ảnh đại diện và các ảnh phụ ở vị trí không được cập nhật. Không dùng file MÃ không có số thứ tự." onClick={() => setPublishMode("gallery-by-filename")} />
                <ModeButton active={publishMode === "primary-bulk"} label="Thay ảnh đại diện hàng loạt" description="Thay ảnh đại diện của nhiều sản phẩm theo file MÃ. Giữ các ảnh phụ cũ; nếu có file MÃ-1, MÃ-2… thì cập nhật thêm ảnh phụ ở vị trí tương ứng." onClick={() => setPublishMode("primary-bulk")} />
                <ModeButton active={publishMode === "replace-all"} label="Thay toàn bộ một sản phẩm" description="Chọn một sản phẩm và thay toàn bộ ảnh cũ. Bộ file cần đúng một ảnh MÃ làm ảnh đại diện; MÃ-1, MÃ-2… làm ảnh phụ. Kiểm tra kỹ trước khi xác nhận." onClick={() => setPublishMode("replace-all")} />
                <ModeButton active={publishMode === "append-gallery"} label="Thêm bộ ảnh vào sản phẩm (giữ ảnh cũ)" description="Chọn một sản phẩm rồi thêm tất cả ảnh đã xử lý vào cuối bộ ảnh. Giữ nguyên ảnh đại diện và toàn bộ ảnh cũ; tên file không cần theo mã sản phẩm." onClick={() => setPublishMode("append-gallery")} />
              </div>

              {publishMode !== "replace-all" && publishMode !== "append-gallery" ? (
                <div className="space-y-3">
                  <div className="border border-gold-dark/20 bg-gold-dark/5 p-3 text-[10px] leading-relaxed text-gray-400">
                    <span className="font-bold text-gold-light">QZJ004.png</span> là ảnh đại diện. <span className="font-bold text-gold-light">QZJ004-1.png</span> hoặc <span className="font-bold text-gold-light">QZJ0041.png</span> là ảnh phụ số 1. Mã file khớp chính xác luôn được ưu tiên.
                  </div>
                  {publishMode === "gallery-by-filename" && (
                    <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] leading-relaxed text-gray-400">
                      Chỉ dùng file có số thứ tự như <span className="font-bold text-emerald-400">MÃ-1, MÃ-2</span> hoặc <span className="font-bold text-emerald-400">MÃ1, MÃ2</span>. Ảnh phụ đúng vị trí sẽ được thay; ảnh đại diện và các ảnh phụ khác được giữ nguyên.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
                    <span>Tự ghép mã file với ID, SKU hoặc barcode; trường hợp mơ hồ cần chọn lại.</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{products.length - unmatchedProductCount}/{products.length} đã ghép</span>
                      <button
                        type="button"
                        onClick={rematchAllProductTargets}
                        className="inline-flex h-7 items-center border border-gold-dark/30 px-2 text-[9px] font-display font-bold uppercase tracking-wider text-gold-light hover:border-gold-light hover:bg-gold-dark/10"
                      >
                        Nhận diện lại
                      </button>
                      {unmatchedProductCount > 0 && (
                        <button
                          type="button"
                          onClick={removeUnmatchedProducts}
                          className="inline-flex h-7 items-center gap-1 border border-red-500/25 px-2 text-[9px] font-display font-bold uppercase tracking-wider text-red-300 hover:border-red-400 hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                          Xóa ảnh chưa ghép ({unmatchedProductCount})
                        </button>
                      )}
                    </div>
                  </div>
                  <datalist id="bulk-product-code-options">
                    {catalogProducts.flatMap((product) => {
                      const codes = Array.from(new Set([product.sku, product.id, product.barcode].filter((code): code is string => Boolean(code))));
                      return codes.map((code) => (
                        <option key={`${product.id}-${code}`} value={code}>{product.name}</option>
                      ));
                    })}
                  </datalist>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {products.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 gap-2 border border-white/5 bg-black/40 p-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] sm:items-center">
                        <div className="flex min-w-0 items-center gap-2">
                          <ProcessedImageThumbnail
                            product={item}
                            watermark={toolMode === 'watermark' ? watermarkOptions : undefined}
                            overlayUrl={previewOverlayUrl}
                            backgroundMode={backgroundMode}
                            customBackground={customBackground}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-wider text-white">
                              Ảnh {index + 1}
                              {(
                                <span className={classNames(
                                  "px-1.5 py-0.5 text-[8px] tracking-wider",
                                  getFileImagePosition(item.file.name).order === 0 ? "bg-gold-dark/20 text-gold-light" : "bg-white/5 text-gray-400",
                                )}>
                                  {getFileImagePosition(item.file.name).order === 0
                                    ? "Đại diện"
                                    : `Ảnh phụ ${getFileImagePosition(item.file.name).order}`}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[10px] font-mono text-gray-500">
                              {getProductUploadFileName(item.file.name)} · WebP 70%
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 gap-2">
                          <div className="min-w-0 flex-1">
                            <input
                              type="search"
                              list="bulk-product-code-options"
                              value={getBulkProductQueryValue(item.id)}
                              onChange={(event) => updateBulkProductQuery(item.id, event.target.value)}
                              placeholder="Tìm theo ID, SKU, barcode hoặc tên..."
                              className="h-9 w-full min-w-0 border border-white/10 bg-black px-2 text-[10px] text-white outline-none placeholder:text-gray-600 focus:border-gold-light"
                              aria-label={`Tìm sản phẩm đích cho ${item.file.name}`}
                            />
                            {bulkProductTargets[item.id] && (
                              <div className="mt-1 truncate text-[9px] text-emerald-400">
                                {catalogProducts.find((product) => product.id === bulkProductTargets[item.id])?.name}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProduct(item.id)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 border border-red-500/20 px-2 text-[9px] font-display font-bold uppercase text-red-300 hover:border-red-400 hover:bg-red-500 hover:text-white"
                            aria-label={`Xóa ${item.file.name} khỏi danh sách`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                    {!products.length && (
                      <div className="border border-dashed border-white/10 p-5 text-center text-[10px] text-gray-500">Chưa có ảnh để đăng.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">{publishMode === 'append-gallery' ? 'Chọn sản phẩm cần thêm bộ ảnh' : 'Gõ mã sản phẩm cần thay toàn bộ ảnh'}</span>
                    <input
                      type="text"
                      list="replace-all-product-codes"
                      value={replaceAllProductQuery}
                      onChange={(event) => updateReplaceAllProductQuery(event.target.value)}
                      placeholder="Nhập ID, SKU hoặc barcode..."
                      autoComplete="off"
                      className="h-10 w-full border border-white/10 bg-black px-3 text-xs font-mono text-white outline-none focus:border-gold-light"
                    />
                    <datalist id="replace-all-product-codes">
                      {catalogProducts.flatMap((product) =>
                        [product.id, product.sku, product.barcode]
                          .filter((code): code is string => Boolean(code))
                          .map((code) => <option key={`${product.id}-${code}`} value={code}>{product.name}</option>)
                      )}
                    </datalist>
                  </label>
                  {replaceAllProduct ? (
                    <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-300">
                      Đã nhận diện: <span className="font-bold text-white">{replaceAllProduct.name}</span> ({replaceAllProduct.sku || replaceAllProduct.id})
                    </div>
                  ) : replaceAllProductQuery ? (
                    <div className="border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] text-amber-300">
                      Chưa tìm thấy mã chính xác. Hãy chọn gợi ý hoặc kiểm tra lại ID/SKU/barcode.
                    </div>
                  ) : null}
                  <div className="border border-gold-dark/20 bg-gold-dark/5 p-3 text-[11px] leading-relaxed text-gray-400">
                    {publishMode === 'append-gallery' ? 'Tất cả ảnh đã xử lý sẽ được thêm vào bộ ảnh của sản phẩm đã chọn. Giữ nguyên ảnh đại diện và ảnh cũ; không cần đặt tên file theo mã sản phẩm.' : <>Toàn bộ ảnh cũ trong dữ liệu sản phẩm sẽ được thay thế. File <span className="font-bold text-gold-light">không có hậu tố</span> là ảnh đại diện; file dạng <span className="font-bold text-gold-light">MÃ-1</span> hoặc <span className="font-bold text-gold-light">MÃ1</span> là ảnh bổ sung.</>}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={publishImagesToProducts}
                disabled={publishingProducts || !products.length || !catalogProducts.length}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-gradient-to-r from-gold-dark to-gold-light px-4 text-[11px] font-display font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                {publishingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {publishingProducts ? publishProgress || "Đang đăng ảnh..." : "Kiểm tra và đăng ảnh"}
              </button>
              <p className="mt-2 text-[9px] leading-relaxed text-gray-600">
                {publishMode === 'append-gallery' ? 'Ảnh cũ được giữ nguyên. Ảnh mới được upload lên Cloudinary trước khi thêm vào sản phẩm.' : 'URL ảnh cũ được gỡ khỏi sản phẩm; file vật lý cũ trên Cloudinary không bị xóa tự động.'}
              </p>
            </div>

            <div className="border border-gold-dark/20 bg-gold-dark/5 p-4 text-xs leading-relaxed text-gray-300">
              <div className="mb-1 flex items-center gap-2 font-display font-bold uppercase tracking-widest text-gold-light">
                <Move className="h-4 w-4" />
                Cách dùng nhanh
              </div>
              Chọn ảnh trong danh sách rồi kéo trực tiếp trên khung xem trước để canh vị trí riêng cho từng ảnh. Nền xuất có thể để trắng, trong suốt hoặc màu tùy chọn.
            </div>
          </section>

          <section className="border border-gold-dark/30 bg-[#0B0B0B] p-4 sm:p-5 lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">Xem trước</h2>
                <p className="mt-1 text-[11px] text-gray-500">
                  {exportSize === "original"
                    ? activeProduct
                      ? `${activeProduct.width} x ${activeProduct.height}px (gốc)`
                      : "Kích thước gốc"
                    : `${exportSize} x ${exportSize}px`}
                </p>
              </div>
              <span className={classNames("rounded-sm px-2 py-1 text-[10px] font-display font-bold uppercase tracking-widest", activeProduct ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-gray-500")}>
                {activeProduct ? "Sẵn sàng" : "Chưa có ảnh"}
              </span>
            </div>

            <div className="mx-auto w-full max-w-[460px] overflow-hidden border border-gold-dark/40 bg-black shadow-[0_0_35px_rgba(216,154,43,0.08)]">
              <div className="relative aspect-square w-full">
                <canvas
                  ref={previewCanvasRef}
                  width={PREVIEW_CANVAS_SIZE}
                  height={PREVIEW_CANVAS_SIZE}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className={classNames("absolute inset-0 h-full w-full touch-none", Boolean(activeProduct) && "cursor-move")}
                />
              </div>
            </div>

            <div className="mt-4 border border-gold-dark/25 bg-black/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-gold-light">
                  <Move className="h-4 w-4" />
                  Chỉnh ảnh đang xem
                </div>
                {activeProduct && (
                  <span className="text-[10px] font-mono text-gray-500">
                    Ảnh {activeProductIndex + 1}/{products.length}
                  </span>
                )}
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectAdjacentProduct(-1)}
                  disabled={activeProductIndex <= 0}
                  className="inline-flex h-10 items-center justify-center gap-1.5 border border-white/10 bg-black text-[10px] font-display font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-gold-light hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Ảnh trước
                </button>
                <button
                  type="button"
                  onClick={() => selectAdjacentProduct(1)}
                  disabled={activeProductIndex < 0 || activeProductIndex >= products.length - 1}
                  className="inline-flex h-10 items-center justify-center gap-1.5 border border-white/10 bg-black text-[10px] font-display font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-gold-light hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Ảnh tiếp
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <label className="mb-4 block">
                <span className="mb-2 block text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">Chọn nhanh ảnh cần chỉnh</span>
                <select
                  value={activeProduct?.id || ""}
                  onChange={(event) => setActiveProductId(event.target.value)}
                  disabled={!products.length}
                  className="h-10 w-full border border-white/10 bg-black px-3 text-xs font-mono text-white outline-none focus:border-gold-light disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {!products.length && <option value="">Chưa có ảnh sản phẩm</option>}
                  {products.map((item, index) => (
                    <option key={item.id} value={item.id}>Ảnh {index + 1} — {item.file.name}</option>
                  ))}
                </select>
              </label>

              <ControlRange
                label="Phóng to / thu nhỏ"
                value={activeProduct?.scale || 1}
                min={0.25}
                max={2}
                step={0.01}
                display={`${Math.round((activeProduct?.scale || 1) * 100)}%`}
                onChange={(value) => updateActiveProduct({ scale: value })}
                disabled={!activeProduct}
              />
              <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
                Kéo trực tiếp ảnh trong khung xem trước để đổi vị trí. Mức phóng và vị trí được lưu riêng cho từng ảnh.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ProcessedImageThumbnail({ product, overlayUrl, backgroundMode, customBackground, watermark }: {
  product: ProductItem;
  overlayUrl: string;
  backgroundMode: BackgroundMode;
  customBackground: string;
  watermark?: WatermarkOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const loadImage = (url: string) => new Promise<HTMLImageElement | null>((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      const image = new Image();
      if (/^https?:\/\//i.test(url)) image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });

    Promise.all([loadImage(product.url), loadImage(overlayUrl)]).then(([productImage, overlayImage]) => {
      if (cancelled) return;
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);
      if (backgroundMode !== "transparent") {
        ctx.fillStyle = backgroundMode === "custom" ? customBackground : "#ffffff";
        ctx.fillRect(0, 0, size, size);
      }
      if (productImage) {
        const base = Math.min(size / product.width, size / product.height);
        const displayScale = base * product.scale;
        const drawWidth = product.width * displayScale;
        const drawHeight = product.height * displayScale;
        const x = (size - drawWidth) / 2 + product.offset.x * (size / PREVIEW_CANVAS_SIZE);
        const y = (size - drawHeight) / 2 + product.offset.y * (size / PREVIEW_CANVAS_SIZE);
        ctx.drawImage(productImage, x, y, drawWidth, drawHeight);
      }
      if (overlayImage) {
        if (watermark) drawWatermark(ctx, overlayImage, size, size, watermark);
        else ctx.drawImage(overlayImage, 0, 0, size, size);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [product, overlayUrl, backgroundMode, customBackground, watermark]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={96}
      className="h-10 w-10 shrink-0 border border-white/10 bg-[linear-gradient(45deg,#181818_25%,transparent_25%),linear-gradient(-45deg,#181818_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#181818_75%),linear-gradient(-45deg,transparent_75%,#181818_75%)] bg-[length:8px_8px] object-contain"
      aria-label={`Ảnh đầu ra ${product.file.name}`}
    />
  );
}

function UploadBox({ icon, title, subtitle, fileName, buttonText, secondary, dropActive, onClick, onDropFiles, onDropActiveChange }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  fileName?: string;
  buttonText: string;
  secondary?: boolean;
  dropActive?: boolean;
  onClick: () => void;
  onDropFiles?: (files: FileList) => void;
  onDropActiveChange?: (active: boolean) => void;
}) {
  const canDrop = Boolean(onDropFiles);

  return (
    <div
      className={classNames(
        "border bg-[#0B0B0B] p-4 transition-colors",
        dropActive ? "border-gold-light bg-gold-dark/10" : "border-white/5",
      )}
      onDragEnter={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        onDropActiveChange?.(true);
      }}
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        onDropActiveChange?.(true);
      }}
      onDragLeave={(event) => {
        if (!canDrop) return;
        const nextTarget = event.relatedTarget;
        if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) {
          onDropActiveChange?.(false);
        }
      }}
      onDrop={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        onDropActiveChange?.(false);
        onDropFiles?.(event.dataTransfer.files);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold-dark/30 bg-gold-dark/10 text-gold-light">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xs font-black uppercase tracking-widest text-white">{title}</h2>
          <p className="mt-1 text-[11px] text-gray-500">{subtitle}</p>
          <p className="mt-1 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light">Kéo thả ảnh vào đây</p>
          <p className="mt-2 truncate text-[11px] font-mono text-gray-400">{fileName || "Chưa chọn file"}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={classNames(
          "mt-4 inline-flex h-10 w-full items-center justify-center gap-2 text-[11px] font-display font-black uppercase tracking-widest transition-colors",
          secondary ? "border border-white/10 text-gray-200 hover:border-gold-light hover:text-gold-light" : "gold-gradient-bg text-black hover:opacity-90",
        )}
      >
        <Upload className="h-4 w-4" />
        {buttonText}
      </button>
    </div>
  );
}

function ControlRange({ label, value, min, max, step, display, disabled, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={classNames("space-y-2", disabled && "opacity-45")}>
      <span className="flex items-center justify-between text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">
        {label}
        <span className="font-mono text-gold-light">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#D89A2B] disabled:cursor-not-allowed"
      />
    </label>
  );
}

function ModeButton({ active, label, description, onClick }: {
  active: boolean;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={description}
      aria-label={description ? `${label}. ${description}` : label}
      onClick={onClick}
      className={classNames(
        "h-10 border px-3 text-[11px] font-display font-black uppercase tracking-widest transition-colors",
        active ? "border-gold-light bg-gold-dark/10 text-gold-light" : "border-white/10 text-gray-300 hover:border-gold-light hover:text-gold-light",
      )}
    >
      {label}
    </button>
  );
}

function ActionButton({ label, icon, disabled, variant = "primary", onClick }: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex h-11 items-center justify-center gap-2 px-4 text-[11px] font-display font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "gold-gradient-bg text-black hover:opacity-90",
        variant === "outline" && "border border-white/10 text-white hover:border-gold-light hover:text-gold-light",
        variant === "ghost" && "border border-white/5 text-gray-400 hover:border-red-400 hover:text-red-400",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
