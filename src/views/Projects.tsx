import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { PROJECTS_DATA } from "../data";
import { useApp } from "../context/AppContext";
import { getMenuBanner } from "../lib/menuBanners";
import PageHero from "../components/PageHero";

export default function Projects() {
  const { menuItems } = useApp();
  const bannerImage = getMenuBanner(menuItems, "/du-an-da-thuc-hien", "/images/du-an-da-thuc-hien.webp");

  return (
    <div className="min-h-screen bg-[#050505] pb-20">
      <PageHero
        image={bannerImage}
        imageAlt="Dự án in 3D đã thực hiện"
        breadcrumb="Dự án đã thực hiện"
        eyebrow="Năng lực thực hiện"
        title="Dự án đã thực hiện"
        description="Không gian giới thiệu các mẫu thử, sản phẩm cá nhân hóa, POSM và mô hình do Xưởng In 3D thực hiện. Hình ảnh dự án thực tế sẽ được cập nhật từ trang Admin."
        className="mb-0"
      />
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:pt-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PROJECTS_DATA.map(project => <article key={project.id} className="overflow-hidden border border-white/10 bg-[#101010]"><div className="aspect-[4/3] overflow-hidden bg-black"><img src={project.image} alt={project.title} className="h-full w-full object-cover opacity-75 transition duration-500 hover:scale-105" /></div><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-gold-light">{project.solutionType}</p><h2 className="mt-2 text-sm font-black uppercase leading-6 text-white">{project.title}</h2><p className="mt-3 text-xs leading-5 text-gray-500">{project.specs}</p><p className="mt-4 flex items-center gap-1.5 text-[10px] uppercase text-gray-600"><MapPin className="h-3 w-3" />{project.location}</p></div></article>)}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-5 border border-gold-dark/25 bg-gold-dark/5 p-8 md:flex-row"><div><h2 className="text-xl font-black uppercase text-white">Bạn có ý tưởng cần hiện thực hóa?</h2><p className="mt-2 text-sm text-gray-500">Gửi nội dung để xưởng tư vấn phương án và báo giá.</p></div><Link to="/in-3d-theo-yeu-cau" className="inline-flex items-center gap-2 bg-gold-dark px-6 py-3 text-xs font-black uppercase tracking-widest text-black">Bắt đầu yêu cầu <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    </div>
  );
}
