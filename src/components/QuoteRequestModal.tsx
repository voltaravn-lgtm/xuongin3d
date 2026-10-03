import React, { useState, useEffect } from "react";
import { X, Send, Box, ShieldCheck, MapPin, Phone, User, FileText } from "lucide-react";
import { useApp } from "../context/AppContext";
import { QuoteRequest } from "../types";

interface QuoteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  prepopulatedProduct?: string;
}

export default function QuoteRequestModal({
  isOpen,
  onClose,
  prepopulatedProduct = "",
}: QuoteRequestModalProps) {
  const { addQuoteRequest, showToast } = useApp();

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    province: "",
    address: "",
    productName: prepopulatedProduct,
    batteryType: "Chưa xác định vật liệu",
    voltage: "",
    capacity: "",
    notes: "",
  });

  const [isSuccess, setIsSuccess] = useState(false);

  // Sync prepopulated product when it changes
  useEffect(() => {
    if (prepopulatedProduct) {
      setForm((prev) => ({ ...prev, productName: prepopulatedProduct }));
    }
  }, [prepopulatedProduct]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customerName.trim() || !form.phone.trim() || !form.productName.trim()) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "warning");
      return;
    }

    const newRequest: QuoteRequest = {
      id: "quote-req-" + Date.now(),
      customerName: form.customerName,
      phone: form.phone,
      email: form.email,
      province: form.province || "Chưa cung cấp",
      address: form.address || "Chưa cung cấp",
      productName: form.productName,
      batteryType: form.batteryType,
      voltage: form.voltage || "Mặc định",
      capacity: form.capacity || "Mặc định",
      notes: form.notes,
      date: new Date().toISOString(),
      status: "Chờ xử lý",
    };

    addQuoteRequest(newRequest);
    setIsSuccess(true);
    showToast(`Đã tiếp nhận yêu cầu báo giá cho sản phẩm "${form.productName}" thành công!`, "success");

    setTimeout(() => {
      setIsSuccess(false);
      // Reset form (except product name)
      setForm({
        customerName: "",
        phone: "",
        email: "",
        province: "",
        address: "",
        productName: prepopulatedProduct,
        batteryType: "Chưa xác định vật liệu",
        voltage: "",
        capacity: "",
        notes: "",
      });
      onClose();
    }, 3000);
  };

  return (
    <div
      id="quote-request-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      {/* Backdrop dismiss */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0C0C0C] border border-gold-dark/40 shadow-[0_0_50px_rgba(218,154,43,0.15)] overflow-hidden rounded-xl z-10">
        {/* Decorative gold border line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-dark via-gold-light to-gold-dark animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-gold-light animate-bounce" />
            <h3 className="font-display font-black text-sm uppercase tracking-widest text-white">
              Yêu Cầu Tư Vấn & Báo Giá
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gold-dark/10 border border-gold-light flex items-center justify-center text-gold-light mb-4 animate-pulse">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-white font-display font-extrabold uppercase text-base tracking-widest mb-3">
                GỬI YÊU CẦU THÀNH CÔNG!
              </h4>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed px-4">
                Thông tin báo giá sản phẩm <strong className="text-gold-light">"{form.productName}"</strong> đã được chuyển tới Xưởng In 3D. Chúng tôi sẽ phản hồi sớm nhất có thể.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="bg-[#121212] border border-gold-dark/10 p-4 mb-4 rounded-md">
                <p className="text-[10px] font-mono uppercase text-gold-light tracking-widest mb-1">Sản phẩm yêu cầu báo giá:</p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    required
                    value={form.productName}
                    onChange={(e) => setForm({ ...form, productName: e.target.value })}
                    className="w-full bg-transparent text-white font-display font-bold text-xs uppercase tracking-wide focus:outline-none focus:border-b focus:border-gold-dark pb-0.5"
                    placeholder="Tên sản phẩm hoặc ý tưởng cần thực hiện..."
                  />
                </div>
              </div>

              {/* Customer details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Họ Tên Quý Khách <span className="text-gold-light">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 pl-9 text-xs text-white focus:outline-none rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Số Điện Thoại / Zalo <span className="text-gold-light">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="09xx xxx xxx"
                      className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 pl-9 text-xs text-white focus:outline-none rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                  Địa Chỉ E-mail (Nếu có)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@gmail.com"
                  className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none rounded-md"
                />
              </div>

              {/* Location details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Tỉnh / Thành
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value })}
                      placeholder="Hồ Chí Minh, Hà Nội,..."
                      className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 pl-9 text-xs text-white focus:outline-none rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Vật liệu mong muốn
                  </label>
                  <select
                    value={form.batteryType}
                    onChange={(e) => setForm({ ...form, batteryType: e.target.value })}
                    className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none rounded-md"
                  >
                    <option value="Chưa xác định vật liệu">Cần xưởng tư vấn</option>
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="TPU">TPU dẻo</option>
                    <option value="Resin">Resin</option>
                  </select>
                </div>
              </div>

              {/* Technical expectations */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Kích thước dự kiến
                  </label>
                  <input
                    type="text"
                    value={form.voltage}
                    onChange={(e) => setForm({ ...form, voltage: e.target.value })}
                    placeholder="Bỏ trống nếu không rõ"
                    className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Số lượng dự kiến
                  </label>
                  <input
                    type="text"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="Bỏ trống nếu không rõ"
                    className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                  Mô tả thêm về yêu cầu
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Mục đích sử dụng, màu sắc, thời gian cần nhận hoặc đường dẫn file 3D..."
                  className="w-full bg-[#141414] border border-white/10 focus:border-gold-dark px-3 py-2 text-xs text-white focus:outline-none resize-none rounded-md"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-dark to-gold-light hover:opacity-95 text-black font-display font-bold text-xs uppercase tracking-widest py-3 hover:shadow-[0_0_20px_rgba(218,154,43,0.3)] transition-all cursor-pointer rounded-md"
              >
                <Send className="w-4 h-4" />
                GỬI YÊU CẦU BÁO GIÁ NGAY
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
