"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Gift, Phone, PlayCircle, ShieldCheck, ShoppingCart, Zap } from "lucide-react";
import QuoteRequestModal from "./QuoteRequestModal";
import OrderRequestModal from "./OrderRequestModal";
import { useApp } from "../context/AppContext";
import { getProductHref } from "../lib/productRoutes";
import { cleanVideoUrls, getProductVideoEmbed } from "../lib/video";
import { Product, ProductCombo, ProductVariant } from "../types";
import ProductPromoImage from "./ProductPromoImage";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const { products, salesPrograms, addToCart, contactSettings } = useApp();
  const currentProduct = products.find((item) => item.id === product.id) || product;
  const productSource = (products.length > 0 ? products : [product, ...relatedProducts]).filter(item => !item.hidden);
  const sameCategoryProducts = productSource.filter(
    (item) => item.category === currentProduct.category && item.id !== currentProduct.id,
  );
  const currentRelatedProducts = (
    sameCategoryProducts.length > 0
      ? sameCategoryProducts
      : productSource.filter((item) => item.id !== currentProduct.id)
  ).slice(0, 12);
  const relatedProductsRef = useRef<HTMLDivElement | null>(null);
  const productVariants = useMemo(
    () => (currentProduct.variants || []).filter((variant) => String(variant.name || "").trim()),
    [currentProduct.variants],
  );
  const productCombos = useMemo(
    () => [
      ...(currentProduct.combos || []),
      ...salesPrograms
        .filter((program) => {
          if (program.type !== "combo") return false;
          return program.primaryProductId === currentProduct.id || (program.items || []).some((item) => item.productId === currentProduct.id);
        })
        .map((program) => ({
          id: program.id,
          name: program.name,
          items: program.items,
          originalPrice: program.originalPrice,
          comboPrice: program.promoPrice,
          description: program.description,
          sku: program.sku,
          image: program.image,
          startsAt: program.startsAt,
          endsAt: program.endsAt,
          hidden: program.hidden,
        } as ProductCombo)),
    ].filter((combo) => {
      if (!String(combo.name || "").trim() || combo.hidden) return false;
      const now = Date.now();
      const startsAt = combo.startsAt ? new Date(combo.startsAt).getTime() : 0;
      const endsAt = combo.endsAt ? new Date(combo.endsAt).getTime() : 0;
      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    }),
    [currentProduct.combos, currentProduct.id, salesPrograms],
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedComboId, setSelectedComboId] = useState("");
  const selectedVariant = productVariants.find((variant) => variant.id === selectedVariantId) || productVariants[0] || null;
  const selectedCombo = selectedComboId ? productCombos.find((combo) => combo.id === selectedComboId) || null : null;

  const gallery = useMemo(() => {
    const images = [
      selectedVariant?.image,
      selectedCombo?.image,
      currentProduct.image,
      ...(currentProduct.images || []),
      ...productVariants.map((variant) => variant.image),
    ];
    return Array.from(new Set(images.filter((image): image is string => Boolean(image))));
  }, [currentProduct.image, currentProduct.images, productVariants, selectedCombo?.image, selectedVariant?.image]);

  const [activeImage, setActiveImage] = useState(gallery[0] || currentProduct.image);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const descriptionHtml = useMemo(
    () => formatProductDescriptionToHtml(currentProduct.description),
    [currentProduct.description],
  );
  const shortDescription = useMemo(
    () => getShortDescription(currentProduct.description),
    [currentProduct.description],
  );
  const summarySpecs = useMemo(
    () => [
      ["Điện áp", currentProduct.voltage],
      ["Dung lượng", currentProduct.capacity],
      ["Cell", currentProduct.cellType],
      ["Bảo hành", currentProduct.warranty],
    ].filter(([, value]) => String(value || "").trim()),
    [currentProduct.voltage, currentProduct.capacity, currentProduct.cellType, currentProduct.warranty],
  );
  const technicalSpecs = useMemo(
    () => Object.entries(currentProduct.specs || {}).filter(([, value]) => String(value || "").trim()),
    [currentProduct.specs],
  );
  const productVideos = useMemo(
    () => cleanVideoUrls(currentProduct.videoUrls).map((url, index) => getProductVideoEmbed(url, index)).filter(Boolean),
    [currentProduct.videoUrls],
  );
  const regularPrice = formatDisplayPrice(selectedVariant?.price || currentProduct.price);
  const salePrice = formatDisplayPrice(selectedVariant?.salePrice || currentProduct.salePrice);
  const comboOriginalPrice = formatDisplayPrice(selectedCombo?.originalPrice);
  const comboPrice = formatDisplayPrice(selectedCombo?.comboPrice);
  const displayRegularPrice = selectedCombo ? comboOriginalPrice || regularPrice : regularPrice;
  const displaySalePrice = selectedCombo ? comboPrice : salePrice;
  const hasDisplayDiscount = Boolean(displaySalePrice && isLowerPrice(displaySalePrice, displayRegularPrice));
  const displayFinalPrice = displaySalePrice || displayRegularPrice;
  const hasVisiblePrice = Boolean(displayFinalPrice);
  const activeImageIndex = Math.max(0, gallery.findIndex((image) => image === activeImage));
  const goToPreviousImage = () => {
    if (gallery.length <= 1) return;
    const nextIndex = activeImageIndex <= 0 ? gallery.length - 1 : activeImageIndex - 1;
    setActiveImage(gallery[nextIndex]);
  };
  const goToNextImage = () => {
    if (gallery.length <= 1) return;
    const nextIndex = activeImageIndex >= gallery.length - 1 ? 0 : activeImageIndex + 1;
    setActiveImage(gallery[nextIndex]);
  };
  const scrollRelatedProducts = (direction: "previous" | "next") => {
    const container = relatedProductsRef.current;
    if (!container) return;

    const scrollDistance = Math.max(280, Math.floor(container.clientWidth * 0.85));
    container.scrollBy({
      left: direction === "next" ? scrollDistance : -scrollDistance,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    setActiveImage(gallery[0] || currentProduct.image);
  }, [gallery, currentProduct.image]);

  useEffect(() => {
    setSelectedVariantId(productVariants[0]?.id || "");
  }, [currentProduct.id, productVariants]);

  useEffect(() => {
    setSelectedComboId("");
  }, [currentProduct.id]);

  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    if (variant.image) setActiveImage(variant.image);
  };

  const handleSelectCombo = (combo: ProductCombo) => {
    setSelectedComboId(combo.id);
    if (combo.image) setActiveImage(combo.image);
  };
  const getComboSummary = (combo: ProductCombo | null) => {
    if (!combo) return "";
    if (combo.description) return combo.description;
    return (combo.items || [])
      .map((item) => {
        const itemProduct = products.find((productItem) => productItem.id === item.productId);
        return itemProduct ? `${itemProduct.name}${item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ""}` : "";
      })
      .filter(Boolean)
      .join(" + ");
  };

  return (
    <div className="product-detail-page bg-[#050505] pb-20">
      <section className="relative overflow-hidden bg-black pt-28 pb-12 lg:pt-36 lg:pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={currentProduct.image}
            alt={currentProduct.name}
            className="h-full w-full object-cover opacity-20 blur-sm scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex items-center gap-2 text-[11px] font-mono tracking-wider text-gray-400">
            <a href="/" className="hover:text-gold-light transition-colors">Trang chủ</a>
            <span>/</span>
            <a href="/san-pham" className="hover:text-gold-light transition-colors">Sản phẩm</a>
            <span>/</span>
            <span className="text-gold-light line-clamp-1">{currentProduct.name}</span>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <div className="border border-gold-dark/25 bg-[#0A0A0A] p-5 shadow-[0_0_40px_rgba(216,154,43,0.08)]">
                <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
                  {currentProduct.tag && (
                    <span className="absolute left-4 top-4 z-10 bg-gold-dark px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider text-black">
                      {currentProduct.tag}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,154,43,0.13)_0%,transparent_65%)]" />
                  <ProductPromoImage
                    src={activeImage}
                    alt={currentProduct.name}
                    className="relative z-10"
                    imgClassName="h-full w-full object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.7)]"
                    showOverlay={activeImageIndex === 0}
                  />
                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goToPreviousImage}
                        className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-gold-dark/40 bg-black/70 text-gold-light backdrop-blur-sm transition-colors hover:border-gold-light hover:text-white"
                        aria-label="Xem ảnh trước"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-gold-dark/40 bg-black/70 text-gold-light backdrop-blur-sm transition-colors hover:border-gold-light hover:text-white"
                        aria-label="Xem ảnh tiếp theo"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {gallery.length > 1 && (
                  <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                    {gallery.map((image) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => setActiveImage(image)}
                        className={`h-24 w-24 shrink-0 border bg-black p-2 transition-colors sm:h-28 sm:w-28 ${
                          activeImage === image ? "border-gold-light" : "border-white/10 hover:border-gold-dark/50"
                        }`}
                        aria-label={`Xem ảnh ${currentProduct.name}`}
                      >
                        <img src={image} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-display font-bold uppercase tracking-[0.22em] text-gold-light">
                <span>{currentProduct.brand}</span>
                <span className="text-gray-600">•</span>
                <span>{currentProduct.category}</span>
              </div>

              <h1 className="max-w-3xl text-2xl font-display font-black uppercase leading-tight text-white sm:text-3xl lg:text-4xl">
                {currentProduct.name}
              </h1>

              <div className="my-6 h-[2px] w-28 bg-gradient-to-r from-gold-dark to-transparent" />

              <p className="max-w-2xl text-sm leading-7 text-gray-300">
                {shortDescription}
              </p>

              {hasVisiblePrice && (
                <div className="mt-5 inline-flex flex-wrap items-end gap-3 border border-gold-dark/25 bg-gold-dark/5 px-4 py-3">
                  {hasDisplayDiscount ? (
                    <>
                      <div>
                        <div className="text-[9px] font-display font-bold uppercase tracking-widest text-gray-500">Giá giảm</div>
                        <div className="text-2xl font-display font-black text-gold-light">{displaySalePrice}</div>
                      </div>
                      {displayRegularPrice && (
                        <div className="pb-1 text-sm font-semibold text-gray-500 line-through">{displayRegularPrice}</div>
                      )}
                    </>
                  ) : (
                    <div>
                      <div className="text-[9px] font-display font-bold uppercase tracking-widest text-gray-500">Giá bán</div>
                      <div className="text-2xl font-display font-black text-gold-light">{displayFinalPrice}</div>
                    </div>
                  )}
                </div>
              )}

              {productVariants.length > 0 && (
                <div className="mt-6">
                  <div className="mb-2 text-[10px] font-display font-bold uppercase tracking-widest text-gray-500">Chọn phân loại</div>
                  <div className="flex flex-wrap gap-2">
                    {productVariants.map((variant) => {
                      const isActive = selectedVariant?.id === variant.id;
                      const variantPrice = formatDisplayPrice(variant.salePrice || variant.price || currentProduct.salePrice || currentProduct.price);
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleSelectVariant(variant)}
                          className={`flex items-center gap-2 border px-3 py-2 text-left transition-colors ${
                            isActive ? "border-gold-light bg-gold-dark/10 text-white" : "border-white/10 bg-[#101010] text-gray-300 hover:border-gold-dark/60"
                          }`}
                        >
                          {variant.image && (
                            <img src={variant.image} alt="" className="h-9 w-9 shrink-0 object-contain" referrerPolicy="no-referrer" />
                          )}
                          <span>
                            <span className="block text-[11px] font-display font-bold uppercase tracking-wider">{variant.name}</span>
                            {variantPrice && <span className="mt-0.5 block text-[10px] font-semibold text-gold-light">{variantPrice}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {productCombos.length > 0 && (
                <div className="mt-6 border border-gold-dark/35 bg-gold-dark/5 p-4 shadow-[0_0_24px_rgba(216,154,43,0.08)]">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 bg-gold-dark px-3 py-1 text-[10px] font-display font-black uppercase tracking-widest text-black">
                        <Gift className="h-3.5 w-3.5" />
                        Combo khuyến mãi
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-gray-400">Có thể mua lẻ sản phẩm hoặc chọn gói combo ưu đãi bên dưới.</p>
                    </div>
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-gold-light">
                      {productCombos.length} ưu đãi
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComboId("");
                        setActiveImage(selectedVariant?.image || currentProduct.image);
                      }}
                      className={`border p-3 text-left transition-colors ${
                        !selectedCombo ? "border-gold-light bg-gold-dark/10 text-white" : "border-white/10 bg-[#101010] text-gray-300 hover:border-gold-dark/60"
                      }`}
                    >
                      <span className="block text-[11px] font-display font-black uppercase tracking-wider">Mua lẻ sản phẩm</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-gray-400">Không áp dụng combo, mua riêng sản phẩm hiện tại.</span>
                      {(regularPrice || salePrice) && (
                        <span className="mt-2 flex flex-wrap items-end gap-2">
                          {(salePrice || regularPrice) && <span className="text-sm font-display font-black text-gold-light">{salePrice || regularPrice}</span>}
                          {salePrice && isLowerPrice(salePrice, regularPrice) && regularPrice && <span className="text-[11px] font-semibold text-gray-500 line-through">{regularPrice}</span>}
                        </span>
                      )}
                    </button>
                    {productCombos.map((combo) => {
                      const isActive = selectedCombo?.id === combo.id;
                      const comboOriginal = formatDisplayPrice(combo.originalPrice);
                      const comboSale = formatDisplayPrice(combo.comboPrice);
                      const hasComboDiscount = Boolean(comboSale && isLowerPrice(comboSale, comboOriginal));
                      return (
                        <button
                          key={combo.id}
                          type="button"
                          onClick={() => handleSelectCombo(combo)}
                          className={`border p-3 text-left transition-colors ${
                            isActive ? "border-gold-light bg-gold-dark/10 text-white" : "border-white/10 bg-[#101010] text-gray-300 hover:border-gold-dark/60"
                          }`}
                        >
                          <span className="block text-[11px] font-display font-black uppercase tracking-wider">{combo.name}</span>
                          {getComboSummary(combo) && <span className="mt-1 block text-[10px] leading-relaxed text-gray-400">{getComboSummary(combo)}</span>}
                          {(comboOriginal || comboSale) && (
                            <span className="mt-2 flex flex-wrap items-end gap-2">
                              {(comboSale || comboOriginal) && <span className="text-sm font-display font-black text-gold-light">{comboSale || comboOriginal}</span>}
                              {hasComboDiscount && comboOriginal && <span className="text-[11px] font-semibold text-gray-500 line-through">{comboOriginal}</span>}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {summarySpecs.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {summarySpecs.map(([label, value]) => (
                    <div key={label} className="border border-white/10 bg-[#101010] px-4 py-3">
                      <div className="text-[9px] font-display font-bold uppercase tracking-wider text-gray-500">{label}</div>
                      <div className="mt-1 text-xs font-semibold text-[#ECECEC]">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {hasVisiblePrice && (
                  <button
                    type="button"
                    onClick={() => addToCart(currentProduct, 1, selectedVariant, selectedCombo)}
                    className="inline-flex h-12 items-center justify-center gap-2 border border-gold-dark/40 px-6 text-[11px] font-display font-black uppercase tracking-widest text-gold-light transition-colors hover:border-gold-light hover:text-white"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Thêm giỏ hàng
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => hasVisiblePrice ? setIsOrderModalOpen(true) : setIsQuoteModalOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 bg-gradient-to-r from-[#D89A2B] to-[#F5C45A] px-6 text-[11px] font-display font-black uppercase tracking-widest text-black shadow-[0_0_25px_rgba(216,154,43,0.2)] transition-transform hover:scale-[1.01]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {hasVisiblePrice ? "Đặt hàng / tư vấn" : "Yêu cầu báo giá"}
                </button>
                <a
                  href={`tel:${contactSettings.hotline.replace(/[^\d+]/g, "")}`}
                  className="inline-flex h-12 items-center justify-center gap-2 border border-gold-dark/30 px-6 text-[11px] font-display font-bold uppercase tracking-widest text-gold-light transition-colors hover:border-gold-light hover:text-white"
                >
                  <Phone className="h-4 w-4" />
                  {contactSettings.hotline}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pt-12 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-8">
          {descriptionHtml && (
            <div className="mb-8 border border-white/10 bg-[#0C0C0C] p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-2">
                <Zap className="h-5 w-5 text-gold-light" />
                <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">
                  Mô tả chi tiết
                </h2>
              </div>
              <div
                className="product-description-content text-sm leading-7 text-gray-300"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>
          )}

          {productVideos.length > 0 && (
            <div className="mb-8 border border-white/10 bg-[#0C0C0C] p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-gold-light" />
                <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">
                  Video sản phẩm
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {productVideos.map((video, index) => video && (
                  <div key={`${video.originalUrl}-${index}`} className="overflow-hidden border border-white/10 bg-black">
                    {video.embedUrl ? (
                      <iframe
                        src={video.embedUrl}
                        title={`${currentProduct.name} video ${index + 1}`}
                        className={`${video.provider === "instagram" || /facebook\.com\/reel\//i.test(video.originalUrl) ? "mx-auto aspect-[9/16] max-w-md" : "aspect-video"} w-full bg-black`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : video.directUrl ? (
                      <video controls src={video.directUrl} className="aspect-video w-full bg-black" />
                    ) : (
                      <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-[#050505] p-6 text-center">
                        <PlayCircle className="h-10 w-10 text-gold-light" />
                        <p className="max-w-sm text-xs leading-relaxed text-gray-400">
                          Video này cần mở trên trang nguồn.
                        </p>
                        <a
                          href={video.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 border border-gold-dark/40 px-4 py-2 text-[10px] font-display font-bold uppercase tracking-widest text-gold-light hover:border-gold-light hover:text-white"
                        >
                          Mở video
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:col-span-4">
          {technicalSpecs.length > 0 && (
            <div className="border border-white/10 bg-[#0C0C0C] p-6">
              <div className="mb-5 flex items-center gap-2">
                <Zap className="h-5 w-5 text-gold-light" />
                <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">
                  Thông số kỹ thuật
                </h2>
              </div>

              <div className="divide-y divide-white/10">
                {technicalSpecs.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-1 gap-1 py-3">
                    <div className="text-[10px] font-display font-bold uppercase tracking-wider text-gray-500">{key}</div>
                    <div className="text-sm font-semibold text-[#ECECEC]">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-gold-dark/25 bg-gold-dark/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold-light" />
              <h2 className="font-display text-sm font-black uppercase tracking-widest text-white">
                Cam kết của Xưởng In 3D
              </h2>
            </div>
            <ul className="space-y-3 text-xs leading-relaxed text-gray-300">
              {[
                "Tư vấn công nghệ và vật liệu theo mục đích sử dụng.",
                "Thống nhất kích thước, màu sắc và phương án trước khi sản xuất.",
                "Kiểm tra sản phẩm và hỗ trợ sau bàn giao.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href="/san-pham"
            className="inline-flex w-full items-center justify-center gap-2 border border-white/10 px-5 py-4 text-[11px] font-display font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-gold-light hover:text-gold-light"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách sản phẩm
          </a>
        </aside>
      </section>

      {currentRelatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.22em] text-gold-light">
                Cùng danh mục
              </span>
              <h2 className="mt-2 font-display text-xl font-black uppercase text-white">
                Sản phẩm liên quan
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollRelatedProducts("previous")}
                className="inline-flex h-10 w-10 items-center justify-center border border-white/10 text-gold-light transition-colors hover:border-gold-light hover:text-white"
                aria-label="Xem sản phẩm liên quan phía trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRelatedProducts("next")}
                className="inline-flex h-10 w-10 items-center justify-center border border-white/10 text-gold-light transition-colors hover:border-gold-light hover:text-white"
                aria-label="Xem sản phẩm liên quan tiếp theo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <a href="/san-pham" className="hidden text-[11px] font-display font-bold uppercase tracking-widest text-gold-light hover:text-white sm:inline-flex">
                Xem tất cả
              </a>
            </div>
          </div>

          <div
            ref={relatedProductsRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3"
          >
            {currentRelatedProducts.map((item) => (
              <a
                key={item.id}
                href={getProductHref(item)}
                className="group w-[78vw] shrink-0 snap-start border border-white/10 bg-[#101010] p-4 transition-colors hover:border-gold-dark/50 sm:w-[320px] lg:w-[360px]"
              >
                <div className="aspect-square bg-black p-3">
                  <ProductPromoImage
                    src={item.image}
                    alt={item.name}
                    imgClassName="h-full w-full object-contain transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-display font-bold uppercase tracking-wider text-gold-light">{item.brand}</div>
                    <h3 className="mt-1 line-clamp-2 text-xs font-display font-bold uppercase leading-relaxed text-white">{item.name}</h3>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform group-hover:translate-x-1 group-hover:text-gold-light" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <QuoteRequestModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        prepopulatedProduct={currentProduct.name}
      />
      <OrderRequestModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        productName={currentProduct.name}
        variantName={selectedVariant?.name}
        comboName={selectedCombo?.name}
        comboDescription={getComboSummary(selectedCombo)}
        comboOriginalPrice={selectedCombo ? displayRegularPrice : ""}
        productPrice={displayFinalPrice}
        productSku={selectedCombo?.sku || selectedVariant?.sku || currentProduct.sku}
        productId={currentProduct.id}
      />
    </div>
  );
}

function decodeDescriptionHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function hasDescriptionHtml(value: string): boolean {
  return /<(p|div|table|tbody|thead|tr|td|th|ul|ol|li|h[1-6]|strong|b|em|i|br|img|a)(\s|>|\/)/i.test(value);
}

function stripDescriptionHtml(value: string): string {
  return decodeDescriptionHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function formatProductDescriptionToHtml(desc: string | undefined): string {
  if (!desc) return "";

  let html = decodeDescriptionHtml(desc.trim());
  if (hasDescriptionHtml(html)) return html;

  html = html.replace(/!\[(.*?)\]\s*\((.*?)\)/gs, '<img src="$2" alt="$1" class="my-5 h-auto w-full object-contain border border-white/10 bg-black p-3" referrerPolicy="no-referrer" />');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.*?)$/gm, '<h3 class="mt-6 mb-2 font-display text-sm font-black uppercase tracking-widest text-gold-light">$1</h3>');
  html = html.replace(/^-[ ]+(.*?)$/gm, '<li class="ml-5 list-disc text-gray-300">$1</li>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-gold-light underline hover:text-white" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\n/g, "<br />");

  return html;
}

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

function getShortDescription(desc: string | undefined): string {
  if (!desc) return "";

  const text = hasDescriptionHtml(decodeDescriptionHtml(desc)) ? stripDescriptionHtml(desc) : desc;

  return text
    .replace(/!\[(.*?)\]\s*\((.*?)\)/gs, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^### /gm, "")
    .trim()
    .split("\n")
    .filter(Boolean)[0] || "";
}
