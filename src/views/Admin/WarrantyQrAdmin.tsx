"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Download, Eye, FileSpreadsheet, ImagePlus, Loader2, Plus, QrCode, Save, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import LoadAdminCatalogueButton from '../../components/Admin/LoadAdminCatalogueButton';
import { WarrantyRecord } from "../../types";
import {
  buildWarrantyQrUrl,
  buildWarrantySerial,
  normalizeSerialPart,
  toWarrantyCsv,
  warrantyIdFromSerial,
  warrantyRecordStatusLabel,
} from "../../lib/warrantyQr";

type PdfLayout = "42" | "36" | "30" | "24" | "20" | "15" | "12";
type SerialNumberMode = "random" | "sequential";

const DEFAULT_TEMPLATE_URL = "/images/warranty-qr-template.webp";
const TEMPLATE_STORAGE_KEY = "xuongin3d_warranty_qr_template";
const TEMPLATE_LIBRARY_KEY = "xuongin3d_warranty_qr_template_library";
const MAX_SERIALS_PER_BATCH = 1000;
const PDF_LABEL_RENDER_WIDTH = 620;
const PDF_PAGE_MARGIN = 7;
const PDF_LABEL_GAP = 2;

const BASE_LABEL_WIDTH = 26.2;
const BASE_LABEL_HEIGHT = 40;
const BASE_LABEL_RATIO = BASE_LABEL_WIDTH / BASE_LABEL_HEIGHT;

function calculateAutoLabelSize(cols: number, rows: number) {
  const pageW = 210;
  const pageH = 297;
  const margin = PDF_PAGE_MARGIN;
  const gap = PDF_LABEL_GAP;

  const availableW = pageW - margin * 2 - gap * (cols - 1);
  const availableH = pageH - margin * 2 - gap * (rows - 1);

  const slotW = availableW / cols;
  const slotH = availableH / rows;

  let drawW = slotW;
  let drawH = drawW / BASE_LABEL_RATIO;

  if (drawH > slotH) {
    drawH = slotH;
    drawW = drawH * BASE_LABEL_RATIO;
  }

  return {
    slotW,
    slotH,
    drawW,
    drawH,
    scale: drawW / BASE_LABEL_WIDTH,
  };
}

const pdfLayouts: Record<PdfLayout, { cols: number; rows: number; label: string }> = {
  "42": { cols: 7, rows: 6, label: "42 tem/trang - nhỏ, tiết kiệm giấy" },
  "36": { cols: 6, rows: 6, label: "36 tem/trang - to hơn mẫu mặc định" },
  "30": { cols: 6, rows: 5, label: "30 tem/trang - tem vừa" },
  "24": { cols: 6, rows: 4, label: "24 tem/trang - tem lớn" },
  "20": { cols: 5, rows: 4, label: "20 tem/trang - tem lớn hơn" },
  "15": { cols: 5, rows: 3, label: "15 tem/trang - tem rất lớn" },
  "12": { cols: 4, rows: 3, label: "12 tem/trang - dán hộp lớn" },
};

const inputClass = "h-10 w-full border border-white/10 bg-black px-3 text-xs text-white outline-none focus:border-gold-light";

function todayIso() {
  return new Date().toISOString();
}

function parseWarrantyMonths(text: string | undefined) {
  const value = Number(String(text || "").match(/\d+/)?.[0] || 12);
  return Number.isFinite(value) && value > 0 ? value : 12;
}

function downloadTextFile(content: string, fileName: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function randomSixDigitNumber() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] % 999999) + 1;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không đọc được ảnh nền tem."));
    img.src = src;
  });
}

export default function WarrantyQrAdmin() {
  const { products, warranties, addWarrantiesBulk, showToast } = useApp();
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [productCode, setProductCode] = useState("VT-IW300");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [batchCode, setBatchCode] = useState("2607");
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [customWarrantyMonths, setCustomWarrantyMonths] = useState("");
  const [serialNumberMode, setSerialNumberMode] = useState<SerialNumberMode>("random");
  const [startNumber, setStartNumber] = useState(1);
  const [pdfLayout, setPdfLayout] = useState<PdfLayout>("42");
  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [templateLibrary, setTemplateLibrary] = useState<string[]>([]);
  const [serials, setSerials] = useState<WarrantyRecord[]>([]);
  const [selectedSerial, setSelectedSerial] = useState("");
  const [busy, setBusy] = useState(false);

  const productOptions = useMemo(() => {
    return products.map((product) => ({
      code: normalizeSerialPart(product.sku || product.id),
      name: product.name,
      warrantyMonths: parseWarrantyMonths(product.warranty),
    }));
  }, [products]);

  const existingSerials = useMemo(() => {
    return new Set(warranties.map((item) => item.serial.trim().toUpperCase()));
  }, [warranties]);

  const activePreviewRecord = useMemo(() => {
    return serials.find((item) => item.serial === selectedSerial) || serials[0] || null;
  }, [selectedSerial, serials]);
  const pdfLayoutInfo = useMemo(() => {
  const layout = pdfLayouts[pdfLayout];
  const autoSize = calculateAutoLabelSize(layout.cols, layout.rows);

  return {
    cols: layout.cols,
    rows: layout.rows,
    perPage: layout.cols * layout.rows,
    drawW: autoSize.drawW,
    drawH: autoSize.drawH,
    scale: autoSize.scale,
  };
}, [pdfLayout]);

  useEffect(() => {
    const savedTemplate = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const savedLibrary = localStorage.getItem(TEMPLATE_LIBRARY_KEY);
    if (savedTemplate) setTemplateUrl(savedTemplate);
    if (savedLibrary) {
      try {
        const parsed = JSON.parse(savedLibrary);
        if (Array.isArray(parsed)) setTemplateLibrary(parsed.filter((item) => typeof item === "string"));
      } catch {
        setTemplateLibrary([]);
      }
    }
  }, []);

  useEffect(() => {
    const matched = productOptions.find((item) => item.code === normalizeSerialPart(productCode));
    if (!matched) return;
    setProductName(matched.name);
    setWarrantyMonths(matched.warrantyMonths);
  }, [productCode, productOptions]);

  useEffect(() => {
    if (!activePreviewRecord) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    renderWarrantyLabel(activePreviewRecord, 900).then((dataUrl) => {
      const canvas = previewCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const img = new Image();
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Không tạo được preview tem.";
      showToast(message, "error");
    });
  }, [activePreviewRecord, templateUrl]);

  const persistTemplate = (dataUrl: string) => {
    const nextLibrary = [dataUrl, ...templateLibrary.filter((item) => item !== dataUrl)].slice(0, 6);
    setTemplateUrl(dataUrl);
    setTemplateLibrary(nextLibrary);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, dataUrl);
    localStorage.setItem(TEMPLATE_LIBRARY_KEY, JSON.stringify(nextLibrary));
  };

  const onTemplateFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showToast("Vui lòng chọn ảnh nền PNG, JPG hoặc WebP.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      persistTemplate(String(reader.result || ""));
      showToast("Đã lưu ảnh nền tem vào thư viện trình duyệt.", "success");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => showToast("Không đọc được ảnh nền tem.", "error");
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const cleanProductCode = normalizeSerialPart(productCode);
    const cleanBatchCode = normalizeSerialPart(batchCode);
    const months = Number(customWarrantyMonths || warrantyMonths);

    if (!cleanProductCode || !productName.trim() || !cleanBatchCode) {
      showToast("Vui lòng nhập mã sản phẩm, tên sản phẩm và mã lô.", "warning");
      return null;
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_SERIALS_PER_BATCH) {
      showToast(`Số lượng tem phải từ 1 đến ${MAX_SERIALS_PER_BATCH}.`, "warning");
      return null;
    }
    if (serialNumberMode === "sequential" && (!Number.isInteger(startNumber) || startNumber <= 0)) {
      showToast("Số bắt đầu phải là số nguyên dương.", "warning");
      return null;
    }
    if (!Number.isFinite(months) || months <= 0) {
      showToast("Thời hạn bảo hành phải lớn hơn 0 tháng.", "warning");
      return null;
    }

    return { cleanProductCode, cleanBatchCode, months };
  };

  const generateSerials = async (persist = true) => {
    const validated = validateForm();
    if (!validated) return;

    setBusy(true);
    try {
      const now = todayIso();
      const nextRecords: WarrantyRecord[] = [];
      const duplicateSerials: string[] = [];
      const seen = new Set<string>();

      let sequentialOffset = 0;
      let attempts = 0;
      while (nextRecords.length < quantity && attempts < quantity * 30) {
        attempts += 1;
        const suffixNumber = serialNumberMode === "random" ? randomSixDigitNumber() : startNumber + sequentialOffset;
        sequentialOffset += 1;
        const batchForSerial = persist ? validated.cleanBatchCode : `TEST-${validated.cleanBatchCode}`;
        const serial = buildWarrantySerial(validated.cleanProductCode, batchForSerial, suffixNumber);
        if (existingSerials.has(serial) || seen.has(serial)) {
          duplicateSerials.push(serial);
          continue;
        }
        seen.add(serial);
        nextRecords.push({
          id: warrantyIdFromSerial(serial),
          serial,
          productCode: validated.cleanProductCode,
          productName: productName.trim(),
          batchCode: batchForSerial,
          warrantyMonths: validated.months,
          qrUrl: buildWarrantyQrUrl(serial),
          status: "unused",
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          purchasePlace: "",
          purchaseDate: "",
          activatedAt: "",
          activatedDate: "",
          termMonths: validated.months,
          expiryDate: "",
          specNotes: persist ? "Serial tạo từ công cụ tem QR bảo hành." : "Serial TEST chỉ dùng để xuất thử PDF, chưa lưu Firebase.",
          activationSource: "admin",
          createdAt: now,
          updatedAt: now,
        });
      }

      if (nextRecords.length < quantity && serialNumberMode === "random") {
        showToast(`Chỉ tạo được ${nextRecords.length}/${quantity} serial random không trùng. Vui lòng bấm tạo tiếp nếu cần thêm.`, "warning");
      }

      if (!nextRecords.length) {
        showToast("Tất cả serial trong dải này đã tồn tại, chưa tạo thêm record mới.", "error");
        return;
      }

      if (persist) {
        await addWarrantiesBulk(nextRecords);
      }
      setSerials(nextRecords);
      setSelectedSerial(nextRecords[0]?.serial || "");
      showToast(`${persist ? "Đã tạo và lưu" : "Đã tạo thử"} ${nextRecords.length} serial ${serialNumberMode === "random" ? "random" : "tuần tự"}${duplicateSerials.length ? `, bỏ qua ${duplicateSerials.length} serial trùng.` : "."}`, duplicateSerials.length ? "warning" : "success");
    } finally {
      setBusy(false);
    }
  };

  const renderWarrantyLabel = async (record: WarrantyRecord, targetWidth = 1200) => {
    const template = await loadImage(templateUrl);
    const canvas = document.createElement("canvas");
    const scale = targetWidth / template.naturalWidth;
    canvas.width = targetWidth;
    canvas.height = Math.round(template.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Không tạo được canvas tem.");

    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    const qrUrl = record.qrUrl || buildWarrantyQrUrl(record.serial);
    const qrArea = {
      x: canvas.width * 0.235,
      y: canvas.height * 0.365,
      size: Math.min(canvas.width * 0.53, canvas.height * 0.34),
    };
    const qrPadding = qrArea.size * 0.055;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      width: Math.round(qrArea.size - qrPadding * 2),
    });
    const qrImg = await loadImage(qrDataUrl);

    const qrRadius = qrArea.size * 0.075;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(qrArea.x, qrArea.y, qrArea.size, qrArea.size, qrRadius);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrArea.x, qrArea.y, qrArea.size, qrArea.size);
    ctx.drawImage(qrImg, qrArea.x + qrPadding, qrArea.y + qrPadding, qrArea.size - qrPadding * 2, qrArea.size - qrPadding * 2);
    ctx.restore();

    const serialBoxW = canvas.width * 0.78;
    const serialBoxH = canvas.height * 0.055;
    const serialBoxX = (canvas.width - serialBoxW) / 2;
    const serialBoxY = Math.min(qrArea.y + qrArea.size + canvas.height * 0.018, canvas.height * 0.79);
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.strokeStyle = "#D89A2B";
    ctx.lineWidth = Math.max(2, canvas.width * 0.003);
    ctx.beginPath();
    ctx.roundRect(serialBoxX, serialBoxY, serialBoxW, serialBoxH, canvas.width * 0.01);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.round(canvas.width * 0.032)}px Arial, sans-serif`;
    ctx.fillStyle = "#D89A2B";
    const prefix = "Serial:";
    const prefixWidth = ctx.measureText(prefix).width;
    const serialWidth = ctx.measureText(record.serial).width;
    const textStart = canvas.width / 2 - (prefixWidth + serialWidth + canvas.width * 0.018) / 2;
    ctx.textAlign = "left";
    ctx.fillText(prefix, textStart, serialBoxY + serialBoxH / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(record.serial, textStart + prefixWidth + canvas.width * 0.018, serialBoxY + serialBoxH / 2);

    return canvas.toDataURL("image/png", 1);
  };

  const previewFirst = async () => {
    if (!serials.length) {
      showToast("Tạo danh sách serial thật hoặc tạo thử trước khi xem preview.", "warning");
      return;
    }
    if (serials.length || activePreviewRecord) showToast("Đã cập nhật preview tem đầu tiên.", "success");
  };

  const exportPdf = async () => {
    if (!serials.length) {
      showToast("Vui lòng tạo danh sách serial trước khi xuất PDF.", "warning");
      return;
    }

    setBusy(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageW = 210;
      const pageH = 297;
      const margin = PDF_PAGE_MARGIN;
      const gap = PDF_LABEL_GAP;
      const layout = pdfLayouts[pdfLayout];
const cols = layout.cols;
const rows = layout.rows;
const perPage = cols * rows;
const autoSize = calculateAutoLabelSize(cols, rows);

const slotW = autoSize.slotW;
const slotH = autoSize.slotH;
const drawW = autoSize.drawW;
const drawH = autoSize.drawH;

      for (let index = 0; index < serials.length; index += 1) {
        if (index > 0 && index % perPage === 0) doc.addPage();
        const cellIndex = index % perPage;
        const col = cellIndex % cols;
        const row = Math.floor(cellIndex / cols);
        const imageData = await renderWarrantyLabel(serials[index], PDF_LABEL_RENDER_WIDTH);
        const x = margin + col * (slotW + gap) + (slotW - drawW) / 2;
const y = margin + row * (slotH + gap) + (slotH - drawH) / 2;
        doc.addImage(imageData, "PNG", x, y, drawW, drawH, undefined, "FAST");
      }

      doc.save(`tem-qr-bao-hanh-${normalizeSerialPart(productCode)}-${normalizeSerialPart(batchCode)}.pdf`);
      showToast("Đã xuất PDF in tem.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không xuất được PDF.";
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const data = serials.length ? serials : warranties.filter((item) => item.batchCode === normalizeSerialPart(batchCode) && item.productCode === normalizeSerialPart(productCode));
    if (!data.length) {
      showToast("Chưa có serial để xuất CSV.", "warning");
      return;
    }
    downloadTextFile(toWarrantyCsv(data), `serial-bao-hanh-${normalizeSerialPart(productCode)}-${normalizeSerialPart(batchCode)}.csv`);
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-[#ECECEC] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-gold-dark/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 border border-gold-dark/30 bg-gold-dark/10 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light">
              <QrCode className="h-3.5 w-3.5" />
              Tem QR bảo hành
            </div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
              Tạo tem QR bảo hành điện tử
            </h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-400">
              Tạo serial hàng loạt, lưu vào database ở trạng thái chưa kích hoạt, ghép QR thật cho từng serial và xuất PDF A4 để in tem.
            </p>
          </div>
          <a href="/admin" className="inline-flex h-10 items-center justify-center border border-white/10 px-4 text-[11px] font-display font-bold uppercase tracking-widest text-gray-300 hover:border-gold-light hover:text-gold-light">
            Về quản trị
          </a>
        </header>
        <LoadAdminCatalogueButton />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-5">
            <div className="border border-white/5 bg-[#0B0B0B] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-gold-light">
                <ShieldCheck className="h-4 w-4" />
                Thông tin lô tem
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Field label="Mã sản phẩm">
                  <input list="warranty-product-codes" value={productCode} onChange={(e) => setProductCode(e.target.value)} className={`${inputClass} font-mono uppercase`} placeholder="VT-IW300" />
                  <datalist id="warranty-product-codes">
                    {productOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                  </datalist>
                </Field>
                <Field label="Tên sản phẩm">
                  <input value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} placeholder="Tên sản phẩm Voltara" />
                </Field>
                <Field label="Số lượng tem">
                  <input type="number" min={1} max={MAX_SERIALS_PER_BATCH} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputClass} />
                </Field>
                <Field label="Tháng/năm hoặc mã lô">
                  <input value={batchCode} onChange={(e) => setBatchCode(e.target.value)} className={`${inputClass} font-mono uppercase`} placeholder="2607" />
                </Field>
                <Field label="Thời hạn bảo hành">
                  <select value={warrantyMonths} onChange={(e) => { setWarrantyMonths(Number(e.target.value)); setCustomWarrantyMonths(""); }} className={inputClass}>
                    <option value={6}>6 tháng</option>
                    <option value={12}>12 tháng</option>
                    <option value={18}>18 tháng</option>
                    <option value={24}>24 tháng</option>
                  </select>
                </Field>
                <Field label="Tự điền số tháng">
                  <input type="number" min={1} value={customWarrantyMonths} onChange={(e) => setCustomWarrantyMonths(e.target.value)} className={inputClass} placeholder="VD: 36" />
                </Field>
                <Field label="Kiểu 6 số cuối">
                  <select value={serialNumberMode} onChange={(e) => setSerialNumberMode(e.target.value as SerialNumberMode)} className={inputClass}>
                    <option value="random">Random khó đoán</option>
                    <option value="sequential">Tuần tự nội bộ</option>
                  </select>
                </Field>
                <Field label="Số bắt đầu nếu tuần tự">
                  <input type="number" min={1} value={startNumber} onChange={(e) => setStartNumber(Number(e.target.value))} disabled={serialNumberMode === "random"} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-45`} />
                </Field>
                <Field label="Số tem trên trang PDF">
  <select value={pdfLayout} onChange={(e) => setPdfLayout(e.target.value as PdfLayout)} className={inputClass}>
    {Object.entries(pdfLayouts).map(([value, item]) => (
      <option key={value} value={value}>
        {item.label}
      </option>
    ))}
  </select>

  <span className="mt-1 block text-[10px] text-gray-500">
    A4 dọc: {pdfLayoutInfo.cols} cột x {pdfLayoutInfo.rows} hàng = {pdfLayoutInfo.perPage} tem/trang.
    Kích thước tem tự scale: {pdfLayoutInfo.drawW.toFixed(1)}mm x {pdfLayoutInfo.drawH.toFixed(1)}mm,
    tỷ lệ {(pdfLayoutInfo.scale * 100).toFixed(0)}%.
  </span>
</Field>
              </div>
            </div>

            <div className="border border-white/5 bg-[#0B0B0B] p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-xs font-black uppercase tracking-widest text-white">Ảnh nền tem</h2>
                  <p className="mt-1 text-[11px] text-gray-500">Mặc định dùng /public/images/warranty-qr-template.webp. Có thể upload PNG/JPG/WebP để lưu vào thư viện trình duyệt.</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-10 items-center justify-center gap-2 border border-white/10 px-4 text-[11px] font-display font-black uppercase tracking-widest text-white hover:border-gold-light hover:text-gold-light">
                  <ImagePlus className="h-4 w-4" />
                  Upload nền tem
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onTemplateFile(e.target.files)} />
              </div>
              <div className="flex flex-wrap gap-3">
                <TemplateThumb active={templateUrl === DEFAULT_TEMPLATE_URL} src={DEFAULT_TEMPLATE_URL} label="Mẫu mặc định" onClick={() => setTemplateUrl(DEFAULT_TEMPLATE_URL)} />
                {templateLibrary.map((item, index) => (
                  <TemplateThumb key={item.slice(0, 80) + index} active={templateUrl === item} src={item} label={`Mẫu đã upload ${index + 1}`} onClick={() => setTemplateUrl(item)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <ActionButton disabled={busy} onClick={() => generateSerials(true)} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} label="Tạo & lưu serial" />
              <ActionButton disabled={busy} onClick={() => generateSerials(false)} icon={<Eye className="h-4 w-4" />} label="Tạo thử PDF" variant="ghost" />
              <ActionButton disabled={busy || !activePreviewRecord} onClick={previewFirst} icon={<Eye className="h-4 w-4" />} label="Xem trước tem" variant="outline" />
              <ActionButton disabled={busy || !serials.length} onClick={exportPdf} icon={<Download className="h-4 w-4" />} label="Xuất PDF in tem" variant="outline" />
              <ActionButton disabled={busy} onClick={exportCsv} icon={<FileSpreadsheet className="h-4 w-4" />} label="Xuất CSV serial" variant="ghost" />
            </div>

            <div className="border border-white/5 bg-[#0B0B0B] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-xs font-black uppercase tracking-widest text-white">Danh sách serial vừa tạo</h2>
                <span className="text-[11px] text-gray-500">{serials.length} serial</span>
              </div>
              {serials.length ? (
                <div className="max-h-[420px] divide-y divide-white/5 overflow-y-auto border border-white/5">
                  {serials.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSerial(item.serial)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${selectedSerial === item.serial ? "bg-gold-dark/10 text-gold-light" : "bg-black/40 hover:bg-white/[0.03]"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[11px] font-bold">{item.serial}</span>
                        <span className="block truncate text-[10px] text-gray-500">{item.qrUrl}</span>
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-widest text-gray-500">{warrantyRecordStatusLabel(item.status)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 p-8 text-center text-xs text-gray-500">
                  Chưa tạo serial. Nhập thông tin lô tem rồi bấm “Tạo danh sách serial”.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="border border-gold-dark/30 bg-[#0B0B0B] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
  <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">
    Preview tem
  </h2>
  <span className="text-[10px] text-gray-500">
    {pdfLayoutInfo.drawW.toFixed(1)} x {pdfLayoutInfo.drawH.toFixed(1)}mm
  </span>
</div>
              <div className="overflow-hidden border border-gold-dark/30 bg-black p-3">
                <canvas ref={previewCanvasRef} className="h-auto w-full" />
              </div>
              <p className="mt-3 break-all text-[11px] leading-relaxed text-gray-500">
                QR URL: {activePreviewRecord?.qrUrl || "Chưa có serial để tạo QR"}
              </p>
            </div>

            <div className="border border-white/5 bg-[#0B0B0B] p-4 text-xs leading-relaxed text-gray-400">
              <div className="mb-2 flex items-center gap-2 font-display font-bold uppercase tracking-widest text-gold-light">
                <Save className="h-4 w-4" />
                Lưu ý test
              </div>
              Dùng <span className="font-mono text-white">Tạo thử PDF</span> để preview/xuất PDF mà không lưu Firebase. Chỉ nút <span className="font-mono text-white">Tạo & lưu serial</span> mới ghi serial thật với status <span className="font-mono text-white">unused</span>.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-[10px] font-display font-bold uppercase tracking-widest text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function TemplateThumb({ active, src, label, onClick }: { active: boolean; src: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-24 border p-1 text-left transition-colors ${active ? "border-gold-light" : "border-white/10 hover:border-gold-light"}`}
      title={label}
    >
      <div className="aspect-[3/4] bg-black">
        <img src={src} alt="" className="h-full w-full object-contain" />
      </div>
      <div className="mt-1 truncate text-[10px] text-gray-500">{label}</div>
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
      className={`inline-flex h-11 items-center justify-center gap-2 px-4 text-[11px] font-display font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${variant === "primary" ? "gold-gradient-bg text-black hover:opacity-90" : ""} ${variant === "outline" ? "border border-white/10 text-white hover:border-gold-light hover:text-gold-light" : ""} ${variant === "ghost" ? "border border-white/5 text-gray-400 hover:border-gold-light hover:text-gold-light" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}
