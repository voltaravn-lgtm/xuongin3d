import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '../../lib/cloudinary';
import { catalogueMedia } from '../../lib/catalogueMedia';
import { publishCatalogueBatch, type BatchCatalogueRow, type BatchPending, type BatchProgress } from '../../lib/catalogueBatch';
import { watermarkImageFile, type WatermarkOptions } from '../../lib/watermark';
import { revalidateProductCache } from '../../lib/productCacheClient';
import { getProductHref } from '../../lib/productRoutes';
import ProductWatermarkControls from '../../components/Admin/ProductWatermarkControls';
import QuickListingOptions, { emptyListingOptions } from '../../components/Admin/QuickListingOptions';
import { quickCatalogueContext, quickCatalogueImageOrder, quickCatalogueMaxOutputTokens, quickCatalogueMaxDescription } from '../../lib/quickCatalogue';
import CatalogueImagePicker from '../../components/Admin/CatalogueImagePicker';
import { removeSelectedImage } from '../../lib/productImageSelection';

const newRow = (): BatchCatalogueRow => ({ key: crypto.randomUUID(), name: '', description: '', facts: '', ...emptyListingOptions(), coverIndex: 0, files: [] });
export default function BatchCataloguePublisher({ provider, configured, disabled, onBusy }: { provider: string; configured: boolean; disabled: boolean; onBusy: (value: boolean) => void }) {
  const { addProduct, productCategories } = useApp();
  const [rows, setRows] = useState<BatchCatalogueRow[]>(() => [newRow()]);
  const [statuses, setStatuses] = useState<Record<string, BatchProgress>>({});
  const [running, setRunning] = useState(false), [message, setMessage] = useState('');
  const [watermark, setWatermark] = useState(true), [logo, setLogo] = useState('/images/logo-x3d.webp');
  const [options, setOptions] = useState<WatermarkOptions>({ position: 'top-right', size: 20, opacity: 70, margin: 3 });
  const [preview, setPreview] = useState('');
  const pending = useRef(new Map<string, BatchPending>()), latch = useRef(false), stop = useRef(false), active = useRef(true);
  const apiAvailableAt = useRef(0), controller = useRef<AbortController | null>(null);
  const previewRow = rows.find(row => row.files.length);
  const firstFile = previewRow?.files[previewRow.coverIndex || 0];
  useEffect(() => { if (!firstFile) { setPreview(''); return; } const url = URL.createObjectURL(firstFile); setPreview(url); return () => URL.revokeObjectURL(url); }, [firstFile]);
  useEffect(() => { active.current = true; return () => { active.current = false; stop.current = true; controller.current?.abort(); }; }, []);
  const locked = disabled || running;
  function edit(key: string, changes: Partial<BatchCatalogueRow>) {
    if (latch.current || pending.current.get(key)?.product) return;
    if (changes.files || changes.name !== undefined || changes.description !== undefined || changes.facts !== undefined) { pending.current.delete(key); setStatuses(prev => { const next = { ...prev }; delete next[key]; return next; }); }
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...changes } : r));
  }
  function editDraft(key: string, field: 'name' | 'description', value: string) {
    const draft = pending.current.get(key);
    if (latch.current || !draft || draft.product) return;
    draft.draft = { ...draft.draft, [field]: value };
    if (field === 'name') setRows(prev => prev.map(row => row.key === key ? { ...row, name: value } : row));
    setStatuses(prev => ({ ...prev, [key]: { status: 'preview', message: 'Đã chỉnh nội dung. Bấm đăng để lưu, không gọi AI thêm.', pending: { ...draft } } }));
  }
  async function run(onlyKey?: string, previewOnly = false) {
    if (latch.current) return;
    if (!configured || !isCloudinaryConfigured() || !isFirebaseConfigured) { setMessage('Cần API key, Cloudinary và Firebase trước khi đăng hàng loạt.'); return; }
    const queue = rows.filter(r => (!onlyKey || r.key === onlyKey) && !pending.current.get(r.key)?.product && (r.files.length || r.name || r.description || r.facts || r.price || r.category || r.variants?.length));
    if (!queue.length) { setMessage('Thêm ảnh cho ít nhất một sản phẩm chưa đăng.'); return; }
    latch.current = true; stop.current = false; setRunning(true); onBusy(true); setMessage(previewOnly ? 'Đang tạo bản xem trước, chưa đăng. Hãy ở lại công cụ.' : 'Đang đăng hàng loạt. Hãy ở lại công cụ; mỗi bộ ảnh là một sản phẩm.');
    const successfulBefore = Array.from(pending.current.values()).filter(p => p.product).length;
    try {
      await publishCatalogueBatch(queue, pending.current, { enabled: watermark, logo, options }, {
        previewOnly,
        categoryAvailable: id => productCategories.some(c => c.id === id && !c.hidden),
        newId: () => 'IN3D-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase(),
        shouldStop: () => stop.current || !active.current,
        progress: (key, progress) => { if (active.current) setStatuses(prev => ({ ...prev, [key]: { ...progress } })); },
        identify: async row => {
          const checkStop = () => { if (stop.current || !active.current) throw new Error('Đã dừng trước lượt AI tiếp theo.'); };
          while (Date.now() < apiAvailableAt.current) {
            checkStop();
            if (active.current) setStatuses(prev => ({ ...prev, [row.key]: { status: 'working', message: `Đợi cooldown API ${Math.ceil((apiAvailableAt.current - Date.now()) / 1000)} giây…` } }));
            await new Promise(resolve => setTimeout(resolve, Math.min(500, apiAvailableAt.current - Date.now())));
          }
          checkStop();
          const images = await catalogueMedia(quickCatalogueImageOrder(row.files, row.coverIndex).slice(0, 1)); checkStop();
          const token = await auth.currentUser?.getIdToken(); if (!token) throw new Error('Vui lòng đăng nhập quản trị.');
          controller.current = new AbortController();
          try {
            const r = await fetch('/api/admin/catalogue', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quick', provider, images, facts: quickCatalogueContext(row.name, row.description || '', row.facts) }), signal: controller.current.signal });
            const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Không tạo được nội dung.');
            return { draft: data.draft, usage: data.usage };
          } finally { apiAvailableAt.current = Date.now() + 15000; }
        },
        upload: async (file, wm) => {
          const uploadFile = wm.enabled ? await watermarkImageFile(file, wm.logo, wm.options, 0.7) : file;
          if (stop.current || !active.current) throw new Error('Đã dừng trước upload.');
          return uploadImageToCloudinary(uploadFile, { convertToWebp: true, webpQuality: 0.7 });
        },
        save: addProduct,
      });
      const successful = Array.from(pending.current.values()).filter(p => p.product).length;
      let refreshed = true;
      if (successful > successfulBefore) refreshed = await revalidateProductCache();
      if (active.current) setMessage(previewOnly ? 'Đã xử lý bản xem trước. Kiểm tra trạng thái và sửa nội dung từng sản phẩm rồi bấm đăng. Chưa upload ảnh/chưa đăng lên web.' : `${stop.current ? 'Đã dừng' : 'Đã xử lý xong đợt này'}. Tổng ${successful} sản phẩm đã đăng. Mục lỗi/chưa xong có thể thử tiếp; mục đã đăng không chạy lại.${refreshed ? '' : ' Đã lưu Firebase, nhưng cache chưa làm mới được — không đăng lại mục thành công.'}`);
    } catch { if (active.current) setMessage('Đợt đăng bị dừng. Xem trạng thái từng sản phẩm và thử tiếp nếu cần.'); }
    finally { latch.current = false; if (active.current) setRunning(false); onBusy(false); }
  }
  const box = 'w-full bg-black border border-gray-700 p-3 text-sm text-gray-100';
  return <div className="space-y-4">
    <div className="border border-gold-dark/30 p-4 space-y-2"><h3 className="font-bold text-gold-light">Đăng hàng loạt — mỗi ô là một sản phẩm</h3><p className="text-sm">Thêm ảnh SP 1, SP 2… Tên để trống thì AI đặt; tên bạn nhập sẽ được giữ. Chọn ảnh chưa gọi AI/chưa đăng. Bấm “Đăng tất cả” sẽ đăng công khai lần lượt.</p><p className="text-xs text-amber-300">Mã sản phẩm/SKU dùng chung dạng IN3D-… với hậu tố duy nhất, không phụ thuộc danh mục. Chưa có giá thì “Liên hệ”; không tự tạo size hay thông số chưa xác nhận. Tối đa 20 sản phẩm/đợt.</p></div>
    <ProductWatermarkControls enabled={watermark} onEnabledChange={setWatermark} logoUrl={logo} onLogoChange={setLogo} options={options} onOptionsChange={setOptions} disabled={locked} imageUrl={preview} />
    <p className="text-xs text-gray-400">Watermark áp dụng chung cho cả đợt, ghép trước khi chuyển WebP/upload. AI đọc ảnh đại diện và mô tả riêng, viết khoảng 4–5 đoạn; một request tối đa {quickCatalogueMaxOutputTokens} output token, thinking tắt. Mô tả dài hơn dùng thêm token. Lượt đã có nội dung/ảnh giữ watermark cũ khi thử lại. Ảnh/thông tin gửi API AI, ảnh đăng gửi Cloudinary, dữ liệu lưu Firebase.</p>
    {rows.map((row, index) => {
      const state = statuses[row.key]; const published = pending.current.get(row.key)?.product; const rowLocked = locked || !!published;
      return <section className="border border-gray-700 bg-black/30 p-4 space-y-3" key={row.key}>
        <div className="flex justify-between gap-2"><h4 className="font-bold text-gold-light">Sản phẩm {index + 1}{published ? ` · ${published.sku}` : ''}</h4><button type="button" className="text-gray-400 disabled:opacity-40" disabled={locked || rows.length === 1} onClick={() => { setRows(prev => prev.filter(r => r.key !== row.key)); pending.current.delete(row.key); }}>Bỏ ô này</button></div>
        <label className="block text-sm">Tên (tùy chọn)<input className={box + ' mt-1'} maxLength={140} value={row.name} disabled={rowLocked} onChange={e => edit(row.key, { name: e.target.value })} placeholder="Để trống: AI tạo tên" /></label>
        <label className="block text-sm">Mô tả / loại sản phẩm để AI hiểu đúng<textarea className={box + ' mt-1'} rows={3} maxLength={1000} value={row.description || ''} disabled={rowLocked} onChange={e => edit(row.key, { description: e.target.value })} placeholder="VD: Đây là đèn ngủ, không phải chậu cây. Có thể dán mô tả ngoại ngữ để AI dịch sát." /></label>
        <label className="block text-sm">Thông tin kỹ thuật đã xác nhận<textarea className={box + ' mt-1'} rows={2} maxLength={1500} value={row.facts} disabled={rowLocked} onChange={e => edit(row.key, { facts: e.target.value })} placeholder="Chất liệu/kích thước đã biết; không biết để trống" /></label>
        <QuickListingOptions value={{ category: row.category, price: row.price, salePrice: row.salePrice || '', variants: row.variants || [], appendDescriptionImages: row.appendDescriptionImages }} onChange={value => edit(row.key, value)} disabled={rowLocked} />
        {!published && pending.current.has(row.key) && <p className="text-xs text-gray-400">Thử tiếp giữ nội dung AI/ảnh đã upload. Sửa tên, mô tả, thông tin kỹ thuật hoặc chọn lại ảnh sẽ phân tích và upload lại; chỉ sửa giá/phân loại/danh mục thì không gọi AI thêm.</p>}
        <label className="block text-sm">Bộ ảnh sản phẩm {index + 1} (1–12 ảnh)<input className={box + ' mt-1'} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={rowLocked} onChange={e => { const files = Array.from(e.target.files || []); if (files.length) edit(row.key, { files, coverIndex: 0 }); e.target.value = ''; }} /></label>
        <CatalogueImagePicker files={row.files} selected={row.coverIndex || 0} onSelect={coverIndex => edit(row.key, { coverIndex })} onRemove={index => edit(row.key, removeSelectedImage(row.files, row.coverIndex || 0, index))} disabled={rowLocked} /><p className="text-xs text-gray-400">{row.files.length} ảnh đã chọn; bấm ảnh để chọn đại diện. Tất cả ảnh còn lại vẫn được giữ. AI đọc ảnh đại diện lúc tạo; đổi đại diện khi thử tiếp không gọi AI thêm. Xóa ảnh sẽ bỏ bản nháp AI của mục này để tạo lại với bộ ảnh mới.</p>
        {state && <p role="status" className={state.status === 'published' ? 'text-green-300' : state.status === 'error' ? 'text-red-300' : 'text-gold-light'}>{state.message}</p>}
        {state?.pending && <p className="text-xs text-gray-400">{state.pending.draft.name} · {state.pending.usage.input} input / {state.pending.usage.output} output token · {state.pending.urls.length}/{row.files.length} ảnh đã upload.</p>}
        {state?.pending && !published && <div className="border border-gold-dark/40 p-3 space-y-3">
          <h5 className="font-bold text-gold-light">Xem trước — chỉnh sửa nội dung đăng lên web</h5>
          <label className="block text-sm">Tên đăng lên web<input className={box + ' mt-1'} maxLength={140} value={state.pending.draft.name} disabled={rowLocked} onChange={e => editDraft(row.key, 'name', e.target.value)} /></label>
          <label className="block text-sm">Mô tả đăng lên web (giữ xuống dòng)<textarea className={box + ' mt-1'} rows={10} maxLength={quickCatalogueMaxDescription} value={state.pending.draft.description} disabled={rowLocked} onChange={e => editDraft(row.key, 'description', e.target.value)} /></label>
          <p className="text-xs text-gray-400">Chỉnh trong bảng này không gọi AI thêm. Nội dung đã sửa được dùng khi đăng.</p>
          <button type="button" disabled={rowLocked || !state.pending.draft.name.trim() || !state.pending.draft.description.trim()} className="bg-gold-light text-black px-4 py-2 disabled:opacity-40" onClick={() => void run(row.key)}>Đăng sản phẩm này (không gọi AI thêm)</button>
        </div>}
        {published && <a className="text-green-300 underline" href={getProductHref(published)} target="_blank" rel="noopener noreferrer">Xem sản phẩm đã đăng →</a>}
        {state?.status === 'error' && !published && <button type="button" disabled={locked} className="border border-gold-light px-3 py-2 text-gold-light disabled:opacity-40" onClick={() => void run(row.key)}>Thử tiếp sản phẩm này{pending.current.has(row.key) ? ' (không gọi AI thêm)' : ''}</button>}
      </section>;
    })}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={locked || rows.length >= 20} className="border border-gold-light px-4 py-3 text-gold-light disabled:opacity-40" onClick={() => setRows(prev => [...prev, newRow()])}>+ Thêm sản phẩm</button><button type="button" disabled={locked || !configured || !rows.some(r => r.files.length && !pending.current.get(r.key)?.product)} className="bg-gold-light text-black px-5 py-3 font-bold disabled:opacity-40" onClick={() => void run()}>Đăng tất cả sản phẩm chưa xong</button>{running && <button type="button" className="border border-red-400 px-4 py-3 text-red-300" onClick={() => { stop.current = true; setMessage('Đang dừng; bước upload/lưu đang chạy có thể hoàn tất. Không bắt đầu sản phẩm tiếp theo.'); }}>Dừng hàng đợi</button>}</div>
    <button type="button" disabled={locked || !configured || !rows.some(r => r.files.length && !pending.current.get(r.key)?.product)} className="border border-gold-light text-gold-light px-4 py-3 disabled:opacity-40" onClick={() => void run(undefined, true)}>Tạo nội dung tất cả để xem / sửa trước</button>
    {message && <p role="status" className="text-sm text-gold-light">{message}</p>}
    <p className="text-xs text-gray-400">Không tự retry API khi lỗi. Cooldown giữa lượt AI để tránh giới hạn tốc độ. Giữ trang mở đến khi xong; hàng đợi/ảnh gốc chỉ nằm trong phiên này. Bỏ ô hoặc rời trang không xóa sản phẩm đã đăng hay ảnh đã upload.</p>
  </div>;
}
