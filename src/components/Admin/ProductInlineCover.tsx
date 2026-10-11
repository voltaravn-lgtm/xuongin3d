'use client';

import { useState } from 'react';

export default function ProductInlineCover({ image, images, onSelect }: {
  image: string; images: string[]; onSelect: (image: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const choices = Array.from(new Set([image, ...images].map(url => url.trim()).filter(Boolean)));
  return <div className="mb-3 rounded border border-dashed border-gold-dark/50 p-2">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full text-left text-xs text-gold-light">
      ✎ Chọn ảnh đại diện từ ảnh sản phẩm
    </button>
    {open && <div className="mt-3">
      <p className="mb-2 text-xs text-gray-400">Bấm một ảnh để chọn · chưa lưu</p>
      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        {choices.map((url, index) => <button key={url} type="button" aria-label={`Chọn ảnh ${index + 1} làm đại diện`}
          aria-pressed={url === image} onClick={() => onSelect(url)}
          className={`overflow-hidden rounded border-2 p-1 ${url === image ? 'border-gold-light bg-gold-dark/20' : 'border-white/10 hover:border-gold-dark'}`}>
          <img src={url} alt={`Ảnh sản phẩm ${index + 1}`} loading="lazy" className="aspect-square w-full object-contain" />
          {url === image && <span className="block text-[10px] text-gold-light">Đại diện</span>}
        </button>)}
      </div>
      {!choices.length && <p className="text-xs text-gray-400">Sản phẩm chưa có ảnh. Thêm ảnh trong quản trị trước.</p>}
    </div>}
  </div>;
}
