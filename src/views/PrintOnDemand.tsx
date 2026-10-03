import React from "react";
import { Link } from "react-router-dom";
import { Box, CheckCircle2, ChevronRight, FileUp, MessageSquareText, PackageCheck, Printer, Ruler, Shapes } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getMenuBanner } from "../lib/menuBanners";
import PageHero from "../components/PageHero";

const steps = [
  { icon: MessageSquareText, num: "01", title: "Gửi yêu cầu", desc: "Gửi file 3D, bản vẽ, hình ảnh tham khảo, kích thước hoặc mẫu thật." },
  { icon: Ruler, num: "02", title: "Tư vấn phương án", desc: "Xưởng tư vấn công nghệ, vật liệu, màu sắc, độ hoàn thiện và thời gian thực hiện." },
  { icon: Printer, num: "03", title: "Duyệt và sản xuất", desc: "Xác nhận phương án, tạo mẫu khi cần và tiến hành in theo nội dung đã thống nhất." },
  { icon: PackageCheck, num: "04", title: "Kiểm tra và bàn giao", desc: "Sản phẩm được kiểm tra, hoàn thiện và đóng gói trước khi bàn giao." },
];

const inputs = [
  "File 3D: STL, OBJ, 3MF hoặc định dạng có thể chuyển đổi",
  "Bản vẽ kỹ thuật hoặc kích thước cần đạt",
  "Hình ảnh tham khảo và mô tả mục đích sử dụng",
  "Số lượng, màu sắc, vật liệu và thời gian mong muốn",
];

export default function PrintOnDemand() {
  const { contactSettings, menuItems } = useApp();
  const bannerImage = getMenuBanner(menuItems, "/in-3d-theo-yeu-cau", "/images/in-3d-theo-yeu-cau.webp");
  const phoneHref = contactSettings.hotline.replace(/[^\d+]/g, "");

  return (
    <div className="bg-[#050505] pb-20">
      <PageHero
        image={bannerImage}
        imageAlt="Dịch vụ in 3D theo yêu cầu"
        breadcrumb="In 3D theo yêu cầu"
        eyebrow="Dịch vụ thiết kế và sản xuất"
        title="In 3D theo yêu cầu"
        description="Từ ý tưởng, hình ảnh, bản vẽ hoặc file 3D, chúng tôi hỗ trợ lựa chọn phương án phù hợp để tạo ra sản phẩm có thể cầm trên tay."
        className="mb-0"
      >
        <Link to="/lien-he?type=print_3d" className="inline-flex items-center gap-2 bg-gold-dark px-6 py-3 text-xs font-black uppercase tracking-widest text-black">Gửi yêu cầu báo giá <ChevronRight className="h-4 w-4" /></Link>
        <a href={`tel:${phoneHref}`} className="border border-white/20 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">Gọi {contactSettings.hotline}</a>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:pt-12">
        <div className="mb-10 max-w-2xl"><p className="text-xs font-bold uppercase tracking-widest text-gold-light">Quy trình thực hiện</p><h2 className="mt-3 text-3xl font-black uppercase text-white">Đơn giản, rõ ràng theo từng bước</h2></div>
        <div className="grid gap-5 md:grid-cols-4">
          {steps.map(({ icon: Icon, num, title, desc }) => <article key={num} className="border border-white/10 bg-[#101010] p-6"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-gold-light" /><span className="font-mono text-sm font-black text-gold-dark/60">{num}</span></div><h3 className="mt-5 text-sm font-black uppercase text-white">{title}</h3><p className="mt-3 text-xs leading-6 text-gray-500">{desc}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0a0a0a] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2">
          <div><FileUp className="h-8 w-8 text-gold-light" /><h2 className="mt-5 text-2xl font-black uppercase text-white">Bạn có thể gửi gì cho xưởng?</h2><div className="mt-6 space-y-3">{inputs.map(item => <p key={item} className="flex gap-3 text-sm text-gray-400"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" />{item}</p>)}</div></div>
          <div className="grid gap-4 sm:grid-cols-3"><div className="border border-gold-dark/20 bg-black p-5"><Box className="h-5 w-5 text-gold-light" /><b className="mt-4 block text-sm uppercase text-white">Từ một sản phẩm</b><p className="mt-2 text-xs leading-5 text-gray-500">Phù hợp mẫu thử và sản phẩm cá nhân hóa.</p></div><div className="border border-gold-dark/20 bg-black p-5"><Shapes className="h-5 w-5 text-gold-light" /><b className="mt-4 block text-sm uppercase text-white">Nhiều vật liệu</b><p className="mt-2 text-xs leading-5 text-gray-500">Tư vấn theo công năng và bề mặt mong muốn.</p></div><div className="border border-gold-dark/20 bg-black p-5"><Printer className="h-5 w-5 text-gold-light" /><b className="mt-4 block text-sm uppercase text-white">FDM và Resin</b><p className="mt-2 text-xs leading-5 text-gray-500">Lựa chọn công nghệ theo chi tiết sản phẩm.</p></div></div>
        </div>
      </section>
    </div>
  );
}
