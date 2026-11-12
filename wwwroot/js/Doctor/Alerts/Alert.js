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
   1. Toast System
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

    toastTimeoutId = setTimeout(() => {
        el.classList.remove('show');
    }, duration);
}

/* ============================================================
   2. API Client
============================================================ */
const bnEndpoints = window.BALANCY_ENDPOINTS || {
    alerts: '?handler=Alerts',
    refresh: '?handler=Refresh',
    dismiss: '?handler=Dismiss',
    dismissAll: '?handler=DismissAll'
};

const bnApi = {
    _headers(extra = {}) {
        const h = {
            'Accept': 'application/json',
            'X-Requested-With': 'fetch',
            ...extra
        };
        // ✅ إضافة Anti-Forgery Token لكل طلب
        if (window.BALANCY_ANTIFORGERY) {
            h['RequestVerificationToken'] = window.BALANCY_ANTIFORGERY;
        }
        return h;
    },

    async _request(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            headers: this._headers(options.headers || {})
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

    async getAlerts() {
        return this._request(bnEndpoints.alerts);
    },

    async refresh() {
        return this._request(bnEndpoints.refresh, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'   // ✅ body صالح لـ POST
        });
    },

    async dismiss(id) {
        if (!id) throw new Error('معرّف التنبيه مطلوب');
        const sep = bnEndpoints.dismiss.includes('?') ? '&' : '?';
        return this._request(`${bnEndpoints.dismiss}${sep}id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
    },

    async dismissAll() {
        return this._request(bnEndpoints.dismissAll, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
    }
};
/* ============================================================
   3. Mapper — توحيد البيانات
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

function unwrapResponse(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data;
    if (raw.result && typeof raw.result === 'object' && !Array.isArray(raw.result)) return raw.result;
    return raw;
}

/**
 * يحوّل AlertDto من الـ API إلى شكل العرض.
 */
function mapAlertDto(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const id = pickValue(raw, ['id', 'Id']);
    if (!id) return null;

    const level = String(pickValue(raw, ['level', 'Level']) || 'info').toLowerCase();
    const validLevel = ['critical', 'warning', 'info'].includes(level) ? level : 'info';

    // icon حسب level (لأن الـ AlertDto لا يحتوي icon)
    const iconMap = {
        critical: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    return {
        id: String(id),
        ruleId: pickValue(raw, ['ruleId', 'RuleId']) || '',
        level: validLevel,
        icon: iconMap[validLevel],
        title: pickValue(raw, ['title', 'Title']) || 'تنبيه',
        message: pickValue(raw, ['message', 'Message']) || '',
        actionLabel: pickValue(raw, ['actionLabel', 'ActionLabel']) || 'عرض',
        patientId: pickValue(raw, ['patientId', 'PatientId']) || '',
        patientName: pickValue(raw, ['patientName', 'PatientName']) || 'غير محدد',
        patientCode: pickValue(raw, ['patientCode', 'PatientCode']) || '-',
        isDismissed: pickValue(raw, ['isDismissed', 'IsDismissed']) === true,
        createdAt: pickValue(raw, ['createdAt', 'CreatedAt']) || new Date().toISOString()
    };
}

/**
 * يحوّل AlertsSummaryDto كامل.
 */
function mapAlertsSummary(raw) {
    raw = unwrapResponse(raw);
    if (!raw || typeof raw !== 'object') {
        return { alerts: [], criticalCount: 0, warningCount: 0, infoCount: 0, lastUpdated: new Date().toISOString() };
    }

    const alertsRaw = pickArray(raw, ['alerts', 'Alerts']);
    const alerts = alertsRaw.map(mapAlertDto).filter(Boolean);

    return {
        alerts,
        criticalCount: pickNumber(raw, ['criticalCount', 'CriticalCount']),
        warningCount: pickNumber(raw, ['warningCount', 'WarningCount']),
        infoCount: pickNumber(raw, ['infoCount', 'InfoCount']),
        lastUpdated: pickValue(raw, ['lastUpdated', 'LastUpdated']) || new Date().toISOString()
    };
}

/* ============================================================
   4. State
============================================================ */
let currentFilter = 'all';
let currentSummary = { alerts: [], criticalCount: 0, warningCount: 0, infoCount: 0, lastUpdated: null };
let isLoading = false;
let dismissInProgress = new Set();

/* ============================================================
   5. Helper Functions
============================================================ */
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
   6. Render
============================================================ */
function render() {
    const container = bnGet('alertsContainer');
    if (!container) {
        console.warn('⚠️ حاوية التنبيهات غير موجودة');
        return;
    }

    const alerts = currentSummary.alerts;
    const critical = currentSummary.criticalCount || alerts.filter(a => a.level === 'critical').length;
    const warning = currentSummary.warningCount || alerts.filter(a => a.level === 'warning').length;
    const info = currentSummary.infoCount || alerts.filter(a => a.level === 'info').length;
    const total = alerts.length;

    // ─── تحديث الإحصائيات
    const statCritical = bnGet('statCritical');
    const statWarning = bnGet('statWarning');
    const statInfo = bnGet('statInfo');
    const countAll = bnGet('countAll');
    const countCritical = bnGet('countCritical');
    const countWarning = bnGet('countWarning');
    const countInfo = bnGet('countInfo');

    if (statCritical) statCritical.textContent = critical;
    if (statWarning) statWarning.textContent = warning;
    if (statInfo) statInfo.textContent = info;
    if (countAll) countAll.textContent = total;
    if (countCritical) countCritical.textContent = critical;
    if (countWarning) countWarning.textContent = warning;
    if (countInfo) countInfo.textContent = info;

    // ─── تمييز بطاقة الإحصائية النشطة
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.toggle('active-filter', card.dataset.filterStat === currentFilter);
    });

    // ─── الفلترة
    let filtered = alerts;
    if (currentFilter !== 'all') {
        filtered = alerts.filter(a => a.level === currentFilter);
    }

    if (filtered.length === 0) {
        const emptyMsg = currentFilter === 'all'
            ? 'لا توجد تنبيهات نشطة — جميع المرضى في حالة مستقرة.'
            : `لا توجد تنبيهات من نوع "${currentFilter === 'critical' ? 'حرجة' : currentFilter === 'warning' ? 'مهمة' : 'معلومات'}" حالياً.`;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fa-solid fa-check-circle"></i>
                </div>
                <h3>لا توجد تنبيهات</h3>
                <p>${escapeHtml(emptyMsg)}</p>
            </div>
        `;
        return;
    }

    // ─── رسم البطاقات
    container.innerHTML = '';
    filtered.forEach((alert, index) => {
        const card = document.createElement('div');
        card.className = `alert-card level-${alert.level}`;
        card.style.animationDelay = `${index * 0.05}s`;

        const levelText = {
            critical: 'حرج',
            warning: 'مهم',
            info: 'معلومة'
        }[alert.level];

        card.innerHTML = `
            <div class="alert-icon">
                <i class="fa-solid ${alert.icon}"></i>
            </div>

            <div class="alert-content">
                <div class="alert-header">
                    <h3 class="alert-title">${escapeHtml(alert.title)}</h3>
                    <span class="alert-level-badge ${alert.level}">
                        <i class="fa-solid fa-circle"></i>
                        ${levelText}
                    </span>
                </div>

                <div class="alert-message">${escapeHtml(alert.message)}</div>

                <div class="alert-meta">
                    <span class="alert-meta-item">
                        <i class="fa-solid fa-user"></i>
                        ${escapeHtml(alert.patientName)}
                    </span>
                    <span class="alert-meta-item">
                        <i class="fa-solid fa-hashtag"></i>
                        ${escapeHtml(alert.patientCode)}
                    </span>
                    <span class="alert-time">
                        <i class="fa-regular fa-clock"></i>
                        ${escapeHtml(getTimeAgo(alert.createdAt))}
                    </span>
                </div>

                <div class="alert-actions">
                    <button type="button" class="alert-action-btn alert-action-primary"
                            data-action="goto" data-patient-id="${escapeHtml(alert.patientId)}" data-patient-name="${escapeHtml(alert.patientName)}">
                        <i class="fa-solid fa-arrow-left"></i>
                        ${escapeHtml(alert.actionLabel)}
                    </button>
                    <button type="button" class="alert-action-btn alert-action-ghost"
                            data-action="dismiss" data-alert-id="${escapeHtml(alert.id)}">
                        <i class="fa-solid fa-check"></i>
                        تم الاطلاع
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

/* ============================================================
   7. Actions
============================================================ */
function handleAction(patientId, patientName) {
    if (!patientId) {
        showToast('warning', 'لا يوجد مريض', 'التنبيه غير مرتبط بمريض محدد.', 3000);
        return;
    }
    showToast('success', 'فتح الملف الطبي', `جارٍ فتح ملف: ${patientName}`, 3000);
    setTimeout(() => {
        window.location.href = `/Doctor?patientId=${encodeURIComponent(patientId)}`;
    }, 500);
}

async function dismissAlert(alertId) {
    if (!alertId) return;
    if (dismissInProgress.has(alertId)) return;
    dismissInProgress.add(alertId);

    try {
        await bnApi.dismiss(alertId);
        // ✅ إزالة محلياً + تحديث العداد
        currentSummary.alerts = currentSummary.alerts.filter(a => a.id !== alertId);
        render();
        showToast('info', 'تم الاطلاع', 'تم نقل التنبيه إلى المُتجاهَلة.', 2500);
    } catch (err) {
        console.error('❌ فشل تجاهل التنبيه:', err);
        showToast('error', 'فشل التجاهل', `[${err?.status ?? '?'}] ${err.message || 'تعذر تجاهل التنبيه'}`, 5000);
    } finally {
        dismissInProgress.delete(alertId);
    }
}

async function dismissAll() {
    const count = currentSummary.alerts.length;
    if (count === 0) {
        showToast('info', 'لا توجد تنبيهات', 'لا يوجد ما يمكن تجاهله.', 2500);
        return;
    }

    try {
        await bnApi.dismissAll();
        currentSummary.alerts = [];
        render();
        showToast('success', 'تم تجاهل الكل', `تم تجاهل ${count} تنبيه بنجاح.`, 3000);
    } catch (err) {
        console.error('❌ فشل تجاهل الكل:', err);
        showToast('error', 'فشل التجاهل', `[${err?.status ?? '?'}] ${err.message || 'تعذر تجاهل التنبيهات'}`, 5000);
    }
}

async function refreshAlerts() {
    if (isLoading) return;
    isLoading = true;

    try {
        // ✅ 1. أعد توليد التنبيهات على السيرفر
        await bnApi.refresh();
        // ✅ 2. اجلب القائمة المحدّثة
        const raw = await bnApi.getAlerts();
        currentSummary = mapAlertsSummary(raw);
        render();
        updateLastUpdate(currentSummary.lastUpdated);

        showToast('success', 'تم التحديث', `تم إعادة توليد ${currentSummary.alerts.length} تنبيه.`, 3000);
    } catch (err) {
        console.error('❌ فشل تحديث التنبيهات:', err);
        showToast('error', 'فشل التحديث', `[${err?.status ?? '?'}] ${err.message || 'تعذر تحديث التنبيهات'}`, 5000);
    } finally {
        isLoading = false;
    }
}

function resetAll() {
    // "استعادة المُتجاهَلة" = إعادة توليد التنبيهات من السيرفر (لأن التجاهل محفوظ في DB)
    refreshAlerts();
}

function updateLastUpdate(lastUpdated) {
    const el = bnGet('lastUpdate');
    if (!el) return;
    if (!lastUpdated) {
        el.textContent = 'الآن';
        return;
    }
    const date = new Date(lastUpdated);
    if (isNaN(date)) {
        el.textContent = 'الآن';
        return;
    }
    el.textContent = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

/* ============================================================
   8. Events — Event Delegation
============================================================ */
document.addEventListener('click', (e) => {

    // فلترة التبويبات
    const filterTab = e.target.closest('.filter-tab');
    if (filterTab) {
        e.preventDefault();
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        filterTab.classList.add('active');
        currentFilter = filterTab.dataset.filter;
        render();
        return;
    }

    // بطاقات الإحصائيات
    const statCard = e.target.closest('.stat-card');
    if (statCard && !e.target.closest('.filter-tab')) {
        e.preventDefault();
        const filter = statCard.dataset.filterStat;
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === filter);
        });
        currentFilter = filter;
        render();
        return;
    }

    // زر "تجاهل الكل"
    if (e.target.closest('#dismissAllBtn')) {
        e.preventDefault();
        dismissAll();
        return;
    }

    // زر "استعادة"
    if (e.target.closest('#resetAllBtn')) {
        e.preventDefault();
        resetAll();
        return;
    }

    // زر الإجراء على التنبيه
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
        e.preventDefault();
        const action = actionBtn.dataset.action;
        if (action === 'goto') {
            handleAction(actionBtn.dataset.patientId, actionBtn.dataset.patientName);
        } else if (action === 'dismiss') {
            dismissAlert(actionBtn.dataset.alertId);
        }
        return;
    }
});

/* ============================================================
   9. Load Alerts from API
============================================================ */
async function loadAlerts() {
    if (isLoading) return;
    isLoading = true;

    try {
        // ✅ 1. إعادة توليد التنبيهات أولاً (بناءً على البيانات الحالية)
        try {
            console.log('🔄 إعادة توليد التنبيهات...');
            const refreshResult = await bnApi.refresh();
            console.log('✅ Refresh result:', refreshResult);
        } catch (refreshErr) {
            // لا نوقف التحميل إذا فشل refresh — نكمل بجلب التنبيهات الحالية
            console.warn('⚠️ فشل إعادة التوليد، متابعة بجلب التنبيهات الحالية:', refreshErr);
        }

        // ✅ 2. جلب التنبيهات
        const raw = await bnApi.getAlerts();
        console.log('📦 Alerts API response:', raw);
        console.log('🔍 Keys:', raw && typeof raw === 'object' ? Object.keys(raw) : '—');

        currentSummary = mapAlertsSummary(raw);
        console.log('✅ Mapped summary:', currentSummary);

        render();
        updateLastUpdate(currentSummary.lastUpdated);

        if (currentSummary.alerts.length === 0) {
            showToast('info', 'لا توجد تنبيهات',
                'جميع المرضى في حالة مستقرة حالياً.', 4000);
        } else {
            showToast('info', 'مرحباً بك',
                `تم تحميل ${currentSummary.alerts.length} تنبيه من النظام.`, 4000);
        }
    } catch (err) {
        console.error('❌ فشل تحميل التنبيهات:', err);
        currentSummary = { alerts: [], criticalCount: 0, warningCount: 0, infoCount: 0, lastUpdated: null };
        render();
        showToast('error', 'فشل التحميل',
            `[${err?.status ?? '?'}] ${err.message || 'تعذر تحميل التنبيهات'}`, 6000);
    } finally {
        isLoading = false;
    }
}
/* ============================================================
   10. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 بدء تشغيل صفحة التنبيهات...');

    // حالة تحميل مبدئية
    bnGet('statCritical')?.replaceChildren(document.createTextNode('…'));
    bnGet('statWarning')?.replaceChildren(document.createTextNode('…'));
    bnGet('statInfo')?.replaceChildren(document.createTextNode('…'));
    bnGet('countAll')?.replaceChildren(document.createTextNode('…'));
    bnGet('countCritical')?.replaceChildren(document.createTextNode('…'));
    bnGet('countWarning')?.replaceChildren(document.createTextNode('…'));
    bnGet('countInfo')?.replaceChildren(document.createTextNode('…'));

    loadAlerts();

    console.log('%c✅ Alerts Page Loaded (API-driven)',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
});