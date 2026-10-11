# Giảm lượt đọc kho sản phẩm

- Admin không đọc toàn kho để đồng bộ preview khi mở mục sản phẩm; chỉ tải trang 12/24/48 bằng cursor.
- Tìm mã 4–5 số hoặc IN3D-… dùng truy vấn giới hạn. Khi đang gõ 1–3 số, không truy vấn toàn kho.
- Tìm tên/bộ lọc vẫn cần tải toàn kho một lần, dùng cache 5 phút. Thêm/sửa/xóa tại trình duyệt hiện tại cập nhật snapshot tìm kiếm thay vì tải lại toàn kho; không kéo dài hạn cache. Nút làm mới vẫn xóa cache chủ động.
- Listener sản phẩm mới chỉ đọc một tài liệu và đưa sản phẩm mới vào snapshot đã tải. Thay đổi khác từ nhân viên khác có thể cần làm mới hoặc chờ cache hết hạn.
- API khách, sitemap, metadata và sản phẩm liên quan dùng chung Next Data Cache với tag `public-products`, thời hạn 300 giây. Lỗi truy vấn không được lưu vào cache.
- Sau thêm/sửa/xóa, endpoint xác thực quản trị vô hiệu hóa cache khách để dữ liệu mới có thể được tải. Đợt tải đầu sau cập nhật vẫn đọc toàn kho; không phải mỗi lượt khách đều đọc lại toàn kho.
- Thay đổi code cần deploy web để có hiệu lực trên production; không yêu cầu sửa Firestore rules/indexes.

Không đảm bảo số reads tuyệt đối: build/rebuild, bot, Firestore Console, listener, truy vấn tìm kiếm và các collection khác vẫn phát sinh reads. Không có thay đổi dữ liệu production trong quá trình kiểm tra.
