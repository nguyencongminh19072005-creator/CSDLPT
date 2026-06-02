import pyodbc
from config import Config

cfg = Config()

try:
    print("Connecting to NT...")
    conn = pyodbc.connect(cfg.nt_connection_string)
    cursor = conn.cursor()
    print("\n--- lop_hoc_phan (NT) ---")
    cursor.execute("SELECT ma_lop_hp, si_so_toi_da, so_luong_da_dang_ky FROM lop_hoc_phan")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- dang_ky (NT) ---")
    cursor.execute("SELECT ma_sv, ma_lop_hp, trang_thai FROM dang_ky")
    for row in cursor.fetchall():
        print(row)
    conn.close()
except Exception as e:
    print("NT Error:", e)

try:
    print("\nConnecting to CG...")
    conn = pyodbc.connect(cfg.cg_connection_string)
    cursor = conn.cursor()
    print("\n--- lop_hoc_phan (CG) ---")
    cursor.execute("SELECT ma_lop_hp, si_so_toi_da, so_luong_da_dang_ky FROM lop_hoc_phan")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- dang_ky (CG) ---")
    cursor.execute("SELECT ma_sv, ma_lop_hp, trang_thai FROM dang_ky")
    for row in cursor.fetchall():
        print(row)
    conn.close()
except Exception as e:
    print("CG Error:", e)
