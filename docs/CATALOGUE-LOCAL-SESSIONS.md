# Phiên đăng sản phẩm trên trình duyệt

- Đăng nhanh và đăng hàng loạt tự lưu phiên bằng IndexedDB, theo UID quản trị và từng chế độ.
- Lưu bộ ảnh gốc (File), ảnh đại diện đã chọn, thông tin/giá/phân loại, tùy chọn chèn ảnh mô tả, watermark, bản nháp đã chỉnh, ID ổn định và URL đã upload.
- Khôi phục không tự gọi AI hoặc tự đăng. Mục đã lưu vẫn giữ trạng thái thành công; có đối chiếu ID với dữ liệu sản phẩm đã tải để nhận ra mục đã lưu trước khi trang bị ngắt.
- Checkpoint sau khi nhận bản nháp, mỗi ảnh upload và lưu thành công. Chờ trạng thái “Đã lưu tạm trên máy” trước khi tải lại. Đóng trang giữa request có thể mất kết quả chưa nhận hoặc upload chưa được xác nhận; không hứa khôi phục các bước chưa hoàn tất.
- Ảnh gốc của mục đăng thành công không còn lưu trong phiên. “Tạo sản phẩm mới”/“Xóa phiên lưu tạm” thay nội dung phiên bằng trạng thái trống, giữ thiết lập watermark; không xóa sản phẩm Firebase hoặc file Cloudinary.
- Không lưu API key hoặc token đăng nhập. Lưu trong cùng trình duyệt và origin; localhost và website production có phiên khác nhau. Không dùng nhiều tab cùng chế độ để tránh ghi đè phiên.
- Hết quota/không mở được IndexedDB sẽ có cảnh báo; luồng đăng vẫn hoạt động nhưng không bảo đảm lưu tạm. Xóa dữ liệu website, chế độ riêng tư hoặc trình duyệt tự dọn dữ liệu có thể làm mất phiên.

Form thủ công: bỏ bảng giá đại lý và kho/đồng bộ khỏi UI, không xóa dữ liệu cũ. ID/URL và từng phân loại có thể thu gọn. Các chức năng ảnh, giá, tên, mô tả và lưu sản phẩm vẫn giữ.
