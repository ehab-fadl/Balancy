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
   2. API Client
============================================================ */
const bnEndpoints = window.BALANCY_ENDPOINTS || {
    statistics: '?handler=Statistics'
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
            const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
            const e = new Error(msg);
            e.status = res.status;
            throw e;
        }
        return data;
    },

    async getStatistics() {
        return this._request(bnEndpoints.statistics);
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

function pickObject(obj, keys) {
    const v = pickValue(obj, keys);
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
}

function unwrapResponse(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;

    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
        return raw.data;
    }
    if (raw.result && typeof raw.result === 'object' && !Array.isArray(raw.result)) {
        return raw.result;
    }
    if (raw.value && typeof raw.value === 'object' && !Array.isArray(raw.value)) {
        return raw.value;
    }
    return raw;
}

/**
 * يحوّل استجابة ClinicStatisticsDto إلى شكل العرض.
 */
function mapApiStatistics(raw) {
    if (!raw || typeof raw !== 'object') return null;

    raw = unwrapResponse(raw);

    // ─── KPIs ───
    const kpi = {
        totalPatients: pickNumber(raw, ['totalPatients', 'TotalPatients']),
        activePatients: pickNumber(raw, ['activePatients', 'ActivePatients']),
        criticalPatients: pickNumber(raw, ['criticalPatients', 'CriticalPatients']),
        todayVisits: pickNumber(raw, ['todayVisits', 'TodayVisits']),
        weekVisits: pickNumber(raw, ['weekVisits', 'WeekVisits']),
        newPatients: pickNumber(raw, ['newPatientsThisMonth', 'NewPatientsThisMonth', 'newPatients', 'NewPatients']),
        adherenceRate: pickNumber(raw, ['adherenceRate', 'AdherenceRate']),
        avgSessionDuration: pickNumber(raw, ['avgSessionDuration', 'AvgSessionDuration'])
    };

    // ─── Visits by period ───
    const visitsByPeriodRaw = pickObject(raw, ['visitsByPeriod', 'VisitsByPeriod']);
    const normalizeChartData = (cd, fallbackLabels = [], fallbackValues = []) => {
        if (!cd || typeof cd !== 'object') {
            return { labels: fallbackLabels, values: fallbackValues };
        }
        const labels = pickArray(cd, ['labels', 'Labels']);
        const values = pickArray(cd, ['values', 'Values']);
        return {
            labels: labels.length ? labels : fallbackLabels,
            values: values.length ? values : fallbackValues
        };
    };

    const visits = {
        7: normalizeChartData(
            pickObject(visitsByPeriodRaw, ['last7Days', 'Last7Days']),
            ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
            [0, 0, 0, 0, 0, 0, 0]
        ),
        30: normalizeChartData(
            pickObject(visitsByPeriodRaw, ['last30Days', 'Last30Days']),
            ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'],
            [0, 0, 0, 0]
        ),
        90: normalizeChartData(
            pickObject(visitsByPeriodRaw, ['last90Days', 'Last90Days']),
            ['شهر 1', 'شهر 2', 'شهر 3'],
            [0, 0, 0]
        ),
        365: normalizeChartData(
            pickObject(visitsByPeriodRaw, ['last365Days', 'Last365Days']),
            ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
            new Array(12).fill(0)
        )
    };

    // ─── Distributions ───
    const diagDistRaw = pickObject(raw, ['diagnosesDistribution', 'DiagnosesDistribution']);
    const ageDistRaw = pickObject(raw, ['ageDistribution', 'AgeDistribution']);
    const genderDistRaw = pickObject(raw, ['genderDistribution', 'GenderDistribution']);
    const healthDistRaw = pickObject(raw, ['healthDistribution', 'HealthDistribution']);

    const diagnoses = {
        labels: pickArray(diagDistRaw, ['labels', 'Labels']),
        values: pickArray(diagDistRaw, ['values', 'Values'])
    };
    if (diagnoses.labels.length === 0) {
        diagnoses.labels = ['لا توجد بيانات'];
        diagnoses.values = [100];
    }

    const ages = {
        labels: pickArray(ageDistRaw, ['labels', 'Labels']),
        values: pickArray(ageDistRaw, ['values', 'Values'])
    };
    if (ages.labels.length === 0) {
        ages.labels = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
        ages.values = [0, 0, 0, 0, 0, 0];
    }

    const genders = {
        labels: pickArray(genderDistRaw, ['labels', 'Labels']),
        values: pickArray(genderDistRaw, ['values', 'Values'])
    };
    if (genders.labels.length === 0) {
        genders.labels = ['ذكور', 'إناث'];
        genders.values = [0, 0];
    }

    const health = {
        labels: pickArray(healthDistRaw, ['labels', 'Labels']),
        values: pickArray(healthDistRaw, ['values', 'Values'])
    };
    if (health.labels.length === 0) {
        health.labels = ['تحسن', 'مستقر', 'تراجع'];
        health.values = [0, 0, 0];
    }

    // ─── Assessment averages ───
    const assessmentsRaw = pickObject(raw, ['assessmentAverages', 'AssessmentAverages']);
    const assessments = {
        labels: pickArray(assessmentsRaw, ['labels', 'Labels']).length
            ? pickArray(assessmentsRaw, ['labels', 'Labels'])
            : ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4', 'أسبوع 5', 'أسبوع 6'],
        gad7: pickArray(assessmentsRaw, ['gad7', 'Gad7', 'GAD7']),
        phq9: pickArray(assessmentsRaw, ['phq9', 'Phq9', 'PHQ9']),
        sds: pickArray(assessmentsRaw, ['sds', 'Sds', 'SDS'])
    };
    const labelCount = assessments.labels.length;
    const padArray = (arr, len) => {
        const out = [...arr];
        while (out.length < len) out.push(0);
        return out.slice(0, len);
    };
    assessments.gad7 = padArray(assessments.gad7, labelCount);
    assessments.phq9 = padArray(assessments.phq9, labelCount);
    assessments.sds = padArray(assessments.sds, labelCount);

    // ─── Top lists ───
    const topDiagnoses = pickArray(raw, ['topDiagnoses', 'TopDiagnoses']).map(d => ({
        name: pickValue(d, ['name', 'Name']) || 'غير محدد',
        count: pickNumber(d, ['count', 'Count']),
        percent: pickNumber(d, ['percent', 'Percent'])
    }));

    const topPatients = pickArray(raw, ['topPatients', 'TopPatients']).map(p => ({
        name: pickValue(p, ['name', 'Name']) || 'غير محدد',
        code: pickValue(p, ['code', 'Code']) || '-',
        visits: pickNumber(p, ['visits', 'Visits'])
    }));

    const activities = pickArray(raw, ['recentActivities', 'RecentActivities']).map(a => ({
        title: pickValue(a, ['title', 'Title']) || '',
        time: pickValue(a, ['time', 'Time']) || '',
        type: (pickValue(a, ['type', 'Type']) || 'primary').toLowerCase()
    }));

    // ─── Insights ───
    const insights = pickArray(raw, ['insights', 'Insights']).map(i => ({
        type: (pickValue(i, ['type', 'Type']) || 'info').toLowerCase(),
        title: pickValue(i, ['title', 'Title']) || '',
        text: pickValue(i, ['text', 'Text']) || '',
        badge: pickValue(i, ['badge', 'Badge']) || ''
    }));

    return {
        kpi, visits, diagnoses, ages, genders, health, assessments,
        topDiagnoses, topPatients, activities, insights
    };
}

/* ============================================================
   4. State
============================================================ */
let clinicData = null;
let currentPeriod = 7;
let charts = {};

/* ============================================================
   5. Animated Number
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
   6. Update KPIs
============================================================ */
function updateKPIs() {
    if (!clinicData) return;
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
   7. Chart Colors
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
   8. Chart.js Global Config
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
   9. Visits Chart
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
   10. Diagnoses Chart
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
   11. Age Chart
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
   12. Gender Chart
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
   13. Health Chart
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
   14. Assessments Chart
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
   15. Create All Charts
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
   16. Render Insights (الرؤى الذكية) — من API
============================================================ */
function renderInsights() {
    const container = bnGet('insightsGrid');
    if (!container || !clinicData) return;
    container.innerHTML = '';

    const insights = clinicData.insights || [];

    if (insights.length === 0) {
        container.innerHTML = `
            <div class="insight-card" style="grid-column: 1 / -1; text-align: center; justify-content: center;">
                <div class="insight-icon icon-info"><i class="fa-solid fa-info-circle"></i></div>
                <div class="insight-content" style="flex: 1; text-align: center;">
                    <div class="insight-title">لا توجد رؤى حالياً</div>
                    <div class="insight-text">لم يولّد النظام أي رؤى ذكية بناءً على البيانات الحالية.</div>
                </div>
            </div>
        `;
        return;
    }

    const iconMap = {
        success: 'fa-arrow-trend-up',
        warning: 'fa-triangle-exclamation',
        danger: 'fa-bell',
        info: 'fa-lightbulb'
    };

    const badgeStyleMap = {
        success: 'background: var(--bn-success-light); color: #047857;',
        warning: 'background: var(--bn-warning-light); color: #b45309;',
        danger: 'background: var(--bn-danger-light); color: #b91c1c;',
        info: 'background: var(--bn-primary-light); color: var(--bn-primary-dark);'
    };

    insights.forEach((item, index) => {
        const type = ['success', 'warning', 'danger', 'info'].includes(item.type) ? item.type : 'info';
        const iconClass = iconMap[type];
        const badgeStyle = badgeStyleMap[type];

        const el = document.createElement('div');
        el.className = 'insight-card';
        el.style.animationDelay = `${index * 0.05}s`;
        el.innerHTML = `
            <div class="insight-icon icon-${type}"><i class="fa-solid ${iconClass}"></i></div>
            <div class="insight-content">
                <div class="insight-title">${escapeHtml(item.title || '')}</div>
                <div class="insight-text">${escapeHtml(item.text || '')}</div>
                ${item.badge ? `<span class="insight-badge" style="${badgeStyle}">${escapeHtml(item.badge)}</span>` : ''}
            </div>
        `;
        container.appendChild(el);
    });
}

/* ============================================================
   17. Render Top Lists
============================================================ */
function renderTopDiagnoses() {
    const container = bnGet('topDiagnosesList');
    if (!container || !clinicData) return;
    container.innerHTML = '';

    if (!clinicData.topDiagnoses || clinicData.topDiagnoses.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:0.85rem;">لا توجد بيانات</div>';
        return;
    }

    clinicData.topDiagnoses.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'top-item';
        el.innerHTML = `
            <div class="top-rank rank-${index + 1}">${index + 1}</div>
            <div class="top-info">
                <div class="top-name">${escapeHtml(item.name)}</div>
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

    if (!clinicData.topPatients || clinicData.topPatients.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:0.85rem;">لا توجد بيانات</div>';
        return;
    }

    clinicData.topPatients.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'top-item';
        el.innerHTML = `
            <div class="top-rank rank-${index + 1}">${index + 1}</div>
            <div class="top-info">
                <div class="top-name">${escapeHtml(item.name)}</div>
                <div class="top-meta">${escapeHtml(item.code)}</div>
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

    if (!clinicData.activities || clinicData.activities.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:0.85rem;">لا توجد أنشطة حديثة</div>';
        return;
    }

    clinicData.activities.forEach(item => {
        const el = document.createElement('div');
        el.className = 'activity-item';
        el.innerHTML = `
            <div class="activity-dot dot-${item.type}"></div>
            <div class="activity-content">
                <div class="activity-title">${escapeHtml(item.title)}</div>
                <div class="activity-time"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.time)}</div>
            </div>
        `;
        container.appendChild(el);
    });
}

/* ============================================================
   18. Events — Period Filter + Toast Close
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
   19. Resize
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
   20. Load Statistics from API
============================================================ */
async function loadStatistics() {
    try {
        const fullUrl = new URL(bnEndpoints.statistics, window.location.origin).href;
        console.log('%c🌐 GET → ' + fullUrl, 'background:#0891b2;color:#fff;padding:4px 10px;border-radius:4px;');

        const raw = await bnApi.getStatistics();

        console.group('%c📦 Clinic Statistics API response', 'background:#10b981;color:#fff;padding:4px 10px;border-radius:4px;');
        console.log('typeof raw:', typeof raw);
        console.log('Keys:', raw && typeof raw === 'object' ? Object.keys(raw) : '—');
        console.log('Full object:', raw);
        console.log('JSON:', JSON.stringify(raw, null, 2));
        console.groupEnd();

        // فحص insights مباشرة
        const rawInsights = raw?.insights ?? raw?.Insights ?? raw?.data?.insights ?? raw?.data?.Insights;
        console.log('%c🎯 Insights from API:', 'background:#8b5cf6;color:#fff;padding:4px 10px;border-radius:4px;',
            Array.isArray(rawInsights) ? `${rawInsights.length} عنصر` : 'MISSING', rawInsights);

        clinicData = mapApiStatistics(raw);
        if (!clinicData) {
            console.warn('⚠️ استجابة API فارغة أو غير صالحة — استخدام fallback');
            clinicData = mapApiStatistics({});
        }

        console.log('%c✅ clinicData بعد الـ mapping:', 'background:#6366f1;color:#fff;padding:4px 10px;border-radius:4px;');
        console.log('  KPI:', clinicData.kpi);
        console.log('  Insights:', clinicData.insights);

        updateKPIs();
        createAllCharts();
        renderInsights();
        renderTopDiagnoses();
        renderTopPatients();
        renderActivities();

        const total = clinicData.kpi.totalPatients;
        if (total === 0) {
            showToast('warning', 'لا توجد بيانات',
                'الـ API رجع بيانات فارغة (0 مرضى). تحقق من DoctorId في الجلسة أو بيانات DB.', 8000);
        } else {
            showToast('info', 'مرحباً بك',
                `تم تحميل إحصائيات ${total} مريض من النظام.`, 4500);
        }

    } catch (err) {
        console.error('%c❌ فشل تحميل الإحصائيات:', 'background:#ef4444;color:#fff;padding:4px 10px;border-radius:4px;', err);
        console.error('  Status:', err?.status ?? '—');
        console.error('  Message:', err?.message ?? '—');

        clinicData = mapApiStatistics({});
        updateKPIs();
        createAllCharts();
        renderInsights();
        renderTopDiagnoses();
        renderTopPatients();
        renderActivities();

        showToast('error', 'فشل تحميل البيانات',
            `[${err?.status ?? '?'}] ${err.message || 'تعذر الاتصال بخدمة الإحصائيات.'}`, 8000);
    }
}

/* ============================================================
   21. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    setupChartDefaults();

    bnGet('kpiTotal')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiActive')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiCritical')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiToday')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiWeek')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiNew')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiAdherence')?.replaceChildren(document.createTextNode('…'));
    bnGet('kpiSessionDuration')?.replaceChildren(document.createTextNode('…'));

    setTimeout(loadStatistics, 400);

    console.log('%c✅ Clinic Statistics Page Loaded (API-driven)',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
});