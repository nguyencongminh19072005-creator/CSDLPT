# Hệ thống Đăng ký Học phần — CSDL Phân tán

## Mô hình hệ thống

```
Trung tâm Hà Đông (LAPTOP-0VG691O2\CSDLPTBTL)
├── Site Cầu Giấy  (DESKTOP-0G48U7E\CSDLPT)  --Linked Server--> Trung tâm
└── Site Ngọc Trục (ADMIN-PC\CSDLPTNHOM10)    --Linked Server--> Trung tâm
```

- **Site Trung tâm**: Xử lý đăng ký chính, gọi `sp_DangKyHocPhan_TrungTam`
- **Site con**: Gọi wrapper `sp_DangKyHocPhan` qua Linked Server
- **Ưu tiên**: Consistency > Availability (trung tâm chết → không đăng ký được)

## Cấu trúc thư mục

```
CSDLPTBTL_v2/
├── backend/
│   ├── app.py              # Flask app — tất cả API routes
│   ├── config.py           # Cấu hình SQL Server
│   ├── .env                # Biến môi trường
│   ├── requirements.txt    # Thư viện Python
│   ├── services/
│   │   ├── database.py     # Kết nối pyodbc + execute_procedure
│   │   └── auth.py         # Xác thực
│   └── migrations/
│       └── init_db.sql     # Schema + Seed + Stored Procedures
├── static/
│   ├── style.css
│   └── app.js              # Frontend JS
├── templates/
│   ├── login.html
│   ├── index.html
│   ├── dangky.html
│   ├── huydangky.html
│   ├── ketqua.html
│   ├── quanly.html
│   ├── thongke.html
│   ├── nhatky.html
│   └── lich.html
└── README.md
```

## Cách chạy

### 1. Cài đặt thư viện

```bash
cd D:/CSDLPTBTL_v2/backend
pip install -r requirements.txt
```

### 2. Chạy schema SQL

Chạy file `migrations/init_db.sql` trên SQL Server:

```sql
-- Trên QLDT_HADONG (Trung tâm)
USE QLDT_HADONG;
GO
-- (paste nội dung init_db.sql, phần QLDT_CAUGIAY chạy riêng)
```

```sql
-- Trên QLDT_CAUGIAY (Site Cầu Giấy)
USE QLDT_CAUGIAY;
GO
-- (chạy phần CREATE PROCEDURE sp_DangKyHocPhan trong init_db.sql)
```

### 3. Cấu hình Linked Server (trên site Cầu Giấy)

```sql
-- Tạo Linked Server trỏ về Trung tâm Hà Đông
EXEC sp_serveroption @server=N'LINK_TRUNGTAM', @optname=N'rpc out', @optvalue=N'true';
EXEC sp_serveroption @server=N'LINK_TRUNGTAM', @optname=N'data access', @optvalue=N'true';
```

### 4. Chạy Backend

```bash
cd D:/CSDLPTBTL_v2/backend
python app.py
```

Mở trình duyệt: **http://localhost:5000**

## Tài khoản demo

| Username | Password   | Vai trò       |
|----------|------------|---------------|
| admin    | admin123   | Quản trị viên |
| SV001    | sv001      | Sinh viên     |
| GV001    | gv001      | Giảng viên    |

## API chính

| Method | Endpoint                      | Mô tả                      |
|--------|-------------------------------|----------------------------|
| POST   | `/api/login`                  | Đăng nhập                  |
| POST   | `/api/dang-ky`                | Đăng ký học phần (gọi SP)  |
| POST   | `/api/huy-dang-ky`            | Hủy đăng ký (gọi SP)       |
| GET    | `/api/ket-qua-dang-ky/{ma_sv}`| Kết quả đăng ký           |
| GET    | `/api/thoi-khoa-bieu/{ma_sv}` | Th�i khóa biểu SV          |
| GET    | `/api/lich-day/{ma_gv}`       | Lịch dạy GV                |
| GET    | `/api/lop-hoc-phan`           | Danh sách lớp HP           |
| GET    | `/api/thong-ke/co-so`         | Thống kê theo cơ sở        |
| GET    | `/api/thong-ke/toan-truong`   | Thống kê toàn trường       |
| GET    | `/api/nhat-ky`                | Nhật ký thao tác           |
| GET    | `/api/tru-van-phan-tan`       | Demo truy vấn Linked Server |
| GET    | `/api/co-so`                  | Danh sách cơ sở            |
| GET    | `/api/khoa`                   | Danh sách khoa             |
| GET    | `/api/sinh-vien`              | Danh sách sinh viên        |
| GET    | `/api/giang-vien`             | Danh sách giảng viên       |
| GET    | `/api/hoc-phan`               | Danh sách học phần         |
| GET    | `/api/phong-hoc`              | Danh sách phòng học        |
| GET    | `/api/lich-hoc`               | Danh sách lịch học         |

## Xử lý lỗi từ Stored Procedure

| Lỗi                     | Code trả về         |
|-------------------------|---------------------|
| Lớp đã đủ sĩ số         | `FULL_CAPACITY`     |
| Sinh viên đã đăng ký    | `ALREADY_REGISTERED` |
| Trùng lịch học          | `SCHEDULE_CONFLICT`  |
| Trung tâm không khả dụng| `CENTER_DOWN`        |
| Lớp không tồn tại        | `NOT_EXIST`          |
| SV không tồn tại        | `NOT_EXIST`          |

## Test tranh chấp dữ liệu (Deadlock)

Vào trang **Đăng ký HP** → mục **Test tranh chấp dữ liệu**:

1. Chọn lớp còn ít chỗ trống
2. Nhập số sinh viên test (VD: 5)
3. Click **Chạy Test**

→ Hệ thống gửi N request đồng thời. Kết quả: chỉ N sinh viên đầu tiên đăng ký thành công, phần còn lại bị từ chối vì đủ sĩ số. `so_luong_da_dang_ky` không vượt quá `si_so_toi_da`.

## Gọi từ site Cầu Giấy (wrapper)

Khi chạy backend ở site Cầu Giấy, đổi endpoint:

```python
# Thay vì:
result = execute_procedure("sp_DangKyHocPhan_TrungTam", (ma_sv, ma_lop_hp))

# Gọi wrapper (kiểm tra LINK_TRUNGTAM trước):
result = execute_procedure("sp_DangKyHocPhan", (ma_sv, ma_lop_hp))
```

## Phân quyền giao diện

- **Admin**: Tất cả chức năng (quản lý, thống kê, nhật ký, truy vấn phân tán)
- **Sinh viên**: Đăng ký, hủy, xem kết quả, thời khóa biểu
- **Giảng viên**: Xem lịch dạy, thống kê
