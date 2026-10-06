// Only reduced frames are sent to AI. Original files stay on this device.
function frame(canvas: HTMLCanvasElement, source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, 1024 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xem ảnh.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
}
function event(target: EventTarget, name: string, action?: () => void) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); target.removeEventListener(name, ok); target.removeEventListener('error', bad); error ? reject(error) : resolve(); };
    const ok = () => finish(), bad = () => finish(new Error('Không đọc được ảnh/video.'));
    const timer = setTimeout(() => finish(new Error('Đọc ảnh/video quá thời gian.')), 15000);
    target.addEventListener(name, ok, { once: true }); target.addEventListener('error', bad, { once: true });
    action?.();
  });
}
export async function catalogueMedia(files: File[]): Promise<string[]> {
  if (!files.length || files.length > 4) throw new Error('Chọn tối đa 4 ảnh hoặc 1 video.');
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  if (videoFiles.length && files.length !== 1) throw new Error('Video cần chọn riêng, không trộn cùng ảnh.');
  const canvas = document.createElement('canvas');
  const frames: string[] = [];
  for (const file of files) {
    if (file.size > (videoFiles.length ? 150 : 20) * 1024 * 1024) throw new Error('Ảnh tối đa 20MB, video tối đa 150MB.');
    const url = URL.createObjectURL(file);
    try {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video'); video.muted = true; video.preload = 'auto'; video.playsInline = true;
        try {
          await event(video, 'loadeddata', () => { video.src = url; video.load(); });
          if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 120) throw new Error('Video phải ngắn hơn 2 phút.');
          for (let i = 0; i < 4; i++) {
            const time = video.duration * (i + 0.5) / 4;
            await event(video, 'seeked', () => { video.currentTime = time; });
            frames.push(frame(canvas, video, video.videoWidth, video.videoHeight));
          }
        } finally { video.removeAttribute('src'); video.load(); }
      } else if (/^image\/(jpeg|png|webp)$/.test(file.type)) {
        const img = new Image(); await event(img, 'load', () => { img.src = url; });
        frames.push(frame(canvas, img, img.naturalWidth, img.naturalHeight));
      } else throw new Error('Chọn JPG, PNG, WebP hoặc video trình duyệt đọc được.');
    } finally { URL.revokeObjectURL(url); }
  }
  return frames;
}
