# Hướng Dẫn Sử Dụng DeepReader (Getting Started)

Tài liệu này hướng dẫn bạn cách khởi động toàn bộ hệ thống DeepReader, hiểu luồng nghiệp vụ (workflow) chính của ứng dụng và cách phân quyền quản trị viên (Admin).

---

## 1. Khởi Động Hệ Thống & Giao Diện Website

Hệ thống DeepReader bao gồm 2 phần chính: Backend (Microservices) và Frontend (React).

### Khởi động Backend
Các cơ sở dữ liệu (PostgreSQL, MongoDB, Redis, Qdrant, Kafka) đã được cấu hình trỏ tới các dịch vụ Cloud trong file `.env`. Do đó, bạn chỉ cần dùng Docker để build và chạy các service nội bộ của DeepReader:

1. Mở Terminal (PowerShell/CMD) tại thư mục gốc của dự án (`deepreader`).
2. Chạy lệnh sau để khởi động toàn bộ 5 backend services:
   ```bash
   docker compose up -d --build
   ```
3. Đợi vài phút để quá trình build hoàn tất. Các service sẽ chạy ở các port 8000, 8080, 8081, 8082, và 8083.

### Khởi động Frontend
1. Mở một cửa sổ Terminal mới.
2. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
3. Cài đặt các thư viện cần thiết (nếu chưa cài):
   ```bash
   npm install
   ```
4. Khởi động server phát triển của giao diện:
   ```bash
   npm run dev
   ```
5. **Truy cập Website:** Mở trình duyệt web và truy cập vào địa chỉ: **[http://localhost:3000](http://localhost:3000)**

---

## 2. Luồng Nghiệp Vụ (Workflow) Của Trang Web

Sau khi vào giao diện `http://localhost:3000`, đây là các bước để bạn trải nghiệm đọc sách sâu với AI:

### Bước 1: Tạo tài khoản & Đăng nhập
- Ngay tại trang chủ, bạn sẽ được chuyển hướng đến trang Login.
- Bấm **Đăng ký (Register)** để tạo một tài khoản mới. Điền Email và Mật khẩu (tối thiểu 8 ký tự).

### Bước 2: Cấu hình Khóa AI (Tùy chọn)
- Sau khi đăng nhập, ở menu góc phải trên cùng, nhấn vào **Cài đặt (⚙️)**.
- Tại mục "LLM API Token", bạn có thể nhập API Key cá nhân của Gemini hoặc OpenAI. 
- *Lưu ý: Nếu bạn không nhập, hệ thống sẽ sử dụng key mặc định của máy chủ.*

### Bước 3: Tải sách lên (Ingestion)
- Chuyển sang trang **Thư viện Sách (📚)**.
- Chọn mô hình AI mà bạn muốn sử dụng (ví dụ: Gemini).
- Nhấn nút **Upload Sách** và chọn một file `.pdf` hoặc `.epub` từ máy tính.
- Hệ thống sẽ đẩy sách qua `haystack-service` để bóc tách nội dung, chia nhỏ (chunking), tạo Vector Embeddings và lưu vào Qdrant Database. Trong quá trình này, sách sẽ có trạng thái `PROCESSING`.

### Bước 4: Tương tác & Đọc Sâu với AI
Sau khi sách xử lý xong (trạng thái `COMPLETED`), nhấn vào thẻ sách để mở giao diện làm việc. Tại đây có 3 công cụ mạnh mẽ:
1. **💬 Hỏi Đáp (Chat):** Khung chat RAG (Retrieval-Augmented Generation). Bạn có thể hỏi "Nhân vật chính là ai?", "Tóm tắt chương 1?". AI sẽ tìm kiếm thông tin ngay trong cuốn sách bạn vừa upload và trả lời, kèm theo "Nguồn tham khảo" để đối chiếu.
2. **📝 Tóm Tắt (Summary):** Bấm "Tạo tóm tắt", AI sẽ tổng hợp và xuất ra những ý chính đắt giá nhất của cuốn sách. Các tóm tắt cũ sẽ được lưu lại để xem sau.
3. **🃏 Flashcards:** Nhập số lượng thẻ (ví dụ 10 thẻ) và nhấn Tạo. AI tự động lọc ra các khái niệm, từ khóa quan trọng và tạo thẻ học. Bạn nhấn vào từng thẻ để lật xem đáp án, giúp ôn tập kiến thức cốt lõi nhanh chóng.

---

## 3. Cách Tạo Tài Khoản Admin

Tài khoản **Admin** (Quản trị viên) có đặc quyền truy cập trang **Admin Dashboard** (`http://localhost:3000/admin`) để xem Lịch sử kiểm toán (Audit Logs) và các tác vụ bị lỗi (Dead Letters).

Có 2 cách để một tài khoản trở thành Admin:

### Cách 1: Người đăng ký đầu tiên (Tự động)
Hệ thống được lập trình logic trong `UserAccountService.java`: **Người dùng đầu tiên đăng ký vào Database sẽ tự động được gán quyền `ADMIN`.**
- Nếu đây là lần đầu tiên bạn dựng hệ thống hoặc database đang trống.
- Bạn chỉ cần mở website `http://localhost:3000/register`, đăng ký 1 tài khoản bình thường.
- Tài khoản đó sẽ mặc định là Admin.

### Cách 2: Phân quyền trực tiếp qua Database (Thủ công)
Nếu database đã có người dùng khác đăng ký từ trước, các tài khoản đăng ký sau sẽ mặc định là quyền `USER`. Để nâng cấp họ lên `ADMIN`:
1. Mở phần mềm quản lý Database (DBeaver, DataGrip, pgAdmin,...) và kết nối vào cơ sở dữ liệu PostgreSQL (chuỗi kết nối có trong file `.env` ở biến `DATABASE_URL`).
2. Mở bảng `app_users`.
3. Tìm đến tài khoản bạn muốn cấp quyền.
4. Đổi giá trị ở cột `role` từ `USER` thành `ADMIN`.
5. Bấm Save/Commit để lưu. Người dùng này sau đó chỉ cần Đăng nhập lại vào Website là sẽ thấy nút Admin xuất hiện trên thanh điều hướng.
