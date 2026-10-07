import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Link as LinkIcon, X } from 'lucide-react';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { normalizePrintFileUrl } from '../../lib/productPrintFile';
import type { Product } from '../../types';
import { useApp } from '../../context/AppContext';

export default function ProductPrintFileButton({ product }: { product: Product }) {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(''), [url, setUrl] = useState(''), [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const saveLock = useRef(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoading(true); setError('');
    (async () => {
      try {
        if (!isFirebaseConfigured) throw new Error('Chưa kết nối Firebase.');
        const snapshot = await getDoc(doc(db, 'productPrintFiles', product.id));
        const stored = snapshot.exists() ? normalizePrintFileUrl(String(snapshot.data().url || '')) : '';
        if (!cancelled) { setSavedUrl(stored); setUrl(stored); setLoaded(true); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được link file in.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, loaded, product.id]);

  const close = () => {
    if (saveLock.current) return;
    if (url !== savedUrl && !window.confirm('Link chưa lưu. Đóng và bỏ thay đổi?')) return;
    setUrl(savedUrl); setOpen(false); trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, url, savedUrl]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!loaded || loading || saveLock.current) return;
    setError('');
    let next: string;
    try { next = normalizePrintFileUrl(url); }
    catch (e) { setError((e as Error).message); return; }
    if (!next && savedUrl && !window.confirm('Gỡ link file in đã lưu? File ở nơi lưu trữ không bị xóa.')) return;
    saveLock.current = true; setSaving(true);
    try {
      await setDoc(doc(db, 'productPrintFiles', product.id), { url: next, updatedAt: serverTimestamp() });
      setSavedUrl(next); setUrl(next);
      showToast(next ? 'Đã lưu link file in riêng cho sản phẩm.' : 'Đã gỡ link file in.', 'success');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được link.'); }
    finally { saveLock.current = false; setSaving(false); }
  }

  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} title="Lưu / mở link file in nội bộ" className="flex items-center gap-1 border border-white/5 bg-[#111] px-2 py-1 text-[9px] font-display uppercase tracking-wider text-sky-300 hover:bg-[#222]">
      <LinkIcon className="h-3 w-3" />File in
    </button>
    {open && createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4">
      <section role="dialog" aria-modal="true" aria-label={`File in · ${product.name}`} className="w-full max-w-xl border border-gold-dark/40 bg-[#0a0a0a] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-gold-light">Link file in</h2><p className="mt-1 text-sm text-gray-300">{product.name} · {product.sku || product.id}</p></div><button type="button" aria-label="Đóng file in" disabled={saving} onClick={close} className="p-1 text-gray-400 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
        <p className="mt-3 text-xs text-gray-500">Chỉ quản trị viên xem được. Dán link Google Drive, thư mục hoặc trang tải file; không tải file lên website.</p>
        {loading && <p role="status" className="mt-3 text-sm text-gray-400">Đang tải link…</p>}
        {error && <p role="alert" className="mt-3 break-words text-sm text-red-300">{error}</p>}
        <form onSubmit={event => void save(event)} className="mt-4 space-y-4">
          <label className="block text-xs text-gray-400">Link file in<input autoFocus type="url" value={url} disabled={!loaded || saving} onChange={event => setUrl(event.target.value)} placeholder="https://drive.google.com/..." className="mt-2 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white disabled:opacity-40" /></label>
          <div className="flex flex-wrap justify-end gap-2">
            {savedUrl && <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="border border-sky-400/40 px-4 py-2 text-sm text-sky-300">Mở file in đã lưu</a>}
            <button type="button" disabled={saving} onClick={close} className="border border-white/15 px-4 py-2 text-sm text-gray-300 disabled:opacity-40">Đóng</button>
            <button type="submit" disabled={!loaded || loading || saving || url === savedUrl} className="bg-gold-light px-4 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? 'Đang lưu…' : 'Lưu link'}</button>
          </div>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
