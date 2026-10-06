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
