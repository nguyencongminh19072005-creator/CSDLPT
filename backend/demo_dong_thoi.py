import threading
import pyodbc
import time
conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=LAPTOP-0VG691O2\\CSDLPTBTL;Database=QLDT_HADONG;UID=sa;PWD=ComplexPass123!;TrustServerCertificate=yes;"
def dang_ky_thi_nghiem(ma_sv, ma_lop_hp):
    try:
        conn = pyodbc.connect(conn_str, autocommit=False)
        cursor = conn.cursor()
        print(f"[{ma_sv}] 🏃‍♂️ Đang gửi yêu cầu giành giật chỗ...")
        cursor.execute("EXEC sp_DangKyHocPhan_TrungTam @ma_sv=?, @ma_lop_hp=?", (ma_sv, ma_lop_hp))
        conn.commit()
        print(f"✅ [{ma_sv}] THÀNH CÔNG: Đã cướp được slot!")
    except Exception as e:
        conn.rollback()
        err_msg = str(e.args[1]) if len(e.args) > 1 else str(e)
        print(f"❌ [{ma_sv}] THẤT BẠI: {err_msg.split(']')[[-1]].strip()}")
    finally:
        conn.close()
if __name__ == "__main__":

    lop_hot = "LHP030"                                 
    sinh_vien_list = ["SV0001", "SV0002", "SV0003"]
    threads = []
    for sv in sinh_vien_list:
        t = threading.Thread(target=dang_ky_thi_nghiem, args=(sv, lop_hot))
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
