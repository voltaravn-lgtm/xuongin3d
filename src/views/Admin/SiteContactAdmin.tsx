import React, { useEffect, useState } from "react";
import { ExternalLink, Mail, MapPin, Phone, Save, Share2 } from "lucide-react";
import { SiteContactSettings, useApp } from "../../context/AppContext";

const fieldClass = "w-full bg-black border border-[#1A1A1A] text-[#ECECEC] px-3 py-2.5 text-xs focus:outline-none focus:border-gold-light";

function normalizeMapEmbedUrl(value: string) {
  const iframeSrc = value.match(/src=["']([^"']+)["']/i)?.[1];
  return iframeSrc || value.trim();
}

export default function SiteContactAdmin() {
  const { contactSettings, updateContactSettings, showToast } = useApp();
  const [form, setForm] = useState<SiteContactSettings>(contactSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(contactSettings);
  }, [contactSettings]);

  const updateField = (field: keyof SiteContactSettings, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateContactSettings({
        ...form,
        googleMapEmbedUrl: normalizeMapEmbedUrl(form.googleMapEmbedUrl),
      });
      showToast("Đã lưu thông tin liên hệ website.", "success");
    } catch (error) {
      console.error("Could not save contact settings:", error);
      showToast("Không lưu được thông tin liên hệ lên Firebase.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2 text-gold-light">
            <MapPin className="w-5 h-5" />
            Thông tin liên hệ website
          </h2>
          <p className="text-xs text-gray-400">
            Dùng cho footer, trang Liên hệ, hotline và bản đồ Google Map công khai.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 gold-gradient-bg text-black font-display font-bold py-2.5 px-5 text-xs tracking-widest uppercase hover:opacity-90 transition-all disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1.5">
          <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">Tên công ty / thương hiệu</span>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            className={fieldClass}
            placeholder="Xưởng In 3D"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">Hotline</span>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={form.hotline}
              onChange={(e) => updateField("hotline", e.target.value)}
              className={`${fieldClass} pl-9 font-mono`}
              placeholder="1900 1234"
            />
          </div>
        </label>

        <label className="md:col-span-2 space-y-1.5">
          <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">Địa chỉ hiển thị</span>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className={`${fieldClass} pl-9`}
              placeholder="71/1E Võ Văn Hát, Long Trường, TP.HCM"
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">Email liên hệ</span>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={`${fieldClass} pl-9`}
              placeholder="xuongin3d@gmail.com"
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">Giờ làm việc</span>
          <input
            type="text"
            value={form.workingHours}
            onChange={(e) => updateField("workingHours", e.target.value)}
            className={fieldClass}
            placeholder="8h00 - 17h30"
          />
        </label>

        <label className="md:col-span-2 space-y-1.5">
          <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">Google Map embed URL</span>
          <textarea
            rows={3}
            value={form.googleMapEmbedUrl}
            onChange={(e) => updateField("googleMapEmbedUrl", e.target.value)}
            className={`${fieldClass} font-mono leading-relaxed`}
            placeholder="Dán link trong thuộc tính src của iframe Google Maps tại đây"
          />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Vào Google Maps, chọn Chia sẻ, Nhúng bản đồ, rồi copy link nằm trong `src="..."`.
          </p>
        </label>
      </div>

      <div className="border border-white/5 bg-black/40 p-4 space-y-4">
        <h3 className="text-xs font-display font-bold uppercase tracking-widest text-gold-light flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Liên kết mạng xã hội
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            ["facebookUrl", "Facebook"],
            ["youtubeUrl", "Youtube"],
            ["zaloUrl", "Zalo"],
            ["tiktokUrl", "Tiktok"],
          ] as [keyof SiteContactSettings, string][]).map(([field, label]) => (
            <label key={field} className="space-y-1.5">
              <span className="text-[9px] font-display uppercase tracking-widest text-gray-400 block font-bold">{label}</span>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className={`${fieldClass} pl-9 font-mono`}
                  placeholder={`https://${label.toLowerCase()}.com/xuongin3d`}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}
