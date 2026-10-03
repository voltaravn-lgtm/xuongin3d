import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = "G:/web/MAYIN3D-main/public/downloads/mau-nhap-san-pham-xuong-in-3d.xlsx";
const categories = [
  ["den-do-decor-trang-tri", "ĐÈN - ĐỒ DECOR - TRANG TRÍ"],
  ["do-dung-tien-ich-phu-kien", "ĐỒ DÙNG TIỆN ÍCH - PHỤ KIỆN"],
  ["qua-tang-do-dung-gia-dinh", "QUÀ TẶNG - ĐỒ DÙNG GIA ĐÌNH"],
  ["mo-hinh-tuong-nhan-vat", "MÔ HÌNH - TƯỢNG - NHÂN VẬT"],
  ["do-cong-nghe", "ĐỒ CÔNG NGHỆ"],
  ["chau-cay-trang-tri-cay", "CHẬU CÂY - TRANG TRÍ CÂY"],
  ["trang-tri-ho-ca-be-ca", "TRANG TRÍ HỒ CÁ - BỂ CÁ"],
  ["doanh-nghiep-posm", "DOANH NGHIỆP - POSM"],
  ["kien-truc-sa-ban", "KIẾN TRÚC - SA BÀN"],
];

const headers = [
  "Mã SP", "Tên sản phẩm", "Danh mục", "Danh mục con", "Thương hiệu",
  "Kích thước / quy mô", "Hình thức thực hiện", "Vật liệu", "Bảo hành",
  "Giá bán", "Giá giảm", "Số tồn", "Trạng thái kho", "Trạng thái hiển thị",
  "Video", "Mô tả", "Thông số kỹ thuật",
];

const example = [
  "MH001", "Mô hình in 3D mẫu", "MÔ HÌNH - TƯỢNG - NHÂN VẬT", "", "XƯỞNG IN 3D",
  "Cao 20 cm", "In theo yêu cầu", "PLA / Resin", "Hỗ trợ sau bàn giao",
  "", "", "", "preorder", "Đang hiện",
  "https://www.instagram.com/reel/MA_REEL/\nhttps://www.youtube.com/watch?v=MA_VIDEO",
  "Mô tả sản phẩm mẫu. Hãy sửa hoặc xóa dòng này trước khi nhập.",
  "Kích thước: 20 cm\nVật liệu: PLA\nMàu sắc: Theo yêu cầu",
];

const workbook = Workbook.create();
const products = workbook.worksheets.add("Sản phẩm");
const categorySheet = workbook.worksheets.add("Danh mục");
const guide = workbook.worksheets.add("Hướng dẫn");

products.showGridLines = false;
products.getRange("A1:Q1").values = [headers];
products.getRange("A2:Q2").values = [example];
products.getRange("A1:Q501").format.font = { name: "Arial", size: 10, color: "#1F2937" };
products.getRange("A1:Q1").format = {
  fill: "#172033",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#FFFFFF" },
};
products.getRange("A1:Q1").format.rowHeight = 34;
products.getRange("A2:Q501").format.verticalAlignment = "top";
products.getRange("A2:Q501").format.borders = { preset: "inside", style: "thin", color: "#E5E7EB" };
products.getRange("A2:Q501").format.rowHeight = 24;
products.getRange("A2:A501").format.numberFormat = "@";
products.getRange("J2:M501").format.numberFormat = "@";
products.getRange("A2:Q2").format.fill = "#FFF7D6";
products.getRange("A2:Q2").format.wrapText = true;
products.getRange("A2:Q2").format.rowHeight = 58;
products.freezePanes.freezeRows(1);
products.freezePanes.freezeColumns(2);

const widths = [14, 28, 32, 24, 18, 20, 21, 18, 24, 14, 14, 10, 18, 20, 36, 48, 42];
widths.forEach((width, index) => {
  products.getRangeByIndexes(0, index, 501, 1).format.columnWidth = width;
});

products.dataValidations.add({
  range: "C2:C501",
  rule: { type: "list", formula1: "'Danh mục'!$B$2:$B$10" },
});
products.dataValidations.add({
  range: "M2:M501",
  rule: { type: "list", values: ["in-stock", "low-stock", "out-of-stock", "preorder"] },
});
products.dataValidations.add({
  range: "N2:N501",
  rule: { type: "list", values: ["Đang hiện", "Đang ẩn"] },
});
products.tables.add("A1:Q2", true, "ProductImportTable").style = "TableStyleMedium2";

categorySheet.showGridLines = false;
categorySheet.getRange("A1:B1").values = [["Mã danh mục", "Tên danh mục hiển thị"]];
categorySheet.getRange(`A2:B${categories.length + 1}`).values = categories;
categorySheet.getRange(`A1:B${categories.length + 1}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
categorySheet.getRange("A1:B1").format = {
  fill: "#172033",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
categorySheet.getRange("A:A").format.columnWidth = 34;
categorySheet.getRange("B:B").format.columnWidth = 40;
categorySheet.freezePanes.freezeRows(1);
categorySheet.tables.add(`A1:B${categories.length + 1}`, true, "CategoryListTable").style = "TableStyleMedium2";

guide.showGridLines = false;
guide.getRange("A1:D1").merge();
guide.getRange("A1").values = [["HƯỚNG DẪN NHẬP SẢN PHẨM HÀNG LOẠT"]];
guide.getRange("A1:D1").format = {
  font: { name: "Arial", size: 14, bold: true, color: "#172033" },
  verticalAlignment: "center",
};
guide.getRange("A3:B8").values = [
  ["Bước", "Cách thực hiện"],
  [1, "Nhập Mã SP và Tên sản phẩm. Mã SP phải duy nhất."],
  [2, "Chọn Danh mục từ danh sách thả xuống ở cột C."],
  [3, "Có thể để trống ảnh. Sau khi nhập Excel, dùng công cụ Promo Overlay để đăng ảnh theo mã file."],
  [4, "Đặt tên ảnh chính giống mã, ví dụ MH001.jpg. Ảnh phụ dùng MH001-1.jpg, MH001-2.jpg."],
  [5, "Mỗi link video Instagram, Facebook hoặc YouTube đặt trên một dòng trong cùng ô Video."],
];
guide.getRange("A3:B3").format = {
  fill: "#172033",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
guide.getRange("A4:A8").format.horizontalAlignment = "center";
guide.getRange("A3:B8").format.verticalAlignment = "top";
guide.getRange("A3:B8").format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
guide.getRange("A3:B8").format.font = { name: "Arial", size: 10, color: "#1F2937" };
guide.getRange("B4:B8").format.wrapText = true;
guide.getRange("A:A").format.columnWidth = 10;
guide.getRange("B:B").format.columnWidth = 92;
guide.getRange("A4:B8").format.rowHeight = 36;

workbook.recalculate();

const inspection = await workbook.inspect({
  kind: "table",
  sheetId: "Sản phẩm",
  range: "A1:Q4",
  include: "values,formulas",
  tableMaxRows: 4,
  tableMaxCols: 17,
});
console.log(inspection.ndjson);

const errorInspection = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errorInspection.ndjson);

await fs.mkdir("G:/web/MAYIN3D-main/public/downloads", { recursive: true });
const preview = await workbook.render({ sheetName: "Sản phẩm", range: "A1:Q5", scale: 1, format: "png" });
await fs.mkdir("G:/web/MAYIN3D-main/.artifact-work", { recursive: true });
await fs.writeFile("G:/web/MAYIN3D-main/.artifact-work/product-template-preview.png", new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`SAVED=${outputPath}`);
