/* ============================================================
   0. Safe DOM Helpers — بأسماء فريدة لتجنّب تعارض jQuery
============================================================ */
const bnGet = (id) => document.getElementById(id);
const bnOn = (id, event, handler) => {
    const el = bnGet(id);
    if (el) el.addEventListener(event, handler);
};
const bnSetText = (id, text) => {
    const el = bnGet(id);
    if (el) el.textContent = text;
};

/* ============================================================
   1. Theme
============================================================ */
const bnTheme = {
    init() { this.apply(localStorage.getItem('balancy_theme') || 'light'); },
    apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('balancy_theme', t);
    },
    toggle() {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        this.apply(next);
        return next;
    }
};

/* ============================================================
   2. Toast
============================================================ */
let toastTimeoutId = null, toastHideTimeoutId = null;

function showToast(type, title, message, duration = 3500) {
    const el = bnGet('notificationToast');
    if (!el) return;

    const icon = bnGet('toastIcon');
    const ttl = bnGet('toastTitle');
    const msg = bnGet('toastMessage');
    const bar = bnGet('toastProgressBar');

    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    if (toastHideTimeoutId) clearTimeout(toastHideTimeoutId);

    el.className = 'toast toast-custom';
    el.classList.remove('show', 'hiding');

    if (type === 'success') {
        el.classList.add('toast-success');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else if (type === 'error') {
        el.classList.add('toast-error');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    } else if (type === 'warning') {
        el.classList.add('toast-warning');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
        el.classList.add('toast-info');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }

    if (ttl) ttl.textContent = title;
    if (msg) msg.textContent = message;

    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '100%';
    }

    void el.offsetWidth;
    el.classList.add('show');

    if (bar) {
        setTimeout(() => {
            bar.style.transition = `width ${duration}ms linear`;
            bar.style.width = '0%';
        }, 50);
    }

    toastTimeoutId = setTimeout(hideToast, duration);
}

function hideToast() {
    const el = bnGet('notificationToast');
    if (!el || !el.classList.contains('show')) return;
    el.classList.add('hiding');
    toastHideTimeoutId = setTimeout(() => el.classList.remove('show', 'hiding'), 280);
}

/* ============================================================
   3. Confetti
============================================================ */
const bnConfetti = {
    colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],
    fire(duration = 2000) {
        const el = bnGet('bnConfetti');
        if (!el) return;
        el.innerHTML = '';
        el.classList.add('active');
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 0.5 + 's';
            p.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
            p.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
            p.style.transform = `rotate(${Math.random() * 360}deg)`;
            el.appendChild(p);
        }
        setTimeout(() => {
            el.classList.remove('active');
            el.innerHTML = '';
        }, duration);
    }
};

/* ============================================================
   4. Mock Patients Data
============================================================ */
const mockPatients = [
    { id: 1, firstName: 'أحمد', lastName: 'محمد علي', code: 'AB123456', age: 32, dateOfBirth: '1992-05-15', gender: 'male', phone: '+49 151 12345678', email: 'ahmed@example.com', city: 'برلين', address: 'شارع المثال 25', maritalStatus: 'متزوج', status: 'active', diagnosis: 'اكتئاب متوسط', medications: 2, visits: 8, lastVisit: '2024-01-15', nextVisit: '2024-02-15', riskLevel: 'low', createdAt: '2023-06-10' },
    { id: 2, firstName: 'سارة', lastName: 'عبدالله حسن', code: 'CD234567', age: 27, dateOfBirth: '1997-08-22', gender: 'female', phone: '+49 152 23456789', email: 'sara@example.com', city: 'هامبورغ', address: 'شارع النور 12', maritalStatus: 'عزباء', status: 'active', diagnosis: 'قلق عام', medications: 1, visits: 5, lastVisit: '2024-01-20', nextVisit: '2024-02-20', riskLevel: 'low', createdAt: '2023-08-15' },
    { id: 3, firstName: 'خالد', lastName: 'إبراهيم سالم', code: 'EF345678', age: 41, dateOfBirth: '1983-03-10', gender: 'male', phone: '+49 153 34567890', email: 'khaled@example.com', city: 'ميونخ', address: 'شارع الأمل 8', maritalStatus: 'متزوج', status: 'critical', diagnosis: 'اكتئاب حاد مع أفكار انتحارية', medications: 4, visits: 15, lastVisit: '2024-01-25', nextVisit: '2024-02-01', riskLevel: 'high', createdAt: '2023-03-20' },
    { id: 4, firstName: 'فاطمة', lastName: 'حسن مصطفى', code: 'GH456789', age: 23, dateOfBirth: '2001-11-05', gender: 'female', phone: '+49 154 45678901', email: 'fatima@example.com', city: 'كولونيا', address: 'شارع السلام 33', maritalStatus: 'عزباء', status: 'active', diagnosis: 'اكتئاب خفيف', medications: 1, visits: 3, lastVisit: '2024-01-18', nextVisit: '2024-02-18', riskLevel: 'low', createdAt: '2023-11-10' },
    { id: 5, firstName: 'عمر', lastName: 'يوسف النجار', code: 'IJ567890', age: 35, dateOfBirth: '1989-07-12', gender: 'male', phone: '+49 155 56789012', email: 'omar@example.com', city: 'فرانكفورت', address: 'شارع الوحدة 5', maritalStatus: 'متزوج', status: 'inactive', diagnosis: 'اضطراب ثنائي القطب', medications: 3, visits: 12, lastVisit: '2023-12-10', nextVisit: null, riskLevel: 'medium', createdAt: '2023-05-01' },
    { id: 6, firstName: 'مريم', lastName: 'سعيد رمضان', code: 'KL678901', age: 26, dateOfBirth: '1998-02-28', gender: 'female', phone: '+49 156 67890123', email: 'mariam@example.com', city: 'شتوتغارت', address: 'شارع النصر 17', maritalStatus: 'متزوجة', status: 'active', diagnosis: 'اكتئاب ما بعد الولادة', medications: 2, visits: 6, lastVisit: '2024-01-22', nextVisit: '2024-02-05', riskLevel: 'medium', createdAt: '2023-09-15' }
];

let allPatients = [...mockPatients];
let filteredPatients = [...allPatients];
let currentView = 'grid';
let pendingDeleteId = null;
let currentDetailsPatientId = null;

/* ============================================================
   5. Utilities
============================================================ */
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}
function getInitials(f, l) { return (f?.charAt(0) || '') + (l?.charAt(0) || ''); }
function getGenderText(g) { return g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : '-'; }
function getStatusText(s) { return { active: 'نشط', critical: 'حرج', inactive: 'غير نشط' }[s] || 'غير معروف'; }
function getStatusIcon(s) { return { active: 'fa-circle-check', critical: 'fa-triangle-exclamation', inactive: 'fa-circle-pause' }[s] || 'fa-circle'; }
function formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}
function getRiskBadgeClass(l) { return { high: 'danger', medium: 'warning', low: 'success' }[l] || 'primary'; }
function getRiskText(l) { return { high: 'مرتفع', medium: 'متوسط', low: 'منخفض' }[l] || 'غير محدد'; }

/* ============================================================
   6. Statistics
============================================================ */
function updateStatistics() {
    const total = allPatients.length;
    const active = allPatients.filter(p => p.status === 'active').length;
    const critical = allPatients.filter(p => p.status === 'critical').length;

    const now = new Date();
    const visitsThisMonth = allPatients.filter(p => {
        if (!p.lastVisit) return false;
        const d = new Date(p.lastVisit);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    bnSetText('statTotal', total);
    bnSetText('statActive', active);
    bnSetText('statCritical', critical);
    bnSetText('statVisits', visitsThisMonth);
}

/* ============================================================
   7. Filters
============================================================ */
function applyFilters() {
    const searchEl = bnGet('globalSearch');
    const genderEl = bnGet('filterGender');
    const statusEl = bnGet('filterStatus');
    const sortEl = bnGet('filterSort');

    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const g = genderEl ? genderEl.value : '';
    const s = statusEl ? statusEl.value : '';
    const sort = sortEl ? sortEl.value : 'name';

    filteredPatients = allPatients.filter(p => {
        const mQ = !q ||
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.phone && p.phone.toLowerCase().includes(q)) ||
            (p.city && p.city.toLowerCase().includes(q));
        const mG = !g || p.gender === g;
        const mS = !s || p.status === s;
        return mQ && mG && mS;
    });

    filteredPatients.sort((a, b) => {
        switch (sort) {
            case 'name': return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'ar');
            case 'nameDesc': return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`, 'ar');
            case 'dateNewest': return new Date(b.createdAt) - new Date(a.createdAt);
            case 'dateOldest': return new Date(a.createdAt) - new Date(b.createdAt);
            case 'ageAsc': return a.age - b.age;
            case 'ageDesc': return b.age - a.age;
            default: return 0;
        }
    });

    render();
    updateResultsText();
    toggleResetButton();
}

function updateResultsText() {
    const count = filteredPatients.length;
    const total = allPatients.length;
    let text = '';
    if (count === total) text = `عرض جميع المرضى (${count})`;
    else if (count === 0) text = 'لا توجد نتائج مطابقة';
    else text = `عرض ${count} من أصل ${total} مريض`;
    bnSetText('resultsText', text);
}

function toggleResetButton() {
    const searchEl = bnGet('globalSearch');
    const genderEl = bnGet('filterGender');
    const statusEl = bnGet('filterStatus');
    const sortEl = bnGet('filterSort');

    const has = (searchEl && searchEl.value.trim() !== '') ||
        (genderEl && genderEl.value !== '') ||
        (statusEl && statusEl.value !== '') ||
        (sortEl && sortEl.value !== 'name');

    const btn = bnGet('resetFilters');
    if (btn) btn.classList.toggle('d-none', !has);
}

/* ============================================================
   8. Render
============================================================ */
function render() {
    const grid = bnGet('patientsGrid');
    const tbody = bnGet('patientsTableBody');
    const empty = bnGet('emptyState');
    const gridView = bnGet('patientsGridView');
    const tableView = bnGet('patientsTableView');

    if (filteredPatients.length === 0) {
        if (grid) grid.innerHTML = '';
        if (tbody) tbody.innerHTML = '';
        if (empty) empty.classList.remove('d-none');
        if (gridView) gridView.classList.add('d-none');
        if (tableView) tableView.classList.add('d-none');
        return;
    }

    if (empty) empty.classList.add('d-none');

    if (currentView === 'grid') {
        if (gridView) gridView.classList.remove('d-none');
        if (tableView) tableView.classList.add('d-none');
        renderGrid();
    } else {
        if (gridView) gridView.classList.add('d-none');
        if (tableView) tableView.classList.remove('d-none');
        renderTable();
    }
}

function renderGrid() {
    const grid = bnGet('patientsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    filteredPatients.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = `patient-card status-${p.status}`;
        card.style.animationDelay = `${i * 0.05}s`;
        card.dataset.id = p.id;
        card.innerHTML = `
            <div class="patient-card-header">
                <div class="patient-avatar-large">
                    ${getInitials(p.firstName, p.lastName)}
                    <span class="patient-status-dot status-${p.status}"></span>
                </div>
                <div class="patient-card-info">
                    <h3 class="patient-card-name">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</h3>
                    <span class="patient-card-code"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(p.code)}</span>
                </div>
            </div>
            <div class="patient-card-details">
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-cake-candles"></i> العمر</span>
                    <span class="detail-item-value">${p.age} سنة</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-venus-mars"></i> الجنس</span>
                    <span class="detail-item-value">${getGenderText(p.gender)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-phone"></i> الهاتف</span>
                    <span class="detail-item-value">${escapeHtml(p.phone)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-city"></i> المدينة</span>
                    <span class="detail-item-value">${escapeHtml(p.city)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-stethoscope"></i> التشخيص</span>
                    <span class="detail-item-value">${escapeHtml(p.diagnosis)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-calendar-check"></i> آخر زيارة</span>
                    <span class="detail-item-value">${formatDate(p.lastVisit)}</span>
                </div>
            </div>
            <div class="patient-card-footer">
                <span class="patient-card-status status-${p.status}">
                    <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                    ${getStatusText(p.status)}
                </span>
                <div class="patient-card-actions">
                    <button type="button" class="action-btn action-view" data-action="view" data-id="${p.id}" title="عرض"><i class="fa-solid fa-eye"></i></button>
                    <button type="button" class="action-btn action-edit" data-action="edit" data-id="${p.id}" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="action-btn action-delete" data-action="delete" data-id="${p.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderTable() {
    const tbody = bnGet('patientsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredPatients.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="table-patient-cell">
                    <div class="table-avatar">${getInitials(p.firstName, p.lastName)}</div>
                    <div>
                        <p class="table-patient-name">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</p>
                        <p class="table-patient-sub">${escapeHtml(p.diagnosis)}</p>
                    </div>
                </div>
            </td>
            <td><span class="table-code">${escapeHtml(p.code)}</span></td>
            <td>${p.age}</td>
            <td>${getGenderText(p.gender)}</td>
            <td>${escapeHtml(p.phone)}</td>
            <td>${escapeHtml(p.city)}</td>
            <td>
                <span class="patient-card-status status-${p.status}">
                    <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                    ${getStatusText(p.status)}
                </span>
            </td>
            <td>${formatDate(p.lastVisit)}</td>
            <td>
                <div class="table-actions">
                    <button type="button" class="action-btn action-view" data-action="view" data-id="${p.id}"><i class="fa-solid fa-eye"></i></button>
                    <button type="button" class="action-btn action-edit" data-action="edit" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="action-btn action-delete" data-action="delete" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/* ============================================================
   9. Actions
============================================================ */
function editPatient(id) {
    showToast('info', 'تعديل المريض', 'سيتم فتح صفحة التعديل...');
}

function openDeleteModal(id) {
    const p = allPatients.find(x => x.id === id);
    if (!p) return;

    pendingDeleteId = id;
    const msgEl = bnGet('deleteModalMessage');
    if (msgEl) {
        msgEl.innerHTML = `هل أنت متأكد من حذف المريض <strong>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</strong> نهائياً من النظام؟`;
    }
    const input = bnGet('deleteConfirmInput');
    if (input) input.value = '';
    const btn = bnGet('deleteConfirmBtn');
    if (btn) btn.disabled = true;
    const modal = bnGet('deleteModal');
    if (modal) modal.classList.add('show');
    if (input) setTimeout(() => input.focus(), 150);
}

function closeDeleteModal() {
    const modal = bnGet('deleteModal');
    if (modal) modal.classList.remove('show');
    pendingDeleteId = null;
    const input = bnGet('deleteConfirmInput');
    if (input) input.value = '';
    const btn = bnGet('deleteConfirmBtn');
    if (btn) btn.disabled = true;
}

function confirmDelete() {
    if (!pendingDeleteId) return;
    const p = allPatients.find(x => x.id === pendingDeleteId);
    if (!p) return;

    allPatients = allPatients.filter(x => x.id !== pendingDeleteId);
    closeDeleteModal();
    applyFilters();
    updateStatistics();
    bnConfetti.fire();
    showToast('success', 'تم الحذف بنجاح', `تم حذف المريض ${p.firstName} ${p.lastName} نهائياً من النظام.`, 4500);
}

/* ============================================================
   10. Details Modal
============================================================ */
function openDetails(id) {
    const p = allPatients.find(x => x.id === id);
    if (!p) return;

    currentDetailsPatientId = id;

    const subtitle = bnGet('detailsModalSubtitle');
    if (subtitle) subtitle.textContent = `${p.firstName} ${p.lastName} · ${p.code}`;

    const body = bnGet('detailsModalBody');
    if (!body) return;

    body.innerHTML = `
        <div class="details-header-card">
            <div class="details-avatar">${getInitials(p.firstName, p.lastName)}</div>
            <div class="details-header-info">
                <h4>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</h4>
                <p><i class="fa-solid fa-hashtag"></i> ${escapeHtml(p.code)} · ${p.age} سنة · ${getGenderText(p.gender)}</p>
            </div>
            <span class="details-badge badge-${getRiskBadgeClass(p.riskLevel)}">
                <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                ${getStatusText(p.status)}
            </span>
        </div>
        <div class="details-section-title"><i class="fa-solid fa-user"></i> المعلومات الشخصية</div>
        <div class="details-grid">
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-phone"></i></div>
                <div class="details-item-content"><span class="details-item-label">الهاتف</span><span class="details-item-value">${escapeHtml(p.phone)}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-envelope"></i></div>
                <div class="details-item-content"><span class="details-item-label">البريد</span><span class="details-item-value">${escapeHtml(p.email)}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-city"></i></div>
                <div class="details-item-content"><span class="details-item-label">المدينة</span><span class="details-item-value">${escapeHtml(p.city)}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-heart"></i></div>
                <div class="details-item-content"><span class="details-item-label">الحالة الاجتماعية</span><span class="details-item-value">${escapeHtml(p.maritalStatus)}</span></div>
            </div>
            <div class="details-item" style="grid-column: 1 / -1;">
                <div class="details-item-icon"><i class="fa-solid fa-location-dot"></i></div>
                <div class="details-item-content"><span class="details-item-label">العنوان</span><span class="details-item-value">${escapeHtml(p.address)}</span></div>
            </div>
        </div>
        <div class="details-section-title"><i class="fa-solid fa-notes-medical"></i> المعلومات الطبية</div>
        <div class="details-grid">
            <div class="details-item" style="grid-column: 1 / -1;">
                <div class="details-item-icon"><i class="fa-solid fa-stethoscope"></i></div>
                <div class="details-item-content"><span class="details-item-label">التشخيص</span><span class="details-item-value">${escapeHtml(p.diagnosis)}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-pills"></i></div>
                <div class="details-item-content"><span class="details-item-label">الأدوية</span><span class="details-item-value">${p.medications} دواء</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-calendar-check"></i></div>
                <div class="details-item-content"><span class="details-item-label">الزيارات</span><span class="details-item-value">${p.visits} زيارة</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-clock"></i></div>
                <div class="details-item-content"><span class="details-item-label">آخر زيارة</span><span class="details-item-value">${formatDate(p.lastVisit)}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-calendar-plus"></i></div>
                <div class="details-item-content"><span class="details-item-label">الزيارة القادمة</span><span class="details-item-value">${p.nextVisit ? formatDate(p.nextVisit) : 'غير محدد'}</span></div>
            </div>
        </div>
        <div class="details-section-title"><i class="fa-solid fa-shield-heart"></i> مؤشرات الحالة</div>
        <div class="details-badges">
            <span class="details-badge badge-${getRiskBadgeClass(p.riskLevel)}">
                <i class="fa-solid fa-triangle-exclamation"></i>
                مستوى الخطورة: ${getRiskText(p.riskLevel)}
            </span>
            <span class="details-badge badge-${p.status === 'active' ? 'success' : p.status === 'critical' ? 'danger' : 'warning'}">
                <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                ${getStatusText(p.status)}
            </span>
            <span class="details-badge badge-primary">
                <i class="fa-solid fa-calendar"></i>
                مسجّل من: ${formatDate(p.createdAt)}
            </span>
        </div>
    `;

    const modal = bnGet('detailsModal');
    if (modal) modal.classList.add('show');
}

function closeDetailsModal() {
    const modal = bnGet('detailsModal');
    if (modal) modal.classList.remove('show');
    currentDetailsPatientId = null;
}

/* ============================================================
   11. Event Delegation — جميع الأحداث في مكان واحد
============================================================ */
document.addEventListener('click', (e) => {

    // زر الوضع الليلي
    if (e.target.closest('#themeToggle')) {
        e.preventDefault();
        const t = bnTheme.toggle();
        showToast('success', 'تغيير المظهر', t === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري');
        return;
    }

    // زر إغلاق Toast
    if (e.target.closest('#toastCloseBtn')) {
        e.preventDefault();
        hideToast();
        return;
    }

    // زر إغلاق نافذة التفاصيل (X)
    if (e.target.closest('#detailsCloseBtn')) {
        e.preventDefault();
        closeDetailsModal();
        return;
    }

    // زر إغلاق نافذة التفاصيل (في الأسفل)
    if (e.target.closest('#detailsCloseFooterBtn')) {
        e.preventDefault();
        closeDetailsModal();
        return;
    }

    // زر فتح الملف الطبي
    if (e.target.closest('#detailsOpenFileBtn')) {
        e.preventDefault();
        if (!currentDetailsPatientId) return;
        const p = allPatients.find(x => x.id === currentDetailsPatientId);
        if (!p) return;
        closeDetailsModal();
        showToast('info', 'فتح الملف الطبي', `جارٍ فتح ملف: ${p.firstName} ${p.lastName}`, 3000);
        return;
    }

    // زر حذف مريض
    const deleteBtn = e.target.closest('.action-btn.action-delete');
    if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        openDeleteModal(parseInt(deleteBtn.dataset.id));
        return;
    }

    // زر عرض تفاصيل
    const viewBtn = e.target.closest('.action-btn.action-view');
    if (viewBtn) {
        e.preventDefault();
        e.stopPropagation();
        openDetails(parseInt(viewBtn.dataset.id));
        return;
    }

    // زر تعديل
    const editBtn = e.target.closest('.action-btn.action-edit');
    if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        editPatient(parseInt(editBtn.dataset.id));
        return;
    }

    // نقر على البطاقة
    const patientCard = e.target.closest('.patient-card');
    if (patientCard && !e.target.closest('.action-btn')) {
        openDetails(parseInt(patientCard.dataset.id));
        return;
    }

    // زر تبديل العرض
    const viewToggleBtn = e.target.closest('.view-btn');
    if (viewToggleBtn) {
        e.preventDefault();
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        viewToggleBtn.classList.add('active');
        currentView = viewToggleBtn.dataset.view;
        render();
        return;
    }

    // زر مسح البحث
    if (e.target.closest('#clearSearch')) {
        e.preventDefault();
        const searchEl = bnGet('globalSearch');
        const clearBtn = bnGet('clearSearch');
        if (searchEl) searchEl.value = '';
        if (clearBtn) clearBtn.classList.add('d-none');
        applyFilters();
        return;
    }

    // زر إعادة تعيين
    if (e.target.closest('#resetFilters') || e.target.closest('#emptyResetBtn')) {
        e.preventDefault();
        resetFilters();
        return;
    }

    // زر إلغاء الحذف
    if (e.target.closest('#deleteCancelBtn')) {
        e.preventDefault();
        closeDeleteModal();
        return;
    }

    // زر تأكيد الحذف
    if (e.target.closest('#deleteConfirmBtn')) {
        e.preventDefault();
        confirmDelete();
        return;
    }

    // خلفية modal الحذف
    if (e.target.id === 'deleteModal') {
        closeDeleteModal();
        return;
    }

    // خلفية modal التفاصيل
    if (e.target.id === 'detailsModal') {
        closeDetailsModal();
        return;
    }
});

/* ============================================================
   12. Input Events — Delegation
============================================================ */
document.addEventListener('input', (e) => {
    if (e.target.id === 'deleteConfirmInput') {
        const btn = bnGet('deleteConfirmBtn');
        if (btn) btn.disabled = e.target.value.trim() !== 'حذف';
    }
    if (e.target.id === 'globalSearch') {
        const clearBtn = bnGet('clearSearch');
        if (clearBtn) clearBtn.classList.toggle('d-none', e.target.value === '');
        applyFilters();
    }
});

/* ============================================================
   13. Change Events — Delegation
============================================================ */
document.addEventListener('change', (e) => {
    if (['filterGender', 'filterStatus', 'filterSort'].includes(e.target.id)) {
        applyFilters();
    }
});

/* ============================================================
   14. Keyboard Shortcuts
============================================================ */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDeleteModal();
        closeDetailsModal();
    }
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    if (ctrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchEl = bnGet('globalSearch');
        if (searchEl) {
            searchEl.focus();
            searchEl.select();
        }
    }
});

/* ============================================================
   15. Reset Filters Function
============================================================ */
function resetFilters() {
    const searchEl = bnGet('globalSearch');
    const genderEl = bnGet('filterGender');
    const statusEl = bnGet('filterStatus');
    const sortEl = bnGet('filterSort');
    const clearBtn = bnGet('clearSearch');

    if (searchEl) searchEl.value = '';
    if (genderEl) genderEl.value = '';
    if (statusEl) statusEl.value = '';
    if (sortEl) sortEl.value = 'name';
    if (clearBtn) clearBtn.classList.add('d-none');
    applyFilters();
    showToast('info', 'تم إعادة التعيين', 'تم إعادة تعيين جميع الفلاتر.');
}

/* ============================================================
   16. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    bnTheme.init();
    updateStatistics();
    applyFilters();

    setTimeout(() => {
        showToast('info', 'مرحباً بك', `يوجد حالياً ${allPatients.length} مريض مسجّل في النظام.`, 4500);
    }, 800);

    console.log('%c✅ All Patients Page Loaded',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
});