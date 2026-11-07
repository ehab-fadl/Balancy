/* ============================================================
   Family Medical History — API-driven (GET/POST/PUT/DELETE)
   - يطابق DTOs الباك إند (Create/Update/Response)
   - يحافظ على: Toast, Modal, Validation, Confetti, Badges, Stats
   - يحذف: mock + localStorage
============================================================ */

(function initFamilyHistoryTab() {
    'use strict';

    console.log('🚀 FamilyHistory.js initialized');

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
        const form = document.getElementById('relativeForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('relativeForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=FamilyHistory',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateFamilyHistory',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateFamilyHistory',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=FamilyHistory'
        };
    }

    function isValidGuid(value) {
        if (!value) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(value).trim());
    }

    /* ============================================================
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-fh-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-fh-toast-styles';
        style.textContent = `
            .bn-fh-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-fh-toast-overlay.show { display: flex !important; }
            .bn-fh-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnFhToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-fh-toast.hide { animation: bnFhToastOut 0.3s ease forwards; }
            .bn-fh-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-fh-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-fh-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-fh-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-fh-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-fh-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-fh-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-fh-toast.info { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
            @keyframes bnFhToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnFhToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnFhToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnFhToastOverlay';
            overlay.className = 'bn-fh-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-fh-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-fh-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-fh-toast-body">
                <div class="bn-fh-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-fh-toast-message">${escapeHtml(message || '')}</div>
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
        return toast;
    }

    function toast(type, title, message, duration = 3500) {
        return showBuiltInToast(type, title, message, duration);
    }

    window.bnFamilyHistoryToast = toast;

    /* ============================================================
       2. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#0891b2'],
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
            relativeRelation: { required: true, messages: { required: 'صلة القرابة مطلوبة' } },
            relativeConditions: {
                required: true, minLength: 2, maxLength: 500,
                messages: { required: 'الأمراض / الحالات مطلوبة', minLength: 'يجب كتابة حالة واحدة على الأقل' }
            },
            relativeName: {
                required: false, minLength: 2, maxLength: 60,
                pattern: /^[\u0600-\u06FFa-zA-Z\s'.-]*$/,
                messages: { pattern: 'الاسم يحتوي على رموز غير مسموحة' }
            },
            relativeAge: { required: false, numberRange: { min: 0, max: 120 }, messages: { numberRange: 'العمر يجب أن يكون بين 0 و 120' } }
        },
        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len,
            pattern: (value, regex) => !value || regex.test(value),
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
            if (rule.required && !this.validators.required(value))
                return { valid: false, type: 'error', message: rule.messages?.required || 'هذا الحقل مطلوب' };
            if (!value || String(value).trim() === '') return { valid: true };
            if (rule.minLength && !this.validators.minLength(value, rule.minLength))
                return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength))
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
            if (rule.pattern && !this.validators.pattern(value, rule.pattern))
                return { valid: false, type: 'error', message: rule.messages?.pattern || 'صيغة غير صحيحة' };
            if (rule.numberRange && !this.validators.numberRange(value, rule.numberRange))
                return { valid: false, type: 'error', message: rule.messages?.numberRange || `القيمة يجب أن تكون بين ${rule.numberRange.min} و ${rule.numberRange.max}` };
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
            const eventType = (field.tagName === 'SELECT' || field.type === 'date' || field.type === 'number') ? 'change' : 'blur';
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
       6. Helpers
    ============================================================ */
    function getRelationIcon(relation) {
        const icons = {
            'أب': 'fa-mars', 'أم': 'fa-venus',
            'جد': 'fa-person-cane', 'جدة': 'fa-person-cane',
            'أخ': 'fa-mars', 'أخت': 'fa-venus',
            'عم': 'fa-mars', 'عمة': 'fa-venus',
            'خال': 'fa-mars', 'خالة': 'fa-venus'
        };
        return icons[relation] || 'fa-user';
    }

    function getSeverityText(severity) {
        const map = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة', unknown: 'غير معروفة' };
        return map[severity] || 'غير معروفة';
    }

    function getSeverityIcon(severity) {
        const map = { low: 'fa-circle-check', medium: 'fa-triangle-exclamation', high: 'fa-circle-exclamation', unknown: 'fa-circle-question' };
        return map[severity] || 'fa-circle-question';
    }

    function getConditionClass(type) {
        return ['genetic', 'psych', 'chronic', 'other'].includes(type) ? type : 'other';
    }

    /* ============================================================
       7. State
    ============================================================ */
    let relativesList = [];
    let isLoadingList = false;

    /* ============================================================
       8. Extract / mapping
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

    function mapRelativeDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            relation: dto.relation ?? dto.Relation ?? '',
            name: dto.relativeName ?? dto.RelativeName ?? '',
            age: dto.age ?? dto.Age ?? '',
            status: dto.status ?? dto.Status ?? '',
            severity: dto.severity ?? dto.Severity ?? 'unknown',
            conditionType: dto.conditionType ?? dto.ConditionType ?? 'other',
            conditions: dto.conditions ?? dto.Conditions ?? '',
            notes: dto.notes ?? dto.Notes ?? ''
        };
    }

    /* ============================================================
       9. Render
    ============================================================ */
    function updateRelativesCount() {
        const badge = document.getElementById('relativesCountBadge');
        if (!badge) return;
        const count = relativesList.length;
        badge.textContent = count === 0 ? '0 أفراد' :
            count === 1 ? 'فرد واحد' :
                count === 2 ? 'فردان' : `${count} أفراد`;
    }

    function render() {
        const grid = document.getElementById('relativesGrid');
        if (!grid) return;

        updateRelativesCount();

        if (relativesList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-people-roof"></i></div>
                    <h3>لا يوجد أفراد مسجّلون</h3>
                    <p>ابدأ بإضافة أفراد العائلة مع تاريخهم الطبي</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        relativesList.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `relative-card severity-${item.severity || 'unknown'}`;
            card.style.animationDelay = `${index * 0.05}s`;

            const conditions = (item.conditions || '').split(',').map(c => c.trim()).filter(Boolean);
            let conditionsHtml = '';
            conditions.forEach((cond, i) => {
                const cls = getConditionClass(item.conditionType);
                conditionsHtml += `<span class="condition-tag ${cls}" style="animation-delay: ${i * 0.05}s">${escapeHtml(cond)}</span>`;
            });

            card.innerHTML = `
                <div class="relative-header">
                    <div class="relative-avatar">
                        <i class="fa-solid ${getRelationIcon(item.relation)}"></i>
                    </div>
                    <div class="relative-info">
                        <h4 class="relative-name">
                            ${item.name ? escapeHtml(item.name) : escapeHtml(item.relation)}
                            <span class="relation-badge">
                                <i class="fa-solid fa-link"></i>
                                ${escapeHtml(item.relation)}
                            </span>
                        </h4>
                        <div class="relative-meta">
                            ${item.age ? `<span class="relative-meta-item"><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(item.age)} سنة</span>` : ''}
                            ${item.status ? `<span class="relative-meta-item"><i class="fa-solid fa-heart-pulse"></i> ${escapeHtml(item.status)}</span>` : ''}
                        </div>
                    </div>
                    <span class="severity-badge ${item.severity || 'unknown'}">
                        <i class="fa-solid ${getSeverityIcon(item.severity)}"></i>
                        ${getSeverityText(item.severity)}
                    </span>
                </div>
                <div class="conditions-section">
                    <div class="conditions-label">
                        <i class="fa-solid fa-notes-medical"></i>
                        الأمراض / الحالات:
                    </div>
                    <div class="conditions-tags">
                        ${conditionsHtml || '<span class="text-muted" style="font-size: 0.75rem;">لا توجد أمراض مسجّلة</span>'}
                    </div>
                </div>
                ${item.notes ? `<div class="relative-notes"><i class="fa-solid fa-note-sticky ms-1"></i>${escapeHtml(item.notes)}</div>` : ''}
                <div class="relative-actions">
                    <button type="button" class="action-btn edit" data-action="edit" data-index="${index}" title="تعديل">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="action-btn delete" data-action="delete" data-index="${index}" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => editRelative(parseInt(btn.dataset.index, 10)));
        });
        grid.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteRelative(parseInt(btn.dataset.index, 10)));
        });
    }

    /* ============================================================
       10. Load from API
    ============================================================ */
    async function loadFamilyHistory() {
        if (isLoadingList) return;
        isLoadingList = true;

        const patientId = getPatientId();
        if (!patientId) {
            relativesList = [];
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
            relativesList = arr.map(mapRelativeDto);
            console.log('✅ Loaded family history:', relativesList);
            render();
        } catch (err) {
            console.error('❌ فشل تحميل التاريخ العائلي:', err);
            relativesList = [];
            render();
            toast('error', 'فشل التحميل', 'تعذر تحميل التاريخ العائلي من الخدمة.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       11. Build payload
    ============================================================ */
    function buildCreatePayload() {
        const patientId = getPatientId();
        const ageRaw = document.getElementById('relativeAge').value;
        return {
            patientId: patientId,
            relation: document.getElementById('relativeRelation').value,
            relativeName: document.getElementById('relativeName').value.trim() || null,
            age: ageRaw ? parseInt(ageRaw, 10) : null,
            status: document.getElementById('relativeStatus').value || null,
            severity: document.getElementById('relativeSeverity').value || 'unknown',
            conditionType: document.getElementById('relativeConditionType').value || 'other',
            conditions: document.getElementById('relativeConditions').value.trim(),
            notes: document.getElementById('relativeNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('editId').value.trim();
        const ageRaw = document.getElementById('relativeAge').value;
        return {
            id: editId,
            relation: document.getElementById('relativeRelation').value,
            relativeName: document.getElementById('relativeName').value.trim() || null,
            age: ageRaw ? parseInt(ageRaw, 10) : null,
            status: document.getElementById('relativeStatus').value || null,
            severity: document.getElementById('relativeSeverity').value || 'unknown',
            conditionType: document.getElementById('relativeConditionType').value || 'other',
            conditions: document.getElementById('relativeConditions').value.trim(),
            notes: document.getElementById('relativeNotes').value.trim() || null
        };
    }

    /* ============================================================
       12. API CRUD
    ============================================================ */
    async function createRelative(payload) {
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

    async function updateRelative(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف السجل غير صالح: "${id}"`);
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

    async function deleteRelativeApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف السجل غير صالح: "${id}"`);
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
       13. Form Submit
    ============================================================ */
    const relativeForm = document.getElementById('relativeForm');
    if (relativeForm) {
        relativeForm.addEventListener('submit', async function (event) {
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
                toast('error', 'خطأ', `معرّف السجل غير صالح: "${editId}"`);
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
                    await updateRelative(editId, payload);
                    toast('success', 'تم التعديل', 'تم تحديث بيانات الفرد بنجاح.');
                } else {
                    await createRelative(payload);
                    toast('success', 'تمت الإضافة', 'تمت إضافة الفرد إلى التاريخ الطبي العائلي.');
                }
                bnConfetti.fire();
                resetRelativeForm();
                await loadFamilyHistory();
            } catch (err) {
                console.error('❌ فشل حفظ السجل:', err);
                toast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ السجل.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       14. Edit / Delete / Reset
    ============================================================ */
    function editRelative(index) {
        const item = relativesList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            toast('error', 'خطأ', 'هذا السجل لا يحتوي على معرّف (id) صالح — لا يمكن تعديله.');
            return;
        }

        document.getElementById('editId').value = item.id;
        document.getElementById('editIndex').value = index;
        document.getElementById('relativeRelation').value = item.relation || '';
        document.getElementById('relativeName').value = item.name || '';
        document.getElementById('relativeAge').value = item.age || '';
        document.getElementById('relativeStatus').value = item.status || '';
        document.getElementById('relativeSeverity').value = item.severity || 'unknown';
        document.getElementById('relativeConditionType').value = item.conditionType || 'other';
        document.getElementById('relativeConditions').value = item.conditions || '';
        document.getElementById('relativeNotes').value = item.notes || '';

        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الفرد';
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('cancelBtn').classList.remove('d-none');

        const card = document.querySelector('.add-relative-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        toast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.name || item.relation}`);
    }

    function deleteRelative(index) {
        const item = relativesList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            toast('error', 'خطأ', 'هذا السجل لا يحتوي على معرّف (id) صالح — لا يمكن حذفه.');
            return;
        }

        const name = item.name || item.relation;
        showConfirmModal({
            title: 'تأكيد حذف الفرد',
            subtitle: 'لن تتمكن من استرجاع بيانات الفرد',
            message: `هل أنت متأكد من حذف <strong>${escapeHtml(name)}</strong> من التاريخ الطبي العائلي؟`,
            confirmText: 'نعم، احذف',
            onConfirm: async () => {
                try {
                    await deleteRelativeApi(item.id);
                    toast('success', 'تم الحذف', 'تم حذف الفرد من السجل بنجاح.');
                    resetRelativeForm();
                    await loadFamilyHistory();
                } catch (err) {
                    console.error('❌ فشل حذف السجل:', err);
                    toast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف السجل.');
                }
            }
        });
    }

    function resetRelativeForm() {
        const form = document.getElementById('relativeForm');
        if (!form) return;
        form.reset();
        document.getElementById('editIndex').value = '-1';
        document.getElementById('editId').value = '';
        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة فرد من العائلة';
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة الفرد';
        document.getElementById('cancelBtn').classList.add('d-none');
        document.querySelectorAll('#relativeForm .is-valid, #relativeForm .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        document.querySelectorAll('#relativeForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    }

    /* ============================================================
       15. Bind Cancel
    ============================================================ */
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', resetRelativeForm);

    /* ============================================================
       16. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(relativeForm);
        loadFamilyHistory();

        setTimeout(() => {
            toast('info', 'التاريخ الطبي العائلي', 'سجّل الأمراض الوراثية والمزمنة في عائلة المريض.', 5000);
        }, 800);

        console.log('%c✅ Family Medical History Ready',
            'background:#8b5cf6;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }

})();