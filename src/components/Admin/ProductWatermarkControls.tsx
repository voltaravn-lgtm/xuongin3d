import { useState } from 'react';
import type { WatermarkOptions, WatermarkPosition } from '../../lib/watermark';
import WatermarkPreview from './WatermarkPreview';

interface Props {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  logoUrl: string;
  onLogoChange: (url: string) => void;
  options: WatermarkOptions;
  onOptionsChange: (options: WatermarkOptions) => void;
  disabled: boolean;
  imageUrl?: string;
}

export default function ProductWatermarkControls({enabled,onEnabledChange,logoUrl,onLogoChange,options,onOptionsChange,disabled,imageUrl}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <fieldset disabled={disabled} className="space-y-3 border border-gold-dark/25 bg-black/40 p-4 disabled:opacity-60">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-3 text-xs font-bold text-gold-light">
        <input type="checkbox" checked={enabled} onChange={e => { onEnabledChange(e.target.checked); if (e.target.checked) setCollapsed(false); }} className="accent-gold-dark" />
        Đóng watermark khi tải ảnh sản phẩm
      </label>
      {enabled && <button type="button" aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)} className="border border-gold-dark/40 px-3 py-1.5 text-[11px] text-gold-light hover:border-gold-light">{collapsed ? 'Mở chỉnh / xem thử' : 'Thu gọn'}</button>}
      </div>
      {enabled && collapsed && <p className="text-[10px] text-gray-400">Watermark vẫn bật · Kích thước {options.size}% · Độ rõ {options.opacity}% · WebP 70%. Các thiết lập và ảnh xem thử được giữ nguyên.</p>}
      <p hidden={enabled && collapsed} className="text-[10px] leading-relaxed text-gray-400">Bật và chọn logo trước khi tải ảnh từ máy. Áp dụng cho ảnh đại diện, ảnh bổ sung, phân loại, combo và ảnh mô tả. Ảnh được đóng dấu thật, giữ kích thước gốc rồi chuyển WebP 70% trước khi upload. Ảnh cũ và URL dán vào không tự thay đổi.</p>
      {enabled && <div hidden={collapsed} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-16 w-24 items-center justify-center rounded border border-white/15 bg-white/10 p-2"><img src={logoUrl} alt="Logo watermark đang chọn" className="max-h-full max-w-full object-contain" /></div>
          <label className="cursor-pointer border border-gold-dark/40 px-3 py-2 text-[11px] text-gold-light">
            Chọn logo từ máy
            <input type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={e => { const file=e.target.files?.[0]; if (file) onLogoChange(URL.createObjectURL(file)); e.target.value=''; }} />
          </label>
          <button type="button" onClick={() => onLogoChange('/images/logo-x3d.webp')} className="text-[11px] text-gray-300 hover:text-gold-light">Dùng logo Xưởng In 3D</button>
          <span className="text-[10px] text-gray-500">Nên dùng PNG/WebP nền trong suốt.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-[11px] text-gray-300">Vị trí
            <select value={options.position} onChange={e => onOptionsChange({...options,position:e.target.value as WatermarkPosition})} className="block w-full border border-white/15 bg-black p-2">
              <option value="top-left">Trên trái</option><option value="top-right">Trên phải</option><option value="bottom-left">Dưới trái</option><option value="bottom-right">Dưới phải</option><option value="center">Chính giữa</option>
            </select>
          </label>
          <label className="space-y-2 text-[11px] text-gray-300">Kích thước: {options.size}%
            <input type="range" min="5" max="50" value={options.size} onChange={e => onOptionsChange({...options,size:Number(e.target.value)})} className="block w-full accent-gold-dark" />
          </label>
          <label className="space-y-2 text-[11px] text-gray-300">Độ rõ logo: {options.opacity}%
            <input type="range" min="10" max="100" value={options.opacity} onChange={e => onOptionsChange({...options,opacity:Number(e.target.value)})} className="block w-full accent-gold-dark" />
          </label>
          <label className="space-y-2 text-[11px] text-gray-300">Lề: {options.margin}%
            <input type="range" min="0" max="10" value={options.margin} onChange={e => onOptionsChange({...options,margin:Number(e.target.value)})} className="block w-full accent-gold-dark" />
          </label>
        </div>
        <WatermarkPreview imageUrl={imageUrl} logoUrl={logoUrl} options={options} />
      </div>}
    </fieldset>
  );
}
