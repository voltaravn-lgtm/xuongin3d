# Thùng rác sản phẩm — 7 ngày

- Xóa phải xác nhận. Transaction lưu bản gốc mới nhất vào `productTrash/{id}` rồi xóa `products/{id}`. Nếu transaction thất bại, sản phẩm không bị gỡ khỏi giao diện.
- Mục **Đã xóa · khôi phục trong 7 ngày** ở Kho sản phẩm chỉ tải dữ liệu khi mở hoặc bấm Tải lại. Không tải lịch sử này cho khách.
- Khôi phục transaction giữ ID, SKU, slug, ảnh, mô tả, phân loại và trạng thái ẩn/hiện; không gọi AI. Không ghi đè ID đang tồn tại. Giao diện cũng kiểm tra SKU và slug trùng.
- `deletedAt` là server timestamp; `expiresAt` là Firestore Timestamp, thời điểm xóa + 7 ngày. Đồng hồ máy quản trị phải đúng. Sau mốc này, UI và transaction khôi phục không cho khôi phục. Rules cho phép admin xóa bản lưu; đây không phải rào chắn server cho việc admin tự tạo lại sản phẩm.
- Bản hết hạn có nền/chữ xám, nút khôi phục bị khóa. Có nút xóa vĩnh viễn từng bản, ô chọn nhiều/chọn tất cả và nút Xóa nhanh hết hạn. Tất cả yêu cầu xác nhận; có thể xóa vĩnh viễn trước hạn. Chỉ xóa `productTrash`, không xóa sản phẩm đang bán, ảnh hoặc SKU registry.
- Xóa nhiều chia nhóm tối đa 400 bản lưu. Chỉ gỡ khỏi UI khi commit thành công; nhóm lỗi giữ nguyên và hiện thông báo để thử lại. Không gọi AI.
- Firestore TTL là tùy chọn, tự dọn bản lưu khi hết hạn, không phụ thuộc người dùng mở web. TTL không xóa tức thời: thông thường trong 24 giờ sau hạn. Không bật TTL thì người dùng chủ động dọn bằng nút trên web.
- Cloudinary không bị xóa. Đơn hàng và các tham chiếu khác không bị sửa; SKU registry tiếp tục giữ mã đã cấp để không tái sử dụng ngoài ý muốn.
- Sản phẩm đã xóa vĩnh viễn trước khi triển khai tính năng này không có bản lưu để khôi phục.
- Khi Firestore trả dữ liệu thành công, trang sản phẩm và sitemap dùng đúng tập sản phẩm Firestore, không trộn sản phẩm mẫu cũ trở lại.

## Triển khai bắt buộc

Code local chưa tự bật TTL trên dự án Firebase. Trước khi sử dụng trên production:

1. Cập nhật `firestore.rules` mới vào đúng dự án, cho phép admin xóa bản lưu vĩnh viễn (`firebase deploy --only firestore:rules` hoặc Publish Rules trên Firebase Console).
2. Nếu chỉ dọn thủ công trên Spark, không cần bật TTL/deploy cấu hình TTL. Nếu muốn tự dọn trên Blaze: deploy `firestore.indexes.json` (`firebase deploy --only firestore:indexes`) và xác nhận Google Cloud Console → Firestore → Time-to-live → policy `productTrash / expiresAt` đã **Active**. expiresAt đã cộng 7 ngày.
3. Deploy ứng dụng Vercel.
4. Kiểm tra bằng sản phẩm thử: hủy xác nhận không xóa; xóa xuất hiện ở thùng rác và không xuất hiện ở catalog/sitemap; khôi phục giữ URL, dữ liệu; không khôi phục được quá hạn.

TTL yêu cầu billing và tính phí lượt delete theo Firestore. Nếu chưa bật policy, bản lưu hết hạn vẫn tồn tại trong Firebase nhưng bị khóa khôi phục cho đến khi admin dọn thủ công. Xóa thủ công dùng hạn mức delete thông thường, không yêu cầu TTL/Blaze.

Tham khảo: https://firebase.google.com/docs/firestore/ttl

Kiểm thử local dùng transaction giả lập để kiểm tra giữ dữ liệu, thất bại commit, khôi phục, hết hạn và trùng ID. Chưa thay cho kiểm thử Rules bằng Firebase Emulator hoặc xác nhận policy production.
