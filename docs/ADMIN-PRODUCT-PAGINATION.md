# Kho quản trị: giới hạn read khi mở trang

- Kho thường dùng `orderBy(documentId(), 'desc')`, `startAfter(cursor)`, `limit(12/24/48)`. Không dùng offset, không getDocs toàn collection để chia trang. Thứ tự là ID, không phải ngày tạo: tránh bỏ sót sản phẩm cũ chưa có createdAt.
- `getCountFromServer` đếm tổng bằng aggregation, không tải 2000 document về. Có chi phí đọc chỉ mục của count (khoảng một read/1000 index entries theo bảng giá Firestore).
- SessionStorage lưu trang, cursor kết quả, tổng và kết quả tìm mã 5 phút theo UID. F5 trong cùng tab dùng lại dữ liệu còn hạn; tab mới hoặc cache hết hạn sẽ tải lại. Strict Mode/concurrent calls dùng chung promise đang chạy.
- Số trang xa chưa biết cursor bị khóa. Dùng Sau để tải trang kế; có thể quay lại trang đã tải, không quét các trang ở giữa chỉ để nhảy tới cuối.
- Nút Làm mới chủ động xóa cache. Khi thêm/sửa/xóa/khôi phục sản phẩm trong tab, cache bị xóa và danh sách về trang 1. Thay đổi từ nhân viên khác có thể chưa thấy trong tối đa 5 phút; bấm Làm mới để lấy dữ liệu mới.
- Không lưu tập sản phẩm quản trị chưa đầy đủ vào cache catalog công khai. Context chỉ nhận các trang đã tải; không coi products.length là tổng số kho.
- Tìm đúng mã IN3D dùng getDoc + query sku equality giới hạn. Tìm một phần tên và các bộ lọc giá/trạng thái chưa có chỉ mục phù hợp với dữ liệu cũ: cần xác nhận đọc toàn kho, cache riêng 5 phút. Nhập tên chỉ chạy khi bấm Tìm kiếm/Enter, không đọc mỗi lần gõ.
- Excel xuất/nhập và công cụ AI/overlay cần tập dữ liệu đầy đủ: chỉ tải toàn kho khi người dùng xác nhận mở/chạy công cụ. Không âm thầm gọi full-catalog khi mở trang quản trị thường.
- Cơ chế cấp SKU đối chiếu toàn kho cũ một lần khi chưa có `productSkuRegistry/shortCodes.legacyIndexed`. Các mã cũ được đưa vào registry trong transaction cấp mã. Sau đó tạo SP chỉ đọc registry và ID cần tạo, không getDocs toàn kho mỗi lần đăng.
- Trang bán hàng, SSR/sitemap và các truy vấn thông tin quản trị khác vẫn có chi phí đọc riêng, không được tính trong số 12/24/48 của trang kho.

Không cần chỉ mục composite mới cho phân trang mặc định hoặc tìm SKU. Chưa triển khai production hay thử tải dữ liệu live.

Tài liệu: https://firebase.google.com/docs/firestore/query-data/query-cursors và https://firebase.google.com/docs/firestore/pricing
