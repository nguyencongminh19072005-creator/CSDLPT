from services.database import execute_query


def authenticate(username, password):
    """
    Đăng nhập bằng mã sinh viên / mã giảng viên / admin.
    - Sinh viên: username = ma_sv (không cần password)
    - Giảng viên: username = ma_gv (không cần password)
    - Admin: username = 'admin', password = 'admin123'
    """
    username = username.strip()

    # Admin
    if username == "admin":
        if password == "admin123":
            return {"role": "admin", "username": "admin", "ten": "Quản trị viên"}
        return None

    # Sinh viên
    sv = execute_query(
        "SELECT ma_sv, ho_ten FROM sinh_vien WHERE ma_sv = ? AND da_xoa = 0",
        (username,)
    )
    if sv and len(sv) > 0:
        return {
            "role": "sinhvien",
            "username": username,
            "ma_sv": username,
            "ten": sv[0]["ho_ten"],
        }

    # Giảng viên
    gv = execute_query(
        "SELECT ma_gv, ho_ten FROM giang_vien WHERE ma_gv = ? AND da_xoa = 0",
        (username,)
    )
    if gv and len(gv) > 0:
        return {
            "role": "giangvien",
            "username": username,
            "ma_gv": username,
            "ten": gv[0]["ho_ten"],
        }

    return None
