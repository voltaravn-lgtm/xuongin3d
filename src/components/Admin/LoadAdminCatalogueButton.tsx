import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { loadAdminProductCatalogue } from '../../lib/adminProductPages';

/** Full-catalog tools must explicitly opt in instead of reading all products on F5. */
export default function LoadAdminCatalogueButton() {
  const { setProducts, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  return <button type="button" disabled={loading} className="mb-4 border border-gold-dark/40 px-3 py-2 text-xs text-gold-light disabled:opacity-40" onClick={async () => {
    if (!window.confirm('Tải toàn bộ kho để chọn/đối chiếu sản phẩm cho công cụ này? Có phát sinh read nếu chưa có bản lưu tạm 5 phút.')) return;
    setLoading(true);
    try { const products = await loadAdminProductCatalogue(); setProducts(products); showToast(`Đã tải ${products.length} sản phẩm cho công cụ.`, 'success'); }
    catch { showToast('Không tải được kho sản phẩm.', 'error'); }
    finally { setLoading(false); }
  }}>{loading ? 'Đang tải kho…' : 'Tải kho để chọn sản phẩm'}</button>;
}
