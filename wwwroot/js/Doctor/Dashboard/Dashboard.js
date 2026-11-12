/* ============================================================
   0. Safe DOM Helpers
============================================================ */
const bnGet = (id) => document.getElementById(id);

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

/* ============================================================
   1. Toast
============================================================ */
let toastTimeoutId = null;

function showToast(type, title, message, duration = 3500) {
    const el = bnGet('notificationToast');
    if (!el) return;

    const icon = bnGet('toastIcon');
    const ttl = bnGet('toastTitle');
    const msg = bnGet('toastMessage');

    if (toastTimeoutId) clearTimeout(toastTimeoutId);

    el.className = 'toast toast-custom';
    el.classList.remove('show');

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

    void el.offsetWidth;
    el.classList.add('show');

    toastTimeoutId = setTimeout(() => el.classList.remove('show'), duration);
}

/* ============================================================
   2. API Client
============================================================ */
const bnEndpoints = window.BALANCY_ENDPOINTS || {
    dashboard: '?handler=Dashboard',
    todayAppointments: '?handler=TodayAppointments',
    patientFile: '/Doctor',
    alertsPage: '/Doctor/Alerts/Alert',
    allPatientsPage: '/Doctor/AllPatient/AllPatientListe',
    statisticsPage: '/Doctor/ClinicStatistics/ClinicStatistics'
};

const bnApi = {
    async _request(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }

        if (!res.ok) {
            const msg = (data && (data.error || data.detail || data.message)) || `HTTP ${res.status}`;
            const e = new Error(msg);
            e.status = res.status;
            throw e;
        }
        return data;
    },

    async getDashboard() {
        return this._request(bnEndpoints.dashboard);
    },

    async getTodayAppointments() {
        return this._request(bnEndpoints.todayAppointments);
    }
};

/* ============================================================
   3. Mapper
============================================================ */
function pickValue(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) {
        const v = obj[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
}

function pickNumber(obj, keys, fallback = 0) {
    const v = pickValue(obj, keys);
    if (v === undefined || v === null || v === '') return fallback;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? fallback : n;
}

function pickArray(obj, keys) {
    const v = pickValue(obj, keys);
    return Array.isArray(v) ? v : [];
}

function pickString(obj, keys, fallback = '') {
    const v = pickValue(obj, keys);
    if (v === undefined || v === null) return fallback;
    return String(v);
}

function unwrapResponse(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    // ServiceResult: { success, data, errors }
    if (raw.data !== undefined && raw.data !== null && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
        return raw.data;
    }
    if (raw.result && typeof raw.result === 'object' && !Array.isArray(raw.result)) return raw.result;
    if (raw.value && typeof raw.value === 'object' && !Array.isArray(raw.value)) return raw.value;
    return raw;
}

/**
 * يحوّل DashboardDto من الـ API إلى شكل العرض.
 */
function mapDashboard(raw) {
    raw = unwrapResponse(raw);
    if (!raw || typeof raw !== 'object') return null;

    // ─── Welcome ───
    const welcome = {
        doctorName: pickString(raw, ['doctorName', 'DoctorName'], 'الطبيب'),
        todayDate: pickValue(raw, ['todayDate', 'TodayDate']) || new Date().toISOString(),
        greetingText: pickString(raw, ['greetingText', 'GreetingText'], 'أتمنى لك يوماً موفقاً')
    };

    // ─── Quick Stats ───
    const stats = {
        todayAppointments: pickNumber(raw, ['todayAppointmentsCount', 'TodayAppointmentsCount']),
        todayAppointmentsChange: pickNumber(raw, ['todayAppointmentsChangeFromYesterday', 'TodayAppointmentsChangeFromYesterday']),
        totalPatients: pickNumber(raw, ['totalPatients', 'TotalPatients']),
        totalPatientsChangePercent: pickNumber(raw, ['totalPatientsChangePercent', 'TotalPatientsChangePercent']),
        criticalPatients: pickNumber(raw, ['criticalPatients', 'CriticalPatients']),
        criticalPatientsChange: pickNumber(raw, ['criticalPatientsChangeFromYesterday', 'CriticalPatientsChangeFromYesterday']),
        newPatients: pickNumber(raw, ['newPatientsThisMonth', 'NewPatientsThisMonth']),
        newPatientsChange: pickNumber(raw, ['newPatientsChangeFromLastMonth', 'NewPatientsChangeFromLastMonth'])
    };

    // ─── Today Appointments ───
    const appointmentsRaw = pickArray(raw, ['todayAppointments', 'TodayAppointments']);
    const appointments = appointmentsRaw.map(apt => {
        if (!apt || typeof apt !== 'object') return null;
        const id = pickValue(apt, ['id', 'Id']);
        if (!id) return null;

        const patientName = pickString(apt, ['patientName', 'PatientName'], 'غير محدد');
        return {
            id: String(id),
            patientId: pickValue(apt, ['patientId', 'PatientId']) || '',
            patientName: patientName,
            patientInitials: pickString(apt, ['patientInitials', 'PatientInitials']) ||
                patientName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
            time: pickString(apt, ['scheduledTime', 'ScheduledTime'], ''),
            reason: pickString(apt, ['reason', 'Reason'], 'زيارة'),
            status: (pickString(apt, ['status', 'Status'], 'pending')).toLowerCase()
        };
    }).filter(Boolean);

    // ─── Alerts ───
    const alertsRaw = pickArray(raw, ['activeAlerts', 'ActiveAlerts']);
    const alerts = alertsRaw.map(a => {
        if (!a || typeof a !== 'object') return null;
        const id = pickValue(a, ['id', 'Id']);
        if (!id) return null;
        return {
            id: String(id),
            level: (pickString(a, ['level', 'Level'], 'info')).toLowerCase(),
            title: pickString(a, ['title', 'Title'], 'تنبيه'),
            message: pickString(a, ['message', 'Message'], ''),
            patientName: pickString(a, ['patientName', 'PatientName'], ''),
            createdAt: pickValue(a, ['createdAt', 'CreatedAt']) || new Date().toISOString()
        };
    }).filter(Boolean);

    // ─── Recent Patients ───
    const patientsRaw = pickArray(raw, ['recentPatients', 'RecentPatients']);
    const recentPatients = patientsRaw.map(p => {
        if (!p || typeof p !== 'object') return null;
        const id = pickValue(p, ['id', 'Id']);
        if (!id) return null;
        const fullName = pickString(p, ['fullName', 'FullName'], 'غير محدد');
        return {
            id: String(id),
            fullName: fullName,
            code: pickString(p, ['patientCode', 'PatientCode'], '-'),
            initials: pickString(p, ['initials', 'Initials']) ||
                fullName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
            createdAt: pickValue(p, ['createdAt', 'CreatedAt']) || new Date().toISOString(),
            lastDiagnosis: pickString(p, ['lastDiagnosis', 'LastDiagnosis'], '')
        };
    }).filter(Boolean);

    return {
        welcome, stats, appointments, alerts, recentPatients,
        totalActiveAlerts: pickNumber(raw, ['totalActiveAlerts', 'TotalActiveAlerts'], alerts.length)
    };
}

/* ============================================================
   4. State
============================================================ */
let dashboardData = null;
let isLoading = false;

/* ============================================================
   5. Utilities
============================================================ */
function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function getTimeAgo(dateStr) {
    if (!dateStr) return 'الآن';
    const date = new Date(dateStr);
    if (isNaN(date)) return 'الآن';
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`;
    return date.toLocaleDateString('ar-EG');
}

/* ============================================================
   6. Fallback — جلب المواعيد مباشرة من /api/Appointments
   يتجاوز مشكلة DateTime.UtcNow.Date في DashboardService
============================================================ */
function extractArrayFromResponse(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    // فك تغليف ServiceResult
    let arr = raw.data ?? raw.result ?? raw.value ?? raw;

    // فك $values (Newtonsoft ReferenceLoopHandling)
    if (arr?.$values && Array.isArray(arr.$values)) arr = arr.$values;
    if (arr?.data?.$values && Array.isArray(arr.data.$values)) arr = arr.data.$values;

    if (Array.isArray(arr)) return arr;

    // ابحث في أي حقل
    if (raw && typeof raw === 'object') {
        for (const k of Object.keys(raw)) {
            if (Array.isArray(raw[k])) return raw[k];
            if (raw[k]?.$values && Array.isArray(raw[k].$values)) return raw[k].$values;
        }
    }
    return [];
}

function normalizeDateStr(input) {
    if (!input) return '';
    const s = String(input);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

async function fetchTodayAppointmentsFallback() {
    try {
        const raw = await bnApi.getTodayAppointments();
        console.log('📋 Raw appointments response:', raw);

        const arr = extractArrayFromResponse(raw);
        console.log(`📋 Total appointments in DB: ${arr.length}`);

        if (arr.length === 0) {
            console.warn('⚠️ لا توجد مواعيد في DB لهذا الطبيب');
            return [];
        }

        // ✅ فلترة اليوم بمرونة (نقبل اليوم بتوقيت UTC واليوم المحلي)
        const now = new Date();
        const utcTodayStr = now.toISOString().slice(0, 10);
        const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const localTodayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;

        const acceptableDates = new Set([utcTodayStr, localTodayStr]);

        // 🔍 طباعة تواريخ كل المواعيد للتشخيص
        console.log(`🔍 [DIAG] UTC today = ${utcTodayStr} | Local today = ${localTodayStr}`);
        arr.forEach((a, i) => {
            const d = a.scheduledDate ?? a.ScheduledDate ?? a.date ?? a.Date ?? '';
            console.log(`  [${i}] Id=${a.id ?? a.Id} | ScheduledDate=${d} | Time=${a.scheduledTime ?? a.ScheduledTime} | Status=${a.status ?? a.Status}`);
        });

        const todayAppointments = arr.filter(a => {
            const rawDate = a.scheduledDate ?? a.ScheduledDate ?? a.date ?? a.Date ?? '';
            const dateStr = normalizeDateStr(rawDate);
            return acceptableDates.has(dateStr);
        });

        console.log(`📅 المواعيد المطابقة لليوم: ${todayAppointments.length}`);

        return todayAppointments.map(a => {
            const patientName = a.patientName ?? a.PatientName ??
                (a.patient ? `${a.patient.firstName ?? ''} ${a.patient.lastName ?? ''}`.trim() : 'غير محدد');
            const patientId = a.patientId ?? a.PatientId ?? '';
            const scheduledTime = a.scheduledTime ?? a.ScheduledTime ?? '';

            return {
                id: String(a.id ?? a.Id ?? ''),
                patientId: patientId,
                patientName: patientName || 'غير محدد',
                patientInitials: patientName
                    .split(' ').filter(Boolean)
                    .map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?',
                time: scheduledTime,
                reason: a.reason ?? a.Reason ?? 'زيارة',
                status: (a.status ?? a.Status ?? 'pending').toString().toLowerCase()
            };
        });
    } catch (err) {
        console.error('❌ فشل جلب المواعيد (fallback):', err);
        return [];
    }
}

/* ============================================================
   7. Update Welcome Header
============================================================ */
function updateWelcomeHeader() {
    if (!dashboardData) return;

    const doctorNameEl = bnGet('doctorName');
    if (doctorNameEl) doctorNameEl.textContent = `د. ${dashboardData.welcome.doctorName}`;

    const todayDateEl = bnGet('todayDate');
    if (todayDateEl) {
        const date = new Date(dashboardData.welcome.todayDate);
        if (!isNaN(date)) {
            const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            todayDateEl.textContent = `${days[date.getDay()]}، ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        }
    }

    const greetingEl = bnGet('greetingText');
    if (greetingEl && dashboardData.welcome.greetingText) {
        greetingEl.textContent = dashboardData.welcome.greetingText;
    }
}

/* ============================================================
   8. Animated Numbers
============================================================ */
function animateNumber(el, target, duration = 1200) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        el.textContent = current;

        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }

    requestAnimationFrame(update);
}

function updateStats() {
    if (!dashboardData) return;
    const s = dashboardData.stats;

    animateNumber(bnGet('statTodayAppointments'), s.todayAppointments);
    animateNumber(bnGet('statTotalPatients'), s.totalPatients);
    animateNumber(bnGet('statCriticalPatients'), s.criticalPatients);
    animateNumber(bnGet('statNewPatients'), s.newPatients);

    const todayChangeEl = document.querySelector('.stat-card.primary .stat-change');
    if (todayChangeEl) {
        const change = s.todayAppointmentsChange;
        todayChangeEl.className = `stat-change ${change >= 0 ? 'up' : 'down'}`;
        todayChangeEl.innerHTML = `<i class="fa-solid fa-arrow-${change >= 0 ? 'up' : 'down'}"></i> ${change >= 0 ? '+' : ''}${change}`;
    }

    const totalChangeEl = document.querySelector('.stat-card.success .stat-change');
    if (totalChangeEl) {
        const change = s.totalPatientsChangePercent;
        totalChangeEl.className = `stat-change ${change >= 0 ? 'up' : 'down'}`;
        totalChangeEl.innerHTML = `<i class="fa-solid fa-arrow-${change >= 0 ? 'up' : 'down'}"></i> ${change >= 0 ? '+' : ''}${change}%`;
    }

    const criticalChangeEl = document.querySelector('.stat-card.danger .stat-change');
    if (criticalChangeEl) {
        const change = s.criticalPatientsChange;
        criticalChangeEl.className = `stat-change ${change >= 0 ? 'up' : 'down'}`;
        criticalChangeEl.innerHTML = `<i class="fa-solid fa-arrow-${change >= 0 ? 'up' : 'down'}"></i> ${change >= 0 ? '+' : ''}${change}`;
    }

    const newChangeEl = document.querySelector('.stat-card.warning .stat-change');
    if (newChangeEl) {
        const change = s.newPatientsChange;
        newChangeEl.className = `stat-change ${change >= 0 ? 'up' : 'down'}`;
        newChangeEl.innerHTML = `<i class="fa-solid fa-arrow-${change >= 0 ? 'up' : 'down'}"></i> ${change >= 0 ? '+' : ''}${change}`;
    }
}

/* ============================================================
   9. Render Appointments
============================================================ */
function renderAppointments() {
    const container = bnGet('appointmentsList');
    if (!container || !dashboardData) return;

    container.innerHTML = '';
    const appointments = dashboardData.appointments;

    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-mini">
                <i class="fa-solid fa-calendar-xmark"></i>
                <p>لا توجد مواعيد اليوم</p>
            </div>
        `;
        const count = bnGet('appointmentsCount');
        if (count) count.textContent = '0 مواعيد';
        return;
    }

    appointments.forEach((apt, index) => {
        const el = document.createElement('div');
        el.className = 'appointment-item';
        el.style.animation = `slideUpFade 0.4s ease ${index * 0.05}s backwards`;

        const statusIcon = apt.status === 'confirmed' ? 'fa-check' :
            apt.status === 'cancelled' ? 'fa-xmark' : 'fa-clock';
        const statusClass = apt.status === 'confirmed' ? 'confirmed' :
            apt.status === 'cancelled' ? 'cancelled' : 'pending';
        const isCritical = apt.reason && /طارئة|عاجل|emergency/i.test(apt.reason);

        el.innerHTML = `
            <div class="appointment-time">${escapeHtml(apt.time || '—')}</div>
            <div class="appointment-info">
                <p class="appointment-name">${escapeHtml(apt.patientName)}</p>
                <div class="appointment-meta">
                    <span class="appointment-type">
                        <i class="fa-solid fa-tag"></i>
                        ${escapeHtml(apt.reason)}
                    </span>
                    ${isCritical ? '<span style="color: var(--bn-danger); font-weight: 900;"><i class="fa-solid fa-circle-exclamation"></i> عاجل</span>' : ''}
                </div>
            </div>
            <div class="appointment-status ${statusClass}">
                <i class="fa-solid ${statusIcon}"></i>
            </div>
        `;

        el.addEventListener('click', () => {
            if (apt.patientId) {
                window.location.href = `${bnEndpoints.patientFile}?patientId=${encodeURIComponent(apt.patientId)}`;
            } else {
                showToast('info', 'موعد مريض', `${apt.patientName} — ${apt.time}`, 2500);
            }
        });

        container.appendChild(el);
    });

    const count = bnGet('appointmentsCount');
    if (count) count.textContent = `${appointments.length} مواعيد`;
}

/* ============================================================
   10. Render Alerts Widget
============================================================ */
function renderAlerts() {
    const container = bnGet('alertsWidget');
    if (!container || !dashboardData) return;

    container.innerHTML = '';
    const alerts = dashboardData.alerts;

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="empty-mini">
                <i class="fa-solid fa-check-circle"></i>
                <p>لا توجد تنبيهات نشطة</p>
            </div>
        `;
        const count = bnGet('alertsCount');
        if (count) count.textContent = '0 تنبيهات';
        return;
    }

    const levelIcon = {
        critical: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    alerts.forEach((alert, index) => {
        const el = document.createElement('div');
        el.className = `alert-item ${alert.level}`;
        el.style.animation = `slideUpFade 0.4s ease ${index * 0.05}s backwards`;

        el.innerHTML = `
            <div class="alert-dot"></div>
            <div class="alert-content">
                <p class="alert-title">
                    <i class="fa-solid ${levelIcon[alert.level] || 'fa-bell'}"></i>
                    ${escapeHtml(alert.title)}
                </p>
                <p class="alert-desc">${escapeHtml(alert.message)}</p>
            </div>
        `;

        el.addEventListener('click', () => {
            window.location.href = bnEndpoints.alertsPage;
        });

        container.appendChild(el);
    });

    const count = bnGet('alertsCount');
    if (count) count.textContent = `${alerts.length} تنبيهات`;
}

/* ============================================================
   11. Render Recent Patients
============================================================ */
function renderRecentPatients() {
    const container = bnGet('recentPatientsList');
    if (!container || !dashboardData) return;

    container.innerHTML = '';
    const patients = dashboardData.recentPatients;

    if (patients.length === 0) {
        container.innerHTML = `
            <div class="empty-mini">
                <i class="fa-solid fa-user-slash"></i>
                <p>لا يوجد مرضى بعد</p>
            </div>
        `;
        return;
    }

    patients.forEach((p, index) => {
        const el = document.createElement('div');
        el.className = 'patient-item';
        el.style.animation = `slideUpFade 0.4s ease ${index * 0.05}s backwards`;

        el.innerHTML = `
            <div class="patient-avatar">${escapeHtml(p.initials || '?')}</div>
            <div class="patient-info">
                <p class="patient-name">${escapeHtml(p.fullName)}</p>
                <div class="patient-meta">
                    <span><i class="fa-solid fa-hashtag"></i> ${escapeHtml(p.code)}</span>
                    ${p.lastDiagnosis ? `<span>· ${escapeHtml(p.lastDiagnosis)}</span>` : ''}
                    <span>· ${escapeHtml(getTimeAgo(p.createdAt))}</span>
                </div>
            </div>
        `;

        el.addEventListener('click', () => {
            window.location.href = `${bnEndpoints.patientFile}?patientId=${encodeURIComponent(p.id)}`;
        });

        container.appendChild(el);
    });
}

/* ============================================================
   12. Events
============================================================ */
document.addEventListener('click', (e) => {

    if (e.target.closest('#addPatientBtn')) {
        e.preventDefault();
        showToast('info', 'إضافة مريض', 'سيتم نقلك لصفحة إضافة مريض جديد...', 2500);
        return;
    }

    if (e.target.closest('#viewAlertsBtn')) {
        e.preventDefault();
        window.location.href = bnEndpoints.alertsPage;
        return;
    }

    const quickAction = e.target.closest('.quick-action-card');
    if (quickAction) {
        e.preventDefault();
        const action = quickAction.dataset.action;
        const routes = {
            'add-patient': null,
            'new-session': null,
            'search-patient': bnEndpoints.allPatientsPage,
            'view-stats': bnEndpoints.statisticsPage
        };
        if (routes[action]) {
            window.location.href = routes[action];
        } else {
            showToast('info', 'إجراء سريع', 'هذه الميزة ستُضاف قريباً.', 2500);
        }
        return;
    }

    if (e.target.closest('.see-all')) {
        e.preventDefault();
        window.location.href = bnEndpoints.allPatientsPage;
        return;
    }
});

/* ============================================================
   13. Load Dashboard from API
============================================================ */
async function loadDashboard() {
    if (isLoading) return;
    isLoading = true;

    try {
        const raw = await bnApi.getDashboard();
        console.log('📦 Dashboard API response:', raw);
        console.log('🔍 Keys:', raw && typeof raw === 'object' ? Object.keys(raw) : '—');

        dashboardData = mapDashboard(raw);
        console.log('✅ Mapped dashboard:', dashboardData);

        if (!dashboardData) {
            console.warn('⚠️ استجابة غير صالحة — استخدام fallback فارغ');
            dashboardData = mapDashboard({}) || {
                welcome: { doctorName: 'الطبيب', todayDate: new Date().toISOString(), greetingText: '' },
                stats: { todayAppointments: 0, todayAppointmentsChange: 0, totalPatients: 0, totalPatientsChangePercent: 0, criticalPatients: 0, criticalPatientsChange: 0, newPatients: 0, newPatientsChange: 0 },
                appointments: [], alerts: [], recentPatients: [], totalActiveAlerts: 0
            };
        }

        // ✅ Fallback: إذا لم تُرجع Dashboard مواعيد، اجلبها مباشرة من /api/Appointments
        if (dashboardData.appointments.length === 0) {
            console.log('⚠️ Dashboard أعاد 0 مواعيد — محاولة fallback من /api/Appointments...');
            const fallbackApts = await fetchTodayAppointmentsFallback();
            if (fallbackApts.length > 0) {
                dashboardData.appointments = fallbackApts;
                dashboardData.stats.todayAppointments = fallbackApts.length;
                console.log(`✅ Fallback نجح: ${fallbackApts.length} موعد`);
            } else {
                console.log('ℹ️ Fallback أيضاً لم يجد مواعيد لليوم');
            }
        }

        updateWelcomeHeader();
        updateStats();
        renderAppointments();
        renderAlerts();
        renderRecentPatients();

        showToast('success', 'مرحباً بك',
            `نظرة سريعة على ${dashboardData.stats.todayAppointments} موعد و ${dashboardData.alerts.length} تنبيه نشط.`, 4500);

    } catch (err) {
        console.error('❌ فشل تحميل لوحة التحكم:', err);
        showToast('error', 'فشل التحميل',
            `[${err?.status ?? '?'}] ${err.message || 'تعذر الاتصال بلوحة التحكم'}`, 6000);
    } finally {
        isLoading = false;
    }
}

/* ============================================================
   14. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 بدء تشغيل لوحة التحكم...');

    bnGet('statTodayAppointments')?.replaceChildren(document.createTextNode('…'));
    bnGet('statTotalPatients')?.replaceChildren(document.createTextNode('…'));
    bnGet('statCriticalPatients')?.replaceChildren(document.createTextNode('…'));
    bnGet('statNewPatients')?.replaceChildren(document.createTextNode('…'));

    loadDashboard();

    console.log('%c✅ Doctor Dashboard Loaded (API-driven + Fallback)',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
});