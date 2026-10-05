/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Award, Globe, Shield, ShieldCheck, ChevronRight, ChevronLeft, CheckCircle2, ChevronDown, MapPin, Truck, HelpCircle, Phone, ArrowUpRight, Gift, Clock } from "lucide-react";
import { SectionTitle, StatCard, ProductCard } from "../components/Cards";
import { useApp } from "../context/AppContext";
import { AnimatePresence, motion } from "motion/react";
import { getProductHref } from "../lib/productRoutes";

export default function Home() {
  const navigate = useNavigate();
  const { products, salesPrograms, heroSettings, homeContent, warranties } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [warrantySerial, setWarrantySerial] = useState("");
  const [warrantyResult, setWarrantyResult] = useState<any>(null);

  // Fallback slides list if none specified
  const slides = heroSettings.slides && heroSettings.slides.length > 0 
    ? heroSettings.slides 
    : [
        {
          id: "default",
          title: heroSettings.title,
          subtitle: heroSettings.subtitle,
          description: heroSettings.description,
          bannerImage: heroSettings.bannerImage,
          logoTextImage: heroSettings.logoTextImage,
          useLogoImage: heroSettings.useLogoImage
        }
      ];

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoplaySpeed = heroSettings.autoplaySpeed || 5000;

  const startAutoplay = () => {
    stopAutoplay();
    if (slides.length <= 1) return;
    
    autoplayTimerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, autoplaySpeed);
  };

  const stopAutoplay = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  };

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [slides.length, autoplaySpeed]);

  const handlePrevSlide = () => {
    stopAutoplay();
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
    startAutoplay();
  };

  const handleNextSlide = () => {
    stopAutoplay();
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    startAutoplay();
  };

  const handleGoToSlide = (idx: number) => {
    stopAutoplay();
    setCurrentSlideIndex(idx);
    startAutoplay();
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const categories = [
    { id: "all", name: "Tất cả sản phẩm" },
    { id: "den-do-decor-trang-tri", name: "Đèn & decor" },
    { id: "mo-hinh-tuong-nhan-vat", name: "Mô hình & tượng" },
    { id: "doanh-nghiep-posm", name: "Doanh nghiệp & POSM" },
    { id: "kien-truc-sa-ban", name: "Kiến trúc & sa bàn" },
  ];

  const visibleProducts = products.filter(product => !product.hidden);
  const filteredProducts = selectedCategory === "all"
    ? visibleProducts.slice(0, 4)
    : visibleProducts.filter(p => p.category === selectedCategory).slice(0, 4);
  const activeComboPrograms = useMemo(() => {
    const now = Date.now();
    return salesPrograms
      .filter((program) => {
        if (program.type !== "combo" || program.hidden || !(program.items || []).length) return false;
        const startsAt = program.startsAt ? new Date(program.startsAt).getTime() : 0;
        const endsAt = program.endsAt ? new Date(program.endsAt).getTime() : 0;
        return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
      })
      .slice(0, 3);
  }, [salesPrograms]);

  const handleQuickWarrantCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantySerial.trim()) return;

    const upper = warrantySerial.trim().toUpperCase();
    const found = warranties.find(w => w.serial.toUpperCase() === upper);

    if (found) {
      setWarrantyResult({
        name: found.productName,
        activatedDate: found.activatedDate,
        warrantyMonths: `${found.termMonths} tháng`,
        expiryDate: found.expiryDate,
        status: found.status,
        isValid: true
      });
    } else {
      setWarrantyResult({
        isValid: false,
        message: `Không tìm thấy mã '${upper}'. Vui lòng kiểm tra lại hoặc liên hệ xưởng để được hỗ trợ.`
      });
    }
  };

  return (
    <div id="home-page" className="relative">
      
      {/* 1. HERO SECTION WITH LUXURY GOLD ENERGY RADIUS */}
      <section id="home-hero" className="relative min-h-[80vh] lg:min-h-[90vh] pt-16 lg:pt-24 pb-16 lg:pb-24 flex items-center overflow-hidden bg-black">
        {/* Full-screen Background Banner Image with smooth AnimatePresence transition */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentSlideIndex}
              src={currentSlide.bannerImage} 
              alt="Xưởng In 3D - Thiết kế và in theo yêu cầu" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full h-full object-cover object-center transform scale-100"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          {/* Overlay to ensure maximum text readability and aesthetic integration */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 lg:from-black/95 lg:via-black/75 lg:to-transparent/10 to-transparent z-1" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-1" />
        </div>

        {/* Futuristic circular glow layers radiating behind content */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full border border-gold-dark/10 animate-spin-slow pointer-events-none z-10" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] rounded-full border border-gold-dark/5 animate-pulse pointer-events-none z-10" />
        
        {/* Soft golden particle overlays decoration */}
        <div className="absolute top-[20%] left-[10%] w-2 h-2 bg-gold-light/40 rounded-full animate-ping pointer-events-none z-10" />
        <div className="absolute bottom-[30%] right-[15%] w-1.5 h-1.5 bg-gold-dark/60 rounded-full animate-pulse pointer-events-none z-10" />

        {/* Arrow Navigation for multiple slides */}
        {slides.length > 1 && (
          <>
            <button 
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 border border-white/10 bg-black/40 hover:bg-gold-light hover:text-black hover:border-transparent text-white transition-all cursor-pointer select-none"
              title="Slide trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 border border-white/10 bg-black/40 hover:bg-gold-light hover:text-black hover:border-transparent text-white transition-all cursor-pointer select-none"
              title="Slide kế tiếp"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
          <div className="max-w-3xl flex flex-col items-start text-left" id="hero-text-grid">
            
            <div className="flex items-center gap-2 px-3 py-1 bg-gold-dark/10 border border-gold-dark/25 mb-4 rounded-md select-none">
              <Zap className="w-3.5 h-3.5 text-gold-light animate-bounce" />
              <span className="text-[10px] font-display font-bold text-[#ECECEC] tracking-widest uppercase">
                THIẾT KẾ VÀ IN 3D THEO YÊU CẦU
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlideIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col items-start"
              >
                {/* Big Display Brand Header */}
                {currentSlide.useLogoImage && currentSlide.logoTextImage ? (
                  <img
                    src={currentSlide.logoTextImage}
                    alt={`${currentSlide.title} - ${currentSlide.subtitle}`}
                    className="h-24 sm:h-28 md:h-32 lg:h-36 w-auto object-contain mb-8 filter drop-shadow-[0_4px_15px_rgba(218,154,43,0.3)] select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black leading-tight uppercase tracking-tight text-[#ECECEC] glow-text mb-6">
                    {currentSlide.title} <br />
                    <span className="text-lg sm:text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-dark to-yellow-600 tracking-wider">
                      {currentSlide.subtitle}
                    </span>
                  </h1>
                )}

                <p className="text-sm sm:text-base text-gray-200 max-w-xl leading-relaxed mb-8 backdrop-blur-[1px]">
                  {currentSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Action Buttons styled like Voltara specifications */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                id="hero-cta-products"
                to="/san-pham"
                className="gold-gradient-bg text-black font-display font-bold py-3.5 px-8 text-xs tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(216,154,43,0.35)] duration-300 cursor-pointer text-center"
              >
                <span>XEM SẢN PHẨM</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                id="hero-cta-dealer"
                to="/in-3d-theo-yeu-cau"
                className="gold-border hover:bg-gold-dark hover:text-black bg-transparent text-[#ECECEC] font-display font-semibold py-3.5 px-8 text-xs tracking-widest uppercase transition-all duration-300 text-center cursor-pointer"
              >
                IN 3D THEO YÊU CẦU
              </Link>

              <Link
                id="hero-cta-be-dealer"
                to="/lien-he?type=print_3d"
                className="border border-[#ECECEC]/10 hover:border-[#ECECEC]/30 bg-[#ECECEC]/5 hover:bg-[#ECECEC]/10 text-gray-300 font-display font-semibold py-3.5 px-8 text-xs tracking-widest uppercase text-center transition-all duration-300 cursor-pointer whitespace-nowrap"
              >
                NHẬN TƯ VẤN
              </Link>
            </div>

          </div>
        </div>

        {/* Slide Indicators / Bullet controls at the bottom */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5">
            {slides.map((slide, idx) => (
              <button
                key={slide.id || idx}
                onClick={() => handleGoToSlide(idx)}
                className={`h-2.5 transition-all duration-300 select-none cursor-pointer ${
                  currentSlideIndex === idx 
                    ? "w-8 bg-gold-light" 
                    : "w-2.5 bg-white/20 hover:bg-white/40"
                }`}
                title={`Chuyển tới Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. SPECIFICATION BENEFIT TABS - Horizontal Core Attributes of Voltara */}
      <section className="bg-[#0A0A0A] border-y border-[#D89A2B]/20 py-8" id="core-attributes-strip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 ">
            <div className="flex items-center gap-4 group p-3 gold-border bg-[#121212] hover:bg-[#1A1A1A] transition-all duration-300">
              <div className="p-3 bg-white/5 text-gold-light group-hover:bg-gold-dark group-hover:text-black transition-all duration-300">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#ECECEC] mb-0.5">{homeContent.feature1Title || "Công Nghệ Tiên Tiến"}</h4>
                <p className="text-[11px] text-gray-500">{homeContent.feature1Desc || "Nhận file, hình ảnh, bản vẽ hoặc mẫu thật."}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group p-3 gold-border bg-[#121212] hover:bg-[#1A1A1A] transition-all duration-300">
              <div className="p-3 bg-white/5 text-gold-light group-hover:bg-gold-dark group-hover:text-black transition-all duration-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#ECECEC] mb-0.5">{homeContent.feature2Title || "Chất Lượng Vượt Trội"}</h4>
                <p className="text-[11px] text-gray-500">{homeContent.feature2Desc || "Tư vấn vật liệu theo nhu cầu sử dụng."}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group p-3 gold-border bg-[#121212] hover:bg-[#1A1A1A] transition-all duration-300">
              <div className="p-3 bg-white/5 text-gold-light group-hover:bg-gold-dark group-hover:text-black transition-all duration-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#ECECEC] mb-0.5">{homeContent.feature3Title || "Bảo Hành Chính Hãng"}</h4>
                <p className="text-[11px] text-gray-500">{homeContent.feature3Desc || "Kích hoạt điện tử tra cứu siêu nhanh."}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group p-3 gold-border bg-[#121212] hover:bg-[#1A1A1A] transition-all duration-300">
              <div className="p-3 bg-white/5 text-gold-light group-hover:bg-gold-dark group-hover:text-black transition-all duration-300">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#ECECEC] mb-0.5">{homeContent.feature4Title || "Hệ Thống Toàn Quốc"}</h4>
                <p className="text-[11px] text-gray-500">{homeContent.feature4Desc || "Tư vấn nhanh qua hotline 0822 426 639."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DOCK DIRECTORIES PRODUCT BENTO FILTER */}
      <section className="py-20 bg-[#050505]" id="featured-products-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <SectionTitle
            subtitle="DANH MỤC TIÊU BIỂU"
            title={homeContent.section2Title || "Sản Phẩm In 3D Theo Nhu Cầu"}
            description={homeContent.section2Desc || "Đa dạng mẫu mã, vật liệu và kích thước cho cá nhân, gia đình và doanh nghiệp."}
          />


          {/* Tab Button Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 text-xs font-display tracking-wider transition-all duration-300 rounded-md cursor-pointer ${
                  selectedCategory === cat.id
                    ? "gold-gradient-bg text-black font-bold border border-transparent shadow-[0_0_15px_rgba(216,154,43,0.3)]"
                    : "bg-[#121212] text-gray-400 border border-[#D89A2B]/20 hover:border-gold-light hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>

          <div className="text-center mt-12 animate-pulse">
            <Link
              to="/san-pham"
              className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-gold-light uppercase tracking-widest hover:text-white transition-colors"
            >
              <span>Xem Tất Cả Các Dòng Sản Phẩm</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {activeComboPrograms.length > 0 && (
        <section className="py-20 bg-[#0A0A0A] border-y border-[#D89A2B]/20" id="home-combo-promotions-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              subtitle="ƯU ĐÃI ĐANG CHẠY"
              title="Combo Khuyến Mãi"
              description="Các gói sản phẩm và chương trình ưu đãi được cấu hình rõ ràng trong trang quản trị."
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {activeComboPrograms.map((program) => {
                const firstProduct = products.find((product) => product.id === (program.primaryProductId || program.items?.[0]?.productId));
                const image = program.image || firstProduct?.image || "/images/voltara_banner.webp";
                const originalPrice = formatHomePrice(program.originalPrice);
                const promoPrice = formatHomePrice(program.promoPrice);
                const itemSummary = (program.items || [])
                  .map((item) => {
                    const product = products.find((entry) => entry.id === item.productId);
                    return product ? `${product.name}${item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ""}` : "";
                  })
                  .filter(Boolean)
                  .join(" + ");
                const href = firstProduct ? getProductHref(firstProduct) : "/san-pham";

                return (
                  <Link
                    key={program.id}
                    to={href}
                    className="group overflow-hidden border border-gold-dark/25 bg-[#101010] transition-all hover:border-gold-light hover:shadow-[0_0_30px_rgba(216,154,43,0.14)]"
                  >
                    <div className="relative aspect-[16/10] bg-black">
                      <img src={image} alt={program.name} className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 bg-gold-dark px-3 py-1 text-[9px] font-display font-black uppercase tracking-widest text-black">
                        <Gift className="h-3.5 w-3.5" />
                        Combo
                      </div>
                    </div>
                    <div className="space-y-3 border-t border-gold-dark/20 p-4">
                      <h3 className="line-clamp-2 font-display text-sm font-black uppercase leading-relaxed text-white group-hover:text-gold-light">
                        {program.name}
                      </h3>
                      {(program.description || itemSummary) && (
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-400">{program.description || itemSummary}</p>
                      )}
                      <div className="flex flex-wrap items-end gap-2">
                        {promoPrice && <span className="font-display text-xl font-black text-gold-light">{promoPrice}</span>}
                        {originalPrice && <span className="pb-0.5 text-xs font-semibold text-gray-500 line-through">{originalPrice}</span>}
                      </div>
                      {program.endsAt && (
                        <div className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-widest text-gray-500">
                          <Clock className="h-3.5 w-3.5 text-gold-light" />
                          Kết thúc: {formatHomeDate(program.endsAt)}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. STATISTICS COUNTER SECTION */}
      <section className="py-20 bg-[#0A0A0A] border-y border-white/5 relative overflow-hidden" id="stats-numbers-section">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[1px] bg-gradient-to-r from-transparent via-[#D89A2B]/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              number="FDM"
              label="IN SỢI NHỰA"
              description="Phù hợp sản phẩm tiện ích, decor, phụ kiện và mô hình kích thước linh hoạt"
              icon={<MapPin className="w-5 h-5" />}
            />
            <StatCard
              number="RESIN"
              label="IN CHI TIẾT CAO"
              description="Phù hợp tượng, nhân vật, mô hình và các chi tiết cần bề mặt sắc nét"
              icon={<Award className="w-5 h-5" />}
            />
            <StatCard
              number="1+"
              label="NHẬN TỪ MỘT SẢN PHẨM"
              description="Linh hoạt cho mẫu thử, sản phẩm độc bản và đơn hàng số lượng nhỏ"
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
            <StatCard
              number="24/7"
              label="TIẾP NHẬN YÊU CẦU"
              description="Hỗ trợ trao đổi ý tưởng và thông tin dự án qua hotline hoặc email"
              icon={<Shield className="w-5 h-5" />}
            />
          </div>

        </div>
      </section>

      {/* 5. BENEFITS LIST INTERACTIVE BLOCK */}
      <section className="py-20 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left side: Luxury visual blocks */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-3 radial-bg opacity-40 pointer-events-none" />
              <div className="relative h-full bg-[#121212] p-6 sm:p-8 gold-border shadow-2xl">
                <span className="text-xs font-display font-semibold text-gold-light tracking-widest uppercase mb-2 block">
                  QUY TRÌNH RÕ RÀNG
                </span>
                <h3 className="text-lg font-display font-extrabold text-[#ECECEC] mb-4 uppercase">
                  Từ Ý Tưởng Đến Sản Phẩm Thực Tế
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Mỗi yêu cầu được xem xét dựa trên mục đích sử dụng, kích thước, vật liệu và độ hoàn thiện. Xưởng trao đổi phương án trước khi sản xuất để hạn chế sai lệch và tối ưu chi phí.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                    <span>Tiếp nhận file 3D, bản vẽ, hình ảnh hoặc mẫu thật</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                    <span>Tư vấn công nghệ FDM hoặc Resin phù hợp</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-gold-light shrink-0" />
                    <span>Kiểm tra sản phẩm trước khi bàn giao</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Benefits descriptions */}
            <div className="lg:col-span-7 flex flex-col bg-[#121212] p-6 sm:p-8 gold-border shadow-2xl">
              <span className="block text-xs tracking-widest text-gold-light mb-2 uppercase font-display font-semibold">
                LỢI THẾ DỊCH VỤ
              </span>
              <h2 className="text-lg sm:text-xl font-display font-extrabold uppercase tracking-wider text-[#ECECEC] mb-4">
                Vì Sao Nên Chọn Xưởng In 3D?
              </h2>
              <div className="h-[2px] bg-gradient-to-r from-gold-dark to-transparent w-24 mb-6" />

              <div className="space-y-5 [&_p]:text-gray-300">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-white/5 border border-white/5 flex items-center justify-center text-gold-light shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-bold text-[#ECECEC] uppercase tracking-wider mb-1">
                      Linh Hoạt Từ Mẫu Thử Đến Lô Nhỏ
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Nhận thực hiện từ một sản phẩm, phù hợp thử nghiệm ý tưởng, cá nhân hóa và sản xuất số lượng nhỏ.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-white/5 border border-white/5 flex items-center justify-center text-gold-light shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-bold text-[#ECECEC] uppercase tracking-wider mb-1">
                      Đa Dạng Vật Liệu Và Kiểu Hoàn Thiện
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Tư vấn PLA, PETG, ABS, TPU, Resin và phương án xử lý bề mặt theo công năng thực tế.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-white/5 border border-white/5 flex items-center justify-center text-gold-light shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-bold text-[#ECECEC] uppercase tracking-wider mb-1">
                      Hỗ Trợ Thiết Kế Theo Yêu Cầu
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Hỗ trợ dựng mới hoặc chỉnh sửa file để sản phẩm phù hợp kích thước, cách lắp đặt và mục đích sử dụng.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. TRA CỨU BẢO HÀNH NHANH (FAST UTILITY) */}
      <section className="py-20 bg-[#0A0A0A] border-t border-[#D89A2B]/20" id="fast-warranty-home-section">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-[#121212] gold-border p-8 rounded-lg relative shadow-xl">
            <div className="absolute top-0 left-10 transform -translate-y-1/2 bg-[#D89A2B] text-black text-[9px] font-display font-extrabold px-3.5 py-1 uppercase tracking-widest rounded-sm">
              TIỆN ÍCH KHÁCH HÀNG
            </div>

            <div className="text-center mb-6">
              <h3 className="text-sm font-display font-bold uppercase text-[#ECECEC] glow-text tracking-widest">
                Tra Cứu Thông Tin Bảo Hành Sản Phẩm
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Nhập mã sản phẩm hoặc mã bảo hành được cung cấp khi bàn giao.
              </p>
            </div>

            <form onSubmit={handleQuickWarrantCheck} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={warrantySerial}
                onChange={(e) => setWarrantySerial(e.target.value)}
                placeholder="Nhập mã sản phẩm hoặc mã bảo hành"
                className="flex-1 bg-[#050505] text-[#ECECEC] border border-[#D89A2B]/20 rounded-md px-4 py-3 placeholder-gray-600 text-xs focus:outline-none focus:border-gold-light transition-colors uppercase font-mono"
              />
              <button
                type="submit"
                className="gold-gradient-bg text-black font-display font-bold transition-all hover:opacity-90 hover:shadow-[0_0_15px_rgba(216,154,43,0.3)] px-6 py-3 text-xs uppercase cursor-pointer duration-300 rounded-md"
              >
                TRA CỨU
              </button>
            </form>

            {warrantyResult && (
              <div className="mt-6 p-4 bg-black border border-white/5 text-xs rounded-md">
                {warrantyResult.isValid ? (
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-white/5 pb-2 text-[11px]">
                      <span className="text-gray-500">Thiết bị:</span>
                      <span className="text-white font-semibold uppercase">{warrantyResult.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Ngày kích hoạt:</span>
                        <span className="text-gray-300 font-mono font-medium">{warrantyResult.activatedDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Hạn bảo hành:</span>
                        <span className="text-gray-300 font-medium">{warrantyResult.warrantyMonths}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Ngày hết hạn:</span>
                        <span className="text-gray-300 font-mono font-medium">{warrantyResult.expiryDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Trạng thái:</span>
                        <span className="text-emerald-400 font-bold tracking-wide">{warrantyResult.status}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-rose-400 tracking-wide font-medium">{warrantyResult.message}</span>
                )}
              </div>
            )}
            
            <div className="text-center mt-4">
              <Link to="/lien-he" className="text-[10px] text-gray-500 hover:text-gold-light underline uppercase tracking-wider">
                Liên Hệ Hỗ Trợ →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CONVERT CTA BANNER BOTTOM */}
      <section className="py-16 bg-gradient-to-r from-gold-dark/5 via-gold-dark/15 to-transparent border-t border-[#D89A2B]/20" id="be-partner-banner-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black uppercase text-[#ECECEC] glow-text tracking-wider mb-2">
                BẠN CÓ Ý TƯỞNG CẦN HIỆN THỰC HÓA?
              </h3>
              <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                Gửi file 3D, hình ảnh, bản vẽ hoặc mô tả nhu cầu. Xưởng sẽ tư vấn vật liệu, công nghệ in và phương án thực hiện phù hợp.
              </p>
            </div>
            
            <Link
              to="/in-3d-theo-yeu-cau"
              className="gold-gradient-bg text-black font-display font-bold px-8 py-3.5 text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all text-center shrink-0 duration-300 shadow-[0_0_20px_rgba(216,154,43,0.2)] cursor-pointer"
            >
              Gửi Yêu Cầu In 3D
            </Link>
          </div>
        </div>
      </section>
      
    </div>
  );
}

function formatHomePrice(price: string | undefined) {
  const raw = String(price || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits && digits.length === raw.replace(/\s/g, "").length) {
    return `${Number(digits).toLocaleString("vi-VN")}đ`;
  }
  return raw;
}

function formatHomeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
