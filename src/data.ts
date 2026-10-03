/** Nội dung mặc định cho website Xưởng In 3D. Có thể chỉnh lại trong Admin. */
import { Article, Branch, Course, Dealer, Job, Product, Project, Solution } from "./types";

const placeholderImage = "/images/san-pham.webp";

export const PRODUCTS_DATA: Product[] = [
  {
    id: "den-decor-in-3d-theo-yeu-cau", name: "Đèn decor in 3D theo yêu cầu",
    voltage: "Nhiều kích thước", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "PLA / PETG",
    warranty: "Hỗ trợ sau bàn giao", image: placeholderImage, tag: "Đặt theo yêu cầu", category: "den-do-decor-trang-tri", price: "Liên hệ",
    description: "Thiết kế và in đèn decor, đèn ngủ, chụp đèn và vật phẩm trang trí theo ý tưởng, hình ảnh hoặc kích thước khách hàng cung cấp.",
    specs: { "Vật liệu": "PLA / PETG", "Màu sắc": "Tùy chọn", "Kích thước": "Theo yêu cầu", "Thời gian thực hiện": "Báo sau khi duyệt mẫu" },
  },
  {
    id: "phu-kien-tien-ich-in-3d", name: "Phụ kiện và đồ dùng tiện ích in 3D",
    voltage: "Tùy sản phẩm", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "PLA / PETG / TPU",
    warranty: "Hỗ trợ sau bàn giao", image: placeholderImage, tag: "Tùy chỉnh", category: "do-dung-tien-ich-phu-kien", price: "Liên hệ",
    description: "Các loại giá đỡ, hộp chứa, phụ kiện bàn làm việc và đồ dùng tiện ích được thiết kế vừa đúng nhu cầu sử dụng.",
    specs: { "Vật liệu": "PLA / PETG / TPU", "Thiết kế": "Có thể chỉnh sửa", "Số lượng": "Từ 1 sản phẩm" },
  },
  {
    id: "qua-tang-ca-nhan-hoa-in-3d", name: "Quà tặng cá nhân hóa in 3D",
    voltage: "Tùy sản phẩm", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "PLA / Resin",
    warranty: "Kiểm tra trước bàn giao", image: placeholderImage, tag: "Cá nhân hóa", category: "qua-tang-do-dung-gia-dinh", price: "Liên hệ",
    description: "Quà tặng mang tên, logo, thông điệp hoặc hình dáng riêng dành cho cá nhân, gia đình và các dịp đặc biệt.",
    specs: { "Cá nhân hóa": "Tên / logo / thông điệp", "Vật liệu": "PLA / Resin", "Đóng gói": "Theo yêu cầu" },
  },
  {
    id: "mo-hinh-tuong-nhan-vat-3d", name: "Mô hình, tượng và nhân vật in 3D",
    voltage: "Nhiều tỷ lệ", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "Resin / PLA",
    warranty: "Kiểm tra trước bàn giao", image: placeholderImage, tag: "Độ chi tiết cao", category: "mo-hinh-tuong-nhan-vat", price: "Liên hệ",
    description: "Gia công mô hình trưng bày, tượng, nhân vật và vật phẩm sưu tầm từ file có sẵn hoặc theo yêu cầu thiết kế.",
    specs: { "Công nghệ": "FDM / Resin", "Tỷ lệ": "Tùy chọn", "Hoàn thiện": "Có thể xử lý bề mặt và sơn" },
  },
  {
    id: "phu-kien-do-cong-nghe-in-3d", name: "Phụ kiện đồ công nghệ in 3D",
    voltage: "Theo thiết bị", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "PETG / ABS / TPU",
    warranty: "Hỗ trợ căn chỉnh", image: placeholderImage, tag: "Thiết kế riêng", category: "do-cong-nghe", price: "Liên hệ",
    description: "Vỏ thiết bị, gá lắp, chân đế, hộp mạch và phụ kiện công nghệ được đo đạc, thiết kế và sản xuất theo mục đích sử dụng.",
    specs: { "Vật liệu": "PETG / ABS / TPU", "Đầu vào": "Mẫu thật / bản vẽ / kích thước", "Độ chính xác": "Tùy công nghệ in" },
  },
  {
    id: "chau-cay-trang-tri-in-3d", name: "Chậu cây và phụ kiện trang trí cây",
    voltage: "Nhiều kích thước", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "PLA / PETG",
    warranty: "Kiểm tra trước bàn giao", image: placeholderImage, tag: "Trang trí", category: "chau-cay-trang-tri-cay", price: "Liên hệ",
    description: "Chậu cây, khay, giá treo và vật phẩm trang trí cây với kiểu dáng linh hoạt, phù hợp không gian nhà ở, quán và văn phòng.",
    specs: { "Kiểu dáng": "Theo mẫu hoặc thiết kế riêng", "Kích thước": "Tùy chọn", "Màu sắc": "Tùy chọn" },
  },
  {
    id: "trang-tri-ho-ca-be-ca-in-3d", name: "Trang trí hồ cá và bể cá in 3D",
    voltage: "Theo kích thước bể", capacity: "Theo yêu cầu", brand: "XƯỞNG IN 3D", cellType: "Vật liệu phù hợp môi trường",
    warranty: "Tư vấn vật liệu", image: placeholderImage, tag: "Theo chủ đề", category: "trang-tri-ho-ca-be-ca", price: "Liên hệ",
    description: "Thiết kế tiểu cảnh, hang trú, phụ kiện bố cục và vật phẩm trang trí hồ cá theo chủ đề và kích thước thực tế.",
    specs: { "Thiết kế": "Theo chủ đề", "Kích thước": "Theo bể", "Lưu ý": "Vật liệu được tư vấn theo môi trường sử dụng" },
  },
  {
    id: "posm-doanh-nghiep-in-3d", name: "POSM và vật phẩm thương hiệu cho doanh nghiệp",
    voltage: "Theo dự án", capacity: "Từ mẫu thử đến lô nhỏ", brand: "XƯỞNG IN 3D", cellType: "Đa vật liệu",
    warranty: "Theo thỏa thuận dự án", image: placeholderImage, tag: "Doanh nghiệp", category: "doanh-nghiep-posm", price: "Liên hệ",
    description: "Sản xuất logo nổi, bảng trưng bày, mô hình sản phẩm, quà tặng và POSM nhận diện thương hiệu theo từng chiến dịch.",
    specs: { "Dịch vụ": "Thiết kế và sản xuất", "Số lượng": "Mẫu thử / lô nhỏ", "Nhận diện": "Theo bộ nhận diện thương hiệu" },
  },
  {
    id: "mo-hinh-kien-truc-sa-ban-3d", name: "Mô hình kiến trúc và sa bàn in 3D",
    voltage: "Theo tỷ lệ", capacity: "Theo dự án", brand: "XƯỞNG IN 3D", cellType: "PLA / Resin",
    warranty: "Theo thỏa thuận dự án", image: placeholderImage, tag: "Dự án", category: "kien-truc-sa-ban", price: "Liên hệ",
    description: "Chế tác mô hình kiến trúc, mặt bằng, công trình và sa bàn phục vụ thuyết trình, trưng bày hoặc nghiên cứu thiết kế.",
    specs: { "Đầu vào": "File 3D / bản vẽ", "Tỷ lệ": "Theo yêu cầu", "Hoàn thiện": "Lắp ráp và xử lý bề mặt" },
  },
];

export const SOLUTIONS_DATA: Solution[] = [
  { id: "tao-mau-san-pham", title: "TẠO MẪU SẢN PHẨM NHANH", badge: "Từ ý tưởng đến mẫu thật", iconName: "PenTool", image: "/images/giai-phap.webp", description: "Biến bản vẽ hoặc ý tưởng thành mẫu vật lý để kiểm tra hình dáng, kích thước, khả năng lắp ráp và trải nghiệm trước khi sản xuất.", details: ["Tiếp nhận file 3D hoặc hỗ trợ dựng file", "Tư vấn công nghệ và vật liệu", "In thử từ một sản phẩm", "Điều chỉnh mẫu theo phản hồi"] },
  { id: "posm-thuong-hieu", title: "POSM VÀ NHẬN DIỆN THƯƠNG HIỆU", badge: "Thiết kế theo nhận diện", iconName: "Award", image: "/images/giai-phap.webp", description: "Thiết kế, tạo mẫu và sản xuất vật phẩm trưng bày, logo nổi, mô hình sản phẩm và quà tặng cho chiến dịch truyền thông.", details: ["Cá nhân hóa theo thương hiệu", "Phù hợp lô nhỏ và chiến dịch thử nghiệm", "Đa dạng màu sắc và hoàn thiện", "Hỗ trợ đóng gói theo yêu cầu"] },
  { id: "mo-hinh-kien-truc", title: "MÔ HÌNH KIẾN TRÚC VÀ SA BÀN", badge: "Trực quan hóa thiết kế", iconName: "Building2", image: "/images/giai-phap.webp", description: "Chuyển bản vẽ kiến trúc thành mô hình trực quan phục vụ trình bày phương án, triển lãm và giới thiệu dự án.", details: ["Nhận file CAD hoặc mô hình 3D", "Chia tỷ lệ và tối ưu chi tiết", "In, lắp ráp và hoàn thiện", "Bàn giao theo tiến độ dự án"] },
  { id: "do-ga-phu-kien-ky-thuat", title: "ĐỒ GÁ VÀ PHỤ KIỆN KỸ THUẬT", badge: "Giải pháp theo nhu cầu", iconName: "Wrench", image: "/images/giai-phap.webp", description: "Thiết kế các chi tiết hỗ trợ sản xuất, gá lắp, hộp bảo vệ và phụ kiện thay thế theo kích thước thực tế.", details: ["Đo mẫu hoặc nhận bản vẽ", "Tư vấn vật liệu phù hợp", "Kiểm tra độ vừa vặn", "Có thể cải tiến qua nhiều phiên bản"] },
];

export const PROJECTS_DATA: Project[] = [
  { id: "du-an-posm", title: "Bộ POSM trưng bày thương hiệu", solutionType: "Doanh nghiệp – POSM", location: "TP.HCM", image: "/images/giai-phap.webp", specs: "Thiết kế và sản xuất theo bộ nhận diện của khách hàng." },
  { id: "du-an-mo-hinh", title: "Mô hình sản phẩm trình diễn", solutionType: "Tạo mẫu nhanh", location: "TP.HCM", image: "/images/giai-phap.webp", specs: "Mẫu trực quan phục vụ thuyết trình và kiểm tra thiết kế." },
  { id: "du-an-sa-ban", title: "Mô hình kiến trúc và sa bàn", solutionType: "Kiến trúc", location: "Theo dự án", image: "/images/giai-phap.webp", specs: "Gia công theo tỷ lệ từ bản vẽ hoặc file mô hình 3D." },
  { id: "du-an-qua-tang", title: "Quà tặng cá nhân hóa", solutionType: "Quà tặng", location: "Toàn quốc", image: "/images/giai-phap.webp", specs: "Cá nhân hóa tên, thông điệp và hình dáng theo yêu cầu." },
];

export const ARTICLES_DATA: Article[] = [
  { id: "chon-vat-lieu-in-3d", title: "Cách chọn vật liệu phù hợp cho sản phẩm in 3D", brief: "Phân biệt PLA, PETG, ABS, TPU và Resin theo môi trường sử dụng.", content: "Mỗi vật liệu có ưu điểm riêng về độ cứng, khả năng chịu nhiệt, độ dẻo và chất lượng bề mặt. Hãy bắt đầu từ công năng, điều kiện sử dụng và yêu cầu thẩm mỹ của sản phẩm.", date: "01/10/2026", readTime: "5 phút", category: "Vật liệu in 3D", image: "/images/kien-thuc.webp", featured: true, views: 0 },
  { id: "quy-trinh-dat-in-3d", title: "Quy trình đặt in 3D theo yêu cầu", brief: "Những thông tin cần chuẩn bị để nhận tư vấn và báo giá nhanh.", content: "Khách hàng có thể gửi file 3D, bản vẽ, ảnh tham khảo hoặc mẫu thật. Xưởng sẽ tư vấn kích thước, vật liệu, độ hoàn thiện và thời gian thực hiện trước khi xác nhận.", date: "01/10/2026", readTime: "4 phút", category: "Hướng dẫn", image: "/images/kien-thuc.webp", views: 0 },
  { id: "fdm-va-resin", title: "Nên chọn công nghệ FDM hay Resin?", brief: "So sánh nhanh hai công nghệ in 3D phổ biến.", content: "FDM phù hợp nhiều sản phẩm kích thước lớn và chi phí hợp lý. Resin tạo chi tiết bề mặt tốt, phù hợp tượng, mô hình và các chi tiết nhỏ.", date: "01/10/2026", readTime: "6 phút", category: "Công nghệ in 3D", image: "/images/kien-thuc.webp", views: 0 },
];

export const COURSES_DATA: Course[] = [];
export const JOBS_DATA: Job[] = [];
export const BRANCHES_DATA: Branch[] = [{ id: "xuong-in-3d-hcm", name: "XƯỞNG IN 3D", type: "TRỤ SỞ CHÍNH", address: "71/1E Võ Văn Hát, Long Trường, TP.HCM", phone: "0822 426 639", email: "xuongin3d@gmail.com", image: "/images/lien-he.webp" }];
export const DEALERS_DATA: Dealer[] = [];
