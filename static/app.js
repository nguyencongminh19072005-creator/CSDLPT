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
            setUser({
                username: u, role: data.role, ten: data.ten,
                ma_sv: data.role === 'sinhvien' ? u : null,
                ma_gv: data.role === 'giangvien' ? u : null
            });
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
            { h: 'quan-ly', l: 'Quản lý Dữ liệu', i: '⚙️' },
            { h: 'thong-ke', l: 'Thống kê', i: '📊' },

            { h: 'phan-tan', l: 'Truy vấn Phân tán', i: '🔗' },
            { h: 'demo', l: 'Demo Đồng Thời', i: '🚀' },
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
                { h: 'dang-ky-day', l: 'Đăng ký dạy', i: '📝' },
                { h: 'lich', l: 'Lịch dạy', i: '📅' },
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
        case 'trang-chu': await renderTrangChu(el, user); break;
        case 'dang-ky': await renderDangKy(el, user); break;
        case 'huy-dang-ky': await renderHuyDangKy(el, user); break;
        case 'ket-qua': await renderKetQua(el, user); break;
        case 'quan-ly': await renderQuanLy(el, user); break;
        case 'thong-ke': await renderThongKe(el, user); break;
        case 'phan-tan': await renderPhanTan(el, user); break;
        case 'demo': await renderDemoDongThoi(el, user); break;
        case 'dang-ky-day': await renderDangKyDay(el, user); break;
        case 'lich': await renderLich(el, user); break;
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
let _dkDaDangKy = []; // cache ds da dang ky cua sinh vien hien tai

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

    // Lay tat ca lop-hoc-phan va ket qua dang ky
    const [allLopHP, khoa, dsDangKy] = await Promise.all([
        api(`${API}/lop-hoc-phan`),
        api(`${API}/khoa`),
        user.ma_sv ? api(`${API}/ket-qua-dang-ky/${user.ma_sv}`) : Promise.resolve([])
    ]);
    _dkData = allLopHP;
    _dkDaDangKy = dsDangKy.map(d => d.ma_lop_hp);

    // Khoa mac dinh = khoa cua sinh vien
    const khoaOptions = khoa.map(k =>
        `<option value="${k.ma_khoa}" ${k.ma_khoa === defaultKhoa ? 'selected' : ''}>${k.ten_khoa || k.ma_khoa}</option>`
    ).join('');

    el.innerHTML = `
        <div class="page-header">
            <h2>Đăng ký Học phần</h2>
            <p id="dk-khoa-hint"></p>
        </div>
        <div id="dk-global-msg" style="margin-bottom: 1rem;"></div>

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
    const msg = document.getElementById('dk-global-msg');
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
        // Refresh lai bang de cap nhat so luong va nut Huy
        const khoaFilter = document.getElementById('dk-khoa')?.value || '';
        const [allLopHP, dsDangKy] = await Promise.all([
            api(`${API}/lop-hoc-phan`),
            api(`${API}/ket-qua-dang-ky/${ma_sv}`)
        ]);
        _dkData = allLopHP;
        _dkDaDangKy = dsDangKy.map(d => d.ma_lop_hp);
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
                ${_dkDaDangKy.includes(r.ma_lop_hp)
                ? `<button class="btn btn-danger btn-sm" onclick="quickHuyDK_FromDK('${r.ma_lop_hp}')">Hủy ĐK</button>`
                : `<button class="btn btn-primary btn-sm" onclick="quickDangKy('${r.ma_lop_hp}')">Đăng ký</button>`}
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
    const currentSV = document.getElementById('dk-sv').value.trim() || getUser()?.ma_sv || '';
    if (!currentSV) {
        alert('Vui lòng nhập mã sinh viên!');
        return;
    }
    document.getElementById('dk-sv').value = currentSV;

    if (confirm(`Xác nhận đăng ký lớp học phần ${ma_lop_hp}?`)) {
        submitDangKy();
    }
}

async function quickHuyDK_FromDK(ma_lop_hp) {
    const ma_sv = document.getElementById('dk-sv').value.trim() || getUser()?.ma_sv;
    if (!ma_sv) return;

    if (!confirm(`Xác nhận HỦY đăng ký lớp học phần ${ma_lop_hp}?`)) {
        return;
    }

    const msg = document.getElementById('dk-global-msg');
    msg.innerHTML = '<div class="alert alert-info">Đang xử lý hủy...</div>';

    const data = await api(`${API}/huy-dang-ky`, {
        method: 'POST',
        body: JSON.stringify({ ma_sv, ma_lop_hp }),
    });

    if (data.success) {
        msg.innerHTML = `<div class="result-box success"><strong>Hủy thành công!</strong><br>${data.message}</div>`;
        const khoaFilter = document.getElementById('dk-khoa')?.value || '';
        const [allLopHP, dsDangKy] = await Promise.all([
            api(`${API}/lop-hoc-phan`),
            api(`${API}/ket-qua-dang-ky/${ma_sv}`)
        ]);
        _dkData = allLopHP;
        _dkDaDangKy = dsDangKy.map(d => d.ma_lop_hp);
        renderDangKyTable(khoaFilter);
    } else {
        msg.innerHTML = `<div class="result-box error"><strong>Thất bại!</strong><br>${data.message}</div>`;
    }
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
        <div id="huy-global-msg" style="margin-bottom: 1rem;"></div>

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
    const msg = document.getElementById('huy-global-msg');
    if (!ma_sv || !ma_lop_hp) { msg.innerHTML = '<div class="alert alert-error">Nhập đủ mã.</div>'; return; }

    if (!confirm(`Xác nhận HỦY đăng ký lớp học phần ${ma_lop_hp}?`)) {
        return;
    }

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
                        <td>${i + 1}</td>
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

    const escapeQuotes = (str) => { return str ? str.toString().replace(/'/g, "\\'").replace(/"/g, '&quot;') : ''; };

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
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Cơ sở</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('co_so', 'ma_co_so', ['ma_co_so','ten_co_so','dia_chi'], 'Thêm Cơ sở')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã</th><th>Tên</th><th>Địa chỉ</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.co_so || []).map(r => `<tr><td>${r.ma_co_so}</td><td>${r.ten_co_so}</td><td>${r.dia_chi || ''}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("co_so", "ma_co_so", ["ma_co_so","ten_co_so","dia_chi"], "Sửa Cơ sở", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('co_so', 'ma_co_so', '${r.ma_co_so}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-khoa" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Khoa</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('khoa', 'ma_khoa', ['ma_khoa','ten_khoa'], 'Thêm Khoa')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã</th><th>Tên</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.khoa || []).map(r => `<tr><td>${r.ma_khoa}</td><td>${r.ten_khoa}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("khoa", "ma_khoa", ["ma_khoa","ten_khoa"], "Sửa Khoa", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('khoa', 'ma_khoa', '${r.ma_khoa}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-sv" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Sinh viên</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('sinh_vien', 'ma_sv', ['ma_sv','ho_ten','ngay_sinh','gioi_tinh','ma_khoa','ma_co_so','mat_khau'], 'Thêm Sinh viên')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã SV</th><th>Họ tên</th><th>Khoa</th><th>Cơ sở</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.sinh_vien || []).map(r => `<tr>
                        <td>${r.ma_sv}</td><td>${r.ho_ten}</td>
                        <td>${r.ten_khoa || ''}</td><td>${r.ten_co_so || ''}</td>
                        <td><span class="badge ${r.trang_thai === 'Hoạt động' ? 'badge-success' : 'badge-danger'}">${r.trang_thai || ''}</span></td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("sinh_vien", "ma_sv", ["ma_sv","ho_ten","ngay_sinh","gioi_tinh","ma_khoa","ma_co_so"], "Sửa Sinh viên", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('sinh_vien', 'ma_sv', '${r.ma_sv}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-gv" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Giảng viên</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('giang_vien', 'ma_gv', ['ma_gv','ho_ten','hoc_vi','ma_khoa','ma_co_so','mat_khau'], 'Thêm Giảng viên')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã GV</th><th>Họ tên</th><th>Học vị</th><th>Khoa</th><th>Cơ sở</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.giang_vien || []).map(r => `<tr>
                        <td>${r.ma_gv}</td><td>${r.ho_ten}</td><td>${r.hoc_vi || ''}</td>
                        <td>${r.ten_khoa || ''}</td><td>${r.ten_co_so || ''}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("giang_vien", "ma_gv", ["ma_gv","ho_ten","hoc_vi","ma_khoa","ma_co_so"], "Sửa Giảng viên", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('giang_vien', 'ma_gv', '${r.ma_gv}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-hp" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Học phần</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('hoc_phan', 'ma_hp', ['ma_hp','ten_hp','so_tin_chi','ma_khoa'], 'Thêm Học phần')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã HP</th><th>Tên</th><th>Tín chỉ</th><th>Khoa</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.hoc_phan || []).map(r => `<tr>
                        <td>${r.ma_hp}</td><td>${r.ten_hp}</td><td>${r.so_tin_chi}</td><td>${r.ten_khoa || ''}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("hoc_phan", "ma_hp", ["ma_hp","ten_hp","so_tin_chi","ma_khoa"], "Sửa Học phần", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('hoc_phan', 'ma_hp', '${r.ma_hp}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-lhp" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Lớp học phần</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('lop_hoc_phan', 'ma_lop_hp', ['ma_lop_hp','ma_hp','ma_gv','ma_phong','ma_co_so','hoc_ky','nam_hoc','si_so_toi_da','so_luong_da_dang_ky'], 'Thêm Lớp HP')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã LHP</th><th>Học phần</th><th>GV</th><th>Cơ sở</th><th>HK</th><th>SL</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.lop_hoc_phan || []).map(r => `<tr>
                        <td>${r.ma_lop_hp}</td><td>${r.ten_hoc_phan || ''}</td>
                        <td>${r.ten_giang_vien || ''}</td><td>${r.ten_co_so || ''}</td>
                        <td>HK${r.hoc_ky || ''}</td>
                        <td>${r.so_luong_da_dang_ky || 0}/${r.si_so_toi_da || 0}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("lop_hoc_phan", "ma_lop_hp", ["ma_lop_hp","ma_hp","ma_gv","ma_phong","ma_co_so","hoc_ky","nam_hoc","si_so_toi_da"], "Sửa Lớp HP", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('lop_hoc_phan', 'ma_lop_hp', '${r.ma_lop_hp}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-ph" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Phòng học</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('phong_hoc', 'ma_phong', ['ma_phong','ten_phong','suc_chua','ma_co_so'], 'Thêm Phòng học')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã</th><th>Tên</th><th>Sức chứa</th><th>Cơ sở</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.phong_hoc || []).map(r => `<tr>
                        <td>${r.ma_phong}</td><td>${r.ten_phong}</td><td>${r.suc_chua}</td><td>${r.ten_co_so || ''}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("phong_hoc", "ma_phong", ["ma_phong","ten_phong","suc_chua","ma_co_so"], "Sửa Phòng học", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('phong_hoc', 'ma_phong', '${r.ma_phong}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>

        <div id="tab-lh" class="tab-content">
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>Lịch học</h3>
                    <button class="btn btn-primary btn-sm" onclick="showCrudModal('lich_hoc', 'ma_lich', ['ma_lich','ma_lop_hp','thu','tiet_bat_dau','tiet_ket_thuc','ma_phong','ma_co_so'], 'Thêm Lịch học')">+ Thêm mới</button>
                </div>
                <div class="table-wrap"><table>
                    <thead><tr><th>Mã LHP</th><th>Thứ</th><th>Tiết</th><th>Phòng</th><th>Cơ sở</th><th>Hành động</th></tr></thead>
                    <tbody>${(data.lich_hoc || []).map(r => `<tr>
                        <td>${r.ma_lop_hp}</td><td>${r.thu}</td>
                        <td>${r.tiet_bat_dau}-${r.tiet_ket_thuc}</td>
                        <td>${r.ten_phong || r.ma_phong || ''}</td><td>${r.ma_co_so}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick='showCrudModal("lich_hoc", "ma_lich", ["ma_lich","ma_lop_hp","thu","tiet_bat_dau","tiet_ket_thuc","ma_phong","ma_co_so"], "Sửa Lịch học", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Sửa</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCrud('lich_hoc', 'ma_lich', '${r.ma_lich}')">Xóa</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>
        
        <!-- Modal Container -->
        <div id="crud-modal" class="modal">
            <div class="modal-box" id="crud-modal-content">
                <!-- Nội dung modal động -->
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
//  CRUD FUNCTIONS
// ============================================================
function showCrudModal(table, pk_col, fields, title, record = null) {
    const modal = document.getElementById('crud-modal');
    const content = document.getElementById('crud-modal-content');

    let html = `<h3>${title}</h3>`;
    html += `<form id="crud-form" onsubmit="event.preventDefault(); saveCrud('${table}', '${pk_col}', ${record ? 'true' : 'false'});">`;
    html += `<div style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">`;

    fields.forEach(field => {
        let val = record ? (record[field] || '') : '';
        // If it's a date field, attempt to format it
        if (field.includes('ngay_sinh') && val) {
            val = val.split('T')[0];
        }

        // Disabled PK when editing
        const isReadonly = record && field === pk_col ? 'readonly' : '';
        const bg = isReadonly ? 'background:#f0f0f0;' : '';

        html += `
        <div class="form-group">
            <label>${field.toUpperCase()}</label>
            <input type="text" id="input_${field}" value="${val}" ${isReadonly} style="${bg}" required>
        </div>`;
    });

    html += `</div>`;
    html += `
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('crud-modal').classList.remove('show')">Hủy</button>
            <button type="submit" class="btn btn-primary">Lưu lại</button>
        </div>
    </form>`;

    // Lưu tạm danh sách field để lúc submit lấy
    window.currentCrudFields = fields;

    content.innerHTML = html;
    modal.classList.add('show');
}

async function saveCrud(table, pk_col, isEdit) {
    const fields = window.currentCrudFields;
    const dataObj = {};
    fields.forEach(field => {
        dataObj[field] = document.getElementById(`input_${field}`).value;
    });

    const pk_val = dataObj[pk_col];

    const payload = {
        pk_col: pk_col,
        pk_val: pk_val,
        fields: dataObj
    };

    const method = isEdit ? 'PUT' : 'POST';

    try {
        const data = await api(`${API}/crud/${table}`, {
            method: method,
            body: JSON.stringify(payload)
        });

        if (data.success) {
            alert(data.message);
            document.getElementById('crud-modal').classList.remove('show');
            loadPage('quan-ly'); // Reload
        } else {
            alert("Lỗi: " + data.message);
        }
    } catch (e) {
        alert("Lỗi mạng.");
    }
}

async function deleteCrud(table, pk_col, pk_val) {
    if (!confirm(`Bạn có chắc chắn muốn xóa dữ liệu có mã: ${pk_val}?`)) return;

    const payload = {
        pk_col: pk_col,
        pk_val: pk_val
    };

    try {
        const data = await api(`${API}/crud/${table}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });

        if (data.success) {
            alert(data.message);
            loadPage('quan-ly'); // Reload
        } else {
            alert("Lỗi: " + data.message);
        }
    } catch (e) {
        alert("Lỗi mạng.");
    }
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
            <div class="stat-card"><div class="num">${tk.tong_sv || 0}</div><div class="label">Sinh viên</div></div>
            <div class="stat-card"><div class="num">${tk.tong_gv || 0}</div><div class="label">Giảng viên</div></div>
            <div class="stat-card"><div class="num">${tk.tong_lop || 0}</div><div class="label">Lớp HP</div></div>
            <div class="stat-card"><div class="num">${tk.tong_dk || 0}</div><div class="label">Đăng ký</div></div>
            <div class="stat-card"><div class="num">${tk.tong_hp || 0}</div><div class="label">Học phần</div></div>
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
                    ${nk.map((r, i) => `<tr>
                        <td>${i + 1}</td><td>${r.nguoi_dung}</td>
                        <td><span class="badge badge-info">${r.hanh_dong}</span></td>
                        <td>${r.chi_tiet || ''}</td>
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

    el.innerHTML = `
        <div class="page-header"><h2>Truy vấn Phân tán Cấp cao</h2></div>
        <div class="card">
            <h3>Chọn kịch bản phân tán (Query qua 3 Node)</h3>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem;">
                <button class="btn btn-primary" onclick="runTruyVanPhanTan(1)">1. Lượt ĐK theo Cơ sở</button>
                <button class="btn btn-primary" onclick="runTruyVanPhanTan(2)">2. Học phần HOT nhất</button>
                <button class="btn btn-primary" onclick="runTruyVanPhanTan(3)">3. SV Đăng ký chéo</button>
                <button class="btn btn-primary" onclick="runTruyVanPhanTan(4)">4. Tỷ lệ lấp đầy</button>
                <button class="btn btn-primary" onclick="runTruyVanPhanTan(5)">5. Lớp mở theo Khoa</button>
            </div>
            <div id="pt-result">
                <div class="alert alert-info">Vui lòng bấm chọn một kịch bản ở trên để chạy truy vấn gộp qua Linked Server.</div>
            </div>
        </div>
    `;
}

window.runTruyVanPhanTan = async function (loai) {
    const resEl = document.getElementById('pt-result');
    resEl.innerHTML = '<div style="padding:2rem;text-align:center;"><span class="loader" style="border-color:#1a73e8; border-top-color:transparent; width:30px; height:30px;"></span><br><br>Đang Query qua các Linked Server (HD, CG, NT)...</div>';

    const pt = await api(`${API}/tru-van-phan-tan/${loai}`);

    if (pt.success && pt.data && pt.data.length > 0) {
        const cols = Object.keys(pt.data[0]);
        let thead = '<tr>' + cols.map(c => `<th>${c.toUpperCase()}</th>`).join('') + '</tr>';
        let tbody = pt.data.map(r => '<tr>' + cols.map(c => `<td>${r[c] !== null ? r[c] : ''}</td>`).join('') + '</tr>').join('');

        resEl.innerHTML = `
            <div class="table-wrap">
                <table>
                    <thead style="background:#1a73e8; color:white;">${thead}</thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>`;
    } else if (pt.success) {
        resEl.innerHTML = `<div class="alert alert-warning">Truy vấn thành công nhưng không có dữ liệu (0 rows).</div>`;
    } else {
        resEl.innerHTML = `
            <div class="alert alert-error">
                <strong>Lỗi Truy vấn Phân tán:</strong><br>${pt.message || 'Lỗi không xác định.'}
                <br><br><small><i>Gợi ý: Đảm bảo bạn đã cấu hình đủ 3 Linked Server tên là SITE_HD, SITE_CG, SITE_NT trên SQL Server.</i></small>
            </div>`;
    }
}

// ============================================================
//  DANG KY DAY (GIANG VIEN)
// ============================================================
let _dkDayData = [];

async function renderDangKyDay(el, user) {
    if (user.role !== 'giangvien') { el.innerHTML = '<p>Không có quyền.</p>'; return; }

    el.innerHTML = '<div class="page-loading">Đang tải dữ liệu...</div>';

    const [allLopHP, dsGiangVien, dsKhoa] = await Promise.all([
        api(`${API}/lop-hoc-phan`),
        api(`${API}/giang-vien`),
        api(`${API}/khoa`)
    ]);

    // Lấy thông tin khoa của giảng viên hiện tại
    const myInfo = (dsGiangVien || []).find(g => g.ma_gv === user.ma_gv) || {};
    const myKhoa = myInfo.ma_khoa || '';
    const myTenKhoa = myInfo.ten_khoa || 'Khoa của bạn';

    _dkDayData = allLopHP || [];

    const khoaOptions = dsKhoa.map(k =>
        `<option value="${k.ma_khoa}" ${k.ma_khoa === myKhoa ? 'selected' : ''}>${k.ten_khoa || k.ma_khoa}</option>`
    ).join('');

    el.innerHTML = `
        <div class="page-header">
            <h2>Đăng ký Lịch dạy</h2>
            <p><span class="badge badge-info">Mặc định: ${myTenKhoa}</span> (Bạn có thể xem khoa khác nhưng chỉ được đăng ký môn của khoa mình)</p>
        </div>
        <div id="dk-day-global-msg" style="margin-bottom: 1rem;"></div>

        <div class="card">
            <div class="form-row">
                <div class="form-group">
                    <label>Khoa</label>
                    <select id="dk-day-khoa">
                        <option value="">-- Tất cả các khoa --</option>
                        ${khoaOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tìm kiếm</label>
                    <input type="text" id="dk-day-search" placeholder="Mã / tên lớp HP...">
                </div>
            </div>
            <div class="table-wrap">
                <table id="dk-day-table">
                    <thead><tr>
                        <th>Mã LHP</th><th>Học phần</th><th>Cơ sở</th>
                        <th>HK</th><th>Giảng viên</th><th></th>
                    </tr></thead>
                    <tbody id="dk-day-tbody"></tbody>
                </table>
            </div>
        </div>`;

    renderDangKyDayTable(user.ma_gv);

    document.getElementById('dk-day-khoa').addEventListener('change', () => {
        renderDangKyDayTable(user.ma_gv);
    });
    document.getElementById('dk-day-search').addEventListener('input', () => {
        renderDangKyDayTable(user.ma_gv);
    });
}

function renderDangKyDayTable(ma_gv) {
    const search = (document.getElementById('dk-day-search')?.value || '').toLowerCase();
    const khoaFilter = document.getElementById('dk-day-khoa')?.value || '';

    const filtered = _dkDayData.filter(r => {
        if (khoaFilter && r.ma_khoa !== khoaFilter) return false;
        if (search && !r.ma_lop_hp.toLowerCase().includes(search) && !(r.ten_hoc_phan || '').toLowerCase().includes(search)) return false;
        return true;
    });

    document.getElementById('dk-day-tbody').innerHTML = filtered.map(r => {
        const lichRows = (r.lich_hoc || []).map(l =>
            `<span class="badge badge-info" style="margin:2px;display:inline-block">${l.thu} tiết ${l.tiet} · ${l.phong}</span>`
        ).join('');
        const lichDisplay = lichRows || '<span style="color:#999">—</span>';

        let actionBtn = '';
        if (r.ma_gv === ma_gv) {
            actionBtn = `<button class="btn btn-danger btn-sm" onclick="huyDay('${r.ma_lop_hp}')">Hủy dạy</button>`;
        } else if (!r.ma_gv) {
            actionBtn = `<button class="btn btn-primary btn-sm" onclick="dangKyDay('${r.ma_lop_hp}')">Đăng ký dạy</button>`;
        } else {
            actionBtn = `<span style="color:#999;font-size:0.8rem">Đã có GV</span>`;
        }

        return `
        <tr>
            <td><strong>${r.ma_lop_hp}</strong></td>
            <td>${r.ten_hoc_phan || r.ma_hp || ''}</td>
            <td>${r.ten_co_so || r.ma_co_so || ''}</td>
            <td>HK${r.hoc_ky || ''}</td>
            <td>${r.ten_giang_vien || '<i style="color:#999">Chưa có</i>'}</td>
            <td>${actionBtn}</td>
        </tr>
        <tr style="background:#f8f9fa">
            <td colspan="2" style="font-size:0.75rem;color:#666;padding-left:0.8rem"><strong>Lịch học:</strong></td>
            <td colspan="4" style="font-size:0.75rem;padding:0.3rem 0.8rem">${lichDisplay}</td>
        </tr>`;
    }).join('');
}

async function dangKyDay(ma_lop_hp) {
    const ma_gv = getUser()?.ma_gv;
    if (!ma_gv) return;

    if (!confirm(`Xác nhận ĐĂNG KÝ dạy lớp học phần ${ma_lop_hp}?`)) return;

    const msg = document.getElementById('dk-day-global-msg');
    msg.innerHTML = '<div class="alert alert-info">Đang xử lý đăng ký...</div>';

    const data = await api(`${API}/dang-ky-day`, {
        method: 'POST',
        body: JSON.stringify({ ma_gv, ma_lop_hp }),
    });

    if (data.success) {
        msg.innerHTML = `<div class="result-box success"><strong>Thành công!</strong><br>${data.message}</div>`;

        // Cập nhật lại dữ liệu
        const [allLopHP] = await Promise.all([
            api(`${API}/lop-hoc-phan`)
        ]);
        _dkDayData = allLopHP || [];

        renderDangKyDayTable(ma_gv);
    } else {
        msg.innerHTML = `<div class="result-box error"><strong>Thất bại!</strong><br>${data.message}</div>`;
    }
}

async function huyDay(ma_lop_hp) {
    const ma_gv = getUser()?.ma_gv;
    if (!ma_gv) return;

    if (!confirm(`Xác nhận HỦY dạy lớp học phần ${ma_lop_hp}?`)) return;

    const msg = document.getElementById('dk-day-global-msg');
    msg.innerHTML = '<div class="alert alert-info">Đang xử lý hủy...</div>';

    const data = await api(`${API}/huy-day`, {
        method: 'POST',
        body: JSON.stringify({ ma_gv, ma_lop_hp }),
    });

    if (data.success) {
        msg.innerHTML = `<div class="result-box success"><strong>Hủy thành công!</strong><br>${data.message}</div>`;

        // Cập nhật lại dữ liệu
        const [allLopHP] = await Promise.all([
            api(`${API}/lop-hoc-phan`)
        ]);
        _dkDayData = allLopHP || [];

        renderDangKyDayTable(ma_gv);
    } else {
        msg.innerHTML = `<div class="result-box error"><strong>Thất bại!</strong><br>${data.message}</div>`;
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
            <div class="card" style="padding: 0; overflow: hidden; border-radius: 8px;">
                ${generateTKBGrid(tkb, false)}
            </div>`;
    } else if (user.role === 'giangvien' && user.ma_gv) {
        const ld = await api(`${API}/lich-day/${user.ma_gv}`);
        el.innerHTML = `
            <div class="page-header"><h2>Lịch dạy — ${user.ten}</h2></div>
            <div class="card" style="padding: 0; overflow: hidden; border-radius: 8px;">
                ${generateTKBGrid(ld, true)}
            </div>`;
    } else {
        el.innerHTML = '<p>Không có thông tin lịch.</p>';
    }
}

function generateTKBGrid(tkbList, isGiangVien = false) {
    if (!tkbList || !tkbList.length) {
        return '<div style="padding: 30px; text-align: center; color: #888;">Chưa có lịch học/lịch dạy nào.</div>';
    }

    let matrix = Array.from({ length: 13 }, () => Array(9).fill(null));
    tkbList.forEach(r => {
        let thu = parseInt(r.thu);
        if (thu === 1) thu = 8; // Chủ nhật
        let tBatDau = parseInt(r.tiet_bat_dau);
        let tKetThuc = parseInt(r.tiet_ket_thuc);
        if (!tBatDau || !tKetThuc || !thu || tBatDau > 12) return;

        matrix[tBatDau][thu] = {
            rowspan: tKetThuc - tBatDau + 1,
            ten_hp: r.ten_hp,
            ma_lop_hp: r.ma_lop_hp,
            phong: r.ten_phong,
            gv: r.giang_vien,
            so_luong: r.so_luong
        };
        for (let i = tBatDau + 1; i <= tKetThuc; i++) {
            if (i <= 12) matrix[i][thu] = "SKIP";
        }
    });

    let html = `<style>
        .tkb-grid { width: 100%; border-collapse: collapse; min-width: 900px; background: white; }
        .tkb-grid th, .tkb-grid td { border: 1px solid #e0e0e0; padding: 5px; }
        .tkb-grid th { background: #f4f6f8; text-align: center; padding: 12px; font-weight: 600; color: #333; text-transform: uppercase; font-size: 0.85rem;}
        .tkb-grid td { height: 50px; text-align: center; vertical-align: top; }
        .tkb-cell { background: #e8f4fd; border-left: 4px solid #1976d2; padding: 10px; text-align: left; transition: transform 0.2s; cursor: pointer; }
        .tkb-cell:hover { background: #d0e7fa; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .tkb-subject { font-weight: 700; color: #1565c0; font-size: 0.95rem; margin-bottom: 6px; line-height: 1.3;}
        .tkb-code { font-size: 0.75rem; color: #555; background: #fff; padding: 3px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px; border: 1px solid #c9e1f5;}
        .tkb-info { font-size: 0.8rem; color: #444; margin-top: 2px; display: flex; align-items: center; gap: 4px;}
        .t-col { font-weight:700; background:#f9fafb !important; color:#555; width: 50px; vertical-align: middle !important; }
    </style>
    <div style="overflow-x: auto;">
        <table class="tkb-grid">
            <thead>
                <tr>
                    <th class="t-col">Tiết</th>
                    <th>Thứ 2</th><th>Thứ 3</th><th>Thứ 4</th><th>Thứ 5</th><th>Thứ 6</th><th>Thứ 7</th><th>Chủ Nhật</th>
                    <th class="t-col">Tiết</th>
                </tr>
            </thead>
            <tbody>`;

    for (let i = 1; i <= 12; i++) {
        html += `<tr><td class="t-col">${i}</td>`;
        for (let d = 2; d <= 8; d++) {
            let cell = matrix[i][d];
            if (cell === "SKIP") {
                // Do nothing, handled by rowspan
            } else if (cell) {
                html += `<td rowspan="${cell.rowspan}" class="tkb-cell">
                    <div class="tkb-subject">${cell.ten_hp || 'Lớp học phần'}</div>
                    <div class="tkb-code">${cell.ma_lop_hp}</div>
                    <div class="tkb-info">📍 ${cell.phong || 'Chưa xếp phòng'}</div>
                    ${isGiangVien ?
                        `<div class="tkb-info">👥 Sinh viên: <strong>${cell.so_luong || 0}</strong></div>` :
                        (cell.gv ? `<div class="tkb-info">👨‍🏫 ${cell.gv}</div>` : '')}
                </td>`;
            } else {
                html += `<td></td>`;
            }
        }
        html += `<td class="t-col">${i}</td></tr>`;
    }
    html += `</tbody></table></div>`;
    return html;
}

// ============================================================
//  BOOT
// ============================================================
async function renderDemoDongThoi(el, user) {
    if (user.role !== 'admin') {
        el.innerHTML = '<p>Không có quyền truy cập.</p>';
        return;
    }

    el.innerHTML = `
        <div class="card fade-in">
            <h2 style="color: #2c3e50; font-weight: 700;">CÔNG CỤ KIỂM THỬ XỬ LÝ ĐỒNG THỜI (CONCURRENCY CONTROL)</h2>
            <p>Hệ thống sử dụng kỹ thuật <b>Pessimistic Locking (UPDLOCK, HOLDLOCK)</b> ở mức cơ sở dữ liệu để ngăn chặn Race Condition. Công cụ này tạo ra các luồng gửi yêu cầu đồng thời ở cùng một thời điểm (mili-giây) để kiểm chứng cơ chế khóa.</p>
            <hr>
            
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 250px;">
                    <label><b>Mã Lớp học phần:</b></label>
                    <input type="text" id="demo-lop" class="form-control" value="LHP030">
                </div>
            </div>

            <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px;">
                <div class="form-group" style="flex: 1; min-width: 150px;">
                    <label>Sinh viên 1:</label>
                    <input type="text" id="demo-sv1" class="form-control" value="SV0001">
                </div>
                <div class="form-group" style="flex: 1; min-width: 150px;">
                    <label>Sinh viên 2:</label>
                    <input type="text" id="demo-sv2" class="form-control" value="SV0002">
                </div>
                <div class="form-group" style="flex: 1; min-width: 150px;">
                    <label>Sinh viên 3:</label>
                    <input type="text" id="demo-sv3" class="form-control" value="SV0003">
                </div>
            </div>

            <div class="form-group" style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn btn-primary" id="btn-run-demo" style="background: #1976d2; border:none; padding: 12px 20px; font-weight: bold;">
                    MÔ PHỎNG ĐĂNG KÝ ĐỒNG THỜI
                </button>
                <button class="btn btn-secondary" id="btn-reset-demo" style="background: #607d8b; color: white; border:none; padding: 12px 20px; font-weight: bold;">
                    🔄 LÀM SẠCH VÀ RESET VỀ 1/2 CHỖ
                </button>
            </div>

            <div id="demo-loading" class="hidden" style="margin: 15px 0;">
                <span class="loader"></span> Đang gửi yêu cầu song song đến máy chủ...
            </div>

            <div id="demo-result" style="margin-top: 20px;"></div>
        </div>
    `;

    document.getElementById('btn-run-demo').addEventListener('click', async () => {
        const maLop = document.getElementById('demo-lop').value.trim();
        const sv1 = document.getElementById('demo-sv1').value.trim();
        const sv2 = document.getElementById('demo-sv2').value.trim();
        const sv3 = document.getElementById('demo-sv3').value.trim();

        if (!maLop || !sv1 || !sv2 || !sv3) {
            return alert('Vui lòng nhập đầy đủ mã lớp và 3 mã sinh viên!');
        }

        const btn = document.getElementById('btn-run-demo');
        const loader = document.getElementById('demo-loading');
        const resultDiv = document.getElementById('demo-result');

        btn.disabled = true;
        loader.classList.remove('hidden');
        resultDiv.innerHTML = '';

        try {
            // Hiển thị khung bảng trước
            let html = '<table class="table" style="width:100%"><thead><tr><th>Sinh viên</th><th>Trạng thái</th><th>Kết quả trả về từ Hệ thống</th></tr></thead><tbody id="demo-tbody">';
            const sinhViens = [sv1, sv2, sv3];
            sinhViens.forEach(sv => {
                html += `<tr id="row-${sv}">
                            <td><b>${sv}</b></td>
                            <td><span class="loader" style="width: 15px; height: 15px; display: inline-block;"></span> Đang chờ...</td>
                            <td style="color: gray;">Đang xếp hàng trong SQL Server...</td>
                         </tr>`;
            });
            html += '</tbody></table>';
            resultDiv.innerHTML = html;

            // Bắn 3 Yêu cầu CÙNG MỘT LÚC nhưng xử lý kết quả ĐỘC LẬP (Ai xong trước hiện trước)
            const promises = sinhViens.map(sv => {
                return api(`${API}/dang-ky-demo`, { method: 'POST', body: JSON.stringify({ ma_sv: sv, ma_lop_hp: maLop }) })
                    .then(res => {
                        const tr = document.getElementById(`row-${sv}`);
                        if (res.success) {
                            tr.style.background = '#e8f5e9';
                            tr.innerHTML = `<td><b>${sv}</b></td>
                                            <td><span class="status-badge" style="background:#4caf50;color:white">THÀNH CÔNG</span></td>
                                            <td style="color:#2e7d32; font-weight:bold;">${res.message || 'Đăng ký thành công.'}</td>`;
                        } else {
                            tr.style.background = '#ffebee';
                            tr.innerHTML = `<td><b>${sv}</b></td>
                                            <td><span class="status-badge" style="background:#f44336;color:white">THẤT BẠI</span></td>
                                            <td style="color:#c62828;">${res.message}</td>`;
                        }
                    })
                    .catch(err => {
                        const tr = document.getElementById(`row-${sv}`);
                        tr.style.background = '#ffebee';
                        tr.innerHTML = `<td><b>${sv}</b></td>
                                        <td><span class="status-badge" style="background:red;color:white">LỖI</span></td>
                                        <td style="color:red;">${err.message}</td>`;
                    });
            });

            await Promise.all(promises);

        } catch (err) {
            resultDiv.innerHTML = `<p style="color:red">Lỗi: ${err.message}</p>`;
        } finally {
            btn.disabled = false;
            loader.classList.add('hidden');
        }
    });

    document.getElementById('btn-reset-demo').addEventListener('click', async () => {
        const maLop = document.getElementById('demo-lop').value.trim();
        const sv1 = document.getElementById('demo-sv1').value.trim();
        const sv2 = document.getElementById('demo-sv2').value.trim();
        const sv3 = document.getElementById('demo-sv3').value.trim();

        if (!maLop || !sv1 || !sv2 || !sv3) {
            return alert('Vui lòng nhập đầy đủ mã lớp và 3 mã sinh viên!');
        }

        if (!confirm(`Bạn có chắc muốn Reset lớp ${maLop} về 1/2 chỗ trống và XÓA đăng ký của 3 sinh viên này?`)) return;

        try {
            const btn = document.getElementById('btn-reset-demo');
            btn.disabled = true;
            btn.innerHTML = "Đang Reset...";

            const res = await api(`${API}/reset-demo`, {
                method: 'POST',
                body: JSON.stringify({ ma_lop_hp: maLop, sv1: sv1, sv2: sv2, sv3: sv3 })
            });

            if (res.success) {
                alert('✅ Đã Reset thành công! Sẵn sàng bắn 3 luồng test mới.');
                document.getElementById('demo-result').innerHTML = ''; // Xóa bảng cũ
            } else {
                alert('❌ Lỗi: ' + res.message);
            }
        } catch (err) {
            alert('Lỗi: ' + err.message);
        } finally {
            const btn = document.getElementById('btn-reset-demo');
            btn.disabled = false;
            btn.innerHTML = "🔄 LÀM SẠCH VÀ RESET VỀ 1/2 CHỖ";
        }
    });
}

document.addEventListener('DOMContentLoaded', router);
