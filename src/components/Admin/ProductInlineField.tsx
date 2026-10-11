'use client';
import { useState, type ReactNode } from 'react';

export default function ProductInlineField({ enabled, label, value, onChange, multiline, children }: {
  enabled: boolean; label: string; value: string; onChange: (value: string) => void; multiline?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!enabled) return <>{children}</>;
  if (!open) return <div role="button" tabIndex={0} title={`Sửa ${label}`} onClickCapture={event => { event.preventDefault(); event.stopPropagation(); setOpen(true); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen(true); } }} className="block w-full cursor-pointer rounded border border-dashed border-gold-dark/50 p-2 text-left hover:bg-gold-dark/10">{children}<span className="block text-[10px] font-normal normal-case text-gold-light">Nhấp để sửa {label}</span></div>;
  const props = { value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), 'aria-label': label, autoFocus: true, className: 'w-full border border-gold-dark bg-black p-2 text-sm font-normal normal-case text-white outline-none' };
  return <div className="space-y-1"><label className="block text-xs text-gold-light">{label}</label>{multiline ? <textarea {...props} rows={6} /> : <input {...props} />}<button type="button" onClick={() => setOpen(false)} className="text-xs text-gold-light">Xong · chưa lưu</button></div>;
}
