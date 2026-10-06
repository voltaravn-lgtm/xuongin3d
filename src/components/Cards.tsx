/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link } from "react-router-dom";
import { Zap, Award, ShieldCheck, Clock, ChevronRight, Eye, BookOpen, MapPin, Mail, Phone, Calendar, Star, Users, Briefcase, Gift, PlayCircle } from "lucide-react";
import { Product, Solution, Article, Course, Job, Branch } from "../types";
import { useApp } from "../context/AppContext";
import { getProductHref } from "../lib/productRoutes";
import ProductPromoImage from "./ProductPromoImage";
import { getProductCardPrice } from "../lib/productCardPrice";
import { productDisplayName } from "../lib/productDisplayName";

function formatDisplayPrice(price: string | undefined): string {
  const raw = (price || "").trim();
  if (!raw) return "";

  const digits = raw.replace(/[^\d]/g, "");
  const looksLikeMoney = /^[\d\s.,]+(?:đ|₫|vnd)?$/i.test(raw);

  if (digits && looksLikeMoney) {
    return `${Number(digits).toLocaleString("vi-VN")}đ`;
  }

  return raw;
}

function parsePriceNumber(price: string | undefined): number {
  const digits = String(price || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function isLowerPrice(price: string | undefined, originalPrice: string | undefined): boolean {
  const priceValue = parsePriceNumber(price);
  const originalValue = parsePriceNumber(originalPrice);
  return Boolean(priceValue && originalValue && priceValue < originalValue);
}

// Dynamic Section Title block matching Voltara luxurious layout
export const SectionTitle: React.FC<{
  subtitle?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}> = ({ subtitle, title, description, align = "center" }) => {
  return (
    <div className={`mb-12 flex flex-col ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      {subtitle && (
        <span className="inline-block px-3 py-1.5 gold-border text-[10px] tracking-widest text-[#D89A2B] mb-3.5 uppercase bg-gold-dark/5 select-none font-display font-bold">
          {subtitle}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold uppercase tracking-wider text-[#ECECEC] glow-text select-none">
        {title}
      </h2>
      {/* Golden bar decoration */}
      <div className={`h-[2px] bg-gradient-to-r from-transparent via-gold-dark to-transparent w-36 mt-4 mb-5 ${align === "left" ? "via-gold-dark/80 mr-auto" : "mx-auto"}`} />
      
      {description && (
        <p className="text-gray-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

// Reusable Statistics Tracker item for dynamic counts
export const StatCard: React.FC<{
  number: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
}> = ({ number, label, description, icon }) => {
  return (
    <div className="bg-[#121212] gold-border p-6 rounded-lg relative overflow-hidden group hover:bg-[#1A1A1A] transition-all duration-300 shadow-md">
      <div className="absolute top-0 left-0 w-[4px] h-0 bg-gold-dark group-hover:h-full transition-all duration-300" />
      <div className="flex items-start gap-4">
        {icon && <div className="text-gold-light mt-1 shrink-0 p-2.5 bg-white/5 rounded-md">{icon}</div>}
        <div>
          <div className="text-2xl sm:text-3xl font-display font-black text-[#D89A2B] glow-text mb-1.5 tracking-tight group-hover:scale-105 transition-transform duration-300">
            {number}
          </div>
          <div className="text-xs font-display font-bold text-[#ECECEC] uppercase tracking-wider mb-1">
            {label}
          </div>
          <div className="text-[11px] text-gray-500 leading-normal">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium ProductCard matching the photos
export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { salesPrograms } = useApp();
  const lowestPrice = getProductCardPrice(product);
  const regularPrice = formatDisplayPrice(lowestPrice.price);
  const salePrice = formatDisplayPrice(lowestPrice.salePrice);
  const hasDiscount = Boolean(salePrice && isLowerPrice(salePrice, regularPrice));
  const displayPrice = salePrice || regularPrice;
  const hasProductVideo = (product.videoUrls || []).some((url) => String(url || "").trim());
  const hasActiveCombo = salesPrograms.some((program) => {
    if (program.type !== "combo" || program.hidden) return false;
    const now = Date.now();
    const startsAt = program.startsAt ? new Date(program.startsAt).getTime() : 0;
    const endsAt = program.endsAt ? new Date(program.endsAt).getTime() : 0;
    const isInTime = (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    const hasProduct = program.primaryProductId === product.id || (program.items || []).some((item) => item.productId === product.id);
    return isInTime && hasProduct;
  });

  return (
    <Link
      to={getProductHref(product)}
      className="bg-[#121212] hover:bg-[#1A1A1A] gold-border rounded-lg overflow-hidden flex flex-col h-full relative group transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(216,154,43,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light/70"
      aria-label={`Xem chi tiết ${product.name}`}
    >
      {/* Brand water mark */}
      <div className="absolute top-2.5 left-2.5 z-10">
        {product.tag && (
          <span className="bg-[#D89A2B] text-black text-[9px] font-display font-bold uppercase tracking-wider py-1 px-2.5 rounded-sm">
            {product.tag}
          </span>
        )}
      </div>
      {hasActiveCombo && (
        <div className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 bg-gold-dark px-2.5 py-1 text-[9px] font-display font-black uppercase tracking-wider text-black shadow-[0_0_16px_rgba(216,154,43,0.35)]">
          <Gift className="h-3.5 w-3.5" />
          Combo ưu đãi
        </div>
      )}

      {/* Grid view layout */}
      <div className="relative w-full aspect-square bg-[#0A0A0A] overflow-hidden flex items-center justify-center p-0">
        {/* Soft gold backdrop radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,154,43,0.1)_0%,transparent_70%)] pointer-events-none" />
        
        <ProductPromoImage
          src={product.image}
          alt={product.name}
          imgClassName="h-full w-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500"
        />
        {hasProductVideo && (
          <div className="absolute bottom-2.5 right-2.5 z-10 text-gold-light drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]" title="Có video sản phẩm" aria-label="Có video sản phẩm">
            <PlayCircle className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col border-t border-[#D89A2B]/20">
        <div>
          <div className="mb-1 text-[9px] sm:text-[10px] font-semibold text-gold-light">Xưởng In 3D</div>
          <h3 className="text-xs sm:text-[13px] font-sans font-semibold text-[#ECECEC] line-clamp-2 leading-4 h-8 mb-1 group-hover:text-gold-light transition-colors">
            {productDisplayName(product.name, product.sku)}
          </h3>

          <div className="min-h-6">
            {hasDiscount ? (
              <div className="space-y-0.5">
                <div className="text-sm sm:text-base font-display font-black text-gold-light">{salePrice}</div>
                {regularPrice && <div className="text-[10px] text-gray-500 line-through">{regularPrice}</div>}
              </div>
            ) : displayPrice ? (
              <div className="text-sm sm:text-base font-display font-black text-gold-light">{displayPrice}</div>
            ) : (
              <div className="text-xs font-display font-bold uppercase tracking-wider text-gray-500">Liên hệ</div>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
};

// Premium Solution Card Block (Gia đình, Cửa hàng, Nhà xưởng...)
export const SolutionCard: React.FC<{ solution: Solution }> = ({ solution }) => {
  return (
    <div className="bg-[#121212] hover:bg-[#1A1A1A] gold-border p-6 md:p-8 rounded-lg relative group transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(216,154,43,0.15)]">
      <div className="absolute top-0 right-0 p-5 opacity-10 text-gold-dark select-none pointer-events-none group-hover:opacity-20 transition-opacity">
        <Zap className="w-20 h-20" />
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
        <div className="w-full md:w-2/5 aspect-[4/3] bg-black overflow-hidden relative gold-border shrink-0 rounded-md">
          <img
            src={solution.image}
            alt={solution.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 group-hover:brightness-90 transition-all duration-500"
          />
          <div className="absolute bottom-3 left-3 bg-[#0A0A0A]/90 backdrop-blur-sm border border-gold-dark/30 px-3 py-1 rounded-sm">
            <span className="text-[9px] text-[#ECECEC] font-display font-bold tracking-widest uppercase">{solution.badge}</span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-display font-semibold tracking-wider text-gold-light mb-3 select-none uppercase">
            {solution.title}
          </h3>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            {solution.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {solution.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                <span className="text-gold-light shrink-0 mt-0.5">•</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>

          <Link
            to={`/lien-he?title=Tu_van_giai_phap_${solution.id}`}
            className="inline-flex items-center gap-2 border border-[#D89A2B]/40 hover:border-gold-light bg-transparent hover:bg-[#D89A2B] hover:text-black hover:shadow-[0_0_15px_rgba(216,154,43,0.3)] transition-all px-4 py-2 text-[10px] font-display font-semibold uppercase tracking-widest text-[#ECECEC] rounded-md"
          >
            <span>YÊU CẦU TƯ VẤN</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

// Blog / News item Card
export const ArticleCard: React.FC<{ article: Article }> = ({ article }) => {
  return (
    <div className="bg-[#121212] hover:bg-[#1A1A1A] gold-border flex flex-col h-full rounded-lg transition-all duration-300 group shadow-lg hover:shadow-[0_0_30px_rgba(216,154,43,0.15)]">
      <div className="relative w-full aspect-[16/10] bg-black overflow-hidden border-b border-[#D89A2B]/20 shrink-0 rounded-t-lg">
        <img
          src={article.image}
          alt={article.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 group-hover:brightness-90 transition-all duration-500"
        />
        <span className="absolute top-3 left-3 bg-[#D89A2B] text-black text-[9px] font-display font-bold px-2.5 py-1 uppercase tracking-wider">
          {article.category}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2 font-display">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gold-dark" />
              <span>{article.date}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gold-dark" />
              <span>{article.readTime}</span>
            </span>
          </div>

          <h3 className="text-xs uppercase font-display font-bold leading-relaxed text-[#ECECEC] line-clamp-2 tracking-wide mb-2 group-hover:text-gold-light transition-colors">
            {article.title}
          </h3>

          <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed mb-4">
            {article.brief}
          </p>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
            <Eye className="w-3.5 h-3.5" />
            <span>{article.views} lượt xem</span>
          </span>
          <Link
            to={`/kien-thuc?postId=${article.id}`}
            className="flex items-center gap-1 text-gold-light font-display font-bold text-[10px] tracking-wider hover:text-white"
          >
            <span>XEM BÀI VIẾT</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

// Course card matching Academy Layout
export const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  const { showToast } = useApp();
  return (
    <div className="bg-[#121212] hover:bg-[#1A1A1A] gold-border rounded-lg overflow-hidden flex flex-col h-full group transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(216,154,43,0.15)]">
      <div className="relative aspect-[16/9] bg-black overflow-hidden shrink-0">
        <img
          src={course.image}
          alt={course.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute top-3 left-3 bg-[#0A0A0A]/90 border border-gold-dark/40 px-2.5 py-0.5 text-[8.5px] font-display font-semibold text-gold-light uppercase tracking-wider">
          {course.category}
        </div>
        
        {/* Course Duration Overlay tag */}
        <span className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 text-[10px] font-mono text-gray-400">
          {course.duration}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[10.5px] text-gray-500 mb-2">
            <span>Giảng viên: <strong className="text-gray-300 font-sans">{course.lecturer}</strong></span>
            <span className="px-2 py-0.5 bg-white/5 text-[9px] font-display font-bold text-gray-400 border border-white/5 capitalize rounded-sm">
              {course.difficulty}
            </span>
          </div>

          <h3 className="text-xs font-display font-bold text-[#ECECEC] leading-relaxed line-clamp-2 tracking-wide mb-3 group-hover:text-gold-light transition-colors">
            {course.title}
          </h3>

          <div className="flex items-center gap-1 text-xs text-amber-500 mb-4 select-none">
            <span className="flex items-center text-gold-light">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(course.rating) ? "fill-gold-light text-gold-light" : "text-gray-600"}`} />
              ))}
            </span>
            <strong className="text-gray-300 ml-1 font-mono text-[11px]">{course.rating}</strong>
            <span className="text-gray-600 text-[10px]">({course.reviews} đánh giá)</span>
          </div>

          {/* Academic progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
              <span>Tiến trình hoàn thành:</span>
              <span className="text-gold-light font-bold">{course.progress}%</span>
            </div>
            <div className="h-1 bg-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-gold-dark to-gold-light shadow-[0_0_8px_#F5C45A]"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#D89A2B]/20 flex items-center justify-between mt-3">
          <span className="text-[10px] text-gray-500 font-sans">{course.lessonsCount} bài giảng đính kèm</span>
          <button
            onClick={() => showToast(`Chào mừng bạn đăng ký khóa học: "${course.title}". Vui lòng liên hệ Hotline Học viện Voltara 1900 1234 để kích hoạt mã thẻ.`, "success")}
            className="text-[10px] font-display font-bold text-gold-light uppercase tracking-widest flex items-center gap-1 group/btn"
          >
            {course.progress > 0 ? "TIẾP TỤC HỌC" : "ĐĂNG KÝ HỌC"}
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Recruitment info Card block
export const JobCard: React.FC<{ job: Job; onSelect: (id: string) => void }> = ({ job, onSelect }) => {
  return (
    <div className="bg-[#121212] hover:bg-[#1A1A1A] gold-border p-5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(216,154,43,0.15)]">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/5 border border-white/5 text-gold-light shrink-0 rounded-md">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-display font-bold text-[#ECECEC] group-hover:text-gold-light transition-colors uppercase tracking-wide">
              {job.title}
            </h3>
            <span className="text-[8.5px] bg-gold-dark/10 text-gold-light border border-gold-dark/20 px-2 py-0.5 font-display font-semibold select-none">
              MỚI
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
            <span>Bộ phận: {job.department}</span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-1 text-gray-400">
              <MapPin className="w-3 h-3 text-gold-dark" />
              <span>{job.location}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">Lương: <strong className="text-gold-light font-sans font-medium">{job.salary}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto w-full sm:w-auto">
        <button
          onClick={() => onSelect(job.id)}
          className="flex-1 sm:flex-initial text-center gold-border hover:bg-gold-dark hover:text-black transition-all px-4 py-2 text-[10px] uppercase font-display font-bold tracking-widest text-[#ECECEC] py-2 rounded-md cursor-pointer duration-300"
        >
          ỨNG TUYỂN
        </button>
      </div>
    </div>
  );
};

// Reusable physical Branch / Coordinates Info block
export const BranchCard: React.FC<{ branch: Branch }> = ({ branch }) => {
  return (
    <div className="bg-[#121212] hover:bg-[#1A1A1A] gold-border rounded-lg overflow-hidden flex flex-col md:flex-row items-center group transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(216,154,43,0.15)]">
      <div className="w-full md:w-1/3 aspect-[16/10] md:aspect-square bg-black overflow-hidden relative shrink-0">
        <img
          src={branch.image}
          alt={branch.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2.5 left-2.5 bg-black/85 border border-gold-dark/30 px-3 py-1 font-display font-semibold text-[8.5px] text-yellow-500 select-none tracking-widest">
          {branch.type}
        </div>
      </div>
      
      <div className="p-5 flex-1 w-full flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-display font-extrabold uppercase text-[#ECECEC] tracking-wide mb-3 text-gold-light">
            {branch.name}
          </h3>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
              <span className="leading-relaxed">{branch.address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-gold-dark shrink-0" />
              <span>SĐT hỗ trợ: <strong className="text-gray-200">{branch.phone}</strong></span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-gold-dark shrink-0" />
              <span>Mail liên hệ: <strong className="text-gray-200">{branch.email}</strong></span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-[#D89A2B]/20 flex items-center justify-between mt-4">
          <span className="text-[10px] text-gray-500 italic">Mở cửa: 8:00 - 17:30 (Thứ 2 - Thứ 7)</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-display font-medium text-gold-light hover:text-white uppercase tracking-widest flex items-center gap-1"
          >
            <span>Dẫn đường Google Map</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
