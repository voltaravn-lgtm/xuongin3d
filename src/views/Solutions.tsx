/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link } from "react-router-dom";
import { Zap, HelpCircle, Phone, Clock, ShieldCheck, ChevronRight, CheckCircle2, Award, ClipboardList, PenTool, Wrench, Headphones } from "lucide-react";
import { SOLUTIONS_DATA, PROJECTS_DATA } from "../data";
import { SectionTitle, SolutionCard } from "../components/Cards";
import { useApp } from "../context/AppContext";
import { getMenuBanner } from "../lib/menuBanners";
import PageHero from "../components/PageHero";

export default function Solutions() {
  const { menuItems } = useApp();
  const bannerImage = getMenuBanner(menuItems, "/giai-phap", "/images/giai-phap.webp");
  
  const steps = [
    {
      num: "01",
      title: "TIẾP NHẬN YÊU CẦU",
      desc: "Tiếp nhận mục tiêu, số lượng, kích thước và yêu cầu sử dụng của doanh nghiệp.",
      icon: <ClipboardList className="w-5 h-5" />
    },
    {
      num: "02",
      title: "KHẢO SÁT & TƯ VẤN",
      desc: "Xem file, bản vẽ hoặc mẫu thật và đề xuất công nghệ, vật liệu phù hợp.",
      icon: <HelpCircle className="w-5 h-5" />
    },
    {
      num: "03",
      title: "THIẾT KẾ GIẢI PHÁP",
      desc: "Dựng hoặc tối ưu file 3D, thống nhất cấu trúc, màu sắc và cách hoàn thiện.",
      icon: <PenTool className="w-5 h-5" />
    },
    {
      num: "04",
      title: "TẠO MẪU & SẢN XUẤT",
      desc: "Tạo mẫu khi cần, xác nhận phương án rồi sản xuất theo tiến độ đã thống nhất.",
      icon: <Wrench className="w-5 h-5" />
    },
    {
      num: "05",
      title: "BÀN GIAO & HỖ TRỢ",
      desc: "Kiểm tra, hoàn thiện, đóng gói và hỗ trợ các yêu cầu sau bàn giao.",
      icon: <Headphones className="w-5 h-5" />
    }
  ];

  return (
    <div id="solutions-page" className="pb-20 relative bg-[#050505]">
      
      <PageHero
        image={bannerImage}
        imageAlt="Giải pháp in 3D cho doanh nghiệp"
        breadcrumb="Giải pháp doanh nghiệp"
        eyebrow="Thiết kế và sản xuất theo dự án"
        title="Giải pháp in 3D cho doanh nghiệp"
        description="Hỗ trợ doanh nghiệp tạo mẫu nhanh, sản xuất POSM, quà tặng, mô hình trình diễn, đồ gá và chi tiết tùy chỉnh với số lượng linh hoạt."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 2. SOLUTIONS BY REQUEST LIST DIRECTLY DRAWN (MATCHING PHOTO 5) */}
        <div className="space-y-8 mb-20" id="solutions-by-demand">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <h3 className="text-xs font-display font-black text-white uppercase tracking-wider">
              CÁC GIẢI PHÁP THEO NHU CẦU
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">AVAILABLE SERVICES</span>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {SOLUTIONS_DATA.map((sol) => (
              <SolutionCard key={sol.id} solution={sol} />
            ))}
          </div>
        </div>

        {/* 3. IMPLEMENTATION LIFECYCLE 5-STEPS (MATCHING PHOTO 5 CENTER) */}
        <div className="py-16 bg-[#0A0A0A] border-y border-white/5 mb-20 relative overflow-hidden" id="solutions-process">
          <div className="max-w-7xl mx-auto">
            
            <SectionTitle
              subtitle="QUY TRÌNH QUẢN TRỊ"
              title="QUY TRÌNH TRIỂN KHAI GIẢI PHÁP"
              description="Quy trình được thống nhất theo từng mốc từ tiếp nhận yêu cầu đến duyệt mẫu, sản xuất và bàn giao."
            />

            {/* Horizontal timeline of steps with link arrows */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-12 relative">
              
              {/* Desktop links decoration */}
              <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-gold-dark/10 via-gold-dark/45 to-gold-dark/10 z-0 pointer-events-none" />

              {steps.map((st, idx) => (
                <div key={st.num} className="bg-[#121212] border border-white/5 p-5 relative z-10 hover:border-gold-dark/30 transition-all text-center">
                  {/* Number tag */}
                  <div className="absolute top-2 right-3 font-mono font-black text-gold-dark/45 text-sm">
                    {st.num}
                  </div>

                  <div className="w-12 h-12 rounded-full border border-gold-dark/20 bg-black flex items-center justify-center text-gold-light mx-auto mb-4 hover:scale-110 transition-transform">
                    {st.icon}
                  </div>

                  <h4 className="text-[11px] font-display font-extrabold text-[#ECECEC] uppercase tracking-wider mb-2 leading-snug">
                    {st.title}
                  </h4>
                  
                  <p className="text-[11.5px] text-gray-500 leading-normal">
                    {st.desc}
                  </p>
                </div>
              ))}

            </div>

          </div>
        </div>

        {/* 4. FEATURED PROJECTS - DỰ ÁN TIÊU BIỂU (MATCHING PHOTO 5 BOTTOM) */}
        <div className="mb-20" id="featured-projects">
          
          <SectionTitle
            subtitle="MẪU DỰ ÁN"
            title="DỰ ÁN IN 3D TIÊU BIỂU"
            description="Các nhóm dự án xưởng có thể triển khai. Hình ảnh thực tế sẽ tiếp tục được cập nhật trong trang quản trị."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROJECTS_DATA.map((proj) => (
              <div key={proj.id} className="bg-[#121212] border border-white/5 rounded-lg overflow-hidden group hover:border-gold-dark/20 transition-all duration-300">
                <div className="aspect-[4/3] w-full bg-black overflow-hidden relative shrink-0">
                  <img
                    src={proj.image}
                    alt={proj.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#0A0A0A] border border-gold-dark/30 px-2 py-0.5 text-[8.5px] font-display font-bold text-gold-light uppercase tracking-wider">
                    DỰ ÁN THEO YÊU CẦU
                  </div>
                </div>

                <div className="p-4 text-left">
                  <span className="text-[9.5px] text-gray-500 font-mono block mb-1 uppercase tracking-wider">
                    {proj.solutionType}
                  </span>
                  
                  <h4 className="text-xs font-display font-bold text-[#ECECEC] line-clamp-1 mb-2 group-hover:text-gold-light transition-colors uppercase">
                    {proj.title}
                  </h4>

                  <p className="text-[11px] text-gray-500 leading-snug">
                    {proj.specs}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* 5. DOCK CONVERT FORM HELP ADV ADVISOR */}
        <div className="bg-[#121212] border border-gold-dark/20 p-8 text-center max-w-4xl mx-auto rounded-xl relative">
          <span className="text-xs font-display font-semibold tracking-widest text-gold-light uppercase mb-2 block">
            CẦN TƯ VẤN THIẾT KẾ RIÊNG?
          </span>
          <h3 className="text-sm font-display font-black text-[#ECECEC] uppercase tracking-widest mb-4">
            Xưởng sẵn sàng tiếp nhận và phân tích yêu cầu dự án
          </h3>
          <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed mb-6">
            Gửi file CAD/3D, bản vẽ, hình ảnh hoặc mẫu thật để được tư vấn giải pháp, vật liệu và kế hoạch thực hiện phù hợp.
          </p>

          <Link
            to="/lien-he?type=spec_request"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-gold-dark to-gold-light text-black font-display font-bold py-3.5 px-8 text-xs tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all rounded-md"
          >
            <span>GỬI YÊU CẦU DỰ ÁN</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
