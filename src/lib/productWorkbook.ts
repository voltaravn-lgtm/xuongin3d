import type { Product } from '../types';
import { variantExcelFields, variantExcelHeader } from './productExcelOptions.ts';

export const productWorkbookGuide = [
  ['Nội dung', 'Cách nhập'],
  ['Sheet Sản phẩm', 'Mỗi dòng là một sản phẩm, dùng chung cho sản phẩm có và không có phân loại. Không sửa hàng tiêu đề.'],
  ['Ví dụ trong mẫu', 'Hai dòng đầu là ví dụ, đang ẩn. Thay mã, tên và nội dung hoặc xóa trước khi nhập hàng thật.'],
  ['Mã và tên', 'Tên sản phẩm và Mã SP (hoặc ID/SKU) phải có. Mã đã tồn tại sẽ cập nhật sản phẩm cũ sau khi xác nhận.'],
  ['Không có phân loại', 'Có phân loại = Không. Điền giá bán/giá giảm và kích thước chung. Để trống toàn bộ cột Phân loại N.'],
  ['Có phân loại', 'Có phân loại = Có. Mỗi nhóm Phân loại 1, 2, 3… là một lựa chọn S, M, L hoặc tên tùy ý. Phải có tên phân loại.'],
  ['Giá', 'Nhập số VND, ví dụ 259000. Giá riêng trống dùng giá sản phẩm chính. Giá giảm là giá bán sau giảm, không phải số tiền giảm. Có thể nhập Liên hệ.'],
  ['Kích thước riêng', 'Phân loại N - Kích thước: ví dụ Cao 16 cm. Chọn phân loại này sẽ khóa kích thước; không điền thì dùng lựa chọn kích thước chung.'],
  ['Ảnh riêng', 'Phân loại N - Ảnh là URL ảnh; không bắt buộc, trống dùng ảnh sản phẩm. Excel không upload ảnh từ máy.'],
  ['Chọn sẵn', 'Phân loại chọn sẵn nhập 1, 2, 3… theo nhóm đã điền tên.'],
  ['Màu và kích thước chung', 'Màu sắc: Trắng, Vàng. Kích thước / quy mô: 12 cm, 15 cm. Dùng dấu phẩy để tách lựa chọn.'],
  ['Ảnh bổ sung và video', 'Mỗi URL một dòng trong cùng ô (Alt+Enter), hoặc tách bằng dấu |.'],
  ['Thông số kỹ thuật', 'Mỗi thông số một dòng: Vật liệu: PLA. Không thay cho kích thước riêng của phân loại.'],
  ['Ô trống khi cập nhật', 'Ô trống thường giữ dữ liệu cũ. Dấu - xóa màu, ghi chú, giá giảm hoặc trường tùy chọn của phân loại. Có phân loại = Không xóa tất cả phân loại cũ.'],
  ['Trạng thái kho', 'in-stock, low-stock, out-of-stock, preorder. Số tồn 0 là hết hàng, khác ô trống.'],
  ['Hiển thị', 'Đang hiện hoặc Đang ẩn. Hai ví dụ mặc định ẩn để tránh đăng nhầm.'],
  ['Giá đại lý', 'Giá bán lẻ, giá đại lý cấp 1/cấp 2 là số VND. Chiết khấu cấp 1/cấp 2 nhập 20 nghĩa là 20%.'],
  ['Dữ liệu nâng cao', 'Mô tả HTML, Combo JSON và Thông số JSON dùng để xuất rồi nhập lại không mất cấu trúc. Nếu sửa cột Mô tả/Thông số kỹ thuật, xóa cột HTML/JSON tương ứng để hệ thống dùng nội dung mới.'],
  ['Số lượng phân loại', 'File xuất tự thêm nhóm theo sản phẩm thực tế. Muốn thêm lựa chọn, sao chép nhóm cột và đổi số trong tiêu đề. Không giới hạn ở S/M/L.'],
];

export function productWorkbookMatrix(products: Product[]) {
  const columns: Array<[string, (p: Product) => unknown]> = [
    ['ID', p => p.id], ['Mã SP', p => p.sku || p.id], ['Tên sản phẩm', p => p.name],
    ['Danh mục', p => p.category], ['Danh mục con', p => p.subCategory], ['Thương hiệu', p => p.brand],
    ['Có phân loại', p => p.variants?.length ? 'Có' : 'Không'],
    ['Giá bán', p => p.price], ['Giá giảm', p => p.salePrice],
    ['Kích thước / quy mô', p => p.voltage], ['Màu sắc', p => p.colors?.join(', ')], ['Ghi chú đặt hàng', p => p.orderNote],
    ['Phân loại chọn sẵn', p => { const i = p.variants?.findIndex(v => v.id === p.defaultVariantId) ?? -1; return i < 0 ? '' : i + 1; }],
    ['Hình thức thực hiện', p => p.capacity], ['Vật liệu', p => p.cellType], ['Bảo hành', p => p.warranty],
    ['Ảnh đại diện', p => p.image], ['Ảnh bổ sung', p => p.images?.join('\n')], ['Video', p => p.videoUrls?.join('\n')],
    ['Mô tả', p => p.description.replace(/<[^>]+>/g, ' ')], ['Mô tả HTML', p => p.description],
    ['Thông số kỹ thuật', p => Object.entries(p.specs || {}).map(([k,v]) => `${k}: ${v}`).join('\n')],
    ['Thông số JSON', p => JSON.stringify(p.specs || {})], ['Combo JSON', p => JSON.stringify(p.combos || [])],
    ['SKU', p => p.sku], ['Barcode', p => p.barcode], ['Số tồn', p => p.stockQuantity], ['Trạng thái kho', p => p.stockStatus],
    ['Trạng thái hiển thị', p => p.hidden ? 'Đang ẩn' : 'Đang hiện'],
    ['Giá bán lẻ', p => p.retailPrice], ['Giá đại lý cấp 1', p => p.dealerLevel1Price], ['Giá đại lý cấp 2', p => p.dealerLevel2Price],
    ['Chiết khấu chung (%)', p => p.dealerDiscountPercent], ['Chiết khấu cấp 1 (%)', p => p.dealerLevel1DiscountPercent], ['Chiết khấu cấp 2 (%)', p => p.dealerLevel2DiscountPercent],
    ['Cho đồng bộ', p => p.syncEnabled ? 'Có' : 'Không'], ['Kênh đồng bộ', p => p.syncChannel],
    ['External Product ID', p => p.externalProductId || p.haravanProductId], ['External Variant ID', p => p.externalVariantId || p.haravanVariantId],
    ['Lần đồng bộ gần nhất', p => p.lastSyncedAt], ['Nhãn sản phẩm', p => p.tag], ['Slug', p => p.slug],
    ['Ngày tạo', p => p.createdAt], ['Ngày cập nhật', p => p.updatedAt],
  ];
  const keys = ['id','name','price','salePrice','sku','stockQuantity','image','stockStatus','size'] as const;
  for (let index = 1; index <= Math.max(3, ...products.map(p => p.variants?.length || 0)); index++) {
    variantExcelFields.forEach((field, i) => columns.push([variantExcelHeader(index, field), p => field === 'Ẩn' ? (p.variants?.[index - 1]?.hidden === undefined ? '' : p.variants[index - 1].hidden ? 'Có' : 'Không') : p.variants?.[index - 1]?.[keys[i]]]));
  }
  return [columns.map(([label]) => label), ...products.map(p => columns.map(([label, getter]) => {
    const v = getter(p);
    if (v === undefined || v === null || v === '') return '';
    if (/Giá|Số tồn|Chiết khấu/.test(label) && /\d/.test(String(v)) && !/liên hệ/i.test(String(v))) {
      const raw = String(v).replace(/[^\d.]/g, '');
      const n = /Chiết khấu/.test(label) ? Number(raw) : Number(String(v).replace(/\D/g, ''));
      if (Number.isFinite(n)) return n;
    }
    return v as string | number;
  }))];
}

export function readProductWorkbookExtras(cell: (label: string) => string, existing?: Product): Partial<Product> {
  const result: Partial<Product> = {};
  const priceFields = [['Giá bán lẻ','retailPrice'],['Giá đại lý cấp 1','dealerLevel1Price'],['Giá đại lý cấp 2','dealerLevel2Price']] as const;
  for (const [label, key] of priceFields) { const v = cell(label); if (v) result[key] = v === '-' ? '' : v; }
  const discounts = [['Chiết khấu chung (%)','dealerDiscountPercent'],['Chiết khấu cấp 1 (%)','dealerLevel1DiscountPercent'],['Chiết khấu cấp 2 (%)','dealerLevel2DiscountPercent']] as const;
  for (const [label, key] of discounts) {
    const v = cell(label); if (!v) continue;
    const n = Number(v.replace('%','').replace(',','.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${label} phải từ 0 đến 100.`);
    result[key] = n;
  }
  const strings = [['Nhãn sản phẩm','tag'],['Slug','slug'],['Kênh đồng bộ','syncChannel'],['External Product ID','externalProductId'],['External Variant ID','externalVariantId'],['Lần đồng bộ gần nhất','lastSyncedAt']] as const;
  for (const [label,key] of strings) { const v = cell(label); if (v) Object.assign(result, { [key]: v === '-' ? '' : v }); }
  if (cell('Cho đồng bộ')) result.syncEnabled = /^(có|co|true|1)$/i.test(cell('Cho đồng bộ'));
  if (cell('Mô tả HTML')) result.description = cell('Mô tả HTML');
  if (cell('Thông số JSON')) {
    const specs = JSON.parse(cell('Thông số JSON'));
    if (!specs || Array.isArray(specs) || typeof specs !== 'object' || Object.values(specs).some(v => typeof v !== 'string')) throw new Error('Thông số JSON phải là đối tượng gồm tên và nội dung dạng chữ.');
    result.specs = specs;
  }
  if (cell('Combo JSON')) {
    const combos = JSON.parse(cell('Combo JSON'));
    if (!Array.isArray(combos) || combos.some(c => !c || typeof c.id !== 'string' || typeof c.name !== 'string')) throw new Error('Combo JSON phải là danh sách combo có ID và tên.');
    result.combos = combos;
  }
  if (cell('Ngày tạo') && !existing) result.createdAt = cell('Ngày tạo');
  return result;
}
