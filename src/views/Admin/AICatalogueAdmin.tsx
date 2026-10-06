import React, { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { catalogueCategories, catalogueSections, type CatalogueDraft, type CatalogueSource } from '../../lib/aiCatalogue';
import { catalogueMedia } from '../../lib/catalogueMedia';
import type { Product } from '../../types';
import QuickCataloguePublisher from './QuickCataloguePublisher';
import BatchCataloguePublisher from './BatchCataloguePublisher';

export type CatalogueTransfer = { product: Partial<Product>; files: File[] };
type Result = { draft: CatalogueDraft; sources: CatalogueSource[]; warnings: string[]; usage: { input: number; output: number }; provider: string };
type Provider = { id: string; label: string; model: string; configured: boolean };
const labels = ['1. TÊN SẢN PHẨM', '2. KÍCH THƯỚC + GIÁ BÁN', '3. DANH MỤC SẢN PHẨM', '4. THÔNG SỐ KỸ THUẬT', '5. MÔ TẢ CHI TIẾT'];
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export default function AICatalogueAdmin({ onTransfer }: { onTransfer: (draft: CatalogueTransfer) => void }) {
  const [providers, setProviders] = useState<Provider[]>([]), [provider, setProvider] = useState('');
  const [searchConfigured, setSearchConfigured] = useState(false), [research, setResearch] = useState(true);
  const [files, setFiles] = useState<File[]>([]), [frames, setFrames] = useState<string[]>([]);
  const [facts, setFacts] = useState(''), [result, setResult] = useState<Result | null>(null);
  const [sections, setSections] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true), [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [mode, setMode] = useState<'quick' | 'batch' | 'advanced'>('quick'), [quickBusy, setQuickBusy] = useState(false);
  async function headers() {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Vui lòng đăng nhập quản trị.');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch('/api/admin/catalogue', { headers: await headers(), cache: 'no-store' }); const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (alive) { setProviders(data.providers); setProvider(data.providers.find((p: Provider) => p.configured)?.id || data.providers[0]?.id || ''); setSearchConfigured(data.searchConfigured); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Không tải được cấu hình API.'); }
      finally { if (alive) setLoadingConfig(false); }
    })();
    return () => { alive = false; };
  }, []);
  async function reloadConfig() {
    setLoadingConfig(true); setError(''); setChecks({}); setNotice('');
    try {
      const r = await fetch('/api/admin/catalogue', { headers: await headers(), cache: 'no-store' }); const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setProviders(data.providers); setSearchConfigured(data.searchConfigured);
      setProvider(prev => data.providers.some((p: Provider) => p.id === prev) ? prev : data.providers[0]?.id || '');
      setNotice('Đã tải lại trạng thái API key từ server.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được cấu hình.'); }
    finally { setLoadingConfig(false); }
  }
  async function checkConnection() {
    const id = provider; setChecking(true); setError(''); setNotice('');
    setChecks(prev => { const next = { ...prev }; delete next[id]; return next; });
    try {
      const r = await fetch('/api/admin/catalogue', { method: 'POST', headers: await headers(), body: JSON.stringify({ action: 'check', provider: id }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Kiểm tra thất bại.');
      setChecks(prev => ({ ...prev, [id]: { ok: true, message: `${data.message} (${(data.durationMs / 1000).toFixed(1)}s · ${data.usage.input} input / ${data.usage.output} output token · ${new Date(data.checkedAt).toLocaleTimeString('vi-VN')})` } }));
    } catch (e) { setChecks(prev => ({ ...prev, [id]: { ok: false, message: e instanceof Error ? e.message : 'Không kiểm tra được kết nối.' } })); }
    finally { setChecking(false); }
  }
  async function choose(selected: File[]) {
    setBusy(true); setError(''); setResult(null); setSections([]); setFrames([]); setFiles([]);
    try { const images = await catalogueMedia(selected); setFiles(selected); setFrames(images); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không đọc được ảnh.'); }
    finally { setBusy(false); }
  }
  async function analyze() {
    setBusy(true); setError(''); setNotice(''); setResult(null); setSections([]);
    try {
      const r = await fetch('/api/admin/catalogue', { method: 'POST', headers: await headers(), body: JSON.stringify({ provider, images: frames, facts, research }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Không thể phân tích.');
      setResult(data); setSections(catalogueSections(data.draft));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể phân tích.'); }
    finally { setBusy(false); }
  }
  function transfer() {
    if (!result || !sections[0]?.trim()) return;
    // Prices and proposed dimensions deliberately stay out of the listing form.
    const specs = Object.fromEntries(result.draft.specs.filter(s => s.evidence && s.value !== 'Cần xác nhận').map(s => [s.label, s.value]));
    onTransfer({ product: { name: sections[0].trim(), category: catalogueCategories[result.draft.category] || '', description: sections[4].split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join(''), specs, price: 'Liên hệ', salePrice: '', variants: [], defaultVariantId: '', hidden: true }, files: files.filter(f => f.type.startsWith('image/')) });
  }
  const box = 'w-full bg-black border border-gray-700 p-3 text-sm text-gray-100';
  const locked = busy || checking || loadingConfig || quickBusy;
  const selectedProvider = providers.find(p => p.id === provider);
  return <div className="space-y-6 max-w-6xl mx-auto text-gray-200">
    <div><h2 className="text-2xl font-bold text-gold-light">BỘ TOOL AI · ĐĂNG SẢN PHẨM TỪ ẢNH</h2><p className="text-sm mt-2">{mode === 'quick' ? 'Chọn ảnh + mô tả → Tạo nội dung → xem/sửa → bấm Đăng lên web.' : mode === 'batch' ? 'Thêm ảnh và mô tả riêng cho mỗi sản phẩm → Đăng tất cả → theo dõi trạng thái.' : 'Chế độ nâng cao: 5 mục để nghiên cứu/copy, không tự đăng.'}</p></div>
    <div className="flex gap-3 flex-wrap"><button type="button" disabled={locked} onClick={() => setMode('quick')} className={`border px-4 py-2 ${mode === 'quick' ? 'border-gold-light text-gold-light' : 'border-gray-700'}`}>Đăng nhanh (tiết kiệm token)</button><button type="button" disabled={locked} onClick={() => setMode('batch')} className={`border px-4 py-2 ${mode === 'batch' ? 'border-gold-light text-gold-light' : 'border-gray-700'}`}>Đăng hàng loạt</button><button type="button" disabled={locked} onClick={() => setMode('advanced')} className={`border px-4 py-2 ${mode === 'advanced' ? 'border-gold-light text-gold-light' : 'border-gray-700'}`}>Nâng cao · 5 mục / tra giá</button></div>
    <div className="border border-gold-dark/30 bg-[#0c0c0c] p-5 space-y-4">
      <label className="block">API đọc sản phẩm · thinking tắt<select className={box + ' mt-2'} value={provider} onChange={e => setProvider(e.target.value)} disabled={locked}>{providers.map(p => <option key={p.id} value={p.id}>{p.label} · {p.model}{p.configured ? ' (đã có API key)' : ' (chưa có API key)'}</option>)}</select></label>
      <div className="border border-gray-700 p-4 space-y-3" aria-live="polite">
        <p className={loadingConfig ? 'text-gray-400' : selectedProvider?.configured ? 'text-green-300' : 'text-amber-300'}>{loadingConfig ? 'Đang đọc cấu hình API key…' : selectedProvider?.configured ? '✓ Đã có API key trên server. Bấm kiểm tra để xác nhận key gọi được model.' : 'Chưa có API key trên server cho lựa chọn này.'}</p>
        {mode === 'advanced' && <p className={searchConfigured ? 'text-green-300 text-sm' : 'text-amber-300 text-sm'}>Tra cứu giá Tavily: {loadingConfig ? 'đang tải…' : searchConfigured ? 'đã có API key (chưa kiểm tra kết nối).' : 'chưa có API key.'}</p>}
        <div className="flex gap-3 flex-wrap">
          <button type="button" className="border border-gold-light text-gold-light px-4 py-2 disabled:opacity-40" disabled={locked || !selectedProvider?.configured} onClick={() => void checkConnection()}>{checking ? 'Đang kiểm tra API…' : 'Kiểm tra kết nối API'}</button>
          <button type="button" className="border border-gray-600 px-4 py-2 disabled:opacity-40" disabled={locked} onClick={() => void reloadConfig()}>Tải lại cấu hình</button>
        </div>
        <p className="text-xs text-gray-400">Tải lại cấu hình không gọi AI. Kiểm tra kết nối gọi một yêu cầu nhỏ, tối đa 64 output token, không gửi ảnh và vẫn tắt thinking; có thể phát sinh phí API. Sau kiểm tra, đợi 15 giây trước lần gọi API tiếp theo. Nếu mới sửa .env.local, khởi động lại server; trên Vercel cần Redeploy.</p>
        {checks[provider] && <p role="status" className={checks[provider].ok ? 'text-green-300 text-sm' : 'text-red-300 text-sm'}>{checks[provider].ok ? '✓ ' : '✕ '}{checks[provider].message}</p>}
      </div>
      <p className="text-xs text-gray-400">API key đặt trên server, không lưu trong trình duyệt. Chọn ảnh không gọi AI/không tự đăng. Đăng nhanh gọi AI khi bấm Tạo nội dung; hàng loạt khi bấm Đăng tất cả.</p>
      {mode === 'quick' ? <QuickCataloguePublisher provider={provider} configured={!!selectedProvider?.configured} disabled={busy || checking || loadingConfig} onBusy={setQuickBusy} /> : mode === 'batch' ? <BatchCataloguePublisher provider={provider} configured={!!selectedProvider?.configured} disabled={busy || checking || loadingConfig} onBusy={setQuickBusy} /> : <>
      <label className="block">Ảnh hoặc video<input className={box + ' mt-2'} type="file" multiple accept="image/jpeg,image/png,image/webp,video/*" disabled={locked} onChange={e => { void choose(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
      <p className="text-xs text-gray-400">Tối đa 4 ảnh hoặc 1 video ≤ 2 phút. Video chỉ đọc 4 khung hình, không đọc âm thanh. Ảnh gửi AI được thu nhỏ; ảnh gốc vẫn giữ nguyên. Ảnh/khung hình và thông tin xác nhận được gửi tới API bạn chọn; từ khóa sản phẩm gửi tới API tra cứu khi bật.</p>
      <div className="flex gap-3 flex-wrap">{frames.map((src, i) => <img key={i} src={src} alt={`Ảnh phân tích ${i + 1}`} className="w-28 h-28 object-contain bg-black border border-gray-700" />)}</div>
      <label className="block">Thông tin bạn đã xác nhận (không bắt buộc)<textarea className={box + ' mt-2'} rows={3} maxLength={3000} value={facts} disabled={busy} onChange={e => { setFacts(e.target.value); setResult(null); setSections([]); }} placeholder="VD: Chất liệu: PLA. Kích thước thực tế: 15 × 10 × 20 cm. Giới hạn sản xuất: ... Không biết thì để trống." /></label>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={research} disabled={busy} onChange={e => setResearch(e.target.checked)} />Tra giá thực tế online (tối đa 1 lượt tìm + 1 lượt AI bổ sung)</label>
      {!searchConfigured && <p className="text-amber-300 text-sm">Server chưa có TAVILY_API_KEY: vẫn tạo nội dung, nhưng giá để “Cần xác nhận”.</p>}
      <button className="bg-gold-light text-black px-5 py-3 font-bold disabled:opacity-40" disabled={locked || !frames.length || !selectedProvider?.configured} onClick={() => void analyze()}>{busy ? 'Đang xử lý…' : 'Tạo bản nháp từ ảnh / video'}</button>
      </>}
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}{notice && <p role="status" className="text-gold-light">{notice}</p>}
    {mode === 'advanced' && result && <>
      <div className="text-sm border border-gray-700 p-4"><p>{result.provider} · Input: {result.usage.input.toLocaleString()} token · Output: {result.usage.output.toLocaleString()} token · Không bật thinking.</p><p className="mt-2 text-amber-300">Kiểm tra lại tên, thông số và nguồn giá. Giá/size gợi ý chưa phải dữ liệu được xác nhận, không tự đưa vào form.</p>{result.warnings.map((w, i) => <p key={i} className="mt-1 text-amber-300">{w}</p>)}</div>
      {labels.map((label, i) => <section key={label} className="space-y-2"><div className="flex justify-between items-center"><h3 className="font-bold text-gold-light">{label}</h3><button className="border border-gray-600 px-3 py-1" onClick={() => { void navigator.clipboard.writeText(sections[i] || '').then(() => setNotice(`Đã copy mục ${i + 1}.`), () => setError('Không copy được. Hãy chọn nội dung và copy thủ công.')); }}>Copy</button></div><textarea className={box + ' font-mono'} rows={i === 1 || i === 3 ? 10 : i === 4 ? 8 : 3} value={sections[i] || ''} onChange={e => setSections(prev => prev.map((s, j) => i === j ? e.target.value : s))} /></section>)}
      <details className="border border-gray-700 p-4"><summary>Nguồn tra cứu thật ({result.sources.length}) — cần kiểm tra sản phẩm, size, giá</summary>{result.sources.map(s => <div key={s.id} className="mt-3"><a className="text-gold-light underline" href={s.url} target="_blank" rel="noopener noreferrer">[{s.id}] {s.title || s.url}</a><p className="text-xs whitespace-pre-wrap mt-1">{s.content}</p></div>)}</details>
      <p className="text-xs text-gray-400">Chuyển tên và mô tả đã chỉnh, danh mục AI chọn và thông số có bằng chứng gốc vào form. Mục 2–4 chỉnh trong ô copy chỉ để xuất nội dung, không được tự diễn giải thành trường dữ liệu. Video không chuyển thành ảnh sản phẩm.</p>
      <button className="bg-gold-light text-black px-5 py-3 font-bold" onClick={transfer}>Duyệt tiếp trong form sản phẩm (lưu nháp / ẩn)</button>
    </>}
  </div>;
}
