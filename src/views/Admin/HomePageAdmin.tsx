import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Save, Zap, HelpCircle } from "lucide-react";

export default function HomePageAdmin() {
  const { homeContent, setHomeContent, showToast } = useApp();

  const [form, setForm] = useState({
    feature1Title: homeContent.feature1Title || "Công Nghệ Tiên Tiến",
    feature1Desc: homeContent.feature1Desc || "Nhận file, hình ảnh, bản vẽ hoặc mẫu thật.",
    feature2Title: homeContent.feature2Title || "Chất Lượng Vượt Trội",
    feature2Desc: homeContent.feature2Desc || "Vỏ sợi polycarbonate chống vỡ nứt.",
    feature3Title: homeContent.feature3Title || "Thiết Kế Theo Yêu Cầu",
    feature3Desc: homeContent.feature3Desc || "Kích hoạt điện tử tra cứu siêu nhanh.",
    feature4Title: homeContent.feature4Title || "Hệ Thống Toàn Quốc",
    feature4Desc: homeContent.feature4Desc || "Tiếp nhận yêu cầu và hỗ trợ tư vấn 24/7.",
    section2Title: homeContent.section2Title || "Sản Phẩm In 3D Theo Nhu Cầu",
    section2Desc: homeContent.section2Desc || "Đa dạng mẫu mã, vật liệu và kích thước cho cá nhân, gia đình và doanh nghiệp.",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setHomeContent(form);
    showToast("Đã lưu cấu hình nội dung Trang Chủ thành công!", "success");
  };

  const handleChange = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div id="homepage-admin-module" className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2 text-gold-light">
          <Zap className="w-4 h-4 scale-110" />
          QUẢN TRỊ NỘI DUNG TRANG CHỦ
        </h2>
        <p className="text-xs text-gray-400">Tùy chỉnh thông số cốt lõi, danh sách tính năng ưu việt và mô tả các phân đoạn giới thiệu trang chủ.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pt-4">
        
        {/* Features Highlights Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
            <span>1. KHỐI TIÊU CHÍ ƯU VIỆT (4 FEATURE CARDS)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Feature 1 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-3">
              <span className="text-[10px] font-mono text-gold-dark font-bold">#01 TIÊU CHÍ KỸ THUẬT</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tiêu đề (Vd: Công Nghệ Tiên Tiến)"
                  value={form.feature1Title}
                  onChange={(e) => handleChange("feature1Title", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Mô tả ngắn tiêu chí"
                  value={form.feature1Desc}
                  onChange={(e) => handleChange("feature1Desc", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-3">
              <span className="text-[10px] font-mono text-gold-dark font-bold">#02 CHẤT LƯỢNG CHẾ TÁC</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tiêu đề (Vd: Chất Lượng Vượt Trội)"
                  value={form.feature2Title}
                  onChange={(e) => handleChange("feature2Title", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Mô tả cơ khí"
                  value={form.feature2Desc}
                  onChange={(e) => handleChange("feature2Desc", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-3">
              <span className="text-[10px] font-mono text-gold-dark font-bold">#03 THIẾT KẾ THEO YÊU CẦU</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tiêu đề (Vd: Thiết Kế Theo Yêu Cầu)"
                  value={form.feature3Title}
                  onChange={(e) => handleChange("feature3Title", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Mô tả chính sách"
                  value={form.feature3Desc}
                  onChange={(e) => handleChange("feature3Desc", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-3">
              <span className="text-[10px] font-mono text-gold-dark font-bold">#04 QUY MÔ MẠNG LƯỚI</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tiêu đề (Vd: Hệ Thống Toàn Quốc)"
                  value={form.feature4Title}
                  onChange={(e) => handleChange("feature4Title", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Mô tả quy mô phân phối"
                  value={form.feature4Desc}
                  onChange={(e) => handleChange("feature4Desc", e.target.value)}
                  className="w-full bg-black border border-[#222] focus:border-gold-light text-[#ECECEC] px-3 py-2 text-xs focus:outline-none leading-relaxed"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Section 2 Details */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] flex items-center gap-1.5 pb-2 border-b border-[#1A1A1A]">
            <span>2. KHỐI TIỂU ĐỀ GIỚI THIỆU SẢN PHẨM TIÊU BIỂU</span>
          </h3>

          <div className="grid grid-cols-1 gap-4 bg-black/20 p-4 border border-[#1A1A1A]">
            <div className="space-y-1">
              <label className="text-[10px] font-display uppercase tracking-widest text-gray-400 block font-bold">Tiêu đề phần sản phẩm bento</label>
              <input
                type="text"
                value={form.section2Title}
                onChange={(e) => handleChange("section2Title", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-display uppercase tracking-widest text-gray-400 block font-bold">Mô tả định hướng sản phẩm</label>
              <textarea
                rows={3}
                value={form.section2Desc}
                onChange={(e) => handleChange("section2Desc", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] focus:border-gold-light text-[#ECECEC] px-4 py-3 text-sm focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#1A1A1A] flex justify-end">
          <button
            type="submit"
            className="gold-gradient-bg text-black font-display font-bold py-3.5 px-8 text-xs tracking-widest uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            LƯU NỘI DUNG TRANG CHỦ
          </button>
        </div>

      </form>
    </div>
  );
}
