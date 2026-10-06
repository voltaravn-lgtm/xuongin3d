import React, { useEffect, useState } from 'react';

export default function CatalogueImagePicker({ files, selected, onSelect, disabled }: { files: File[]; selected: number; onSelect: (index: number) => void; disabled: boolean }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { const next = files.map(file => URL.createObjectURL(file)); setUrls(next); return () => next.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn ảnh đại diện">
    {urls.map((src, i) => <button key={src} type="button" disabled={disabled} aria-pressed={selected === i} title={files[i]?.name} onClick={() => onSelect(i)} className={`w-28 border p-1 text-xs disabled:cursor-default ${selected === i ? 'border-gold-light text-gold-light bg-gold-light/10' : 'border-gray-700 text-gray-300'}`}>
      <img src={src} alt={`Ảnh sản phẩm ${i + 1}`} className="h-24 w-full object-contain" />
      <span className="block mt-1">{selected === i ? `✓ Đại diện · ${i + 1}` : `Chọn ảnh ${i + 1}`}</span>
    </button>)}
  </div>;
}
