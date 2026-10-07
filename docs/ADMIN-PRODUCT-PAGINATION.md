# Kho quản trị: giới hạn read khi mở trang

- Kho thường dùng `orderBy(createdAt, 'desc')`, `orderBy(documentId(), 'desc')`, cursor gồm ngày tạo + ID, `limit(12/24/48)`: mới nhất trước, ngày trùng không lặp/bỏ sót khi chuyển trang. Không dùng offset hay tải toàn kho để chia trang.
- Count riêng kho có ngày tạo giúp phát hiện sản phẩm cũ thiếu createdAt. Hiện cảnh báo và nút xem kho đầy đủ theo ID (vẫn tải từng trang); không âm thầm bỏ qua hoặc tự sửa dữ liệu cũ.
- `getCountFromServer` đếm tổng bằng aggregation, không tải 2000 document về. Có chi phí đọc chỉ mục của count (khoảng một read/1000 index entries theo bảng giá Firestore).
- SessionStorage lưu trang, cursor kết quả, tổng và kết quả tìm mã 5 phút theo UID. F5 trong cùng tab dùng lại dữ liệu còn hạn; tab mới hoặc cache hết hạn sẽ tải lại. Strict Mode/concurrent calls dùng chung promise đang chạy.
- Số trang xa chưa biết cursor bị khóa. Dùng Sau để tải trang kế; có thể quay lại trang đã tải, không quét các trang ở giữa chỉ để nhảy tới cuối.
- Nút Làm mới chủ động xóa cache. Khi thêm/sửa/xóa/khôi phục sản phẩm trong tab, cache bị xóa và danh sách về trang 1. Listener giới hạn 1 sản phẩm mới nhất phát hiện sản phẩm mới từ tab/nhân viên khác, xóa cache và tải lại trang 1 + số lượng. F5 cùng dữ liệu mới nhất không xóa cache. Chỉnh sửa sản phẩm khác đầu danh sách có thể chưa thấy trong tối đa 5 phút; bấm Làm mới để lấy ngay.
- Không lưu tập sản phẩm quản trị chưa đầy đủ vào cache catalog công khai. Context chỉ nhận các trang đã tải; không coi products.length là tổng số kho.
- Tự tìm sau khi ngừng gõ 500 ms (không chạy giữa lúc nhập IME). Mã 4–5 số như `25758` tự đổi thành `IN3D-25758`; mã đầy đủ/ID dùng getDoc + query SKU equality giới hạn, kể cả khi có bộ lọc giá/trạng thái.
- Tìm tên/lọc nâng cao tự tải toàn kho khi bắt đầu tìm nếu cache chưa có hoặc đã hết hạn, không cần bấm nút tải hay xác nhận. Dùng lại dữ liệu trong 5 phút, các lần gõ tiếp không đọc lại toàn kho; yêu cầu đồng thời dùng chung promise. Mở kho bình thường vẫn chỉ tải từng trang. Có bộ nhớ dự phòng khi SessionStorage bị chặn. Lần tìm tên đầu tiên sau mỗi lần hết hạn/invalidation có chi phí đọc toàn kho.
- Excel xuất/nhập và công cụ AI/overlay cần tập dữ liệu đầy đủ: chỉ tải toàn kho khi người dùng xác nhận mở/chạy công cụ. Không âm thầm gọi full-catalog khi mở trang quản trị thường.
- Cơ chế cấp SKU đối chiếu toàn kho cũ một lần khi chưa có `productSkuRegistry/shortCodes.legacyIndexed`. Các mã cũ được đưa vào registry trong transaction cấp mã. Sau đó tạo SP chỉ đọc registry và ID cần tạo, không getDocs toàn kho mỗi lần đăng.
- Trang bán hàng, SSR/sitemap và các truy vấn thông tin quản trị khác vẫn có chi phí đọc riêng, không được tính trong số 12/24/48 của trang kho.

Không cần chỉ mục composite mới cho phân trang mặc định hoặc tìm SKU. Chưa triển khai production hay thử tải dữ liệu live.

Tài liệu: https://firebase.google.com/docs/firestore/query-data/query-cursors và https://firebase.google.com/docs/firestore/pricing
