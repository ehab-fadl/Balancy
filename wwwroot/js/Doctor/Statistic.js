/* ============================================================
   Depression Statistics — API-driven
   - GET من /Doctor?handler=Statistics
   - يستبدل generateMockData() بـ loadStatsFromServer()
   - يحافظ على: Chart.js, Filters, Toasts, Trends, Smart Alerts
============================================================ */

/* ============================================================
   1. Utilities
============================================================ */
function getPatientId() {
    return document.getElementById('statisticsPatientId')?.value?.trim()
        || document.querySelector('.stats-container')?.dataset?.patientId?.trim()
        || new URLSearchParams(window.location.search).get('id')
        || new URLSearchParams(window.location.search).get('patientId')
        || sessionStorage.getItem('bnCurrentPatientId')?.trim()
        || '';
}

function getStatsApiUrl() {
    return document.querySelector('.stats-container')?.dataset?.apiStatsUrl
        || '/Doctor?handler=Statistics';
}

function extractArray(payload) {
    if (payload == null) return [];
    if (Array.isArray(payload)) return payload;
    const candidates = [payload.data, payload.items, payload.result, payload.$values, payload.data?.$values, payload.data?.items];
    for (const c of candidates) if (Array.isArray(c)) return c;
    for (const key of Object.keys(payload)) {
        if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
}

/**
 * يحوّل DTO من الـ API إلى الشكل الداخلي المتوقع.
 * يتعامل مع camelCase و PascalCase، ويحوّل decimal sleep إلى number.
 */
function mapMetricDto(dto) {
    const dateRaw = dto.date ?? dto.Date ?? '';
    let dateStr = '';
    try {
        const d = new Date(dateRaw);
        if (!isNaN(d.getTime())) {
            dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
            dateStr = String(dateRaw).slice(0, 10);
        }
    } catch {
        dateStr = String(dateRaw).slice(0, 10);
    }

    return {
        date: dateStr,
        food: Number(dto.food ?? dto.Food ?? 0),
        sleep: Number(dto.sleep ?? dto.Sleep ?? 0),
        medication: Number(dto.medication ?? dto.Medication ?? 0),
        mood: Number(dto.mood ?? dto.Mood ?? 0),
        negative: Number(dto.negative ?? dto.Negative ?? 0),
        health: Number(dto.health ?? dto.Health ?? 0),
        energy: Number(dto.energy ?? dto.Energy ?? 0),
        motivation: Number(dto.motivation ?? dto.Motivation ?? 0),
        concentration: Number(dto.concentration ?? dto.Concentration ?? 0),
        guilt: Number(dto.guilt ?? dto.Guilt ?? 0),
        hope: Number(dto.hope ?? dto.Hope ?? 0),
        suicidal: Number(dto.suicidal ?? dto.Suicidal ?? 0)
    };
}

/* ============================================================
   2. Toast Notifications
============================================================ */
function showToast(type, message, duration = 3000) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${icons[type] || icons.info}"></i></div>
        <div class="toast-text">${message}</div>
    `;

    stack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ============================================================
   3. Data (from API)
============================================================ */
let allData = [];
let isLoadingData = false;

async function loadStatsFromServer(range = 'week', startDate = null, endDate = null) {
    if (isLoadingData) return [];
    isLoadingData = true;

    const patientId = getPatientId();
    if (!patientId) {
        console.warn('⚠️ لا يوجد patientId في الصفحة');
        isLoadingData = false;
        return [];
    }

    const baseUrl = getStatsApiUrl();
    let url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}patientId=${encodeURIComponent(patientId)}&range=${encodeURIComponent(range)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

    try {
        const res = await fetch(url, {
            headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        const arr = extractArray(payload).map(mapMetricDto);
        arr.sort((a, b) => new Date(a.date) - new Date(b.date));
        allData = arr;
        console.log(`✅ Loaded ${allData.length} metric rows for patient`, patientId);
        return allData;
    } catch (err) {
        console.error('❌ فشل تحميل إحصائيات المريض:', err);
        allData = [];
        showToast('error', 'تعذر تحميل إحصائيات المريض');
        return [];
    } finally {
        isLoadingData = false;
    }
}

/* ============================================================
   4. Chart Manager
============================================================ */
const charts = {};

function getThemeColors() {
    return {
        text: '#1e293b',
        textSoft: '#475569',
        grid: 'rgba(100, 116, 139, 0.12)',
        tooltipBg: '#ffffff',
        tooltipText: '#1e293b',
        tooltipBorder: '#e2e8f0'
    };
}

function createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const colors = getThemeColors();
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, config.gradientFrom);
    gradient.addColorStop(1, config.gradientTo);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.label,
                data: config.data,
                borderColor: config.color,
                backgroundColor: gradient,
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: config.color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: config.pointRadius !== undefined ? config.pointRadius : 3,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: config.color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: { duration: 900, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.textSoft,
                    borderColor: colors.tooltipBorder,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 12,
                    displayColors: false,
                    titleFont: { family: 'Tajawal', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Tajawal', size: 12, weight: '600' },
                    callbacks: {
                        label: function (context) {
                            return config.tooltipLabel
                                ? config.tooltipLabel(context.parsed.y)
                                : `${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: colors.textSoft,
                        font: { family: 'Tajawal', size: 10, weight: '700' },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    beginAtZero: true,
                    min: config.min,
                    max: config.max,
                    grid: { color: colors.grid, drawBorder: false },
                    ticks: {
                        color: colors.textSoft,
                        font: { family: 'Tajawal', size: 10, weight: '700' },
                        callback: config.yTickFormatter || function (value) { return value; }
                    }
                }
            }
        }
    });
}

/* ============================================================
   5. Helpers
============================================================ */
function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateTrend(arr) {
    if (arr.length < 4) return 'stable';
    const half = Math.floor(arr.length / 2);
    const firstAvg = average(arr.slice(0, half));
    const secondAvg = average(arr.slice(half));
    const diff = secondAvg - firstAvg;
    const range = Math.max(...arr) - Math.min(...arr);
    const threshold = range * 0.05 || 1;

    if (diff > threshold) return 'up';
    if (diff < -threshold) return 'down';
    return 'stable';
}

/* ============================================================
   6. Metric Configurations
============================================================ */
const METRIC_CONFIGS = {
    food: { label: 'الغذاء', unit: '%', min: 0, max: 100, color: '#ea580c', gradientFrom: 'rgba(234,88,12,0.35)', gradientTo: 'rgba(234,88,12,0.02)', formatter: (v) => Math.round(v) + '%', tooltip: (v) => `جودة التغذية: ${v}%` },
    sleep: { label: 'النوم', unit: 'س', min: 0, max: 12, color: '#6d28d9', gradientFrom: 'rgba(109,40,217,0.35)', gradientTo: 'rgba(109,40,217,0.02)', formatter: (v) => v.toFixed(1) + ' س', tooltip: (v) => `${v} ساعة` },
    medication: { label: 'الالتزام بالأدوية', unit: '%', min: 0, max: 100, color: '#15803d', gradientFrom: 'rgba(21,128,61,0.35)', gradientTo: 'rgba(21,128,61,0.02)', formatter: (v) => Math.round(v) + '%', tooltip: (v) => `الالتزام: ${v}%` },
    mood: { label: 'المزاج', unit: '/10', min: 0, max: 10, color: '#b45309', gradientFrom: 'rgba(180,83,9,0.35)', gradientTo: 'rgba(180,83,9,0.02)', formatter: (v) => v.toFixed(1) + '/10', tooltip: (v) => `المزاج: ${v}/10` },
    negative: { label: 'الأفكار السلبية', unit: '', min: 0, max: 20, color: '#b91c1c', gradientFrom: 'rgba(185,28,28,0.35)', gradientTo: 'rgba(185,28,28,0.02)', formatter: (v) => Math.round(v), tooltip: (v) => `عدد الأفكار: ${v}` },
    health: { label: 'الاهتمام الجسدي', unit: '%', min: 0, max: 100, color: '#0e7490', gradientFrom: 'rgba(14,116,144,0.35)', gradientTo: 'rgba(14,116,144,0.02)', formatter: (v) => Math.round(v) + '%', tooltip: (v) => `الاهتمام: ${v}%` },
    energy: { label: 'الطاقة', unit: '/10', min: 0, max: 10, color: '#ca8a04', gradientFrom: 'rgba(202,138,4,0.35)', gradientTo: 'rgba(202,138,4,0.02)', formatter: (v) => v.toFixed(1) + '/10', tooltip: (v) => `الطاقة: ${v}/10` },
    motivation: { label: 'الدافعية', unit: '/10', min: 0, max: 10, color: '#ea580c', gradientFrom: 'rgba(234,88,12,0.35)', gradientTo: 'rgba(234,88,12,0.02)', formatter: (v) => v.toFixed(1) + '/10', tooltip: (v) => `الدافعية: ${v}/10` },
    concentration: { label: 'التركيز', unit: '/10', min: 0, max: 10, color: '#1d4ed8', gradientFrom: 'rgba(29,78,216,0.35)', gradientTo: 'rgba(29,78,216,0.02)', formatter: (v) => v.toFixed(1) + '/10', tooltip: (v) => `التركيز: ${v}/10` },
    guilt: { label: 'الشعور بالذنب', unit: '/10', min: 0, max: 10, color: '#4b5563', gradientFrom: 'rgba(75,85,99,0.35)', gradientTo: 'rgba(75,85,99,0.02)', formatter: (v) => v.toFixed(1) + '/10', tooltip: (v) => `الذنب: ${v}/10` },
    hope: { label: 'الأمل', unit: '/10', min: 0, max: 10, color: '#d97706', gradientFrom: 'rgba(217,119,6,0.35)', gradientTo: 'rgba(217,119,6,0.02)', formatter: (v) => v.toFixed(1) + '/10', tooltip: (v) => `الأمل: ${v}/10` },
    suicidal: { label: 'الأفكار الانتحارية', unit: '/5', min: 0, max: 5, color: '#dc2626', gradientFrom: 'rgba(220,38,38,0.4)', gradientTo: 'rgba(220,38,38,0.02)', formatter: (v) => v.toFixed(1) + '/5', tooltip: (v) => `الخطر: ${v}/5` }
};

const NEGATIVE_METRICS = ['negative', 'guilt', 'suicidal'];

/* ============================================================
   7. Update UI
============================================================ */
function updateTrendPill(metric, trend) {
    const pill = document.querySelector(`[data-trend="${metric}"]`);
    if (!pill) return;
    pill.classList.remove('trend-up', 'trend-down', 'trend-stable');

    const isNegativeMetric = NEGATIVE_METRICS.includes(metric);
    const effectiveTrend = isNegativeMetric
        ? (trend === 'up' ? 'down' : (trend === 'down' ? 'up' : 'stable'))
        : trend;

    const configs = {
        up: { icon: 'fa-arrow-trend-up', text: 'تحسن', cls: 'trend-up' },
        down: { icon: 'fa-arrow-trend-down', text: 'انخفاض', cls: 'trend-down' },
        stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
    };

    const conf = configs[effectiveTrend] || configs.stable;
    pill.classList.add(conf.cls);
    pill.innerHTML = `<i class="fa-solid ${conf.icon}"></i> ${conf.text}`;
}

function updateKpiTrend(metric, trend) {
    const kpiTrend = document.querySelector(`[data-kpi-trend="${metric}"]`);
    if (!kpiTrend) return;
    kpiTrend.classList.remove('up', 'down', 'stable');

    const isNegativeMetric = NEGATIVE_METRICS.includes(metric);
    const effectiveTrend = isNegativeMetric
        ? (trend === 'up' ? 'down' : (trend === 'down' ? 'up' : 'stable'))
        : trend;

    const configs = {
        up: { icon: 'fa-arrow-up', text: 'تحسن' },
        down: { icon: 'fa-arrow-down', text: 'انخفاض' },
        stable: { icon: 'fa-minus', text: 'مستقر' }
    };

    const conf = configs[effectiveTrend] || configs.stable;
    kpiTrend.classList.add(effectiveTrend);
    kpiTrend.innerHTML = `<i class="fa-solid ${conf.icon}"></i> ${conf.text}`;
}

function updateChartStats(metric, values) {
    const cfg = METRIC_CONFIGS[metric];
    if (!cfg) return;

    const avgEl = document.querySelector(`[data-avg="${metric}"]`);
    const kpiEl = document.querySelector(`[data-kpi="${metric}"]`);
    const minEl = document.querySelector(`[data-min="${metric}"]`);
    const maxEl = document.querySelector(`[data-max="${metric}"]`);

    if (!values.length) {
        if (avgEl) avgEl.textContent = '—';
        if (kpiEl) kpiEl.textContent = '—';
        if (minEl) minEl.textContent = '-';
        if (maxEl) maxEl.textContent = '-';
        return { avg: 0, trend: 'stable', values };
    }

    const avg = average(values);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (avgEl) animateCounter(avgEl, avg, cfg.formatter);
    if (kpiEl) animateCounter(kpiEl, avg, cfg.formatter);
    if (minEl) minEl.textContent = cfg.formatter(min);
    if (maxEl) maxEl.textContent = cfg.formatter(max);

    const trend = calculateTrend(values);
    updateTrendPill(metric, trend);
    updateKpiTrend(metric, trend);

    return { avg, trend, values };
}

/* ============================================================
   8. Animated Counter
============================================================ */
function animateCounter(el, targetValue, formatter, duration = 800) {
    const startValue = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = startValue + (targetValue - startValue) * eased;

        el.textContent = formatter(value);

        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = formatter(targetValue);
    }

    requestAnimationFrame(step);
}

/* ============================================================
   9. Skeleton Loader
============================================================ */
function showSkeletons() {
    document.querySelectorAll('.skeleton-overlay').forEach(el => el.classList.add('active'));
}

function hideSkeletons() {
    document.querySelectorAll('.skeleton-overlay').forEach(el => el.classList.remove('active'));
}

/* ============================================================
   10. Render All Charts
============================================================ */
function renderCharts(filteredData) {
    if (!filteredData.length) {
        showToast('error', 'لا توجد بيانات في النطاق الزمني المحدد');
        // امسح الرسوم
        Object.keys(charts).forEach(k => { charts[k]?.destroy(); charts[k] = null; });
        return;
    }

    const labels = filteredData.map(d => formatDateShort(d.date));
    const metrics = Object.keys(METRIC_CONFIGS);
    const metricResults = {};

    metrics.forEach(metric => {
        const cfg = METRIC_CONFIGS[metric];
        const values = filteredData.map(d => d[metric]);
        const canvasId = metric + 'Chart';

        if (charts[metric]) charts[metric].destroy();
        charts[metric] = createChart(canvasId, {
            labels,
            data: values,
            label: cfg.label,
            color: cfg.color,
            gradientFrom: cfg.gradientFrom,
            gradientTo: cfg.gradientTo,
            min: cfg.min,
            max: cfg.max,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: cfg.tooltip,
            yTickFormatter: metric === 'sleep' ? (v) => v + 'س' : (metric === 'food' || metric === 'medication' || metric === 'health') ? (v) => v + '%' : undefined
        });

        metricResults[metric] = updateChartStats(metric, values);
    });

    updateTrendAnalysis(metricResults);
    checkSmartAlerts(filteredData);
}

/* ============================================================
   11. Trend Analysis
============================================================ */
function updateTrendAnalysis(results) {
    const bestEl = document.getElementById('taBestMetric');
    const worstEl = document.getElementById('taWorstMetric');
    const overallEl = document.getElementById('taOverall');
    const riskEl = document.getElementById('taRiskLevel');

    if (!bestEl) return;

    const improvements = Object.entries(results).map(([key, r]) => {
        const isNegative = NEGATIVE_METRICS.includes(key);
        const improvementScore = isNegative
            ? (r.trend === 'down' ? 2 : r.trend === 'up' ? -2 : 0)
            : (r.trend === 'up' ? 2 : r.trend === 'down' ? -2 : 0);
        return { key, ...r, score: improvementScore };
    });

    const sorted = improvements.sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best) {
        bestEl.textContent = `${METRIC_CONFIGS[best.key].label} (${best.trend === 'up' ? '↑' : best.trend === 'down' ? '↓' : '='})`;
    }
    if (worst) {
        worstEl.textContent = `${METRIC_CONFIGS[worst.key].label} (${worst.trend === 'up' ? '↑' : worst.trend === 'down' ? '↓' : '='})`;
    }

    const upCount = improvements.filter(i => i.trend === 'up').length;
    const downCount = improvements.filter(i => i.trend === 'down').length;
    const stableCount = improvements.filter(i => i.trend === 'stable').length;

    if (upCount > downCount && upCount > stableCount) {
        overallEl.textContent = 'تحسن عام ✅';
        overallEl.style.color = '#047857';
    } else if (downCount > upCount && downCount > stableCount) {
        overallEl.textContent = 'تدهور عام ⚠️';
        overallEl.style.color = '#b91c1c';
    } else {
        overallEl.textContent = 'مستقر';
        overallEl.style.color = 'var(--bn-text)';
    }

    const suicidalResult = results.suicidal;
    if (suicidalResult) {
        const avgSuicidal = suicidalResult.avg;
        let riskText = '';
        let riskColor = '';
        if (avgSuicidal >= 4) { riskText = 'خطر حرج 🔴'; riskColor = '#991b1b'; }
        else if (avgSuicidal >= 3) { riskText = 'خطر عالي 🟠'; riskColor = '#b91c1c'; }
        else if (avgSuicidal >= 2) { riskText = 'خطر متوسط 🟡'; riskColor = '#b45309'; }
        else if (avgSuicidal >= 1) { riskText = 'خطر منخفض 🟢'; riskColor = '#047857'; }
        else { riskText = 'لا يوجد خطر ✅'; riskColor = '#047857'; }
        riskEl.textContent = riskText;
        riskEl.style.color = riskColor;
    }
}

/* ============================================================
   12. Smart Alerts
============================================================ */
function checkSmartAlerts(filteredData) {
    const criticalEl = document.getElementById('smartAlertCritical');
    const criticalMsg = document.getElementById('smartAlertCriticalMessage');
    const warningEl = document.getElementById('smartAlertWarning');
    const warningMsg = document.getElementById('smartAlertWarningMessage');

    if (!criticalEl || !warningEl) return;

    const criticalAlerts = [];
    const warningAlerts = [];
    const lastN = (n) => filteredData.slice(-n);

    const recentSuicidal = lastN(3).map(d => d.suicidal);
    if (recentSuicidal.some(v => v >= 3)) {
        criticalAlerts.push('⚠️ أفكار انتحارية مرتفعة في آخر 3 أيام — تدخل فوري مطلوب');
    }

    const recentMood = lastN(3).map(d => d.mood);
    if (recentMood.length === 3 && recentMood.every(v => v < 3)) {
        criticalAlerts.push('⚠️ مزاج منخفض جداً (< 3) لآخر 3 أيام متتالية');
    }

    const recentEnergy = lastN(3).map(d => d.energy);
    if (recentEnergy.length === 3 && recentEnergy.every(v => v < 3)) {
        criticalAlerts.push('⚠️ طاقة منخفضة جداً (< 3) لآخر 3 أيام متتالية');
    }

    const recentHope = lastN(3).map(d => d.hope);
    if (recentHope.length === 3 && recentHope.every(v => v < 3)) {
        warningAlerts.push('انخفاض مستوى الأمل (< 3) لآخر 3 أيام');
    }

    const recentSleep = lastN(3).map(d => d.sleep);
    if (recentSleep.length === 3 && recentSleep.every(v => v < 4)) {
        warningAlerts.push('ساعات النوم أقل من 4 لمدة 3 أيام متتالية');
    }

    const recentMed = lastN(3).map(d => d.medication);
    if (recentMed.length === 3 && recentMed.every(v => v < 50)) {
        warningAlerts.push('التزام بالأدوية أقل من 50% لآخر 3 أيام');
    }

    const recentNeg = lastN(3).map(d => d.negative);
    if (recentNeg.length === 3 && recentNeg.every(v => v > 12)) {
        warningAlerts.push('أفكار سلبية مرتفعة (> 12) لآخر 3 أيام');
    }

    const recentGuilt = lastN(3).map(d => d.guilt);
    if (recentGuilt.length === 3 && recentGuilt.every(v => v > 7)) {
        warningAlerts.push('شعور بالذنب مرتفع (> 7) لآخر 3 أيام');
    }

    if (criticalAlerts.length > 0) {
        criticalEl.style.display = 'flex';
        criticalMsg.innerHTML = criticalAlerts.join(' • ');
    } else {
        criticalEl.style.display = 'none';
    }

    if (warningAlerts.length > 0) {
        warningEl.style.display = 'flex';
        warningMsg.innerHTML = warningAlerts.join(' • ');
    } else {
        warningEl.style.display = 'none';
    }
}

/* ============================================================
   13. Filter Logic (client-side, based on loaded data)
============================================================ */
function filterDataByRange(range, startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fromDate, toDate = new Date(today);

    switch (range) {
        case 'week': fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 7); break;
        case 'month': fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 30); break;
        case 'threeMonths': fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 90); break;
        case 'sixMonths': fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 180); break;
        case 'custom':
            if (startDate && endDate) {
                fromDate = new Date(startDate); fromDate.setHours(0, 0, 0, 0);
                toDate = new Date(endDate); toDate.setHours(23, 59, 59, 999);
            } else {
                fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 7);
            }
            break;
        default:
            fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 7);
    }

    return allData.filter(d => {
        const dDate = new Date(d.date);
        return dDate >= fromDate && dDate <= toDate;
    });
}

/* ============================================================
   14. Apply Filter — تحميل من السيرفر + عرض
============================================================ */
async function applyFilter(range, startDate, endDate, showLoader = true) {
    if (showLoader) showSkeletons();

    const result = await loadStatsFromServer(range, startDate, endDate);

    // فلترة إضافية على السيرفر ممكن تكون السبب، لكن لو الـ API رجّع نطاق أوسع،
    // بنعمل فلترة احتياطية في الفرونت.
    let filtered = result;
    if (range !== 'custom') {
        filtered = filterDataByRange(range, null, null);
        // لو السيرفر رجّع بيانات أقل، نستخدم اللي رجع
        if (filtered.length === 0 && result.length > 0) filtered = result;
    } else if (startDate && endDate) {
        filtered = filterDataByRange('custom', startDate, endDate);
        if (filtered.length === 0 && result.length > 0) filtered = result;
    }

    if (filtered.length === 0) {
        showToast('info', 'لا توجد بيانات في النطاق المحدد');
    }

    renderCharts(filtered);
    hideSkeletons();
}

/* ============================================================
   15. Filter Events
============================================================ */
(function initFilters() {
    const chipButtons = document.querySelectorAll('.chip-btn');
    const customPanel = document.getElementById('customDatesPanel');
    const applyBtn = document.getElementById('applyCustomFilter');

    chipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            chipButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const range = btn.dataset.range;

            if (range === 'custom') {
                customPanel.classList.add('show');
            } else {
                customPanel.classList.remove('show');
                applyFilter(range);
                showToast('info', `تم تحديث البيانات: ${btn.textContent.trim()}`);
            }
        });
    });

    applyBtn.addEventListener('click', () => {
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;

        if (!startDate || !endDate) {
            showToast('error', 'يرجى اختيار تاريخ البداية والنهاية');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showToast('error', 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
            return;
        }

        applyFilter('custom', startDate, endDate);
        showToast('success', 'تم تطبيق الفلتر المخصص');
    });
})();

/* ============================================================
   16. Smart Alert Close Buttons
============================================================ */
(function initAlertClose() {
    const criticalClose = document.getElementById('smartAlertCriticalClose');
    const warningClose = document.getElementById('smartAlertWarningClose');

    if (criticalClose) {
        criticalClose.addEventListener('click', () => {
            document.getElementById('smartAlertCritical').style.display = 'none';
        });
    }
    if (warningClose) {
        warningClose.addEventListener('click', () => {
            document.getElementById('smartAlertWarning').style.display = 'none';
        });
    }
})();

/* ============================================================
   17. Scroll Events
============================================================ */
(function initScrollEvents() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const filterBar = document.getElementById('filterBar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }

        if (window.scrollY > 50) {
            filterBar.classList.add('scrolled');
        } else {
            filterBar.classList.remove('scrolled');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

/* ============================================================
   18. Init
============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
    const patientId = getPatientId();
    if (!patientId) {
        showToast('error', 'لم يتم تحديد المريض');
        console.warn('⚠️ لا يوجد patientId في URL أو sessionStorage');
        return;
    }

    // عرض اسم المريض في الـ Hero إن أمكن
    const nameEl = document.getElementById('heroPatientName');
    if (nameEl) {
        const name = sessionStorage.getItem('bnLastPatientName') || sessionStorage.getItem('bnCurrentPatientName');
        if (name) nameEl.textContent = `— ${name}`;
    }

    await applyFilter('week');

    setTimeout(() => {
        showToast('success', 'مرحباً بك في لوحة إحصائيات الاكتئاب');
    }, 600);

    console.log('%c✅ Depression Stats Ready (API-driven)',
        'background:linear-gradient(135deg,#0891b2,#6366f1);color:#fff;padding:10px 24px;border-radius:10px;font-weight:bold;font-size:13px;');
});