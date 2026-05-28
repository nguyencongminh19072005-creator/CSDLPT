// ============================================================
//  app.js — SPA router cho CSDLPTBTL
// ============================================================
const API = '/api';
const SKEY = 'csdlpt_user';

// ============================================================
//  SESSION
// ============================================================
function getUser() {
    const s = sessionStorage.getItem(SKEY);
    return s ? JSON.parse(s) : null;
}
function setUser(u) { sessionStorage.setItem(SKEY, JSON.stringify(u)); }
function clearUser() { sessionStorage.removeItem(SKEY); }

// ============================================================
//  ROUTER
// ============================================================
function navigate(hash) {
    window.location.hash = hash;
}

function getRoute() {
    return window.location.hash.replace('#', '') || 'login';
}

async function router() {
    const user = getUser();
    const route = getRoute();

    if (!user && route !== 'login') {
        navigate('login');
        return;
    }

    if (route === 'login') {
        renderLogin(user);
    } else {
        renderApp(user, route);
    }
}

window.addEventListener('hashchange', router);

// ============================================================
//  RENDER: LOGIN
// ============================================================
function renderLogin(user) {
    if (user) { navigate('trang-chu'); return; }
    document.getElementById('app').innerHTML = `
        <div class="login-page">
            <div class="login-box">
                <h1>QLDT Phân tán</h1>
                <p class="sub">Hệ thống Đăng ký Học phần — Trung tâm Hà Đông</p>
                <div id="login-error" class="alert alert-error hidden"></div>
                <div class="form-group">
                    <label>Tên đăng nhập</label>
                    <input type="text" id="in-user" placeholder="Mã SV / Mã GV / admin" autofocus>
                </div>
                <div class="form-group">
                    <label>Mật khẩu <span style="font-weight:400;color:#999">(chỉ admin)</span></label>
                    <input type="password" id="in-pass" placeholder="••••••">
                </div>
                <button class="btn btn-primary" style="width:100%" id="btn-login">
                    <span>Đăng nhập</span>
                </button>
                <div style="margin-top:1.2rem;font-size:0.8rem;color:#666;text-align:center">
                    SV/GV: nhập mã của bạn &nbsp;|&nbsp; Admin: admin / admin123
                </div>
            </div>
        </div>`;

    document.getElementById('in-pass').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
    document.getElementById('btn-login').addEventListener('click', doLogin);
}

async function doLogin() {
    const u = document.getElementById('in-user').value.trim();
    const p = document.getElementById('in-pass').value;
    const err = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');

    if (!u) { err.textContent = 'Vui lòng nhập tên đăng nhập.'; err.classList.remove('hidden'); return; }

    err.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span>';

    try {
        const resp = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p }),
        });
        const data = await resp.json();

        if (data.success) {
            setUser({ username: u, role: data.role, ten: data.ten,
                ma_sv: data.role === 'sinhvien' ? u : null,
                ma_gv: data.role === 'giangvien' ? u : null });
            navigate('trang-chu');
        } else {
            err.textContent = data.message;
            err.classList.remove('hidden');
        }
    } catch {
        err.textContent = 'Lỗi kết nối server.';
        err.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Đăng nhập</span>';
    }
}

// ============================================================
//  RENDER: APP SHELL
// ============================================================
function renderApp(user, route) {
    const roleLabels = { admin: 'Quản trị viên', sinhvien: 'Sinh viên', giangvien: 'Giảng viên' };
    const role = user.role;

    const navItems = role === 'admin'
        ? [
            { h: 'trang-chu', l: 'Trang chủ', i: '🏠' },
            { h: 'dang-ky', l: 'Đăng ký HP', i: '📝' },
            { h: 'huy-dang-ky', l: 'Hủy ĐK', i: '❌' },
            { h: 'ket-qua', l: 'Kết quả', i: '📋' },
            { h: 'quan-ly', l: 'Quản lý', i: '⚙️' },
            { h: 'thong-ke', l: 'Thống kê', i: '📊' },
            { h: 'nhat-ky', l: 'Nhật ký', i: '📜' },
            { h: 'phan-tan', l: 'Truy vấn PT', i: '🔗' },
          ]
        : role === 'sinhvien'
        ? [
            { h: 'trang-chu', l: 'Trang chủ', i: '🏠' },
            { h: 'dang-ky', l: 'Đăng ký HP', i: '📝' },
            { h: 'huy-dang-ky', l: 'Hủy ĐK', i: '❌' },
            { h: 'ket-qua', l: 'Kết quả', i: '📋' },
            { h: 'lich', l: 'Thời khóa biểu', i: '📅' },
          ]
        : [
            { h: 'trang-chu', l: 'Trang chủ', i: '🏠' },
            { h: 'lich', l: 'Lịch dạy', i: '📅' },
            { h: 'thong-ke', l: 'Thống kê', i: '📊' },
          ];

    document.getElementById('app').innerHTML = `
        <nav class="navbar">
            <div class="navbar-brand">QLDT Phân tán</div>
            <div class="navbar-user">
                <span>${user.ten}</span>
                <span class="role-badge">${roleLabels[role] || role}</span>
                <button class="btn-logout" id="btn-logout">Đăng xuất</button>
            </div>
        </nav>
        <div class="layout">
            <nav class="sidebar">
                ${navItems.map(n => `
                    <a href="#${n.h}" data-nav="${n.h}" class="${n.h === route ? 'active' : ''}">
                        <span>${n.i}</span> ${n.l}
                    </a>`).join('')}
            </nav>
            <main class="main">
                <div id="page-content" class="page-loading">Đang tải...</div>
            </main>
        </div>`;

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await fetch(`${API}/logout`, { method: 'POST' });
        clearUser();
        navigate('login');
    });

    loadPage(route);
}

// ============================================================
//  PAGE LOADER
// ============================================================
async function loadPage(route) {
    const user = getUser();
    if (!user) { navigate('login'); return; }

    const el = document.getElementById('page-content');
    if (!el) return;

    // Update active nav
    document.querySelectorAll('.sidebar a').forEach(a => {
        a.classList.toggle('active', a.dataset.nav === route);
    });

    switch (route) {
        case 'trang-chu':    await renderTrangChu(el, user); break;
        case 'dang-ky':      await renderDangKy(el, user); break;
        case 'huy-dang-ky':  await renderHuyDangKy(el, user); break;
        case 'ket-qua':       await renderKetQua(el, user); break;
        case 'quan-ly':       await renderQuanLy(el, user); break;
        case 'thong-ke':      await renderThongKe(el, user); break;
        case 'nhat-ky':      await renderNhatKy(el, user); break;
        case 'phan-tan':     await renderPhanTan(el, user); break;
        case 'lich':          await renderLich(el, user); break;
        default: el.innerHTML = '<p>Trang không tồn tại.</p>';
    }
}

// ============================================================
//  API HELPER
// ============================================================
async function api(url, options = {}) {
    const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    return resp.json();
}

// ============================================================
//  TRANG CHU
// ============================================================
async function renderTrangChu(el, user) {
    el.innerHTML = '<div class="page-loading">Đang tải thống kê...</div>';

    const [tk, coSo] = await Promise.all([
        api(`${API}/thong-ke/toan-truong`),
        api(`${API}/thong-ke/co-so`),
    ]);

    let svInfo = '';
    if (user.role === 'sinhvien' && user.ma_sv) {
        const dk = await api(`${API}/ket-qua-dang-ky/${user.ma_sv}`);
        svInfo = `
            <div class="card">
                <h3>Thông tin sinh viên</h3>
                <p><strong>Mã SV:</strong> ${user.ma_sv} &nbsp; <strong>Tên:</strong> ${user.ten}</p>
                <p><strong>Đã đăng ký:</strong> ${dk.length || 0} học phần</p>
            </div>`;
    }

    el.innerHTML = `
        <div class="page-header"><h2>Trang chủ</h2><p>Xin chào, ${user.ten}</p></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="num">${tk.tong_sv || 0}</div><div class="label">Sinh viên</div></div>
            <div class="stat-card"><div class="num">${tk.tong_gv || 0}</div><div class="label">Giảng viên</div></div>
            <div class="stat-card"><div class="num">${tk.tong_lop || 0}</div><div class="label">Lớp HP</div></div>
            <div class="stat-card"><div class="num">${tk.tong_dk || 0}</div><div class="label">Đăng ký</div></div>
            <div class="stat-card"><div class="num">${tk.tong_hp || 0}</div><div class="label">Học phần</div></div>
        </div>
        ${coSo && coSo.length ? `<div class="card"><h3>Thống kê theo cơ sở</h3>
            <div class="table-wrap"><table>
                <thead><tr><th>Cơ sở</th><th>SV</th><th>GV</th><th>Lớp HP</th><th>Đăng ký</th></tr></thead>
                <tbody>${coSo.map(r => `<tr>
                    <td><strong>${r.ten_co_so}</strong></td>
                    <td>${r.tong_sv}</td><td>${r.tong_gv}</td>
                    <td>${r.tong_lop}</td><td>${r.tong_dk}</td>
                </tr>`).join('')}</tbody>
            </table></div></div>` : ''}
        ${svInfo}
    `;
}

// ============================================================
//  DANG KY
// ============================================================
let _dkData = [];  // cache all lop-hoc-phan

async function renderDangKy(el, user) {
    el.innerHTML = '<div class="page-loading">Đang tải lớp học phần...</div>';

    // Lay thong tin khoa cua sinh vien (neu la sinh vien)
    let defaultKhoa = '';
    let tenKhoaSV = '';
    let svInfo = null;
    if (user.ma_sv) {
        svInfo = await api(`${API}/sinh-vien/${user.ma_sv}/khoa`);
        if (svInfo && svInfo.ma_khoa) {
            defaultKhoa = svInfo.ma_khoa;
            tenKhoaSV = svInfo.ten_khoa || svInfo.ma_khoa;
        }
    }

    // Lay tat ca lop-hoc-phan (khong loc — loc o frontend)
    const [allLopHP, khoa] = await Promise.all([
        api(`${API}/lop-hoc-phan`),
        api(`${API}/khoa`),
    ]);
    _dkData = allLopHP;

    // Khoa mac dinh = khoa cua sinh vien
    const khoaOptions = khoa.map(k =>
        `<option value="${k.ma_khoa}" ${k.ma_khoa === defaultKhoa ? 'selected' : ''}>${k.ten_khoa || k.ma_khoa}</option>`
    ).join('');

    el.innerHTML = `
        <div class="page-header">
            <h2>Đăng ký Học phần</h2>
            <p id="dk-khoa-hint"></p>
        </div>

        <div class="card">
            <h3>Danh sách lớp học phần</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Khoa</label>
                    <select id="dk-khoa">
                        ${khoaOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tìm kiếm</label>
                    <input type="text" id="dk-search" placeholder="Mã / tên lớp HP...">
                </div>
            </div>
            <div id="dk-result"></div>
            <div class="table-wrap">
                <table id="dk-table">
                    <thead><tr>
                        <th>Mã LHP</th><th>Học phần</th><th>GV</th><th>Cơ sở</th>
                        <th>HK</th><th>SL</th><th>Còn</th><th></th>
                    </tr></thead>
                    <tbody id="dk-tbody"></tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <h3>Đăng ký nhanh</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Mã sinh viên</label>
                    <input type="text" id="dk-sv" value="${user.ma_sv || ''}" placeholder="VD: SV001">
                </div>
                <div class="form-group">
                    <label>Mã lớp HP</label>
                    <input type="text" id="dk-lhp" placeholder="VD: INT2205_CG_01">
                </div>
                <div class="form-group" style="display:flex;align-items:flex-end">
                    <button class="btn btn-primary" id="dk-btn" onclick="submitDangKy()">Đăng ký</button>
                </div>
            </div>
            <div id="dk-msg"></div>
        </div>`;

    // Hien thi goi y khoa mac dinh
    if (tenKhoaSV) {
        document.getElementById('dk-khoa-hint').innerHTML =
            `<span class="badge badge-info">Mặc định: ${tenKhoaSV}</span>`;
    }

    // Load bang theo khoa mac dinh
    renderDangKyTable(defaultKhoa);

    document.getElementById('dk-khoa').addEventListener('change', e => {
        renderDangKyTable(e.target.value);
    });
    document.getElementById('dk-search').addEventListener('input', () => {
        const khoa = document.getElementById('dk-khoa').value;
        renderDangKyTable(khoa);
    });
    document.getElementById('dk-sv').addEventListener('keypress', e => { if (e.key === 'Enter') submitDangKy(); });
    document.getElementById('dk-lhp').addEventListener('keypress', e => { if (e.key === 'Enter') submitDangKy(); });
}

async function submitDangKy() {
    const ma_sv = document.getElementById('dk-sv').value.trim();
    const ma_lop_hp = document.getElementById('dk-lhp').value.trim();
    const msg = document.getElementById('dk-msg');
    const btn = document.getElementById('dk-btn');

    if (!ma_sv || !ma_lop_hp) {
        msg.innerHTML = '<div class="alert alert-error">Vui lòng nhập đủ mã SV và mã LHP.</div>';
        return;
    }

    btn.disabled = true;
    msg.innerHTML = '<div class="alert alert-info">Đang xử lý...</div>';

    const data = await api(`${API}/dang-ky`, {
        method: 'POST',
        body: JSON.stringify({ ma_sv, ma_lop_hp }),
    });

    btn.disabled = false;
    if (data.success) {
        msg.innerHTML = `<div class="result-box success"><strong>Thành công!</strong><br>${data.message}</div>`;
        // Refresh lai bang de cap nhat so luong
        const khoaFilter = document.getElementById('dk-khoa')?.value || '';
        const allLopHP = await api(`${API}/lop-hoc-phan`);
        _dkData = allLopHP;
        renderDangKyTable(khoaFilter);
    } else {
        msg.innerHTML = `<div class="result-box error"><strong>Thất bại!</strong><br>${data.message}</div>`;
    }
}

function renderDangKyTable(khoaFilter) {
    const search = (document.getElementById('dk-search')?.value || '').toLowerCase();

    const filtered = _dkData.filter(r => {
        if (khoaFilter && r.ma_khoa !== khoaFilter) return false;
        if (search && !r.ma_lop_hp.toLowerCase().includes(search) && !(r.ten_hoc_phan || '').toLowerCase().includes(search)) return false;
        return true;
    });

    document.getElementById('dk-tbody').innerHTML = filtered.map(r => {
        const lichRows = (r.lich_hoc || []).map(l =>
            `<span class="badge badge-info" style="margin:2px;display:inline-block">${l.thu} tiết ${l.tiet} · ${l.phong}</span>`
        ).join('');
        const lichDisplay = lichRows || '<span style="color:#999">—</span>';
        return `
        <tr>
            <td><strong>${r.ma_lop_hp}</strong></td>
            <td>${r.ten_hoc_phan || r.ma_hp || ''}</td>
            <td>${r.ten_giang_vien || ''}</td>
            <td>${r.ten_co_so || r.ma_co_so || ''}</td>
            <td>HK${r.hoc_ky || ''}</td>
            <td>${r.so_luong_da_dang_ky || 0}/${r.si_so_toi_da || 0}</td>
            <td><span class="badge ${(r.con_trong || 0) > 0 ? 'badge-success' : 'badge-danger'}">${r.con_trong || 0}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="quickDangKy('${r.ma_lop_hp}')">Đăng ký</button>
            </td>
        </tr>
        <tr style="background:#f8f9fa">
            <td colspan="2" style="font-size:0.75rem;color:#666;padding-left:0.8rem"><strong>Lịch học:</strong></td>
            <td colspan="6" style="font-size:0.75rem;padding:0.3rem 0.8rem">${lichDisplay}</td>
        </tr>`;
    }).join('');
}

function quickDangKy(ma_lop_hp) {
    document.getElementById('dk-lhp').value = ma_lop_hp;
    const ma_sv = prompt('Nhập mã sinh viên:', document.getElementById('dk-sv').value.trim() || '');
    if (!ma_sv) return;
    document.getElementById('dk-sv').value = ma_sv;
    submitDangKy();
}

// ============================================================
//  HUY DANG KY
// ============================================================
async function renderHuyDangKy(el, user) {
    const dk = user.ma_sv
        ? await api(`${API}/ket-qua-dang-ky/${user.ma_sv}`)
        : [];

    el.innerHTML = `
        <div class="page-header"><h2>Hủy Đăng ký</h2></div>

        <div class="card">
            <h3>Danh sách đã đăng ký</h3>
            <div class="table-wrap"><table>
                <thead><tr><th>Mã LHP</th><th>Học phần</th><th>Cơ sở</th><th>Ngày ĐK</th><th></th></tr></thead>
                <tbody>
                    ${!dk.length ? '<tr><td colspan="5" style="text-align:center;color:#999">Chưa đăng ký học phần nào</td></tr>' : ''}
                    ${dk.map(r => `<tr>
                        <td><strong>${r.ma_lop_hp}</strong></td>
                        <td>${r.ten_hp || ''}</td>
                        <td>${r.ten_co_so || ''}</td>
                        <td>${new Date(r.thoi_gian_dang_ky).toLocaleString('vi-VN')}</td>
                        <td><button class="btn btn-danger btn-sm" onclick="huyDK('${r.ma_sv}','${r.ma_lop_hp}')">Hủy</button></td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>

        <div class="card">
            <h3>Hủy nhanh</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Mã SV</label>
                    <input type="text" id="huy-sv" value="${user.ma_sv || ''}" placeholder="SV001">
                </div>
                <div class="form-group">
                    <label>Mã LHP</label>
                    <input type="text" id="huy-lhp" placeholder="INT2205_CG_01">
                </div>
                <div class="form-group" style="display:flex;align-items:flex-end">
                    <button class="btn btn-danger" onclick="submitHuy()">Hủy đăng ký</button>
                </div>
            </div>
            <div id="huy-msg"></div>
        </div>`;
}

async function huyDK(ma_sv, ma_lop_hp) {
    document.getElementById('huy-sv').value = ma_sv;
    document.getElementById('huy-lhp').value = ma_lop_hp;
    await submitHuy();
}

async function submitHuy() {
    const ma_sv = document.getElementById('huy-sv').value.trim();
    const ma_lop_hp = document.getElementById('huy-lhp').value.trim();
    const msg = document.getElementById('huy-msg');
    if (!ma_sv || !ma_lop_hp) { msg.innerHTML = '<div class="alert alert-error">Nhập đủ mã.</div>'; return; }

    msg.innerHTML = '<div class="alert alert-info">Đang xử lý...</div>';
    const data = await api(`${API}/huy-dang-ky`, {
        method: 'POST',
        body: JSON.stringify({ ma_sv, ma_lop_hp }),
    });

    if (data.success) {
        msg.innerHTML = `<div class="result-box success">${data.message}</div>`;
        setTimeout(() => loadPage('huy-dang-ky'), 1500);
    } else {
        msg.innerHTML = `<div class="result-box error"><strong>Thất bại!</strong><br>${data.message}</div>`;
    }
}

// ============================================================
//  KET QUA
// ============================================================
async function renderKetQua(el, user) {
    let ma_sv = user.ma_sv;
    if (!ma_sv) {
        ma_sv = prompt('Nhập mã sinh viên để xem kết quả:');
        if (!ma_sv) { el.innerHTML = '<p>Vui lòng nhập mã sinh viên.</p>'; return; }
    }

    el.innerHTML = '<div class="page-loading">Đang tải kết quả...</div>';
    const dk = await api(`${API}/ket-qua-dang-ky/${ma_sv}`);

    el.innerHTML = `
        <div class="page-header"><h2>Kết quả Đăng ký — ${ma_sv}</h2></div>
        <div class="card">
            <div class="table-wrap"><table>
                <thead><tr><th>STT</th><th>LHP</th><th>Học phần</th><th>Cơ sở</th><th>HK</th><th>Ngày ĐK</th><th>Trạng thái</th></tr></thead>
                <tbody>
                    ${!dk.length ? '<tr><td colspan="7" style="text-align:center;color:#999">Không có đăng ký</td></tr>' : ''}
                    ${dk.map((r, i) => `<tr>
                        <td>${i+1}</td>
                        <td><strong>${r.ma_lop_hp}</strong></td>
                        <td>${r.ten_hp || ''}</td>
                        <td>${r.ten_co_so || ''}</td>
                        <td>HK${r.hoc_ky || ''}</td>
                        <td>${new Date(r.thoi_gian_dang_ky).toLocaleString('vi-VN')}</td>
                        <td><span class="badge badge-success">${r.trang_thai}</span></td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>`;
}

// ============================================================
//  QUAN LY (Admin)
// ============================================================
async function renderQuanLy(el, user) {
    if (user.role !== 'admin') { el.innerHTML = '<p>Không có quyền truy cập.</p>'; return; }

    el.innerHTML = '<div class="page-loading">Đang tải dữ liệu...</div>';

    const data = await api(`${API}/tong-hop`);

    el.innerHTML = `
        <div class="page-header"><h2>Quản lý Dữ liệu</h2></div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab(this,'tab-cs')">Cơ sở</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-khoa')">Khoa</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-sv')">Sinh viên</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-gv')">Giảng viên</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-hp')">Học phần</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-lhp')">Lớp HP</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-ph')">Phòng học</button>
            <button class="tab-btn" onclick="switchTab(this,'tab-lh')">Lịch học</button>
        </div>

        <div id="tab-cs" class="tab-content active">
            <div class="card"><h3>Cơ sở</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã</th><th>Tên</th><th>Địa chỉ</th></tr></thead>
                    <tbody>${(data.co_so||[]).map(r => `<tr><td>${r.ma_co_so}</td><td>${r.ten_co_so}</td><td>${r.dia_chi||''}</td></tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-khoa" class="tab-content">
            <div class="card"><h3>Khoa</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã</th><th>Tên</th></tr></thead>
                    <tbody>${(data.khoa||[]).map(r => `<tr><td>${r.ma_khoa}</td><td>${r.ten_khoa}</td></tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-sv" class="tab-content">
            <div class="card"><h3>Sinh viên</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã SV</th><th>Họ tên</th><th>Khoa</th><th>Cơ sở</th><th>Trạng thái</th></tr></thead>
                    <tbody>${(data.sinh_vien||[]).map(r => `<tr>
                        <td>${r.ma_sv}</td><td>${r.ho_ten}</td>
                        <td>${r.ten_khoa||''}</td><td>${r.ten_co_so||''}</td>
                        <td><span class="badge ${r.trang_thai==='Hoạt động'?'badge-success':'badge-danger'}">${r.trang_thai||''}</span></td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-gv" class="tab-content">
            <div class="card"><h3>Giảng viên</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã GV</th><th>Họ tên</th><th>Học vị</th><th>Khoa</th><th>Cơ sở</th></tr></thead>
                    <tbody>${(data.giang_vien||[]).map(r => `<tr>
                        <td>${r.ma_gv}</td><td>${r.ho_ten}</td><td>${r.hoc_vi||''}</td>
                        <td>${r.ten_khoa||''}</td><td>${r.ten_co_so||''}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-hp" class="tab-content">
            <div class="card"><h3>Học phần</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã HP</th><th>Tên</th><th>Tín chỉ</th><th>Khoa</th></tr></thead>
                    <tbody>${(data.hoc_phan||[]).map(r => `<tr>
                        <td>${r.ma_hp}</td><td>${r.ten_hp}</td><td>${r.so_tin_chi}</td><td>${r.ten_khoa||''}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-lhp" class="tab-content">
            <div class="card"><h3>Lớp học phần</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã LHP</th><th>Học phần</th><th>GV</th><th>Cơ sở</th><th>HK</th><th>SL</th></tr></thead>
                    <tbody>${(data.lop_hoc_phan||[]).map(r => `<tr>
                        <td>${r.ma_lop_hp}</td><td>${r.ten_hoc_phan||''}</td>
                        <td>${r.ten_giang_vien||''}</td><td>${r.ten_co_so||''}</td>
                        <td>HK${r.hoc_ky||''}</td>
                        <td>${r.so_luong_da_dang_ky||0}/${r.si_so_toi_da||0}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-ph" class="tab-content">
            <div class="card"><h3>Phòng học</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã</th><th>Tên</th><th>Sức chứa</th><th>Cơ sở</th></tr></thead>
                    <tbody>${(data.phong_hoc||[]).map(r => `<tr>
                        <td>${r.ma_phong}</td><td>${r.ten_phong}</td><td>${r.suc_chua}</td><td>${r.ten_co_so||''}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-lh" class="tab-content">
            <div class="card"><h3>Lịch học</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã LHP</th><th>Thứ</th><th>Tiết</th><th>Phòng</th><th>Cơ sở</th></tr></thead>
                    <tbody>${(data.lich_hoc||[]).map(r => `<tr>
                        <td>${r.ma_lop_hp}</td><td>${r.thu}</td>
                        <td>${r.tiet_bat_dau}-${r.tiet_ket_thuc}</td>
                        <td>${r.ten_phong||r.ma_phong||''}</td><td>${r.ma_co_so}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>
    `;
}

function switchTab(btn, id) {
    document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

// ============================================================
//  THONG KE
// ============================================================
async function renderThongKe(el, user) {
    el.innerHTML = '<div class="page-loading">Đang tải thống kê...</div>';

    const [tk, coSo] = await Promise.all([
        api(`${API}/thong-ke/toan-truong`),
        api(`${API}/thong-ke/co-so`),
    ]);

    el.innerHTML = `
        <div class="page-header"><h2>Thống kê Toàn trường</h2></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="num">${tk.tong_sv||0}</div><div class="label">Sinh viên</div></div>
            <div class="stat-card"><div class="num">${tk.tong_gv||0}</div><div class="label">Giảng viên</div></div>
            <div class="stat-card"><div class="num">${tk.tong_lop||0}</div><div class="label">Lớp HP</div></div>
            <div class="stat-card"><div class="num">${tk.tong_dk||0}</div><div class="label">Đăng ký</div></div>
            <div class="stat-card"><div class="num">${tk.tong_hp||0}</div><div class="label">Học phần</div></div>
        </div>
        <div class="card"><h3>Theo cơ sở</h3>
            <div class="table-wrap"><table>
                <thead><tr><th>Cơ sở</th><th>SV</th><th>GV</th><th>Lớp HP</th><th>Đăng ký</th></tr></thead>
                <tbody>${coSo.map(r => `<tr>
                    <td><strong>${r.ten_co_so}</strong></td>
                    <td>${r.tong_sv}</td><td>${r.tong_gv}</td>
                    <td>${r.tong_lop}</td><td>${r.tong_dk}</td>
                </tr>`).join('')}</tbody>
            </table></div>
        </div>`;
}

// ============================================================
//  NHAT KY
// ============================================================
async function renderNhatKy(el, user) {
    if (user.role !== 'admin') { el.innerHTML = '<p>Không có quyền.</p>'; return; }
    el.innerHTML = '<div class="page-loading">Đang tải nhật ký...</div>';

    const nk = await api(`${API}/nhat-ky`);
    el.innerHTML = `
        <div class="page-header"><h2>Nhật ký Thao tác</h2></div>
        <div class="card">
            <div class="table-wrap"><table>
                <thead><tr><th>STT</th><th>Người dùng</th><th>Hành động</th><th>Chi tiết</th><th>Thời gian</th></tr></thead>
                <tbody>
                    ${!nk.length ? '<tr><td colspan="5" style="text-align:center;color:#999">Chưa có nhật ký</td></tr>' : ''}
                    ${nk.map((r,i) => `<tr>
                        <td>${i+1}</td><td>${r.nguoi_dung}</td>
                        <td><span class="badge badge-info">${r.hanh_dong}</span></td>
                        <td>${r.chi_tiet||''}</td>
                        <td>${new Date(r.thoi_gian).toLocaleString('vi-VN')}</td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>`;
}

// ============================================================
//  TRUY VAN PHAN TAN (Admin)
// ============================================================
async function renderPhanTan(el, user) {
    if (user.role !== 'admin') { el.innerHTML = '<p>Không có quyền.</p>'; return; }
    el.innerHTML = '<div class="page-loading">Đang truy vấn Linked Server...</div>';

    const pt = await api(`${API}/tru-van-phan-tan`);
    if (pt.success && pt.data && pt.data.length) {
        el.innerHTML = `
            <div class="page-header"><h2>Truy vấn Phân tán</h2></div>
            <div class="card">
                <h3>Dữ liệu từ Linked Server (site Cầu Giấy)</h3>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã SV</th><th>Họ tên</th><th>Cơ sở</th><th>Mã LHP</th><th>Học phần</th></tr></thead>
                    <tbody>${pt.data.map(r => `<tr>
                        <td>${r.ma_sv}</td><td>${r.ho_ten}</td><td>${r.ma_co_so}</td>
                        <td>${r.ma_lop_hp||''}</td><td>${r.ten_hp||''}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>`;
    } else {
        el.innerHTML = `
            <div class="page-header"><h2>Truy vấn Phân tán</h2></div>
            <div class="card">
                <h3>Linked Server</h3>
                <div class="alert alert-error">
                    ${pt.message || 'Không thể kết nối Linked Server. Kiểm tra kết nối mạng và cấu hình LINK_TRUNGTAM.'}
                </div>
                <p class="info-text">Đảm bảo Linked Server <code>LINK_TRUNGTAM</code> đã được tạo trên site Cầu Giấy / Ngọc Trục.</p>
            </div>`;
    }
}

// ============================================================
//  LICH (TKB SV / lich day GV)
// ============================================================
async function renderLich(el, user) {
    el.innerHTML = '<div class="page-loading">Đang tải lịch...</div>';

    if (user.role === 'sinhvien' && user.ma_sv) {
        const tkb = await api(`${API}/thoi-khoa-bieu/${user.ma_sv}`);
        el.innerHTML = `
            <div class="page-header"><h2>Thời khóa biểu — ${user.ten}</h2></div>
            <div class="card">
                <div class="table-wrap"><table>
                    <thead><tr><th>Thứ</th><th>Mã LHP</th><th>Học phần</th><th>Tiết</th><th>Phòng</th><th>GV</th></tr></thead>
                    <tbody>
                        ${!tkb.length ? '<tr><td colspan="6" style="text-align:center;color:#999">Chưa có lịch học</td></tr>' : ''}
                        ${tkb.map(r => `<tr>
                            <td>${['CN','T2','T3','T4','T5','T6','T7'][r.thu]||r.thu}</td>
                            <td>${r.ma_lop_hp}</td><td>${r.ten_hp||''}</td>
                            <td>${r.tiet_bat_dau}-${r.tiet_ket_thuc}</td>
                            <td>${r.ten_phong||''}</td><td>${r.giang_vien||''}</td>
                        </tr>`).join('')}
                    </tbody>
                </table></div>
            </div>`;
    } else if (user.role === 'giangvien' && user.ma_gv) {
        const ld = await api(`${API}/lich-day/${user.ma_gv}`);
        el.innerHTML = `
            <div class="page-header"><h2>Lịch dạy — ${user.ten}</h2></div>
            <div class="card">
                <div class="table-wrap"><table>
                    <thead><tr><th>Thứ</th><th>LHP</th><th>Học phần</th><th>Tiết</th><th>Phòng</th><th>HK</th><th>SV ĐK</th></tr></thead>
                    <tbody>
                        ${!ld.length ? '<tr><td colspan="7" style="text-align:center;color:#999">Chưa có lịch dạy</td></tr>' : ''}
                        ${ld.map(r => `<tr>
                            <td>${['CN','T2','T3','T4','T5','T6','T7'][r.thu]||r.thu||'-'}</td>
                            <td>${r.ma_lop_hp}</td><td>${r.ten_hp||''}</td>
                            <td>${r.tiet_bat_dau?r.tiet_bat_dau+'-'+r.tiet_ket_thuc:'-'}</td>
                            <td>${r.ten_phong||'-'}</td>
                            <td>HK${r.hoc_ky||''}</td><td>${r.so_luong||0}</td>
                        </tr>`).join('')}
                    </tbody>
                </table></div>
            </div>`;
    } else {
        el.innerHTML = '<p>Không có thông tin lịch.</p>';
    }
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', router);
