/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Send, Check, ShieldCheck, HelpCircle, ArrowRight, PhoneCall, RefreshCw } from "lucide-react";
import { BRANCHES_DATA } from "../data";
import { SectionTitle, BranchCard } from "../components/Cards";

import { useApp } from "../context/AppContext";
import { getMenuBanner } from "../lib/menuBanners";
import PageHero from "../components/PageHero";

export default function Contact() {
  const { addSubmission, contactSettings, menuItems } = useApp();
  const bannerImage = getMenuBanner(menuItems, "/lien-he", "/images/lien-he.webp");
  const [searchParams] = useSearchParams();
  const prepopulatedTitle = searchParams.get("title") || "";
  const prepopulatedType = searchParams.get("type") || "";

  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
    inquiryType: "technical"
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const phoneHref = contactSettings.hotline.replace(/[^\d+]/g, "");

  // Prepopulate form fields if query params are present
  useEffect(() => {
    if (prepopulatedTitle) {
      setForm(prev => ({
        ...prev,
        subject: `Yêu cầu thông tin: ${prepopulatedTitle.replace(/_/g, " ")}`
      }));
    }
    if (prepopulatedType) {
      if (prepopulatedType === "print_3d") {
        setForm(prev => ({
          ...prev,
          inquiryType: "print_3d",
          subject: "Yêu cầu tư vấn in 3D theo yêu cầu"
        }));
      } else if (prepopulatedType === "register_dealer") {
        setForm(prev => ({
          ...prev,
          inquiryType: "dealer",
          subject: "Yêu cầu hợp tác với Xưởng In 3D"
        }));
      } else if (prepopulatedType === "spec_request") {
        setForm(prev => ({
          ...prev,
          inquiryType: "project",
          subject: "Yêu cầu kỹ sư khảo sát & thiết kế phụ tải riêng"
        }));
      } else if (prepopulatedType === "register_academy") {
        setForm(prev => ({
          ...prev,
          inquiryType: "academy",
          subject: "Yêu cầu tư vấn dịch vụ in 3D"
        }));
      }
    }
  }, [prepopulatedTitle, prepopulatedType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    addSubmission({
      id: "sub-" + Date.now(),
      fullname: form.fullname,
      phone: form.phone,
      email: form.email,
      subject: form.subject || "Yêu cầu tư vấn",
      message: form.message,
      inquiryType: form.inquiryType,
      date: new Date().toLocaleDateString("vi-VN")
    });

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({
          fullname: "",
          phone: "",
          email: "",
          subject: "",
          message: "",
          inquiryType: "technical"
        });
      }, 2500);
    }, 1200);
  };

  return (
    <div id="contact-page" className="pb-20 relative bg-[#050505] text-left">
      <PageHero
        image={bannerImage}
        imageAlt="Liên hệ Xưởng In 3D"
        breadcrumb="Liên hệ"
        eyebrow="Kết nối Xưởng In 3D"
        title="Liên hệ với chúng tôi"
        description="Gửi yêu cầu tư vấn, báo giá sản phẩm, thiết kế file hoặc dự án in 3D. Xưởng tiếp nhận thông tin 24/7."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 2. MAIN SUB-BODY LAYOUT - CONTACT FORM & DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch mb-20" id="contact-form-row">
          
          {/* Left column: Highly styled luxurious validation Form */}
          <div className="lg:col-span-7 bg-[#121212] border border-gold-dark/20 p-6 md:p-8 rounded-xl relative">
            <div className="absolute top-0 left-8 transform -translate-y-1/2 bg-gold-dark text-black text-[9px] font-display font-extrabold px-3.5 py-1 uppercase tracking-widest rounded-sm">
              GỬI YÊU CẦU TỚI XƯỞNG
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-display font-bold text-gray-600 uppercase mb-1 block">Họ và Tên của bạn *</label>
                  <input
                    type="text"
                    required
                    value={form.fullname}
                    onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                    placeholder="Ví dụ: Hoàng Anh Quân"
                    className="w-full bg-black text-[#ECECEC] border border-white/10 px-3.5 py-3 text-xs focus:outline-none focus:border-gold-light rounded-md"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-display font-bold text-gray-600 uppercase mb-1 block">Số điện thoại liên hệ *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ví dụ: 0945*******"
                    className="w-full bg-black text-[#ECECEC] border border-white/10 px-3.5 py-3 text-xs focus:outline-none focus:border-gold-light rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-display font-bold text-gray-600 uppercase mb-1 block">Hòm thư Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ví dụ: quan.hoang@gmail.com"
                    className="w-full bg-black text-[#ECECEC] border border-white/10 px-3.5 py-3 text-xs focus:outline-none focus:border-gold-light rounded-md"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-display font-bold text-gray-600 uppercase mb-1 block">Nhu cầu Liên kết hoặc Tư vấn *</label>
                  <select
                    value={form.inquiryType}
                    onChange={(e) => setForm({ ...form, inquiryType: e.target.value })}
                    className="w-full bg-black text-[#ECECEC] border border-white/10 h-11 px-3.5 text-xs focus:outline-none focus:border-gold-light rounded-md"
                  >
                    <option value="print_3d">In 3D theo yêu cầu</option>
                    <option value="product">Đặt sản phẩm in 3D</option>
                    <option value="project">Giải pháp dành cho doanh nghiệp</option>
                    <option value="design">Thiết kế hoặc chỉnh sửa file 3D</option>
                    <option value="warranty">Bảo hành hoặc hỗ trợ sau bàn giao</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-display font-bold text-gray-600 uppercase mb-1 block">Tiêu đề yêu cầu *</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ví dụ: Báo giá in mô hình theo file 3D"
                  className="w-full bg-black text-[#ECECEC] border border-white/10 px-3.5 py-3 text-xs focus:outline-none focus:border-gold-light rounded-md"
                />
              </div>

              <div>
                <label className="text-[9px] font-display font-bold text-gray-600 uppercase mb-1 block">Chi tiết nội dung tin nhắn *</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Mô tả kích thước, số lượng, vật liệu, thời gian và mục đích sử dụng..."
                  className="w-full bg-black text-[#ECECEC] border border-white/10 px-3.5 py-3 text-xs focus:outline-none focus:border-gold-light rounded-md"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gold-dark to-gold-light text-black font-display font-bold text-xs py-4 tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(216,154,43,0.3)] rounded-md"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>DỮ LIỆU ĐANG TRUYỀN DIỆN...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>GỬI YÊU CẦU CHO CHÚNG TÔI</span>
                  </>
                )}
              </button>

            </form>

            {success && (
              <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-20 border border-gold-light/40">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider">GỬI LIÊN HỆ THÀNH CÔNG!</h4>
                <p className="text-[11px] text-gray-400 mt-2 max-w-sm leading-relaxed">
                  Xưởng đã ghi nhận yêu cầu. Bộ phận tư vấn sẽ phản hồi qua số điện thoại hoặc email bạn đã cung cấp.
                </p>
              </div>
            )}

          </div>

          {/* Right column: High-tech physical contact details */}
          <div className="lg:col-span-5 bg-[#161616]/60 border border-white/5 p-6 md:p-8 flex flex-col justify-between text-left">
            <div>
              <h3 className="text-xs font-display font-black text-white uppercase tracking-widest mb-4">
                {contactSettings.companyName}
              </h3>
              
              <div className="space-y-4 text-xs text-gray-400">
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-200 block text-[10.5px] uppercase">Địa chỉ liên hệ:</strong>
                    <span className="leading-relaxed">{contactSettings.address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PhoneCall className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-200 block text-[10.5px] uppercase">Tổng đài Hỗ trợ sỉ:</strong>
                    <a href={`tel:${phoneHref}`} className="font-mono text-white text-sm font-extrabold block mt-0.5 hover:text-gold-light transition-colors">{contactSettings.hotline}</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-200 block text-[10.5px] uppercase">Hộp thư điện tử liên kết:</strong>
                    <a href={`mailto:${contactSettings.email}`} className="text-white block hover:text-gold-light transition-colors">{contactSettings.email}</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-200 block text-[10.5px] uppercase">Giờ làm việc:</strong>
                    <span>{contactSettings.workingHours}</span>
                  </div>
                </div>

              </div>
            </div>

            {contactSettings.googleMapEmbedUrl ? (
              <iframe
                title="Google Map Xưởng In 3D"
                src={contactSettings.googleMapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="mt-6 aspect-[16/8] w-full border border-white/10 grayscale-[25%]"
              />
            ) : (
              <div className="mt-6 aspect-[16/8] w-full bg-[#050505] border border-white/5 p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,154,43,0.05)_0%,transparent_100%)]" />
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 uppercase select-none">
                  <span>XUONG-IN-3D-MAP</span>
                  <span className="text-gold-light animate-ping">● LIVE SATELLITE</span>
                </div>
                <div className="text-center font-mono font-black text-xs text-gold-light select-none">
                  10&deg;47'21.4&quot;N 106&deg;38'24.5&quot;E
                </div>
                <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono">
                  <span>ALTITUDE: 14m</span>
                  <span>STATUS: ACCURATE SECURE</span>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* 3. PHYSICAL OFFICE & LABORATORY BRANCHES (CATALOG CARD LIST) */}
        <div className="mb-12" id="branches-list-section">
          <SectionTitle
            subtitle="THÔNG TIN ĐỊA ĐIỂM"
            title="ĐỊA CHỈ XƯỞNG IN 3D"
            description="Địa chỉ tiếp nhận tư vấn và làm việc của Xưởng In 3D tại TP.HCM."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pr-0">
            {BRANCHES_DATA.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
