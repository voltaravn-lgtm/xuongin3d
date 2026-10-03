import React, { useEffect, useState } from "react";
import { X, Send, ShoppingCart, ShieldCheck, MapPin, Phone, User, FileText, Minus, Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { QuoteRequest } from "../types";
import { announceOrderSuccess } from "../lib/orderSuccess";

interface OrderRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  variantName?: string;
  comboName?: string;
  comboDescription?: string;
  comboOriginalPrice?: string;
  productPrice: string;
  productSku?: string;
  productId?: string;
}

export default function OrderRequestModal({ isOpen, onClose, productName, variantName, comboName, comboDescription, comboOriginalPrice, productPrice, productSku, productId }: OrderRequestModalProps) {
  const { addQuoteRequest, showToast } = useApp();
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    province: "",
    address: "",
    quantity: "1",
    notes: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setIsSuccess(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const quantity = Math.max(1, Math.floor(Number(form.quantity) || 1));
  const unitPriceValue = parsePriceNumber(productPrice);
  const originalPriceValue = parsePriceNumber(comboOriginalPrice);
  const shouldShowOriginalPrice = Boolean(originalPriceValue && unitPriceValue && originalPriceValue > unitPriceValue);
  const unitPriceLabel = productPrice || "Liên hệ";
  const totalPriceLabel = unitPriceValue ? formatPriceNumber(unitPriceValue * quantity) : unitPriceLabel;
  const totalOriginalPriceLabel = shouldShowOriginalPrice && originalPriceValue ? formatPriceNumber(originalPriceValue * quantity) : "";

  const updateQuantity = (nextQuantity: number) => {
    setForm((prev) => ({ ...prev, quantity: String(Math.max(1, Math.floor(nextQuantity || 1))) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
      showToast("Vui lòng điền họ tên, số điện thoại và địa chỉ nhận hàng.", "warning");
      return;
    }

    const newRequest: QuoteRequest = {
      id: "order-req-" + Date.now(),
      customerName: form.customerName,
      phone: form.phone,
      email: form.email,
      province: form.province || "Chưa cung cấp",
      address: form.address,
      productName: [productName, variantName, comboName].filter(Boolean).join(" - "),
      batteryType: "Đặt hàng sản phẩm có giá",
      voltage: "Không áp dụng",
      capacity: "Không áp dụng",
      notes: [
        productId ? `Product ID: ${productId}` : "",
        variantName ? `Phân loại: ${variantName}` : "",
        comboName ? `Combo: ${comboName}` : "",
        comboDescription ? `Thành phần combo: ${comboDescription}` : "",
        productSku ? `SKU: ${productSku}` : "",
        totalOriginalPriceLabel ? `Giá gốc: ${totalOriginalPriceLabel}` : "",
        `Loại yêu cầu: Đặt hàng`,
        `Đơn giá: ${unitPriceLabel}`,
        `Số lượng: ${quantity}`,
        `Tổng tiền: ${totalPriceLabel}`,
        form.notes ? `Ghi chú: ${form.notes}` : "",
      ].filter(Boolean).join("\n"),
      date: new Date().toISOString(),
      status: "Chờ xử lý",
    };

    addQuoteRequest(newRequest);
    setIsSuccess(true);
    showToast(`Đã tiếp nhận đơn đặt hàng cho "${productName}".`, "success");
    announceOrderSuccess("product");

    setTimeout(() => {
      setForm({
        customerName: "",
        phone: "",
        email: "",
        province: "",
        address: "",
        quantity: "1",
        notes: "",
      });
      setIsSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0C0C0C] border border-gold-dark/40 shadow-[0_0_50px_rgba(218,154,43,0.15)] overflow-hidden rounded-xl z-10">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-dark via-gold-light to-gold-dark" />

        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gold-light" />
            <h3 className="font-display font-black text-sm uppercase tracking-widest text-white">
              Đặt hàng sản phẩm
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gold-dark/10 border border-gold-light flex items-center justify-center text-gold-light mb-4 animate-pulse">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-white font-display font-extrabold uppercase text-base tracking-widest mb-3">
                Đã nhận đơn hàng!
              </h4>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed px-4">
                Xưởng In 3D sẽ liên hệ xác nhận sản phẩm <strong className="text-gold-light">"{productName}"</strong> và thông tin giao hàng.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="bg-[#121212] border border-gold-dark/10 p-4 rounded-md">
                <p className="text-[10px] font-mono uppercase text-gold-light tracking-widest mb-1">Sản phẩm đặt hàng:</p>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <div className="text-white font-display font-bold text-xs uppercase tracking-wide">{productName}</div>
                    {variantName && <div className="mt-1 text-[10px] font-display font-bold uppercase tracking-wider text-gold-light">Phân loại: {variantName}</div>}
                    {comboName && <div className="mt-1 text-[10px] font-display font-bold uppercase tracking-wider text-gold-light">Combo: {comboName}</div>}
                    {comboDescription && <div className="mt-1 text-[10px] leading-relaxed text-gray-400">{comboDescription}</div>}
                    {totalOriginalPriceLabel && <div className="mt-1 text-[11px] font-semibold text-gray-500 line-through">{totalOriginalPriceLabel}</div>}
                    <div className="mt-1 text-gold-light font-display font-black text-sm">{totalPriceLabel}</div>
                    {quantity > 1 && unitPriceValue && (
                      <div className="mt-1 text-[10px] text-gray-500">Đơn giá: {unitPriceLabel} x {quantity}</div>
                    )}
                    {productSku && <div className="mt-1 text-[10px] font-mono uppercase text-gray-500">SKU: {productSku}</div>}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center border border-white/10 bg-black">
                    <button type="button" onClick={() => updateQuantity(quantity - 1)} className="p-2 text-gray-400 transition-colors hover:text-white" aria-label="Giảm số lượng">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-xs font-bold text-white">{quantity}</span>
                    <button type="button" onClick={() => updateQuantity(quantity + 1)} className="p-2 text-gray-400 transition-colors hover:text-white" aria-label="Tăng số lượng">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Họ tên" required icon={<User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}>
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputClass("pl-9")} placeholder="Nguyễn Văn A" />
                </Field>
                <Field label="Số điện thoại / Zalo" required icon={<Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass("pl-9")} placeholder="09xx xxx xxx" />
                </Field>
              </div>

              <Field label="Email nếu có">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass()} placeholder="contact@gmail.com" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tỉnh / thành" icon={<MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}>
                  <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={inputClass("pl-9")} placeholder="Hồ Chí Minh, Hà Nội..." />
                </Field>
                <Field label="Số lượng">
                  <div className="flex overflow-hidden rounded-md border border-white/10 bg-[#141414] focus-within:border-gold-dark">
                    <button type="button" onClick={() => updateQuantity(quantity - 1)} className="px-3 text-gray-400 transition-colors hover:text-white" aria-label="Giảm số lượng">
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => updateQuantity(Number(e.target.value))}
                      className="w-full bg-transparent px-3 py-2 text-center text-xs font-bold text-white focus:outline-none"
                      placeholder="1"
                    />
                    <button type="button" onClick={() => updateQuantity(quantity + 1)} className="px-3 text-gray-400 transition-colors hover:text-white" aria-label="Tăng số lượng">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </Field>
              </div>

              <Field label="Địa chỉ nhận hàng" required>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass()} placeholder="Số nhà, phường/xã, quận/huyện..." />
              </Field>

              <Field label="Ghi chú đơn hàng">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ví dụ: cần giao giờ hành chính, xuất hóa đơn, tư vấn thêm phụ kiện..."
                  className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none resize-none rounded-md"
                />
              </Field>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-dark to-gold-light hover:opacity-95 text-black font-display font-bold text-xs uppercase tracking-widest py-3 hover:shadow-[0_0_20px_rgba(218,154,43,0.3)] transition-all cursor-pointer rounded-md">
                <Send className="w-4 h-4" />
                Gửi đơn đặt hàng
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, icon, children }: { label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
        {label} {required && <span className="text-gold-light">*</span>}
      </span>
      <span className="relative block">{icon}{children}</span>
    </label>
  );
}

function inputClass(extra = "") {
  return `w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none rounded-md ${extra}`;
}

function parsePriceNumber(price: string | undefined): number {
  const digits = String(price || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatPriceNumber(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString("vi-VN")}đ`;
}
