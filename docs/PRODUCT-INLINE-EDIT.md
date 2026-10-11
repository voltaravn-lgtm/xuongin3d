# Sửa sản phẩm ngay trên trang khách (bản thử)

Đăng nhập tài khoản admin đã xác thực email, rồi mở link sản phẩm `/san-pham/<slug>`.
Nút **Chỉnh sửa ngay trên trang** chỉ hiện cho admin. Bấm nút để tạo bản nháp; các vùng viền nét đứt cho phép sửa tên, mô tả, ảnh đại diện, thương hiệu, màu sắc, vật liệu, bảo hành, hình thức thực hiện và thông số hiện có. Mô tả soạn trực tiếp dưới dạng chữ hiển thị, không lộ thẻ HTML; giữ định dạng và ảnh có sẵn, nội dung dán vào chỉ lấy chữ. Ảnh đại diện chọn bằng thumbnail trong bộ ảnh sản phẩm (kể cả ảnh phân loại), giữ ảnh đại diện cũ trong bộ ảnh, không cần nhập URL hoặc upload lại. Giá và kích thước nằm trong khối chỉnh giá trên trang. **Lưu thay đổi** ghi Firebase; **Hủy** bỏ bản nháp. Khách không có quyền chỉnh sửa. Firestore rules quản trị tiếp tục là lớp kiểm tra quyền ghi.

- `pricingMode: single`: khách không chọn phân loại; dùng `price` / `salePrice` và `singleSize`. Kích thước trống thì ẩn. Màu sắc giữ nguyên. Phân loại và kích thước chung cũ không bị xóa.
- `pricingMode: variants`: dùng giá riêng của phân loại, không dùng lại giá đơn lưu trước đó cho phân loại chưa nhập giá. Ô giá trống có thể bổ sung sau.
- Chế độ giá phân loại có nút thêm phân loại, sửa tên/giá/kích thước và checkbox ẩn từng phân loại. Ẩn không xóa dữ liệu; nếu ẩn phân loại mặc định thì chuyển sang phân loại còn hiện. Nếu ẩn hết, khách được hướng dẫn liên hệ xưởng. Các thay đổi chỉ ghi khi bấm Lưu.
- Sản phẩm cũ chưa có `pricingMode` giữ nguyên hành vi cũ, tránh thay đổi hàng loạt.
- Dữ liệu phân loại vẫn nằm trong tài liệu sản phẩm và trong Excel backup, kể cả khi đang bán giá đơn.
- Giỏ hàng đã chọn size cũ trước khi chuyển giá đơn phải chọn lại, không dùng lại giá size cũ.

Chưa deploy và không có cập nhật sản phẩm thật trong quá trình triển khai. Bấm Lưu trên local sẽ ghi Firebase thật đang cấu hình; nên thử trên một sản phẩm thử. Thay đổi không yêu cầu rules/index mới.
