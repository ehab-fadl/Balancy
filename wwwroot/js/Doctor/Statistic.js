  /* ============================================================
       1. Toast Notifications
    ============================================================ */
    function showToast(type, message, duration = 3000) {
        const stack = document.getElementById('toastStack');
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
       2. Mock Data Generator
    ============================================================ */
    function generateMockData() {
        const data = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 365; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
            const progress = (365 - i) / 365;
            const improvement = progress * 15;

            data.push({
                date: date.toISOString().slice(0, 10),
                food: Math.min(100, Math.max(20,
                    Math.round(55 + improvement + (Math.random() * 30 - 15) + (isWeekend ? -8 : 0))
                )),
                sleep: Math.min(10, Math.max(3,
                    +(5.5 + (improvement / 20) + (Math.random() * 3 - 1.5) + (isWeekend ? 1 : -0.5)).toFixed(1)
                )),
                medication: Math.min(100, Math.max(30,
                    Math.round(75 + improvement + (Math.random() * 20 - 10))
                )),
                mood: Math.min(10, Math.max(1,
                    Math.round(5 + (improvement / 8) + (Math.random() * 4 - 2))
                )),
                negative: Math.max(0,
                    Math.round(9 - (improvement / 4) + (Math.random() * 6 - 3) + (isWeekend ? -1 : 1))
                ),
                health: Math.min(100, Math.max(15,
                    Math.round(50 + improvement + (Math.random() * 30 - 15))
                ))
            });
        }
        return data;
    }

    const allData = generateMockData();

    /* ============================================================
       3. Chart Manager
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
                animation: {
                    duration: 900,
                    easing: 'easeOutQuart'
                },
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
       4. Filter Logic
    ============================================================ */
    function filterDataByRange(range, startDate, endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let fromDate, toDate = new Date(today);

        switch (range) {
            case 'week':
                fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 7);
                break;
            case 'month':
                fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 30);
                break;
            case 'threeMonths':
                fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 90);
                break;
            case 'sixMonths':
                fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 180);
                break;
            case 'custom':
                if (startDate && endDate) {
                    fromDate = new Date(startDate);
                    fromDate.setHours(0, 0, 0, 0);
                    toDate = new Date(endDate);
                    toDate.setHours(23, 59, 59, 999);
                } else {
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 7);
                }
                break;
            default:
                fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 7);
        }

        return allData.filter(d => {
            const dDate = new Date(d.date);
            return dDate >= fromDate && dDate <= toDate;
        });
    }

    /* ============================================================
       5. Helpers
    ============================================================ */
    function formatDateShort(dateStr) {
        const d = new Date(dateStr);
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
       6. Update UI
    ============================================================ */
    function updateTrendPill(metric, trend) {
        const pill = document.querySelector(`[data-trend="${metric}"]`);
        if (!pill) return;

        pill.classList.remove('trend-up', 'trend-down', 'trend-stable');

        const configs = {
            food: {
                up: { icon: 'fa-arrow-trend-up', text: 'تحسن في جودة التغذية', cls: 'trend-up' },
                down: { icon: 'fa-arrow-trend-down', text: 'انخفاض في جودة التغذية', cls: 'trend-down' },
                stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
            },
            sleep: {
                up: { icon: 'fa-arrow-trend-up', text: 'تحسن في ساعات النوم', cls: 'trend-up' },
                down: { icon: 'fa-arrow-trend-down', text: 'انخفاض في ساعات النوم', cls: 'trend-down' },
                stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
            },
            medication: {
                up: { icon: 'fa-arrow-trend-up', text: 'تحسن في الالتزام', cls: 'trend-up' },
                down: { icon: 'fa-arrow-trend-down', text: 'انخفاض في الالتزام', cls: 'trend-down' },
                stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
            },
            mood: {
                up: { icon: 'fa-arrow-trend-up', text: 'تحسن في المزاج', cls: 'trend-up' },
                down: { icon: 'fa-arrow-trend-down', text: 'انخفاض في المزاج', cls: 'trend-down' },
                stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
            },
            negative: {
                up: { icon: 'fa-arrow-trend-up', text: 'ارتفاع في الأفكار السلبية', cls: 'trend-down' },
                down: { icon: 'fa-arrow-trend-down', text: 'انخفاض في الأفكار السلبية', cls: 'trend-up' },
                stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
            },
            health: {
                up: { icon: 'fa-arrow-trend-up', text: 'تحسن في الاهتمام الجسدي', cls: 'trend-up' },
                down: { icon: 'fa-arrow-trend-down', text: 'انخفاض في الاهتمام الجسدي', cls: 'trend-down' },
                stable: { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' }
            }
        };

        const conf = configs[metric] ? configs[metric][trend] : { icon: 'fa-minus', text: 'مستقر', cls: 'trend-stable' };
        pill.classList.add(conf.cls);
        pill.innerHTML = `<i class="fa-solid ${conf.icon}"></i> ${conf.text}`;
    }

    function updateKpiTrend(metric, trend) {
        const kpiTrend = document.querySelector(`[data-kpi-trend="${metric}"]`);
        if (!kpiTrend) return;

        kpiTrend.classList.remove('up', 'down', 'stable');

        const configs = {
            up: { icon: 'fa-arrow-up', text: 'تحسن' },
            down: { icon: 'fa-arrow-down', text: 'انخفاض' },
            stable: { icon: 'fa-minus', text: 'مستقر' }
        };

        const conf = configs[trend] || configs.stable;
        kpiTrend.classList.add(trend);
        kpiTrend.innerHTML = `<i class="fa-solid ${conf.icon}"></i> ${conf.text}`;
    }

    function updateChartStats(metric, values) {
        const avgEl = document.querySelector(`[data-avg="${metric}"]`);
        const kpiEl = document.querySelector(`[data-kpi="${metric}"]`);
        const minEl = document.querySelector(`[data-min="${metric}"]`);
        const maxEl = document.querySelector(`[data-max="${metric}"]`);

        const avg = average(values);
        const min = Math.min(...values);
        const max = Math.max(...values);

        const formatters = {
            food: (v) => Math.round(v) + '%',
            sleep: (v) => v.toFixed(1) + ' س',
            medication: (v) => Math.round(v) + '%',
            mood: (v) => v.toFixed(1) + '/10',
            negative: (v) => Math.round(v),
            health: (v) => Math.round(v) + '%'
        };

        const fmt = formatters[metric] || ((v) => v);

        if (avgEl) animateCounter(avgEl, avg, fmt);
        if (kpiEl) animateCounter(kpiEl, avg, fmt);
        if (minEl) minEl.textContent = fmt(min);
        if (maxEl) maxEl.textContent = fmt(max);

        updateTrendPill(metric, calculateTrend(values));
        updateKpiTrend(metric, calculateTrend(values));
    }

    /* ============================================================
       7. Animated Counter
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
       8. Skeleton Loader
    ============================================================ */
    function showSkeletons() {
        document.querySelectorAll('.skeleton-overlay').forEach(el => el.classList.add('active'));
    }

    function hideSkeletons() {
        document.querySelectorAll('.skeleton-overlay').forEach(el => el.classList.remove('active'));
    }

    /* ============================================================
       9. Render All Charts
    ============================================================ */
    function renderCharts(filteredData) {
        if (!filteredData.length) {
            showToast('error', 'لا توجد بيانات في النطاق الزمني المحدد');
            return;
        }

        const labels = filteredData.map(d => formatDateShort(d.date));

        // 1. الغذاء
        const foodData = filteredData.map(d => d.food);
        if (charts.food) charts.food.destroy();
        charts.food = createChart('foodChart', {
            labels, data: foodData, label: 'جودة التغذية',
            color: '#ea580c',
            gradientFrom: 'rgba(234, 88, 12, 0.35)',
            gradientTo: 'rgba(234, 88, 12, 0.02)',
            min: 0, max: 100,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: (v) => `جودة التغذية: ${v}%`,
            yTickFormatter: (v) => v + '%'
        });
        updateChartStats('food', foodData);

        // 2. النوم
        const sleepData = filteredData.map(d => d.sleep);
        if (charts.sleep) charts.sleep.destroy();
        charts.sleep = createChart('sleepChart', {
            labels, data: sleepData, label: 'ساعات النوم',
            color: '#6d28d9',
            gradientFrom: 'rgba(109, 40, 217, 0.35)',
            gradientTo: 'rgba(109, 40, 217, 0.02)',
            min: 0, max: 12,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: (v) => `${v} ساعة`,
            yTickFormatter: (v) => v + 'س'
        });
        updateChartStats('sleep', sleepData);

        // 3. الالتزام بالأدوية
        const medData = filteredData.map(d => d.medication);
        if (charts.medication) charts.medication.destroy();
        charts.medication = createChart('medicationChart', {
            labels, data: medData, label: 'الالتزام بالأدوية',
            color: '#15803d',
            gradientFrom: 'rgba(21, 128, 61, 0.35)',
            gradientTo: 'rgba(21, 128, 61, 0.02)',
            min: 0, max: 100,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: (v) => `الالتزام: ${v}%`,
            yTickFormatter: (v) => v + '%'
        });
        updateChartStats('medication', medData);

        // 4. المزاج
        const moodData = filteredData.map(d => d.mood);
        if (charts.mood) charts.mood.destroy();
        charts.mood = createChart('moodChart', {
            labels, data: moodData, label: 'تقييم المزاج',
            color: '#b45309',
            gradientFrom: 'rgba(180, 83, 9, 0.35)',
            gradientTo: 'rgba(180, 83, 9, 0.02)',
            min: 0, max: 10,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: (v) => `المزاج: ${v}/10`
        });
        updateChartStats('mood', moodData);

        // 5. الأفكار السلبية
        const negData = filteredData.map(d => d.negative);
        if (charts.negative) charts.negative.destroy();
        charts.negative = createChart('negativeChart', {
            labels, data: negData, label: 'الأفكار السلبية',
            color: '#b91c1c',
            gradientFrom: 'rgba(185, 28, 28, 0.35)',
            gradientTo: 'rgba(185, 28, 28, 0.02)',
            min: 0, max: 20,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: (v) => `عدد الأفكار: ${v}`
        });
        updateChartStats('negative', negData);

        // 6. الاهتمام بالحالة الجسدية
        const healthData = filteredData.map(d => d.health);
        if (charts.health) charts.health.destroy();
        charts.health = createChart('healthChart', {
            labels, data: healthData, label: 'الاهتمام بالحالة الجسدية',
            color: '#0e7490',
            gradientFrom: 'rgba(14, 116, 144, 0.35)',
            gradientTo: 'rgba(14, 116, 144, 0.02)',
            min: 0, max: 100,
            pointRadius: filteredData.length > 30 ? 0 : 3,
            tooltipLabel: (v) => `الاهتمام الجسدي: ${v}%`,
            yTickFormatter: (v) => v + '%'
        });
        updateChartStats('health', healthData);
    }

    /* ============================================================
       10. Apply Filter (with loading animation)
    ============================================================ */
    function applyFilter(range, startDate, endDate, showLoader = true) {
        if (showLoader) showSkeletons();

        setTimeout(() => {
            const filtered = filterDataByRange(range, startDate, endDate);
            renderCharts(filtered);
            hideSkeletons();
        }, showLoader ? 400 : 0);
    }

    /* ============================================================
       11. Filter Events
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
       12. Scroll Events
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
       13. Init
    ============================================================ */
    window.addEventListener('DOMContentLoaded', () => {
        applyFilter('week');

        setTimeout(() => {
            showToast('success', 'مرحباً بك في لوحة إحصائيات الاكتئاب');
        }, 600);

        console.log('%c✅ Depression Stats Ready',
            'background:linear-gradient(135deg,#0891b2,#6366f1);color:#fff;padding:10px 24px;border-radius:10px;font-weight:bold;font-size:13px;');
    });