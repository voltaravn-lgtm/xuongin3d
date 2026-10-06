import { useEffect, useRef, useState } from 'react';
import { drawWatermark, type WatermarkOptions } from '../../lib/watermark';

interface Props {
  imageUrl?: string;
  logoUrl: string;
  options: WatermarkOptions;
}

export default function WatermarkPreview({imageUrl,logoUrl,options}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState('');

  useEffect(() => {
    if (!previewFile) { setLocalUrl(''); return; }
    const url = URL.createObjectURL(previewFile);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  useEffect(() => {
    let cancelled = false;
    const sourceUrl = localUrl || imageUrl;
    const load = (url: string) => new Promise<HTMLImageElement>((resolve,reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => img.naturalWidth && img.naturalHeight ? resolve(img) : reject(new Error('Ảnh không có kích thước hợp lệ.'));
      img.onerror = () => reject(new Error('Không đọc được ảnh hoặc logo. Bạn có thể chọn ảnh gốc từ máy để xem thử.'));
      img.src = url;
    });
    setLoading(true);
    setMessage('');
    setDimensions('');
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
    async function render() {
      try {
        const [source, logo] = await Promise.all([sourceUrl ? load(sourceUrl) : Promise.resolve(null), load(logoUrl)]);
        if (cancelled || !canvas) return;
        const width = source?.naturalWidth || 800;
        const height = source?.naturalHeight || 800;
        const scale = Math.min(1,600 / Math.max(width,height));
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Không thể tạo bản xem thử.');
        if (source) ctx.drawImage(source,0,0,canvas.width,canvas.height);
        else { ctx.fillStyle='#242424'; ctx.fillRect(0,0,canvas.width,canvas.height); }
        drawWatermark(ctx,logo,canvas.width,canvas.height,options);
        setDimensions(source ? `${width} × ${height} px` : 'Nền mẫu — chọn ảnh để xem đúng trên sản phẩm');
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Không thể xem thử ảnh.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void render();
    return () => { cancelled=true; };
  }, [localUrl,imageUrl,logoUrl,options]);

  return <div className="space-y-3 rounded border border-white/15 bg-black/40 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-bold text-gold-light">Xem thử ảnh + watermark</span>
      <span className="text-[10px] text-gray-400">{dimensions}</span>
    </div>
    <div className="relative flex min-h-32 items-center justify-center overflow-hidden rounded bg-[#161616] p-2">
      <canvas ref={canvasRef} aria-label="Ảnh xem trước đã ghép watermark" className={`block max-h-[360px] max-w-full object-contain ${loading || message ? 'invisible' : ''}`} />
      {(loading || message) && <p role="status" className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-gray-300">{loading ? 'Đang tạo bản xem thử…' : message}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer border border-gold-dark/40 px-3 py-2 text-[11px] text-gold-light">Chọn ảnh gốc để xem thử
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { setPreviewFile(e.target.files?.[0] || null); e.target.value=''; }} />
      </label>
      {previewFile && <><span className="max-w-60 truncate text-[10px] text-gray-400">{previewFile.name}</span><button type="button" onClick={() => setPreviewFile(null)} className="text-[11px] text-gray-300 hover:text-gold-light">Dùng ảnh sản phẩm</button></>}
    </div>
    <p className="text-[10px] leading-relaxed text-gray-400">Kéo các thanh chỉnh để xem logo thay đổi ngay. Ảnh xem thử chỉ xử lý tại máy, chưa upload và không thay ảnh sản phẩm. Nếu ảnh hiện tại đã có logo, hãy chọn ảnh gốc để tránh xem logo chồng lên nhau.</p>
  </div>;
}
