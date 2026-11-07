/* ============================================================
   Vital Signs Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق DTOs الباك إند (VitalSignCreateDto/UpdateDto/ResponseDto)
   - يحافظ على: Toast, Modal, Validation, Confetti, Filters, Status calculation
   - يحذف: localStorage
============================================================ */

(function initVitalSignsTab() {
    'use strict';

    console.log('🚀 VitalSigns.js initialized');

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
        const form = document.getElementById('vitalForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('vitalForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=VitalSigns',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateVitalSign',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateVitalSign',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=VitalSign'
        };
    }

    function isValidGuid(value) {
        if (!value) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(value).trim());
    }

    /**
     * يحوّل قيمة <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") إلى ISO DateTime كامل.
     */
    function toIsoDateTime(localValue) {
        if (!localValue) return null;
        const d = new Date(localValue);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    }

    /**
     * يحوّل ISO DateTime من الـ API إلى "YYYY-MM-DDTHH:mm" لعرضه في input[type=datetime-local].
     */
    function toLocalDateTimeInput(isoValue) {
        if (!isoValue) return '';
        try {
            const d = new Date(isoValue);
            if (isNaN(d.getTime())) return '';
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            return local.toISOString().slice(0, 16);
        } catch { return ''; }
    }

    /* ============================================================
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-vs-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-vs-toast-styles';
        style.textContent = `
            .bn-vs-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-vs-toast-overlay.show { display: flex !important; }
            .bn-vs-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnVsToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-vs-toast.hide { animation: bnVsToastOut 0.3s ease forwards; }
            .bn-vs-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-vs-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-vs-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-vs-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-vs-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-vs-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-vs-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-vs-toast.info { background: linear-gradient(135deg, #10b981, #0891b2); }
            @keyframes bnVsToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnVsToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded',
                () => showBuiltInToast(type, title, message, duration),
                { once: true });
            return;
        }
        let overlay = document.getElementById('bnVsToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnVsToastOverlay';
            overlay.className = 'bn-vs-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = {
            error: 'fa-circle-exclamation',
            success: 'fa-circle-check',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        const toast = document.createElement('div');
        toast.className = `bn-vs-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-vs-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-vs-toast-body">
                <div class="bn-vs-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-vs-toast-message">${escapeHtml(message || '')}</div>
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

    function toast(type, title, message, duration = 3500) {
        return showBuiltInToast(type, title, message, duration);
    }

    /* ============================================================
       2. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#10b981', '#0891b2', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'],
        ensureEl() {
            if (this.el && document.body.contains(this.el)) return this.el;
            let existing = document.getElementById('bnConfetti');
            if (!existing) {
                existing = document.createElement('div');
                existing.className = 'bn-confetti';
                existing.id = 'bnConfetti';
                existing.setAttribute('aria-hidden', 'true');
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
            setTimeout(() => {
                el.classList.remove('active');
                el.innerHTML = '';
            }, duration);
        }
    };

    /* ============================================================
       3. Focus Trap
    ============================================================ */
    const bnFocusTrap = {
        activeTrap: null,
        activate(modalEl) {
            if (!modalEl) return;
            const focusableSelector = [
                'a[href]', 'button:not([disabled])',
                'input:not([disabled])', 'select:not([disabled])',
                'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
            ].join(',');
            const previousActive = document.activeElement;
            const trap = {
                modalEl, previousActive,
                getFocusable: () => Array.from(modalEl.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null),
                handleKeydown: (e) => {
                    if (e.key !== 'Tab') return;
                    const focusables = trap.getFocusable();
                    if (focusables.length === 0) { e.preventDefault(); return; }
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            modalEl.addEventListener('keydown', trap.handleKeydown);
            this.activeTrap = trap;
            setTimeout(() => {
                const focusables = trap.getFocusable();
                if (focusables.length > 0) focusables[0].focus();
            }, 100);
        },
        deactivate() {
            if (!this.activeTrap) return;
            this.activeTrap.modalEl.removeEventListener('keydown', this.activeTrap.handleKeydown);
            if (this.activeTrap.previousActive && this.activeTrap.previousActive.focus) {
                try { this.activeTrap.previousActive.focus(); } catch (e) { }
            }
            this.activeTrap = null;
        }
    };

    /* ============================================================
       4. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            vitalType: { required: true, messages: { required: 'نوع القياس مطلوب' } },
            vitalDate: { required: true, messages: { required: 'تاريخ القياس مطلوب' } },
            vitalValue1: {
                required: true, numberRange: { min: -100, max: 500 },
                messages: { required: 'القيمة مطلوبة', numberRange: 'القيمة يجب أن تكون بين -100 و 500' }
            },
            vitalValue2: {
                required: false, numberRange: { min: -100, max: 500 },
                messages: { numberRange: 'القيمة يجب أن تكون بين -100 و 500' }
            }
        },
        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            numberRange: (value, range) => {
                if (value === '' || value === null) return true;
                const num = Number(value);
                if (isNaN(num)) return false;
                return num >= range.min && num <= range.max;
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
            if (rule.numberRange && !this.validators.numberRange(value, rule.numberRange)) {
                return { valid: false, type: 'error', message: rule.messages?.numberRange || `القيمة يجب أن تكون بين ${rule.numberRange.min} و ${rule.numberRange.max}` };
            }
            return { valid: true, type: 'success', message: 'صحيح' };
        },
        updateFieldUI(field, result) {
            const wrapper = field.closest('.col-md-6, .col-md-12, .col-12') || field.parentElement;
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
                if (field.closest('#value2Wrapper') && document.getElementById('value2Wrapper').style.display === 'none') return;
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
                <ul>
                    ${errors.map((e, i) => `<li data-error-index="${i}">${e.label}: ${e.message}</li>`).join('')}
                </ul>
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
            const eventType = (field.tagName === 'SELECT' || field.type === 'date' || field.type === 'datetime-local' || field.type === 'number') ? 'change' : 'blur';
            field.addEventListener(eventType, () => {
                const result = this.validateField(field);
                this.updateFieldUI(field, result);
            });
            field.addEventListener('input', () => {
                if (field.classList.contains('is-invalid')) {
                    const result = this.validateField(field);
                    if (result.valid) {
                        this.updateFieldUI(field, { valid: true, type: 'success', message: 'صحيح' });
                    } else {
                        this.updateFieldUI(field, result);
                    }
                }
            });
        },
        attachToForm(form) {
            if (!form) return;
            form.querySelectorAll('input, select, textarea').forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       5. Confirm Modal
    ============================================================ */
    function ensureConfirmModal() {
        let modal = document.getElementById('bnConfirmModal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.className = 'bn-modal-overlay';
        modal.id = 'bnConfirmModal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="bn-modal bn-modal-danger">
                <div class="bn-modal-header">
                    <div class="bn-modal-header-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="bn-modal-header-text">
                        <h3 id="bnConfirmModalTitle">تأكيد الحذف</h3>
                        <p id="bnConfirmModalSubtitle">لا يمكن التراجع عن هذه العملية</p>
                    </div>
                </div>
                <div class="bn-modal-body">
                    <p class="bn-modal-message" id="bnConfirmModalMessage">هل أنت متأكد؟</p>
                </div>
                <div class="bn-modal-footer">
                    <button type="button" class="bn-btn bn-btn-ghost" id="bnConfirmModalCancel">
                        <i class="fa-solid fa-xmark"></i> إلغاء
                    </button>
                    <button type="button" class="bn-btn bn-btn-danger" id="bnConfirmModalConfirm">
                        <i class="fa-solid fa-trash"></i> نعم، احذف
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
        const modal = ensureConfirmModal();
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
        bnFocusTrap.activate(modal);
        const cleanup = () => {
            modal.classList.remove('show');
            bnFocusTrap.deactivate();
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
       6. Vitals Configuration
    ============================================================ */
    const vitalTypesConfig = {
        bloodPressure: {
            label: 'ضغط الدم', icon: 'fa-droplet', avatarClass: 'bp',
            unit1: 'mmHg', unit2: 'mmHg',
            value1Label: 'الضغط الانقباضي', value2Label: 'الضغط الانبساطي',
            hasSecondValue: true,
            ranges: {
                normal: { min1: 90, max1: 120, min2: 60, max2: 80 },
                warning: { min1: 120, max1: 139, min2: 80, max2: 89 },
                danger: { min1: 140, max1: 999, min2: 90, max2: 999 }
            }
        },
        heartRate: {
            label: 'معدل النبض', icon: 'fa-heart', avatarClass: 'heart',
            unit1: 'نبضة/دقيقة', value1Label: 'معدل النبض', hasSecondValue: false,
            ranges: { normal: { min1: 60, max1: 100 }, warning: { min1: 50, max1: 110 }, danger: { min1: 0, max1: 999 } }
        },
        weight: {
            label: 'الوزن', icon: 'fa-weight-scale', avatarClass: 'weight',
            unit1: 'كجم', value1Label: 'الوزن', hasSecondValue: false,
            ranges: { normal: { min1: 40, max1: 100 }, warning: { min1: 30, max1: 130 }, danger: { min1: 0, max1: 999 } }
        },
        height: {
            label: 'الطول', icon: 'fa-ruler-vertical', avatarClass: 'weight',
            unit1: 'سم', value1Label: 'الطول', hasSecondValue: false,
            ranges: { normal: { min1: 140, max1: 200 }, warning: { min1: 120, max1: 220 }, danger: { min1: 0, max1: 999 } }
        },
        bmi: {
            label: 'مؤشر كتلة الجسم', icon: 'fa-calculator', avatarClass: 'weight',
            unit1: 'kg/m²', value1Label: 'BMI', hasSecondValue: false,
            ranges: { normal: { min1: 18.5, max1: 24.9 }, warning: { min1: 17, max1: 29.9 }, danger: { min1: 0, max1: 999 } }
        },
        glucose: {
            label: 'سكر الدم', icon: 'fa-flask-vial', avatarClass: 'glucose',
            unit1: 'mg/dL', value1Label: 'مستوى السكر', hasSecondValue: false,
            ranges: { normal: { min1: 70, max1: 110 }, warning: { min1: 60, max1: 140 }, danger: { min1: 0, max1: 999 } }
        },
        temperature: {
            label: 'درجة الحرارة', icon: 'fa-temperature-half', avatarClass: 'temp',
            unit1: '°C', value1Label: 'درجة الحرارة', hasSecondValue: false,
            ranges: { normal: { min1: 36.1, max1: 37.2 }, warning: { min1: 35.5, max1: 38.0 }, danger: { min1: 0, max1: 999 } }
        },
        oxygen: {
            label: 'تشبع الأكسجين', icon: 'fa-lungs', avatarClass: 'oxygen',
            unit1: '%', value1Label: 'SpO₂', hasSecondValue: false,
            ranges: { normal: { min1: 95, max1: 100 }, warning: { min1: 90, max1: 100 }, danger: { min1: 0, max1: 999 } }
        },
        respiratory: {
            label: 'معدل التنفس', icon: 'fa-wind', avatarClass: 'respiratory',
            unit1: 'نفس/دقيقة', value1Label: 'معدل التنفس', hasSecondValue: false,
            ranges: { normal: { min1: 12, max1: 20 }, warning: { min1: 10, max1: 24 }, danger: { min1: 0, max1: 999 } }
        },
        waist: {
            label: 'محيط الخصر', icon: 'fa-tape', avatarClass: 'waist',
            unit1: 'سم', value1Label: 'محيط الخصر', hasSecondValue: false,
            ranges: { normal: { min1: 60, max1: 94 }, warning: { min1: 94, max1: 102 }, danger: { min1: 0, max1: 999 } }
        }
    };

    /* ============================================================
       7. Status Calculation & Formatting
    ============================================================ */
    function calculateVitalStatus(type, value1, value2) {
        const config = vitalTypesConfig[type];
        if (!config) return 'normal';
        const v1 = parseFloat(value1);
        const v2 = parseFloat(value2);
        if (isNaN(v1)) return 'normal';
        const ranges = config.ranges;
        if (config.hasSecondValue && !isNaN(v2)) {
            const isNormal = (v1 >= ranges.normal.min1 && v1 <= ranges.normal.max1) &&
                (v2 >= ranges.normal.min2 && v2 <= ranges.normal.max2);
            if (isNormal) return 'normal';
            const isWarning = (v1 >= ranges.warning.min1 && v1 <= ranges.warning.max1) &&
                (v2 >= ranges.warning.min2 && v2 <= ranges.warning.max2);
            if (isWarning) return 'warning';
            return 'danger';
        }
        if (v1 >= ranges.normal.min1 && v1 <= ranges.normal.max1) return 'normal';
        if (v1 >= ranges.warning.min1 && v1 <= ranges.warning.max1) return 'warning';
        return 'danger';
    }

    function getStatusText(status) {
        const map = { normal: 'طبيعي', warning: 'تحذير', danger: 'خطر' };
        return map[status] || 'طبيعي';
    }

    function getStatusIcon(status) {
        const map = { normal: 'fa-circle-check', warning: 'fa-triangle-exclamation', danger: 'fa-circle-exclamation' };
        return map[status] || 'fa-circle-check';
    }

    function formatReading(type, value1, value2) {
        const config = vitalTypesConfig[type];
        if (!config) return '-';
        if (config.hasSecondValue && value2) return `${value1}/${value2} ${config.unit1}`;
        return `${value1} ${config.unit1}`;
    }

    function formatDateTime(dtString) {
        if (!dtString) return '-';
        try {
            const dt = new Date(dtString);
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch (e) { return dtString; }
    }

    /* ============================================================
       8. State
    ============================================================ */
    let vitalsList = [];
    let isLoadingList = false;

    /* ============================================================
       9. Extract / mapping
    ============================================================ */
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

    function mapVitalDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            type: dto.vitalType ?? dto.VitalType ?? '',
            date: dto.measurementDate ?? dto.MeasurementDate ?? '',
            value1: dto.value1 ?? dto.Value1 ?? '',
            value2: dto.value2 ?? dto.Value2 ?? '',
            status: dto.status ?? dto.Status ?? 'normal',
            notes: dto.notes ?? dto.Notes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       10. Render
    ============================================================ */
    function updateVitalsCount() {
        const badge = document.getElementById('vitalsCountBadge');
        if (!badge) return;
        const count = vitalsList.length;
        badge.textContent = count === 0 ? '0 قراءة' :
            count === 1 ? 'قراءة واحدة' :
                count === 2 ? 'قراءتان' : `${count} قراءات`;
    }

    function getFilteredVitals() {
        const typeFilterEl = document.getElementById('filterType');
        const statusFilterEl = document.getElementById('filterStatus');
        const typeFilter = typeFilterEl ? typeFilterEl.value : '';
        const statusFilter = statusFilterEl ? statusFilterEl.value : '';
        return vitalsList.filter(item => {
            if (typeFilter && item.type !== typeFilter) return false;
            if (statusFilter && item.status !== statusFilter) return false;
            return true;
        });
    }

    function render() {
        const grid = document.getElementById('vitalsGrid');
        if (!grid) return;
        updateVitalsCount();
        const filtered = getFilteredVitals();
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-heart-pulse"></i></div>
                    <h3>${vitalsList.length === 0 ? 'لا توجد قراءات مسجّلة' : 'لا توجد نتائج مطابقة للفلتر'}</h3>
                    <p>${vitalsList.length === 0 ? 'ابدأ بإضافة أول قراءة حيوية للمريض' : 'جرب تغيير الفلاتر أو إضافة قراءة جديدة'}</p>
                </div>
            `;
            return;
        }
        const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
        grid.innerHTML = '';
        sorted.forEach((item, index) => {
            const config = vitalTypesConfig[item.type] || { label: item.type, icon: 'fa-heart-pulse', avatarClass: 'heart' };
            const realIndex = vitalsList.indexOf(item);
            const card = document.createElement('div');
            card.className = `vital-card status-${item.status || 'normal'}`;
            card.style.animationDelay = `${index * 0.05}s`;
            card.innerHTML = `
                <div class="vital-header">
                    <div class="vital-avatar ${config.avatarClass}">
                        <i class="fa-solid ${config.icon}"></i>
                    </div>
                    <div class="vital-info">
                        <h4 class="vital-name">
                            ${escapeHtml(config.label)}
                            <span class="vital-badge">
                                <i class="fa-solid fa-tag"></i>
                                ${escapeHtml(getStatusText(item.status))}
                            </span>
                        </h4>
                        <div class="vital-meta">
                            <span class="vital-meta-item">
                                <i class="fa-solid fa-calendar-days"></i>
                                ${escapeHtml(formatDateTime(item.date))}
                            </span>
                        </div>
                    </div>
                    <span class="status-badge ${item.status || 'normal'}">
                        <i class="fa-solid ${getStatusIcon(item.status)}"></i>
                        ${getStatusText(item.status)}
                    </span>
                </div>
                <div class="readings-section">
                    <div class="readings-label"><i class="fa-solid fa-chart-simple"></i> القراءة:</div>
                    <div class="readings-tags">
                        <span class="reading-tag ${item.status || 'normal'}">
                            <i class="fa-solid fa-heart-pulse"></i>
                            ${escapeHtml(formatReading(item.type, item.value1, item.value2))}
                        </span>
                    </div>
                </div>
                ${item.notes ? `<div class="vital-notes"><i class="fa-solid fa-note-sticky ms-1"></i>${escapeHtml(item.notes)}</div>` : ''}
                <div class="vital-actions">
                    <button type="button" class="action-btn edit" data-action="edit" data-index="${realIndex}" title="تعديل">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="action-btn delete" data-action="delete" data-index="${realIndex}" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
        grid.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => editVital(parseInt(btn.dataset.index, 10)));
        });
        grid.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteVital(parseInt(btn.dataset.index, 10)));
        });
    }

    /* ============================================================
       11. Type Change Handler
    ============================================================ */
    const vitalTypeSelect = document.getElementById('vitalType');
    const value1Label = document.getElementById('value1Label');
    const value2Label = document.getElementById('value2Label');
    const value1Unit = document.getElementById('value1Unit');
    const value2Unit = document.getElementById('value2Unit');
    const value2Wrapper = document.getElementById('value2Wrapper');

    function updateFormForType(type) {
        const config = vitalTypesConfig[type];
        if (!config) {
            if (value1Label) value1Label.textContent = 'القيمة الأولى';
            if (value1Unit) value1Unit.textContent = '--';
            if (value2Wrapper) value2Wrapper.style.display = 'none';
            return;
        }
        if (value1Label) value1Label.textContent = config.value1Label;
        if (value1Unit) value1Unit.textContent = config.unit1;
        if (config.hasSecondValue) {
            if (value2Wrapper) value2Wrapper.style.display = 'block';
            if (value2Label) value2Label.textContent = config.value2Label;
            if (value2Unit) value2Unit.textContent = config.unit2;
        } else {
            if (value2Wrapper) value2Wrapper.style.display = 'none';
            const v2 = document.getElementById('vitalValue2');
            if (v2) v2.value = '';
        }
    }

    if (vitalTypeSelect) {
        vitalTypeSelect.addEventListener('change', function () {
            updateFormForType(this.value);
        });
    }

    /* ============================================================
       12. Load from API
    ============================================================ */
    async function loadVitalSigns() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            vitalsList = [];
            render();
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
            vitalsList = arr.map(mapVitalDto);
            console.log('✅ Loaded vital signs:', vitalsList);
            render();
        } catch (err) {
            console.error('❌ فشل تحميل المؤشرات الحيوية:', err);
            vitalsList = [];
            render();
            toast('error', 'فشل التحميل', 'تعذر تحميل المؤشرات الحيوية من الخدمة.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       13. Build payload
    ============================================================ */
    function buildCreatePayload() {
        const patientId = getPatientId();
        const type = document.getElementById('vitalType').value;
        const config = vitalTypesConfig[type];
        const value2Raw = document.getElementById('vitalValue2').value;
        return {
            patientId: patientId,
            vitalType: type,
            measurementDate: toIsoDateTime(document.getElementById('vitalDate').value),
            value1: parseFloat(document.getElementById('vitalValue1').value) || 0,
            value2: (config && config.hasSecondValue && value2Raw) ? parseFloat(value2Raw) : null,
            status: document.getElementById('vitalStatus').value || 'normal',
            notes: document.getElementById('vitalNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('editId').value.trim();
        const type = document.getElementById('vitalType').value;
        const config = vitalTypesConfig[type];
        const value2Raw = document.getElementById('vitalValue2').value;
        return {
            id: editId,
            vitalType: type,
            measurementDate: toIsoDateTime(document.getElementById('vitalDate').value),
            value1: parseFloat(document.getElementById('vitalValue1').value) || 0,
            value2: (config && config.hasSecondValue && value2Raw) ? parseFloat(value2Raw) : null,
            status: document.getElementById('vitalStatus').value || 'normal',
            notes: document.getElementById('vitalNotes').value.trim() || null
        };
    }

    /* ============================================================
       14. API CRUD
    ============================================================ */
    async function createVital(payload) {
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

    async function updateVital(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف القراءة غير صالح: "${id}"`);
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

    async function deleteVitalApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف القراءة غير صالح: "${id}"`);
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
       15. Form Submit
    ============================================================ */
    const vitalForm = document.getElementById('vitalForm');
    if (vitalForm) {
        vitalForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                toast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }
            const editId = document.getElementById('editId').value.trim();
            const isEdit = !!editId;
            if (isEdit && !isValidGuid(editId)) {
                toast('error', 'خطأ', `معرّف القراءة غير صالح: "${editId}"`);
                return;
            }
            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);
            const submitBtn = document.getElementById('submitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';
            try {
                if (isEdit) {
                    await updateVital(editId, payload);
                    toast('success', 'تم التعديل', 'تم تحديث القراءة الحيوية بنجاح.');
                } else {
                    await createVital(payload);
                    toast('success', 'تمت الإضافة', 'تمت إضافة القراءة الحيوية.');
                }
                bnConfetti.fire();
                resetVitalForm();
                await loadVitalSigns();
            } catch (err) {
                console.error('❌ فشل حفظ القراءة:', err);
                toast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ القراءة.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       16. Edit / Delete / Reset
    ============================================================ */
    function editVital(index) {
        const item = vitalsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            toast('error', 'خطأ', 'هذه القراءة لا تحتوي على معرّف (id) صالح — لا يمكن تعديلها.');
            return;
        }
        document.getElementById('editId').value = item.id;
        document.getElementById('editIndex').value = index;
        document.getElementById('vitalType').value = item.type;
        document.getElementById('vitalDate').value = toLocalDateTimeInput(item.date);
        document.getElementById('vitalValue1').value = item.value1;
        document.getElementById('vitalValue2').value = item.value2 || '';
        document.getElementById('vitalStatus').value = item.status || 'normal';
        document.getElementById('vitalNotes').value = item.notes || '';
        updateFormForType(item.type);
        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل القراءة الحيوية';
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('cancelBtn').classList.remove('d-none');
        const card = document.querySelector('.add-vital-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const config = vitalTypesConfig[item.type];
        toast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${config ? config.label : item.type}`);
    }

    function deleteVital(index) {
        const item = vitalsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            toast('error', 'خطأ', 'هذه القراءة لا تحتوي على معرّف (id) صالح — لا يمكن حذفها.');
            return;
        }
        const config = vitalTypesConfig[item.type] || { label: item.type };
        showConfirmModal({
            title: 'تأكيد حذف القراءة',
            subtitle: 'لن تتمكن من استرجاع هذه القراءة',
            message: `هل أنت متأكد من حذف قراءة <strong>${escapeHtml(config.label)}</strong> بتاريخ <strong>${escapeHtml(formatDateTime(item.date))}</strong>؟`,
            confirmText: 'نعم، احذف',
            onConfirm: async () => {
                try {
                    await deleteVitalApi(item.id);
                    toast('success', 'تم الحذف', 'تم حذف القراءة الحيوية.');
                    resetVitalForm();
                    await loadVitalSigns();
                } catch (err) {
                    console.error('❌ فشل حذف القراءة:', err);
                    toast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف القراءة.');
                }
            }
        });
    }

    function resetVitalForm() {
        const form = document.getElementById('vitalForm');
        if (!form) return;
        form.reset();
        document.getElementById('editIndex').value = '-1';
        document.getElementById('editId').value = '';
        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة قراءة حيوية جديدة';
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة القراءة';
        document.getElementById('cancelBtn').classList.add('d-none');
        if (value2Wrapper) value2Wrapper.style.display = 'none';
        if (value1Label) value1Label.textContent = 'القيمة الأولى';
        if (value1Unit) value1Unit.textContent = '--';
        document.querySelectorAll('#vitalForm .is-valid, #vitalForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#vitalForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dtInput = document.getElementById('vitalDate');
        if (dtInput) dtInput.value = now.toISOString().slice(0, 16);
    }

    /* ============================================================
       17. Bind Buttons & Filters
    ============================================================ */
    const cancelBtnEl = document.getElementById('cancelBtn');
    if (cancelBtnEl) cancelBtnEl.addEventListener('click', resetVitalForm);

    const filterTypeEl = document.getElementById('filterType');
    const filterStatusEl = document.getElementById('filterStatus');
    if (filterTypeEl) filterTypeEl.addEventListener('change', render);
    if (filterStatusEl) filterStatusEl.addEventListener('change', render);

    /* ============================================================
       18. Init
    ============================================================ */
    function doInit() {
        console.log('🎯 تهيئة تبويب المؤشرات الحيوية...');
        bnValidation.attachToForm(vitalForm);
        loadVitalSigns();

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dtInput = document.getElementById('vitalDate');
        if (dtInput) dtInput.value = now.toISOString().slice(0, 16);

        setTimeout(() => {
            toast('info', 'المؤشرات الحيوية', 'سجّل ضغط الدم، الوزن، السكر، وغيرها من العلامات الحيوية.', 5000);
        }, 800);

        console.log('%c✅ Vital Signs Ready',
            'background:#10b981;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }

})();