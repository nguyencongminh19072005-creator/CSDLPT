from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from services.database import execute_query, execute_procedure, get_connection, SITE_CODE
from services.auth import authenticate
import pyodbc
app = Flask(__name__, template_folder="../templates", static_folder="../static")
app.secret_key = "csdldpt_secret_key_2025"
CORS(app)
@app.route("/")
@app.route("/trang-chu")
@app.route("/dang-ky")
@app.route("/huy-dang-ky")
@app.route("/ket-qua")
@app.route("/quan-ly")
@app.route("/thong-ke")
@app.route("/nhat-ky")
@app.route("/lich")
@app.route("/phan-tan")
def spa_page():
    return render_template("index.html")
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if not username:
        return jsonify({"success": False, "message": "Vui lòng nhập tên đăng nhập."})
    user = authenticate(username, password)
    if not user:
        return jsonify({"success": False, "message": "Tên đăng nhập không đúng."})
    session["user"] = {
        "username": username,
        "role": user["role"],
        "ten": user.get("ten", username),
        "ma_sv": user.get("ma_sv"),
        "ma_gv": user.get("ma_gv"),
    }
    return jsonify({"success": True, "role": user["role"], "ten": user.get("ten", username)})
@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})
@app.route("/api/me")
def api_me():
    user = session.get("user")
    if not user:
        return jsonify({"authenticated": False})
    return jsonify({"authenticated": True, "user": user})
@app.route("/api/co-so", methods=["GET"])
def get_co_so():
    try:
        return jsonify(execute_query("SELECT ma_co_so, ten_co_so, dia_chi FROM co_so ORDER BY ma_co_so"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/khoa", methods=["GET"])
def get_khoa():
    try:
        return jsonify(execute_query("SELECT ma_khoa, ten_khoa FROM khoa ORDER BY ma_khoa"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/sinh-vien", methods=["GET"])
def get_sinh_vien():
    try:
        return jsonify(execute_query("""
            SELECT sv.ma_sv, sv.ho_ten, sv.ngay_sinh, sv.gioi_tinh,
                   sv.ma_khoa, k.ten_khoa, sv.ma_co_so, cs.ten_co_so,
                   CASE WHEN sv.da_xoa=1 THEN N'Đã xóa' ELSE N'Hoạt động' END AS trang_thai
            FROM sinh_vien sv
            LEFT JOIN khoa k ON sv.ma_khoa = k.ma_khoa
            LEFT JOIN co_so cs ON sv.ma_co_so = cs.ma_co_so
            ORDER BY sv.ma_sv
        """))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/giang-vien", methods=["GET"])
def get_giang_vien():
    try:
        return jsonify(execute_query("""
            SELECT gv.ma_gv, gv.ho_ten, gv.hoc_vi, gv.ma_khoa, k.ten_khoa,
                   gv.ma_co_so, cs.ten_co_so,
                   CASE WHEN gv.da_xoa=1 THEN N'Đã xóa' ELSE N'Hoạt động' END AS trang_thai
            FROM giang_vien gv
            LEFT JOIN khoa k ON gv.ma_khoa = k.ma_khoa
            LEFT JOIN co_so cs ON gv.ma_co_so = cs.ma_co_so
            ORDER BY gv.ma_gv
        """))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/hoc-phan", methods=["GET"])
def get_hoc_phan():
    try:
        return jsonify(execute_query("""
            SELECT hp.ma_hp, hp.ten_hp, hp.so_tin_chi, hp.ma_khoa, k.ten_khoa
            FROM hoc_phan hp
            LEFT JOIN khoa k ON hp.ma_khoa = k.ma_khoa
            ORDER BY hp.ma_hp
        """))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/lop-hoc-phan", methods=["GET"])
def get_lop_hoc_phan():
    ma_co_so = request.args.get("ma_co_so")
    ma_khoa = request.args.get("ma_khoa")
    try:
        query_local = """
            SELECT lhp.ma_lop_hp, lhp.ma_hp, hp.ten_hp AS ten_hoc_phan,
                   lhp.ma_gv, gv.ho_ten AS ten_giang_vien,
                   lhp.ma_phong, ph.ten_phong,
                   lhp.ma_co_so, cs.ten_co_so,
                   lhp.hoc_ky, lhp.nam_hoc,
                   lhp.si_so_toi_da, lhp.so_luong_da_dang_ky,
                   (lhp.si_so_toi_da - lhp.so_luong_da_dang_ky) AS con_trong,
                   hp.ma_khoa
            FROM lop_hoc_phan lhp
            LEFT JOIN hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            LEFT JOIN giang_vien gv ON lhp.ma_gv = gv.ma_gv
            LEFT JOIN phong_hoc ph ON lhp.ma_phong = ph.ma_phong
            LEFT JOIN co_so cs ON lhp.ma_co_so = cs.ma_co_so
        """
        query_remote = """
            SELECT lhp.ma_lop_hp, lhp.ma_hp, hp.ten_hp AS ten_hoc_phan,
                   lhp.ma_gv, gv.ho_ten AS ten_giang_vien,
                   lhp.ma_phong, ph.ten_phong,
                   lhp.ma_co_so, cs.ten_co_so,
                   lhp.hoc_ky, lhp.nam_hoc,
                   lhp.si_so_toi_da, lhp.so_luong_da_dang_ky,
                   (lhp.si_so_toi_da - lhp.so_luong_da_dang_ky) AS con_trong,
                   hp.ma_khoa
            FROM [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lop_hoc_phan lhp
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].giang_vien gv ON lhp.ma_gv = gv.ma_gv
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].phong_hoc ph ON lhp.ma_phong = ph.ma_phong
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].co_so cs ON lhp.ma_co_so = cs.ma_co_so
        """
        conditions = []
        params = []
        if ma_co_so:
            conditions.append("lhp.ma_co_so = ?")
            params.append(ma_co_so)
        if ma_khoa:
            conditions.append("hp.ma_khoa = ?")
            params.append(ma_khoa)
        where_clause = ""
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
        lop_hp = None
        lich = None
        if SITE_CODE != "HD":
            try:
                lop_hp = execute_query(query_remote + where_clause + " ORDER BY hp.ten_hp ASC, lhp.ma_lop_hp ASC", params if params else None)
                lich = execute_query("""
                    SELECT lh.ma_lop_hp, lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
                           lh.ma_phong, ph.ten_phong
                    FROM [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lich_hoc lh
                    LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].phong_hoc ph ON lh.ma_phong = ph.ma_phong
                """)
            except Exception as e:
                print("Lỗi Linked Server, Fallback về Local:", e)
                lop_hp = None           
        if lop_hp is None:
            lop_hp = execute_query(query_local + where_clause + " ORDER BY hp.ten_hp ASC, lhp.ma_lop_hp ASC", params if params else None)
            lich = execute_query("""
                SELECT lh.ma_lop_hp, lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
                       lh.ma_phong, ph.ten_phong
                FROM lich_hoc lh
                LEFT JOIN phong_hoc ph ON lh.ma_phong = ph.ma_phong
            """)
        lich_map = {}
        for l in lich:
            key = l["ma_lop_hp"]
            if key not in lich_map:
                lich_map[key] = []
            lich_map[key].append(l)
        thu_names = {1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN"}
        for r in lop_hp:
            r["lich_hoc"] = []
            for l in lich_map.get(r["ma_lop_hp"], []):
                r["lich_hoc"].append({
                    "thu": thu_names.get(l["thu"], str(l["thu"])),
                    "tiet": f"{l['tiet_bat_dau']}-{l['tiet_ket_thuc']}",
                    "phong": l["ten_phong"] or l["ma_phong"] or "",
                })
        return jsonify(lop_hp)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/sinh-vien/<ma_sv>/khoa", methods=["GET"])
def get_sinh_vien_khoa(ma_sv):
    try:
        rows = execute_query("""
            SELECT sv.ma_sv, sv.ho_ten, sv.ma_khoa, k.ten_khoa, sv.ma_co_so, cs.ten_co_so
            FROM sinh_vien sv
            LEFT JOIN khoa k ON sv.ma_khoa = k.ma_khoa
            LEFT JOIN co_so cs ON sv.ma_co_so = cs.ma_co_so
            WHERE sv.ma_sv = ?
        """, (ma_sv,))
        if not rows:
            return jsonify({"error": "Không tìm thấy sinh viên"}), 404
        return jsonify(rows[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/phong-hoc", methods=["GET"])
def get_phong_hoc():
    try:
        return jsonify(execute_query("""
            SELECT ph.ma_phong, ph.ten_phong, ph.suc_chua, ph.ma_co_so, cs.ten_co_so
            FROM phong_hoc ph
            LEFT JOIN co_so cs ON ph.ma_co_so = cs.ma_co_so
            ORDER BY ph.ma_phong
        """))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/lich-hoc", methods=["GET"])
def get_lich_hoc():
    try:
        return jsonify(execute_query("""
            SELECT lh.ma_lich, lh.ma_lop_hp, lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
                   lh.ma_phong, ph.ten_phong, lh.ma_co_so
            FROM lich_hoc lh
            LEFT JOIN phong_hoc ph ON lh.ma_phong = ph.ma_phong
            ORDER BY lh.thu, lh.tiet_bat_dau
        """))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/dang-ky", methods=["POST"])
def api_dang_ky():
    data = request.get_json()
    ma_sv = data.get("ma_sv", "").strip()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    if not ma_sv or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu mã SV hoặc mã LHP."}), 400
    if SITE_CODE == "HD":
        result = execute_procedure("sp_DangKyHocPhan_TrungTam", (ma_sv, ma_lop_hp))
    else:
        # Cố gắng đăng ký qua Trung tâm trước (Nhất quán)
        result = execute_procedure("sp_dang_ky_hoc_phan", (ma_sv, ma_lop_hp))
        
        # Nếu báo lỗi đứt cáp, timeout hoặc Linked Server chết
        err_msg = result.get("message", "").lower()
        if not result["success"] and ("timeout" in err_msg or "linked server" in err_msg or "provider" in err_msg or "network" in err_msg or "rpc" in err_msg):
            # Fallback: Kích hoạt thủ tục Đăng ký cục bộ (Khả dụng)
            sp_local = "sp_DangKyHocPhan_Local_CG" if SITE_CODE == "CG" else "sp_DangKyHocPhan_Local_NT"
            result = execute_procedure(sp_local, (ma_sv, ma_lop_hp))
            result["message"] = result.get("message", "")
    if result["success"]:
        _log(ma_sv, "DANG_KY", f"SV {ma_sv} đăng ký {ma_lop_hp} THÀNH CÔNG")
    else:
        _log(ma_sv, "DANG_KY_THAT_BAI", f"SV {ma_sv} đăng ký {ma_lop_hp} THẤT BẠI: {result['message']}")
    return jsonify(result), 200 if result["success"] else 400

@app.route("/api/dang-ky-demo-barrier", methods=["POST"])
def api_dang_ky_demo_barrier():
    import threading
    import urllib.request
    import urllib.error
    import json
    
    data = request.get_json()
    ma_sv_list = data.get("ma_sv_list", [])
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    
    if not ma_sv_list or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400

    results = {}
    barrier = threading.Barrier(len(ma_sv_list))
    lock = threading.Lock()
    
    # Lấy chính xác địa chỉ URL hiện tại của Server (VD: http://127.0.0.1:5000/api/dang-ky)
    api_url = request.host_url + "api/dang-ky"

    def worker(sv):
        # 1. Các Thread khởi tạo xong sẽ bị chặn lại ở đây
        barrier.wait() 
        
        # 2. Barrier vỡ -> Tất cả đồng loạt gọi API Đăng Ký bằng urllib
        try:
            req = urllib.request.Request(api_url, method="POST")
            req.add_header('Content-Type', 'application/json')
            payload = json.dumps({"ma_sv": sv, "ma_lop_hp": ma_lop_hp}).encode('utf-8')
            
            with urllib.request.urlopen(req, data=payload) as response:
                res_data = json.loads(response.read().decode())
                with lock:
                    results[sv] = res_data
                    
        except urllib.error.HTTPError as e:
            # Bắt lỗi HTTP 400 để đọc câu thông báo JSON (VD: Hết chỗ, Trùng lịch...)
            try:
                error_data = json.loads(e.read().decode())
                with lock:
                    results[sv] = error_data
            except:
                with lock:
                    results[sv] = {"success": False, "message": f"HTTP Error {e.code}"}
        except Exception as e:
            with lock:
                results[sv] = {"success": False, "message": str(e)}

    # Tạo và khởi động các luồng
    threads = []
    for sv in ma_sv_list:
        t = threading.Thread(target=worker, args=(sv,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    return jsonify({"success": True, "results": results}), 200


@app.route("/api/dang-ky-demo", methods=["POST"])
def api_dang_ky_demo():
    data = request.get_json()
    ma_sv = data.get("ma_sv", "").strip()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    
    if not ma_sv or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400

    import pyodbc
    from config import Config
    cfg = Config()

    # 1. Mặc định thử đâm lên Trung Tâm trước để đảm bảo Tính Nhất Quán (Consistency)
    sp_name = "sp_DangKyHocPhan_TrungTam" if SITE_CODE == "HD" else "sp_dang_ky_hoc_phan"
    conn_str = cfg.cg_connection_string if SITE_CODE == "CG" else (cfg.nt_connection_string if SITE_CODE == "NT" else cfg.hd_connection_string)

    conn = None
    try:
        # Quan trọng: Set autocommit=False để tự điều khiển cơ chế Khóa (Lock)
        conn = pyodbc.connect(conn_str, autocommit=False)
        cursor = conn.cursor()

        # Bắn lệnh đăng ký vào SQL Server
        cursor.execute(f"EXEC {sp_name} @ma_sv=?, @ma_lop_hp=?", (ma_sv, ma_lop_hp))
        conn.commit()

        _log(ma_sv, "DANG_KY_DEMO", f"SV {ma_sv} cướp slot {ma_lop_hp} THÀNH CÔNG")
        return jsonify({"success": True, "message": "Đăng ký thành công"}), 200

    except pyodbc.Error as ex:
        if conn: conn.rollback()
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)

        # 2. CƠ CHẾ DỰ PHÒNG (FAULT TOLERANCE): Nếu đứt cáp/timeout Linked Server lên Trung tâm
        if SITE_CODE != "HD" and ("timeout" in msg.lower() or "linked server" in msg.lower() or "network" in msg.lower() or "provider" in msg.lower() or "rpc" in msg.lower()):
            # Khởi động Kế hoạch B: Chạy Stored Procedure cục bộ của cơ sở đó
            sp_local = "sp_DangKyHocPhan_Local_CG" if SITE_CODE == "CG" else "sp_DangKyHocPhan_Local_NT"
            try:
                cursor.execute(f"EXEC {sp_local} @ma_sv=?, @ma_lop_hp=?", (ma_sv, ma_lop_hp))
                conn.commit()
                _log(ma_sv, "DANG_KY_DEMO", f"SV {ma_sv} cướp slot {ma_lop_hp} THÀNH CÔNG (DỰ PHÒNG)")
                return jsonify({"success": True, "message": "[KẾT NỐI DỰ PHÒNG] Đăng ký thành công"}), 200
            except pyodbc.Error as ex_local:
                if conn: conn.rollback()
                msg = "[KẾT NỐI DỰ PHÒNG] " + (str(ex_local.args[1]) if len(ex_local.args) > 1 else str(ex_local))

        # 3. Trả về thông báo lỗi (Hết slot, Trùng lịch,...)
        _log(ma_sv, "DANG_KY_DEMO", f"SV {ma_sv} cướp slot {ma_lop_hp} THẤT BẠI: {msg}")
        return jsonify({"success": False, "message": msg}), 400
    finally:
        if conn: conn.close()
@app.route("/api/reset-demo", methods=["POST"])
def api_reset_demo():
    data = request.get_json()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    sv1 = data.get("sv1", "").strip()
    sv2 = data.get("sv2", "").strip()
    sv3 = data.get("sv3", "").strip()
    if not ma_lop_hp or not sv1 or not sv2 or not sv3:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            DELETE FROM dbo.dang_ky 
            WHERE ma_lop_hp = ? AND ma_sv IN (?, ?, ?)
        """, (ma_lop_hp, sv1, sv2, sv3))
        cursor.execute("""
            UPDATE dbo.lop_hoc_phan 
            SET si_so_toi_da = 2, so_luong_da_dang_ky = 1 
            WHERE ma_lop_hp = ?
        """, (ma_lop_hp,))
        conn.commit()
        return jsonify({"success": True, "message": "Đã reset lớp thành công!"}), 200
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 400
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
@app.route("/api/huy-dang-ky", methods=["POST"])
def api_huy_dang_ky():
    data = request.get_json()
    ma_sv = data.get("ma_sv", "").strip()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    if not ma_sv or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400
    try:
        conn = get_connection()
        cursor = conn.cursor()
        sp_name = "sp_HuyDangKyHocPhan_TrungTam" if SITE_CODE == "HD" else "sp_HuyDangKyHocPhan"
        cursor.execute(f"EXEC {sp_name} @ma_sv=?, @ma_lop_hp=?", (ma_sv, ma_lop_hp))
        msg = "Hủy thành công."
        try:
            row = cursor.fetchone()
            if row and row[0]:
                msg = str(row[0])
        except pyodbc.ProgrammingError:
            pass
        conn.commit()
        _log(ma_sv, "HUY_DANG_KY", f"SV {ma_sv} hủy {ma_lop_hp}")
        return jsonify({"success": True, "message": msg})
    except pyodbc.Error as ex:
        if 'conn' in locals() and conn:
            conn.rollback()
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        
        # Xử lý fallback cục bộ nếu đứt cáp hoặc timeout
        if SITE_CODE != "HD" and ("timeout" in msg.lower() or "linked server" in msg.lower() or "network" in msg.lower() or "rpc" in msg.lower() or "provider" in msg.lower()):
            sp_local = "sp_HuyDangKyHocPhan_Local_CG" if SITE_CODE == "CG" else "sp_HuyDangKyHocPhan_Local_NT"
            try:
                cursor.execute(f"EXEC {sp_local} @ma_sv=?, @ma_lop_hp=?", (ma_sv, ma_lop_hp))
                conn.commit()
                _log(ma_sv, "HUY_DANG_KY", f"SV {ma_sv} hủy {ma_lop_hp} (DỰ PHÒNG)")
                return jsonify({"success": True, "message": "Hủy thành công."}), 200
            except pyodbc.Error as ex_local:
                if 'conn' in locals() and conn:
                    conn.rollback()
                msg_local = str(ex_local.args[1]) if len(ex_local.args) > 1 else str(ex_local)
                return jsonify({"success": False, "message": msg_local}), 400
                
        return jsonify({"success": False, "message": msg}), 400
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
@app.route("/api/ket-qua-dang-ky/<ma_sv>", methods=["GET"])
def get_ket_qua(ma_sv):
    query_local = """
        SELECT dk.ma_sv, sv.ho_ten, dk.ma_lop_hp, hp.ten_hp,
               lhp.hoc_ky, lhp.nam_hoc, cs.ten_co_so,
               dk.thoi_gian_dang_ky, dk.trang_thai
        FROM dang_ky dk
        JOIN sinh_vien sv ON dk.ma_sv = sv.ma_sv
        JOIN lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
        JOIN hoc_phan hp ON lhp.ma_hp = hp.ma_hp
        JOIN co_so cs ON lhp.ma_co_so = cs.ma_co_so
        WHERE dk.ma_sv = ? AND dk.trang_thai = N'THANH_CONG'
        ORDER BY dk.thoi_gian_dang_ky DESC
    """
    query_remote = """
        SELECT dk.ma_sv, sv.ho_ten, dk.ma_lop_hp, hp.ten_hp,
               lhp.hoc_ky, lhp.nam_hoc, cs.ten_co_so,
               dk.thoi_gian_dang_ky, dk.trang_thai
        FROM [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].dang_ky dk
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].sinh_vien sv ON dk.ma_sv = sv.ma_sv
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].hoc_phan hp ON lhp.ma_hp = hp.ma_hp
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].co_so cs ON lhp.ma_co_so = cs.ma_co_so
        WHERE dk.ma_sv = ? AND dk.trang_thai = N'THANH_CONG'
        ORDER BY dk.thoi_gian_dang_ky DESC
    """
    try:
        if SITE_CODE == "HD":
            return jsonify(execute_query(query_local, (ma_sv,)))
        else:
            try:
                return jsonify(execute_query(query_remote, (ma_sv,)))
            except Exception as e:
                print("Lỗi Linked Server khi lấy kết quả ĐK, Fallback về Local:", e)
                return jsonify(execute_query(query_local, (ma_sv,)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/thoi-khoa-bieu/<ma_sv>", methods=["GET"])
def get_tkb(ma_sv):
    query_local = """
        SELECT DISTINCT lhp.ma_lop_hp, hp.ten_hp, lh.thu,
               lh.tiet_bat_dau, lh.tiet_ket_thuc, ph.ten_phong, gv.ho_ten AS giang_vien
        FROM dang_ky dk
        JOIN lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
        JOIN hoc_phan hp ON lhp.ma_hp = hp.ma_hp
        JOIN lich_hoc lh ON lhp.ma_lop_hp = lh.ma_lop_hp
        LEFT JOIN phong_hoc ph ON lh.ma_phong = ph.ma_phong
        LEFT JOIN giang_vien gv ON lhp.ma_gv = gv.ma_gv
        WHERE dk.ma_sv = ? AND dk.trang_thai = N'THANH_CONG'
        ORDER BY lh.thu, lh.tiet_bat_dau
    """
    query_remote = """
        SELECT DISTINCT lhp.ma_lop_hp, hp.ten_hp, lh.thu,
               lh.tiet_bat_dau, lh.tiet_ket_thuc, ph.ten_phong, gv.ho_ten AS giang_vien
        FROM [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].dang_ky dk
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].hoc_phan hp ON lhp.ma_hp = hp.ma_hp
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lich_hoc lh ON lhp.ma_lop_hp = lh.ma_lop_hp
        LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].phong_hoc ph ON lh.ma_phong = ph.ma_phong
        LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].giang_vien gv ON lhp.ma_gv = gv.ma_gv
        WHERE dk.ma_sv = ? AND dk.trang_thai = N'THANH_CONG'
        ORDER BY lh.thu, lh.tiet_bat_dau
    """
    try:
        if SITE_CODE == "HD":
            return jsonify(execute_query(query_local, (ma_sv,)))
        else:
            try:
                return jsonify(execute_query(query_remote, (ma_sv,)))
            except Exception as e:
                print("Lỗi Linked Server khi lấy TKB, Fallback về Local:", e)
                return jsonify(execute_query(query_local, (ma_sv,)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/dang-ky-day", methods=["POST"])
def api_dang_ky_day():
    data = request.get_json()
    ma_gv = data.get("ma_gv", "").strip()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    if not ma_gv or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400
    sp_name = "sp_DangKyLichDay_GiangVien"
    result = execute_procedure(sp_name, (ma_gv, ma_lop_hp))
    if result["success"]:
        _log(ma_gv, "DANG_KY_DAY", f"GV {ma_gv} đăng ký dạy {ma_lop_hp}")
    return jsonify(result), 200 if result["success"] else 400
@app.route("/api/huy-day", methods=["POST"])
def api_huy_day():
    data = request.get_json()
    ma_gv = data.get("ma_gv", "").strip()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()
    if not ma_gv or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu thông tin."}), 400
    sp_name = "sp_HuyDangKyLichDay_GiangVien"
    result = execute_procedure(sp_name, (ma_gv, ma_lop_hp))
    if result["success"]:
        _log(ma_gv, "HUY_DAY", f"GV {ma_gv} hủy dạy {ma_lop_hp}")
    return jsonify(result), 200 if result["success"] else 400
@app.route("/api/lich-day/<ma_gv>", methods=["GET"])
def get_lich_day(ma_gv):
    query_local = """
        SELECT lhp.ma_lop_hp, hp.ten_hp, gv.ho_ten AS giang_vien,
               lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
               ph.ten_phong, lhp.hoc_ky, lhp.nam_hoc,
               lhp.so_luong_da_dang_ky AS so_luong,
               (lhp.si_so_toi_da - lhp.so_luong_da_dang_ky) AS con_trong
        FROM lop_hoc_phan lhp
        JOIN hoc_phan hp ON lhp.ma_hp = hp.ma_hp
        JOIN giang_vien gv ON lhp.ma_gv = gv.ma_gv
        LEFT JOIN lich_hoc lh ON lhp.ma_lop_hp = lh.ma_lop_hp
        LEFT JOIN phong_hoc ph ON lh.ma_phong = ph.ma_phong
        WHERE lhp.ma_gv = ?
        ORDER BY lh.thu, lh.tiet_bat_dau
    """
    query_remote = """
        SELECT lhp.ma_lop_hp, hp.ten_hp, gv.ho_ten AS giang_vien,
               lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
               ph.ten_phong, lhp.hoc_ky, lhp.nam_hoc,
               lhp.so_luong_da_dang_ky AS so_luong,
               (lhp.si_so_toi_da - lhp.so_luong_da_dang_ky) AS con_trong
        FROM [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lop_hoc_phan lhp
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].hoc_phan hp ON lhp.ma_hp = hp.ma_hp
        JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].giang_vien gv ON lhp.ma_gv = gv.ma_gv
        LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lich_hoc lh ON lhp.ma_lop_hp = lh.ma_lop_hp
        LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].phong_hoc ph ON lh.ma_phong = ph.ma_phong
        WHERE lhp.ma_gv = ?
        ORDER BY lh.thu, lh.tiet_bat_dau
    """
    try:
        if SITE_CODE == "HD":
            return jsonify(execute_query(query_local, (ma_gv,)))
        else:
            try:
                # Thử chọc lên Trung tâm để lấy toàn bộ lịch dạy ở cả Cầu Giấy và Ngọc Trục
                return jsonify(execute_query(query_remote, (ma_gv,)))
            except Exception as e:
                print("Lỗi Linked Server khi lấy lịch dạy, Fallback về Local:", e)
                return jsonify(execute_query(query_local, (ma_gv,)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/thong-ke/toan-truong", methods=["GET"])
def thong_ke_tong():
    try:
        rows = execute_query("""
            SELECT
                SUM(CAST(sv_cnt AS INT)) AS tong_sv,
                SUM(CAST(gv_cnt AS INT)) AS tong_gv,
                SUM(CAST(lop_cnt AS INT)) AS tong_lop,
                SUM(CAST(dk_cnt AS INT)) AS tong_dk,
                SUM(CAST(hp_cnt AS INT)) AS tong_hp
            FROM (
                SELECT COUNT(*) AS sv_cnt, 0 AS gv_cnt, 0 AS lop_cnt, 0 AS dk_cnt, 0 AS hp_cnt
                    FROM sinh_vien WHERE da_xoa = 0
                UNION ALL
                SELECT 0, COUNT(*), 0, 0, 0 FROM giang_vien WHERE da_xoa = 0
                UNION ALL
                SELECT 0, 0, COUNT(*), 0, 0 FROM lop_hoc_phan
                UNION ALL
                SELECT 0, 0, 0, COUNT(*), 0 FROM dang_ky WHERE trang_thai = N'THANH_CONG'
                UNION ALL
                SELECT 0, 0, 0, 0, COUNT(*) FROM hoc_phan
            ) t
        """)
        r = rows[0] if rows else {}
        return jsonify({
            "tong_sv": r.get("tong_sv") or 0,
            "tong_gv": r.get("tong_gv") or 0,
            "tong_lop": r.get("tong_lop") or 0,
            "tong_dk": r.get("tong_dk") or 0,
            "tong_hp": r.get("tong_hp") or 0,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/tong-hop", methods=["GET"])
def get_tong_hop():
    """Gộp tất cả data quản lý vào 1 request — nhanh hơn 8 query riêng."""
    try:
        co_so = execute_query("SELECT ma_co_so, ten_co_so, dia_chi FROM co_so ORDER BY ma_co_so")
        khoa = execute_query("SELECT ma_khoa, ten_khoa FROM khoa ORDER BY ma_khoa")
        sv = execute_query("""
            SELECT sv.ma_sv, sv.ho_ten, sv.ngay_sinh, sv.gioi_tinh,
                   sv.ma_khoa, k.ten_khoa, sv.ma_co_so, cs.ten_co_so,
                   CASE WHEN sv.da_xoa=1 THEN N'Đã xóa' ELSE N'Hoạt động' END AS trang_thai
            FROM sinh_vien sv LEFT JOIN khoa k ON sv.ma_khoa=k.ma_khoa
            LEFT JOIN co_so cs ON sv.ma_co_so=cs.ma_co_so ORDER BY sv.ma_sv
        """)
        gv = execute_query("""
            SELECT gv.ma_gv, gv.ho_ten, gv.hoc_vi, gv.ma_khoa, k.ten_khoa,
                   gv.ma_co_so, cs.ten_co_so,
                   CASE WHEN gv.da_xoa=1 THEN N'Đã xóa' ELSE N'Hoạt động' END AS trang_thai
            FROM giang_vien gv LEFT JOIN khoa k ON gv.ma_khoa=k.ma_khoa
            LEFT JOIN co_so cs ON gv.ma_co_so=cs.ma_co_so ORDER BY gv.ma_gv
        """)
        hp = execute_query("""
            SELECT hp.ma_hp, hp.ten_hp, hp.so_tin_chi, hp.ma_khoa, k.ten_khoa
            FROM hoc_phan hp LEFT JOIN khoa k ON hp.ma_khoa=k.ma_khoa ORDER BY hp.ma_hp
        """)
        lhp = execute_query("""
            SELECT lhp.ma_lop_hp, lhp.ma_hp, hp.ten_hp AS ten_hoc_phan,
                   lhp.ma_gv, gv.ho_ten AS ten_giang_vien,
                   lhp.ma_phong, ph.ten_phong,
                   lhp.ma_co_so, cs.ten_co_so,
                   lhp.hoc_ky, lhp.nam_hoc,
                   lhp.si_so_toi_da, lhp.so_luong_da_dang_ky,
                   (lhp.si_so_toi_da - lhp.so_luong_da_dang_ky) AS con_trong
            FROM lop_hoc_phan lhp
            LEFT JOIN hoc_phan hp ON lhp.ma_hp=hp.ma_hp
            LEFT JOIN giang_vien gv ON lhp.ma_gv=gv.ma_gv
            LEFT JOIN phong_hoc ph ON lhp.ma_phong=ph.ma_phong
            LEFT JOIN co_so cs ON lhp.ma_co_so=cs.ma_co_so
            ORDER BY lhp.ma_lop_hp
        """)
        phong = execute_query("""
            SELECT ph.ma_phong, ph.ten_phong, ph.suc_chua, ph.ma_co_so, cs.ten_co_so
            FROM phong_hoc ph LEFT JOIN co_so cs ON ph.ma_co_so=cs.ma_co_so ORDER BY ph.ma_phong
        """)
        lich = execute_query("""
            SELECT lh.ma_lich, lh.ma_lop_hp, lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
                   lh.ma_phong, ph.ten_phong, lh.ma_co_so
            FROM lich_hoc lh LEFT JOIN phong_hoc ph ON lh.ma_phong=ph.ma_phong
            ORDER BY lh.thu, lh.tiet_bat_dau
        """)
        return jsonify({
            "co_so": co_so, "khoa": khoa,
            "sinh_vien": sv, "giang_vien": gv,
            "hoc_phan": hp, "lop_hoc_phan": lhp,
            "phong_hoc": phong, "lich_hoc": lich,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/thong-ke/co-so", methods=["GET"])
def thong_ke_co_so():
    try:
        rows = execute_query("""
            SELECT cs.ma_co_so, cs.ten_co_so,
                SUM(CAST(sv AS INT)) AS tong_sv,
                SUM(CAST(gv AS INT)) AS tong_gv,
                SUM(CAST(lop AS INT)) AS tong_lop,
                SUM(CAST(dk AS INT)) AS tong_dk
            FROM co_so cs
            LEFT JOIN (
                SELECT ma_co_so, 1 AS sv, 0 AS gv, 0 AS lop, 0 AS dk FROM sinh_vien WHERE da_xoa = 0
                UNION ALL
                SELECT ma_co_so, 0, 1, 0, 0 FROM giang_vien WHERE da_xoa = 0
                UNION ALL
                SELECT ma_co_so, 0, 0, 1, 0 FROM lop_hoc_phan
                UNION ALL
                SELECT ma_co_so, 0, 0, 0, 1 FROM dang_ky WHERE trang_thai = N'THANH_CONG'
            ) t ON cs.ma_co_so = t.ma_co_so
            GROUP BY cs.ma_co_so, cs.ten_co_so
            ORDER BY cs.ma_co_so
        """)
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
def _log(nguoi_dung, hanh_dong, chi_tiet):
    try:
        execute_query(
            "INSERT INTO nhat_ky (nguoi_dung, hanh_dong, chi_tiet) VALUES (?, ?, ?)",
            (nguoi_dung, hanh_dong, chi_tiet), fetch=False
        )
    except Exception:
        pass
@app.route("/api/nhat-ky", methods=["GET"])
def get_nhat_ky():
    try:
        return jsonify(execute_query("""
            SELECT TOP 200 id, nguoi_dung, hanh_dong, chi_tiet, thoi_gian
            FROM nhat_ky ORDER BY thoi_gian DESC
        """))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/tru-van-phan-tan/<int:loai>", methods=["GET"])
def truy_van_phan_tan_nang_cao(loai):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if loai == 1:
            query = """
            SELECT N'Cầu Giấy' AS ten_co_so, COUNT(*) AS so_luot_dang_ky
            FROM [SITE_CG].[QLDT_CauGiay].dbo.dang_ky
            WHERE trang_thai = N'THANH_CONG'
            UNION ALL
            SELECT N'Ngọc Trục' AS ten_co_so, COUNT(*) AS so_luot_dang_ky
            FROM [SITE_NT].[QLDT_NT].dbo.dang_ky
            WHERE trang_thai = N'THANH_CONG';
            """
        elif loai == 2:
            query = """
            WITH tong_dang_ky_hp AS (
                SELECT lhp.ma_hp, hp.ten_hp, COUNT(*) AS so_luong
                FROM [SITE_CG].[QLDT_CauGiay].dbo.dang_ky dk
                JOIN [SITE_CG].[QLDT_CauGiay].dbo.lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
                JOIN [SITE_CG].[QLDT_CauGiay].dbo.hoc_phan hp ON lhp.ma_hp = hp.ma_hp
                WHERE dk.trang_thai = N'THANH_CONG'
                GROUP BY lhp.ma_hp, hp.ten_hp
                UNION ALL
                SELECT lhp.ma_hp, hp.ten_hp, COUNT(*) AS so_luong
                FROM [SITE_NT].[QLDT_NT].dbo.dang_ky dk
                JOIN [SITE_NT].[QLDT_NT].dbo.lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
                JOIN [SITE_NT].[QLDT_NT].dbo.hoc_phan hp ON lhp.ma_hp = hp.ma_hp
                WHERE dk.trang_thai = N'THANH_CONG'
                GROUP BY lhp.ma_hp, hp.ten_hp
            )
            SELECT TOP 1 ma_hp, ten_hp, SUM(so_luong) AS tong_so_luong_dang_ky
            FROM tong_dang_ky_hp
            GROUP BY ma_hp, ten_hp
            ORDER BY tong_so_luong_dang_ky DESC;
            """
        elif loai == 3:
            query = """
            WITH tat_ca_sinh_vien AS (
                SELECT ma_sv, ho_ten, ma_co_so AS co_so_sinh_vien FROM [SITE_CG].[QLDT_CauGiay].dbo.sinh_vien WHERE da_xoa = 0
                UNION ALL
                SELECT ma_sv, ho_ten, ma_co_so AS co_so_sinh_vien FROM [SITE_NT].[QLDT_NT].dbo.sinh_vien WHERE da_xoa = 0
            ),
            tat_ca_dang_ky AS (
                SELECT ma_sv, ma_lop_hp, ma_co_so AS co_so_dang_ky FROM [SITE_CG].[QLDT_CauGiay].dbo.dang_ky WHERE trang_thai = N'THANH_CONG'
                UNION ALL
                SELECT ma_sv, ma_lop_hp, ma_co_so AS co_so_dang_ky FROM [SITE_NT].[QLDT_NT].dbo.dang_ky WHERE trang_thai = N'THANH_CONG'
            ),
            tat_ca_lop AS (
                SELECT lhp.ma_lop_hp, lhp.ma_co_so AS co_so_lop, hp.ten_hp
                FROM [SITE_CG].[QLDT_CauGiay].dbo.lop_hoc_phan lhp
                JOIN [SITE_CG].[QLDT_CauGiay].dbo.hoc_phan hp ON lhp.ma_hp = hp.ma_hp
                UNION ALL
                SELECT lhp.ma_lop_hp, lhp.ma_co_so AS co_so_lop, hp.ten_hp
                FROM [SITE_NT].[QLDT_NT].dbo.lop_hoc_phan lhp
                JOIN [SITE_NT].[QLDT_NT].dbo.hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            )
            SELECT DISTINCT sv.ma_sv, sv.ho_ten, sv.co_so_sinh_vien, dk.ma_lop_hp, lhp.ten_hp, lhp.co_so_lop
            FROM tat_ca_sinh_vien sv
            JOIN tat_ca_dang_ky dk ON sv.ma_sv = dk.ma_sv
            JOIN tat_ca_lop lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
            WHERE sv.co_so_sinh_vien <> lhp.co_so_lop;
            """
        elif loai == 4:
            query = """
            SELECT N'Cầu Giấy' AS ten_co_so, ma_lop_hp AS ma_lhp, ten_hp = 'N/A', so_luong_da_dang_ky AS so_sv_dang_ky, si_so_toi_da,
                   CAST(so_luong_da_dang_ky * 100.0 / NULLIF(si_so_toi_da, 0) AS DECIMAL(5,2)) AS ty_le_lap_day
            FROM [SITE_CG].[QLDT_CauGiay].dbo.lop_hoc_phan
            UNION ALL
            SELECT N'Ngọc Trục' AS ten_co_so, ma_lop_hp AS ma_lhp, ten_hp = 'N/A', so_luong_da_dang_ky AS so_sv_dang_ky, si_so_toi_da,
                   CAST(so_luong_da_dang_ky * 100.0 / NULLIF(si_so_toi_da, 0) AS DECIMAL(5,2)) AS ty_le_lap_day
            FROM [SITE_NT].[QLDT_NT].dbo.lop_hoc_phan;
            """
        elif loai == 5:
            query = """
            SELECT N'Cầu Giấy' AS ten_co_so, hp.ma_khoa, k.ten_khoa, COUNT(lhp.ma_lop_hp) AS so_lop_mo
            FROM [SITE_CG].[QLDT_CauGiay].dbo.lop_hoc_phan lhp
            JOIN [SITE_CG].[QLDT_CauGiay].dbo.hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            JOIN [SITE_CG].[QLDT_CauGiay].dbo.khoa k ON hp.ma_khoa = k.ma_khoa
            GROUP BY hp.ma_khoa, k.ten_khoa
            UNION ALL
            SELECT N'Ngọc Trục' AS ten_co_so, hp.ma_khoa, k.ten_khoa, COUNT(lhp.ma_lop_hp) AS so_lop_mo
            FROM [SITE_NT].[QLDT_NT].dbo.lop_hoc_phan lhp
            JOIN [SITE_NT].[QLDT_NT].dbo.hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            JOIN [SITE_NT].[QLDT_NT].dbo.khoa k ON hp.ma_khoa = k.ma_khoa
            GROUP BY hp.ma_khoa, k.ten_khoa;
            """
        else:
            return jsonify({"success": False, "message": "Loại truy vấn không hợp lệ"}), 400
        query = query.replace("[LINK_TRUNGTAM].", "")
        query = query.replace("[SITE_CG]", "[SITE_CG]")
        query = query.replace("[SITE_NT]", "[SITE_NT]")
        cursor.execute(query)
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
        return jsonify({"success": True, "data": rows})
    except pyodbc.Error as ex:
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        return jsonify({"success": False, "message": f"Lỗi SQL: {msg}"}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
@app.route("/api/crud/<table>", methods=["POST", "PUT", "DELETE"])
def api_crud(table):
    ALLOWED_TABLES = ["co_so", "khoa", "sinh_vien", "giang_vien", "hoc_phan", "lop_hoc_phan", "phong_hoc", "lich_hoc"]
    if table not in ALLOWED_TABLES:
        return jsonify({"success": False, "message": "Bảng không hợp lệ."}), 400
    data = request.get_json() or {}
    pk_col = data.get("pk_col")
    pk_val = data.get("pk_val")
    fields = data.get("fields", {})
    try:
        if request.method == "POST":
            if not fields: return jsonify({"success": False, "message": "Dữ liệu trống"}), 400
            cols = ", ".join(fields.keys())
            places = ", ".join(["?" for _ in fields])
            sql = f"INSERT INTO {table} ({cols}) VALUES ({places})"
            execute_query(sql, tuple(fields.values()), fetch=False)
            return jsonify({"success": True, "message": "Thêm thành công."})
        elif request.method == "PUT":
            if not fields or not pk_col or not pk_val: return jsonify({"success": False, "message": "Thiếu dữ liệu"}), 400
            set_clause = ", ".join([f"{k}=?" for k in fields.keys()])
            sql = f"UPDATE {table} SET {set_clause} WHERE {pk_col}=?"
            params = tuple(fields.values()) + (pk_val,)
            execute_query(sql, params, fetch=False)
            return jsonify({"success": True, "message": "Cập nhật thành công."})
        elif request.method == "DELETE":
            if not pk_col or not pk_val: return jsonify({"success": False, "message": "Thiếu dữ liệu"}), 400
            if table in ["sinh_vien", "giang_vien"]:
                sql = f"UPDATE {table} SET da_xoa=1 WHERE {pk_col}=?"
            else:
                sql = f"DELETE FROM {table} WHERE {pk_col}=?"
            execute_query(sql, (pk_val,), fetch=False)
            return jsonify({"success": True, "message": "Xóa thành công."})
    except pyodbc.Error as ex:
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        return jsonify({"success": False, "message": msg}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
