import os
import socket
import pyodbc
from config import Config

cfg = Config()

# Lấy SITE_CODE từ .env (Cho phép ghi đè để test)
env_site = os.getenv("SITE_CODE", "").strip().upper()

# TỰ ĐỘNG NHẬN DIỆN MÁY TÍNH
hostname = socket.gethostname().upper()

if env_site in ["HD", "CG", "NT"]:
    SITE_CODE = env_site            # Ưu tiên lấy từ .env nếu bạn cố tình set để test
elif "0G48U7E" in hostname:         
    SITE_CODE = "CG"                # Tự nhận diện Cầu Giấy
elif "ADMIN-PC" in hostname:        
    SITE_CODE = "NT"                # Tự nhận diện Ngọc Trục
else:                               
    SITE_CODE = "HD"                # Mặc định Hà Đông

# Connection pool — singleton
_conn = None
_conn_busy = False

def get_connection():
    global _conn, _conn_busy
    try:
        if _conn is not None:
            _conn.ping()
            return _conn
    except Exception:
        pass
        
    # Tự động chọn chuỗi kết nối dựa vào SITE_CODE
    if SITE_CODE == "CG":
        conn_str = cfg.cg_connection_string
    elif SITE_CODE == "NT":
        conn_str = cfg.nt_connection_string
    else:
        conn_str = cfg.hd_connection_string

    _conn = pyodbc.connect(conn_str, charset="utf8", autocommit=False)
    return _conn

def execute_query(query, params=None, fetch=True):
    conn = get_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        if fetch:
            rows = cursor.fetchall()
            cols = [c[0] for c in cursor.description] if cursor.description else []
            return [dict(zip(cols, r)) for r in rows]
        else:
            conn.commit()
            return cursor.rowcount
    except pyodbc.Error as ex:
        conn.rollback()
        raise ex
    finally:
        if cursor:
            cursor.close()


def execute_procedure(proc_name, params=None):
    conn = get_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        placeholders = ",".join(["?" for _ in (params or [])])
        sql = f"EXEC {proc_name} {placeholders}" if params else f"EXEC {proc_name}"
        cursor.execute(sql, params or ())
        conn.commit()
        return {"success": True, "message": "Thành công"}
    except pyodbc.Error as ex:
        conn.rollback()
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        return {"success": False, "message": msg}
    finally:
        if cursor:
            cursor.close()


# Alias for backward compat
get_hd_connection = get_connection

