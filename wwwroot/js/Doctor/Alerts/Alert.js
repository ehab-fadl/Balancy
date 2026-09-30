/* ============================================================
   0. Safe DOM Helpers
============================================================ */
const bnGet = (id) => document.getElementById(id);
const bnOn = (id, event, handler) => {
    const el = bnGet(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`⚠️ عنصر #${id} غير موجود`);
    }
};

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
   2. Mock Patients Data
============================================================ */
const mockPatients = [
    { id: 1, firstName: 'خالد', lastName: 'إبراهيم سالم', code: 'EF345678', age: 41, gender: 'male', status: 'critical', diagnosis: 'اكتئاب حاد', cssrsScore: 4, phq9Score: 22, gad7Score: 18, phq9Trend: 12, lastVisit: '2024-01-25', nextVisit: null, lastAssessmentDate: '2024-01-20', activeMedications: 4, missedAppointments: 3, dateOfBirth: '1983-03-10', suicideAttemptDate: null, severeSideEffects: true },
    { id: 2, firstName: 'أحمد', lastName: 'محمد علي', code: 'AB123456', age: 32, gender: 'male', status: 'active', diagnosis: 'اكتئاب متوسط', cssrsScore: 0, phq9Score: 12, gad7Score: 10, phq9Trend: -3, lastVisit: '2024-01-15', nextVisit: new Date().toISOString().slice(0, 10), lastAssessmentDate: '2024-01-10', activeMedications: 2, missedAppointments: 0, dateOfBirth: '1992-05-15', severeSideEffects: false },
    { id: 3, firstName: 'سارة', lastName: 'عبدالله حسن', code: 'CD234567', age: 27, gender: 'female', status: 'active', diagnosis: 'قلق عام', cssrsScore: 1, phq9Score: 8, gad7Score: 14, phq9Trend: 0, lastVisit: '2023-11-20', nextVisit: null, lastAssessmentDate: '2023-11-15', activeMedications: 1, missedAppointments: 1, dateOfBirth: '1997-08-22', severeSideEffects: false },
    { id: 4, firstName: 'فاطمة', lastName: 'حسن مصطفى', code: 'GH456789', age: 23, gender: 'female', status: 'active', diagnosis: 'اكتئاب خفيف', cssrsScore: 0, phq9Score: 6, gad7Score: 5, phq9Trend: -5, lastVisit: '2024-01-18', nextVisit: '2024-02-18', lastAssessmentDate: '2024-01-15', activeMedications: 1, missedAppointments: 0, dateOfBirth: '2001-11-05', severeSideEffects: false },
    { id: 5, firstName: 'عمر', lastName: 'يوسف النجار', code: 'IJ567890', age: 35, gender: 'male', status: 'inactive', diagnosis: 'اضطراب ثنائي القطب', cssrsScore: 2, phq9Score: 16, gad7Score: 12, phq9Trend: 5, lastVisit: '2023-12-10', nextVisit: null, lastAssessmentDate: '2023-12-01', activeMedications: 0, missedAppointments: 4, dateOfBirth: '1989-07-12', severeSideEffects: false },
    { id: 6, firstName: 'مريم', lastName: 'سعيد رمضان', code: 'KL678901', age: 26, gender: 'female', status: 'active', diagnosis: 'اكتئاب ما بعد الولادة', cssrsScore: 0, phq9Score: 14, gad7Score: 11, phq9Trend: -2, lastVisit: '2024-01-22', nextVisit: '2024-02-05', lastAssessmentDate: '2024-01-20', activeMedications: 2, missedAppointments: 0, dateOfBirth: '1998-02-28', severeSideEffects: false }
];

/* ============================================================
   3. Alert Rules
============================================================ */
const alertRules = [
    {
        id: 'cssrs-high',
        level: 'critical',
        icon: 'fa-shield-heart',
        title: '🚨 خطر انتحار مرتفع',
        check: (p) => p.cssrsScore >= 3,
        getMessage: (p) => `المريض ${p.firstName} ${p.lastName} لديه تقييم C-SSRS = ${p.cssrsScore}. يحتاج تدخل فوري.`,
        actionLabel: 'مراجعة فورية'
    },
    {
        id: 'rapid-deterioration',
        level: 'critical',
        icon: 'fa-arrow-trend-down',
        title: '🚨 تدهور سريع في الحالة',
        check: (p) => p.phq9Trend >= 10,
        getMessage: (p) => `ارتفع مؤشر PHQ-9 بمقدار ${p.phq9Trend} نقطة خلال شهر. تحتاج مراجعة عاجلة.`,
        actionLabel: 'مراجعة الخطة'
    },
    {
        id: 'severe-side-effects',
        level: 'critical',
        icon: 'fa-triangle-exclamation',
        title: '🚨 أعراض جانبية حادة',
        check: (p) => p.severeSideEffects === true,
        getMessage: (p) => `المريض يعاني من أعراض جانبية حادة للأدوية. يجب تعديل الجرعة أو تغيير الدواء.`,
        actionLabel: 'تعديل الدواء'
    },
    {
        id: 'suicide-attempt-recent',
        level: 'critical',
        icon: 'fa-heart-crack',
        title: '🚨 محاولة انتحار حديثة',
        check: (p) => {
            if (!p.suicideAttemptDate) return false;
            const days = Math.floor((new Date() - new Date(p.suicideAttemptDate)) / 86400000);
            return days < 180;
        },
        getMessage: (p) => `محاولة انتحار قبل ${Math.floor((new Date() - new Date(p.suicideAttemptDate)) / 86400000)} يوم. تحتاج متابعة يومية.`,
        actionLabel: 'متابعة عاجلة'
    },
    {
        id: 'appointment-today',
        level: 'warning',
        icon: 'fa-calendar-check',
        title: '📅 موعد اليوم',
        check: (p) => p.nextVisit === new Date().toISOString().slice(0, 10),
        getMessage: (p) => `موعد المريض ${p.firstName} ${p.lastName} اليوم. تأكد من تأكيد الحضور.`,
        actionLabel: 'عرض الموعد'
    },
    {
        id: 'overdue-visit',
        level: 'warning',
        icon: 'fa-user-clock',
        title: '⚠️ مريض متأخر عن المتابعة',
        check: (p) => {
            if (!p.lastVisit) return false;
            const days = Math.floor((new Date() - new Date(p.lastVisit)) / 86400000);
            return days > 45;
        },
        getMessage: (p) => `آخر زيارة منذ ${Math.floor((new Date() - new Date(p.lastVisit)) / 86400000)} يوم. يُنصح بالتواصل.`,
        actionLabel: 'اتصال'
    },
    {
        id: 'missing-appointments',
        level: 'warning',
        icon: 'fa-user-slash',
        title: '⚠️ التزام ضعيف بالعلاج',
        check: (p) => p.missedAppointments >= 3,
        getMessage: (p) => `فاته ${p.missedAppointments} مواعيد متتالية. يحتاج متابعة.`,
        actionLabel: 'متابعة'
    },
    {
        id: 'no-medications',
        level: 'warning',
        icon: 'fa-pills',
        title: '⚠️ لا يوجد دواء نشط',
        check: (p) => p.activeMedications === 0 && p.status !== 'active',
        getMessage: (p) => `المريض لا يتناول أي أدوية حالياً. تأكد من مراجعة الخطة العلاجية.`,
        actionLabel: 'مراجعة الأدوية'
    },
    {
        id: 'birthday',
        level: 'info',
        icon: 'fa-cake-candles',
        title: '🎂 عيد ميلاد المريض',
        check: (p) => isBirthdayToday(p.dateOfBirth),
        getMessage: (p) => `اليوم عيد ميلاد ${p.firstName} ${p.lastName}. يمكنك إرسال تهنئة.`,
        actionLabel: 'إرسال تهنئة'
    },
    {
        id: 'assessment-due',
        level: 'info',
        icon: 'fa-clipboard-question',
        title: '📋 موعد إعادة التقييم',
        check: (p) => {
            if (!p.lastAssessmentDate) return false;
            const days = Math.floor((new Date() - new Date(p.lastAssessmentDate)) / 86400000);
            return days > 30;
        },
        getMessage: (p) => `مر شهر على آخر تقييم نفسي. يُنصح بإعادة التقييم.`,
        actionLabel: 'طلب تقييم'
    }
];

/* ============================================================
   4. Helper Functions
============================================================ */
function isBirthdayToday(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    const dob = new Date(dateStr);
    return today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth();
}

function getTimeAgo(dateStr) {
    if (!dateStr) return 'الآن';
    const date = new Date(dateStr);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`;
    return date.toLocaleDateString('ar-EG');
}

/* ============================================================
   5. Alert Engine
============================================================ */
const bnAlertEngine = {
    alerts: [],
    dismissed: [],

    // ✅ تحميل من localStorage
    loadDismissed() {
        try {
            const saved = localStorage.getItem('balancy_dismissedAlerts');
            this.dismissed = saved ? JSON.parse(saved) : [];
        } catch (e) {
            this.dismissed = [];
        }
        console.log(`📦 تم تحميل ${this.dismissed.length} تنبيه مُتجاهَل من localStorage`);
    },

    // ✅ حفظ في localStorage
    saveDismissed() {
        try {
            localStorage.setItem('balancy_dismissedAlerts', JSON.stringify(this.dismissed));
        } catch (e) {
            console.warn('⚠️ لا يمكن الحفظ في localStorage');
        }
    },

    generate() {
        this.loadDismissed();  // ← تحميل أولاً

        const patients = mockPatients;
        const newAlerts = [];

        patients.forEach(patient => {
            alertRules.forEach(rule => {
                try {
                    if (rule.check(patient)) {
                        const alertId = `${rule.id}_${patient.id}`;
                        if (this.dismissed.includes(alertId)) return;

                        newAlerts.push({
                            id: alertId,
                            ruleId: rule.id,
                            level: rule.level,
                            icon: rule.icon,
                            title: rule.title,
                            message: rule.getMessage(patient),
                            actionLabel: rule.actionLabel,
                            patientId: patient.id,
                            patientName: `${patient.firstName} ${patient.lastName}`,
                            patientCode: patient.code,
                            createdAt: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.warn(`خطأ في القاعدة ${rule.id}:`, e);
                }
            });
        });

        const priority = { critical: 1, warning: 2, info: 3 };
        newAlerts.sort((a, b) => priority[a.level] - priority[b.level]);

        this.alerts = newAlerts;
        return newAlerts;
    },

    dismiss(alertId) {
        if (!this.dismissed.includes(alertId)) {
            this.dismissed.push(alertId);
            this.saveDismissed();  // ✅ حفظ فوري
        }
        this.alerts = this.alerts.filter(a => a.id !== alertId);
    },

    dismissAll() {
        this.alerts.forEach(a => {
            if (!this.dismissed.includes(a.id)) {
                this.dismissed.push(a.id);
            }
        });
        this.saveDismissed();  // ✅ حفظ فوري
        this.alerts = [];
    },

    resetDismissed() {
        this.dismissed = [];
        this.saveDismissed();  // ✅ حفظ فوري
        this.generate();
    },

    countByLevel(level) {
        return this.alerts.filter(a => a.level === level).length;
    },

    count() {
        return this.alerts.length;
    }
};
/* ============================================================
   6. Render
============================================================ */
let currentFilter = 'all';

function render() {
    const container = bnGet('alertsContainer');
    if (!container) {
        console.warn('⚠️ حاوية التنبيهات غير موجودة');
        return;
    }

    const critical = bnAlertEngine.countByLevel('critical');
    const warning = bnAlertEngine.countByLevel('warning');
    const info = bnAlertEngine.countByLevel('info');
    const total = bnAlertEngine.count();

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

    // تمييز بطاقة الإحصائية النشطة
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.toggle('active-filter', card.dataset.filterStat === currentFilter);
    });

    let filtered = bnAlertEngine.alerts;
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.level === currentFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fa-solid fa-check-circle"></i>
                </div>
                <h3>لا توجد تنبيهات</h3>
                <p>جميع المرضى في حالة مستقرة — لا يحتاجون أي متابعة حالياً.</p>
            </div>
        `;
        return;
    }

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
                    <h3 class="alert-title">${alert.title}</h3>
                    <span class="alert-level-badge ${alert.level}">
                        <i class="fa-solid fa-circle"></i>
                        ${levelText}
                    </span>
                </div>

                <div class="alert-message">${alert.message}</div>

                <div class="alert-meta">
                    <span class="alert-meta-item">
                        <i class="fa-solid fa-user"></i>
                        ${alert.patientName}
                    </span>
                    <span class="alert-meta-item">
                        <i class="fa-solid fa-hashtag"></i>
                        ${alert.patientCode}
                    </span>
                    <span class="alert-time">
                        <i class="fa-regular fa-clock"></i>
                        ${getTimeAgo(alert.createdAt)}
                    </span>
                </div>

                <div class="alert-actions">
                    <button type="button" class="alert-action-btn alert-action-primary"
                            onclick="handleAction('${alert.actionLabel}', '${alert.patientName}', ${alert.patientId})">
                        <i class="fa-solid fa-arrow-left"></i>
                        ${alert.actionLabel}
                    </button>
                    <button type="button" class="alert-action-btn alert-action-ghost"
                            onclick="dismissAlert('${alert.id}')">
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
function handleAction(actionLabel, patientName, patientId) {
    showToast('success', 'تم تنفيذ الإجراء', `${actionLabel} — المريض: ${patientName}`, 3000);
    console.log(`🎯 الإجراء: ${actionLabel} | المريض: ${patientName} (ID: ${patientId})`);
}

function dismissAlert(alertId) {
    bnAlertEngine.dismiss(alertId);
    render();
    showToast('info', 'تم الاطلاع', 'تم نقل التنبيه إلى المُتجاهَلة.', 2500);
}

function dismissAll() {
    const count = bnAlertEngine.count();
    if (count === 0) {
        showToast('info', 'لا توجد تنبيهات', 'لا يوجد ما يمكن تجاهله.', 2500);
        return;
    }
    bnAlertEngine.dismissAll();
    render();
    showToast('success', 'تم تجاهل الكل', `تم تجاهل ${count} تنبيه بنجاح.`, 3000);
}

function resetAll() {
    const dismissedCount = bnAlertEngine.dismissed.length;
    if (dismissedCount === 0) {
        showToast('info', 'لا يوجد', 'لا توجد تنبيهات مُتجاهَلة لاستعادتها.', 2500);
        return;
    }
    bnAlertEngine.resetDismissed();
    render();
    showToast('success', 'تم الاستعادة', `تم استعادة ${dismissedCount} تنبيه مُتجاهَل.`, 3000);
}

/* ============================================================
   8. Events — Event Delegation (يعمل دائماً)
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
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.filter-tab').forEach(t => {
            if (t.dataset.filter === filter) {
                t.classList.add('active');
                currentFilter = filter;
            }
        });
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
});

/* ============================================================
   9. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 بدء تشغيل صفحة التنبيهات...');

    bnAlertEngine.generate();
    render();

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const el = bnGet('lastUpdate');
    if (el) el.textContent = timeStr;

    console.log('%c✅ Alerts Page Loaded',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    console.log(`🔔 التنبيهات: ${bnAlertEngine.count()}`);
});