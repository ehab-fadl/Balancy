/* ============================================================ */
/* 0. Helpers & Setup                                           */
/* ============================================================ */
const bnGet = (id) => document.getElementById(id);
const bnEndpoints = window.BALANCY_ENDPOINTS || {};

function showToast(type, title, message, duration = 3500) {
    const el = bnGet('notificationToast');
    if (!el) return;
    const icon = bnGet('toastIcon');
    const ttl = bnGet('toastTitle');
    const msg = bnGet('toastMessage');

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    el.className = 'toast-custom';
    el.classList.remove('show');

    const icons = { success: '<i class="fa-solid fa-circle-check"></i>', error: '<i class="fa-solid fa-circle-xmark"></i>', info: '<i class="fa-solid fa-circle-info"></i>' };
    el.classList.add(`toast-${type}`);
    if (icon) icon.innerHTML = icons[type] || icons.info;
    if (ttl) ttl.textContent = title;
    if (msg) msg.textContent = message;

    void el.offsetWidth;
    el.classList.add('show');
    window.toastTimeout = setTimeout(() => el.classList.remove('show'), duration);
}

const bnApi = {
    async _request(url, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // إضافة Antiforgery Token إذا كان موجوداً
        if (window.BALANCY_ANTIFORGERY) {
            headers['RequestVerificationToken'] = window.BALANCY_ANTIFORGERY;
        }

        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }

        if (!res.ok) {
            console.error('API Error Response:', data); // سيطبع تفاصيل الخطأ في الـ Console
            throw new Error((data && (data.error || data.detail || data.message)) || `HTTP ${res.status}`);
        }
        return data;
    },
    async getAppointments() { return this._request(bnEndpoints.getAppointments); },
    async getPatients() { return this._request('/Doctor/AllPatient/AllPatientListe?handler=Patients'); },
    async create(data) { return this._request(bnEndpoints.create, { method: 'POST', body: JSON.stringify(data) }); },
    async confirm(id) { return this._request(`${bnEndpoints.confirm}&id=${id}`, { method: 'PUT', body: '{}' }); },
    async delete(id) { return this._request(`${bnEndpoints.delete}&id=${id}`, { method: 'POST', body: '{}' }); }
};
function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]}`;
}

function formatTime(timeStr) {
    if (!timeStr) return '--:--';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'م' : 'ص'}`;
}

/* ============================================================ */
/* 1. State                                                     */
/* ============================================================ */
let allPatients = [];
let currentApts = [];
let currentFilter = 'all';
let currentSearch = '';
let pendingDeleteId = null;

/* ============================================================ */
/* 2. Data Loading                                              */
/* ============================================================ */
async function loadData() {
    try {
        // 1. جلب المرضى لتعبئة القائمة المنسدلة
        const pRaw = await bnApi.getPatients();
        const pArr = pRaw?.data?.$values || pRaw?.data || pRaw || [];
        allPatients = Array.isArray(pArr) ? pArr : [];

        const select = bnGet('aptPatientId');
        if (select) {
            select.innerHTML = '<option value="">-- اختر المريض --</option>';
            allPatients.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.firstName} ${p.lastName} (${p.code || 'بدون كود'})</option>`;
            });
        }

        // 2. جلب المواعيد
        const aRaw = await bnApi.getAppointments();
        const aArr = aRaw?.data?.appointments || aRaw?.appointments || aRaw?.data?.$values || aRaw?.data || aRaw || [];
        currentApts = Array.isArray(aArr) ? aArr : [];

        render();
    } catch (err) {
        console.error('❌ فشل تحميل البيانات:', err);
        showToast('error', 'خطأ', 'تعذر تحميل المواعيد أو المرضى.');
    }
}

/* ============================================================ */
/* 3. Render                                                    */
/* ============================================================ */
function render() {
    const container = bnGet('appointmentsContainer');
    if (!container) return;

    let filtered = [...currentApts];

    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(a => (a.patientName || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q));
    }

    const todayStr = getTodayString();

    if (currentFilter === 'today') filtered = filtered.filter(a => a.scheduledDate?.startsWith(todayStr));
    else if (currentFilter === 'upcoming') filtered = filtered.filter(a => a.scheduledDate > todayStr);
    else if (currentFilter === 'overdue') filtered = filtered.filter(a => a.scheduledDate < todayStr && a.status === 'Pending');
    else if (currentFilter === 'past') filtered = filtered.filter(a => a.status === 'Completed' || a.status === 'Cancelled');

    // إحصائيات
    if (bnGet('statToday')) bnGet('statToday').textContent = currentApts.filter(a => a.scheduledDate?.startsWith(todayStr)).length;
    if (bnGet('statWeek')) bnGet('statWeek').textContent = currentApts.filter(a => a.scheduledDate >= todayStr).length;
    if (bnGet('statMonth')) bnGet('statMonth').textContent = currentApts.length;
    if (bnGet('statOverdue')) bnGet('statOverdue').textContent = currentApts.filter(a => a.scheduledDate < todayStr && a.status === 'Pending').length;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>لا توجد مواعيد</h3><p>قم بإضافة موعد جديد.</p></div>`;
        return;
    }

    container.innerHTML = '';
    filtered.forEach(apt => {
        const isConfirmed = apt.status === 'Confirmed';
        const card = document.createElement('div');
        card.className = `appointment-card`;

        card.innerHTML = `
            <div class="apt-datetime">
                <div class="apt-date">${formatDate(apt.scheduledDate)}</div>
                <div class="apt-time">${formatTime(apt.scheduledTime)}</div>
            </div>
            <div class="apt-info">
                <p class="apt-patient"><i class="fa-solid fa-user"></i> ${apt.patientName}</p>
                <p class="apt-reason">${apt.reason}</p>
            </div>
            <span class="apt-status-badge apt-status-${isConfirmed ? 'today' : 'upcoming'}">
                ${isConfirmed ? 'مؤكد' : 'معلق'}
            </span>
            <div class="apt-actions">
                ${!isConfirmed ? `<button type="button" class="apt-btn" onclick="confirmApt('${apt.id}')" title="تأكيد"><i class="fa-solid fa-check" style="color:green"></i></button>` : ''}
                <button type="button" class="apt-btn delete" onclick="openDelete('${apt.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

/* ============================================================ */
/* 4. Actions                                                   */
/* ============================================================ */
window.confirmApt = async (id) => {
    try {
        await bnApi.confirm(id);
        showToast('success', 'تم', 'تم تأكيد الموعد.');
        loadData();
    } catch (err) { showToast('error', 'خطأ', err.message); }
};

window.openDelete = (id) => {
    pendingDeleteId = id;
    bnGet('confirmModal').classList.add('show');
};

bnGet('confirmDelete')?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
        await bnApi.delete(pendingDeleteId);
        showToast('success', 'تم', 'تم حذف الموعد.');
        bnGet('confirmModal').classList.remove('show');
        loadData();
    } catch (err) { showToast('error', 'خطأ', err.message); }
});

bnGet('confirmCancel')?.addEventListener('click', () => {
    bnGet('confirmModal').classList.remove('show');
});

/* ============================================================ */
/* 5. Form Submit (Save)                                        */
/* ============================================================ */
bnGet('appointmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = bnGet('aptPatientId').value;
    const date = bnGet('aptDate').value;
    const time = bnGet('aptTime').value;
    const reason = bnGet('aptReason').value;
    const notes = bnGet('aptNotes').value;
    const btn = bnGet('saveBtn');

    if (!patientId || !date || !time || !reason) {
        showToast('error', 'ناقص', 'يرجى ملء الحقول المطلوبة.'); return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
        await bnApi.create({
            patientId: patientId,
            scheduledDate: new Date(date).toISOString(),
            scheduledTime: time,
            reason: reason,
            notes: notes,
            visitType: "متابعة",
            visitLocation: "عيادة"
        });
        showToast('success', 'تم', 'تم حفظ الموعد بنجاح.');
        bnGet('appointmentModal').classList.remove('show');
        loadData();
    } catch (err) {
        showToast('error', 'فشل', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ الموعد';
    }
});

/* ============================================================ */
/* 6. Events & Init                                             */
/* ============================================================ */
bnGet('addAppointmentBtn')?.addEventListener('click', () => {
    bnGet('appointmentForm').reset();
    bnGet('aptDate').value = getTodayString();
    bnGet('appointmentModal').classList.add('show');
});

bnGet('cancelBtn')?.addEventListener('click', () => bnGet('appointmentModal').classList.remove('show'));
bnGet('searchInput')?.addEventListener('input', (e) => { currentSearch = e.target.value; render(); });
bnGet('filterStatus')?.addEventListener('change', (e) => { currentFilter = e.target.value; render(); });

window.addEventListener('DOMContentLoaded', loadData);