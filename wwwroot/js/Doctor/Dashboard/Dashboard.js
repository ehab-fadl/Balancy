   /* ============================================================
           0. Safe DOM Helpers
        ============================================================ */
        const bnGet = (id) => document.getElementById(id);

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
           2. Mock Data
        ============================================================ */
        const appointments = [
            { id: 1, time: '09:00', patient: 'أحمد محمد علي', code: 'AB123456', type: 'متابعة', status: 'confirmed', age: 32 },
            { id: 2, time: '10:30', patient: 'سارة عبدالله حسن', code: 'CD234567', type: 'جلسة علاج', status: 'confirmed', age: 27 },
            { id: 3, time: '11:15', patient: 'خالد إبراهيم سالم', code: 'EF345678', type: 'طارئة', status: 'pending', age: 41, critical: true },
            { id: 4, time: '12:00', patient: 'فاطمة حسن مصطفى', code: 'GH456789', type: 'متابعة', status: 'confirmed', age: 23 },
            { id: 5, time: '14:30', patient: 'عمر يوسف النجار', code: 'IJ567890', type: 'تقييم', status: 'pending', age: 35 },
            { id: 6, time: '16:00', patient: 'مريم سعيد رمضان', code: 'KL678901', type: 'جلسة علاج', status: 'confirmed', age: 26 }
        ];

        const alerts = [
            { id: 1, level: 'critical', title: '🚨 خطر انتحار مرتفع', desc: 'خالد إبراهيم — C-SSRS = 4، يحتاج تدخل فوري' },
            { id: 2, level: 'critical', title: '🚨 تدهور سريع', desc: 'خالد إبراهيم — ارتفع PHQ-9 بمقدار 12 نقطة' },
            { id: 3, level: 'warning', title: '⚠️ مريض متأخر', desc: 'سارة عبدالله — آخر زيارة منذ 47 يوم' },
            { id: 4, level: 'warning', title: '⚠️ التزام ضعيف', desc: 'خالد إبراهيم — فاته 3 مواعيد' },
            { id: 5, level: 'info', title: '📋 موعد إعادة تقييم', desc: 'مريم سعيد — مر شهر على آخر تقييم' }
        ];

        const recentPatients = [
            { id: 1, firstName: 'فاطمة', lastName: 'حسن مصطفى', code: 'GH456789', age: 23, status: 'active', time: 'قبل 15 دقيقة' },
            { id: 2, firstName: 'مريم', lastName: 'سعيد رمضان', code: 'KL678901', age: 26, status: 'active', time: 'قبل 3 ساعات' },
            { id: 3, firstName: 'عمر', lastName: 'يوسف النجار', code: 'IJ567890', age: 35, status: 'inactive', time: 'أمس' },
            { id: 4, firstName: 'خالد', lastName: 'إبراهيم سالم', code: 'EF345678', age: 41, status: 'critical', time: 'قبل يومين' }
        ];

        /* ============================================================
           3. Render Today's Appointments
        ============================================================ */
        function renderAppointments() {
            const container = bnGet('appointmentsList');
            if (!container) return;

            container.innerHTML = '';

            if (appointments.length === 0) {
                container.innerHTML = `
                    <div class="empty-mini">
                        <i class="fa-solid fa-calendar-xmark"></i>
                        <p>لا توجد مواعيد اليوم</p>
                    </div>
                `;
                return;
            }

            const now = new Date();
            const currentHour = now.getHours();

            appointments.forEach((apt, index) => {
                const aptHour = parseInt(apt.time.split(':')[0]);
                const isCurrent = Math.abs(aptHour - currentHour) === 0;
                const isPast = aptHour < currentHour;

                const el = document.createElement('div');
                el.className = `appointment-item ${isCurrent ? 'is-current' : ''} ${isPast ? 'is-past' : ''}`;
                el.style.animation = `slideUpFade 0.4s ease ${index * 0.05}s backwards`;

                const statusIcon = apt.status === 'confirmed' ? 'fa-check' :
                                 apt.status === 'cancelled' ? 'fa-xmark' : 'fa-clock';

                el.innerHTML = `
                    <div class="appointment-time">${apt.time}</div>
                    <div class="appointment-info">
                        <p class="appointment-name">${apt.patient}</p>
                        <div class="appointment-meta">
                            <span class="appointment-type">
                                <i class="fa-solid fa-tag"></i>
                                ${apt.type}
                            </span>
                            <span><i class="fa-solid fa-hashtag"></i> ${apt.code}</span>
                            ${apt.critical ? '<span style="color: var(--bn-danger); font-weight: 900;"><i class="fa-solid fa-circle-exclamation"></i> عاجل</span>' : ''}
                        </div>
                    </div>
                    <div class="appointment-status ${apt.status}">
                        <i class="fa-solid ${statusIcon}"></i>
                    </div>
                `;

                el.addEventListener('click', () => {
                    showToast('info', 'موعد مريض', `${apt.patient} — ${apt.time}`, 2500);
                });

                container.appendChild(el);
            });

            const count = bnGet('appointmentsCount');
            if (count) count.textContent = `${appointments.length} مواعيد`;
        }

        /* ============================================================
           4. Render Alerts Widget
        ============================================================ */
        function renderAlerts() {
            const container = bnGet('alertsWidget');
            if (!container) return;

            container.innerHTML = '';

            if (alerts.length === 0) {
                container.innerHTML = `
                    <div class="empty-mini">
                        <i class="fa-solid fa-check-circle"></i>
                        <p>لا توجد تنبيهات نشطة</p>
                    </div>
                `;
                return;
            }

            alerts.forEach((alert, index) => {
                const el = document.createElement('div');
                el.className = `alert-item ${alert.level}`;
                el.style.animation = `slideUpFade 0.4s ease ${index * 0.05}s backwards`;

                el.innerHTML = `
                    <div class="alert-dot"></div>
                    <div class="alert-content">
                        <p class="alert-title">${alert.title}</p>
                        <p class="alert-desc">${alert.desc}</p>
                    </div>
                `;

                el.addEventListener('click', () => {
                    showToast('info', 'تنبيه', alert.title, 2500);
                });

                container.appendChild(el);
            });

            const count = bnGet('alertsCount');
            if (count) count.textContent = `${alerts.length} تنبيهات`;
        }

        /* ============================================================
           5. Render Recent Patients
        ============================================================ */
        function renderRecentPatients() {
            const container = bnGet('recentPatientsList');
            if (!container) return;

            container.innerHTML = '';

            recentPatients.forEach((p, index) => {
                const initials = (p.firstName?.charAt(0) || '') + (p.lastName?.charAt(0) || '');
                const statusText = { active: 'نشط', critical: 'حرج', inactive: 'غير نشط' }[p.status];

                const el = document.createElement('div');
                el.className = 'patient-item';
                el.style.animation = `slideUpFade 0.4s ease ${index * 0.05}s backwards`;

                el.innerHTML = `
                    <div class="patient-avatar">${initials}</div>
                    <div class="patient-info">
                        <p class="patient-name">${p.firstName} ${p.lastName}</p>
                        <div class="patient-meta">
                            <span><i class="fa-solid fa-hashtag"></i> ${p.code}</span>
                            <span>${p.age} سنة</span>
                            <span>· ${p.time}</span>
                        </div>
                    </div>
                    <span class="patient-status ${p.status}">${statusText}</span>
                `;

                el.addEventListener('click', () => {
                    showToast('info', 'ملف المريض', `${p.firstName} ${p.lastName}`, 2500);
                });

                container.appendChild(el);
            });
        }

        /* ============================================================
           6. Update Welcome Header
        ============================================================ */
        function updateWelcomeHeader() {
            const now = new Date();

            // التاريخ بالعربية
            const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

            const dayName = days[now.getDay()];
            const dayNumber = now.getDate();
            const monthName = months[now.getMonth()];
            const year = now.getFullYear();

            const dateEl = bnGet('todayDate');
            if (dateEl) dateEl.textContent = `${dayName}، ${dayNumber} ${monthName} ${year}`;

            // الترحيب حسب الوقت
            const hour = now.getHours();
            let greeting = 'أتمنى لك يوماً موفقاً';
            if (hour < 12) greeting = 'صباح الخير! أتمنى لك يوماً موفقاً';
            else if (hour < 17) greeting = 'مساء الخير! أتمنى لك يوماً موفقاً';
            else greeting = 'مساء الخير! أتمنى لك ليلة هادئة';

            const greetingEl = bnGet('greetingText');
            if (greetingEl) greetingEl.textContent = greeting;
        }

        /* ============================================================
           7. Animated Numbers
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
            animateNumber(bnGet('statTodayAppointments'), appointments.length);
            animateNumber(bnGet('statTotalPatients'), 248);
            animateNumber(bnGet('statCriticalPatients'), 3);
            animateNumber(bnGet('statNewPatients'), 23);
        }

        /* ============================================================
           8. Events
        ============================================================ */
        document.addEventListener('click', (e) => {

            // مريض جديد
            if (e.target.closest('#addPatientBtn')) {
                e.preventDefault();
                showToast('info', 'إضافة مريض', 'سيتم نقلك لصفحة إضافة مريض جديد...', 2500);
                return;
            }

            // التنبيهات
            if (e.target.closest('#viewAlertsBtn')) {
                e.preventDefault();
                showToast('info', 'التنبيهات', `يوجد ${alerts.length} تنبيه نشط.`, 2500);
                return;
            }

            // إجراءات سريعة
            const quickAction = e.target.closest('.quick-action-card');
            if (quickAction) {
                e.preventDefault();
                const action = quickAction.dataset.action;
                const messages = {
                    'add-patient': 'إضافة مريض جديد',
                    'new-session': 'بدء جلسة استماع جديدة',
                    'search-patient': 'البحث عن مريض',
                    'view-stats': 'عرض الإحصائيات'
                };
                showToast('info', 'إجراء سريع', messages[action] || 'قيد التنفيذ...', 2500);
                return;
            }

            // عرض كل المرضى
            if (e.target.closest('.see-all')) {
                e.preventDefault();
                showToast('info', 'عرض الكل', 'سيتم نقلك لصفحة جميع المرضى...', 2500);
                return;
            }
        });

        /* ============================================================
           9. Init
        ============================================================ */
        window.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 بدء تشغيل لوحة التحكم...');

            updateWelcomeHeader();
            updateStats();
            renderAppointments();
            renderAlerts();
            renderRecentPatients();

            setTimeout(() => {
                showToast('success', 'مرحباً بك', 'نظرة سريعة على أنشطة اليوم والمهام المهمة.', 4500);
            }, 1000);

            console.log('%c✅ Doctor Dashboard Loaded',
                'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
            console.log(`📊 مواعيد اليوم: ${appointments.length} | تنبيهات: ${alerts.length} | مرضى جدد: ${recentPatients.length}`);
        });