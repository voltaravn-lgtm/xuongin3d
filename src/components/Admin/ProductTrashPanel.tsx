import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { canRestoreProduct, permanentlyDeleteTrashedProducts, restoreTrashedProduct, type TrashedProduct } from '../../lib/productTrash';
import { revalidateProductCache } from '../../lib/productCacheClient';
import { useApp } from '../../context/AppContext';
import { invalidateAdminProductPages } from '../../lib/adminProductPages';

export default function ProductTrashPanel() {
  const { products, setProducts, showToast } = useApp();
  const [open, setOpen] = useState(false), [rows, setRows] = useState<TrashedProduct[]>([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string[]>([]);
  const operationLock = useRef(false);
  const selectedRows = rows.filter(row => selected.includes(row.id));
  const expiredRows = rows.filter(row => !canRestoreProduct(row.expiresAt, now));
  useEffect(() => { if (open) void load(); }, [open, products.length]);
  useEffect(() => { if (!open) return; const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, [open]);
  async function load() {
    setLoading(true); setError('');
    try {
      if (!isFirebaseConfigured) throw new Error('Chưa kết nối Firebase.');
      const snapshot = await getDocs(collection(db, 'productTrash'));
      setRows(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as TrashedProduct)).sort((a, b) => (b.deletedAt?.toMillis() || 0) - (a.deletedAt?.toMillis() || 0)));
      setNow(Date.now());
      setSelected(previous => previous.filter(id => snapshot.docs.some(item => item.id === id)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được lịch sử xóa.'); }
    finally { setLoading(false); }
  }
  async function restore(row: TrashedProduct) {
    if (operationLock.current || loading || !canRestoreProduct(row.expiresAt)) return;
    const conflict = products.some(product => product.id === row.id || (row.product.sku && product.sku === row.product.sku) || (row.product.slug && product.slug === row.product.slug));
    if (conflict) { showToast('ID, mã SP hoặc slug đang được sử dụng. Không thể khôi phục đè lên sản phẩm khác.', 'error'); return; }
    if (!window.confirm(`Khôi phục sản phẩm “${row.product.name}”? Sản phẩm sẽ trở lại trạng thái hiển thị/ẩn như trước khi xóa.`)) return;
    operationLock.current = true; setBusy(row.id);
    try {
      const checks = await Promise.all(['sku', 'slug'].filter(field => row.product[field as 'sku' | 'slug']).map(field => getDocs(query(collection(db, 'products'), where(field, '==', row.product[field as 'sku' | 'slug']), limit(1)))));
      if (checks.some(snapshot => !snapshot.empty)) throw new Error('Mã SP hoặc slug đang được sử dụng trong kho. Không khôi phục đè lên sản phẩm khác.');
      const product = await restoreTrashedProduct(row.id);
      setProducts(previous => [...previous.filter(item => item.id !== product.id), product]);
      invalidateAdminProductPages();
      setRows(previous => previous.filter(item => item.id !== row.id));
      setSelected(previous => previous.filter(id => id !== row.id));
      showToast('Đã khôi phục sản phẩm, giữ nguyên mã và đường dẫn.', 'success');
      if (!await revalidateProductCache()) showToast('Đã khôi phục nhưng chưa làm mới cache web được. Không cần khôi phục lại.', 'warning');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Không thể khôi phục.', 'error'); }
    finally { operationLock.current = false; setBusy(''); }
  }
  async function remove(targets: TrashedProduct[], expiredOnly = false) {
    if (operationLock.current || loading) return;
    const eligible = expiredOnly ? targets.filter(row => !canRestoreProduct(row.expiresAt, Date.now())) : targets;
    if (!eligible.length) return;
    const subject = eligible.length === 1 ? `“${eligible[0].product.name}”` : `${eligible.length} bản lưu sản phẩm${expiredOnly ? ' đã hết hạn' : ' đã chọn'}`;
    if (!window.confirm(`Xóa vĩnh viễn ${subject}?\nKhông thể khôi phục sau khi xóa, kể cả chưa hết 7 ngày. Chỉ xóa bản lưu trong thùng rác; ảnh Cloudinary vẫn giữ nguyên.`)) return;
    operationLock.current = true; setBusy('delete'); setError('');
    try {
      const result = await permanentlyDeleteTrashedProducts(eligible.map(row => row.id));
      setRows(previous => previous.filter(row => !result.deletedIds.includes(row.id)));
      setSelected(previous => previous.filter(id => !result.deletedIds.includes(id)));
      if (result.deletedIds.length) showToast(`Đã xóa vĩnh viễn ${result.deletedIds.length} bản lưu. Không thể khôi phục.`, 'success');
      if (result.failedIds.length) {
        setError(`Chưa xóa được ${result.failedIds.length} bản lưu: ${result.error}. Các bản này vẫn được giữ; kiểm tra Rules và thử lại.`);
        showToast('Một số bản lưu chưa xóa được. Không gỡ chúng khỏi danh sách.', 'error');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xóa bản lưu.'); }
    finally { operationLock.current = false; setBusy(''); }
  }
  return <section className="border border-white/10 bg-black/40 p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <button type="button" className="text-sm font-bold text-gold-light" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} Đã xóa · khôi phục trong 7 ngày</button>
      {open && <button type="button" disabled={loading || !!busy} onClick={() => void load()} className="border border-white/20 px-3 py-1 text-xs disabled:opacity-40">Tải lại</button>}
    </div>
    {open && <>
      <p className="text-xs text-gray-400">Khôi phục trong 7 ngày. Bản hết hạn chuyển màu xám, không thể khôi phục. Xóa vĩnh viễn chỉ gỡ bản lưu; ảnh Cloudinary vẫn giữ. Không tự dọn nếu chưa bật TTL.</p>
      {!!rows.length && <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" disabled={loading || !!busy} checked={selectedRows.length === rows.length} onChange={e => setSelected(e.target.checked ? rows.map(row => row.id) : [])} /> Chọn tất cả ({selectedRows.length}/{rows.length})</label>
        <button type="button" disabled={loading || !!busy || !selectedRows.length} onClick={() => void remove(selectedRows)} className="border border-red-400/40 px-3 py-2 text-red-300 disabled:opacity-40">Xóa vĩnh viễn đã chọn ({selectedRows.length})</button>
        <button type="button" disabled={loading || !!busy || !expiredRows.length} onClick={() => void remove(expiredRows, true)} className="border border-white/20 px-3 py-2 disabled:opacity-40">Xóa nhanh hết hạn ({expiredRows.length})</button>
        {busy === 'delete' && <span role="status">Đang xóa vĩnh viễn…</span>}
      </div>}
      {error && <p role="alert" className="text-red-300 text-xs">{error}</p>}
      {loading ? <p className="text-xs">Đang tải…</p> : !rows.length && !error ? <p className="text-xs text-gray-400">Không có sản phẩm trong mục Đã xóa.</p> : rows.map(row => {
        const valid = canRestoreProduct(row.expiresAt, now);
        return <div key={row.id} className={`flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-3 text-xs ${valid ? '' : 'bg-white/5 text-gray-500'}`}>
          <div className="flex items-start gap-3"><input type="checkbox" aria-label={`Chọn ${row.product.name}`} disabled={loading || !!busy} checked={selected.includes(row.id)} onChange={e => setSelected(previous => e.target.checked ? [...previous, row.id] : previous.filter(id => id !== row.id))} />
            <div><p className="font-bold">{row.product.name} · {row.product.sku || row.id}{!valid && ' · Hết hạn'}</p><p className={valid ? 'text-gray-400' : 'text-gray-500'}>Xóa: {row.deletedAt?.toDate().toLocaleString('vi-VN')} · Hạn khôi phục: {row.expiresAt?.toDate().toLocaleString('vi-VN')}</p></div></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!valid || !!busy || loading} onClick={() => void restore(row)} className="border border-gold-dark/40 px-3 py-2 text-gold-light disabled:opacity-40">{busy === row.id ? 'Đang khôi phục…' : valid ? 'Khôi phục' : 'Hết hạn'}</button>
            <button type="button" disabled={!!busy || loading} onClick={() => void remove([row])} className="border border-red-400/40 px-3 py-2 text-red-300 disabled:opacity-40">Xóa vĩnh viễn</button>
          </div>
        </div>;
      })}
    </>}
  </section>;
}
