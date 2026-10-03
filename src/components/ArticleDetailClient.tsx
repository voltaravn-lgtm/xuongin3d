"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock, Eye, Phone } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ARTICLES_DATA } from "../data";

interface ArticleDetailClientProps {
  articleId: string;
}

export default function ArticleDetailClient({ articleId }: ArticleDetailClientProps) {
  const { articles, contactSettings } = useApp();
  const article = articles.find((item) => item.id === articleId)
    || ARTICLES_DATA.find((item) => item.id === articleId);

  if (!article) {
    return (
      <section className="min-h-[60vh] bg-[#050505] px-4 py-24 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gold-light">Kiến thức 3D</p>
        <h1 className="mb-5 font-display text-2xl font-black uppercase text-white">Không tìm thấy bài viết</h1>
        <Link href="/kien-thuc" className="inline-flex items-center gap-2 border border-gold-dark px-5 py-3 text-xs font-bold uppercase text-gold-light hover:bg-gold-dark hover:text-black">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>
      </section>
    );
  }

  const relatedArticles = articles
    .filter((item) => item.id !== article.id)
    .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
    .slice(0, 3);
  const paragraphs = article.content.split(/\n\s*\n/).filter(Boolean);
  const hotlineHref = contactSettings.hotline.replace(/[^\d+]/g, "");

  return (
    <article className="bg-[#050505] pb-20 text-left text-[#ECECEC]">
      <header className="relative overflow-hidden border-b border-gold-dark/20 bg-black">
        <div className="absolute inset-0">
          <img src={article.image} alt="" className="h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/30" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <nav className="mb-7 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            <Link href="/" className="hover:text-gold-light">Trang chủ</Link>
            <span>/</span>
            <Link href="/kien-thuc" className="hover:text-gold-light">Kiến thức 3D</Link>
            <span>/</span>
            <span className="text-gold-light">{article.category}</span>
          </nav>
          <span className="mb-5 inline-block bg-gold-dark px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black">
            {article.category}
          </span>
          <h1 className="max-w-4xl font-display text-2xl font-black uppercase leading-tight text-white sm:text-3xl md:text-4xl">
            {article.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-gray-300">{article.brief}</p>
          <div className="mt-7 flex flex-wrap items-center gap-5 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-gold-dark" />{article.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold-dark" />{article.readTime}</span>
            <span className="flex items-center gap-1.5"><Eye className="h-4 w-4 text-gold-dark" />{article.views} lượt xem</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8 lg:py-16">
        <div>
          <img src={article.image} alt={article.title} className="mb-9 aspect-[16/9] w-full border border-white/10 object-cover" />
          <div className="space-y-5 text-[15px] leading-8 text-gray-300">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className={/^\d+\.|^Bước \d+/i.test(paragraph) ? "border-l-2 border-gold-dark pl-4" : ""}>
                {paragraph}
              </p>
            ))}
          </div>
          <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-6">
            <Link href="/kien-thuc" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Tất cả bài viết
            </Link>
            <span className="text-[11px] text-gray-600">© Xưởng In 3D</span>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border border-gold-dark/20 bg-[#101010] p-5">
            <h2 className="mb-2 font-display text-sm font-black uppercase text-white">Bạn cần tư vấn?</h2>
            <p className="mb-5 text-xs leading-6 text-gray-400">Gửi ý tưởng, hình ảnh hoặc file 3D để xưởng tư vấn vật liệu và phương án thực hiện.</p>
            <a href={`tel:${hotlineHref}`} className="flex items-center justify-center gap-2 bg-gold-dark px-4 py-3 text-xs font-black uppercase text-black hover:bg-gold-light">
              <Phone className="h-4 w-4" /> {contactSettings.hotline}
            </a>
          </div>

          {relatedArticles.length > 0 && (
            <div className="border border-white/10 bg-[#101010] p-5">
              <h2 className="mb-4 border-b border-white/10 pb-3 font-display text-xs font-black uppercase tracking-wider text-gold-light">Bài viết liên quan</h2>
              <div className="divide-y divide-white/10">
                {relatedArticles.map((item) => (
                  <Link key={item.id} href={`/kien-thuc/${item.id}`} className="group block py-4 first:pt-0 last:pb-0">
                    <span className="mb-1 block text-[9px] uppercase tracking-wider text-gray-500">{item.category}</span>
                    <span className="flex gap-2 text-xs font-bold leading-5 text-gray-300 group-hover:text-gold-light">
                      {item.title}<ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
