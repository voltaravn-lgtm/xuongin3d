export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export interface WatermarkOptions { position: WatermarkPosition; size: number; opacity: number; margin: number; }
export function watermarkBounds(width: number, height: number, imageWidth: number, imageHeight: number, options: WatermarkOptions) {
  const margin = Math.min(width, height) * options.margin / 100;
  const scale = Math.min(width * options.size / 100 / imageWidth, (height - 2 * margin) / imageHeight);
  const w = imageWidth * scale, h = imageHeight * scale;
  return { width: w, height: h,
    x: options.position === 'center' ? (width - w) / 2 : options.position.endsWith('right') ? width - w - margin : margin,
    y: options.position === 'center' ? (height - h) / 2 : options.position.startsWith('bottom') ? height - h - margin : margin };
}
export function drawWatermark(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number, options: WatermarkOptions) {
  const bounds = watermarkBounds(width, height, image.naturalWidth, image.naturalHeight, options);
  ctx.save();
  ctx.globalAlpha = options.opacity / 100;
  ctx.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.restore();
}

export async function watermarkImageFile(file: File, logoUrl: string, options: WatermarkOptions, quality = 0.7): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Ảnh đóng watermark cần là JPG, PNG hoặc WebP.');
  const sourceUrl = URL.createObjectURL(file);
  const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => img.naturalWidth && img.naturalHeight ? resolve(img) : reject(new Error('Ảnh hoặc logo không có kích thước hợp lệ.'));
    img.onerror = () => reject(new Error('Không đọc được ảnh hoặc logo watermark. Vui lòng chọn lại file.'));
    img.src = url;
  });
  try {
    const [source, logo] = await Promise.all([load(sourceUrl), load(logoUrl)]);
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không thể tạo ảnh watermark.');
    ctx.drawImage(source, 0, 0);
    drawWatermark(ctx, logo, canvas.width, canvas.height, options);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result?.type === 'image/webp' ? resolve(result) : reject(new Error('Trình duyệt không xuất được WebP.')), 'image/webp', Math.max(0, Math.min(1, quality)));
    });
    return new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, {type:'image/webp',lastModified:file.lastModified});
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
