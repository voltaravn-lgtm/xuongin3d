import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '../../lib/cloudinary';
import { catalogueMedia } from '../../lib/catalogueMedia';
import { catalogueCategories } from '../../lib/aiCatalogue';
import { quickCatalogueContext, quickCatalogueExtras, quickCatalogueImageOrder, quickCatalogueProduct, quickCatalogueSku, quickCatalogueMaxDescription, quickCatalogueMaxOutputTokens, type QuickCatalogue } from '../../lib/quickCatalogue';
import { watermarkImageFile, type WatermarkOptions } from '../../lib/watermark';
import { revalidateProductCache } from '../../lib/productCacheClient';
import { getProductHref } from '../../lib/productRoutes';
import ProductWatermarkControls from '../../components/Admin/ProductWatermarkControls';
import QuickListingOptions, { emptyListingOptions, type ListingOptions } from '../../components/Admin/QuickListingOptions';
import type { Product } from '../../types';
import CatalogueImagePicker from '../../components/Admin/CatalogueImagePicker';

type Pending = { draft: QuickCatalogue; id: string; files: File[]; urls: string[]; category: string; price: string; extras: ListingOptions & { coverIndex: number }; watermark: boolean; logo: string; options: WatermarkOptions; usage: { input: number; output: number }; product?: Product };
export default function QuickCataloguePublisher({ provider, configured, disabled, onBusy }: { provider: string; configured: boolean; disabled: boolean; onBusy: (value: boolean) => void }) {
  const { addProduct, productCategories } = useApp();
  const [running, setRunning] = useState(false);
  const [facts, setFacts] = useState(''), [name, setName] = useState(''), [description, setDescription] = useState('');
  const [listing, setListing] = useState<ListingOptions>(emptyListingOptions);
  const { category, price } = listing;
  const [watermark, setWatermark] = useState(true), [logo, setLogo] = useState('/images/logo-x3d.webp');
  const [options, setOptions] = useState<WatermarkOptions>({ position: 'top-right', size: 20, opacity: 70, margin: 3 });
  const [frames, setFrames] = useState<string[]>([]), [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  useEffect(() => { const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  const [summary, setSummary] = useState<Pending | null>(null), [progress, setProgress] = useState(''), [error, setError] = useState('');
  const [published, setPublished] = useState<Product | null>(null), [cacheWarning, setCacheWarning] = useState(false);
  const pending = useRef<Pending | null>(null), latch = useRef(false), active = useRef(true), controller = useRef<AbortController | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  function ensureActive() { if (!active.current) throw new Error('Đã rời công cụ; dừng trước bước đăng sản phẩm.'); }
  async function save(d: Pending) {
    ensureActive();
    if (!productCategories.some(c => c.id === (d.category || catalogueCategories[d.draft.category]) && !c.hidden)) throw new Error('Danh mục AI chọn không có/đang bị ẩn. Chọn danh mục hợp lệ ở trên rồi thử đăng lại.');
    // Validate the price before uploading, so invalid input does not spend upload bandwidth.
    quickCatalogueExtras(d.price, d.extras);
    for (let i = d.urls.length; i < d.files.length; i++) {
      ensureActive(); setProgress(`Đang ${d.watermark ? 'đóng watermark và ' : ''}upload ảnh ${i + 1}/${d.files.length}…`);
      const uploadFile = d.watermark ? await watermarkImageFile(d.files[i], d.logo, d.options, 0.7) : d.files[i];
      ensureActive();
      d.urls.push(await uploadImageToCloudinary(uploadFile, { convertToWebp: true, webpQuality: 0.7 }));
    }
    ensureActive();
    const product = quickCatalogueProduct(d.draft, d.id, d.urls, d.category, d.price, d.extras);
    setProgress('Đang lưu sản phẩm công khai lên website…');
    if (!await addProduct(product)) throw new Error('Chưa lưu được sản phẩm. Ảnh đã upload được giữ lại trong lượt này; bấm thử đăng lại, không gọi AI thêm.');
    d.product = product;
    if (active.current) { setPublished(product); setSummary({ ...d }); setProgress('Đã đăng sản phẩm lên website.'); }
    const refreshed = await revalidateProductCache();
    if (active.current) setCacheWarning(!refreshed);
  }
  async function run(selected: File[], publishNow: boolean, reuse = false, direct = false) {
    if (latch.current) return;
    if (publishNow && !direct && (!reuse || !pending.current)) { setError('Hãy bấm Tạo nội dung và kiểm tra bản xem trước trước khi đăng.'); return; }
    latch.current = true; setRunning(true); onBusy(true); setError(''); setCacheWarning(false);
    try {
      if (!configured) throw new Error('Chọn API đã có key trên server.');
      if (!isCloudinaryConfigured() || !isFirebaseConfigured) throw new Error('Cần cấu hình Cloudinary và Firebase để đăng sản phẩm lên web.');
      if (!selected.length || selected.length > 12 || selected.some(f => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 20 * 1024 * 1024)) throw new Error('Chọn 1–12 ảnh JPG/PNG/WebP, mỗi ảnh tối đa 20MB. Một bộ ảnh = một sản phẩm.');
      quickCatalogueExtras(price, listing);
      const orderedFiles = quickCatalogueImageOrder(selected, coverIndex);
      let d = reuse ? pending.current : null;
      if (!d) {
        setProgress('Đang đọc ảnh đại diện bạn chọn để tiết kiệm token…');
        const images = await catalogueMedia(orderedFiles.slice(0, 1));
        ensureActive(); setFrames(images);
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Vui lòng đăng nhập quản trị.');
        controller.current = new AbortController();
        setProgress('AI đang tạo tên, danh mục và mô tả ngắn — thinking tắt…');
        const response = await fetch('/api/admin/catalogue', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quick', provider, images, facts: quickCatalogueContext(name, description, facts) }), signal: controller.current.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tạo được nội dung sản phẩm.');
        ensureActive();
        d = { draft: { ...data.draft, name: name.trim() || data.draft.name }, id: 'IN3D-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase(), files: selected, urls: [], category, price, extras: { ...listing, coverIndex }, watermark, logo, options: { ...options }, usage: data.usage };
        pending.current = d; setSummary({ ...d });
      }
      if (d.product) { setPublished(d.product); return; }
      // Category/price can be corrected after a stopped publish, without another AI call.
      if (reuse) {
        d.category = category; d.price = price; d.extras = { ...listing, coverIndex };
        if (!d.urls.length) { d.watermark = watermark; d.logo = logo; d.options = { ...options }; }
      }
      if (publishNow) await save(d);
      else setProgress('Đã tạo mô tả nhiều đoạn. Kiểm tra nội dung rồi bấm Đăng lên web khi sẵn sàng.');
    } catch (e) { if (active.current) { setError(e instanceof Error ? e.message : 'Không đăng được sản phẩm.'); setProgress('Đã dừng, không tự thử lại.'); } }
    finally { latch.current = false; if (active.current) setRunning(false); onBusy(false); }
  }
  function choose(selected: File[]) {
    if (!selected.length || latch.current) return;
    pending.current = null; setSummary(null); setPublished(null); setFrames([]); setFiles(selected); setCoverIndex(0);
    setProgress('Đã chọn ảnh. Nhập mô tả đúng sản phẩm rồi bấm Tạo nội dung để xem trước.'); setError('');
  }
  function invalidate() { pending.current = null; setSummary(null); setError(''); setProgress('Nội dung đầu vào đã đổi. Bấm Tạo nội dung để phân tích lại.'); }
  function createNew() {
    if (latch.current || disabled || !published) return;
    pending.current = null; controller.current = null;
    setPublished(null); setSummary(null); setFiles([]); setFrames([]); setCoverIndex(0);
    setName(''); setDescription(''); setFacts(''); setListing(emptyListingOptions());
    setError(''); setCacheWarning(false);
    setProgress('Sẵn sàng tạo sản phẩm mới. Đã giữ thiết lập watermark; chọn bộ ảnh và nhập nội dung mới.');
    requestAnimationFrame(() => { nameInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); nameInput.current?.focus({ preventScroll: true }); });
  }
  const box = 'w-full bg-black border border-gray-700 p-3 text-sm text-gray-100';
  const locked = disabled || running;
  return <div className="space-y-4">
    <div className="border border-gold-dark/30 bg-black/40 p-4 space-y-2">
      <h3 className="font-bold text-gold-light">Đăng nhanh từ ảnh — xem trước rồi đăng</h3>
      <p className="text-sm">Chọn ảnh và mô tả → bấm Tạo nội dung → kiểm tra/sửa tên, mô tả → bấm Đăng lên web. Chọn ảnh không gọi AI, không tự đăng.</p>
      <p className="text-xs text-amber-300">Nhập rõ loại sản phẩm, ví dụ “Đèn ngủ, không phải chậu cây”. AI ưu tiên mô tả người bán nhưng vẫn có thể sai; hãy duyệt trước khi đăng.</p>
    </div>
    {published && <div className="border border-green-700 p-4 flex flex-wrap items-center gap-3" role="status">
      <span className="text-green-300">Đã đăng {published.sku || published.name}. Bạn có thể tạo sản phẩm tiếp theo ngay.</span>
      <button type="button" disabled={locked} className="bg-gold-light text-black px-5 py-3 font-bold disabled:opacity-40" onClick={createNew}>+ Tạo sản phẩm mới</button>
    </div>}
    <label className="block text-sm">Tên sản phẩm (nếu có)<input ref={nameInput} className={box + ' mt-2'} maxLength={140} value={name} disabled={locked || !!published} onChange={e => { setName(e.target.value); invalidate(); }} placeholder="Để trống: AI gợi ý tên" /></label>
    <label className="block text-sm">Mô tả / loại sản phẩm để AI hiểu đúng (tùy chọn)<textarea className={box + ' mt-2'} rows={3} maxLength={1000} value={description} disabled={locked || !!published} onChange={e => { setDescription(e.target.value); invalidate(); }} placeholder="VD: Đây là đèn ngủ để bàn, chụp trắng và chân đỏ. Có thể dán mô tả ngoại ngữ để AI dịch sang tiếng Việt." /></label>
    <label className="block text-sm">Thông tin kỹ thuật đã xác nhận (không bắt buộc)<textarea className={box + ' mt-2'} rows={2} maxLength={1500} value={facts} disabled={locked || !!published} onChange={e => { setFacts(e.target.value); invalidate(); }} placeholder="VD: Chất liệu: PLA. Kích thước: 15 × 10 × 20 cm. Không biết thì để trống." /></label>
    <QuickListingOptions value={listing} onChange={setListing} disabled={locked || !!published} />
    <ProductWatermarkControls enabled={watermark} onEnabledChange={setWatermark} logoUrl={logo} onLogoChange={setLogo} options={options} onOptionsChange={setOptions} disabled={locked} imageUrl={previews[coverIndex] || frames[0]} />
    <label className="block font-bold text-gold-light">THÊM ẢNH SẢN PHẨM<input className={box + ' mt-2'} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={locked} onChange={e => { choose(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
    <CatalogueImagePicker files={files} selected={coverIndex} onSelect={setCoverIndex} disabled={locked || !!published} />
    <p className="text-xs text-gray-400">Bấm ảnh bất kỳ để chọn đại diện. Tất cả ảnh đều được giữ: 1 ảnh đại diện và {Math.max(0, files.length - 1)} ảnh bổ sung. AI đọc ảnh đại diện được chọn lúc tạo nội dung; đổi đại diện sau đó không gọi AI lại.</p>
    <p className="text-xs text-gray-400">{files.length} ảnh đã chọn. Tối đa 12 ảnh/bộ. AI đọc ảnh đại diện và mô tả bạn nhập, viết khoảng 4–5 đoạn; một request tối đa {quickCatalogueMaxOutputTokens} output token, thinking tắt. Mô tả dài hơn sẽ dùng thêm token. Dùng ảnh gốc chưa có logo để tránh đóng chồng. Ảnh/thông tin gửi API AI khi bấm tạo nội dung; ảnh đăng gửi Cloudinary và dữ liệu lưu Firebase khi bấm đăng.</p>
    <button type="button" disabled={locked || !configured || !files.length || !!published} className="border border-gold-light text-gold-light px-4 py-3 disabled:opacity-60" onClick={() => { pending.current = null; setSummary(null); void run(files, false); }}>1. Tạo nội dung để xem trước</button>
    <button type="button" disabled={locked || !configured || !files.length || !!published} className="bg-gold-light text-black px-5 py-3 font-bold disabled:opacity-60" onClick={() => void run(files, true, !!pending.current, true)}>Tạo và đăng luôn</button>
    <p className="text-xs text-amber-300">“Tạo và đăng luôn” bỏ qua bước duyệt và đăng công khai sau khi AI xử lý. Nếu đã có bản xem trước, dùng nội dung hiện tại, không gọi AI thêm. Chọn ảnh vẫn không tự đăng.</p>
    {progress && <p role="status" className="text-gold-light">{progress}</p>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {summary && <div className="border border-gray-700 p-4 space-y-2 text-sm">
      <p className="font-bold">{published?.sku || quickCatalogueSku(summary.id)} · {published ? 'Sản phẩm đã đăng' : 'Xem trước nội dung'}</p>
      {!published && <p className="text-xs text-gray-400">Mã dự kiến; nếu trùng, hệ thống chọn 4 số khác khi lưu.</p>}
      {!published && <p className="text-gold-light">Bạn có thể gõ trực tiếp vào tên và mô tả bên dưới để sửa, thêm nội dung hoặc xuống dòng. Bấm Đăng lên web sẽ dùng nội dung đã chỉnh, không gọi AI thêm.</p>}
      <label className="block">Tên đăng lên web<input className={box} maxLength={140} value={summary.draft.name} disabled={locked || !!published} onChange={e => { const d = pending.current; if (d) { d.draft = { ...d.draft, name: e.target.value }; setSummary({ ...d }); } }} /></label>
      <label className="block">Mô tả đăng lên web (giữ xuống dòng)<textarea className={box} rows={10} maxLength={quickCatalogueMaxDescription} value={summary.draft.description} disabled={locked || !!published} onChange={e => { const d = pending.current; if (d) { d.draft = { ...d.draft, description: e.target.value }; setSummary({ ...d }); } }} /></label>
      <p>Danh mục: {productCategories.find(c => c.id === (category || catalogueCategories[summary.draft.category]))?.name || summary.draft.category}</p>
      <p className="text-xs text-gray-400">Input {summary.usage.input.toLocaleString()} · Output {summary.usage.output.toLocaleString()} token. Thông số xác nhận: {Object.keys(summary.draft.specs).length}. Giá: {published?.price || (summary.price || 'Liên hệ')}.</p>
      {published && <a className="inline-block text-green-300 underline" href={getProductHref(published)} target="_blank" rel="noopener noreferrer">Xem sản phẩm đã đăng →</a>}
      {cacheWarning && <p className="text-amber-300">Đã lưu Firebase nhưng chưa làm mới cache web được. Không đăng lại; tải lại trang sản phẩm sau ít phút.</p>}
    </div>}
    <button type="button" disabled={locked || !!published || !summary || !summary.draft.name.trim() || !summary.draft.description.trim()} className="bg-gold-light text-black px-5 py-3 font-bold disabled:opacity-60" onClick={() => void run(files, true, true)}>{published ? 'Đã đăng lên web' : '2. Đăng lên web (không gọi AI thêm)'}</button>
    {published && <button type="button" disabled={locked} className="border border-gold-light text-gold-light px-5 py-3 font-bold disabled:opacity-40" onClick={createNew}>+ Tạo sản phẩm mới</button>}
    {!published && <p className="text-xs text-gray-400">{!files.length ? 'Chọn ảnh để bật nút Tạo nội dung. Không tự phân tích hoặc đăng khi chọn ảnh.' : !summary ? 'Bấm Tạo nội dung để duyệt trước, hoặc chọn Tạo và đăng luôn để đăng trực tiếp.' : 'Chỉ khi bấm Đăng lên web hoặc Tạo và đăng luôn mới upload ảnh và lưu công khai.'}</p>}
  </div>;
}
