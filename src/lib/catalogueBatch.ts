import { catalogueCategories } from './aiCatalogue.ts';
import { confirmedSpecText } from './productSpecsPaste.ts';
import { quickCatalogueContext, quickCatalogueExtras, quickCatalogueImageOrder, quickCatalogueProduct, type QuickCatalogue, type QuickListingExtras } from './quickCatalogue.ts';
import type { Product } from '../types.ts';
import type { WatermarkOptions } from './watermark.ts';

export type BatchCatalogueRow = QuickListingExtras & { key: string; name: string; description?: string; facts: string; category: string; price: string; files: File[] };
export type BatchWatermark = { enabled: boolean; logo: string; options: WatermarkOptions };
export type BatchPending = { id: string; draft: QuickCatalogue; urls: string[]; watermark: BatchWatermark; usage: { input: number; output: number }; product?: Product };
export type BatchProgress = { status: 'working' | 'preview' | 'published' | 'error'; message: string; pending?: BatchPending };
type Dependencies = {
  identify: (row: BatchCatalogueRow) => Promise<{ draft: QuickCatalogue; usage: { input: number; output: number } }>;
  upload: (file: File, watermark: BatchWatermark) => Promise<string>;
  save: (product: Product) => Promise<boolean>;
  categoryAvailable: (id: string) => boolean;
  newId: () => string;
  shouldStop: () => boolean;
  progress: (key: string, progress: BatchProgress) => void;
  previewOnly?: boolean;
  checkpoint?: () => Promise<void>;
};
// Each row owns its draft, partial uploaded URLs and stable ID. No AI retries after draft creation.
export async function publishCatalogueBatch(rows: BatchCatalogueRow[], pending: Map<string, BatchPending>, watermark: BatchWatermark, deps: Dependencies) {
  const ensureActive = () => { if (deps.shouldStop()) throw new Error('Đã yêu cầu dừng. Dữ liệu của lượt này được giữ để tiếp tục.'); };
  for (const row of rows) {
    if (deps.shouldStop()) break;
    if (pending.get(row.key)?.product) continue;
    try {
      deps.progress(row.key, { status: 'working', message: 'Đang kiểm tra dữ liệu…' });
      if (!row.files.length || row.files.length > 12 || row.files.some(f => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 20 * 1024 * 1024)) throw new Error('Cần 1–12 ảnh JPG/PNG/WebP, tối đa 20MB/ảnh.');
      quickCatalogueContext(row.name, row.description || '', row.facts);
      quickCatalogueExtras(row.price, row);
      quickCatalogueImageOrder(row.files, row.coverIndex);
      if (row.category && !deps.categoryAvailable(row.category)) throw new Error('Danh mục bạn chọn không có hoặc đang ẩn.');
      let d = pending.get(row.key);
      if (!d) {
        deps.progress(row.key, { status: 'working', message: 'AI đang đọc ảnh đầu tiên, thinking tắt…' });
        const analysis = await deps.identify(row);
        d = { id: deps.newId(), draft: { ...analysis.draft, name: row.name.trim() || analysis.draft.name, specs: { ...analysis.draft.specs, ...confirmedSpecText(row.facts) } }, urls: [], watermark: { ...watermark, options: { ...watermark.options } }, usage: analysis.usage };
        pending.set(row.key, d);
        await deps.checkpoint?.();
      }
      ensureActive();
      if (!d.draft.name.trim() || !d.draft.description.trim()) throw new Error('Điền tên và mô tả trong bản xem trước trước khi đăng.');
      const category = row.category || catalogueCategories[d.draft.category];
      if (!deps.categoryAvailable(category)) throw new Error('Danh mục AI chọn không có hoặc đang ẩn. Chọn lại danh mục rồi thử tiếp.');
      if (deps.previewOnly) {
        deps.progress(row.key, { status: 'preview', message: 'Đã tạo bản xem trước. Có thể sửa nội dung trước khi đăng.', pending: d });
        continue;
      }
      for (let i = d.urls.length; i < row.files.length; i++) {
        ensureActive();
        deps.progress(row.key, { status: 'working', message: `Đang xử lý/upload ảnh ${i + 1}/${row.files.length}…`, pending: d });
        d.urls.push(await deps.upload(row.files[i], d.watermark));
        await deps.checkpoint?.();
      }
      ensureActive();
      const product = quickCatalogueProduct({ ...d.draft, name: row.name.trim() || d.draft.name }, d.id, d.urls, category, row.price, row);
      deps.progress(row.key, { status: 'working', message: 'Đang lưu sản phẩm công khai…', pending: d });
      if (!await deps.save(product)) throw new Error('Không lưu được Firebase. Có thể thử đăng lại, không gọi AI thêm và không upload lại ảnh đã xong.');
      d.product = product;
      await deps.checkpoint?.();
      deps.progress(row.key, { status: 'published', message: 'Đã đăng lên web.', pending: d });
    } catch (e) {
      deps.progress(row.key, { status: 'error', message: e instanceof Error ? e.message : 'Không đăng được sản phẩm.', pending: pending.get(row.key) });
    }
  }
}
