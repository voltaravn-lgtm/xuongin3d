import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Save, FileText, Image } from "lucide-react";

export default function AboutPageAdmin() {
  const { aboutContent, setAboutContent, showToast } = useApp();

  const [form, setForm] = useState({
    section1Subtitle: aboutContent.section1Subtitle || "VỀ XƯỞNG IN 3D",
    section1Title: aboutContent.section1Title || "TỪ Ý TƯỞNG ĐẾN SẢN PHẨM THỰC TẾ",
    section1Desc: aboutContent.section1Desc || "Xưởng In 3D nhận thiết kế, tạo mẫu và sản xuất sản phẩm theo yêu cầu cho cá nhân, gia đình và doanh nghiệp.",
    section1BannerImage: aboutContent.section1BannerImage || "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=1600",
    strategicTitle: aboutContent.strategicTitle || "TẦM NHÌN CHIẾN LƯỢC",
    strategic1Title: aboutContent.strategic1Title || "2030 – Thương Hiệu Nội Địa Dẫn Đầu",
    strategic1Desc: aboutContent.strategic1Desc || "Tiếp nhận file, hình ảnh, bản vẽ hoặc mẫu thật cùng mục đích sử dụng.",
    strategic2Title: aboutContent.strategic2Title || "2035 – Xuất Khẩu Màng Lưới Đông Nam Á",
    strategic2Desc: aboutContent.strategic2Desc || "Xây dựng mạng lưới bán hàng ổn định xuất khẩu sang các thị trường...",
    strategic3Title: aboutContent.strategic3Title || "SẢN XUẤT VÀ BÀN GIAO",
    strategic3Desc: aboutContent.strategic3Desc || "Tham gia phát triển trạm trữ điện trung tâm ESS dòng sạc siêu thọ...",
    missionTitle: aboutContent.missionTitle || "SỨ MỆNH PHỤC VỤ",
    missionDesc: aboutContent.missionDesc || "Giúp khách hàng hiện thực hóa ý tưởng nhanh chóng bằng công nghệ in 3D linh hoạt.",
    coreValuesTitle: aboutContent.coreValuesTitle || "GIÁ TRỊ CỐT LÕI",
    coreValue1Title: aboutContent.coreValue1Title || "Chất lượng",
    coreValue1Desc: aboutContent.coreValue1Desc || "Đặt độ an toàn của người dùng lên hàng đầu.",
    coreValue2Title: aboutContent.coreValue2Title || "Đổi mới",
    coreValue2Desc: aboutContent.coreValue2Desc || "Linh hoạt thiết kế, vật liệu và cách hoàn thiện.",
    coreValue3Title: aboutContent.coreValue3Title || "Hợp tác",
    coreValue3Desc: aboutContent.coreValue3Desc || "Đồng hành trọn vẹn thịnh vượng cùng đại lý ủy quyền.",
    coreValue4Title: aboutContent.coreValue4Title || "Trách nhiệm",
    coreValue4Desc: aboutContent.coreValue4Desc || "An tâm bảo hiểm rủi ro tài sản cao cấp chính hãng.",
    stat1Num: aboutContent.stat1Num || "50+",
    stat1Label: aboutContent.stat1Label || "Đại lý toàn quốc",
    stat2Num: aboutContent.stat2Num || "100.000+",
    stat2Label: aboutContent.stat2Label || "Sản phẩm bàn giao",
    stat3Num: aboutContent.stat3Num || "5.000 m²",
    stat3Label: aboutContent.stat3Label || "Nhà máy hiện đại",
    stat4Num: aboutContent.stat4Num || "3 Năm",
    stat4Label: aboutContent.stat4Label || "Bảo hành chính hãng",
    factorySubtitle: aboutContent.factorySubtitle || "TIÊU CHUẨN ĐỒNG BỘ",
    factoryTitle: aboutContent.factoryTitle || "Nhà Máy Hiện Đại Công Nghệ Tiên Tiến",
    factoryDesc: aboutContent.factoryDesc || "Xưởng tiếp nhận nhiều nhóm sản phẩm từ decor, quà tặng đến mô hình kỹ thuật, POSM và sa bàn.",
    factoryImage: aboutContent.factoryImage || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
    quoteText: aboutContent.quoteText || "Mỗi ý tưởng đều có thể bắt đầu từ một mẫu thử và trở thành sản phẩm thực tế bằng công nghệ in 3D.",
    quoteAuthor: aboutContent.quoteAuthor || "XƯỞNG IN 3D",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAboutContent({
      strategic1Year: aboutContent.strategic1Year || "2030",
      strategic2Year: aboutContent.strategic2Year || "2035",
      strategic3Year: aboutContent.strategic3Year || "2040",
      ...form,
    });
    showToast("Đã lưu nội dung trang Giới Thiệu thành công!", "success");
  };

  const handleChange = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div id="about-admin-module" className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2 text-gold-light">
          <FileText className="w-4 h-4 scale-110" />
          QUẢN TRỊ NỘI DUNG TRANG GIỚI THIỆU
        </h2>
        <p className="text-xs text-gray-400">Hiệu chỉnh Sứ mệnh, Tầm nhìn chiến lược, Giá trị cốt lõi, Số liệu thống kê sinh động và hình ảnh nhà máy Voltara.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 pt-4">
        
        {/* SECTION 1: TOP INTRO */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] pb-2 border-b border-[#1A1A1A]">
            1. PHẦN ĐẦU TRANG (HERO GIỚI THIỆU)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Mục tiêu nhỏ (Vd: VỀ XƯỞNG IN 3D)</label>
              <input
                type="text"
                value={form.section1Subtitle}
                onChange={(e) => handleChange("section1Subtitle", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Tiêu đề lớn (Vd: KÍCH HOẠT TƯƠNG LAI)</label>
              <input
                type="text"
                value={form.section1Title}
                onChange={(e) => handleChange("section1Title", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none font-bold"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Nội dung giới thiệu chính</label>
              <textarea
                rows={3}
                value={form.section1Desc}
                onChange={(e) => handleChange("section1Desc", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[10px] text-[#F5C45A] uppercase font-bold">Đường dẫn ảnh Banner mặt định (Image URL)</label>
              <input
                type="text"
                value={form.section1BannerImage}
                onChange={(e) => handleChange("section1BannerImage", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none font-mono"
                placeholder="Nhập URL hình ảnh làm banner tương tác..."
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: VISION TIMELINE */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] pb-2 border-b border-[#1A1A1A]">
            2. TẦM NHÌN CHIẾN LƯỢC (3 MỐC THỜI GIAN)
          </h3>
          <div className="space-y-1 mb-2">
            <label className="text-[10px] text-gray-400 uppercase font-bold">Tên tiêu đề phân đoạn</label>
            <input
              type="text"
              value={form.strategicTitle}
              onChange={(e) => handleChange("strategicTitle", e.target.value)}
              className="w-full md:w-1/2 bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {/* 2030 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-2">
              <input
                type="text"
                value={form.strategic1Title}
                onChange={(e) => handleChange("strategic1Title", e.target.value)}
                className="bg-black border border-[#222] text-xs px-3 py-1 text-gold-light focus:outline-none font-bold w-full md:w-1/2"
              />
              <textarea
                rows={2}
                value={form.strategic1Desc}
                onChange={(e) => handleChange("strategic1Desc", e.target.value)}
                className="w-full bg-black border border-[#222] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
            {/* 2035 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-2">
              <input
                type="text"
                value={form.strategic2Title}
                onChange={(e) => handleChange("strategic2Title", e.target.value)}
                className="bg-black border border-[#222] text-xs px-3 py-1 text-gold-light focus:outline-none font-bold w-full md:w-1/2"
              />
              <textarea
                rows={2}
                value={form.strategic2Desc}
                onChange={(e) => handleChange("strategic2Desc", e.target.value)}
                className="w-full bg-black border border-[#222] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
            {/* 2040 */}
            <div className="p-4 bg-black/40 border border-[#1A1A1A] space-y-2">
              <input
                type="text"
                value={form.strategic3Title}
                onChange={(e) => handleChange("strategic3Title", e.target.value)}
                className="bg-black border border-[#222] text-xs px-3 py-1 text-gold-light focus:outline-none font-bold w-full md:w-1/2"
              />
              <textarea
                rows={2}
                value={form.strategic3Desc}
                onChange={(e) => handleChange("strategic3Desc", e.target.value)}
                className="w-full bg-black border border-[#222] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: MISSION & VALUES */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] pb-2 border-b border-[#1A1A1A]">
            3. PHẦN SỨ MỆNH & GIÁ TRỊ CỐT LÕI
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Tiêu đề Sứ mệnh</label>
              <input
                type="text"
                value={form.missionTitle}
                onChange={(e) => handleChange("missionTitle", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Kinh văn Sứ mệnh (Nằm trong ngoặc kép nghiêng)</label>
              <textarea
                rows={3}
                value={form.missionDesc}
                onChange={(e) => handleChange("missionDesc", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-3 pt-3">
            <span className="text-[10px] font-display uppercase tracking-widest text-[#ECECEC] block font-bold">4 GIÁ TRỊ CỐT LÕI SLATE CARDS:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Value 1 */}
              <div className="bg-[#111] p-3 border border-[#222] space-y-2">
                <input
                  type="text"
                  value={form.coreValue1Title}
                  onChange={(e) => handleChange("coreValue1Title", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-xs px-2.5 py-1 text-white font-bold"
                />
                <input
                  type="text"
                  value={form.coreValue1Desc}
                  onChange={(e) => handleChange("coreValue1Desc", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-[11px] px-2.5 py-1 text-gray-400 w-full"
                />
              </div>

              {/* Value 2 */}
              <div className="bg-[#111] p-3 border border-[#222] space-y-2">
                <input
                  type="text"
                  value={form.coreValue2Title}
                  onChange={(e) => handleChange("coreValue2Title", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-xs px-2.5 py-1 text-white font-bold"
                />
                <input
                  type="text"
                  value={form.coreValue2Desc}
                  onChange={(e) => handleChange("coreValue2Desc", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-[11px] px-2.5 py-1 text-gray-400 w-full"
                />
              </div>

              {/* Value 3 */}
              <div className="bg-[#111] p-3 border border-[#222] space-y-2">
                <input
                  type="text"
                  value={form.coreValue3Title}
                  onChange={(e) => handleChange("coreValue3Title", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-xs px-2.5 py-1 text-white font-bold"
                />
                <input
                  type="text"
                  value={form.coreValue3Desc}
                  onChange={(e) => handleChange("coreValue3Desc", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-[11px] px-2.5 py-1 text-gray-400 w-full"
                />
              </div>

              {/* Value 4 */}
              <div className="bg-[#111] p-3 border border-[#222] space-y-2">
                <input
                  type="text"
                  value={form.coreValue4Title}
                  onChange={(e) => handleChange("coreValue4Title", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-xs px-2.5 py-1 text-white font-bold"
                />
                <input
                  type="text"
                  value={form.coreValue4Desc}
                  onChange={(e) => handleChange("coreValue4Desc", e.target.value)}
                  className="bg-black border border-[#2d2d2d] focus:border-gold-light text-[11px] px-2.5 py-1 text-gray-400 w-full"
                />
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 4: GOLDEN STATS */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] pb-2 border-b border-[#1A1A1A]">
            4. DẢI CHỈ SỐ THỐNG KÊ (GENERAL STATS STRIP)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="p-3 bg-black border border-[#1A1A1A]">
              <label className="text-[9px] text-gray-500 block mb-0.5">STAT 01 (Số cực đại)</label>
              <input
                type="text"
                value={form.stat1Num}
                onChange={(e) => handleChange("stat1Num", e.target.value)}
                className="w-full bg-[#111] border border-[#222] focus:border-gold-light text-xs px-2 py-1 text-gold-light font-bold"
              />
              <input
                type="text"
                value={form.stat1Label}
                onChange={(e) => handleChange("stat1Label", e.target.value)}
                className="w-full bg-[#111] border border-[#222] text-[10px] px-2 py-1 text-gray-400 mt-1"
              />
            </div>

            <div className="p-3 bg-black border border-[#1A1A1A]">
              <label className="text-[9px] text-gray-500 block mb-0.5">STAT 02 (Số bàn giao)</label>
              <input
                type="text"
                value={form.stat2Num}
                onChange={(e) => handleChange("stat2Num", e.target.value)}
                className="w-full bg-[#111] border border-[#222] focus:border-gold-light text-xs px-2 py-1 text-gold-light font-bold"
              />
              <input
                type="text"
                value={form.stat2Label}
                onChange={(e) => handleChange("stat2Label", e.target.value)}
                className="w-full bg-[#111] border border-[#222] text-[10px] px-2 py-1 text-gray-400 mt-1"
              />
            </div>

            <div className="p-3 bg-black border border-[#1A1A1A]">
              <label className="text-[9px] text-gray-500 block mb-0.5">STAT 03 (Quy mô nhà máy)</label>
              <input
                type="text"
                value={form.stat3Num}
                onChange={(e) => handleChange("stat3Num", e.target.value)}
                className="w-full bg-[#111] border border-[#222] focus:border-gold-light text-xs px-2 py-1 text-gold-light font-bold"
              />
              <input
                type="text"
                value={form.stat3Label}
                onChange={(e) => handleChange("stat3Label", e.target.value)}
                className="w-full bg-[#111] border border-[#222] text-[10px] px-2 py-1 text-gray-400 mt-1"
              />
            </div>

            <div className="p-3 bg-black border border-[#1A1A1A]">
              <label className="text-[9px] text-gray-500 block mb-0.5">STAT 04 (Bảo hành)</label>
              <input
                type="text"
                value={form.stat4Num}
                onChange={(e) => handleChange("stat4Num", e.target.value)}
                className="w-full bg-[#111] border border-[#222] focus:border-gold-light text-xs px-2 py-1 text-gold-light font-bold"
              />
              <input
                type="text"
                value={form.stat4Label}
                onChange={(e) => handleChange("stat4Label", e.target.value)}
                className="w-full bg-[#111] border border-[#222] text-[10px] px-2 py-1 text-gray-400 mt-1"
              />
            </div>

          </div>
        </div>

        {/* SECTION 5: FACTORY CAPABILITIES */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] pb-2 border-b border-[#1A1A1A] flex items-center justify-between">
            <span>5. PHẦN NHÀ MÁY CHẾ CHẾ SẢN XUẤT</span>
            <Image className="w-4 h-4 text-gray-500" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Mục tiêu phụ (Vd: TIÊU CHUẨN ĐỒNG BỘ)</label>
              <input
                type="text"
                value={form.factorySubtitle}
                onChange={(e) => handleChange("factorySubtitle", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Tiêu đề nhà máy</label>
              <input
                type="text"
                value={form.factoryTitle}
                onChange={(e) => handleChange("factoryTitle", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none font-bold"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Đoạn mô tả xích dây chuyền robot</label>
              <textarea
                rows={3}
                value={form.factoryDesc}
                onChange={(e) => handleChange("factoryDesc", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="text-[10px] text-[#F5C45A] uppercase font-bold">Đường dẫn ảnh nhà máy (Image URL)</label>
              <input
                type="text"
                value={form.factoryImage}
                onChange={(e) => handleChange("factoryImage", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: BRANDS QUOTE */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-[#F5C45A] pb-2 border-b border-[#1A1A1A]">
            6. KHỐI DANH NGÔN CHÂN TRANG
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Đoạn danh ngôn / Châm ngôn thương hiệu</label>
              <textarea
                rows={2}
                value={form.quoteText}
                onChange={(e) => handleChange("quoteText", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none leading-relaxed"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Tác giả (Vd: HỘI ĐỒNG SÁNG LẬP...)</label>
              <input
                type="text"
                value={form.quoteAuthor}
                onChange={(e) => handleChange("quoteAuthor", e.target.value)}
                className="w-full bg-black border border-[#1A1A1A] text-xs px-3 py-2 text-white focus:outline-none"
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
            LƯU NỘI DUNG GIỚI THIỆU
          </button>
        </div>

      </form>
    </div>
  );
}
