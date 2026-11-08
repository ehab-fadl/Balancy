/* ============================================================
   Treatment Plans Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق DTOs الباك إند (TreatmentPlan/Problem/Goal/Mean + Progress + Achieve)
   - يحافظ على: Toast, Modals, Validation, Confetti, Charts, Filters
   - يحذف: localStorage + mock data
============================================================ */

(function initTreatmentPlans() {
    console.log('🚀 TreatmentPlans.js initialized');

    /* ============================================================
       1. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    function getAntiForgeryToken() {
        return document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
    }

    function getPatientId() {
        const form = document.getElementById('treatmentPlanForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const f = document.getElementById('treatmentPlanForm');
        return {
            list: f?.dataset?.apiListUrl || '/Doctor?handler=TreatmentPlans',
            planCreate: f?.dataset?.apiCreateUrl || '/Doctor?handler=CreateTreatmentPlan',
            planUpdate: f?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateTreatmentPlan',
            planDelete: f?.dataset?.apiDeleteUrl || '/Doctor?handler=TreatmentPlan',
            problemCreate: f?.dataset?.apiProblemCreateUrl || '/Doctor?handler=CreateTreatmentProblem',
            problemUpdate: f?.dataset?.apiProblemUpdateUrl || '/Doctor?handler=UpdateTreatmentProblem',
            problemDelete: f?.dataset?.apiProblemDeleteUrl || '/Doctor?handler=TreatmentProblem',
            goalCreate: f?.dataset?.apiGoalCreateUrl || '/Doctor?handler=CreateTreatmentGoal',
            goalUpdate: f?.dataset?.apiGoalUpdateUrl || '/Doctor?handler=UpdateTreatmentGoal',
            goalProgress: f?.dataset?.apiGoalProgressUrl || '/Doctor?handler=ProgressTreatmentGoal',
            goalAchieve: f?.dataset?.apiGoalAchieveUrl || '/Doctor?handler=AchieveTreatmentGoal',
            goalUnachieve: f?.dataset?.apiGoalUnachieveUrl || '/Doctor?handler=UnachieveTreatmentGoal',
            goalDelete: f?.dataset?.apiGoalDeleteUrl || '/Doctor?handler=TreatmentGoal',
            meanCreate: f?.dataset?.apiMeanCreateUrl || '/Doctor?handler=CreateTreatmentMean',
            meanUpdate: f?.dataset?.apiMeanUpdateUrl || '/Doctor?handler=UpdateTreatmentMean',
            meanDelete: f?.dataset?.apiMeanDeleteUrl || '/Doctor?handler=TreatmentMean'
        };
    }

    function isValidGuid(value) {
        if (!value) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(value).trim());
    }

    function toIsoDateTime(dateInputValue) {
        if (!dateInputValue) return null;
        const d = new Date(dateInputValue + 'T00:00:00Z');
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    }

    function normalizeDateForInput(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch { return ''; }
    }

    /* ============================================================
       2. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-tp-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-tp-toast-styles';
        style.textContent = `
            .bn-tp-toast-overlay { position: fixed !important; inset: 0 !important; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
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
       3. Confetti
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
            for (let i = 0; i < 60; i++) {
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
       4. Focus Trap
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
       5. Validation Engine
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
       6. Date Helpers
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
       7. State + Mappers + Finders
    ============================================================ */
    let treatmentPlansList = [];
    let isLoadingList = false;

    function mapGoalDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            text: dto.text ?? dto.Text ?? '',
            unit: dto.unit ?? dto.Unit ?? '',
            baseline: dto.baseline ?? dto.Baseline ?? null,
            targetValue: dto.targetValue ?? dto.TargetValue ?? null,
            currentValue: dto.currentValue ?? dto.CurrentValue ?? null,
            status: (dto.status ?? dto.Status ?? 'pending').toString().toLowerCase(),
            achievedAt: dto.achievedAt ?? dto.AchievedAt ?? null,
            achievedBy: (dto.achievedBy ?? dto.AchievedBy ?? '').toString().toLowerCase(),
            achievementNote: dto.achievementNote ?? dto.AchievementNote ?? '',
            patientConfirmedByDoctor: dto.patientConfirmedByDoctor ?? dto.PatientConfirmedByDoctor ?? false,
            means: (dto.means ?? dto.Means ?? []).map(m => ({
                id: m.id ?? m.Id ?? '',
                text: m.text ?? m.Text ?? ''
            })),
            progressHistory: (dto.progressHistory ?? dto.ProgressHistory ?? []).map(h => ({
                id: h.id ?? h.Id ?? '',
                date: h.recordedAt ?? h.RecordedAt ?? h.date ?? h.Date,
                value: h.value ?? h.Value ?? '',
                note: h.note ?? h.Note ?? ''
            }))
        };
    }

    function mapProblemDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            text: dto.text ?? dto.Text ?? '',
            goals: (dto.goals ?? dto.Goals ?? []).map(mapGoalDto)
        };
    }

    function mapPlanDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            name: dto.name ?? dto.Name ?? '',
            startDate: normalizeDateForInput(dto.startDate ?? dto.StartDate),
            endDate: normalizeDateForInput(dto.endDate ?? dto.EndDate),
            status: dto.status ?? dto.Status ?? '',
            doctor: dto.planDoctorName ?? dto.PlanDoctorName ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            problems: (dto.problems ?? dto.Problems ?? []).map(mapProblemDto)
        };
    }

    function extractArray(payload) {
        if (payload == null) return [];
        if (Array.isArray(payload)) return payload;
        const candidates = [payload.data, payload.items, payload.result, payload.$values, payload.data?.$values, payload.data?.items];
        for (const c of candidates) if (Array.isArray(c)) return c;
        for (const key of Object.keys(payload)) if (Array.isArray(payload[key])) return payload[key];
        return [];
    }

    function findPlanById(planId) {
        return treatmentPlansList.find(p => p.id === planId) || null;
    }

    function findProblemById(problemId) {
        for (const plan of treatmentPlansList) {
            const problem = (plan.problems || []).find(p => p.id === problemId);
            if (problem) return { plan, problem };
        }
        return null;
    }

    function findGoalById(goalId) {
        for (const plan of treatmentPlansList) {
            for (const problem of (plan.problems || [])) {
                const goal = (problem.goals || []).find(g => g.id === goalId);
                if (goal) return { plan, problem, goal };
            }
        }
        return null;
    }

    function findMeanById(meanId) {
        for (const plan of treatmentPlansList) {
            for (const problem of (plan.problems || [])) {
                for (const goal of (problem.goals || [])) {
                    const mean = (goal.means || []).find(m => m.id === meanId);
                    if (mean) return { plan, problem, goal, mean };
                }
            }
        }
        return null;
    }

    /* ============================================================
       8. Render Helpers
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
        (plan.problems || []).forEach(p => {
            (p.goals || []).forEach(g => {
                total++;
                if (g.status === 'achieved') achieved++;
            });
        });
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
       9. Load from API
    ============================================================ */
    async function loadTreatmentPlans() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            treatmentPlansList = [];
            renderTreatmentPlans();
            isLoadingList = false;
            return;
        }
        const urls = getApiUrls();
        const url = `${urls.list}${urls.list.includes('?') ? '&' : '?'}patientId=${encodeURIComponent(patientId)}`;
        try {
            const res = await fetch(url, {
                headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
                credentials: 'same-origin'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json();
            treatmentPlansList = extractArray(payload).map(mapPlanDto);
            console.log('✅ Loaded treatment plans:', treatmentPlansList);
            renderTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل تحميل الخطط:', err);
            treatmentPlansList = [];
            renderTreatmentPlans();
            showToast('error', 'فشل التحميل', 'تعذر تحميل الخطط العلاجية.');
        } finally {
            isLoadingList = false;
        }
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
            const progress = calculatePlanProgress(plan);
            const progressClass = progress.percentage >= 100 ? 'completed' : (progress.percentage < 30 ? 'low' : '');
            const planId = plan.id;

            let problemsHtml = '';
            if (!plan.problems || plan.problems.length === 0) {
                problemsHtml = `<p class="tp-empty-hint"><i class="fa-solid fa-circle-info ms-1"></i> لم تُضف أي مشاكل لهذه الخطة بعد.</p>`;
            } else {
                plan.problems.forEach((problem) => {
                    const problemId = problem.id;

                    let goalsHtml = '';
                    if (!problem.goals || problem.goals.length === 0) {
                        goalsHtml = `<p class="tp-empty-hint">لا توجد أهداف بعد.</p>`;
                    } else {
                        problem.goals.forEach((goal) => {
                            const goalId = goal.id;

                            let meansHtml = '';
                            if (!goal.means || goal.means.length === 0) {
                                meansHtml = `<p class="tp-empty-hint">لا توجد وسائل بعد.</p>`;
                            } else {
                                goal.means.forEach((mean) => {
                                    meansHtml += `
                                        <div class="tp-mean">
                                            <span class="tp-mean-text"><i class="fa-solid fa-check-double"></i> ${escapeHtml(mean.text)}</span>
                                            <span class="tp-mini-actions">
                                                <button type="button" class="btn btn-outline-primary" onclick="editTpMean('${mean.id}')" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                                <button type="button" class="btn btn-outline-danger" onclick="deleteTpMean('${mean.id}')" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
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

                            let actionButtonsHtml = '';
                            if (isPendingPatient) {
                                actionButtonsHtml = `
                                    <button type="button" class="btn tp-btn-confirm-patient" onclick="confirmPatientAchievement('${goal.id}')" title="تأكيد تحقيق المريض"><i class="fa-solid fa-check-double"></i> تأكيد</button>
                                    <button type="button" class="btn tp-btn-reject-patient" onclick="rejectPatientAchievement('${goal.id}')" title="رفض"><i class="fa-solid fa-xmark"></i></button>
                                `;
                            } else if (isAchieved) {
                                actionButtonsHtml = `<button type="button" class="btn tp-btn-unachieve" onclick="toggleGoalAchieved('${goal.id}')" title="إلغاء التحقق"><i class="fa-solid fa-rotate-left"></i></button>`;
                            } else {
                                actionButtonsHtml = `<button type="button" class="btn tp-btn-achieve" onclick="openAchieveModal('${goal.id}')" title="تحقق الهدف"><i class="fa-solid fa-check"></i> تحقق</button>`;
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
                                            ${hasValueTracking ? `<button type="button" class="btn tp-btn-progress" onclick="openProgressModal('${goal.id}')" title="تحديث التقدم"><i class="fa-solid fa-chart-line"></i></button>` : ''}
                                            <button type="button" class="btn tp-btn-config" onclick="openGoalConfigModal('${goal.id}')" title="إعدادات القياس"><i class="fa-solid fa-sliders"></i></button>
                                            <button type="button" class="btn btn-outline-primary" onclick="editTpGoal('${goal.id}')" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                            <button type="button" class="btn btn-outline-danger" onclick="deleteTpGoal('${goal.id}')" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
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
                                            ${goal.progressHistory && goal.progressHistory.length > 0 ? `<button type="button" class="tp-goal-history-link" onclick="showGoalHistory('${goal.id}')"><i class="fa-solid fa-clock-rotate-left"></i> السجل (${goal.progressHistory.length})</button>` : ''}
                                        </div>
                                        ${goal.achievementNote ? `<div class="tp-goal-progress" style="background: rgba(16,185,129,0.08);"><span class="tp-goal-progress-item"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(goal.achievementNote)}</span></div>` : ''}
                                    ` : `
                                        ${goal.progressHistory && goal.progressHistory.length > 0 ? `
                                            <div class="tp-goal-progress">
                                                <span class="tp-goal-progress-item accent"><i class="fa-solid fa-chart-line"></i> آخر تحديث: <strong>${escapeHtml(String(goal.progressHistory[goal.progressHistory.length - 1].value))}${unitText}</strong></span>
                                                <button type="button" class="tp-goal-history-link" onclick="showGoalHistory('${goal.id}')"><i class="fa-solid fa-clock-rotate-left"></i> السجل (${goal.progressHistory.length})</button>
                                            </div>
                                        ` : ''}
                                    `}

                                    ${renderMiniChart(goal.progressHistory)}

                                    <div class="tp-means">${meansHtml}</div>
                                    <div class="tp-inline-form">
                                        <input type="text" id="tpMeanInput_${goal.id}" placeholder="أضف وسيلة جديدة...">
                                        <button type="button" class="btn btn-success" onclick="addTpMean('${goal.id}')"><i class="fa-solid fa-plus ms-1"></i> إضافة وسيلة</button>
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
                                    <button type="button" class="btn btn-outline-primary" onclick="editTpProblem('${problem.id}')" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                    <button type="button" class="btn btn-outline-danger" onclick="deleteTpProblem('${problem.id}')" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                </span>
                            </div>
                            <div class="tp-goals">${goalsHtml}</div>
                            <div class="tp-inline-form">
                                <input type="text" id="tpGoalInput_${problem.id}" placeholder="أضف هدفاً جديداً...">
                                <button type="button" class="btn btn-primary" onclick="addTpGoal('${problem.id}')"><i class="fa-solid fa-plus ms-1"></i> إضافة هدف</button>
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
                        <button type="button" class="btn btn-outline-primary" onclick="editTreatmentPlan('${plan.id}')"><i class="fa-solid fa-pen ms-1"></i> تعديل</button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteTreatmentPlan('${plan.id}')"><i class="fa-solid fa-trash ms-1"></i> حذف</button>
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
                        <input type="text" id="tpProblemInput_${plan.id}" placeholder="أضف مشكلة جديدة...">
                        <button type="button" class="btn btn-warning text-white" onclick="addTpProblem('${plan.id}')"><i class="fa-solid fa-plus ms-1"></i> إضافة مشكلة</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        updateTpPlansCount();
    }

    /* ============================================================
       11. Modals (Edit + Confirm)
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

    function showGoalHistory(goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        if (!goal.progressHistory || goal.progressHistory.length === 0) {
            showToast('info', 'لا يوجد سجل', 'لم يتم تسجيل أي تطور لهذا الهدف بعد.');
            return;
        }
        const modal = document.getElementById('bnConfirmModal');
        document.getElementById('bnConfirmModalTitle').innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> سجل تطور الهدف';
        document.getElementById('bnConfirmModalSubtitle').textContent = goal.text;
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
    let currentConfigGoalId = null;

    window.openGoalConfigModal = function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        currentConfigGoalId = goal.id;
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
        currentConfigGoalId = null;
    }

    document.getElementById('tpGoalConfigCancel').addEventListener('click', closeGoalConfigModal);

    document.getElementById('tpGoalConfigSave').addEventListener('click', async function () {
        if (!currentConfigGoalId) return;
        const found = findGoalById(currentConfigGoalId);
        if (!found) { closeGoalConfigModal(); return; }
        const { goal } = found;

        const text = document.getElementById('tpGoalTextInput').value.trim();
        if (!text) { showToast('warning', 'حقل مطلوب', 'نص الهدف مطلوب'); return; }

        const unit = document.getElementById('tpGoalUnitInput').value.trim();
        const targetRaw = document.getElementById('tpGoalTargetInput').value;
        const baselineRaw = document.getElementById('tpGoalBaselineInput').value;

        const payload = {
            id: goal.id,
            text: text,
            unit: unit || null,
            baseline: baselineRaw !== '' ? parseFloat(baselineRaw) : null,
            targetValue: targetRaw !== '' ? parseFloat(targetRaw) : null
        };

        const urls = getApiUrls();
        try {
            const res = await fetch(`${urls.goalUpdate}${urls.goalUpdate.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', 'تم الحفظ', 'تم حفظ إعدادات الهدف.');
            closeGoalConfigModal();
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل حفظ إعدادات الهدف:', err);
            showToast('error', 'فشل الحفظ', err.message);
        }
    });

    document.getElementById('tpGoalConfigModal').addEventListener('click', (e) => {
        if (e.target.id === 'tpGoalConfigModal') closeGoalConfigModal();
    });

    /* ============================================================
       13. Progress Update Modal
    ============================================================ */
    let currentProgressGoalId = null;

    window.openProgressModal = function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        currentProgressGoalId = goal.id;
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
        currentProgressGoalId = null;
    }

    document.getElementById('tpProgressCancel').addEventListener('click', closeProgressModal);

    document.getElementById('tpProgressSave').addEventListener('click', async function () {
        if (!currentProgressGoalId) return;
        const found = findGoalById(currentProgressGoalId);
        if (!found) { closeProgressModal(); return; }
        const { goal } = found;

        const valueRaw = document.getElementById('tpProgressValueInput').value;
        const note = document.getElementById('tpProgressNoteInput').value.trim();

        if (valueRaw === '' || isNaN(parseFloat(valueRaw))) {
            showToast('warning', 'قيمة غير صالحة', 'يرجى إدخال قيمة رقمية صحيحة.');
            return;
        }

        const payload = {
            goalId: goal.id,
            value: parseFloat(valueRaw),
            note: note || null
        };

        const urls = getApiUrls();
        try {
            const res = await fetch(`${urls.goalProgress}${urls.goalProgress.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', 'تم التحديث', `تم تحديث التقدم إلى ${payload.value}${goal.unit ? ' ' + goal.unit : ''}.`);
            closeProgressModal();
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل تحديث التقدم:', err);
            showToast('error', 'فشل', err.message);
        }
    });

    document.getElementById('tpProgressModal').addEventListener('click', (e) => {
        if (e.target.id === 'tpProgressModal') closeProgressModal();
    });

    /* ============================================================
       14. Achieve Modal
    ============================================================ */
    let currentAchieveGoalId = null;

    window.openAchieveModal = function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        currentAchieveGoalId = goal.id;
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
        currentAchieveGoalId = null;
    }

    document.getElementById('tpAchieveCancel').addEventListener('click', closeAchieveModal);

    document.getElementById('tpAchieveSave').addEventListener('click', async function () {
        if (!currentAchieveGoalId) return;
        const found = findGoalById(currentAchieveGoalId);
        if (!found) { closeAchieveModal(); return; }
        const { goal } = found;
        const note = document.getElementById('tpAchieveNoteInput').value.trim();

        const payload = {
            goalId: goal.id,
            note: note || 'تم التحقق بواسطة الطبيب'
        };

        const urls = getApiUrls();
        try {
            const res = await fetch(`${urls.goalAchieve}${urls.goalAchieve.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', '✅ تم تحقق الهدف', goal.text);
            bnConfetti.fire(1500);
            closeAchieveModal();
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل تحقق الهدف:', err);
            showToast('error', 'فشل', err.message);
        }
    });

    document.getElementById('tpAchieveModal').addEventListener('click', (e) => {
        if (e.target.id === 'tpAchieveModal') closeAchieveModal();
    });

    /* ============================================================
       15. Toggle / Confirm / Reject
    ============================================================ */
    window.toggleGoalAchieved = async function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;

        if (goal.status === 'achieved') {
            const urls = getApiUrls();
            try {
                const res = await fetch(`${urls.goalUnachieve}${urls.goalUnachieve.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'fetch',
                        'Accept': 'application/json',
                        'RequestVerificationToken': getAntiForgeryToken()
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ goalId: goal.id })
                });
                const body = await res.text();
                if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                showToast('info', 'تم إلغاء التحقق', `الهدف عاد إلى قيد التنفيذ: ${goal.text}`);
                await loadTreatmentPlans();
            } catch (err) {
                console.error('❌ فشل إلغاء التحقق:', err);
                showToast('error', 'فشل', err.message);
            }
        } else {
            window.openAchieveModal(goal.id);
        }
    };

    window.confirmPatientAchievement = async function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        const urls = getApiUrls();
        try {
            const res = await fetch(`${urls.goalAchieve}${urls.goalAchieve.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ goalId: goal.id, note: 'تم تأكيد تحقيق المريض من الطبيب' })
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', '✅ تم التأكيد', 'تم تأكيد تحقيق المريض للهدف.');
            bnConfetti.fire(1200);
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل التأكيد:', err);
            showToast('error', 'فشل', err.message);
        }
    };

    window.rejectPatientAchievement = function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;

        showConfirmModal({
            title: 'رفض تحقيق المريض',
            subtitle: 'سيُعاد الهدف إلى قيد التنفيذ',
            message: `هل أنت متأكد من رفض تحقيق المريض للهدف <strong>${escapeHtml(goal.text)}</strong>؟`,
            confirmText: 'نعم، ارفض',
            onConfirm: async () => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.goalUnachieve}${urls.goalUnachieve.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ goalId: goal.id })
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('warning', 'تم الرفض', 'تم رفض تحقيق المريض، الهدف بحاجة لمزيد من العمل.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل الرفض:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    /* ============================================================
       16. Plan Form
    ============================================================ */
    const treatmentPlanForm = document.getElementById('treatmentPlanForm');
    if (treatmentPlanForm) {
        treatmentPlanForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }
            const editId = document.getElementById('tpEditId').value.trim();
            const isEdit = !!editId;
            const patientId = getPatientId();
            const urls = getApiUrls();

            const payload = {
                name: document.getElementById('tpPlanName').value.trim(),
                status: document.getElementById('tpPlanStatus').value,
                startDate: toIsoDateTime(document.getElementById('tpPlanStartDate').value),
                endDate: toIsoDateTime(document.getElementById('tpPlanEndDate').value),
                planDoctorName: document.getElementById('tpPlanDoctor').value.trim() || null,
                notes: document.getElementById('tpPlanNotes').value.trim() || null
            };

            const submitBtn = document.getElementById('tpSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    if (!isValidGuid(editId)) throw new Error(`معرّف الخطة غير صالح: "${editId}"`);
                    payload.id = editId;
                    const res = await fetch(`${urls.planUpdate}${urls.planUpdate.includes('?') ? '&' : '?'}id=${encodeURIComponent(editId)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify(payload)
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم التعديل', 'تم تحديث الخطة.');
                } else {
                    payload.patientId = patientId;
                    const res = await fetch(urls.planCreate, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify(payload)
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تمت الإضافة', 'تمت إضافة الخطة.');
                }
                bnConfetti.fire();
                resetTreatmentPlanForm();
                await loadTreatmentPlans();
            } catch (err) {
                console.error('❌ فشل حفظ الخطة:', err);
                showToast('error', 'فشل الحفظ', err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    window.editTreatmentPlan = function (planId) {
        const plan = findPlanById(planId);
        if (!plan) return;
        document.getElementById('tpEditId').value = plan.id;
        document.getElementById('tpEditIndex').value = 0;
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

    window.deleteTreatmentPlan = function (planId) {
        const plan = findPlanById(planId);
        if (!plan) return;
        showConfirmModal({
            title: 'تأكيد حذف الخطة',
            subtitle: 'سيتم حذف كل المشاكل والأهداف والوسائل التابعة لها',
            message: `هل أنت متأكد من حذف الخطة <strong>${escapeHtml(plan.name)}</strong>؟`,
            confirmText: 'نعم، احذف الخطة',
            onConfirm: async () => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.planDelete}${urls.planDelete.includes('?') ? '&' : '?'}id=${encodeURIComponent(plan.id)}`, {
                        method: 'DELETE',
                        headers: {
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin'
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم الحذف', 'تم حذف الخطة.');
                    resetTreatmentPlanForm();
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل حذف الخطة:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    window.resetTreatmentPlanForm = function () {
        const form = document.getElementById('treatmentPlanForm');
        if (!form) return;
        form.reset();
        document.getElementById('tpEditIndex').value = '-1';
        document.getElementById('tpEditId').value = '';
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
    window.addTpProblem = async function (planId) {
        const plan = findPlanById(planId);
        if (!plan) return;
        const input = document.getElementById(`tpProblemInput_${plan.id}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص المشكلة.'); return; }
        const urls = getApiUrls();
        try {
            const res = await fetch(urls.problemCreate, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ treatmentPlanId: plan.id, text })
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', 'تمت الإضافة', 'تمت إضافة المشكلة.');
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل إضافة المشكلة:', err);
            showToast('error', 'فشل', err.message);
        }
    };

    window.editTpProblem = function (problemId) {
        const found = findProblemById(problemId);
        if (!found) return;
        const { problem } = found;
        showEditModal({
            title: 'تعديل المشكلة',
            subtitle: 'قم بتعديل نص المشكلة ثم اضغط حفظ',
            label: 'نص المشكلة',
            value: problem.text,
            placeholder: 'اكتب نص المشكلة...',
            onSave: async (newValue) => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.problemUpdate}${urls.problemUpdate.includes('?') ? '&' : '?'}id=${encodeURIComponent(problem.id)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ id: problem.id, text: newValue })
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم التعديل', 'تم تعديل المشكلة.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل تعديل المشكلة:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    window.deleteTpProblem = function (problemId) {
        const found = findProblemById(problemId);
        if (!found) return;
        const { problem } = found;
        showConfirmModal({
            title: 'تأكيد حذف المشكلة',
            subtitle: 'سيتم حذف كل الأهداف والوسائل التابعة لها',
            message: `هل أنت متأكد من حذف المشكلة <strong>${escapeHtml(problem.text)}</strong>؟`,
            confirmText: 'نعم، احذف المشكلة',
            onConfirm: async () => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.problemDelete}${urls.problemDelete.includes('?') ? '&' : '?'}id=${encodeURIComponent(problem.id)}`, {
                        method: 'DELETE',
                        headers: {
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin'
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم الحذف', 'تم حذف المشكلة.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل حذف المشكلة:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    /* ============================================================
       18. Goals CRUD
    ============================================================ */
    window.addTpGoal = async function (problemId) {
        const found = findProblemById(problemId);
        if (!found) return;
        const { problem } = found;
        const input = document.getElementById(`tpGoalInput_${problem.id}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص الهدف.'); return; }
        const urls = getApiUrls();
        try {
            const res = await fetch(urls.goalCreate, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ treatmentProblemId: problem.id, text })
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', 'تمت الإضافة', 'تمت إضافة الهدف. يمكنك إعداد القياس من زر ⚙️');
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل إضافة الهدف:', err);
            showToast('error', 'فشل', err.message);
        }
    };

    window.editTpGoal = function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        showEditModal({
            title: 'تعديل نص الهدف',
            subtitle: 'قم بتعديل نص الهدف فقط. للقياس استخدم زر ⚙️',
            label: 'نص الهدف',
            value: goal.text,
            placeholder: 'اكتب نص الهدف...',
            onSave: async (newValue) => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.goalUpdate}${urls.goalUpdate.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            id: goal.id,
                            text: newValue,
                            unit: goal.unit || null,
                            baseline: goal.baseline,
                            targetValue: goal.targetValue
                        })
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم التعديل', 'تم تعديل الهدف.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل تعديل الهدف:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    window.deleteTpGoal = function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        showConfirmModal({
            title: 'تأكيد حذف الهدف',
            subtitle: 'سيتم حذف كل الوسائل التابعة لهذا الهدف',
            message: `هل أنت متأكد من حذف الهدف <strong>${escapeHtml(goal.text)}</strong>؟`,
            confirmText: 'نعم، احذف الهدف',
            onConfirm: async () => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.goalDelete}${urls.goalDelete.includes('?') ? '&' : '?'}id=${encodeURIComponent(goal.id)}`, {
                        method: 'DELETE',
                        headers: {
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin'
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم الحذف', 'تم حذف الهدف.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل حذف الهدف:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    /* ============================================================
       19. Means CRUD
    ============================================================ */
    window.addTpMean = async function (goalId) {
        const found = findGoalById(goalId);
        if (!found) return;
        const { goal } = found;
        const input = document.getElementById(`tpMeanInput_${goal.id}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص الوسيلة.'); return; }
        const urls = getApiUrls();
        try {
            const res = await fetch(urls.meanCreate, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'fetch',
                    'Accept': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify({ treatmentGoalId: goal.id, text })
            });
            const body = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
            showToast('success', 'تمت الإضافة', 'تمت إضافة الوسيلة.');
            await loadTreatmentPlans();
        } catch (err) {
            console.error('❌ فشل إضافة الوسيلة:', err);
            showToast('error', 'فشل', err.message);
        }
    };

    window.editTpMean = function (meanId) {
        const found = findMeanById(meanId);
        if (!found) return;
        const { mean } = found;
        showEditModal({
            title: 'تعديل الوسيلة',
            subtitle: 'قم بتعديل نص الوسيلة',
            label: 'نص الوسيلة',
            value: mean.text,
            placeholder: 'اكتب نص الوسيلة...',
            onSave: async (newValue) => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.meanUpdate}${urls.meanUpdate.includes('?') ? '&' : '?'}id=${encodeURIComponent(mean.id)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ id: mean.id, text: newValue })
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم التعديل', 'تم تعديل الوسيلة.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل تعديل الوسيلة:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    window.deleteTpMean = function (meanId) {
        const found = findMeanById(meanId);
        if (!found) return;
        const { mean } = found;
        showConfirmModal({
            title: 'تأكيد حذف الوسيلة',
            subtitle: 'لن تتمكن من استرجاع الوسيلة',
            message: `هل أنت متأكد من حذف الوسيلة <strong>${escapeHtml(mean.text)}</strong>؟`,
            confirmText: 'نعم، احذف الوسيلة',
            onConfirm: async () => {
                const urls = getApiUrls();
                try {
                    const res = await fetch(`${urls.meanDelete}${urls.meanDelete.includes('?') ? '&' : '?'}id=${encodeURIComponent(mean.id)}`, {
                        method: 'DELETE',
                        headers: {
                            'X-Requested-With': 'fetch',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        credentials: 'same-origin'
                    });
                    const body = await res.text();
                    if (!res.ok) throw new Error(`HTTP ${res.status} — ${body}`);
                    showToast('success', 'تم الحذف', 'تم حذف الوسيلة.');
                    await loadTreatmentPlans();
                } catch (err) {
                    console.error('❌ فشل حذف الوسيلة:', err);
                    showToast('error', 'فشل', err.message);
                }
            }
        });
    };

    /* ============================================================
       20. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('treatmentPlanForm'));
        attachDateListeners();
        const filterEl = document.getElementById('tpFilterStatus');
        if (filterEl) filterEl.addEventListener('change', renderTreatmentPlans);
        loadTreatmentPlans();
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