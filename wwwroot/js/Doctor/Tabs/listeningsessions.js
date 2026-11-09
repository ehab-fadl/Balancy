/* ============================================================
   Listening Sessions Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق ListeningSessionCreateDto/UpdateDto/ResponseDto
   - TimeSpan? → يتبعت "HH:mm:ss"
   - topics/techniques → string مفصول بفاصلة
   - LinkedTreatmentPlanId → GUID من قائمة الخطط
   - يحذف: localStorage + mock data
============================================================ */

(function initListeningSessions() {
    console.log('🚀 ListeningSessions.js initialized');

    /* ============================================================
       0. Utilities
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
        const form = document.getElementById('listeningSessionForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('listeningSessionForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=ListeningSessions',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateListeningSession',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateListeningSession',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=ListeningSession',
            plans: form?.dataset?.apiPlansUrl || '/Doctor?handler=TreatmentPlans'
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

    /**
     * تحويل "HH:mm" إلى TimeSpan string "HH:mm:ss" لـ .NET
     */
    function toTimeSpanString(timeInputValue) {
        if (!timeInputValue) return null;
        const parts = timeInputValue.split(':');
        if (parts.length < 2) return null;
        const hh = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        const ss = (parts[2] || '00').padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    /**
     * تحويل TimeSpan من الـ API إلى "HH:mm" لـ <input type=time>
     */
    function timeSpanToInputTime(timeSpanString) {
        if (!timeSpanString) return '';
        const match = String(timeSpanString).match(/^(\d{1,2}):(\d{2})/);
        if (!match) return '';
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }

    /**
     * split النص المفصول بفاصلة إلى array مع تنظيف
     */
    function splitCommaString(str) {
        if (!str) return [];
        return String(str).split(',').map(s => s.trim()).filter(Boolean);
    }

    /* ============================================================
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-ls-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-ls-toast-styles';
        style.textContent = `
            .bn-ls-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none;
                padding: 1rem; margin: 0 !important;
            }
            .bn-ls-toast-overlay.show { display: flex !important; }
            .bn-ls-toast {
                min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem;
                border-radius: 16px; display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnLsToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-ls-toast.hide { animation: bnLsToastOut 0.3s ease forwards; }
            .bn-ls-toast-icon {
                width: 38px; height: 38px; min-width: 38px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-ls-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-ls-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-ls-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-ls-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-ls-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-ls-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-ls-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnLsToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnLsToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnLsToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnLsToastOverlay';
            overlay.className = 'bn-ls-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-ls-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-ls-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-ls-toast-body">
                <div class="bn-ls-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-ls-toast-message">${escapeHtml(message || '')}</div>
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
       2. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#0891b2', '#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
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
       3. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            sessionTitle: { required: true, minLength: 3, maxLength: 150, messages: { required: 'عنوان الجلسة مطلوب', minLength: 'العنوان قصير جداً' } },
            sessionDate: { required: true, dateNotFuture: true, messages: { required: 'تاريخ الجلسة مطلوب', dateNotFuture: 'لا يمكن تسجيل جلسة بتاريخ مستقبلي' } },
            sessionStatus: { required: true, messages: { required: 'يرجى اختيار حالة الجلسة' } },
            sessionDuration: { required: false, numberRange: { min: 1, max: 480 }, messages: { numberRange: 'المدة بين 1 و 480 دقيقة' } }
        },
        conditionalRules: [
            {
                id: 'riskForCompleted',
                check: function () {
                    const status = document.getElementById('sessionStatus').value;
                    const risk = document.getElementById('sessionRiskLevel').value;
                    if (status === 'مكتملة' && !risk) {
                        return { field: document.getElementById('sessionRiskLevel'), label: 'مستوى الخطر', message: 'يجب تقييم الخطر للجلسات المكتملة', type: 'error' };
                    }
                    return null;
                }
            },
            {
                id: 'therapistForCompleted',
                check: function () {
                    const status = document.getElementById('sessionStatus').value;
                    const therapist = document.getElementById('sessionTherapistName').value.trim();
                    if (status === 'مكتملة' && !therapist) {
                        return { field: document.getElementById('sessionTherapistName'), label: 'المعالج المسؤول', message: 'يجب تحديد المعالج للجلسات المكتملة', type: 'error' };
                    }
                    return null;
                }
            }
        ],
        validators: {
            required: (v) => v !== null && v !== undefined && String(v).trim().length > 0,
            minLength: (v, len) => !v || v.trim().length >= len,
            maxLength: (v, len) => !v || v.length <= len,
            numberRange: (v, range) => {
                if (v === '' || v === null || v === undefined) return true;
                const n = Number(v);
                return !isNaN(n) && n >= range.min && n <= range.max;
            },
            dateNotFuture: (v) => {
                if (!v) return true;
                const input = new Date(v);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                return input <= today;
            }
        },
        validateField(field) {
            const name = field.name || field.id;
            const rule = this.rules[name];
            if (!rule) return { valid: true };
            const value = field.value;
            if (rule.required && !this.validators.required(value)) {
                return { valid: false, type: 'error', message: rule.messages?.required || 'هذا الحقل مطلوب' };
            }
            if (!value || String(value).trim() === '') return { valid: true };
            if (rule.minLength && !this.validators.minLength(value, rule.minLength)) {
                return { valid: false, type: 'error', message: rule.messages?.minLength || `الحد الأدنى ${rule.minLength}` };
            }
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength}` };
            }
            if (rule.numberRange && !this.validators.numberRange(value, rule.numberRange)) {
                return { valid: false, type: 'error', message: rule.messages?.numberRange || 'خارج النطاق' };
            }
            if (rule.dateNotFuture && !this.validators.dateNotFuture(value)) {
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ في المستقبل' };
            }
            return { valid: true, type: 'success', message: 'صحيح' };
        },
        updateFieldUI(field, result) {
            if (!field) return;
            const wrapper = field.closest('.col-md-6, .col-md-12, .col-12, .col-6') || field.parentElement;
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
                if (field.type === 'hidden' || field.type === 'checkbox' || field.type === 'range') return;
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
            this.conditionalRules.forEach(rule => {
                const err = rule.check();
                if (err) {
                    isValid = false;
                    errors.push(err);
                    if (err.field) {
                        const wrapper = err.field.closest('.col-md-6, .col-md-12, .col-12') || err.field.parentElement;
                        if (wrapper) {
                            let msgEl = wrapper.querySelector('.bn-field-message');
                            if (!msgEl) {
                                msgEl = document.createElement('div');
                                msgEl.className = 'bn-field-message';
                                err.field.parentNode.insertBefore(msgEl, err.field.nextSibling);
                            }
                            msgEl.className = 'bn-field-message error show';
                            msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${err.message}</span>`;
                        }
                    }
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
                    <button type="button" class="bn-summary-close" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <ul>${errors.map((e, i) => `<li data-error-index="${i}">${e.label}: ${e.message}</li>`).join('')}</ul>
            `;
            form.insertBefore(summary, form.firstChild);
            summary.querySelectorAll('li').forEach((li, i) => {
                li.addEventListener('click', () => {
                    const field = errors[i].field;
                    if (field) {
                        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => field.focus({ preventScroll: true }), 400);
                    }
                });
            });
            const closeBtn = summary.querySelector('.bn-summary-close');
            if (closeBtn) closeBtn.addEventListener('click', () => {
                summary.style.transition = 'opacity 0.3s ease';
                summary.style.opacity = '0';
                setTimeout(() => summary.remove(), 300);
            });
        },
        attachToField(field) {
            const name = field.name || field.id;
            if (!this.rules[name]) return;
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label && this.rules[name].required) label.classList.add('required');
            const eventType = (field.type === 'date' || field.type === 'time' || field.tagName === 'SELECT' || field.type === 'number') ? 'change' : 'blur';
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
       4. Badge Helpers
    ============================================================ */
    function getSessionStatusBadge(status) {
        switch (status) {
            case 'مكتملة': return '<span class="badge-soft badge-status-completed"><i class="fa-solid fa-circle-check"></i> مكتملة</span>';
            case 'مجدولة': return '<span class="badge-soft badge-status-scheduled"><i class="fa-regular fa-clock"></i> مجدولة</span>';
            case 'ملغية': return '<span class="badge-soft badge-status-cancelled"><i class="fa-solid fa-circle-xmark"></i> ملغية</span>';
            case 'مؤجلة': return '<span class="badge-soft badge-status-postponed"><i class="fa-solid fa-clock-rotate-left"></i> مؤجلة</span>';
            case 'لم يحضر': return '<span class="badge-soft badge-status-noshow"><i class="fa-solid fa-user-slash"></i> لم يحضر</span>';
            default: return '<span class="badge-soft">-</span>';
        }
    }

    function getSessionTypeBadge(type) {
        if (!type) return '<span class="badge-soft">-</span>';
        return `<span class="badge-soft badge-type-default"><i class="fa-solid fa-tag"></i> ${escapeHtml(type)}</span>`;
    }

    function getRiskBadge(level) {
        if (!level) return '<span class="ls-risk-badge risk-none"><i class="fa-solid fa-minus"></i> غير مقيم</span>';
        const map = {
            'منخفض': { cls: 'risk-low', icon: 'fa-shield-halved' },
            'متوسط': { cls: 'risk-medium', icon: 'fa-triangle-exclamation' },
            'عالي': { cls: 'risk-high', icon: 'fa-exclamation-circle' },
            'حرج': { cls: 'risk-critical', icon: 'fa-skull-crossbones' }
        };
        const cfg = map[level] || { cls: 'risk-none', icon: 'fa-minus' };
        return `<span class="ls-risk-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(level)}</span>`;
    }

    function getMoodCell(before, after) {
        if (before === null || before === undefined || after === null || after === undefined) {
            return '<span style="color:var(--bn-text-muted);">—</span>';
        }
        const change = after - before;
        const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
        const changeText = change > 0 ? `+${change}` : (change < 0 ? `${change}` : '0');
        return `
            <div class="ls-mood-cell">
                <span class="before">${before}</span>
                <span class="arrow"><i class="fa-solid fa-arrow-left"></i></span>
                <span class="after">${after}</span>
                <span class="change-badge ${changeClass}">${changeText}</span>
            </div>
        `;
    }

    /* ============================================================
       5. Confirm Modal
    ============================================================ */
    function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
        const modal = document.getElementById('bnConfirmModal');
        if (!modal) {
            if (window.confirm(message?.replace(/<[^>]*>/g, '') || 'هل أنت متأكد؟')) {
                if (typeof onConfirm === 'function') onConfirm();
            }
            return;
        }
        const titleEl = document.getElementById('bnConfirmModalTitle');
        const subtitleEl = document.getElementById('bnConfirmModalSubtitle');
        const messageEl = document.getElementById('bnConfirmModalMessage');
        const confirmBtn = document.getElementById('bnConfirmModalConfirm');
        const cancelBtn = document.getElementById('bnConfirmModalCancel');

        titleEl.textContent = title || 'تأكيد الحذف';
        subtitleEl.textContent = subtitle || 'لا يمكن التراجع عن هذه العملية';
        messageEl.innerHTML = message || 'هل أنت متأكد؟';
        confirmBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${confirmText || 'نعم، احذف'}`;

        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            confirmBtn.removeEventListener('click', onConfirmHandler);
            cancelBtn.removeEventListener('click', onCancelHandler);
            modal.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeyHandler);
        };
        const onConfirmHandler = () => { cleanup(); if (typeof onConfirm === 'function') onConfirm(); };
        const onCancelHandler = () => cleanup();
        const onOverlayClick = (e) => { if (e.target === modal) onCancelHandler(); };
        const onKeyHandler = (e) => {
            if (e.key === 'Escape') onCancelHandler();
            else if (e.key === 'Enter') { e.preventDefault(); onConfirmHandler(); }
        };
        confirmBtn.addEventListener('click', onConfirmHandler);
        cancelBtn.addEventListener('click', onCancelHandler);
        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyHandler);
    }

    /* ============================================================
       6. Treatment Plans Dropdown (from API)
    ============================================================ */
    async function loadTreatmentPlansDropdown() {
        const select = document.getElementById('sessionLinkedPlan');
        if (!select) return;
        select.innerHTML = '<option value="">بدون خطة محددة</option>';
        const patientId = getPatientId();
        if (!patientId) return;

        const urls = getApiUrls();
        const url = `${urls.plans}${urls.plans.includes('?') ? '&' : '?'}patientId=${encodeURIComponent(patientId)}`;
        try {
            const res = await fetch(url, {
                headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
                credentials: 'same-origin'
            });
            if (!res.ok) return;
            const payload = await res.json();
            const arr = extractArray(payload);
            arr.forEach(plan => {
                const id = plan.id ?? plan.Id ?? '';
                const name = plan.name ?? plan.Name ?? '';
                const status = plan.status ?? plan.Status ?? '';
                if (id && name) {
                    const opt = document.createElement('option');
                    opt.value = id;
                    opt.textContent = name + (status ? ` (${status})` : '');
                    select.appendChild(opt);
                }
            });
        } catch (err) {
            console.warn('⚠️ فشل تحميل الخطط العلاجية:', err);
        }
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

    /* ============================================================
       7. State + Mappers
    ============================================================ */
    let listeningSessionsList = [];
    let isLoadingList = false;

    function mapSessionDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            title: dto.title ?? dto.Title ?? '',
            date: normalizeDateForInput(dto.sessionDate ?? dto.SessionDate),
            time: timeSpanToInputTime(dto.sessionTime ?? dto.SessionTime),
            duration: dto.durationMinutes ?? dto.DurationMinutes ?? null,
            type: dto.sessionType ?? dto.SessionType ?? '',
            status: dto.status ?? dto.Status ?? '',
            therapyType: dto.therapyType ?? dto.TherapyType ?? '',
            format: dto.format ?? dto.Format ?? '',
            therapistName: dto.therapistName ?? dto.TherapistName ?? '',
            linkedPlan: dto.linkedTreatmentPlanId ?? dto.LinkedTreatmentPlanId ?? '',
            moodBefore: dto.moodBefore ?? dto.MoodBefore ?? 0,
            moodAfter: dto.moodAfter ?? dto.MoodAfter ?? 0,
            topics: splitCommaString(dto.topicsDiscussed ?? dto.TopicsDiscussed),
            techniques: splitCommaString(dto.techniquesUsed ?? dto.TechniquesUsed),
            riskLevel: dto.riskLevel ?? dto.RiskLevel ?? '',
            homeworkCompleted: dto.homeworkCompleted ?? dto.HomeworkCompleted ?? false,
            homeworkAssigned: dto.homeworkAssigned ?? dto.HomeworkAssigned ?? '',
            nextPlan: dto.nextSessionPlan ?? dto.NextSessionPlan ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            clinicalNotes: dto.clinicalNotes ?? dto.ClinicalNotes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       8. Stats + Render
    ============================================================ */
    function updateStatsSummary() {
        const totalEl = document.getElementById('lsStatTotal');
        const completedEl = document.getElementById('lsStatCompleted');
        const scheduledEl = document.getElementById('lsStatScheduled');
        const moodEl = document.getElementById('lsStatMoodChange');
        if (!totalEl) return;

        totalEl.textContent = listeningSessionsList.length;
        completedEl.textContent = listeningSessionsList.filter(s => s.status === 'مكتملة').length;
        scheduledEl.textContent = listeningSessionsList.filter(s => s.status === 'مجدولة').length;

        const moodChanges = listeningSessionsList
            .filter(s => s.status === 'مكتملة' && s.moodBefore != null && s.moodAfter != null)
            .map(s => s.moodAfter - s.moodBefore);

        if (moodChanges.length > 0) {
            const avg = moodChanges.reduce((a, b) => a + b, 0) / moodChanges.length;
            const sign = avg > 0 ? '+' : '';
            moodEl.textContent = sign + avg.toFixed(1);
            moodEl.style.color = avg > 0 ? '#10b981' : (avg < 0 ? '#ef4444' : 'var(--bn-text)');
        } else {
            moodEl.textContent = '—';
            moodEl.style.color = 'var(--bn-text)';
        }
    }

    function renderListeningSessionsTable() {
        const tbody = document.getElementById('sessionTableBody');
        const emptyState = document.getElementById('sessionEmptyState');
        const badge = document.getElementById('sessionCountBadge');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = listeningSessionsList.length === 0 ? 'block' : 'none';

        if (badge) {
            if (listeningSessionsList.length > 0) {
                badge.textContent = listeningSessionsList.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        listeningSessionsList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `ls-rowSlideIn 0.35s ease ${index * 0.05}s both`;
            const typeTherapy = [item.type, item.therapyType].filter(Boolean).join(' • ') || '-';
            tr.innerHTML = `
                <td data-label="#"><span class="table-index">${index + 1}</span></td>
                <td data-label="عنوان الجلسة">
                    <span class="session-title">
                        <i class="fa-solid fa-headphones"></i>
                        ${escapeHtml(item.title)}
                    </span>
                </td>
                <td data-label="التاريخ">${escapeHtml(item.date)}</td>
                <td data-label="النوع / العلاج" style="max-width: 180px; white-space: normal; font-size: 0.8rem;">${escapeHtml(typeTherapy)}</td>
                <td data-label="المدة">${item.duration ? escapeHtml(item.duration) + ' دقيقة' : '—'}</td>
                <td data-label="المزاج">${getMoodCell(item.moodBefore, item.moodAfter)}</td>
                <td data-label="الحالة">${getSessionStatusBadge(item.status)}</td>
                <td data-label="الخطر">${getRiskBadge(item.riskLevel)}</td>
                <td data-label="ملاحظات" style="max-width: 200px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '—'}</td>
                <td class="text-center">
                    <div class="action-btns">
                        <button type="button" class="btn btn-edit" data-edit-index="${index}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="btn btn-delete" data-delete-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => editListeningSessionItem(parseInt(btn.dataset.editIndex, 10)));
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => deleteListeningSessionItem(parseInt(btn.dataset.deleteIndex, 10)));
        });

        updateStatsSummary();
    }

    /* ============================================================
       9. Load from API
    ============================================================ */
    async function loadListeningSessions() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            listeningSessionsList = [];
            renderListeningSessionsTable();
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
            const arr = extractArray(payload);
            listeningSessionsList = arr.map(mapSessionDto);
            console.log('✅ Loaded listening sessions:', listeningSessionsList);
            renderListeningSessionsTable();
        } catch (err) {
            console.error('❌ فشل تحميل جلسات الاستماع:', err);
            listeningSessionsList = [];
            renderListeningSessionsTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل جلسات الاستماع.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       10. Build payloads
    ============================================================ */
    function buildBasePayload() {
        const topics = Array.from(document.querySelectorAll('.session-topic:checked')).map(c => c.value);
        const techniques = Array.from(document.querySelectorAll('.session-technique:checked')).map(c => c.value);
        const durationRaw = document.getElementById('sessionDuration').value;

        return {
            title: document.getElementById('sessionTitle').value.trim(),
            sessionDate: toIsoDateTime(document.getElementById('sessionDate').value),
            sessionTime: toTimeSpanString(document.getElementById('sessionTime').value),
            durationMinutes: durationRaw ? parseInt(durationRaw, 10) : null,
            sessionType: document.getElementById('sessionType').value || null,
            status: document.getElementById('sessionStatus').value,
            therapyType: document.getElementById('sessionTherapyType').value || null,
            format: document.getElementById('sessionFormat').value || null,
            therapistName: document.getElementById('sessionTherapistName').value.trim() || null,
            linkedTreatmentPlanId: document.getElementById('sessionLinkedPlan').value || null,
            moodBefore: parseInt(document.getElementById('sessionMoodBefore').value, 10) || 0,
            moodAfter: parseInt(document.getElementById('sessionMoodAfter').value, 10) || 0,
            topicsDiscussed: topics.length ? topics.join(', ') : null,
            techniquesUsed: techniques.length ? techniques.join(', ') : null,
            riskLevel: document.getElementById('sessionRiskLevel').value || null,
            homeworkCompleted: document.getElementById('sessionHomeworkCompleted').checked,
            homeworkAssigned: document.getElementById('sessionHomeworkAssigned').value.trim() || null,
            nextSessionPlan: document.getElementById('sessionNextPlan').value.trim() || null,
            notes: document.getElementById('sessionNotes').value.trim() || null,
            clinicalNotes: document.getElementById('sessionClinicalNotes').value.trim() || null
        };
    }

    function buildCreatePayload() {
        const payload = buildBasePayload();
        payload.patientId = getPatientId();
        return payload;
    }

    function buildUpdatePayload() {
        const payload = buildBasePayload();
        payload.id = document.getElementById('sessionEditId').value.trim();
        return payload;
    }

    /* ============================================================
       11. API CRUD
    ============================================================ */
    async function createSessionApi(payload) {
        const urls = getApiUrls();
        const res = await fetch(urls.create, {
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
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
        return text ? JSON.parse(text) : null;
    }

    async function updateSessionApi(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف الجلسة غير صالح: "${id}"`);
        const urls = getApiUrls();
        const url = `${urls.update}${urls.update.includes('?') ? '&' : '?'}id=${encodeURIComponent(id)}`;
        const res = await fetch(url, {
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
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
        return text ? JSON.parse(text) : null;
    }

    async function deleteSessionApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف الجلسة غير صالح: "${id}"`);
        const urls = getApiUrls();
        const url = `${urls.del}${urls.del.includes('?') ? '&' : '?'}id=${encodeURIComponent(id)}`;
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'fetch',
                'Accept': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            credentials: 'same-origin'
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
        return text ? JSON.parse(text) : null;
    }

    /* ============================================================
       12. Form Submit
    ============================================================ */
    const listeningSessionForm = document.getElementById('listeningSessionForm');
    if (listeningSessionForm) {
        listeningSessionForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء.`);
                return;
            }

            const editId = document.getElementById('sessionEditId').value.trim();
            const isEdit = !!editId;

            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف الجلسة غير صالح: "${editId}"`);
                return;
            }

            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('sessionSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateSessionApi(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تحديث الجلسة.');
                } else {
                    await createSessionApi(payload);
                    showToast('success', 'تمت الإضافة', 'تمت إضافة الجلسة.');
                }
                bnConfetti.fire();
                resetListeningSessionForm();
                await loadListeningSessions();
            } catch (err) {
                console.error('❌ فشل حفظ الجلسة:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء الحفظ.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       13. Edit / Delete / Reset
    ============================================================ */
    function editListeningSessionItem(index) {
        const item = listeningSessionsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذه الجلسة لا تحتوي على معرّف (id) صالح — لا يمكن تعديلها.');
            return;
        }
        document.getElementById('sessionEditId').value = item.id;
        document.getElementById('sessionEditIndex').value = index;
        document.getElementById('sessionTitle').value = item.title || '';
        document.getElementById('sessionDate').value = item.date || '';
        document.getElementById('sessionTime').value = item.time || '';
        document.getElementById('sessionDuration').value = item.duration || '';
        document.getElementById('sessionType').value = item.type || '';
        document.getElementById('sessionStatus').value = item.status || '';
        document.getElementById('sessionTherapyType').value = item.therapyType || '';
        document.getElementById('sessionFormat').value = item.format || '';
        document.getElementById('sessionTherapistName').value = item.therapistName || '';
        document.getElementById('sessionLinkedPlan').value = item.linkedPlan || '';
        document.getElementById('sessionMoodBefore').value = item.moodBefore ?? 5;
        document.getElementById('sessionMoodAfter').value = item.moodAfter ?? 5;
        document.getElementById('sessionMoodBeforeValue').textContent = `${item.moodBefore ?? 5} / 10`;
        document.getElementById('sessionMoodAfterValue').textContent = `${item.moodAfter ?? 5} / 10`;
        document.getElementById('sessionRiskLevel').value = item.riskLevel || '';
        document.getElementById('sessionHomeworkCompleted').checked = !!item.homeworkCompleted;
        document.getElementById('sessionHomeworkAssigned').value = item.homeworkAssigned || '';
        document.getElementById('sessionNextPlan').value = item.nextPlan || '';
        document.getElementById('sessionNotes').value = item.notes || '';
        document.getElementById('sessionClinicalNotes').value = item.clinicalNotes || '';

        document.querySelectorAll('.session-topic').forEach(c => { c.checked = (item.topics || []).includes(c.value); });
        document.querySelectorAll('.session-technique').forEach(c => { c.checked = (item.techniques || []).includes(c.value); });

        updateMoodChangeDisplay();

        document.getElementById('sessionFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الجلسة';
        document.getElementById('sessionSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('sessionCancelBtn').classList.remove('d-none');
        listeningSessionForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.title}`);
    }

    function deleteListeningSessionItem(index) {
        const item = listeningSessionsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذه الجلسة لا تحتوي على معرّف (id) صالح — لا يمكن حذفها.');
            return;
        }
        showConfirmModal({
            title: 'تأكيد حذف الجلسة',
            subtitle: 'لن تتمكن من استرجاع هذه الجلسة',
            message: `هل أنت متأكد من حذف الجلسة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الجلسة',
            onConfirm: async () => {
                try {
                    await deleteSessionApi(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف الجلسة.');
                    resetListeningSessionForm();
                    await loadListeningSessions();
                } catch (err) {
                    console.error('❌ فشل حذف الجلسة:', err);
                    showToast('error', 'فشل', err.message || 'حدث خطأ أثناء الحذف.');
                }
            }
        });
    }

    window.resetListeningSessionForm = function () {
        const form = document.getElementById('listeningSessionForm');
        if (!form) return;
        form.reset();
        document.getElementById('sessionEditIndex').value = '-1';
        document.getElementById('sessionEditId').value = '';
        document.getElementById('sessionMoodBefore').value = 5;
        document.getElementById('sessionMoodAfter').value = 5;
        document.getElementById('sessionMoodBeforeValue').textContent = '5 / 10';
        document.getElementById('sessionMoodAfterValue').textContent = '5 / 10';
        document.querySelectorAll('.session-topic, .session-technique').forEach(c => c.checked = false);
        updateMoodChangeDisplay();
        document.getElementById('sessionFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة جلسة استماع جديدة';
        document.getElementById('sessionSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة الجلسة';
        document.getElementById('sessionCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       14. Mood Change Display
    ============================================================ */
    function updateMoodChangeDisplay() {
        const beforeEl = document.getElementById('sessionMoodBefore');
        const afterEl = document.getElementById('sessionMoodAfter');
        if (!beforeEl || !afterEl) return;
        const before = parseInt(beforeEl.value) || 0;
        const after = parseInt(afterEl.value) || 0;
        const diff = after - before;
        const el = document.getElementById('sessionMoodChange');
        if (!el) return;

        el.classList.remove('improved', 'declined');
        let icon = 'fa-minus';
        if (diff > 0) { el.classList.add('improved'); icon = 'fa-arrow-trend-up'; }
        else if (diff < 0) { el.classList.add('declined'); icon = 'fa-arrow-trend-down'; }

        const sign = diff > 0 ? '+' : '';
        el.innerHTML = `<i class="fa-solid ${icon}"></i> <span>التحسن: <strong>${sign}${diff}</strong> نقطة</span>`;
    }

    /* ============================================================
       15. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('listeningSessionForm'));

        // Mood sliders
        const moodBefore = document.getElementById('sessionMoodBefore');
        const moodAfter = document.getElementById('sessionMoodAfter');
        if (moodBefore) moodBefore.addEventListener('input', function () {
            document.getElementById('sessionMoodBeforeValue').textContent = `${this.value} / 10`;
            updateMoodChangeDisplay();
        });
        if (moodAfter) moodAfter.addEventListener('input', function () {
            document.getElementById('sessionMoodAfterValue').textContent = `${this.value} / 10`;
            updateMoodChangeDisplay();
        });

        // ضبط تاريخ اليوم افتراضياً
        const sessionDateEl = document.getElementById('sessionDate');
        if (sessionDateEl && !sessionDateEl.value) {
            sessionDateEl.value = new Date().toISOString().slice(0, 10);
        }

        loadTreatmentPlansDropdown();
        loadListeningSessions();

        setTimeout(() => {
            showToast('info', 'جلسات الاستماع', 'سجّل الجلسات مع قياس المزاج قبل/بعد، الخطر، والمهام المنزلية.', 5000);
        }, 1000);

        console.log('%c✅ Listening Sessions Tab Loaded',
            'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();