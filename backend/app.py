from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from services.database import execute_query, execute_procedure, get_connection, SITE_CODE
from services.auth import authenticate
import pyodbc

app = Flask(__name__, template_folder="../templates", static_folder="../static")
app.secret_key = "csdldpt_secret_key_2025"
CORS(app)


# ============================================================
#  SPA: serve index.html for all page routes
# ============================================================
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


# ============================================================
#  AUTH
# ============================================================
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


# ============================================================
#  CO SO
# ============================================================
@app.route("/api/co-so", methods=["GET"])
def get_co_so():
    try:
        return jsonify(execute_query("SELECT ma_co_so, ten_co_so, dia_chi FROM co_so ORDER BY ma_co_so"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
#  KHOA
# ============================================================
@app.route("/api/khoa", methods=["GET"])
def get_khoa():
    try:
        return jsonify(execute_query("SELECT ma_khoa, ten_khoa FROM khoa ORDER BY ma_khoa"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
#  SINH VIEN
# ============================================================
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


# ============================================================
#  GIANG VIEN
# ============================================================
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


# ============================================================
#  HOC PHAN
# ============================================================
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


# ============================================================
#  LOP HOC PHAN
# ============================================================
@app.route("/api/lop-hoc-phan", methods=["GET"])
def get_lop_hoc_phan():
    ma_co_so = request.args.get("ma_co_so")
    ma_khoa = request.args.get("ma_khoa")
    try:
        query = """
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
        conditions = []
        params = []
        if ma_co_so:
            conditions.append("lhp.ma_co_so = ?")
            params.append(ma_co_so)
        if ma_khoa:
            conditions.append("hp.ma_khoa = ?")
            params.append(ma_khoa)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY lhp.ma_lop_hp"
        lop_hp = execute_query(query, params if params else None)

        # Lay lich hoc cho tat ca lop
        lich = execute_query("""
            SELECT lh.ma_lop_hp, lh.thu, lh.tiet_bat_dau, lh.tiet_ket_thuc,
                   lh.ma_phong, ph.ten_phong
            FROM lich_hoc lh
            LEFT JOIN phong_hoc ph ON lh.ma_phong = ph.ma_phong
        """)

        # Map lich hoc theo ma_lop_hp
        lich_map = {}
        for l in lich:
            key = l["ma_lop_hp"]
            if key not in lich_map:
                lich_map[key] = []
            lich_map[key].append(l)

        # Gan lich hoc vao ket qua
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


# ============================================================
#  PHONG HOC
# ============================================================
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


# ============================================================
#  LICH HOC
# ============================================================
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


# ============================================================
#  DANG KY (goi SP)
# ============================================================
@app.route("/api/dang-ky", methods=["POST"])
def api_dang_ky():
    data = request.get_json()
    ma_sv = data.get("ma_sv", "").strip()
    ma_lop_hp = data.get("ma_lop_hp", "").strip()

    if not ma_sv or not ma_lop_hp:
        return jsonify({"success": False, "message": "Thiếu mã SV hoặc mã LHP."}), 400

    # Chuyển hướng SP tùy theo chạy ở máy nào
    sp_name = "sp_DangKyHocPhan_TrungTam" if SITE_CODE == "HD" else "sp_dang_ky_hoc_phan"
    result = execute_procedure(sp_name, (ma_sv, ma_lop_hp))

    if result["success"]:
        _log(ma_sv, "DANG_KY", f"SV {ma_sv} đăng ký {ma_lop_hp}")

    return jsonify(result), 200 if result["success"] else 400


# ============================================================
#  HUY DANG KY (goi SP)
# ============================================================
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
        
        # Chuyển hướng SP tùy theo chạy ở máy nào
        sp_name = "sp_HuyDangKyHocPhan_TrungTam" if SITE_CODE == "HD" else "sp_HuyDangKyHocPhan"
        cursor.execute(f"EXEC {sp_name} @ma_sv=?, @ma_lop_hp=?", (ma_sv, ma_lop_hp))
        
        # SP tra ve result set: SELECT N'Hủy...' AS message
        row = cursor.fetchone()
        conn.commit()
        msg = str(row[0]) if row and row[0] else "Hủy thành công."
        cursor.close()
        conn.close()

        _log(ma_sv, "HUY_DANG_KY", f"SV {ma_sv} hủy {ma_lop_hp}")
        return jsonify({"success": True, "message": msg})
    except pyodbc.Error as ex:
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        return jsonify({"success": False, "message": msg}), 400


# ============================================================
#  KET QUA DANG KY
# ============================================================
@app.route("/api/ket-qua-dang-ky/<ma_sv>", methods=["GET"])
def get_ket_qua(ma_sv):
    try:
        return jsonify(execute_query("""
            SELECT dk.ma_sv, sv.ho_ten, dk.ma_lop_hp, hp.ten_hp,
                   lhp.hoc_ky, lhp.nam_hoc, cs.ten_co_so,
                   dk.thoi_gian_dang_ky, dk.trang_thai
            FROM dang_ky dk
            JOIN sinh_vien sv ON dk.ma_sv = sv.ma_sv
            JOIN lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
            JOIN hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            JOIN co_so cs ON dk.ma_co_so = cs.ma_co_so
            WHERE dk.ma_sv = ? AND dk.trang_thai = N'THANH_CONG'
            ORDER BY dk.thoi_gian_dang_ky DESC
        """, (ma_sv,)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
#  THOI KHOA BIEU
# ============================================================
@app.route("/api/thoi-khoa-bieu/<ma_sv>", methods=["GET"])
def get_tkb(ma_sv):
    try:
        return jsonify(execute_query("""
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
        """, (ma_sv,)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
#  LICH DAY GIANG VIEN
# ============================================================
@app.route("/api/lich-day/<ma_gv>", methods=["GET"])
def get_lich_day(ma_gv):
    try:
        return jsonify(execute_query("""
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
        """, (ma_gv,)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
#  THONG KE
# ============================================================
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


# ============================================================
#  NHAT KY
# ============================================================
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


# ============================================================
#  TRUY VAN PHAN TAN
# ============================================================
@app.route("/api/tru-van-phan-tan", methods=["GET"])
def truy_van_phan_tan():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT TOP 20 sv.ma_sv, sv.ho_ten, sv.ma_co_so,
                   dk.ma_lop_hp, hp.ten_hp
            FROM [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].sinh_vien sv
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].dang_ky dk ON sv.ma_sv = dk.ma_sv
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].lop_hoc_phan lhp ON dk.ma_lop_hp = lhp.ma_lop_hp
            LEFT JOIN [LINK_TRUNGTAM].[QLDT_HADONG].[dbo].hoc_phan hp ON lhp.ma_hp = hp.ma_hp
            WHERE sv.ma_co_so = N'CS_CG'
        """)
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
        cursor.close(); conn.close()
        return jsonify({"success": True, "data": rows})
    except pyodbc.Error as ex:
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        return jsonify({"success": False, "message": msg}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
