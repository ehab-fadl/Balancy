/* ============================================================
   Side Effects Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initSideEffects() {
    console.log('🚀 SideEffects.js initialized');

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
       2. Utilities — escapeHtml (مبكّر)
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
        if (document.getElementById('bn-se-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-se-toast-styles';
        style.textContent = `
            .bn-se-toast-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 2147483647 !important;
                pointer-events: none;
                padding: 1rem;
                margin: 0 !important;
            }
            .bn-se-toast-overlay.show { display: flex !important; }
            .bn-se-toast {
                min-width: 300px;
                max-width: 92vw;
                padding: 1.1rem 1.4rem;
                border-radius: 16px;
                display: flex;
                align-items: center;
                gap: 0.85rem;
                font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
                font-weight: 800;
                font-size: 0.95rem;
                color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnSeToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                direction: rtl;
                line-height: 1.5;
                position: relative;
            }
            .bn-se-toast.hide { animation: bnSeToastOut 0.3s ease forwards; }
            .bn-se-toast-icon {
                width: 38px;
                height: 38px;
                min-width: 38px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.22);
                font-size: 1.05rem;
            }
            .bn-se-toast-body {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
                text-align: right;
            }
            .bn-se-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-se-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-se-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-se-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-se-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-se-toast.info { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            @keyframes bnSeToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnSeToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.92); }
            }
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

        let overlay = document.getElementById('bnSeToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnSeToastOverlay';
            overlay.className = 'bn-se-toast-overlay';
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
        toast.className = `bn-se-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-se-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-se-toast-body">
                <div class="bn-se-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-se-toast-message">${escapeHtml(message || '')}</div>
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

    /**
     * showToast — يستخدم النظام المدمج مباشرة (مضمون)
     */
    const showToast = showBuiltInToast;

    /* ============================================================
       4. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#ef4444', '#6366f1', '#f59e0b', '#10b981', '#0891b2', '#ec4899', '#8b5cf6'],

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

            setTimeout(() => {
                el.classList.remove('active');
                el.innerHTML = '';
            }, duration);
        }
    };

    /* ============================================================
       5. Focus Trap Utility
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
                modalEl,
                previousActive,
                getFocusable: () => Array.from(modalEl.querySelectorAll(focusableSelector))
                    .filter(el => el.offsetParent !== null),
                handleKeydown: (e) => {
                    if (e.key !== 'Tab') return;
                    const focusables = trap.getFocusable();
                    if (focusables.length === 0) { e.preventDefault(); return; }
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];

                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault(); last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault(); first.focus();
                    }
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
            sideEffectMedicationName: { required: true, minLength: 2, maxLength: 120, messages: { required: 'اسم الدواء مطلوب' } },
            sideEffectSymptom: { required: true, minLength: 2, maxLength: 300, messages: { required: 'الأعراض الجانبية مطلوبة' } }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len,
        },

        validateField(field) {
            const name = field.name || field.id;
            const rule = this.rules[name];

            if (!rule) return { valid: true };

            const value = field.value;

            if (rule.required && !this.validators.required(value)) {
                return { valid: false, type: 'error', message: rule.messages?.required || 'هذا الحقل مطلوب' };
            }

            if (!value || String(value).trim() === '') {
                return { valid: true };
            }

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
            if (label && this.rules[name].required) {
                label.classList.add('required');
            }

            const eventType = (field.tagName === 'SELECT' || field.type === 'date') ? 'change' : 'blur';

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
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       7. Modals (Edit + Confirm)
    ============================================================ */
    function showEditModal({ title, subtitle, label, value, onSave, placeholder }) {
        const modal = document.getElementById('bnEditModal');
        const titleEl = document.getElementById('bnEditModalTitle');
        const subtitleEl = document.getElementById('bnEditModalSubtitle');
        const labelEl = document.getElementById('bnEditModalLabel');
        const inputEl = document.getElementById('bnEditModalInput');

        titleEl.textContent = title || 'تعديل';
        subtitleEl.textContent = subtitle || 'قم بتعديل النص ثم اضغط حفظ';
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
            if (!newValue) {
                inputEl.style.borderColor = '#ef4444';
                setTimeout(() => { inputEl.style.borderColor = ''; }, 1200);
                return;
            }
            cleanup();
            onSave(newValue);
        };

        const onCancelHandler = () => cleanup();
        const onKeyHandler = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSaveHandler(); }
            else if (e.key === 'Escape') { e.preventDefault(); onCancelHandler(); }
        };
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
       8. Side Effects CRUD
    ============================================================ */
    let sideEffectsList = storage.get('sideEffects', []);

    function updateSideEffectsCount() {
        const badge = document.getElementById('sideEffectsCountBadge');
        if (!badge) return;
        const count = sideEffectsList.length;
        badge.textContent = count === 0 ? '0 عرض جانبي' :
            count === 1 ? 'عرض جانبي واحد' :
                count === 2 ? 'عرضان جانبيان' :
                    count <= 10 ? `${count} أعراض جانبية` : `${count} عرض جانبي`;
    }

    function renderSideEffectsTable() {
        const tbody = document.getElementById('sideEffectTableBody');
        const emptyState = document.getElementById('sideEffectEmptyState');
        if (!tbody || !emptyState) return;

        tbody.innerHTML = '';
        if (sideEffectsList.length === 0) {
            emptyState.classList.remove('d-none');
            updateSideEffectsCount();
            return;
        }
        emptyState.classList.add('d-none');

        sideEffectsList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold" data-label="#">${index + 1}</td>
                <td class="fw-bold" data-label="الدواء">${escapeHtml(item.medicationName)}</td>
                <td data-label="الأعراض">${escapeHtml(item.symptom)}</td>
                <td data-label="ملاحظات" style="max-width: 220px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editSideEffectItem(${index})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteSideEffectItem(${index})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updateSideEffectsCount();
    }

    const sideEffectForm = document.getElementById('sideEffectForm');
    if (sideEffectForm) {
        sideEffectForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('sideEffectEditIndex').value, 10);
            const item = {
                medicationName: document.getElementById('sideEffectMedicationName').value.trim(),
                symptom: document.getElementById('sideEffectSymptom').value.trim(),
                notes: document.getElementById('sideEffectNotes').value.trim()
            };

            if (editIndex >= 0) {
                sideEffectsList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تعديل العرض الجانبي.');
            } else {
                sideEffectsList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة العرض الجانبي.');
            }

            storage.set('sideEffects', sideEffectsList);
            renderSideEffectsTable();
            resetSideEffectForm();
            bnConfetti.fire();
        });
    }

    window.editSideEffectItem = function (index) {
        const item = sideEffectsList[index];
        if (!item) return;
        document.getElementById('sideEffectEditIndex').value = index;
        document.getElementById('sideEffectMedicationName').value = item.medicationName;
        document.getElementById('sideEffectSymptom').value = item.symptom;
        document.getElementById('sideEffectNotes').value = item.notes || '';
        document.getElementById('sideEffectFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل العرض الجانبي';
        document.getElementById('sideEffectSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('sideEffectCancelBtn').classList.remove('d-none');
        document.getElementById('sideEffectForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.symptom}`);
    };

    window.deleteSideEffectItem = function (index) {
        if (index < 0 || index >= sideEffectsList.length) return;
        const item = sideEffectsList[index];
        showConfirmModal({
            title: 'تأكيد حذف العرض الجانبي',
            subtitle: 'لن تتمكن من استرجاع العرض الجانبي',
            message: `هل أنت متأكد من حذف العرض <strong>${escapeHtml(item.symptom)}</strong> للدواء <strong>${escapeHtml(item.medicationName)}</strong>؟`,
            confirmText: 'نعم، احذف العرض',
            onConfirm: () => {
                sideEffectsList.splice(index, 1);
                storage.set('sideEffects', sideEffectsList);
                renderSideEffectsTable();
                resetSideEffectForm();
                showToast('success', 'تم الحذف', 'تم حذف العرض الجانبي.');
            }
        });
    };

    window.resetSideEffectForm = function () {
        const form = document.getElementById('sideEffectForm');
        if (!form) return;
        form.reset();
        document.getElementById('sideEffectEditIndex').value = '-1';
        document.getElementById('sideEffectFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة عرض جانبي جديد';
        document.getElementById('sideEffectSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة العرض الجانبي';
        document.getElementById('sideEffectCancelBtn').classList.add('d-none');
        document.querySelectorAll('#sideEffectForm .is-valid, #sideEffectForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#sideEffectForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    /* ============================================================
       9. Init
    ============================================================ */
    function doInit() {
        renderSideEffectsTable();
        bnValidation.attachToForm(document.getElementById('sideEffectForm'));

        setTimeout(() => {
            showToast('info', 'الأعراض الجانبية', 'يمكنك تسجيل ومتابعة الأعراض الجانبية المرتبطة بأدوية المريض هنا.', 5000);
        }, 1000);

        console.log('%c✅ Side Effects Tab Loaded',
            'background:#ef4444;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();