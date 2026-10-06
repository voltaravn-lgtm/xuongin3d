import React from 'react';
import { useApp } from '../../context/AppContext';
import type { ProductVariant } from '../../types';
import PriceInput from './PriceInput';

export type ListingOptions = { category: string; price: string; salePrice: string; variants: ProductVariant[] };
export const emptyListingOptions = (): ListingOptions => ({ category: '', price: '', salePrice: '', variants: [] });
export default function QuickListingOptions({ value, onChange, disabled }: { value: ListingOptions; onChange: (value: ListingOptions) => void; disabled: boolean }) {
  const { productCategories } = useApp();
  const box = 'w-full bg-black border border-gray-700 p-2 mt-1 text-sm text-gray-100';
  const updateVariant = (id: string, changes: Partial<ProductVariant>) => onChange({ ...value, variants: value.variants.map(v => v.id === id ? { ...v, ...changes } : v) });
  return <details className="border border-gray-700 p-3">
    <summary className="cursor-pointer text-gold-light font-bold">Thông tin bổ sung · danh mục, giá, phân loại ({value.variants.length}) — mở / thu gọn</summary>
    <div className="space-y-3 mt-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <label>Danh mục<select className={box} value={value.category} disabled={disabled} onChange={e => onChange({ ...value, category: e.target.value })}><option value="">AI tự chọn</option>{productCategories.filter(c => !c.hidden).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Giá bán<PriceInput className={box} value={value.price} disabled={disabled} onValueChange={price => onChange({ ...value, price })} placeholder="Để trống: Liên hệ" /></label>
        <label>Giá giảm (nếu có)<PriceInput className={box} value={value.salePrice} disabled={disabled} onValueChange={salePrice => onChange({ ...value, salePrice })} /></label>
      </div>
      <p className="text-xs text-gray-400">Phân loại tùy chọn do bạn nhập; AI không tự tạo size hoặc giá. Giá riêng để trống dùng giá chung. Phân loại đầu được chọn mặc định.</p>
      {value.variants.map(v => <div key={v.id} className="border border-gray-700 p-3 grid sm:grid-cols-2 gap-2">
        <label>Tên phân loại<input className={box} value={v.name} maxLength={140} disabled={disabled} onChange={e => updateVariant(v.id, { name: e.target.value })} placeholder="VD: Size S / màu trắng" /></label>
        <label>Kích thước đã xác nhận<input className={box} value={v.size || ''} maxLength={140} disabled={disabled} onChange={e => updateVariant(v.id, { size: e.target.value })} placeholder="Không biết để trống" /></label>
        <label>Giá riêng<PriceInput className={box} value={v.price || ''} disabled={disabled} onValueChange={price => updateVariant(v.id, { price })} /></label>
        <label>Giá giảm riêng<PriceInput className={box} value={v.salePrice || ''} disabled={disabled} onValueChange={salePrice => updateVariant(v.id, { salePrice })} /></label>
        <button type="button" disabled={disabled} className="text-red-300 text-left disabled:opacity-40" onClick={() => onChange({ ...value, variants: value.variants.filter(x => x.id !== v.id) })}>Bỏ phân loại</button>
      </div>)}
      <button type="button" disabled={disabled || value.variants.length >= 20} className="border border-gold-light text-gold-light p-2 disabled:opacity-40" onClick={() => onChange({ ...value, variants: [...value.variants, { id: crypto.randomUUID(), name: '' }] })}>+ Thêm phân loại</button>
    </div>
  </details>;
}
