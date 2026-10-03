import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Send, ShoppingCart, Trash2, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getProductHref } from "../lib/productRoutes";
import { VIETNAM_LOCATIONS } from "../lib/vietnamLocations";
import { announceOrderSuccess } from "../lib/orderSuccess";

export default function CartDrawer() {
  const {
    cartItems,
    products,
    isCartOpen,
    closeCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    addQuoteRequest,
    showToast,
  } = useApp();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const detailedItems = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((prod) => prod.id === item.productId);
        const variant = product?.variants?.find((entry) => entry.id === item.variantId);
        const combo = product?.combos?.find((entry) => entry.id === item.comboId);
        return product ? { ...item, product, variant, combo } : null;
      })
      .filter(Boolean);
  }, [cartItems, products]);
  const selectedProvince = VIETNAM_LOCATIONS.find((location) => location.province === province);
  const districtOptions = selectedProvince?.districts || [];
  const cartTotalValue = detailedItems.reduce((total, item) => {
    if (!item) return total;
    return total + getCartItemUnitPriceValue(item) * item.quantity;
  }, 0);
  const cartTotalLabel = cartTotalValue ? formatPriceNumber(cartTotalValue) : "Liên hệ";

  if (!isCartOpen) return null;

  const resetCheckoutForm = () => {
    setCustomerName("");
    setPhone("");
    setEmail("");
    setProvince("");
    setDistrict("");
    setAddress("");
    setNotes("");
  };

  const handleSubmitCart = (event: React.FormEvent) => {
    event.preventDefault();

    if (!detailedItems.length) {
      showToast("Giỏ hàng đang trống.", "warning");
      return;
    }

    if (!customerName.trim() || !phone.trim() || !province.trim() || !district.trim() || !address.trim()) {
      showToast("Vui lòng điền họ tên, số điện thoại, tỉnh/thành, quận/huyện và địa chỉ nhận hàng.", "warning");
      return;
    }

    const productLines = detailedItems.map((item) => {
      if (!item) return "";
      const variantName = item.variant?.name || item.variantName;
      const comboName = item.combo?.name || item.comboName;
      const unitPriceValue = getCartItemUnitPriceValue(item);
      const originalPriceValue = getCartItemOriginalPriceValue(item);
      const originalTotal = originalPriceValue && unitPriceValue && originalPriceValue > unitPriceValue ? formatPriceNumber(originalPriceValue * item.quantity) : "";
      const unitPrice = unitPriceValue ? formatPriceNumber(unitPriceValue) : "Liên hệ";
      const lineTotal = unitPriceValue ? formatPriceNumber(unitPriceValue * item.quantity) : "Liên hệ";
      return `- ${item.product.name}${variantName ? ` - Phân loại: ${variantName}` : ""}${comboName ? ` - Combo: ${comboName}` : ""} | SKU: ${item.combo?.sku || item.comboSku || item.variant?.sku || item.variantSku || item.product.sku || item.product.id} | SL: ${item.quantity} | Đơn giá: ${unitPrice} | ${originalTotal ? `Giá gốc: ${originalTotal} | ` : ""}Tổng: ${lineTotal}`;
    }).filter(Boolean);
    const fullAddress = `${address.trim()}, ${district.trim()}, ${province.trim()}`;

    addQuoteRequest({
      id: "cart-order-" + Date.now(),
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      province: province.trim(),
      address: fullAddress,
      productName: `Đơn hàng giỏ hàng (${detailedItems.length} sản phẩm)`,
      batteryType: "Đặt hàng từ giỏ hàng",
      voltage: "Nhiều sản phẩm",
      capacity: "Nhiều sản phẩm",
      notes: [
        "Loại yêu cầu: Đặt hàng từ giỏ hàng",
        ...productLines,
        `Tổng đơn hàng: ${cartTotalLabel}`,
        `Tỉnh / thành: ${province.trim()}`,
        `Quận / huyện: ${district.trim()}`,
        `Địa chỉ chi tiết: ${address.trim()}`,
        notes.trim() ? `Ghi chú: ${notes.trim()}` : "",
      ].filter(Boolean).join("\n"),
      date: new Date().toISOString(),
      status: "Chờ xử lý",
    });

    clearCart();
    resetCheckoutForm();
    setIsCheckoutOpen(false);
    closeCart();
    showToast("Đã gửi đơn hàng từ giỏ hàng vào admin.", "success");
    announceOrderSuccess("cart");
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" onClick={closeCart} />
      <aside className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-gold-dark/30 bg-[#080808] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gold-light" />
            <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">Giỏ hàng</h2>
          </div>
          <button type="button" onClick={closeCart} className="p-2 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {detailedItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingCart className="mb-4 h-10 w-10 text-gray-700" />
              <p className="font-display text-xs font-bold uppercase tracking-widest text-gray-500">Giỏ hàng đang trống</p>
              <Link to="/san-pham" onClick={closeCart} className="mt-5 border border-gold-dark/40 px-5 py-3 text-[11px] font-display font-bold uppercase tracking-widest text-gold-light hover:border-gold-light">
                Xem sản phẩm
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {detailedItems.map((item) => {
                if (!item) return null;
                const unitPriceValue = getCartItemUnitPriceValue(item);
                const originalPriceValue = getCartItemOriginalPriceValue(item);
                const shouldShowOriginalPrice = Boolean(originalPriceValue && unitPriceValue && originalPriceValue > unitPriceValue);
                const lineTotal = unitPriceValue ? formatPriceNumber(unitPriceValue * item.quantity) : "Liên hệ";
                const originalLineTotal = shouldShowOriginalPrice ? formatPriceNumber(originalPriceValue * item.quantity) : "";
                const unitPrice = unitPriceValue ? formatPriceNumber(unitPriceValue) : "Liên hệ";

                return (
                <div key={`${item.productId}-${item.variant?.id || item.variantId || "default"}-${item.combo?.id || item.comboId || "single"}`} className="border border-white/10 bg-[#101010] p-3">
                  <div className="flex gap-3">
                    <Link to={getProductHref(item.product)} onClick={closeCart} className="h-20 w-20 shrink-0 border border-white/10 bg-black p-1">
                      <img src={item.combo?.image || item.comboImage || item.variant?.image || item.variantImage || item.product.image} alt={item.product.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={getProductHref(item.product)} onClick={closeCart} className="line-clamp-2 text-xs font-display font-bold uppercase leading-relaxed text-white hover:text-gold-light">
                        {item.product.name}
                      </Link>
                      {(item.variant?.name || item.variantName) && (
                        <div className="mt-1 text-[10px] font-display font-bold uppercase tracking-wider text-gold-light">Phân loại: {item.variant?.name || item.variantName}</div>
                      )}
                      {(item.combo?.name || item.comboName) && (
                        <div className="mt-1 text-[10px] font-display font-bold uppercase tracking-wider text-gold-light">Combo: {item.combo?.name || item.comboName}</div>
                      )}
                      <div className="mt-1 text-[10px] font-mono uppercase text-gray-500">SKU: {item.combo?.sku || item.comboSku || item.variant?.sku || item.variantSku || item.product.sku || item.product.id}</div>
                      {originalLineTotal && (
                        <div className="mt-1 text-[11px] font-semibold text-gray-500 line-through">{originalLineTotal}</div>
                      )}
                      <div className="mt-1 text-xs font-display font-black text-gold-light">{lineTotal}</div>
                      {item.quantity > 1 && unitPriceValue > 0 && (
                        <div className="mt-1 text-[10px] text-gray-500">Đơn giá: {unitPrice} x {item.quantity}</div>
                      )}
                    </div>
                    <button type="button" onClick={() => removeFromCart(item.productId, item.variant?.id || item.variantId || "", item.combo?.id || item.comboId || "")} className="self-start p-1.5 text-gray-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-gray-500">Số lượng</span>
                    <div className="flex items-center border border-white/10 bg-black">
                      <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity - 1, item.variant?.id || item.variantId || "", item.combo?.id || item.comboId || "")} className="p-2 text-gray-400 hover:text-white">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-xs font-bold text-white">{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity + 1, item.variant?.id || item.variantId || "", item.combo?.id || item.comboId || "")} className="p-2 text-gray-400 hover:text-white">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {detailedItems.length > 0 && (
          <div className="border-t border-white/10 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="text-[10px] font-display font-bold uppercase tracking-widest text-gray-500">Tổng tạm tính</span>
              <span className="text-base font-display font-black text-gold-light">{cartTotalLabel}</span>
            </div>
            <button type="button" onClick={() => setIsCheckoutOpen(true)} className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-gold-dark to-gold-light px-5 py-3 text-[11px] font-display font-black uppercase tracking-widest text-black">
              <ShoppingCart className="h-4 w-4" />
              Đặt hàng
            </button>
          </div>
        )}
      </aside>

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl border border-gold-dark/40 bg-[#0C0C0C] shadow-[0_0_50px_rgba(218,154,43,0.16)]">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gold-light" />
                <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">Thông tin đặt hàng</h3>
              </div>
              <button type="button" onClick={() => setIsCheckoutOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCart} className="max-h-[78vh] overflow-y-auto p-5 space-y-3">
              <div className="border border-white/10 bg-[#111] p-3 text-[11px] leading-relaxed text-gray-300">
                <div className="font-display font-bold uppercase tracking-widest text-gold-light">{detailedItems.length} sản phẩm trong giỏ</div>
                <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/5 pt-2">
                  <span className="text-gray-500">Tổng tạm tính</span>
                  <span className="font-display font-black text-gold-light">{cartTotalLabel}</span>
                </div>
                <div className="mt-1 text-gray-500">Điền thông tin để Xưởng In 3D xác nhận đơn và giao hàng.</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Họ tên *" className={inputClass()} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại / Zalo *" className={inputClass()} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email nếu có" className={inputClass()} />
                <select
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setDistrict("");
                  }}
                  className={inputClass()}
                >
                  <option value="">Chọn tỉnh / thành *</option>
                  {VIETNAM_LOCATIONS.map((location) => (
                    <option key={location.province} value={location.province}>{location.province}</option>
                  ))}
                </select>
              </div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!province}
                className={inputClass()}
              >
                <option value="">{province ? "Chọn quận / huyện *" : "Chọn tỉnh / thành trước"}</option>
                {districtOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, tên đường, phường/xã *" className={inputClass()} />
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú đơn hàng, giờ nhận, xuất hóa đơn..." className={`${inputClass()} resize-none`} />

              <button type="submit" className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-gold-dark to-gold-light px-5 py-3 text-[11px] font-display font-black uppercase tracking-widest text-black">
                <Send className="h-4 w-4" />
                Gửi đơn hàng
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function inputClass() {
  return "w-full bg-black border border-white/10 px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:border-gold-light focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
}

function getCartItemUnitPriceValue(item: any): number {
  return parsePriceNumber(
    item.combo?.comboPrice ||
    item.comboPrice ||
    item.variant?.salePrice ||
    item.variantSalePrice ||
    item.variant?.price ||
    item.variantPrice ||
    item.product.salePrice ||
    item.product.price,
  );
}

function getCartItemOriginalPriceValue(item: any): number {
  return parsePriceNumber(
    item.combo?.originalPrice ||
    item.comboOriginalPrice ||
    item.variant?.price ||
    item.variantPrice ||
    item.product.price,
  );
}

function parsePriceNumber(price: string | undefined): number {
  const digits = String(price || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatPriceNumber(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString("vi-VN")}đ`;
}
