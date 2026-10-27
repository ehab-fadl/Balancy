/* ============================================================
   Listening Sessions Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initListeningSessions() {
    console.log('🚀 ListeningSessions.js initialized');

    /* ============================================================
       1. Storage Layer (fallback)
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
       2. Utilities — escapeHtml
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       3. Toast — نظام مدمج مضمون العمل
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-ls-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-ls-toast-styles';
        style.textContent = `
            .bn-ls-toast-overlay {
                position: fixed !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none;
                padding: 1rem; margin: 0 !important;
            }
            .bn-ls-toast-overlay.show { display: flex !important; }
            .bn-ls-toast {
                min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem;
                border-radius: 16px; display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
                font-weight: 800; font-size: 0.95rem; color: #fff;
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
       4. Confetti
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
       5. Validation Engine — نسخة شاملة
    ============================================================ */
    const bnValidation = {
        rules: {
            sessionTitle: {
                required: true, minLength: 3, maxLength: 150,
                messages: {
                    required: 'عنوان الجلسة مطلوب',
                    minLength: 'العنوان قصير جداً (3 أحرف على الأقل)',
                    maxLength: 'العنوان طويل جداً (150 حرف كحد أقصى)'
                }
            },
            sessionDate: {
                required: true, dateNotFuture: true,
                messages: {
                    required: 'تاريخ الجلسة مطلوب',
                    dateNotFuture: 'لا يمكن تسجيل جلسة بتاريخ مستقبلي'
                }
            },
            sessionStatus: {
                required: true,
                messages: { required: 'يرجى اختيار حالة الجلسة' }
            },
            sessionDuration: {
                required: false, numberRange: { min: 1, max: 480 },
                messages: { numberRange: 'المدة يجب أن تكون بين 1 و 480 دقيقة' }
            }
        },

        conditionalRules: [
            {
                id: 'riskForCompleted',
                check: function () {
                    const status = document.getElementById('sessionStatus').value;
                    const risk = document.getElementById('sessionRiskLevel').value;
                    if (status === 'مكتملة' && !risk) {
                        return {
                            field: document.getElementById('sessionRiskLevel'),
                            label: 'مستوى الخطر',
                            message: 'يجب تقييم الخطر للجلسات المكتملة',
                            type: 'error'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'topicsForCompleted',
                check: function () {
                    const status = document.getElementById('sessionStatus').value;
                    const topics = Array.from(document.querySelectorAll('.session-topic:checked'));
                    if (status === 'مكتملة' && topics.length === 0) {
                        return {
                            field: document.querySelector('.session-topic'),
                            label: 'الموضوعات المطروحة',
                            message: 'يجب اختيار موضوع واحد على الأقل للجلسات المكتملة',
                            type: 'error'
                        };
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
                        return {
                            field: document.getElementById('sessionTherapistName'),
                            label: 'المعالج المسؤول',
                            message: 'يجب تحديد المعالج للجلسات المكتملة',
                            type: 'error'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'techniquesForTherapy',
                check: function () {
                    const therapyType = document.getElementById('sessionTherapyType').value;
                    const techniques = Array.from(document.querySelectorAll('.session-technique:checked'));
                    const isTechTherapy = therapyType && (therapyType.startsWith('CBT') || therapyType.startsWith('DBT') || therapyType.startsWith('ACT'));
                    if (isTechTherapy && techniques.length === 0) {
                        return {
                            field: document.querySelector('.session-technique'),
                            label: 'التقنيات المستخدمة',
                            message: 'يجب تحديد تقنية واحدة على الأقل لهذا النوع من العلاج',
                            type: 'error'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'homeworkIfCompleted',
                check: function () {
                    const homeworkCompleted = document.getElementById('sessionHomeworkCompleted').checked;
                    const homeworkAssigned = document.getElementById('sessionHomeworkAssigned').value.trim();
                    if (homeworkCompleted && !homeworkAssigned) {
                        return {
                            field: document.getElementById('sessionHomeworkAssigned'),
                            label: 'المهام المنزلية القادمة',
                            message: 'حدد المهام القادمة للمريض الملتزم',
                            type: 'error'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'noPlanWarning',
                check: function () {
                    const linkedPlan = document.getElementById('sessionLinkedPlan').value;
                    if (!linkedPlan) {
                        return {
                            field: document.getElementById('sessionLinkedPlan'),
                            label: 'الخطة العلاجية',
                            message: 'لم يتم ربط الجلسة بخطة علاجية (اختياري)',
                            type: 'warning',
                            isWarning: true
                        };
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
                return { valid: false, type: 'error', message: rule.messages?.minLength || `الحد الأدنى ${rule.minLength} أحرف` };
            }
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
            }
            if (rule.numberRange && !this.validators.numberRange(value, rule.numberRange)) {
                return { valid: false, type: 'error', message: rule.messages?.numberRange || `القيمة بين ${rule.numberRange.min} و ${rule.numberRange.max}` };
            }
            if (rule.dateNotFuture && !this.validators.dateNotFuture(value)) {
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ لا يمكن أن يكون في المستقبل' };
            }
            return { valid: true, type: 'success', message: 'صحيح' };
        },

        updateFieldUI(field, result) {
            if (!field) return;
            const wrapper = field.closest('.col-md-6, .col-md-12, .col-12, .col-6') || field.parentElement;
            field.classList.remove('is-valid', 'is-invalid', 'is-warning');

            let messageEl = wrapper.querySelector('.bn-field-message');
            if (!messageEl) {
                messageEl = document.createElement('div');
                messageEl.className = 'bn-field-message';
                field.parentNode.insertBefore(messageEl, field.nextSibling);
            }

            if (result.isWarning) {
                field.classList.add('is-warning');
                messageEl.className = 'bn-field-message warning show';
                messageEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${result.message}</span>`;
            } else if (result.valid && result.type === 'success' && field.value.trim() !== '') {
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
            const warnings = [];

            fields.forEach(field => {
                if (field.type === 'hidden' || field.type === 'checkbox' || field.type === 'range') return;
                if (!field.name && !field.id) return;

                const result = this.validateField(field);
                this.updateFieldUI(field, result);

                if (!result.valid) {
                    isValid = false;
                    const label = form.querySelector(`label[for="${field.id}"]`);
                    const labelText = label ? label.textContent.trim().replace('*', '').trim() : (field.name || field.id);
                    errors.push({ field, label: labelText, message: result.message, type: 'error' });
                }
            });

            this.conditionalRules.forEach(rule => {
                const err = rule.check();
                if (err) {
                    if (err.isWarning) {
                        warnings.push(err);
                    } else {
                        isValid = false;
                        errors.push(err);
                        if (err.field) {
                            const wrapper = err.field.closest('.col-md-6, .col-md-12, .col-12, .col-6') || err.field.parentElement;
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
                }
            });

            return { isValid, errors, warnings };
        },

        scrollToFirstError(form) {
            const firstInvalid = form.querySelector('.is-invalid');
            if (!firstInvalid) return;
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => firstInvalid.focus({ preventScroll: true }), 400);
        },

        showSummary(form, errors, warnings = []) {
            const existing = form.querySelector('.bn-validation-summary');
            if (existing) existing.remove();
            if (errors.length === 0 && warnings.length === 0) return;

            const summary = document.createElement('div');
            summary.className = 'bn-validation-summary show';

            let html = '';
            if (errors.length > 0) {
                html += `
                    <div class="bn-validation-summary-header">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} يجب تصحيحها:</span>
                        <button type="button" class="bn-summary-close" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <ul>
                        ${errors.map((e, i) => `<li data-error-index="${i}" data-severity="error">${e.label}: ${e.message}</li>`).join('')}
                    </ul>
                `;
            }
            if (warnings.length > 0) {
                html += `
                    <div class="bn-validation-summary-header" style="margin-top: ${errors.length > 0 ? '0.75rem' : '0'}; color: #b45309;">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>${warnings.length} ${warnings.length === 1 ? 'تنبيه' : 'تنبيهات'} (اختيارية):</span>
                    </div>
                    <ul>
                        ${warnings.map((w, i) => `<li data-warning-index="${i}" data-severity="warning" style="color: #b45309;">${w.label}: ${w.message}</li>`).join('')}
                    </ul>
                `;
            }

            summary.innerHTML = html;
            form.insertBefore(summary, form.firstChild);

            summary.querySelectorAll('li[data-severity="error"]').forEach((li, i) => {
                li.addEventListener('click', () => {
                    const field = errors[i].field;
                    if (field) {
                        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => field.focus({ preventScroll: true }), 400);
                    }
                });
            });

            const closeBtn = summary.querySelector('.bn-summary-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    summary.style.transition = 'opacity 0.3s ease';
                    summary.style.opacity = '0';
                    setTimeout(() => summary.remove(), 300);
                });
            }
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
       6. Badge Helpers
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
       7. Confirm Modal
    ============================================================ */
    function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
        const modal = document.getElementById('bnConfirmModal');
        const titleEl = document.getElementById('bnConfirmModalTitle');
        const subtitleEl = document.getElementById('bnConfirmModalSubtitle');
        const messageEl = document.getElementById('bnConfirmModalMessage');
        const confirmBtn = document.getElementById('bnConfirmModalConfirm');

        titleEl.textContent = title || 'تأكيد الحذف';
        subtitleEl.textContent = subtitle || 'لا يمكن التراجع عن هذه العملية';
        messageEl.innerHTML = message || 'هل أنت متأكد؟';
        confirmBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${confirmText || 'نعم، احذف'}`;

        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            confirmBtn.removeEventListener('click', onConfirmHandler);
            document.getElementById('bnConfirmModalCancel').removeEventListener('click', onCancelHandler);
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
        document.getElementById('bnConfirmModalCancel').addEventListener('click', onCancelHandler);
        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyHandler);
    }

    /* ============================================================
       8. Treatment Plans Dropdown
    ============================================================ */
    function populateTreatmentPlansDropdown() {
        const select = document.getElementById('sessionLinkedPlan');
        if (!select) return;
        const plans = storage.get('treatmentPlans', []);
        select.innerHTML = '<option value="">بدون خطة محددة</option>';
        plans.forEach(plan => {
            const opt = document.createElement('option');
            opt.value = plan.name;
            opt.textContent = plan.name + (plan.status ? ` (${plan.status})` : '');
            select.appendChild(opt);
        });
    }

    /* ============================================================
       9. Listening Sessions CRUD
    ============================================================ */
    let listeningSessionsList = storage.get('listeningSessions', [
        {
            title: 'جلسة استماع أولى - تقييم مبدئي',
            date: '2024-01-10',
            time: '10:30',
            duration: 45,
            type: 'جلسة استماع فردية',
            status: 'مكتملة',
            notes: 'تم الاستماع لمشكلات المريض الأساسية ووضع خطة أولية للمتابعة.',
            therapyType: 'CBT - العلاج المعرفي السلوكي',
            format: 'فردي',
            therapistName: 'د. أحمد',
            linkedPlan: '',
            moodBefore: 4,
            moodAfter: 6,
            topics: ['قلق', 'علاقات'],
            techniques: ['استرخاء عضلي'],
            riskLevel: 'منخفض',
            homeworkCompleted: false,
            homeworkAssigned: 'تمارين تنفس يومياً',
            nextPlan: 'متابعة تمارين التنفس والحديث عن العلاقات',
            clinicalNotes: 'المريض متعاون، تجاوب جيد مع التمارين.'
        }
    ]);

    listeningSessionsList = listeningSessionsList.map(s => {
        if (s.therapyType === undefined) s.therapyType = '';
        if (s.format === undefined) s.format = '';
        if (s.therapistName === undefined) s.therapistName = '';
        if (s.linkedPlan === undefined) s.linkedPlan = '';
        if (s.moodBefore === undefined) s.moodBefore = null;
        if (s.moodAfter === undefined) s.moodAfter = null;
        if (!Array.isArray(s.topics)) s.topics = [];
        if (!Array.isArray(s.techniques)) s.techniques = [];
        if (s.riskLevel === undefined) s.riskLevel = '';
        if (s.homeworkCompleted === undefined) s.homeworkCompleted = false;
        if (s.homeworkAssigned === undefined) s.homeworkAssigned = '';
        if (s.nextPlan === undefined) s.nextPlan = '';
        if (s.clinicalNotes === undefined) s.clinicalNotes = '';
        return s;
    });
    storage.set('listeningSessions', listeningSessionsList);

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
            .filter(s => s.moodBefore !== null && s.moodAfter !== null && s.status === 'مكتملة')
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
        emptyState.style.display = listeningSessionsList.length === 0 ? 'block' : 'none';

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
                <td data-label="#">
                    <span class="table-index">${index + 1}</span>
                </td>
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
                        <button type="button" class="btn btn-edit" onclick="editListeningSessionItem(${index})" aria-label="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-delete" onclick="deleteListeningSessionItem(${index})" aria-label="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updateStatsSummary();
    }

    /* ============================================================
       10. Form Submit — مع فاليديشن شامل
    ============================================================ */
    const listeningSessionForm = document.getElementById('listeningSessionForm');
    if (listeningSessionForm) {
        listeningSessionForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const { isValid, errors, warnings } = bnValidation.validateForm(this);

            if (warnings.length > 0) {
                bnValidation.showSummary(this, errors, warnings);
            }

            if (!isValid) {
                if (warnings.length === 0) bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'}.`);
                return;
            }

            const topics = Array.from(document.querySelectorAll('.session-topic:checked')).map(c => c.value);
            const techniques = Array.from(document.querySelectorAll('.session-technique:checked')).map(c => c.value);

            const editIndex = parseInt(document.getElementById('sessionEditIndex').value);
            const item = {
                title: document.getElementById('sessionTitle').value.trim(),
                date: document.getElementById('sessionDate').value,
                time: document.getElementById('sessionTime').value,
                duration: document.getElementById('sessionDuration').value,
                type: document.getElementById('sessionType').value,
                status: document.getElementById('sessionStatus').value,
                therapyType: document.getElementById('sessionTherapyType').value,
                format: document.getElementById('sessionFormat').value,
                therapistName: document.getElementById('sessionTherapistName').value.trim(),
                linkedPlan: document.getElementById('sessionLinkedPlan').value,
                moodBefore: parseInt(document.getElementById('sessionMoodBefore').value) || 0,
                moodAfter: parseInt(document.getElementById('sessionMoodAfter').value) || 0,
                topics: topics,
                techniques: techniques,
                riskLevel: document.getElementById('sessionRiskLevel').value,
                homeworkCompleted: document.getElementById('sessionHomeworkCompleted').checked,
                homeworkAssigned: document.getElementById('sessionHomeworkAssigned').value.trim(),
                nextPlan: document.getElementById('sessionNextPlan').value.trim(),
                notes: document.getElementById('sessionNotes').value.trim(),
                clinicalNotes: document.getElementById('sessionClinicalNotes').value.trim()
            };

            if (editIndex === -1) {
                listeningSessionsList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة الجلسة بنجاح.');
            } else {
                listeningSessionsList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تحديث الجلسة.');
            }

            storage.set('listeningSessions', listeningSessionsList);
            resetListeningSessionForm();
            renderListeningSessionsTable();
            bnConfetti.fire();
        });
    }

    /* ============================================================
       11. Edit / Delete / Reset
    ============================================================ */
    window.editListeningSessionItem = function (index) {
        const item = listeningSessionsList[index];
        if (!item) return;

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

        document.getElementById('sessionEditIndex').value = index;
        document.getElementById('sessionFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الجلسة';
        document.getElementById('sessionSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('sessionCancelBtn').classList.remove('d-none');
        document.getElementById('listeningSessionForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.title}`);
    };

    window.deleteListeningSessionItem = function (index) {
        if (index < 0 || index >= listeningSessionsList.length) return;
        const item = listeningSessionsList[index];
        showConfirmModal({
            title: 'تأكيد حذف الجلسة',
            subtitle: 'لن تتمكن من استرجاع هذه الجلسة',
            message: `هل أنت متأكد من حذف الجلسة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الجلسة',
            onConfirm: () => {
                listeningSessionsList.splice(index, 1);
                storage.set('listeningSessions', listeningSessionsList);
                renderListeningSessionsTable();
                resetListeningSessionForm();
                showToast('success', 'تم الحذف', 'تم حذف الجلسة.');
            }
        });
    };

    window.resetListeningSessionForm = function () {
        const form = document.getElementById('listeningSessionForm');
        if (!form) return;
        form.reset();
        document.getElementById('sessionEditIndex').value = '-1';
        document.getElementById('sessionMoodBefore').value = 5;
        document.getElementById('sessionMoodAfter').value = 5;
        document.getElementById('sessionMoodBeforeValue').textContent = '5 / 10';
        document.getElementById('sessionMoodAfterValue').textContent = '5 / 10';
        document.querySelectorAll('.session-topic, .session-technique').forEach(c => c.checked = false);
        updateMoodChangeDisplay();
        document.getElementById('sessionFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة جلسة استماع جديدة';
        document.getElementById('sessionSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة الجلسة';
        document.getElementById('sessionCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid, .is-warning').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid', 'is-warning');
        });
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       12. Mood Change Display
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

        if (diff > 0) {
            el.classList.add('improved');
            icon = 'fa-arrow-trend-up';
        } else if (diff < 0) {
            el.classList.add('declined');
            icon = 'fa-arrow-trend-down';
        }

        const sign = diff > 0 ? '+' : '';
        el.innerHTML = `<i class="fa-solid ${icon}"></i> <span>التحسن: <strong>${sign}${diff}</strong> نقطة</span>`;
    }

    /* ============================================================
       13. Init
    ============================================================ */
    function doInit() {
        populateTreatmentPlansDropdown();
        renderListeningSessionsTable();
        bnValidation.attachToForm(document.getElementById('listeningSessionForm'));

        const moodBefore = document.getElementById('sessionMoodBefore');
        const moodAfter = document.getElementById('sessionMoodAfter');
        if (moodBefore) {
            moodBefore.addEventListener('input', function () {
                document.getElementById('sessionMoodBeforeValue').textContent = `${this.value} / 10`;
                updateMoodChangeDisplay();
            });
        }
        if (moodAfter) {
            moodAfter.addEventListener('input', function () {
                document.getElementById('sessionMoodAfterValue').textContent = `${this.value} / 10`;
                updateMoodChangeDisplay();
            });
        }

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