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
  {
    id: "chon-vat-lieu-in-3d",
    title: "Cách chọn vật liệu phù hợp cho sản phẩm in 3D",
    brief: "Phân biệt PLA, PETG, ABS, TPU và Resin theo công năng, môi trường sử dụng và yêu cầu hoàn thiện.",
    content: `Chọn đúng vật liệu quyết định trực tiếp đến độ bền, vẻ ngoài và chi phí của sản phẩm in 3D.

PLA dễ in, bề mặt đẹp và phù hợp với mô hình trưng bày, đồ decor hoặc sản phẩm sử dụng trong nhà. PETG bền hơn, chịu ẩm tốt và thích hợp cho phụ kiện, hộp bảo vệ hay đồ dùng thường xuyên tiếp xúc với môi trường. ABS chịu nhiệt khá nhưng cần điều kiện in được kiểm soát tốt. TPU có độ đàn hồi, phù hợp với đệm, vỏ bảo vệ và chi tiết cần uốn cong. Resin cho độ chi tiết cao, thường được chọn cho tượng, nhân vật và mô hình kích thước nhỏ.

Trước khi chọn vật liệu, bạn nên xác định sản phẩm đặt trong nhà hay ngoài trời, có chịu lực hoặc chịu nhiệt không, cần cứng hay dẻo và mức độ chi tiết mong muốn. Nếu chưa chắc chắn, hãy gửi mục đích sử dụng cho Xưởng In 3D để được đề xuất phương án phù hợp.`,
    date: "03/10/2026", readTime: "6 phút", category: "Vật liệu in 3D", image: "/images/kien-thuc.webp", featured: true, views: 128,
  },
  {
    id: "quy-trinh-dat-in-3d",
    title: "Quy trình đặt in 3D theo yêu cầu từ ý tưởng đến sản phẩm",
    brief: "Các bước và thông tin cần chuẩn bị để xưởng tư vấn, báo giá và sản xuất nhanh chóng.",
    content: `Bước 1 – Gửi yêu cầu: Bạn có thể gửi file 3D, bản vẽ, hình ảnh tham khảo, kích thước hoặc mẫu thật. Hãy mô tả rõ mục đích sử dụng và số lượng cần làm.

Bước 2 – Tư vấn phương án: Xưởng kiểm tra khả năng sản xuất, đề xuất công nghệ, vật liệu, màu sắc, độ hoàn thiện và cách chia chi tiết nếu cần.

Bước 3 – Báo giá và duyệt mẫu: Chi phí được tính dựa trên kích thước, lượng vật liệu, thời gian máy, độ khó và công đoạn hoàn thiện. Với dự án mới, khách hàng có thể duyệt một mẫu trước khi làm số lượng.

Bước 4 – In và hoàn thiện: Sản phẩm được in, làm sạch, lắp ráp, xử lý bề mặt hoặc sơn theo phương án đã thống nhất.

Bước 5 – Kiểm tra và bàn giao: Xưởng kiểm tra kích thước, hình thức và đóng gói trước khi giao.`,
    date: "02/10/2026", readTime: "5 phút", category: "Hướng dẫn", image: "/images/in-3d-theo-yeu-cau.webp", views: 96,
  },
  {
    id: "fdm-va-resin",
    title: "Nên chọn công nghệ in FDM hay Resin?",
    brief: "So sánh hai công nghệ in 3D phổ biến để chọn đúng phương án cho từng loại sản phẩm.",
    content: `FDM tạo sản phẩm bằng cách đùn từng lớp nhựa nhiệt dẻo. Công nghệ này phù hợp với chi tiết có kích thước vừa và lớn, đồ dùng, phụ kiện kỹ thuật, mẫu thử và các đơn hàng cần tối ưu chi phí.

Resin sử dụng nhựa quang hóa và ánh sáng để tạo hình. Ưu điểm nổi bật là bề mặt mịn, thể hiện tốt chi tiết nhỏ, phù hợp với tượng, nhân vật, trang sức mẫu và mô hình cần độ sắc nét cao.

Không có công nghệ nào tốt hơn trong mọi trường hợp. FDM thường là lựa chọn thực tế cho sản phẩm cần độ bền và kích thước lớn; Resin phù hợp khi chi tiết và thẩm mỹ là ưu tiên. Xưởng sẽ cân đối thêm số lượng, thời gian và ngân sách để tư vấn chính xác.`,
    date: "01/10/2026", readTime: "6 phút", category: "Công nghệ in 3D", image: "/images/giai-phap.webp", views: 174,
  },
  {
    id: "chuan-bi-file-in-3d",
    title: "Chuẩn bị file như thế nào trước khi gửi in 3D?",
    brief: "Checklist cơ bản giúp hạn chế lỗi file, sai kích thước và rút ngắn thời gian xử lý đơn hàng.",
    content: `Các định dạng thường dùng để in 3D là STL, OBJ và 3MF. Nếu cần chỉnh sửa thiết kế, bạn nên gửi thêm file gốc từ phần mềm CAD hoặc thiết kế 3D.

Trước khi gửi, hãy kiểm tra đơn vị kích thước là mm, bề mặt mô hình đã kín, không có phần hình học bị lỗi và các chi tiết nhỏ đủ độ dày để sản xuất. Với sản phẩm lắp ráp, cần ghi rõ dung sai mong muốn và vị trí tiếp xúc giữa các bộ phận.

Nếu bạn chỉ có ảnh, bản vẽ tay hoặc mẫu thật, Xưởng In 3D vẫn có thể hỗ trợ dựng file. Thời gian và chi phí thiết kế sẽ được báo riêng sau khi xem mức độ phức tạp.`,
    date: "30/09/2026", readTime: "5 phút", category: "Hướng dẫn", image: "/images/san-pham.webp", views: 83,
  },
  {
    id: "bao-gia-in-3d-duoc-tinh-the-nao",
    title: "Giá in 3D được tính như thế nào?",
    brief: "Tìm hiểu các yếu tố ảnh hưởng đến báo giá: kích thước, vật liệu, thời gian máy và mức độ hoàn thiện.",
    content: `Báo giá in 3D không chỉ phụ thuộc vào kích thước bên ngoài. Hai sản phẩm có cùng chiều cao vẫn có thể chênh lệch đáng kể nếu mật độ ruột, độ dày thành, vật liệu và thời gian máy khác nhau.

Các yếu tố chính gồm lượng vật liệu sử dụng, thời gian in, công nghệ, độ phân giải, số lượng chi tiết hỗ trợ và tỷ lệ sản phẩm lỗi cần dự phòng. Những công đoạn sau in như chà nhám, ghép nối, sơn màu hoặc đóng gói cũng được tính theo yêu cầu thực tế.

Để nhận báo giá sát nhất, bạn nên gửi file cùng kích thước, số lượng, màu sắc, mục đích sử dụng và thời hạn cần hàng. Xưởng sẽ tối ưu cách đặt mẫu và cấu trúc in để cân bằng chất lượng với ngân sách.`,
    date: "29/09/2026", readTime: "5 phút", category: "Hướng dẫn", image: "/images/du-an-da-thuc-hien.webp", views: 141,
  },
  {
    id: "ung-dung-in-3d-cho-doanh-nghiep",
    title: "5 ứng dụng thiết thực của in 3D cho doanh nghiệp",
    brief: "Từ tạo mẫu nhanh, đồ gá đến POSM và quà tặng cá nhân hóa cho các chiến dịch thương hiệu.",
    content: `1. Tạo mẫu nhanh giúp đội ngũ kiểm tra hình dáng và trải nghiệm sản phẩm trước khi đầu tư khuôn.

2. Đồ gá và phụ kiện kỹ thuật hỗ trợ thao tác, lắp ráp hoặc thay thế những chi tiết khó mua sẵn.

3. Mô hình sản phẩm giúp việc thuyết trình, trưng bày và đào tạo trở nên trực quan hơn.

4. POSM, logo nổi và vật phẩm trang trí tạo điểm nhấn cho cửa hàng, sự kiện hoặc chiến dịch ra mắt.

5. Quà tặng cá nhân hóa theo tên, logo hoặc thông điệp phù hợp với lô nhỏ và chương trình dành riêng cho khách hàng.

Ưu thế của in 3D là linh hoạt khi cần số lượng ít, thay đổi thiết kế nhanh và thử nghiệm nhiều phiên bản.`,
    date: "28/09/2026", readTime: "7 phút", category: "Ứng dụng in 3D", image: "/images/du-an-da-thuc-hien.webp", views: 112,
  },
  {
    id: "bao-quan-san-pham-in-3d",
    title: "Cách sử dụng và bảo quản sản phẩm in 3D bền lâu",
    brief: "Một số lưu ý đơn giản về nhiệt độ, ánh nắng, vệ sinh và tải trọng của sản phẩm.",
    content: `Sản phẩm in 3D nên được sử dụng đúng với vật liệu và công năng đã tư vấn. PLA phù hợp trong nhà nhưng không nên để lâu dưới nắng gắt hoặc gần nguồn nhiệt cao. PETG chịu ẩm và nhiệt tốt hơn, tuy nhiên vẫn cần tránh tải trọng vượt quá thiết kế.

Khi vệ sinh, nên dùng khăn mềm, nước sạch hoặc dung dịch dịu nhẹ. Không sử dụng dung môi mạnh nếu chưa biết khả năng tương thích của vật liệu. Với mô hình sơn hoàn thiện, tránh cọ xát mạnh và nên trưng bày ở nơi khô ráo.

Nếu sản phẩm có khớp lắp, hãy thao tác đúng hướng và liên hệ xưởng khi cần thay thế một bộ phận. Lưu lại file thiết kế giúp việc tái sản xuất sau này nhanh và đồng nhất hơn.`,
    date: "27/09/2026", readTime: "4 phút", category: "Hướng dẫn", image: "/images/kien-thuc.webp", views: 67,
  },
];

export const COURSES_DATA: Course[] = [];
export const JOBS_DATA: Job[] = [];
export const BRANCHES_DATA: Branch[] = [{ id: "xuong-in-3d-hcm", name: "XƯỞNG IN 3D", type: "TRỤ SỞ CHÍNH", address: "71/1E Võ Văn Hát, Long Trường, TP.HCM", phone: "0822 426 639", email: "xuongin3d@gmail.com", image: "/images/lien-he.webp" }];
export const DEALERS_DATA: Dealer[] = [];
