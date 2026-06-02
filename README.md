# Hệ thống Quản lý Đào tạo Phân tán (Distributed Training Management System)

Đây là đồ án/bài tập lớn môn **Cơ sở dữ liệu phân tán**. Hệ thống mô phỏng chức năng Quản lý Đào tạo và Đăng ký Học phần được phân tán trên 3 cơ sở (Site) khác nhau, đảm bảo tính trong suốt phân tán, xử lý đồng thời (Concurrency) và tự động dự phòng khi đứt mạng (Fault-tolerance/Fallback).

## 🏢 Kiến trúc hệ thống
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Mô hình Single Page Application - SPA).
- **Backend:** Python (Flask Web Framework).
- **Database:** Microsoft SQL Server.
- **Mô hình Phân tán:** Sử dụng **Transactional Replication** (Nhân bản giao dịch) kết hợp **Linked Server**. Hệ thống áp dụng nguyên lý **Hub-and-Spoke**: 
  - Mọi thao tác **Ghi (Write)** 
  - Mọi thao tác **Đọc (Read)** 
## 🌟 Các tính năng nổi bật
1. **Quản lý Đăng ký Học phần Phân tán:** Sinh viên ở bất kỳ cơ sở nào cũng có thể đăng nhập và đăng ký lớp học.
2. **Kiểm soát Tranh chấp Đồng thời (Pessimistic Locking):** Đảm bảo an toàn dữ liệu 100% khi hàng nghìn sinh viên đăng ký cùng một phần nghìn giây. Không bao giờ xảy ra tình trạng "lố" sĩ số lớp. Tích hợp sẵn bộ test **Mô phỏng Đăng ký Đồng thời** (sử dụng Python `threading.Barrier`) ở giao diện Admin.
3. **Cơ chế Dự phòng (Network Fallback):** Hệ thống có khả năng tự chẩn đoán kết nối. Nếu cáp quang lên máy chủ Trung tâm bị đứt hoặc Server Trung tâm chết, hệ thống sẽ tự động chuyển sang luồng "Đăng ký Cục bộ" (Local Fallback), đảm bảo nghiệp vụ không bị gián đoạn.
4. **Tra cứu Phân tán (Distributed Querying):** Tính năng riêng biệt cho phép truy vấn trực tiếp sang các node khác thông qua Linked Server để xem dữ liệu theo thời gian thực.

---

## 🛠️ Hướng dẫn cài đặt và chạy Hệ thống

### Yêu cầu tiên quyết:
- Đã cài đặt **Python 3.8+**.
- Hệ quản trị **SQL Server** đã cấu hình thành công 3 Database (`QLDT_HADONG`, `QLDT_CauGiay`, `QLDT_NT`), các **Linked Server** (`SITE_HD`, `SITE_CG`, `SITE_NT`) và Replication.
- Đã cài đặt **ODBC Driver 17 for SQL Server** trên máy chạy Code.

### Bước 1: Cài đặt thư viện Python
Mở Terminal/Command Prompt, di chuyển vào thư mục `backend` và chạy lệnh sau để cài đặt các thư viện cần thiết:
```bash
cd backend
pip install flask flask-cors pyodbc
```

### Bước 2: Cấu hình kết nối
Mở file `backend/config.py`. Bạn có thể thay đổi biến `SITE_CODE` để giả lập việc khởi động hệ thống ở các cơ sở khác nhau:
- `SITE_CODE = "HD"`: Chạy máy chủ đóng vai trò là Trung tâm Hà Đông.
- `SITE_CODE = "CG"`: Chạy máy chủ đóng vai trò là Cơ sở Cầu Giấy.
- `SITE_CODE = "NT"`: Chạy máy chủ đóng vai trò là Cơ sở Ngọc Trục.

*(Hãy đảm bảo chuỗi kết nối `connection_string` bên trong file `config.py` khớp với tên Server và mật khẩu SQL của bạn).*

### Bước 3: Khởi động Server
Tại thư mục `backend`, chạy lệnh:
```bash
python app.py
```
Nếu Terminal hiện dòng chữ `* Running on http://127.0.0.1:5000`, hệ thống đã sẵn sàng!

### Bước 4: Trải nghiệm Hệ thống
Mở trình duyệt Web (Chrome, Edge...) và truy cập vào địa chỉ:
👉 **http://127.0.0.1:5000**

---

## 👤 Tài khoản Demo có sẵn
Tùy vào dữ liệu bạn đã Insert, bạn có thể thử các kịch bản sau:

1. **Sinh viên:** `SV0001`, `SV0016`, `SV0032` (Mật khẩu nhập bất kỳ để mô phỏng)
2. **Giảng viên:** `GV001`, `GV002` (Mật khẩu nhập bất kỳ)
3. **Admin (Quản trị viên):** 
   - Tài khoản: `admin`
   - Mật khẩu: `admin123`

---

## 🔍 Hướng dẫn Test các Kịch bản Khó (Dành cho báo cáo)

### Kịch bản 1: Test Tranh chấp đồng thời (Concurrency)
1. Đăng nhập bằng tài khoản `admin`.
2. Vào Menu **Demo Đồng Thời**.
3. Bấm nút **"Làm sạch và Reset về 1/2 chỗ"** (để mô phỏng lớp chỉ còn đúng 1 slot).
4. Bấm **"Mô phỏng Đăng ký đồng thời"**. Hệ thống sẽ bắn 3 luồng (Thread) tuyệt đối cùng 1 Nano-giây. Bạn sẽ thấy chỉ có duy nhất 1 sinh viên thành công, 2 sinh viên còn lại báo lỗi lố sĩ số từ SQL Server.

### Kịch bản 2: Test Mất mạng (Fallback)
1. Stop (Take Offline) Database `QLDT_HADONG` trong SQL Server, hoặc sửa tên Linked Server `LINK_TRUNGTAM` thành tên sai để giả lập đứt mạng.
2. Sửa `SITE_CODE = "CG"` trong file `config.py` và chạy lại `python app.py`.
3. Dùng tài khoản `SV0001` để đăng ký học phần. 
4. Hệ thống sẽ báo mất kết nối Trung tâm, văng lỗi Timeout, sau đó lập tức hiện Thông báo xanh lá: `[KẾT NỐI DỰ PHÒNG] Đăng ký thành công`.

---
*Developed for Database Distributed Course.*
