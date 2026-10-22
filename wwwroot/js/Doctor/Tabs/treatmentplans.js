/* ============================================================
   Treatment Plans Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initTreatmentPlans() {
    console.log('🚀 TreatmentPlans.js initialized');

    /* ============================================================
       1. Storage Layer
    ============================================================ */
    const storage = (window.bnApp && window.bnApp.bnStorage) ? window.bnApp.bnStorage : {
        prefix: 'balancy_',
        isAvailable() {
            try { const t = '__bn_test__'; localStorage.setItem(t, t); localStorage.removeItem(t); return true; }
            catch (e) { return false; }
        },
        get(key, defaultValue = null) {
            if (!this.isAvailable()) return defaultValue;
            try { const raw = localStorage.getItem(this.prefix + key); return raw ? JSON.parse(raw) : defaultValue; }
            catch (e) { return defaultValue; }
        },
        set(key, value) {
            if (!this.isAvailable()) return false;
            try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); return true; }
            catch (e) { return false; }
        },
        remove(key) {
            if (!this.isAvailable()) return;
            try { localStorage.removeItem(this.prefix + key); } catch (e) { }
        }
    };

    /* ============================================================
       2. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       3. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-tp-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-tp-toast-styles';
        style.textContent = `
            .bn-tp-toast-overlay { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
            .bn-tp-toast-overlay.show { display: flex !important; }
            .bn-tp-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnTpToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; position: relative; }
            .bn-tp-toast.hide { animation: bnTpToastOut 0.3s ease forwards; }
            .bn-tp-toast-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.22); font-size: 1.05rem; }
            .bn-tp-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-tp-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-tp-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-tp-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-tp-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-tp-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-tp-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnTpToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnTpToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnTpToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnTpToastOverlay';
            overlay.className = 'bn-tp-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-tp-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-tp-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-tp-toast-body">
                <div class="bn-tp-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-tp-toast-message">${escapeHtml(message || '')}</div>
            </div>
        `;
        overlay.appendChild(toast);
        overlay.classList.add('show');
        clearTimeout(overlay._hideTimer);
        clearTimeout(overlay._removeTimer);
        overlay._hideTimer = setTimeout(() => {
            toast.classList.add('hide');
            overlay._removeTimer = setTimeout(() => {
                overlay.classList.remove('show');
                overlay.innerHTML = '';
            }, 320);
        }, duration);
    }

    const showToast = showBuiltInToast;

    /* ============================================================
       4. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],
        ensureEl() {
            if (this.el && document.body.contains(this.el)) return this.el;
            let existing = document.getElementById('bnConfetti');
            if (!existing) {
                existing = document.createElement('div');
                existing.className = 'bn-confetti';
                existing.id = 'bnConfetti';
                document.body.appendChild(existing);
            }
            this.el = existing;
            return existing;
        },
        fire(duration = 2000) {
            const el = this.ensureEl();
            if (!el) return;
            el.innerHTML = '';
            el.classList.add('active');
            const pieceCount = 60;
            for (let i = 0; i < pieceCount; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = Math.random() * 100 + '%';
                piece.style.animationDelay = Math.random() * 0.5 + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
                piece.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
                el.appendChild(piece);
            }
            setTimeout(() => { el.classList.remove('active'); el.innerHTML = ''; }, duration);
        }
    };

    /* ============================================================
       5. Focus Trap
    ============================================================ */
    const bnFocusTrap = {
        activeTrap: null,
        activate(modalEl) {
            if (!modalEl) return;
            const focusableSelector = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(',');
            const previousActive = document.activeElement;
            const trap = {
                modalEl, previousActive,
                getFocusable: () => Array.from(modalEl.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null),
                handleKeydown: (e) => {
                    if (e.key !== 'Tab') return;
                    const focusables = trap.getFocusable();
                    if (focusables.length === 0) { e.preventDefault(); return; }
                    const first = focusables[0], last = focusables[focusables.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            modalEl.addEventListener('keydown', trap.handleKeydown);
            this.activeTrap = trap;
            setTimeout(() => { const f = trap.getFocusable(); if (f.length > 0) f[0].focus(); }, 100);
        },
        deactivate() {
            if (!this.activeTrap) return;
            this.activeTrap.modalEl.removeEventListener('keydown', this.activeTrap.handleKeydown);
            if (this.activeTrap.previousActive && this.activeTrap.previousActive.focus) { try { this.activeTrap.previousActive.focus(); } catch (e) { } }
            this.activeTrap = null;
        }
    };

    /* ============================================================
       6. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            tpPlanName: { required: true, minLength: 3, maxLength: 150, messages: { required: 'اسم الخطة مطلوب' } },
            tpPlanStatus: { required: true, messages: { required: 'يرجى اختيار حالة الخطة' } },
            tpPlanStartDate: { required: true, messages: { required: 'تاريخ البدء مطلوب' } },
            tpPlanEndDate: {
                required: true, messages: { required: 'تاريخ الانتهاء مطلوب' },
                customValidator: function (field) {
                    const start = document.getElementById('tpPlanStartDate').value;
                    const end = field.value;
                    if (start && end && end < start) {
                        return { valid: false, type: 'error', message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء' };
                    }
                    return { valid: true };
                }
            }
        },
        validators: {
            required: (v) => v !== null && v !== undefined && String(v).trim().length > 0,
            minLength: (v, len) => !v || v.length >= len,
            maxLength: (v, len) => !v || v.length <= len
        },
        validateField(field) {
            const name = field.name || field.id;
            const rule = this.rules[name];
            if (!rule) return { valid: true };
            const value = field.value;
            if (rule.required && !this.validators.required(value)) return { valid: false, type: 'error', message: rule.messages?.required || 'هذا الحقل مطلوب' };
            if (!value || String(value).trim() === '') return { valid: true };
            if (rule.minLength && !this.validators.minLength(value, rule.minLength)) return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
            if (rule.customValidator) { const cr = rule.customValidator(field); if (!cr.valid) return cr; }
            return { valid: true, type: 'success', message: 'صحيح' };
        },
        updateFieldUI(field, result) {
            const wrapper = field.closest('.col-md-6, .col-md-12, .col-12, .col-md-4') || field.parentElement;
            field.classList.remove('is-valid', 'is-invalid');
            let messageEl = wrapper.querySelector('.bn-field-message');
            if (!messageEl) {
                messageEl = document.createElement('div');
                messageEl.className = 'bn-field-message';
                field.parentNode.insertBefore(messageEl, field.nextSibling);
            }
            if (result.valid && result.type === 'success' && field.value.trim() !== '') {
                field.classList.add('is-valid');
                messageEl.className = 'bn-field-message success show';
                messageEl.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>صحيح</span>';
            } else if (!result.valid) {
                field.classList.add('is-invalid');
                messageEl.className = `bn-field-message ${result.type} show`;
                messageEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${result.message}</span>`;
            } else {
                messageEl.className = 'bn-field-message';
                messageEl.innerHTML = '';
            }
        },
        validateForm(form) {
            const fields = form.querySelectorAll('input, select, textarea');
            let isValid = true;
            const errors = [];
            fields.forEach(field => {
                if (field.type === 'hidden' || field.type === 'radio' || field.type === 'checkbox') return;
                if (!field.name && !field.id) return;
                const result = this.validateField(field);
                this.updateFieldUI(field, result);
                if (!result.valid) {
                    isValid = false;
                    const label = form.querySelector(`label[for="${field.id}"]`);
                    const labelText = label ? label.textContent.trim().replace('*', '').trim() : (field.name || field.id);
                    errors.push({ field, label: labelText, message: result.message });
                }
            });
            return { isValid, errors };
        },
        scrollToFirstError(form) {
            const firstInvalid = form.querySelector('.is-invalid');
            if (!firstInvalid) return;
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => firstInvalid.focus({ preventScroll: true }), 400);
        },
        showSummary(form, errors) {
            const existing = form.querySelector('.bn-validation-summary');
            if (existing) existing.remove();
            if (errors.length === 0) return;
            const summary = document.createElement('div');
            summary.className = 'bn-validation-summary show';
            summary.innerHTML = `
                <div class="bn-validation-summary-header">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span>يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} يجب تصحيحها:</span>
                </div>
                <ul>${errors.map((e, i) => `<li data-error-index="${i}">${e.label}: ${e.message}</li>`).join('')}</ul>
            `;
            form.insertBefore(summary, form.firstChild);
            summary.querySelectorAll('li').forEach((li, i) => {
                li.addEventListener('click', () => {
                    const field = errors[i].field;
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => field.focus({ preventScroll: true }), 400);
                });
            });
            setTimeout(() => {
                if (summary.parentNode) {
                    summary.style.transition = 'opacity 0.4s ease';
                    summary.style.opacity = '0';
                    setTimeout(() => summary.remove(), 400);
                }
            }, 8000);
        },
        attachToField(field) {
            const name = field.name || field.id;
            if (!this.rules[name]) return;
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label && this.rules[name].required) label.classList.add('required');
            const eventType = (field.tagName === 'SELECT' || field.type === 'date') ? 'change' : 'blur';
            field.addEventListener(eventType, () => {
                const result = this.validateField(field);
                this.updateFieldUI(field, result);
            });
            field.addEventListener('input', () => {
                if (field.classList.contains('is-invalid')) {
                    const result = this.validateField(field);
                    if (result.valid) this.updateFieldUI(field, { valid: true, type: 'success', message: 'صحيح' });
                    else this.updateFieldUI(field, result);
                }
            });
        },
        attachToForm(form) {
            if (!form) return;
            form.querySelectorAll('input, select, textarea').forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       7. Date Helpers
    ============================================================ */
    function calculateDaysBetween(startDate, endDate) {
        if (!startDate || !endDate) return null;
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
            return Math.round((end - start) / (1000 * 60 * 60 * 24));
        } catch (e) { return null; }
    }

    function calculateRemainingDays(endDate) {
        if (!endDate) return null;
        try {
            const end = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return Math.round((end - today) / (1000 * 60 * 60 * 24));
        } catch (e) { return null; }
    }

    function updateDurationDisplay() {
        const startEl = document.getElementById('tpPlanStartDate');
        const endEl = document.getElementById('tpPlanEndDate');
        const displayEl = document.getElementById('tpDurationDisplay');
        const textEl = document.getElementById('tpDurationText');
        if (!startEl || !endEl || !textEl || !displayEl) return;
        const days = calculateDaysBetween(startEl.value, endEl.value);
        if (days === null) { textEl.textContent = '— يوم'; displayEl.classList.remove('has-value'); }
        else if (days === 0) { textEl.textContent = 'يوم واحد'; displayEl.classList.add('has-value'); }
        else { textEl.textContent = `${days} يوم`; displayEl.classList.add('has-value'); }
    }

    function attachDateListeners() {
        const startEl = document.getElementById('tpPlanStartDate');
        const endEl = document.getElementById('tpPlanEndDate');
        if (startEl) startEl.addEventListener('change', updateDurationDisplay);
        if (endEl) endEl.addEventListener('change', updateDurationDisplay);
        updateDurationDisplay();
    }

    function getRemainingBadge(plan) {
        if (plan.status === 'مكتملة' || plan.status === 'ملغاة') return '';
        const remaining = calculateRemainingDays(plan.endDate);
        if (remaining === null) return '';
        if (remaining < 0) return `<span class="tp-countdown-badge overdue"><i class="fa-solid fa-exclamation-triangle"></i> متأخرة ${Math.abs(remaining)} يوم</span>`;
        if (remaining === 0) return `<span class="tp-countdown-badge danger"><i class="fa-solid fa-clock"></i> تنتهي اليوم</span>`;
        if (remaining <= 3) return `<span class="tp-countdown-badge danger"><i class="fa-solid fa-clock"></i> باقي ${remaining} يوم</span>`;
        if (remaining <= 7) return `<span class="tp-countdown-badge warning"><i class="fa-solid fa-clock"></i> باقي ${remaining} أيام</span>`;
        return `<span class="tp-countdown-badge"><i class="fa-solid fa-clock"></i> باقي ${remaining} يوم</span>`;
    }

    /* ============================================================
       8. Data
    ============================================================ */
    let treatmentPlansList = storage.get('treatmentPlans', [
        {
            name: 'خطة علاج القلق العام - المرحلة الأولى',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            status: 'نشطة',
            doctor: 'د. محمد العتيبي',
            notes: 'التركيز على تثبيت الجرعة الدوائية مع بدء جلسات العلاج المعرفي السلوكي.',
            problems: [
                {
                    text: 'القلق المفرط والمستمر',
                    goals: [
                        {
                            text: 'تقليل شدة نوبات القلق اليومية',
                            unit: 'نوبة/أسبوع',
                            baseline: 7,
                            targetValue: 2,
                            currentValue: 4,
                            status: 'pending',
                            progressHistory: [
                                { date: '2024-01-05', value: 7, note: 'البداية' },
                                { date: '2024-01-15', value: 5, note: 'تحسن ملحوظ بعد جلستين' },
                                { date: '2024-01-20', value: 4, note: 'استمرار التحسن' }
                            ],
                            means: [{ text: 'تمارين التنفس العميق مرتين يومياً' }, { text: 'جلسة علاج معرفي سلوكي أسبوعية' }]
                        },
                        {
                            text: 'تحسين القدرة على التحكم بالقلق',
                            unit: 'درجة (1-10)',
                            baseline: 8,
                            targetValue: 3,
                            currentValue: 8,
                            status: 'pending',
                            progressHistory: [],
                            means: [{ text: 'تدوين الأفكار القلقة يومياً' }]
                        }
                    ]
                },
                {
                    text: 'اضطراب النوم',
                    goals: [{
                        text: 'تحسين جودة النوم',
                        unit: 'ساعة/ليلة',
                        baseline: 4,
                        targetValue: 7,
                        currentValue: 7,
                        status: 'achieved',
                        achievedAt: '2024-01-25T10:00:00.000Z',
                        achievedBy: 'patient',
                        achievementNote: 'التزم بالروتين المسائي لمدة أسبوعين، النوم تحسن بشكل ملحوظ.',
                        progressHistory: [
                            { date: '2024-01-15', value: 4, note: 'بداية' },
                            { date: '2024-01-20', value: 6, note: '' },
                            { date: '2024-01-25', value: 7, note: 'تحقق الهدف' }
                        ],
                        means: [{ text: 'روتين استرخاء مسائي ثابت' }, { text: 'إيقاف الشاشات قبل النوم بساعتين' }]
                    }]
                }
            ]
        }
    ]);

    // ترحيل البيانات القديمة
    treatmentPlansList = treatmentPlansList.map(plan => {
        if (!plan.startDate && !plan.endDate && plan.duration) {
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + plan.duration);
            plan.startDate = start.toISOString().slice(0, 10);
            plan.endDate = end.toISOString().slice(0, 10);
            delete plan.duration;
        }
        if (plan.problems) {
            plan.problems.forEach(p => {
                if (p.goals) {
                    p.goals.forEach(g => {
                        if (!g.status) g.status = 'pending';
                        if (!g.progressHistory) g.progressHistory = [];
                        if (g.targetValue === undefined) g.targetValue = null;
                        if (g.currentValue === undefined) g.currentValue = null;
                        if (g.baseline === undefined) g.baseline = null;
                        if (!g.unit) g.unit = '';
                    });
                }
            });
        }
        return plan;
    });
    storage.set('treatmentPlans', treatmentPlansList);

    /* ============================================================
       9. Render Helpers
    ============================================================ */
    function getTpStatusBadge(status) {
        switch (status) {
            case 'نشطة': return 'tp-badge tp-badge-active';
            case 'مكتملة': return 'tp-badge tp-badge-completed';
            case 'ملغاة': return 'tp-badge tp-badge-cancelled';
            default: return 'tp-badge tp-badge-completed';
        }
    }

    function getGoalStatusBadge(goal) {
        if (goal.status === 'rejected') return '<span class="tp-goal-status rejected"><i class="fa-solid fa-circle-xmark"></i> مرفوض</span>';
        if (goal.status === 'achieved') {
            if (goal.achievedBy === 'patient' && !goal.patientConfirmedByDoctor) {
                return '<span class="tp-goal-status pending"><i class="fa-solid fa-hourglass-half"></i> بانتظار تأكيد الطبيب</span>';
            }
            return '<span class="tp-goal-status achieved"><i class="fa-solid fa-circle-check"></i> محقق</span>';
        }
        if (goal.status === 'partial') return '<span class="tp-goal-status partial"><i class="fa-solid fa-circle-half-stroke"></i> جزئي</span>';
        return '<span class="tp-goal-status pending"><i class="fa-solid fa-clock"></i> قيد التنفيذ</span>';
    }

    function getVerifierBadge(goal) {
        if (goal.status !== 'achieved') return '';
        if (goal.achievedBy === 'patient') {
            if (!goal.patientConfirmedByDoctor) {
                return '<span class="tp-verifier-badge pending-confirm"><i class="fa-solid fa-user-clock"></i> المريض أبلغ - بانتظارك</span>';
            }
            return '<span class="tp-verifier-badge patient"><i class="fa-solid fa-user"></i> أكده المريض</span>';
        }
        return '<span class="tp-verifier-badge doctor"><i class="fa-solid fa-user-doctor"></i> أكده الطبيب</span>';
    }

    function calculatePlanProgress(plan) {
        let total = 0, achieved = 0;
        if (plan.problems) {
            plan.problems.forEach(p => {
                if (p.goals) {
                    p.goals.forEach(g => {
                        total++;
                        if (g.status === 'achieved') achieved++;
                    });
                }
            });
        }
        return { total, achieved, percentage: total === 0 ? 0 : Math.round((achieved / total) * 100) };
    }

    function calculateGoalValueProgress(goal) {
        if (goal.targetValue === null || goal.targetValue === undefined) return null;
        if (goal.baseline === null || goal.baseline === undefined) return null;
        const current = goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : goal.baseline;
        const range = goal.targetValue - goal.baseline;
        if (range === 0) return 100;
        const progress = ((current - goal.baseline) / range) * 100;
        return Math.max(0, Math.min(100, Math.round(progress)));
    }

    function renderMiniChart(history) {
        if (!history || history.length < 2) return '';
        const numericValues = history
            .map(h => typeof h.value === 'number' ? h.value : parseFloat(h.value))
            .filter(v => !isNaN(v));
        if (numericValues.length < 2) return '';
        const max = Math.max(...numericValues);
        const min = Math.min(...numericValues);
        const range = max - min || 1;
        const bars = numericValues.slice(-8).map((v) => {
            const height = Math.max(8, ((v - min) / range) * 36 + 4);
            return `<div class="tp-mini-chart-bar" style="height: ${height}px;" title="${v}"></div>`;
        }).join('');
        return `<div class="tp-mini-chart">${bars}</div>`;
    }

    function updateTpPlansCount() {
        const badge = document.getElementById('tpPlansCountBadge');
        if (!badge) return;
        const count = treatmentPlansList.length;
        badge.textContent = count === 0 ? '0 خطة' : count === 1 ? 'خطة واحدة' : count === 2 ? 'خطتان' : count <= 10 ? `${count} خطط` : `${count} خطة`;
    }

    function updateStatsSummary() {
        const totalEl = document.getElementById('tpStatTotal');
        const activeEl = document.getElementById('tpStatActive');
        const completedEl = document.getElementById('tpStatCompleted');
        const progressEl = document.getElementById('tpStatProgress');
        if (!totalEl) return;
        const total = treatmentPlansList.length;
        const active = treatmentPlansList.filter(p => p.status === 'نشطة').length;
        const completed = treatmentPlansList.filter(p => p.status === 'مكتملة').length;
        const avgProgress = total > 0 ? treatmentPlansList.reduce((s, p) => s + calculatePlanProgress(p).percentage, 0) / total : 0;
        totalEl.textContent = total;
        activeEl.textContent = active;
        completedEl.textContent = completed;
        progressEl.textContent = `${Math.round(avgProgress)}%`;
    }

    function getFilteredPlans() {
        const el = document.getElementById('tpFilterStatus');
        const f = el ? el.value : '';
        if (!f) return treatmentPlansList;
        return treatmentPlansList.filter(p => p.status === f);
    }

    /* ============================================================
       10. Render Plans
    ============================================================ */
    function renderTreatmentPlans() {
        const container = document.getElementById('treatmentPlansContainer');
        const emptyState = document.getElementById('tpEmptyState');
        if (!container || !emptyState) return;

        updateStatsSummary();
        const filtered = getFilteredPlans();
        container.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('d-none');
            updateTpPlansCount();
            return;
        }
        emptyState.classList.add('d-none');

        filtered.forEach((plan) => {
            const planIndex = treatmentPlansList.indexOf(plan);
            const progress = calculatePlanProgress(plan);
            const progressClass = progress.percentage >= 100 ? 'completed' : (progress.percentage < 30 ? 'low' : '');

            let problemsHtml = '';
            if (!plan.problems || plan.problems.length === 0) {
                problemsHtml = `<p class="tp-empty-hint"><i class="fa-solid fa-circle-info ms-1"></i> لم تُضف أي مشاكل لهذه الخطة بعد.</p>`;
            } else {
                plan.problems.forEach((problem, problemIndex) => {
                    let goalsHtml = '';
                    if (!problem.goals || problem.goals.length === 0) {
                        goalsHtml = `<p class="tp-empty-hint">لا توجد أهداف بعد.</p>`;
                    } else {
                        problem.goals.forEach((goal, goalIndex) => {
                            let meansHtml = '';
                            if (!goal.means || goal.means.length === 0) {
                                meansHtml = `<p class="tp-empty-hint">لا توجد وسائل بعد.</p>`;
                            } else {
                                goal.means.forEach((mean, meanIndex) => {
                                    meansHtml += `
                                        <div class="tp-mean">
                                            <span class="tp-mean-text"><i class="fa-solid fa-check-double"></i> ${escapeHtml(mean.text)}</span>
                                            <span class="tp-mini-actions">
                                                <button type="button" class="btn btn-outline-primary" onclick="editTpMean(${planIndex},${problemIndex},${goalIndex},${meanIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                                <button type="button" class="btn btn-outline-danger" onclick="deleteTpMean(${planIndex},${problemIndex},${goalIndex},${meanIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                            </span>
                                        </div>
                                    `;
                                });
                            }

                            const isAchieved = goal.status === 'achieved';
                            const isPendingPatient = isAchieved && goal.achievedBy === 'patient' && !goal.patientConfirmedByDoctor;
                            const hasValueTracking = goal.targetValue !== null && goal.targetValue !== undefined;
                            const valueProgress = hasValueTracking ? calculateGoalValueProgress(goal) : null;
                            const valueProgressClass = valueProgress === null ? '' : (valueProgress >= 100 ? 'complete' : (valueProgress < 30 ? 'low' : ''));
                            const unitText = goal.unit ? ` ${goal.unit}` : '';

                            // Action buttons
                            let actionButtonsHtml = '';
                            if (isPendingPatient) {
                                actionButtonsHtml = `
                                    <button type="button" class="btn tp-btn-confirm-patient" onclick="confirmPatientAchievement(${planIndex},${problemIndex},${goalIndex})" title="تأكيد تحقيق المريض"><i class="fa-solid fa-check-double"></i> تأكيد</button>
                                    <button type="button" class="btn tp-btn-reject-patient" onclick="rejectPatientAchievement(${planIndex},${problemIndex},${goalIndex})" title="رفض"><i class="fa-solid fa-xmark"></i></button>
                                `;
                            } else if (isAchieved) {
                                actionButtonsHtml = `<button type="button" class="btn tp-btn-unachieve" onclick="toggleGoalAchieved(${planIndex},${problemIndex},${goalIndex})" title="إلغاء التحقق"><i class="fa-solid fa-rotate-left"></i></button>`;
                            } else {
                                actionButtonsHtml = `<button type="button" class="btn tp-btn-achieve" onclick="openAchieveModal(${planIndex},${problemIndex},${goalIndex})" title="تحقق الهدف"><i class="fa-solid fa-check"></i> تحقق</button>`;
                            }

                            goalsHtml += `
                                <div class="tp-goal ${isAchieved ? 'achieved' : ''}">
                                    <div class="tp-goal-head">
                                        <span class="tp-goal-title">
                                            <i class="fa-solid fa-bullseye"></i>
                                            ${escapeHtml(goal.text)}
                                            ${getGoalStatusBadge(goal)}
                                        </span>
                                        <span class="tp-goal-actions">
                                            ${actionButtonsHtml}
                                            ${hasValueTracking ? `<button type="button" class="btn tp-btn-progress" onclick="openProgressModal(${planIndex},${problemIndex},${goalIndex})" title="تحديث التقدم"><i class="fa-solid fa-chart-line"></i></button>` : ''}
                                            <button type="button" class="btn tp-btn-config" onclick="openGoalConfigModal(${planIndex},${problemIndex},${goalIndex})" title="إعدادات القياس"><i class="fa-solid fa-sliders"></i></button>
                                            <button type="button" class="btn btn-outline-primary" onclick="editTpGoal(${planIndex},${problemIndex},${goalIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                            <button type="button" class="btn btn-outline-danger" onclick="deleteTpGoal(${planIndex},${problemIndex},${goalIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                        </span>
                                    </div>

                                    ${hasValueTracking ? `
                                        <div class="tp-value-progress">
                                            <div class="tp-value-progress-header">
                                                <span>📊 <strong>${goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : goal.baseline}${unitText}</strong> ← <span class="accent">${goal.targetValue}${unitText}</span></span>
                                                <span>${valueProgress}%</span>
                                            </div>
                                            <div class="tp-value-bar">
                                                <div class="tp-value-fill ${valueProgressClass}" style="width: ${valueProgress}%"></div>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${isAchieved ? `
                                        <div class="tp-goal-progress">
                                            ${getVerifierBadge(goal)}
                                            ${goal.achievedAt ? `<span class="tp-goal-progress-item"><i class="fa-solid fa-calendar"></i> ${new Date(goal.achievedAt).toLocaleDateString('ar-EG')}</span>` : ''}
                                            ${goal.progressHistory && goal.progressHistory.length > 0 ? `<button type="button" class="tp-goal-history-link" onclick="showGoalHistory(${planIndex},${problemIndex},${goalIndex})"><i class="fa-solid fa-clock-rotate-left"></i> السجل (${goal.progressHistory.length})</button>` : ''}
                                        </div>
                                        ${goal.achievementNote ? `<div class="tp-goal-progress" style="background: rgba(16,185,129,0.08);"><span class="tp-goal-progress-item"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(goal.achievementNote)}</span></div>` : ''}
                                    ` : `
                                        ${goal.progressHistory && goal.progressHistory.length > 0 ? `
                                            <div class="tp-goal-progress">
                                                <span class="tp-goal-progress-item accent"><i class="fa-solid fa-chart-line"></i> آخر تحديث: <strong>${escapeHtml(String(goal.progressHistory[goal.progressHistory.length - 1].value))}${unitText}</strong></span>
                                                <button type="button" class="tp-goal-history-link" onclick="showGoalHistory(${planIndex},${problemIndex},${goalIndex})"><i class="fa-solid fa-clock-rotate-left"></i> السجل (${goal.progressHistory.length})</button>
                                            </div>
                                        ` : ''}
                                    `}

                                    ${renderMiniChart(goal.progressHistory)}

                                    <div class="tp-means">${meansHtml}</div>
                                    <div class="tp-inline-form">
                                        <input type="text" id="tpMeanInput_${planIndex}_${problemIndex}_${goalIndex}" placeholder="أضف وسيلة جديدة...">
                                        <button type="button" class="btn btn-success" onclick="addTpMean(${planIndex},${problemIndex},${goalIndex})"><i class="fa-solid fa-plus ms-1"></i> إضافة وسيلة</button>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    problemsHtml += `
                        <div class="tp-problem">
                            <div class="tp-problem-head">
                                <span class="tp-problem-title"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(problem.text)}</span>
                                <span class="tp-mini-actions">
                                    <button type="button" class="btn btn-outline-primary" onclick="editTpProblem(${planIndex},${problemIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                    <button type="button" class="btn btn-outline-danger" onclick="deleteTpProblem(${planIndex},${problemIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                </span>
                            </div>
                            <div class="tp-goals">${goalsHtml}</div>
                            <div class="tp-inline-form">
                                <input type="text" id="tpGoalInput_${planIndex}_${problemIndex}" placeholder="أضف هدفاً جديداً...">
                                <button type="button" class="btn btn-primary" onclick="addTpGoal(${planIndex},${problemIndex})"><i class="fa-solid fa-plus ms-1"></i> إضافة هدف</button>
                            </div>
                        </div>
                    `;
                });
            }

            const card = document.createElement('div');
            card.className = 'tp-plan-card';
            card.innerHTML = `
                <div class="tp-plan-header">
                    <div style="flex:1; min-width: 250px;">
                        <h4 class="tp-plan-title"><i class="fa-solid fa-clipboard-list text-primary"></i> ${escapeHtml(plan.name)}</h4>
                        <div class="tp-plan-meta">
                            <span class="tp-badge ${getTpStatusBadge(plan.status)}">${escapeHtml(plan.status)}</span>
                            <span><i class="fa-solid fa-calendar-plus ms-1"></i> ${escapeHtml(plan.startDate || '—')}</span>
                            <span><i class="fa-solid fa-calendar-minus ms-1"></i> ${escapeHtml(plan.endDate || '—')}</span>
                            ${plan.doctor ? `<span><i class="fa-solid fa-user-doctor ms-1"></i> ${escapeHtml(plan.doctor)}</span>` : ''}
                            ${getRemainingBadge(plan)}
                        </div>
                    </div>
                    <div class="tp-plan-actions">
                        <button type="button" class="btn btn-outline-primary" onclick="editTreatmentPlan(${planIndex})"><i class="fa-solid fa-pen ms-1"></i> تعديل</button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteTreatmentPlan(${planIndex})"><i class="fa-solid fa-trash ms-1"></i> حذف</button>
                    </div>
                </div>
                <div class="tp-progress-wrap">
                    <div class="tp-progress-header">
                        <span><i class="fa-solid fa-chart-simple ms-1"></i> التقدم: ${progress.achieved}/${progress.total} هدف</span>
                        <span>${progress.percentage}%</span>
                    </div>
                    <div class="tp-progress-bar"><div class="tp-progress-fill ${progressClass}" style="width: ${progress.percentage}%"></div></div>
                </div>
                ${plan.notes ? `<div class="tp-plan-notes"><i class="fa-solid fa-note-sticky ms-1"></i> ${escapeHtml(plan.notes)}</div>` : ''}
                <div class="tp-tree">${problemsHtml}</div>
                <div class="tp-add-problem-wrap">
                    <div class="tp-inline-form">
                        <input type="text" id="tpProblemInput_${planIndex}" placeholder="أضف مشكلة جديدة...">
                        <button type="button" class="btn btn-warning text-white" onclick="addTpProblem(${planIndex})"><i class="fa-solid fa-plus ms-1"></i> إضافة مشكلة</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        updateTpPlansCount();
    }

    /* ============================================================
       11. Modal Helpers
    ============================================================ */
    function showEditModal({ title, subtitle, label, value, onSave, placeholder }) {
        const modal = document.getElementById('bnEditModal');
        document.getElementById('bnEditModalTitle').textContent = title || 'تعديل';
        document.getElementById('bnEditModalSubtitle').textContent = subtitle || '';
        document.getElementById('bnEditModalLabel').textContent = label || 'النص';
        const inputEl = document.getElementById('bnEditModalInput');
        inputEl.value = value || '';
        inputEl.placeholder = placeholder || '';
        modal.classList.add('show');
        bnFocusTrap.activate(modal);

        const cleanup = () => {
            modal.classList.remove('show');
            bnFocusTrap.deactivate();
            document.getElementById('bnEditModalSave').removeEventListener('click', onSaveHandler);
            document.getElementById('bnEditModalCancel').removeEventListener('click', onCancelHandler);
            inputEl.removeEventListener('keydown', onKeyHandler);
            modal.removeEventListener('click', onOverlayClick);
        };
        const onSaveHandler = () => {
            const v = inputEl.value.trim();
            if (!v) { inputEl.style.borderColor = '#ef4444'; setTimeout(() => { inputEl.style.borderColor = ''; }, 1200); return; }
            cleanup(); onSave(v);
        };
        const onCancelHandler = () => cleanup();
        const onKeyHandler = (e) => { if (e.key === 'Enter') { e.preventDefault(); onSaveHandler(); } else if (e.key === 'Escape') { e.preventDefault(); onCancelHandler(); } };
        const onOverlayClick = (e) => { if (e.target === modal) onCancelHandler(); };
        document.getElementById('bnEditModalSave').addEventListener('click', onSaveHandler);
        document.getElementById('bnEditModalCancel').addEventListener('click', onCancelHandler);
        inputEl.addEventListener('keydown', onKeyHandler);
        modal.addEventListener('click', onOverlayClick);
        setTimeout(() => { inputEl.focus(); inputEl.select(); }, 120);
    }

    function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
        const modal = document.getElementById('bnConfirmModal');
        document.getElementById('bnConfirmModalTitle').textContent = title || 'تأكيد الحذف';
        document.getElementById('bnConfirmModalSubtitle').textContent = subtitle || '';
        document.getElementById('bnConfirmModalMessage').innerHTML = message || 'هل أنت متأكد؟';
        const confirmBtn = document.getElementById('bnConfirmModalConfirm');
        confirmBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${confirmText || 'نعم، احذف'}`;
        modal.classList.add('show');
        bnFocusTrap.activate(modal);
        const cleanup = () => {
            modal.classList.remove('show'); bnFocusTrap.deactivate();
            confirmBtn.removeEventListener('click', onConfirmHandler);
            document.getElementById('bnConfirmModalCancel').removeEventListener('click', onCancelHandler);
            modal.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeyHandler);
        };
        const onConfirmHandler = () => { cleanup(); if (typeof onConfirm === 'function') onConfirm(); };
        const onCancelHandler = () => cleanup();
        const onOverlayClick = (e) => { if (e.target === modal) onCancelHandler(); };
        const onKeyHandler = (e) => { if (e.key === 'Escape') onCancelHandler(); else if (e.key === 'Enter') { e.preventDefault(); onConfirmHandler(); } };
        confirmBtn.addEventListener('click', onConfirmHandler);
        document.getElementById('bnConfirmModalCancel').addEventListener('click', onCancelHandler);
        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyHandler);
    }

    function showGoalHistory(goal, planName) {
        if (!goal || !goal.progressHistory || goal.progressHistory.length === 0) {
            showToast('info', 'لا يوجد سجل', 'لم يتم تسجيل أي تطور لهذا الهدف بعد.');
            return;
        }
        const modal = document.getElementById('bnConfirmModal');
        document.getElementById('bnConfirmModalTitle').innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> سجل تطور الهدف';
        document.getElementById('bnConfirmModalSubtitle').textContent = planName;
        document.getElementById('bnConfirmModalMessage').innerHTML = `
            <div style="text-align:right; max-height: 380px; overflow-y: auto; padding-right: 0.5rem;">
                <div style="font-weight: 900; color: var(--bn-text); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--bn-border);">
                    🎯 ${escapeHtml(goal.text)}
                </div>
                ${goal.progressHistory.slice().reverse().map(h => `
                    <div style="background: var(--bn-surface-soft); border-radius: 10px; padding: 0.6rem 0.8rem; margin-bottom: 0.5rem; border-right: 3px solid #0891b2;">
                        <div style="font-size: 0.75rem; color: var(--bn-text-muted); font-weight: 700; margin-bottom: 0.3rem;">
                            ${new Date(h.date).toLocaleString('ar-EG')}
                        </div>
                        <div style="font-size: 0.85rem; font-weight: 800; color: var(--bn-text);">
                            📊 القيمة: <span style="color: #0891b2;">${escapeHtml(String(h.value))}${goal.unit ? ' ' + escapeHtml(goal.unit) : ''}</span>
                        </div>
                        ${h.note ? `<div style="font-size: 0.78rem; color: var(--bn-text-soft); margin-top: 0.3rem;">📝 ${escapeHtml(h.note)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        const confirmBtn = document.getElementById('bnConfirmModalConfirm');
        const cancelBtn = document.getElementById('bnConfirmModalCancel');
        confirmBtn.style.display = 'none';
        cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> إغلاق';
        modal.classList.add('show');
        bnFocusTrap.activate(modal);
        const cleanup = () => {
            modal.classList.remove('show'); bnFocusTrap.deactivate();
            confirmBtn.style.display = '';
            cancelBtn.removeEventListener('click', onClose);
            modal.removeEventListener('click', onOverlay);
            document.removeEventListener('keydown', onKey);
        };
        const onClose = () => cleanup();
        const onOverlay = (e) => { if (e.target === modal) cleanup(); };
        const onKey = (e) => { if (e.key === 'Escape') cleanup(); };
        cancelBtn.addEventListener('click', onClose);
        modal.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onKey);
    }

    /* ============================================================
       12. Goal Config Modal
    ============================================================ */
    let currentConfig = null;

    window.openGoalConfigModal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;

        currentConfig = { planIndex, problemIndex, goalIndex };

        const modal = document.getElementById('tpGoalConfigModal');
        document.getElementById('tpGoalConfigTitle').textContent = 'إعداد قياس الهدف';
        document.getElementById('tpGoalConfigSubtitle').textContent = 'حدد الوحدة والقيمة المستهدفة والقيمة الأولية';
        document.getElementById('tpGoalTextInput').value = goal.text || '';
        document.getElementById('tpGoalUnitInput').value = goal.unit || '';
        document.getElementById('tpGoalTargetInput').value = goal.targetValue !== null && goal.targetValue !== undefined ? goal.targetValue : '';
        document.getElementById('tpGoalBaselineInput').value = goal.baseline !== null && goal.baseline !== undefined ? goal.baseline : '';

        modal.classList.add('show');
        bnFocusTrap.activate(modal);
    };

    function closeGoalConfigModal() {
        const modal = document.getElementById('tpGoalConfigModal');
        if (modal) modal.classList.remove('show');
        bnFocusTrap.deactivate();
        currentConfig = null;
    }

    document.getElementById('tpGoalConfigCancel').addEventListener('click', closeGoalConfigModal);

    document.getElementById('tpGoalConfigSave').addEventListener('click', function () {
        if (!currentConfig) return;
        const { planIndex, problemIndex, goalIndex } = currentConfig;
        const goal = treatmentPlansList[planIndex]?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) { closeGoalConfigModal(); return; }

        const text = document.getElementById('tpGoalTextInput').value.trim();
        if (!text) { showToast('warning', 'حقل مطلوب', 'نص الهدف مطلوب'); return; }

        const unit = document.getElementById('tpGoalUnitInput').value.trim();
        const targetRaw = document.getElementById('tpGoalTargetInput').value;
        const baselineRaw = document.getElementById('tpGoalBaselineInput').value;

        goal.text = text;
        goal.unit = unit;
        goal.targetValue = targetRaw !== '' ? parseFloat(targetRaw) : null;
        goal.baseline = baselineRaw !== '' ? parseFloat(baselineRaw) : null;

        // إذا تغير baseline، حدّث currentValue إذا لم يكن محدداً
        if (goal.currentValue === null || goal.currentValue === undefined) {
            goal.currentValue = goal.baseline;
        }

        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        closeGoalConfigModal();
        showToast('success', 'تم الحفظ', 'تم حفظ إعدادات الهدف.');
    });

    document.getElementById('tpGoalConfigModal').addEventListener('click', (e) => {
        if (e.target.id === 'tpGoalConfigModal') closeGoalConfigModal();
    });

    /* ============================================================
       13. Progress Update Modal
    ============================================================ */
    let currentProgress = null;

    window.openProgressModal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;

        currentProgress = { planIndex, problemIndex, goalIndex };

        const modal = document.getElementById('tpProgressModal');
        document.getElementById('tpProgressTitle').textContent = 'تحديث التقدم';
        document.getElementById('tpProgressSubtitle').textContent = goal.text;

        const unitText = goal.unit ? ` ${goal.unit}` : '';
        document.getElementById('tpProgressInfoBox').innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                <div>📊 <strong>القيمة الأولية:</strong> ${goal.baseline !== null ? goal.baseline : '—'}${unitText}</div>
                <div>🎯 <strong>القيمة المستهدفة:</strong> ${goal.targetValue !== null ? goal.targetValue : '—'}${unitText}</div>
                <div>📍 <strong>القيمة الحالية:</strong> ${goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : '—'}${unitText}</div>
            </div>
        `;

        document.getElementById('tpProgressValueInput').value = goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : '';
        document.getElementById('tpProgressNoteInput').value = '';

        modal.classList.add('show');
        bnFocusTrap.activate(modal);
    };

    function closeProgressModal() {
        const modal = document.getElementById('tpProgressModal');
        if (modal) modal.classList.remove('show');
        bnFocusTrap.deactivate();
        currentProgress = null;
    }

    document.getElementById('tpProgressCancel').addEventListener('click', closeProgressModal);

    document.getElementById('tpProgressSave').addEventListener('click', function () {
        if (!currentProgress) return;
        const { planIndex, problemIndex, goalIndex } = currentProgress;
        const goal = treatmentPlansList[planIndex]?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) { closeProgressModal(); return; }

        const valueRaw = document.getElementById('tpProgressValueInput').value;
        const note = document.getElementById('tpProgressNoteInput').value.trim();

        if (valueRaw === '' || isNaN(parseFloat(valueRaw))) {
            showToast('warning', 'قيمة غير صالحة', 'يرجى إدخال قيمة رقمية صحيحة.');
            return;
        }

        const value = parseFloat(valueRaw);
        goal.currentValue = value;
        if (!goal.progressHistory) goal.progressHistory = [];
        goal.progressHistory.push({
            date: new Date().toISOString(),
            value: value,
            note: note
        });

        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        closeProgressModal();
        showToast('success', 'تم التحديث', `تم تحديث التقدم إلى ${value}${goal.unit ? ' ' + goal.unit : ''}.`);
    });

    document.getElementById('tpProgressModal').addEventListener('click', (e) => {
        if (e.target.id === 'tpProgressModal') closeProgressModal();
    });

    /* ============================================================
       14. Achieve Modal
    ============================================================ */
    let currentAchieve = null;

    window.openAchieveModal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;

        currentAchieve = { planIndex, problemIndex, goalIndex };

        const modal = document.getElementById('tpAchieveModal');
        document.getElementById('tpAchieveTitle').textContent = 'تحقق الهدف';
        document.getElementById('tpAchieveSubtitle').textContent = goal.text;
        document.getElementById('tpAchieveNoteInput').value = '';
        modal.classList.add('show');
        bnFocusTrap.activate(modal);
    };

    function closeAchieveModal() {
        const modal = document.getElementById('tpAchieveModal');
        if (modal) modal.classList.remove('show');
        bnFocusTrap.deactivate();
        currentAchieve = null;
    }

    document.getElementById('tpAchieveCancel').addEventListener('click', closeAchieveModal);

    document.getElementById('tpAchieveSave').addEventListener('click', function () {
        if (!currentAchieve) return;
        const { planIndex, problemIndex, goalIndex } = currentAchieve;
        const goal = treatmentPlansList[planIndex]?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) { closeAchieveModal(); return; }

        const note = document.getElementById('tpAchieveNoteInput').value.trim();

        goal.status = 'achieved';
        goal.achievedAt = new Date().toISOString();
        goal.achievedBy = 'doctor';
        goal.achievementNote = note || '';

        if (!goal.progressHistory) goal.progressHistory = [];
        goal.progressHistory.push({
            date: new Date().toISOString(),
            value: 'محقق ✅',
            note: note || 'تم التحقق بواسطة الطبيب'
        });

        // إذا كان هناك قيمة مستهدفة، حدّث currentValue إلى targetValue
        if (goal.targetValue !== null && goal.targetValue !== undefined) {
            goal.currentValue = goal.targetValue;
        }

        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        closeAchieveModal();
        showToast('success', '✅ تم تحقق الهدف', goal.text);
        bnConfetti.fire(1500);
    });

    document.getElementById('tpAchieveModal').addEventListener('click', (e) => {
        if (e.target.id === 'tpAchieveModal') closeAchieveModal();
    });

    /* ============================================================
       15. Toggle / Confirm / Reject
    ============================================================ */
    window.toggleGoalAchieved = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;

        if (goal.status === 'achieved') {
            goal.status = 'pending';
            goal.achievedAt = null;
            goal.achievedBy = null;
            goal.achievementNote = '';
            goal.patientConfirmedByDoctor = false;
            storage.set('treatmentPlans', treatmentPlansList);
            renderTreatmentPlans();
            showToast('info', 'تم إلغاء التحقق', `الهدف عاد إلى قيد التنفيذ: ${goal.text}`);
        } else {
            window.openAchieveModal(planIndex, problemIndex, goalIndex);
        }
    };

    window.confirmPatientAchievement = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;

        goal.patientConfirmedByDoctor = true;
        goal.confirmedAt = new Date().toISOString();

        if (!goal.progressHistory) goal.progressHistory = [];
        goal.progressHistory.push({
            date: new Date().toISOString(),
            value: 'مؤكد من الطبيب ✅',
            note: 'تم تأكيد تحقيق المريض'
        });

        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', '✅ تم التأكيد', 'تم تأكيد تحقيق المريض للهدف.');
        bnConfetti.fire(1200);
    };

    window.rejectPatientAchievement = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;

        showConfirmModal({
            title: 'رفض تحقيق المريض',
            subtitle: 'سيُعاد الهدف إلى قيد التنفيذ',
            message: `هل أنت متأكد من رفض تحقيق المريض للهدف <strong>${escapeHtml(goal.text)}</strong>؟`,
            confirmText: 'نعم، ارفض',
            onConfirm: () => {
                goal.status = 'rejected';
                goal.achievedAt = null;
                goal.achievedBy = null;
                goal.patientConfirmedByDoctor = false;
                if (!goal.progressHistory) goal.progressHistory = [];
                goal.progressHistory.push({
                    date: new Date().toISOString(),
                    value: 'مرفوض من الطبيب ❌',
                    note: 'لم يتم تأكيد التحقيق'
                });
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('warning', 'تم الرفض', 'تم رفض تحقيق المريض، الهدف بحاجة لمزيد من العمل.');
            }
        });
    };

    /* ============================================================
       16. Plan Form
    ============================================================ */
    const treatmentPlanForm = document.getElementById('treatmentPlanForm');
    if (treatmentPlanForm) {
        treatmentPlanForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }
            const editIndex = parseInt(document.getElementById('tpEditIndex').value, 10);
            const name = document.getElementById('tpPlanName').value.trim();
            const status = document.getElementById('tpPlanStatus').value;
            const startDate = document.getElementById('tpPlanStartDate').value;
            const endDate = document.getElementById('tpPlanEndDate').value;
            const doctor = document.getElementById('tpPlanDoctor').value.trim();
            const notes = document.getElementById('tpPlanNotes').value.trim();

            if (editIndex >= 0) {
                const existing = treatmentPlansList[editIndex];
                treatmentPlansList[editIndex] = { ...existing, name, status, startDate, endDate, doctor, notes };
                showToast('success', 'تم التعديل', 'تم تحديث الخطة.');
            } else {
                treatmentPlansList.push({ name, status, startDate, endDate, doctor, notes, problems: [] });
                showToast('success', 'تمت الإضافة', 'تمت إضافة الخطة.');
            }
            storage.set('treatmentPlans', treatmentPlansList);
            renderTreatmentPlans();
            resetTreatmentPlanForm();
            bnConfetti.fire();
        });
    }

    window.editTreatmentPlan = function (index) {
        const plan = treatmentPlansList[index];
        if (!plan) return;
        document.getElementById('tpEditIndex').value = index;
        document.getElementById('tpPlanName').value = plan.name;
        document.getElementById('tpPlanStatus').value = plan.status;
        document.getElementById('tpPlanStartDate').value = plan.startDate || '';
        document.getElementById('tpPlanEndDate').value = plan.endDate || '';
        document.getElementById('tpPlanDoctor').value = plan.doctor || '';
        document.getElementById('tpPlanNotes').value = plan.notes || '';
        updateDurationDisplay();
        document.getElementById('tpFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الخطة';
        document.getElementById('tpSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('tpCancelBtn').classList.remove('d-none');
        document.getElementById('treatmentPlanForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${plan.name}`);
    };

    window.deleteTreatmentPlan = function (index) {
        if (index < 0 || index >= treatmentPlansList.length) return;
        const plan = treatmentPlansList[index];
        showConfirmModal({
            title: 'تأكيد حذف الخطة',
            subtitle: 'سيتم حذف كل المشاكل والأهداف والوسائل التابعة لها',
            message: `هل أنت متأكد من حذف الخطة <strong>${escapeHtml(plan.name)}</strong>؟`,
            confirmText: 'نعم، احذف الخطة',
            onConfirm: () => {
                treatmentPlansList.splice(index, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                resetTreatmentPlanForm();
                showToast('success', 'تم الحذف', 'تم حذف الخطة.');
            }
        });
    };

    window.resetTreatmentPlanForm = function () {
        const form = document.getElementById('treatmentPlanForm');
        if (!form) return;
        form.reset();
        document.getElementById('tpEditIndex').value = '-1';
        document.getElementById('tpFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة خطة علاجية جديدة';
        document.getElementById('tpSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة الخطة';
        document.getElementById('tpCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => { el.classList.remove('is-valid', 'is-invalid'); });
        form.querySelectorAll('.bn-field-message').forEach(el => { el.className = 'bn-field-message'; el.innerHTML = ''; });
        updateDurationDisplay();
    };

    /* ============================================================
       17. Problems CRUD
    ============================================================ */
    window.addTpProblem = function (planIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan) return;
        const input = document.getElementById(`tpProblemInput_${planIndex}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص المشكلة.'); return; }
        plan.problems.push({ text, goals: [] });
        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', 'تمت الإضافة', 'تمت إضافة المشكلة.');
    };

    window.editTpProblem = function (planIndex, problemIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan || !plan.problems[problemIndex]) return;
        showEditModal({
            title: 'تعديل المشكلة',
            subtitle: 'قم بتعديل نص المشكلة ثم اضغط حفظ',
            label: 'نص المشكلة',
            value: plan.problems[problemIndex].text,
            placeholder: 'اكتب نص المشكلة...',
            onSave: (newValue) => {
                plan.problems[problemIndex].text = newValue;
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم التعديل', 'تم تعديل المشكلة.');
            }
        });
    };

    window.deleteTpProblem = function (planIndex, problemIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan || !plan.problems[problemIndex]) return;
        const problem = plan.problems[problemIndex];
        showConfirmModal({
            title: 'تأكيد حذف المشكلة',
            subtitle: 'سيتم حذف كل الأهداف والوسائل التابعة لها',
            message: `هل أنت متأكد من حذف المشكلة <strong>${escapeHtml(problem.text)}</strong>؟`,
            confirmText: 'نعم، احذف المشكلة',
            onConfirm: () => {
                plan.problems.splice(problemIndex, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم الحذف', 'تم حذف المشكلة.');
            }
        });
    };

    /* ============================================================
       18. Goals CRUD
    ============================================================ */
    window.addTpGoal = function (planIndex, problemIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan || !plan.problems[problemIndex]) return;
        const input = document.getElementById(`tpGoalInput_${planIndex}_${problemIndex}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص الهدف.'); return; }
        plan.problems[problemIndex].goals.push({
            text,
            unit: '',
            baseline: null,
            targetValue: null,
            currentValue: null,
            status: 'pending',
            progressHistory: [],
            means: []
        });
        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', 'تمت الإضافة', 'تمت إضافة الهدف. يمكنك إعداد القياس من زر ⚙️');
    };

    window.editTpGoal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;
        showEditModal({
            title: 'تعديل نص الهدف',
            subtitle: 'قم بتعديل نص الهدف فقط. للقياس استخدم زر ⚙️',
            label: 'نص الهدف',
            value: goal.text,
            placeholder: 'اكتب نص الهدف...',
            onSave: (newValue) => {
                goal.text = newValue;
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم التعديل', 'تم تعديل الهدف.');
            }
        });
    };

    window.deleteTpGoal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goals = plan?.problems?.[problemIndex]?.goals;
        if (!goals || !goals[goalIndex]) return;
        const goal = goals[goalIndex];
        showConfirmModal({
            title: 'تأكيد حذف الهدف',
            subtitle: 'سيتم حذف كل الوسائل التابعة لهذا الهدف',
            message: `هل أنت متأكد من حذف الهدف <strong>${escapeHtml(goal.text)}</strong>؟`,
            confirmText: 'نعم، احذف الهدف',
            onConfirm: () => {
                goals.splice(goalIndex, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم الحذف', 'تم حذف الهدف.');
            }
        });
    };

    /* ============================================================
       19. Means CRUD
    ============================================================ */
    window.addTpMean = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;
        const input = document.getElementById(`tpMeanInput_${planIndex}_${problemIndex}_${goalIndex}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص الوسيلة.'); return; }
        goal.means.push({ text });
        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', 'تمت الإضافة', 'تمت إضافة الوسيلة.');
    };

    window.editTpMean = function (planIndex, problemIndex, goalIndex, meanIndex) {
        const plan = treatmentPlansList[planIndex];
        const mean = plan?.problems?.[problemIndex]?.goals?.[goalIndex]?.means?.[meanIndex];
        if (!mean) return;
        showEditModal({
            title: 'تعديل الوسيلة',
            subtitle: 'قم بتعديل نص الوسيلة',
            label: 'نص الوسيلة',
            value: mean.text,
            placeholder: 'اكتب نص الوسيلة...',
            onSave: (newValue) => {
                mean.text = newValue;
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم التعديل', 'تم تعديل الوسيلة.');
            }
        });
    };

    window.deleteTpMean = function (planIndex, problemIndex, goalIndex, meanIndex) {
        const plan = treatmentPlansList[planIndex];
        const means = plan?.problems?.[problemIndex]?.goals?.[goalIndex]?.means;
        if (!means || !means[meanIndex]) return;
        const mean = means[meanIndex];
        showConfirmModal({
            title: 'تأكيد حذف الوسيلة',
            subtitle: 'لن تتمكن من استرجاع الوسيلة',
            message: `هل أنت متأكد من حذف الوسيلة <strong>${escapeHtml(mean.text)}</strong>؟`,
            confirmText: 'نعم، احذف الوسيلة',
            onConfirm: () => {
                means.splice(meanIndex, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم الحذف', 'تم حذف الوسيلة.');
            }
        });
    };

    /* ============================================================
       20. Init
    ============================================================ */
    function doInit() {
        renderTreatmentPlans();
        bnValidation.attachToForm(document.getElementById('treatmentPlanForm'));
        attachDateListeners();

        const filterEl = document.getElementById('tpFilterStatus');
        if (filterEl) filterEl.addEventListener('change', renderTreatmentPlans);

        setTimeout(() => {
            showToast('info', 'الخطط العلاجية', 'يمكنك إعداد القياس لكل هدف (⚙️) ثم تحديث التقدم (📊) وتأكيد التحقق.', 5000);
        }, 1000);

        console.log('%c✅ Treatment Plans Tab Loaded',
            'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();