/* ============================================================
   Visits Tab — Standalone Script
============================================================ */

(function initVisits() {
    console.log('🚀 Visits.js initialized');

    /* ============================================================
       1. Storage Layer (fallback)
    ============================================================ */
    const storage = (window.bnApp && window.bnApp.bnStorage) ? window.bnApp.bnStorage : {
        prefix: 'balancy_',
        isAvailable() {
            try {
                const test = '__bn_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) { return false; }
        },
        get(key, defaultValue = null) {
            if (!this.isAvailable()) return defaultValue;
            try {
                const raw = localStorage.getItem(this.prefix + key);
                return raw ? JSON.parse(raw) : defaultValue;
            } catch (e) { return defaultValue; }
        },
        set(key, value) {
            if (!this.isAvailable()) return false;
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
                return true;
            } catch (e) { return false; }
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
        if (document.getElementById('bn-vis-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-vis-toast-styles';
        style.textContent = `
            .bn-vis-toast-overlay { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
            .bn-vis-toast-overlay.show { display: flex !important; }
            .bn-vis-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnVisToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; position: relative; }
            .bn-vis-toast.hide { animation: bnVisToastOut 0.3s ease forwards; }
            .bn-vis-toast-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.22); font-size: 1.05rem; }
            .bn-vis-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-vis-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-vis-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-vis-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-vis-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-vis-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-vis-toast.info { background: linear-gradient(135deg, #1d4ed8, #1e40af); }
            @keyframes bnVisToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnVisToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnVisToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnVisToastOverlay';
            overlay.className = 'bn-vis-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-vis-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-vis-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-vis-toast-body">
                <div class="bn-vis-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-vis-toast-message">${escapeHtml(message || '')}</div>
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
        colors: ['#1d4ed8', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],
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
       5. Focus Trap Utility
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
       6. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            visitReason: { required: true, minLength: 3, maxLength: 200, messages: { required: 'سبب الزيارة مطلوب', minLength: 'سبب الزيارة قصير جداً (3 أحرف على الأقل)' } },
            visitDate: { required: true, messages: { required: 'تاريخ الزيارة مطلوب' } },
            visitType: { required: true, messages: { required: 'يرجى اختيار نوع الزيارة' } },
            visitLocation: { required: true, messages: { required: 'يرجى اختيار مكان الزيارة' } }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len
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
                return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            }
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
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
       7. Modals
    ============================================================ */
    function showEditModal({ title, subtitle, label, value, onSave, placeholder }) {
        const modal = document.getElementById('bnEditModal');
        const titleEl = document.getElementById('bnEditModalTitle');
        const subtitleEl = document.getElementById('bnEditModalSubtitle');
        const labelEl = document.getElementById('bnEditModalLabel');
        const inputEl = document.getElementById('bnEditModalInput');
        titleEl.textContent = title || 'تعديل';
        subtitleEl.textContent = subtitle || '';
        labelEl.textContent = label || 'النص';
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
            const newValue = inputEl.value.trim();
            if (!newValue) { inputEl.style.borderColor = '#ef4444'; setTimeout(() => { inputEl.style.borderColor = ''; }, 1200); return; }
            cleanup();
            onSave(newValue);
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
        const titleEl = document.getElementById('bnConfirmModalTitle');
        const subtitleEl = document.getElementById('bnConfirmModalSubtitle');
        const messageEl = document.getElementById('bnConfirmModalMessage');
        const confirmBtn = document.getElementById('bnConfirmModalConfirm');
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

    /* ============================================================
       8. Badge Helpers
    ============================================================ */
    function getVisitTypeBadge(type) {
        if (!type) return '<span class="visit-type-badge">—</span>';
        const map = {
            'أولى': { cls: 'type-first', icon: 'fa-star' },
            'متابعة': { cls: 'type-followup', icon: 'fa-rotate' },
            'طارئة': { cls: 'type-emergency', icon: 'fa-bolt' },
            'استشارة سريعة': { cls: 'type-consultation', icon: 'fa-comment-medical' }
        };
        const cfg = map[type] || { cls: '', icon: 'fa-tag' };
        return `<span class="visit-type-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(type)}</span>`;
    }

    function getVisitLocationBadge(location) {
        if (!location) return '<span class="visit-location-badge">—</span>';
        const map = {
            'عيادة': { cls: 'loc-clinic', icon: 'fa-hospital' },
            'منزل': { cls: 'loc-home', icon: 'fa-house' },
            'أونلاين': { cls: 'loc-online', icon: 'fa-video' },
            'مستشفى': { cls: 'loc-hospital', icon: 'fa-hospital-user' }
        };
        const cfg = map[location] || { cls: '', icon: 'fa-location-dot' };
        return `<span class="visit-location-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(location)}</span>`;
    }

    /* ============================================================
       9. Visit Management CRUD
    ============================================================ */
    let visitsList = storage.get('visits', []);

    // ترحيل البيانات القديمة (بدون type/location)
    visitsList = visitsList.map(v => {
        if (!v.type) v.type = 'متابعة';
        if (!v.location) v.location = 'عيادة';
        return v;
    });

    function updateVisitsCount() {
        const badge = document.getElementById('visitsCountBadge');
        if (!badge) return;
        const count = visitsList.length;
        badge.textContent = count === 0 ? '0 زيارة' : count === 1 ? 'زيارة واحدة' : count === 2 ? 'زيارتان' : count <= 10 ? `${count} زيارات` : `${count} زيارة`;
    }

    function renderVisitsTable() {
        const tbody = document.getElementById('visitTableBody');
        const emptyState = document.getElementById('visitEmptyState');
        if (!tbody || !emptyState) return;

        tbody.innerHTML = '';
        if (visitsList.length === 0) {
            emptyState.classList.remove('d-none');
            updateVisitsCount();
            return;
        }
        emptyState.classList.add('d-none');

        visitsList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold" data-label="#">${index + 1}</td>
                <td data-label="السبب" style="max-width: 200px; white-space: normal;">${escapeHtml(item.reason)}</td>
                <td data-label="النوع">${getVisitTypeBadge(item.type)}</td>
                <td data-label="المكان">${getVisitLocationBadge(item.location)}</td>
                <td data-label="التاريخ"><span class="visit-date-badge">${escapeHtml(item.visitDate)}</span></td>
                <td data-label="ملاحظات" style="max-width: 180px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editVisitItem(${index})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteVisitItem(${index})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updateVisitsCount();
    }

    const visitForm = document.getElementById('visitForm');
    if (visitForm) {
        visitForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('visitEditIndex').value, 10);
            const item = {
                reason: document.getElementById('visitReason').value.trim(),
                visitDate: document.getElementById('visitDate').value,
                type: document.getElementById('visitType').value,
                location: document.getElementById('visitLocation').value,
                notes: document.getElementById('visitNotes').value.trim()
            };

            if (editIndex >= 0) {
                visitsList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تعديل الزيارة.');
            } else {
                visitsList.push(item);
                showToast('success', 'تم التسجيل', 'تم تسجيل الزيارة.');
            }

            storage.set('visits', visitsList);
            renderVisitsTable();
            resetVisitForm();
            bnConfetti.fire();
        });
    }

    /* ============================================================
       10. Inline Appointment Modal
    ============================================================ */
    function injectAppointmentModal() {
        if (document.getElementById('inlineAppointmentModal')) return;
        const modalHTML = `
            <div class="bn-modal-overlay" id="inlineAppointmentModal" role="dialog" aria-modal="true">
                <div class="bn-modal">
                    <div class="bn-modal-header">
                        <div class="bn-modal-header-icon"><i class="fa-solid fa-calendar-plus"></i></div>
                        <div class="bn-modal-header-text">
                            <h3>حجز موعد الزيارة القادمة</h3>
                            <p id="inlineAptSubtitle">املأ بيانات الموعد ثم احفظ</p>
                        </div>
                    </div>
                    <form id="inlineAppointmentForm" novalidate>
                        <div class="bn-modal-body">
                            <div class="form-group">
                                <label for="inlineAptPatient"><i class="fa-solid fa-user"></i> اسم المريض</label>
                                <input type="text" id="inlineAptPatient" placeholder="اسم المريض" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="inlineAptDate"><i class="fa-solid fa-calendar-days"></i> تاريخ الموعد</label>
                                    <input type="date" id="inlineAptDate" required>
                                </div>
                                <div class="form-group">
                                    <label for="inlineAptTime"><i class="fa-solid fa-clock"></i> ساعة الموعد</label>
                                    <input type="time" id="inlineAptTime" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="inlineAptReason"><i class="fa-solid fa-comment-medical"></i> سبب الزيارة</label>
                                <input type="text" id="inlineAptReason" placeholder="مثال: متابعة دورية" required>
                            </div>
                            <div class="form-group">
                                <label for="inlineAptNotes"><i class="fa-solid fa-note-sticky"></i> ملاحظات (اختياري)</label>
                                <textarea id="inlineAptNotes" rows="3" placeholder="ملاحظات إضافية..."></textarea>
                            </div>
                        </div>
                        <div class="bn-modal-footer">
                            <button type="button" class="bn-btn bn-btn-ghost" id="inlineAptCancel"><i class="fa-solid fa-xmark"></i> إلغاء</button>
                            <button type="submit" class="bn-btn bn-btn-primary" id="inlineAptSave"><i class="fa-solid fa-floppy-disk"></i> حفظ الموعد</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML.trim();
        document.body.appendChild(tempDiv.firstChild);
    }

    function openInlineAppointmentModal() {
        injectAppointmentModal();
        const modal = document.getElementById('inlineAppointmentModal');
        const form = document.getElementById('inlineAppointmentForm');
        const patientInput = document.getElementById('inlineAptPatient');
        const dateInput = document.getElementById('inlineAptDate');
        const timeInput = document.getElementById('inlineAptTime');
        const reasonInput = document.getElementById('inlineAptReason');
        const notesInput = document.getElementById('inlineAptNotes');
        const subtitle = document.getElementById('inlineAptSubtitle');
        if (!modal) return;
        if (form) form.reset();
        const editIndex = parseInt(document.getElementById('visitEditIndex').value, 10);
        const reasonField = document.getElementById('visitReason');
        const dateField = document.getElementById('visitDate');
        const notesField = document.getElementById('visitNotes');
        let patientName = '';
        let visitReason = '';
        let lastVisitDate = '';
        const patientNameEl = document.querySelector('[data-patient-name]');
        if (patientNameEl) patientName = patientNameEl.dataset.patientName || '';
        if (editIndex >= 0 && visitsList[editIndex]) {
            const visit = visitsList[editIndex];
            visitReason = visit.reason || '';
            lastVisitDate = visit.visitDate || '';
            if (notesInput) notesInput.value = visit.notes || '';
        } else {
            if (reasonField) visitReason = reasonField.value.trim();
            if (dateField) lastVisitDate = dateField.value;
            if (notesField && notesInput) notesInput.value = notesField.value.trim();
        }
        if (patientInput) patientInput.value = patientName;
        if (reasonInput) reasonInput.value = visitReason;
        if (dateInput) dateInput.value = lastVisitDate;
        if (dateInput && lastVisitDate) {
            const today = new Date().toISOString().slice(0, 10);
            if (dateInput.value < today) dateInput.value = today;
        }
        if (subtitle) {
            subtitle.textContent = patientName ? `سيتم إضافة الموعد إلى: ${patientName}` : 'املأ بيانات الموعد ثم احفظ';
        }
        modal.classList.add('show');
        setTimeout(() => {
            if (patientInput && !patientInput.value) patientInput.focus();
            else if (dateInput && !dateInput.value) dateInput.focus();
            else if (dateInput) dateInput.focus();
        }, 150);
    }

    function closeInlineAppointmentModal() {
        const modal = document.getElementById('inlineAppointmentModal');
        if (modal) modal.classList.remove('show');
    }

    function saveInlineAppointment(apt) {
        const prefix = 'balancy_';
        let appointments = [];
        try {
            const raw = localStorage.getItem(prefix + 'appointments');
            appointments = raw ? JSON.parse(raw) : [];
        } catch (e) { appointments = []; }
        appointments.push(apt);
        try {
            localStorage.setItem(prefix + 'appointments', JSON.stringify(appointments));
            return true;
        } catch (e) { console.error('فشل حفظ الموعد:', e); return false; }
    }

    function bindInlineAppointmentEvents() {
        injectAppointmentModal();
        const inlineForm = document.getElementById('inlineAppointmentForm');
        const inlineCancel = document.getElementById('inlineAptCancel');
        const inlineModal = document.getElementById('inlineAppointmentModal');
        if (inlineForm) {
            inlineForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const patient = document.getElementById('inlineAptPatient')?.value.trim() || '';
                const date = document.getElementById('inlineAptDate')?.value || '';
                const time = document.getElementById('inlineAptTime')?.value || '';
                const reason = document.getElementById('inlineAptReason')?.value.trim() || '';
                const notes = document.getElementById('inlineAptNotes')?.value.trim() || '';
                if (!patient || !date || !time || !reason) {
                    showToast('error', 'حقول ناقصة', 'يرجى ملء جميع الحقول المطلوبة.');
                    return;
                }
                const today = new Date().toISOString().slice(0, 10);
                if (date < today) {
                    showToast('error', 'تاريخ غير صالح', 'لا يمكن حجز موعد في تاريخ سابق.');
                    return;
                }
                const apt = {
                    id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    patientName: patient, date: date, time: time, reason: reason, notes: notes,
                    source: 'appointments', createdAt: new Date().toISOString()
                };
                if (saveInlineAppointment(apt)) {
                    closeInlineAppointmentModal();
                    showToast('success', 'تم حفظ الموعد', `${patient} — ${date} ${time}`, 4000);
                    bnConfetti.fire();
                    window.dispatchEvent(new CustomEvent('appointmentAdded', { detail: apt }));
                } else {
                    showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ الموعد.');
                }
            });
        }
        if (inlineCancel) inlineCancel.addEventListener('click', closeInlineAppointmentModal);
        if (inlineModal) inlineModal.addEventListener('click', (e) => { if (e.target.id === 'inlineAppointmentModal') closeInlineAppointmentModal(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const m = document.getElementById('inlineAppointmentModal');
                if (m && m.classList.contains('show')) closeInlineAppointmentModal();
            }
        });
    }

    /* ============================================================
       11. Edit / Delete / Reset
    ============================================================ */
    window.editVisitItem = function (index) {
        const item = visitsList[index];
        if (!item) return;
        document.getElementById('visitEditIndex').value = index;
        document.getElementById('visitReason').value = item.reason;
        document.getElementById('visitDate').value = item.visitDate;
        document.getElementById('visitType').value = item.type || '';
        document.getElementById('visitLocation').value = item.location || '';
        document.getElementById('visitNotes').value = item.notes || '';
        document.getElementById('visitFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الزيارة';
        document.getElementById('visitSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('visitCancelBtn').classList.remove('d-none');
        document.getElementById('visitForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل الزيارة: ${item.reason}`);
    };

    window.deleteVisitItem = function (index) {
        if (index < 0 || index >= visitsList.length) return;
        const item = visitsList[index];
        showConfirmModal({
            title: 'تأكيد حذف الزيارة',
            subtitle: 'لن تتمكن من استرجاع هذه الزيارة',
            message: `هل أنت متأكد من حذف الزيارة <strong>${escapeHtml(item.reason)}</strong> بتاريخ <strong>${escapeHtml(item.visitDate)}</strong>؟`,
            confirmText: 'نعم، احذف الزيارة',
            onConfirm: () => {
                visitsList.splice(index, 1);
                storage.set('visits', visitsList);
                renderVisitsTable();
                resetVisitForm();
                showToast('success', 'تم الحذف', 'تم حذف الزيارة.');
            }
        });
    };

    window.resetVisitForm = function () {
        const form = document.getElementById('visitForm');
        if (!form) return;
        form.reset();
        document.getElementById('visitEditIndex').value = '-1';
        document.getElementById('visitFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> تسجيل زيارة جديدة';
        document.getElementById('visitSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> تسجيل الزيارة';
        document.getElementById('visitCancelBtn').classList.add('d-none');
        document.querySelectorAll('#visitForm .is-valid, #visitForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#visitForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    /* ============================================================
       12. Init
    ============================================================ */
    function doInit() {
        renderVisitsTable();
        bnValidation.attachToForm(document.getElementById('visitForm'));

        const bookAppointmentBtn = document.getElementById('bookAppointmentBtn');
        if (bookAppointmentBtn) bookAppointmentBtn.addEventListener('click', openInlineAppointmentModal);

        bindInlineAppointmentEvents();

        setTimeout(() => {
            showToast('info', 'الزيارات', 'يمكنك تسجيل زيارات المريض مع تحديد نوع الزيارة ومكانها والملاحظات.', 5000);
        }, 1000);

        console.log('%c✅ Visits Tab Loaded',
            'background:#1d4ed8;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();