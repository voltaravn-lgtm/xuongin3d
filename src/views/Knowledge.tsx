/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useRouter } from "next/navigation";
import { Search, Eye, Clock, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { SectionTitle, ArticleCard } from "../components/Cards";
import { useApp } from "../context/AppContext";
import { getMenuBanner } from "../lib/menuBanners";
import PageHero from "../components/PageHero";

export default function Knowledge() {
  const { menuItems, contactSettings, articles } = useApp();
  const bannerImage = getMenuBanner(menuItems, "/kien-thuc", "/images/kien-thuc.webp");
  const [searchParams] = useSearchParams();
  const router = useRouter();
  const postIdFromUrl = searchParams.get("postId");

  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [emailSub, setEmailSub] = useState("");
  const [subbed, setSubbed] = useState(false);

  useEffect(() => {
    if (postIdFromUrl && articles.some((article) => article.id === postIdFromUrl)) {
      router.replace(`/kien-thuc/${postIdFromUrl}`);
    }
  }, [articles, postIdFromUrl, router]);

  // Handle category count list matching Photo 5 right sidebar list
  const categoryCounts = [
    { name: "Tất cả bài viết", count: articles.length },
    { name: "Vật liệu in 3D", count: articles.filter(a => a.category === "Vật liệu in 3D").length },
    { name: "Hướng dẫn", count: articles.filter(a => a.category === "Hướng dẫn").length },
    { name: "Công nghệ in 3D", count: articles.filter(a => a.category === "Công nghệ in 3D").length },
    { name: "Ứng dụng in 3D", count: articles.filter(a => a.category === "Ứng dụng in 3D").length },
  ];

  // Filtering articles
  const filteredArticles = articles.filter(post => {
    const matchesCategory = activeCategory === "Tất cả" || activeCategory === "Tất cả bài viết" || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.brief.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Featured article (first item that is marked featured)
  const featuredArticle = articles.find(a => a.featured) || articles[0];

  // Rest of articles
  const secondaryArticles = featuredArticle
    ? filteredArticles.filter(a => a.id !== featuredArticle.id)
    : filteredArticles;

  // Top viewed articles matching Photo 5 right sidebar
  const popularArticles = [...articles]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const handleOpenPost = (post: any) => {
    router.push(`/kien-thuc/${post.id}`);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSub) return;
    setSubbed(true);
    setTimeout(() => {
      setEmailSub("");
    }, 1500);
  };

  return (
    <div id="knowledge-page" className="pb-20 relative bg-[#050505] text-left">
      <PageHero
        image={bannerImage}
        imageAlt="Kiến thức in 3D"
        breadcrumb="Kiến thức 3D"
        eyebrow="Cẩm nang công nghệ"
        title="Kiến thức 3D"
        description="Hướng dẫn chọn vật liệu, chuẩn bị file, sử dụng sản phẩm và cập nhật các ứng dụng mới của công nghệ in 3D."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 2. TAB SELECTION & SEARCH BOX CONTAINER (MATCHING PHOTO 5) */}
        <div className="bg-[#121212] border border-white/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          
          {/* Quick tab headers */}
          <div className="flex flex-wrap gap-1.5 font-display text-[11px] font-bold">
            {["Tất cả", "Vật liệu in 3D", "Hướng dẫn", "Công nghệ in 3D", "Ứng dụng in 3D"].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  if (cat === "Tất cả") setActiveCategory("Tất cả");
                  else setActiveCategory(cat);
                }}
                className={`px-4 py-2 hover:bg-white/5 transition-all uppercase tracking-wider ${
                  (activeCategory === "Tất cả" && cat === "Tất cả") || activeCategory === cat
                    ? "text-gold-light border-b-2 border-gold-dark"
                    : "text-gray-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Inline search bar */}
          <div className="flex items-center bg-black border border-white/10 px-3 h-10 w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-[#ECECEC] placeholder-gray-600 focus:outline-none w-full"
            />
          </div>

        </div>

        {/* 3. DOCK SUB-BODY STRUCTURE - FEATURED & DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Group 1: Articles grid left side (9 Columns) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Massive Featured Article layout on top block (Only shows when searching is basic) */}
            {!searchQuery && activeCategory === "Tất cả" && featuredArticle && (
              <div
                id="featured-large-article"
                onClick={() => handleOpenPost(featuredArticle)}
                className="bg-[#121212] border border-gold-dark/20 hover:border-gold-light/45 cursor-pointer rounded-lg overflow-hidden relative group transition-all duration-300 text-left"
              >
                {/* Visual backdrop cover */}
                <div className="aspect-[16/8] md:aspect-[21/9] w-full bg-black overflow-hidden relative">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-gold-dark text-black text-[9px] font-display font-extrabold px-3.5 py-1.5 uppercase tracking-widest">
                    NỔI BẬT
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-3.5">
                  <div className="flex items-center gap-4 text-[10.5px] text-gray-500 font-display">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold-dark" /> <span>{featuredArticle.date}</span></span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gold-dark" /> <span>{featuredArticle.readTime}</span></span>
                    <span className="text-gold-light font-bold uppercase tracking-wider">{featuredArticle.category}</span>
                  </div>

                  <h3 className="text-sm sm:text-base md:text-lg font-display font-black uppercase text-white leading-normal leading-relaxed group-hover:text-gold-light transition-colors">
                    {featuredArticle.title}
                  </h3>

                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                    {featuredArticle.brief}
                  </p>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-display font-semibold">
                    <span className="text-gray-500 flex items-center gap-1 font-mono text-[10.5px]"><Eye className="w-4 h-4" /> <span>{featuredArticle.views} lượt xem</span></span>
                    <span className="text-gold-light uppercase tracking-widest flex items-center gap-1.5 group-hover:text-white transition-colors">
                      <span>XEM CHI TIẾT</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of basic articles in category */}
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">
                  BÀI VIẾT QUAN TÂM
                </h4>
                <span className="text-[10px] text-gray-500 font-mono">ALL ARTICLES ({filteredArticles.length})</span>
              </div>

              {filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {secondaryArticles.map((article) => (
                    <div key={article.id} onClick={() => handleOpenPost(article)} className="cursor-pointer">
                      <ArticleCard article={article} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-white/10 text-gray-500 text-xs">
                  Không tìm thấy bài viết tin tức phù hợp từ khóa này.
                </div>
              )}
            </div>

          </div>

          {/* Group 2: Right Sidebar columns (3 Columns) - MATCHING PHOTO 5 SIDEBAR */}
          <div className="lg:col-span-4 space-y-6" id="knowledge-sidebar">
            
            {/* A. Category Count list block */}
            <div className="bg-[#121212] border border-white/5 p-5 text-left">
              <h4 className="text-[11px] font-display font-bold text-gold-light uppercase tracking-widest border-b border-white/5 pb-2.5 mb-4">
                DANH MỤC KIẾN THỨC
              </h4>
              <div className="divide-y divide-white/5 text-xs text-gray-400">
                {categoryCounts.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      if (cat.name === "Tất cả bài viết") setActiveCategory("Tất cả");
                      else setActiveCategory(cat.name);
                    }}
                    className="w-full py-3 flex items-center justify-between hover:text-gold-light transition-all"
                  >
                    <span>{cat.name}</span>
                    <span className="font-mono text-[10.5px] text-gray-600">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* B. Popular Articles with Number Markers list */}
            <div className="bg-[#121212] border border-white/5 p-5 text-left">
              <h4 className="text-[11px] font-display font-bold text-gold-light uppercase tracking-widest border-b border-white/5 pb-2.5 mb-4">
                BÀI VIẾT XEM NHIỀU
              </h4>
              <div className="space-y-4">
                {popularArticles.map((article, idx) => (
                  <div
                    key={article.id}
                    onClick={() => handleOpenPost(article)}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <span className="font-mono font-black text-gold-dark/40 text-lg shrink-0 mt-0.5 group-hover:text-gold-light transition-colors">
                      0{idx + 1}
                    </span>
                    <div className="space-y-1">
                      <h5 className="text-[11px] font-display font-extrabold leading-snug text-gray-300 line-clamp-2 uppercase group-hover:text-[#ECECEC] transition-colors">
                        {article.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[9.5px] text-gray-600">
                        <span>{article.date}</span>
                        <span>•</span>
                        <span>{article.views} views</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* C. Direct hotline advice card can tu van? */}
            <div className="border border-gold-dark/20 bg-gold-dark/5 p-5 text-center">
              <h4 className="text-[11px] font-display font-bold text-white uppercase tracking-wider mb-1">CẦN TƯ VẤN THÊM?</h4>
              <p className="text-[10px] text-gray-500 mb-4 font-sans leading-relaxed">
                Xưởng sẵn sàng tư vấn vật liệu, công nghệ và phương án thực hiện cho ý tưởng của bạn.
              </p>
              <a href={`tel:${contactSettings.hotline.replace(/[^\d+]/g, "")}`} className="w-full inline-flex items-center justify-center gap-2 bg-gold-dark text-black font-display font-bold text-xs py-3 shadow-[0_0_10px_rgba(216,154,43,0.3)] hover:bg-gold-light transition-all">
                <span>LIÊN HỆ NGAY</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>

        {/* 4. IMMERSIVE BOTTOM EMAIL SUBSCRIBE BOX PATTERNS */}
        <div className="mt-20 border border-gold-dark/15 bg-gradient-to-r from-[#121212] via-[#0A0A0A] to-[#121212] p-8 md:p-10 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-gold-dark/5 animate-ping duration-1000 pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex p-2.5 bg-gold-dark/10 border border-gold-dark/25 text-gold-light rounded-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            
            <h3 className="text-sm sm:text-base font-display font-extrabold uppercase text-white tracking-widest">
              KHÁM PHÁ THÊM KIẾN THỨC IN 3D
            </h3>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              Đăng ký nhận bản tin để cập nhật mẫu mới, hướng dẫn vật liệu và ứng dụng in 3D.
            </p>

            <form onSubmit={handleSubscribe} className="flex h-12 w-full max-w-md mx-auto border border-white/10 bg-black focus-within:border-gold-light transition-colors mt-6">
              <input
                type="email"
                placeholder="Nhập địa chỉ email của bạn..."
                required
                value={emailSub}
                onChange={(e) => setEmailSub(e.target.value)}
                className="flex-1 bg-transparent px-4 text-xs text-[#ECECEC] placeholder-gray-600 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gold-dark hover:bg-gold-light text-black font-display font-bold text-xs px-6 flex items-center justify-center transition-all whitespace-nowrap"
              >
                {subbed ? "ĐÃ ĐĂNG KÝ" : "ĐĂNG KÝ NGAY"}
              </button>
            </form>
            
            {subbed && (
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">Đăng ký nhận bản tin thành công. Xưởng cam kết bảo mật thông tin và không gửi spam.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
