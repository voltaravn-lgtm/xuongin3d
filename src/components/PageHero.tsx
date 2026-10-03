import React from "react";
import { Link } from "react-router-dom";

interface PageHeroProps {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  breadcrumb: string;
  children?: React.ReactNode;
  imagePosition?: string;
  className?: string;
}

export default function PageHero({
  image,
  imageAlt,
  eyebrow,
  title,
  description,
  breadcrumb,
  children,
  imagePosition = "object-center",
  className = "mb-12",
}: PageHeroProps) {
  return (
    <section
      className={`relative flex min-h-[400px] items-center overflow-hidden border-b border-white/5 bg-black py-14 sm:min-h-[430px] lg:h-[480px] lg:min-h-0 lg:py-16 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 z-0 select-none">
        <img
          src={image}
          alt={imageAlt}
          className={`h-full w-full object-cover ${imagePosition}`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/20 lg:from-black/95 lg:via-black/70 lg:to-transparent/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 font-mono text-xs tracking-wider text-gray-400">
          <Link to="/" className="transition-colors hover:text-gold-light">Trang chủ</Link>
          <span>/</span>
          <span className="font-black text-gold-dark">{breadcrumb}</span>
        </div>

        <div className="flex max-w-3xl flex-col items-start text-left">
          <span className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-gold-light">{eyebrow}</span>
          <h1 className="mb-6 font-display text-3xl font-black uppercase leading-tight text-white glow-text sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <div className="mb-6 h-[2px] w-28 bg-gradient-to-r from-gold-dark to-transparent" />
          <div className="max-w-2xl text-xs leading-relaxed text-gray-300 sm:text-sm">{description}</div>
          {children ? <div className="mt-7 flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
