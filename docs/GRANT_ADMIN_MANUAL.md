# Hướng Dẫn Nâng Cấp Tài Khoản Thành ADMIN (Thủ Công)

Trong trường hợp Database đã có dữ liệu và bạn muốn cấp quyền Quản trị viên (Admin) cho một tài khoản cụ thể đã đăng ký, bạn cần truy cập trực tiếp vào Cơ sở dữ liệu PostgreSQL của dự án. 

Dưới đây là hướng dẫn chi tiết từng bước.

---

## 1. Thông Tin Kết Nối Database (Từ file `.env`)

Hệ thống DeepReader đang sử dụng dịch vụ PostgreSQL được host trên **Supabase**. Bạn hãy sử dụng các thông tin kết nối sau:

- **Host (Máy chủ):** `aws-1-ap-northeast-2.pooler.supabase.com`
- **Port (Cổng):** `6543`
- **Database Name (Tên CSDL):** `postgres`
- **Username:** `postgres.raettvrvllvuenxropzt`
- **Password:** `deepreader.23520904`
- **SSL Mode:** `Require`

---

## 2. Các Bước Thực Hiện Bằng Phần Mềm Quản Lý (Khuyên Dùng DBeaver / pgAdmin / DataGrip)

Nếu bạn sử dụng phần mềm có giao diện UI (ví dụ DBeaver), hãy làm theo các bước sau:

**Bước 1: Tạo kết nối mới**
1. Mở phần mềm, chọn **New Database Connection** -> Chọn **PostgreSQL**.
2. Nhập chính xác các thông tin Host, Port, Database, Username và Password ở mục (1).
3. Đảm bảo cấu hình SSL (nếu phần mềm hỏi) được chọn ở mức **Require** hoặc **Non-validating**.
4. Bấm **Test Connection** để đảm bảo kết nối thành công, sau đó bấm **Finish**.

**Bước 2: Tìm bảng `app_users`**
1. Ở cây thư mục bên trái, mở rộng: `postgres` -> `Schemas` -> `public` -> `Tables`.
2. Click đúp chuột vào bảng `app_users`.

**Bước 3: Chỉnh sửa cột Role**
1. Mở tab **Data** để xem toàn bộ dữ liệu các tài khoản đang có.
2. Tìm đến hàng (row) chứa email của người dùng mà bạn muốn nâng cấp.
3. Ở cột `role`, click đúp vào chữ `USER` và sửa thành `ADMIN` (viết hoa toàn bộ).
4. Nhấn phím **Enter**.
5. Nhấn nút **Save** (hoặc biểu tượng đĩa mềm / phím tắt Ctrl+S) để ghi (commit) sự thay đổi này xuống Database.

---

## 3. Các Bước Thực Hiện Bằng Lệnh SQL (Dành cho người thích gõ code)

Nếu bạn dùng công cụ psql terminal hoặc tab SQL Editor của phần mềm quản lý, bạn chỉ cần chạy đoạn mã SQL dưới đây.

**Ví dụ:** Nâng cấp tài khoản `your.email@example.com` thành Admin:

```sql
-- 1. Chạy lệnh UPDATE
UPDATE public.app_users
SET role = 'ADMIN'
WHERE email = 'your.email@example.com';

-- 2. Kiểm tra lại xem đã cập nhật thành công chưa
SELECT email, role FROM public.app_users WHERE email = 'your.email@example.com';
```

---

## 4. Kiểm Tra Lại Trên Website

Sau khi thay đổi trong Database thành công:
1. Quay lại giao diện Website DeepReader (`http://localhost:3000`).
2. Nếu người dùng đó đang đăng nhập, hãy yêu cầu họ **Đăng xuất (Logout)** và **Đăng nhập (Login)** lại. *(Do JWT cũ lưu role `USER` vẫn còn hiệu lực nên cần lấy Token mới).*
3. Sau khi đăng nhập lại, người dùng sẽ thấy nút **🛡️ Admin** xuất hiện trên thanh điều hướng góc phải trên cùng.
