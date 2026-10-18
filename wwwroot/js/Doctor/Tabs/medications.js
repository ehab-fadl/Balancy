/* ============================================================
   Prescribed Medications Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initMedications() {
    console.log('🚀 Medications.js initialized');

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
       2. Toast — يدعم bnApp أو يعرض Toast مدمج على الشاشة
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-med-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-med-toast-styles';
        style.textContent = `
            .bn-med-toast-overlay {
                position: fixed;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                pointer-events: none;
                padding: 1rem;
            }
            .bn-med-toast-overlay.show { display: flex; }
            .bn-med-toast {
                min-width: 300px;
                max-width: 92vw;
                padding: 1.1rem 1.4rem;
                border-radius: 16px;
                display: flex;
                align-items: center;
                gap: 0.85rem;
                font-family: 'Tajawal', sans-serif;
                font-weight: 800;
                font-size: 0.95rem;
                color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnMedToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                direction: rtl;
                line-height: 1.5;
            }
            .bn-med-toast.hide { animation: bnMedToastOut 0.3s ease forwards; }
            .bn-med-toast-icon {
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
            .bn-med-toast-body {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
                text-align: right;
            }
            .bn-med-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-med-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-med-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-med-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-med-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-med-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnMedToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnMedToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.92); }
            }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        let overlay = document.getElementById('bnMedToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnMedToastOverlay';
            overlay.className = 'bn-med-toast-overlay';
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
        toast.className = `bn-med-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-med-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-med-toast-body">
                <div class="bn-med-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-med-toast-message">${escapeHtml(message || '')}</div>
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

    const showToast = (window.bnApp && typeof window.bnApp.showToast === 'function')
        ? window.bnApp.showToast
        : showBuiltInToast;

    /* ============================================================
       3. Confetti
    ============================================================ */
    const bnConfetti = {
        el: document.getElementById('bnConfetti'),
        colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],
        fire(duration = 2000) {
            if (!this.el) {
                const confettiEl = document.createElement('div');
                confettiEl.className = 'bn-confetti';
                confettiEl.id = 'bnConfetti';
                document.body.appendChild(confettiEl);
                this.el = confettiEl;
            }
            this.el.innerHTML = '';
            this.el.classList.add('active');
            const pieceCount = 60;
            for (let i = 0; i < pieceCount; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = Math.random() * 100 + '%';
                piece.style.animationDelay = Math.random() * 0.5 + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
                piece.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
                this.el.appendChild(piece);
            }
            setTimeout(() => {
                this.el.classList.remove('active');
                this.el.innerHTML = '';
            }, duration);
        }
    };

    /* ============================================================
       4. Focus Trap Utility
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
       5. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            medicationName: { required: true, minLength: 2, maxLength: 120, messages: { required: 'اسم الدواء مطلوب' } },
            medicationDose: { required: true, minLength: 1, maxLength: 80, messages: { required: 'الجرعة مطلوبة' } },
            medicationFrequency: { required: true, messages: { required: 'يرجى اختيار التكرار' } },
            medicationIntakePeriod: { required: true, messages: { required: 'يرجى اختيار فترة التناول' } },
            medicationRoute: { required: true, messages: { required: 'يرجى اختيار طريقة الإعطاء' } },
            medicationStartDate: { required: true, messages: { required: 'تاريخ البدء مطلوب' } },
            medicationStatus: { required: true, messages: { required: 'يرجى اختيار الحالة' } }
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
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       6. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    function formatDateArabic(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

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
       8. Prescribed Medications CRUD
    ============================================================ */
    let medicationsList = storage.get('medications', [
        {
            name: 'سيرترالين',
            dose: '50 مغ',
            frequency: 'مرة واحدة يومياً',
            intakePeriod: 'صباحاً',
            route: 'فموي (أقراص)',
            startDate: '2023-06-20',
            endDate: '2024-06-20',
            status: 'نشط',
            notes: 'يتم تناوله صباحاً مع الطعام.'
        }
    ]);

    function getMedicationStatusBadge(status) {
        switch (status) {
            case 'نشط': return 'med-status-active';
            case 'متوقف': return 'med-status-stopped';
            case 'مكتمل': return 'med-status-completed';
            case 'معلق مؤقتاً': return 'med-status-onhold';
            default: return 'med-status-completed';
        }
    }

    function updateMedicationsCount() {
        const badge = document.getElementById('medicationsCountBadge');
        if (!badge) return;
        const count = medicationsList.length;
        badge.textContent = count === 0 ? '0 دواء' :
            count === 1 ? 'دواء واحد' :
            count === 2 ? 'دواءان' :
            count <= 10 ? `${count} أدوية` : `${count} دواء`;
    }

    function renderMedicationsTable() {
        const tbody = document.getElementById('medicationTableBody');
        const emptyState = document.getElementById('medicationEmptyState');
        if (!tbody || !emptyState) return;
        tbody.innerHTML = '';
        if (medicationsList.length === 0) {
            emptyState.classList.remove('d-none');
            updateMedicationsCount();
            return;
        }
        emptyState.classList.add('d-none');
        medicationsList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold" data-label="#">${index + 1}</td>
                <td class="fw-bold" data-label="الدواء">${escapeHtml(item.name)}</td>
                <td data-label="الجرعة">${escapeHtml(item.dose)}</td>
                <td data-label="التكرار">${escapeHtml(item.frequency)}</td>
                <td data-label="فترة التناول">${escapeHtml(item.intakePeriod || '-')}</td>
                <td data-label="طريقة الإعطاء">${escapeHtml(item.route)}</td>
                <td data-label="البدء">${escapeHtml(item.startDate)}</td>
                <td data-label="الانتهاء">${item.endDate ? escapeHtml(item.endDate) : '-'}</td>
                <td data-label="الحالة"><span class="med-status-badge ${getMedicationStatusBadge(item.status)}">${escapeHtml(item.status)}</span></td>
                <td data-label="ملاحظات" style="max-width: 200px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editMedicationItem(${index})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteMedicationItem(${index})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        updateMedicationsCount();
    }

    const medicationForm = document.getElementById('medicationForm');
    if (medicationForm) {
        medicationForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }
            const editIndex = parseInt(document.getElementById('medicationEditIndex').value, 10);
            const item = {
                name: document.getElementById('medicationName').value.trim(),
                dose: document.getElementById('medicationDose').value.trim(),
                frequency: document.getElementById('medicationFrequency').value,
                intakePeriod: document.getElementById('medicationIntakePeriod').value,
                route: document.getElementById('medicationRoute').value,
                startDate: document.getElementById('medicationStartDate').value,
                endDate: document.getElementById('medicationEndDate').value,
                status: document.getElementById('medicationStatus').value,
                notes: document.getElementById('medicationNotes').value.trim()
            };
            if (editIndex >= 0) {
                medicationsList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تعديل الدواء.');
            } else {
                medicationsList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة الدواء.');
            }
            storage.set('medications', medicationsList);
            renderMedicationsTable();
            resetMedicationForm();
            bnConfetti.fire();
        });
    }

    window.editMedicationItem = function (index) {
        const item = medicationsList[index];
        if (!item) return;
        document.getElementById('medicationEditIndex').value = index;
        document.getElementById('medicationName').value = item.name;
        document.getElementById('medicationDose').value = item.dose;
        document.getElementById('medicationFrequency').value = item.frequency;
        document.getElementById('medicationIntakePeriod').value = item.intakePeriod || '';
        document.getElementById('medicationRoute').value = item.route;
        document.getElementById('medicationStartDate').value = item.startDate;
        document.getElementById('medicationEndDate').value = item.endDate || '';
        document.getElementById('medicationStatus').value = item.status;
        document.getElementById('medicationNotes').value = item.notes || '';
        document.getElementById('medicationFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الدواء';
        document.getElementById('medicationSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('medicationCancelBtn').classList.remove('d-none');
        document.getElementById('medicationForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.deleteMedicationItem = function (index) {
        if (index < 0 || index >= medicationsList.length) return;
        const item = medicationsList[index];
        showConfirmModal({
            title: 'تأكيد حذف الدواء',
            subtitle: 'لن تتمكن من استرجاع الدواء بعد الحذف',
            message: `هل أنت متأكد من حذف الدواء <strong>${escapeHtml(item.name)}</strong>؟`,
            confirmText: 'نعم، احذف الدواء',
            onConfirm: () => {
                medicationsList.splice(index, 1);
                storage.set('medications', medicationsList);
                renderMedicationsTable();
                resetMedicationForm();
                showToast('success', 'تم الحذف', 'تم حذف الدواء.');
            }
        });
    };

    window.resetMedicationForm = function () {
        const form = document.getElementById('medicationForm');
        if (!form) return;
        form.reset();
        document.getElementById('medicationEditIndex').value = '-1';
        document.getElementById('medicationFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة دواء موصوف جديد';
        document.getElementById('medicationSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة الدواء';
        document.getElementById('medicationCancelBtn').classList.add('d-none');
        document.querySelectorAll('#medicationForm .is-valid, #medicationForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#medicationForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    /* ============================================================
       9. PDF — نسخة مُعاد كتابتها بالكامل (jsPDF + canvas مباشر)
       ✅ لا نستخدم iframe ولا html2canvas للعنصر (تفادي مشاكل الخط العربي)
       ✅ نرسم كل شيء على canvas بدقة عالية ثم نحوله إلى PDF
       ✅ نضمن أن الخط العربي محمّل عبر document.fonts
    ============================================================ */

    function getPatientInfo() {
        let patient = null;
        try {
            if (window.bnApp && typeof window.bnApp.getPatientInfo === 'function') {
                patient = window.bnApp.getPatientInfo();
            }
        } catch (e) { }
        if (!patient) patient = storage.get('currentPatient', null);
        if (!patient) patient = { name: 'مريض تجريبي', age: '—', fileNumber: '—' };
        return {
            name: patient.name || patient.fullName || 'غير محدد',
            age: patient.age || patient.patientAge || '—',
            fileNumber: patient.fileNumber || patient.id || '—'
        };
    }

    /**
     * يرسم التقرير بالكامل على <canvas> بدقة عالية ثم يحوّله إلى PDF.
     * هذه الطريقة تضمن أن الخط العربي يُرسم بشكل صحيح لأننا نستخدم
     * canvas API مباشرة مع document.fonts.ready.
     */
    async function renderPlanToCanvas(activeMeds, patient) {
        // انتظر تحميل الخطوط
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) { }
        }
        // انتظار إضافي بسيط
        await new Promise(r => setTimeout(r, 250));

        // دقة عالية (A4 عند 200 DPI تقريباً)
        const A4_W = 794;   // px @ 96dpi
        const A4_H = 1123;
        const SCALE = 2.5;  // 2.5x → ~240 DPI
        const W = A4_W;
        const H = A4_H;

        const canvas = document.createElement('canvas');
        canvas.width = W * SCALE;
        canvas.height = H * SCALE;
        const ctx = canvas.getContext('2d');
        ctx.scale(SCALE, SCALE);
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // ===== خلفية =====
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ===== دالة رسم نص عربي =====
        function drawText(text, x, y, opts = {}) {
            const {
                font = '600 11px Tajawal, "Segoe UI", Tahoma, sans-serif',
                color = '#1e293b',
                align = 'right',
                maxWidth = null,
                wrapWidth = null,
                lineHeight = 16
            } = opts;

            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = align;
            ctx.direction = 'rtl';

            if (wrapWidth) {
                // لف النص على عدة أسطر
                const words = String(text).split(' ');
                const lines = [];
                let current = '';
                for (const w of words) {
                    const test = current ? current + ' ' + w : w;
                    if (ctx.measureText(test).width > wrapWidth && current) {
                        lines.push(current);
                        current = w;
                    } else {
                        current = test;
                    }
                }
                if (current) lines.push(current);
                lines.forEach((line, i) => {
                    ctx.fillText(line, x, y + i * lineHeight, maxWidth || undefined);
                });
                return lines.length * lineHeight;
            }

            ctx.fillText(String(text), x, y, maxWidth || undefined);
            return lineHeight;
        }

        // ===== دالة رسم مستطيل مستدير =====
        function roundRect(x, y, w, h, r, fill, stroke) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            if (fill) { ctx.fillStyle = fill; ctx.fill(); }
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
        }

        // ===== الهيدر =====
        const HEADER_H = 90;
        // شريط علوي ملون
        const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
        grad.addColorStop(0, '#0891b2');
        grad.addColorStop(1, '#0e7490');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, HEADER_H);

        // شعار دائري
        ctx.save();
        ctx.beginPath();
        ctx.arc(60, HEADER_H / 2, 26, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();
        // علامة +
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.direction = 'ltr';
        ctx.fillText('+', 60, HEADER_H / 2 + 1);
        ctx.restore();

        // اسم العيادة (بالإنجليزية يسار)
        ctx.save();
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Tajawal, "Segoe UI", sans-serif';
        ctx.fillText('Balancy Clinic', 100, 32);
        ctx.font = '600 11px Tajawal, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Medical Prescription Plan', 100, 52);
        ctx.restore();

        // عنوان عربي (يمين)
        ctx.save();
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Tajawal, "Segoe UI", sans-serif';
        ctx.fillText('الخطة الدوائية للمريض', W - 30, 32);
        ctx.font = '600 11px Tajawal, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        ctx.fillText(todayStr, W - 30, 52);
        ctx.restore();

        // ===== بطاقة المريض =====
        let y = HEADER_H + 22;
        const PAD = 24;
        const CARD_W = W - PAD * 2;
        roundRect(PAD, y, CARD_W, 70, 12, '#f0fdfa', '#a7f3d0');

        // 3 أعمدة
        const colW = CARD_W / 3;
        const labels = ['اسم المريض', 'العمر', 'عنوان الخطة'];
        const values = [patient.name, String(patient.age), 'خطة الأدوية النشطة'];

        labels.forEach((label, i) => {
            const colX = PAD + CARD_W - (i + 1) * colW;
            // فاصل
            if (i > 0) {
                ctx.beginPath();
                ctx.moveTo(colX + colW, y + 12);
                ctx.lineTo(colX + colW, y + 58);
                ctx.strokeStyle = '#a7f3d0';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            drawText(label, colX + colW - 14, y + 22, {
                font: '800 9px Tajawal, sans-serif',
                color: '#047857',
                align: 'right'
            });
            drawText(values[i], colX + colW - 14, y + 45, {
                font: '900 13px Tajawal, sans-serif',
                color: '#064e3b',
                align: 'right',
                maxWidth: colW - 24
            });
        });

        // ===== مقدمة =====
        y += 88;
        roundRect(PAD, y, CARD_W, 44, 8, '#f8fafc', '#e2e8f0');
        // شريط جانبي
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(W - PAD, y + 8, 3, 28);
        drawText(
            'عزيزي المريض، فيما يلي خطتك الدوائية الحالية للأدوية النشطة فقط. يُرجى الالتزام بالجرعات والأوقات الموضحة.',
            W - PAD - 14, y + 22,
            { font: '600 10.5px Tajawal, sans-serif', color: '#475569', align: 'right', wrapWidth: CARD_W - 28, lineHeight: 15 }
        );

        // ===== الجدول =====
        y += 60;
        const tableX = PAD;
        const tableW = CARD_W;
        const rowH = 30;
        const headerH = 30;

        // أعمدة الجدول (من اليمين إلى اليسار لأن الاتجاه RTL)
        const cols = [
            { key: 'num', label: '#', w: 30, align: 'center' },
            { key: 'name', label: 'اسم الدواء', w: 130, align: 'right' },
            { key: 'dose', label: 'الجرعة', w: 75, align: 'right' },
            { key: 'frequency', label: 'التكرار', w: 110, align: 'right' },
            { key: 'period', label: 'وقت التناول', w: 90, align: 'right' },
            { key: 'startDate', label: 'تاريخ البدء', w: 90, align: 'right' },
            { key: 'endDate', label: 'تاريخ الانتهاء', w: 90, align: 'right' },
            { key: 'notes', label: 'ملاحظات', w: 0, align: 'right' }
        ];

        // احسب عرض عمود الملاحظات = المتبقي
        const fixedW = cols.reduce((s, c) => s + (c.w || 0), 0);
        cols[cols.length - 1].w = tableW - fixedW;

        // رأس الجدول
        const gradTable = ctx.createLinearGradient(tableX, y, tableX + tableW, y);
        gradTable.addColorStop(0, '#0891b2');
        gradTable.addColorStop(1, '#0e7490');
        ctx.fillStyle = gradTable;
        ctx.fillRect(tableX, y, tableW, headerH);

        // نص الرأس
        let colX = tableX + tableW; // نبدأ من اليمين
        cols.forEach((col) => {
            colX -= col.w;
            drawText(col.label, colX + col.w - 8, y + headerH / 2, {
                font: '900 10px Tajawal, sans-serif',
                color: '#ffffff',
                align: col.align === 'center' ? 'center' : 'right'
            });
            if (col.align === 'center') {
                // إعادة الرسم في المنتصف
                const cx = colX + col.w / 2;
                drawText(col.label, cx, y + headerH / 2, {
                    font: '900 10px Tajawal, sans-serif',
                    color: '#ffffff',
                    align: 'center'
                });
            }
        });

        // صفوف البيانات
        let rowY = y + headerH;
        activeMeds.forEach((med, i) => {
            // خلفية متناوبة
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(tableX, rowY, tableW, rowH);
            // خطوط أفقية
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tableX, rowY + rowH);
            ctx.lineTo(tableX + tableW, rowY + rowH);
            ctx.stroke();

            // بيانات الصف
            const rowValues = {
                num: String(i + 1),
                name: med.name || '—',
                dose: med.dose || '—',
                frequency: med.frequency || '—',
                period: med.intakePeriod || '—',
                startDate: formatDateArabic(med.startDate),
                endDate: med.endDate ? formatDateArabic(med.endDate) : 'مستمر',
                notes: med.notes || '—'
            };

            let cX = tableX + tableW;
            cols.forEach((col) => {
                cX -= col.w;
                const text = rowValues[col.key];
                if (col.align === 'center') {
                    const cx = cX + col.w / 2;
                    drawText(text, cx, rowY + rowH / 2, {
                        font: col.key === 'num' ? '800 10px Tajawal, sans-serif' : '700 10px Tajawal, sans-serif',
                        color: col.key === 'num' ? '#64748b' : (col.key === 'name' ? '#0e7490' : (col.key === 'period' ? '#b45309' : '#1e293b')),
                        align: 'center'
                    });
                } else {
                    drawText(text, cX + col.w - 8, rowY + rowH / 2, {
                        font: col.key === 'name' ? '900 10.5px Tajawal, sans-serif' : '600 10px Tajawal, sans-serif',
                        color: col.key === 'name' ? '#0e7490' : (col.key === 'period' ? '#b45309' : '#1e293b'),
                        align: 'right',
                        maxWidth: col.w - 14
                    });
                }
            });

            rowY += rowH;
        });

        // إطار الجدول
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tableX, y, tableW, headerH + activeMeds.length * rowH);

        // خطوط رأسية
        let lineX = tableX + tableW;
        cols.forEach((col, idx) => {
            lineX -= col.w;
            if (idx < cols.length - 1) {
                ctx.beginPath();
                ctx.moveTo(lineX, y);
                ctx.lineTo(lineX, y + headerH + activeMeds.length * rowH);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        });

        // ===== تعليمات هامة =====
        y = rowY + 20;
        const notesH = 90;
        roundRect(PAD, y, CARD_W, notesH, 10, '#fffbeb', '#fde68a');

        // عنوان
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(W - PAD - 14, y + 20, 4, 0, Math.PI * 2);
        ctx.fill();
        drawText('تعليمات هامة', W - PAD - 24, y + 20, {
            font: '900 12px Tajawal, sans-serif',
            color: '#b45309',
            align: 'right'
        });

        const tips = [
            'التزم بمواعيد الجرعات الموضحة أعلاه بدقة.',
            'لا توقف أي دواء دون استشارة الطبيب المختص.',
            'احفظ الأدوية في مكان جاف بعيداً عن متناول الأطفال.',
            'في حال ظهور أي أعراض جانبية، تواصل مع العيادة فوراً.'
        ];
        tips.forEach((tip, i) => {
            const ty = y + 42 + i * 13;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(W - PAD - 14, ty, 2, 0, Math.PI * 2);
            ctx.fill();
            drawText(tip, W - PAD - 24, ty, {
                font: '700 10px Tajawal, sans-serif',
                color: '#78350f',
                align: 'right',
                maxWidth: CARD_W - 40
            });
        });

        // ===== التوقيعات =====
        y += notesH + 30;
        const sigW = 160;
        // الطبيب (يمين)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(W - PAD - 20, y + 30);
        ctx.lineTo(W - PAD - 20 - sigW, y + 30);
        ctx.stroke();
        ctx.setLineDash([]);
        drawText('توقيع الطبيب', W - PAD - 20 - sigW / 2, y + 48, {
            font: '800 10px Tajawal, sans-serif',
            color: '#64748b',
            align: 'center'
        });

        // الختم (يسار)
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PAD + 20 + sigW, y + 30);
        ctx.lineTo(PAD + 20, y + 30);
        ctx.stroke();
        ctx.setLineDash([]);
        drawText('ختم العيادة', PAD + 20 + sigW / 2, y + 48, {
            font: '800 10px Tajawal, sans-serif',
            color: '#64748b',
            align: 'center'
        });

        // ===== الفوتر =====
        const footerY = H - 30;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, footerY - 12);
        ctx.lineTo(W - PAD, footerY - 12);
        ctx.stroke();

        ctx.save();
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 9px Tajawal, sans-serif';
        ctx.fillText('Balancy Clinic — Prescription Plan', PAD, footerY);
        ctx.restore();

        ctx.save();
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 9px Tajawal, sans-serif';
        ctx.fillText(todayStr, W - PAD, footerY);
        ctx.restore();

        return canvas;
    }

    async function generateMedicationPlanPDF() {
        const btn = document.getElementById('printPlanBtn');
        if (!btn) return;
        const originalHTML = btn.innerHTML;

        const activeMeds = medicationsList.filter(m => m.status === 'نشط');

        if (activeMeds.length === 0) {
            showToast('error', 'لا توجد أدوية نشطة', 'لا يمكن توليد الخطة الدوائية — أضف دواءً بحالة «نشط» أولاً.', 3500);
            return;
        }

        // تحقق من jsPDF
        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            showToast('error', 'خطأ', 'مكتبة jsPDF لم تُحمّل بعد. تحقق من اتصال الإنترنت.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner"></i> جاري التوليد...';

        try {
            const patient = getPatientInfo();
            const canvas = await renderPlanToCanvas(activeMeds, patient);

            // تحويل canvas إلى PDF
            const jsPDFCtor = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
            const pdf = new jsPDFCtor({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');

            const safeName = (patient.name || 'Patient').replace(/[\\/:*?"<>|]/g, '_').trim();
            const fileName = `الخطة_الدوائية_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(fileName);

            showToast('success', 'تم توليد الخطة', `تم توليد خطة دوائية تحتوي على ${activeMeds.length} دواء نشط.`);
            bnConfetti.fire(1500);
        } catch (err) {
            console.error('PDF generation error:', err);
            showToast('error', 'فشل التوليد', 'حدث خطأ أثناء توليد الملف. حاول مرة أخرى.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    const printBtn = document.getElementById('printPlanBtn');
    if (printBtn) {
        printBtn.addEventListener('click', generateMedicationPlanPDF);
    }

    /* ============================================================
       10. Init
    ============================================================ */
    function doInit() {
        renderMedicationsTable();
        bnValidation.attachToForm(document.getElementById('medicationForm'));
        setTimeout(() => {
            showToast('info', 'الأدوية الموصوفة', 'يمكنك إضافة وتعديل وحذف الأدوية الموصوفة للمريض هنا.', 5000);
        }, 1000);
        console.log('%c✅ Prescribed Medications Tab Loaded',
            'background:#10b981;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();