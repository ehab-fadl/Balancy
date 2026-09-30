/* ============================================================
   0. Safe DOM Helpers
============================================================ */
const bnGet = (id) => document.getElementById(id);

/* ============================================================
   1. Storage Layer
============================================================ */
const bnStorage = {
    prefix: 'balancy_',
    isAvailable() {
        try {
            const t = '__bn_test__';
            localStorage.setItem(t, t);
            localStorage.removeItem(t);
            return true;
        } catch (e) { return false; }
    },
    get(key, defaultValue = null) {
        if (!this.isAvailable()) return defaultValue;
        try {
            const raw = localStorage.getItem(this.prefix + key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) { return defaultValue; }
    },
    // ✅ أيضًا ابحث في المفاتيح بدون بادئة
    getAny(key, defaultValue = null) {
        let val = this.get(key, null);
        if (val !== null) return val;
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) { return defaultValue; }
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
   3. Fallback Mock Data
============================================================ */
const mockPatients = [
    { id: 1, firstName: 'أحمد', lastName: 'محمد علي', code: 'AB123456', age: 32, gender: 'male', status: 'active', diagnosis: 'اكتئاب متوسط', visits: 8, lastVisit: '2024-01-15', createdAt: '2023-06-10' },
    { id: 2, firstName: 'سارة', lastName: 'عبدالله حسن', code: 'CD234567', age: 27, gender: 'female', status: 'active', diagnosis: 'قلق عام', visits: 5, lastVisit: '2024-01-20', createdAt: '2023-08-15' },
    { id: 3, firstName: 'خالد', lastName: 'إبراهيم سالم', code: 'EF345678', age: 41, gender: 'male', status: 'critical', diagnosis: 'اكتئاب حاد', visits: 15, lastVisit: '2024-01-25', createdAt: '2023-03-20' },
    { id: 4, firstName: 'فاطمة', lastName: 'حسن مصطفى', code: 'GH456789', age: 23, gender: 'female', status: 'active', diagnosis: 'اكتئاب خفيف', visits: 3, lastVisit: '2024-01-18', createdAt: '2023-11-10' },
    { id: 5, firstName: 'عمر', lastName: 'يوسف النجار', code: 'IJ567890', age: 35, gender: 'male', status: 'inactive', diagnosis: 'اضطراب ثنائي القطب', visits: 12, lastVisit: '2023-12-10', createdAt: '2023-05-01' },
    { id: 6, firstName: 'مريم', lastName: 'سعيد رمضان', code: 'KL678901', age: 26, gender: 'female', status: 'active', diagnosis: 'اكتئاب ما بعد الولادة', visits: 6, lastVisit: '2024-01-22', createdAt: '2023-09-15' }
];

/* ============================================================
   4. Load Data (LocalStorage + Fallback)
============================================================ */
function loadRealData() {
    console.log('%c🔍 البحث عن بيانات في localStorage...',
        'background:#0891b2;color:#fff;padding:4px 10px;border-radius:6px;font-weight:bold;');

    // ✅ عرض جميع مفاتيح localStorage
    const allKeys = Object.keys(localStorage);
    console.log('📦 المفاتيح المتوفرة:', allKeys);

    // ✅ البحث عن المرضى بعدة مفاتيح محتملة
    let patients = null;

    const possibleKeys = [
        'balancy_allPatients',
        'balancy_patients',
        'balancy_mockPatients',
        'allPatients',
        'patients',
        'mockPatients'
    ];

    for (const key of possibleKeys) {
        const data = bnStorage.getAny(key, null);
        if (data && Array.isArray(data) && data.length > 0) {
            patients = data;
            console.log(`%c✅ وجدت ${data.length} مريض في المفتاح: ${key}`,
                'background:#10b981;color:#fff;padding:4px 10px;border-radius:6px;font-weight:bold;');
            break;
        }
    }

    // إذا لم توجد بيانات
    if (!patients) {
        patients = [...mockPatients];
        console.warn('%c⚠️ لا توجد بيانات مرضى في localStorage — يتم استخدام بيانات تجريبية',
            'background:#f59e0b;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold;');
        console.log('💡 لربط البيانات الحقيقية، تأكد من حفظ المرضى في localStorage بمفتاح "balancy_allPatients"');
    }

    // قراءة باقي البيانات
    const visits = bnStorage.getAny('visits', []) || bnStorage.getAny('balancy_visits', []) || [];
    const sessions = bnStorage.getAny('listeningSessions', []) || bnStorage.getAny('balancy_listeningSessions', []) || [];

    return { patients, visits, sessions };
}

/* ============================================================
   5. Compute Statistics
============================================================ */
function computeClinicData() {
    const { patients, visits, sessions } = loadRealData();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // ============ KPI ============
    const totalPatients = patients.length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activePatients = patients.filter(p => {
        if (!p.lastVisit) return false;
        return new Date(p.lastVisit) >= thirtyDaysAgo;
    }).length;

    const criticalPatients = patients.filter(p =>
        p.status === 'critical' || p.riskLevel === 'high'
    ).length;

    const todayVisits = visits.filter(v => v.visitDate === todayStr).length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekVisits = visits.filter(v => v.visitDate && new Date(v.visitDate) >= weekAgo).length;

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const newPatients = patients.filter(p => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt) >= monthAgo;
    }).length;

    const adherenceRate = totalPatients > 0
        ? Math.round((activePatients / totalPatients) * 100)
        : 0;

    const avgSessionDuration = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0) / sessions.length)
        : 0;

    // ============ Visits Chart ============
    const visitsChart = generateVisitsData(visits);

    // ============ Diagnoses ============
    const diagnosisCount = {};
    patients.forEach(p => {
        const d = p.diagnosis || 'غير محدد';
        diagnosisCount[d] = (diagnosisCount[d] || 0) + 1;
    });

    const diagnosesEntries = Object.entries(diagnosisCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const diagnosesData = diagnosesEntries.length > 0 ? {
        labels: diagnosesEntries.map(e => e[0]),
        values: diagnosesEntries.map(e => Math.round((e[1] / totalPatients) * 100))
    } : {
        labels: ['لا توجد بيانات'],
        values: [100]
    };

    // ============ Ages ============
    const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56-65': 0, '65+': 0 };
    patients.forEach(p => {
        const age = p.age || 0;
        if (age <= 25) ageGroups['18-25']++;
        else if (age <= 35) ageGroups['26-35']++;
        else if (age <= 45) ageGroups['36-45']++;
        else if (age <= 55) ageGroups['46-55']++;
        else if (age <= 65) ageGroups['56-65']++;
        else ageGroups['65+']++;
    });

    // ============ Genders ============
    const maleCount = patients.filter(p => p.gender === 'male').length;
    const femaleCount = patients.filter(p => p.gender === 'female').length;

    // ============ Health ============
    const improvedCount = patients.filter(p => p.status === 'active').length;
    const stableCount = patients.filter(p => p.status === 'inactive').length;
    const worsenedCount = patients.filter(p => p.status === 'critical').length;
    const healthTotal = improvedCount + stableCount + worsenedCount || 1;

    const healthData = {
        labels: ['تحسن', 'مستقر', 'تراجع'],
        values: [
            Math.round((improvedCount / healthTotal) * 100),
            Math.round((stableCount / healthTotal) * 100),
            Math.round((worsenedCount / healthTotal) * 100)
        ]
    };

    // ============ Assessments ============
    const assessmentsData = {
        labels: ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4', 'أسبوع 5', 'أسبوع 6'],
        gad7: [14, 13, 12, 11, 9, 8],
        phq9: [18, 17, 15, 14, 12, 10],
        sds: [20, 18, 17, 15, 13, 11]
    };

    // ============ Top Diagnoses ============
    const topDiagnoses = diagnosesEntries.map(e => ({
        name: e[0],
        count: e[1],
        percent: Math.round((e[1] / totalPatients) * 100)
    }));

    // ============ Top Patients ============
    const topPatients = [...patients]
        .sort((a, b) => (b.visits || 0) - (a.visits || 0))
        .slice(0, 5)
        .map(p => ({
            name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'غير محدد',
            visits: p.visits || 0,
            code: p.code || p.patientCode || '-'
        }));

    // ============ Activities ============
    const activities = generateActivities(patients, visits, sessions);

    return {
        kpi: {
            totalPatients,
            activePatients,
            criticalPatients,
            todayVisits,
            weekVisits,
            newPatients,
            adherenceRate,
            avgSessionDuration
        },
        visits: visitsChart,
        diagnoses: diagnosesData,
        ages: { labels: Object.keys(ageGroups), values: Object.values(ageGroups) },
        genders: { labels: ['ذكور', 'إناث'], values: [maleCount, femaleCount] },
        health: healthData,
        assessments: assessmentsData,
        topDiagnoses,
        topPatients,
        activities
    };
}

/* ============================================================
   6. Visits Chart Data
============================================================ */
function generateVisitsData(visits) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // آخر 7 أيام
    const last7Days = { labels: days, values: [0, 0, 0, 0, 0, 0, 0] };
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    visits.forEach(v => {
        if (!v.visitDate) return;
        const d = new Date(v.visitDate);
        if (d >= weekAgo) last7Days.values[d.getDay()]++;
    });

    // إذا كان فارغاً، استخدم قيم افتراضية
    if (last7Days.values.every(v => v === 0)) {
        last7Days.values = [8, 14, 18, 12, 15, 9, 5];
    }

    // آخر 30 يوم
    const last30Days = { labels: ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'], values: [0, 0, 0, 0] };
    visits.forEach(v => {
        if (!v.visitDate) return;
        const d = new Date(v.visitDate);
        const daysAgo = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 28) {
            const weekIndex = Math.floor(daysAgo / 7);
            last30Days.values[3 - weekIndex]++;
        }
    });

    if (last30Days.values.every(v => v === 0)) {
        last30Days.values = [62, 78, 71, 84];
    }

    // آخر سنة
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const last365Days = { labels: monthNames, values: new Array(12).fill(0) };
    visits.forEach(v => {
        if (!v.visitDate) return;
        const d = new Date(v.visitDate);
        const daysAgo = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 365) last365Days.values[d.getMonth()]++;
    });

    if (last365Days.values.every(v => v === 0)) {
        last365Days.values = [240, 268, 295, 310, 285, 320, 340, 305, 355, 380, 365, 410];
    }

    return {
        7: last7Days,
        30: last30Days,
        90: { labels: ['يناير', 'فبراير', 'مارس'], values: [240, 268, 295] },
        365: last365Days
    };
}

/* ============================================================
   7. Activities
============================================================ */
function generateActivities(patients, visits, sessions) {
    const activities = [];

    patients.slice(-3).forEach(p => {
        if (p.createdAt) {
            activities.push({
                title: `إضافة مريض جديد: ${p.firstName || ''} ${p.lastName || ''}`.trim(),
                time: formatTime(p.createdAt),
                type: 'primary'
            });
        }
    });

    visits.slice(-3).forEach(v => {
        activities.push({
            title: `زيارة: ${v.reason || 'زيارة دورية'}`,
            time: formatTime(v.visitDate),
            type: 'success'
        });
    });

    sessions.slice(-2).forEach(s => {
        activities.push({
            title: `جلسة استماع: ${s.title || 'جلسة'}`,
            time: formatTime(s.date),
            type: 'warning'
        });
    });

    if (activities.length === 0) {
        activities.push(
            { title: 'مرحباً بك في نظام بالنسي', time: 'الآن', type: 'primary' },
            { title: 'ابدأ بإضافة مرضى لعرض الإحصائيات', time: 'الآن', type: 'warning' }
        );
    }

    return activities;
}

function formatTime(dateStr) {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;

    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`;
    return date.toLocaleDateString('ar-EG');
}

/* ============================================================
   8. Animated Number
============================================================ */
function animateNumber(element, target, duration = 1200, suffix = '') {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        element.textContent = current + suffix;

        if (progress < 1) requestAnimationFrame(update);
        else element.textContent = target + suffix;
    }

    requestAnimationFrame(update);
}

/* ============================================================
   9. Update KPIs
============================================================ */
let clinicData = null;
let currentPeriod = 7;
let charts = {};

function updateKPIs() {
    clinicData = computeClinicData();
    const kpi = clinicData.kpi;
    animateNumber(bnGet('kpiTotal'), kpi.totalPatients);
    animateNumber(bnGet('kpiActive'), kpi.activePatients);
    animateNumber(bnGet('kpiCritical'), kpi.criticalPatients);
    animateNumber(bnGet('kpiToday'), kpi.todayVisits);
    animateNumber(bnGet('kpiWeek'), kpi.weekVisits);
    animateNumber(bnGet('kpiNew'), kpi.newPatients);
    animateNumber(bnGet('kpiAdherence'), kpi.adherenceRate, 1200, '%');
    animateNumber(bnGet('kpiSessionDuration'), kpi.avgSessionDuration, 1200, ' د');
}

/* ============================================================
   10. Chart Colors
============================================================ */
function getChartColors() {
    return {
        text: '#475569',
        textMuted: '#94a3b8',
        grid: 'rgba(148, 163, 184, 0.2)',
        border: '#e2e8f0',
        tooltipBg: '#ffffff',
        tooltipText: '#1e293b',
        primary: '#0891b2',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        purple: '#8b5cf6',
        pink: '#ec4899',
        secondary: '#6366f1'
    };
}

/* ============================================================
   11. Chart.js Global Config
============================================================ */
function setupChartDefaults() {
    Chart.defaults.font.family = 'Tajawal, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.font.weight = '700';
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.boxHeight = 12;
    Chart.defaults.plugins.legend.labels.padding = 15;
}

/* ============================================================
   12. Visits Chart
============================================================ */
function createVisitsChart() {
    const canvas = bnGet('visitsChart');
    if (!canvas || !clinicData) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();
    const data = clinicData.visits[currentPeriod];

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(8, 145, 178, 0.35)');
    gradient.addColorStop(1, 'rgba(8, 145, 178, 0)');

    if (charts.visits) charts.visits.destroy();

    charts.visits = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'عدد الزيارات',
                data: data.values,
                borderColor: colors.primary,
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: colors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tooltipText,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: { label: (ctx) => `الزيارات: ${ctx.parsed.y}` }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: colors.text, font: { weight: '800' } },
                    border: { color: colors.border }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, font: { weight: '700' }, padding: 8 },
                    border: { display: false }
                }
            }
        }
    });
}

/* ============================================================
   13. Diagnoses Chart
============================================================ */
function createDiagnosesChart() {
    const canvas = bnGet('diagnosesChart');
    if (!canvas || !clinicData) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();
    const data = clinicData.diagnoses;

    if (charts.diagnoses) charts.diagnoses.destroy();

    charts.diagnoses = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [colors.primary, colors.secondary, colors.warning, colors.purple, colors.pink, colors.textMuted],
                borderWidth: 3,
                borderColor: colors.tooltipBg,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        font: { size: 11, weight: '800' },
                        padding: 10,
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tooltipText,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` }
                }
            }
        }
    });
}

/* ============================================================
   14. Age Chart
============================================================ */
function createAgeChart() {
    const canvas = bnGet('ageChart');
    if (!canvas || !clinicData) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();
    const data = clinicData.ages;

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, colors.purple);
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.4)');

    if (charts.age) charts.age.destroy();

    charts.age = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'عدد المرضى',
                data: data.values,
                backgroundColor: gradient,
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tooltipText,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: { label: (ctx) => `المرضى: ${ctx.parsed.y}` }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: colors.text, font: { weight: '800' } },
                    border: { color: colors.border }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, font: { weight: '700' }, padding: 8 },
                    border: { display: false }
                }
            }
        }
    });
}

/* ============================================================
   15. Gender Chart
============================================================ */
function createGenderChart() {
    const canvas = bnGet('genderChart');
    if (!canvas || !clinicData) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();
    const data = clinicData.genders;

    if (charts.gender) charts.gender.destroy();

    charts.gender = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ['rgba(8, 145, 178, 0.85)', 'rgba(236, 72, 153, 0.85)'],
                borderColor: colors.tooltipBg,
                borderWidth: 4,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '58%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        font: { size: 12, weight: '800' },
                        padding: 15,
                        boxWidth: 12,
                        boxHeight: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tooltipText,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} مريض` }
                }
            }
        }
    });
}

/* ============================================================
   16. Health Chart
============================================================ */
function createHealthChart() {
    const canvas = bnGet('healthChart');
    if (!canvas || !clinicData) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();
    const data = clinicData.health;

    if (charts.health) charts.health.destroy();

    charts.health = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(16, 185, 129, 0.85)',
                    'rgba(8, 145, 178, 0.85)',
                    'rgba(239, 68, 68, 0.85)'
                ],
                borderColor: colors.tooltipBg,
                borderWidth: 4,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '58%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        font: { size: 12, weight: '800' },
                        padding: 15,
                        boxWidth: 12,
                        boxHeight: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tooltipText,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` }
                }
            }
        }
    });
}

/* ============================================================
   17. Assessments Chart
============================================================ */
function createAssessmentsChart() {
    const canvas = bnGet('assessmentsChart');
    if (!canvas || !clinicData) return;
    const ctx = canvas.getContext('2d');
    const colors = getChartColors();
    const data = clinicData.assessments;

    if (charts.assessments) charts.assessments.destroy();

    charts.assessments = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'GAD-7 (القلق)',
                    data: data.gad7,
                    borderColor: colors.primary,
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    fill: false
                },
                {
                    label: 'PHQ-9 (الاكتئاب)',
                    data: data.phq9,
                    borderColor: colors.purple,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colors.purple,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    fill: false
                },
                {
                    label: 'SDS (الإعاقة)',
                    data: data.sds,
                    borderColor: colors.pink,
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colors.pink,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: colors.text,
                        font: { size: 12, weight: '800' },
                        padding: 15,
                        boxWidth: 12,
                        boxHeight: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tooltipText,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: colors.text, font: { weight: '800' } },
                    border: { color: colors.border }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, font: { weight: '700' }, padding: 8 },
                    border: { display: false }
                }
            }
        }
    });
}

/* ============================================================
   18. Create All Charts
============================================================ */
function createAllCharts() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            createVisitsChart();
            createDiagnosesChart();
            createAgeChart();
            createGenderChart();
            createHealthChart();
            createAssessmentsChart();
        });
    });
}

/* ============================================================
   19. Render Top Lists
============================================================ */
function renderTopDiagnoses() {
    const container = bnGet('topDiagnosesList');
    if (!container || !clinicData) return;
    container.innerHTML = '';

    clinicData.topDiagnoses.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'top-item';
        el.innerHTML = `
            <div class="top-rank rank-${index + 1}">${index + 1}</div>
            <div class="top-info">
                <div class="top-name">${item.name}</div>
                <div class="top-meta">${item.percent}% من الحالات</div>
            </div>
            <div class="top-value">${item.count}</div>
        `;
        container.appendChild(el);
    });
}

function renderTopPatients() {
    const container = bnGet('topPatientsList');
    if (!container || !clinicData) return;
    container.innerHTML = '';

    clinicData.topPatients.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'top-item';
        el.innerHTML = `
            <div class="top-rank rank-${index + 1}">${index + 1}</div>
            <div class="top-info">
                <div class="top-name">${item.name}</div>
                <div class="top-meta">${item.code}</div>
            </div>
            <div class="top-value">${item.visits}</div>
        `;
        container.appendChild(el);
    });
}

function renderActivities() {
    const container = bnGet('activityList');
    if (!container || !clinicData) return;
    container.innerHTML = '';

    clinicData.activities.forEach(item => {
        const el = document.createElement('div');
        el.className = 'activity-item';
        el.innerHTML = `
            <div class="activity-dot dot-${item.type}"></div>
            <div class="activity-content">
                <div class="activity-title">${item.title}</div>
                <div class="activity-time"><i class="fa-regular fa-clock"></i> ${item.time}</div>
            </div>
        `;
        container.appendChild(el);
    });
}

/* ============================================================
   20. Events — فقط Period Filter + Toast Close
============================================================ */
document.addEventListener('click', (e) => {

    if (e.target.closest('#toastCloseBtn')) {
        e.preventDefault();
        hideToast();
        return;
    }

    const periodBtn = e.target.closest('.period-btn');
    if (periodBtn) {
        e.preventDefault();
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        periodBtn.classList.add('active');
        currentPeriod = parseInt(periodBtn.dataset.period);
        createVisitsChart();
        showToast('info', 'تم التحديث', `تم تحديث البيانات للفترة: ${periodBtn.textContent.trim()}`);
        return;
    }
});

/* ============================================================
   21. Resize
============================================================ */
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') chart.resize();
        });
    }, 250);
});

/* ============================================================
   22. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    setupChartDefaults();

    setTimeout(() => {
        updateKPIs();
        createAllCharts();
        renderTopDiagnoses();
        renderTopPatients();
        renderActivities();
    }, 400);

    setTimeout(() => {
        const count = clinicData?.kpi?.totalPatients || 0;
        showToast('info', 'مرحباً بك', `تم تحميل إحصائيات ${count} مريض من النظام.`, 4500);
    }, 1200);

    console.log('%c✅ Clinic Statistics Page Loaded',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
});