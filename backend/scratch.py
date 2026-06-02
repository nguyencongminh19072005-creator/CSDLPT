import re

with open(r'd:\CSDLPTBTL_v2\backend\app.py', 'r', encoding='utf-8') as f:
    text = f.read()

new_endpoint = '''
@app.route("/api/dang-ky-demo-barrier", methods=["POST"])
def api_dang_ky_demo_barrier():
    import threading
    import pyodbc
    from config import Config
    
    data = request.get_json()
    ma_sv_list = data.get("ma_sv_list", [])
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    
    if not ma_sv_list or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400

    cfg = Config()
    sp_name = "sp_DangKyHocPhan_TrungTam" if SITE_CODE == "HD" else "sp_dang_ky_hoc_phan"
    conn_str = cfg.cg_connection_string if SITE_CODE == "CG" else (cfg.nt_connection_string if SITE_CODE == "NT" else cfg.hd_connection_string)
    
    results = {}
    barrier = threading.Barrier(len(ma_sv_list))
    lock = threading.Lock()
    
    def worker(sv):
        # Mở kết nối riêng cho từng Thread trước khi chờ ở Barrier
        # Điều này loại trừ hoàn toàn độ trễ mở kết nối mạng
        conn = None
        try:
            conn = pyodbc.connect(conn_str, autocommit=False)
            cursor = conn.cursor()
            
            # Tất cả các Thread sẽ dừng ở đây và đợi nhau.
            # Khi đủ số lượng, Barrier sẽ vỡ và tất cả cùng lao vào dòng lệnh execute ĐỒNG THỜI (độ lệch nano giây)!
            barrier.wait() 
            
            cursor.execute(f"EXEC {sp_name} @ma_sv=?, @ma_lop_hp=?", (sv, ma_lop_hp))
            conn.commit()
            
            with lock:
                results[sv] = {"success": True, "message": "Đăng ký thành công"}
                
        except Exception as ex:
            if conn: conn.rollback()
            msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
            
            # Xử lý fallback cục bộ nếu đứt cáp
            if SITE_CODE != "HD" and ("timeout" in msg.lower() or "linked server" in msg.lower() or "network" in msg.lower() or "rpc" in msg.lower() or "provider" in msg.lower()):
                sp_local = "sp_DangKyHocPhan_Local_CG" if SITE_CODE == "CG" else "sp_DangKyHocPhan_Local_NT"
                try:
                    cursor.execute(f"EXEC {sp_local} @ma_sv=?, @ma_lop_hp=?", (sv, ma_lop_hp))
                    conn.commit()
                    with lock:
                        results[sv] = {"success": True, "message": "[KẾT NỐI DỰ PHÒNG] Đăng ký thành công"}
                except pyodbc.Error as ex_local:
                    if conn: conn.rollback()
                    msg_local = "[KẾT NỐI DỰ PHÒNG] " + (str(ex_local.args[1]) if len(ex_local.args) > 1 else str(ex_local))
                    with lock:
                        results[sv] = {"success": False, "message": msg_local}
            else:
                with lock:
                    results[sv] = {"success": False, "message": msg}
        finally:
            if conn:
                conn.close()

    threads = []
    for sv in ma_sv_list:
        t = threading.Thread(target=worker, args=(sv,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    return jsonify({"success": True, "results": results}), 200

'''

if '@app.route("/api/dang-ky-demo", methods=["POST"])' in text:
    text = text.replace(
        '@app.route("/api/dang-ky-demo", methods=["POST"])',
        new_endpoint + '\n@app.route("/api/dang-ky-demo", methods=["POST"])'
    )
    with open(r'd:\CSDLPTBTL_v2\backend\app.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Successfully added endpoint')
else:
    print('Could not find the target string')
