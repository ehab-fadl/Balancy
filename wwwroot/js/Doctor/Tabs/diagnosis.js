/* ============================================================
   Diagnosis Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initDiagnosis() {
    console.log('🚀 Diagnosis.js initialized');

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
       2. Toast (fallback)
    ============================================================ */
    const showToast = (window.bnApp && window.bnApp.showToast)
        ? window.bnApp.showToast
        : function (type, title, message, duration = 3500) {
            console.log(`[Toast ${type}] ${title}: ${message}`);
        };

    /* ============================================================
       3. Confetti
    ============================================================ */
    const bnConfetti = {
        el: document.getElementById('bnConfetti'),
        colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],

        fire(duration = 2000) {
            if (!this.el) {
                // أنشئه إن لم يكن موجوداً
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
       5. Validation Engine
    ============================================================ */
    const bnValidation = {

        rules: {
            diagnosisType: { required: true, messages: { required: 'يرجى اختيار نوع الاكتئاب' } },
            diagnosisSubtype: { required: true, messages: { required: 'يرجى اختيار النوع الفرعي' } },
            diagnosisDate: { required: true, dateNotFuture: true, messages: { required: 'تاريخ التشخيص مطلوب', dateNotFuture: 'التاريخ لا يمكن أن يكون مستقبلياً' } },
            diagnosisSeverity: { required: true, messages: { required: 'يرجى اختيار شدة التشخيص' } }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            dateNotFuture: (value) => {
                if (!value) return true;
                const input = new Date(value);
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

            if (!value || String(value).trim() === '') {
                return { valid: true };
            }

            if (rule.dateNotFuture && !this.validators.dateNotFuture(value)) {
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ لا يمكن أن يكون في المستقبل' };
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
       6. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

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
       8. Diagnosis CRUD
    ============================================================ */
    let diagnosisList = storage.get('diagnosis', [
        { type: 'اضطراب الاكتئاب الجسيم (MDD)', subtype: 'مع قلق', date: '2023-06-15', severity: 'متوسط', notes: 'تم التشخيص بناءً على المعايير التشخيصية DSM-5.' }
    ]);

    function getDiagnosisSeverityBadge(severity) {
        switch (severity) {
            case 'بسيط': return 'background: #d1fae5; color: #047857;';
            case 'متوسط': return 'background: #fef3c7; color: #b45309;';
            case 'شديد': return 'background: #fee2e2; color: #b91c1c;';
            case 'حرج': return 'background: #7f1d1d; color: #fecaca;';
            default: return 'background: #f1f5f9; color: #475569;';
        }
    }

    function updateDiagnosisCount() {
        const badge = document.getElementById('diagnosisCountBadge');
        if (!badge) return;
        const count = diagnosisList.length;
        badge.textContent = count === 0 ? '0 تشخيص' :
            count === 1 ? 'تشخيص واحد' :
            count === 2 ? 'تشخيصان' :
            count <= 10 ? `${count} تشخيصات` : `${count} تشخيص`;
    }

    function renderDiagnosisTable() {
        const tbody = document.getElementById('diagnosisTableBody');
        const emptyState = document.getElementById('diagnosisEmptyState');
        if (!tbody || !emptyState) return;

        tbody.innerHTML = '';
        if (diagnosisList.length === 0) {
            emptyState.classList.remove('d-none');
            updateDiagnosisCount();
            return;
        }
        emptyState.classList.add('d-none');

        diagnosisList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold" data-label="#">${index + 1}</td>
                <td data-label="النوع"><span class="diagnosis-type-badge">${escapeHtml(item.type)}</span></td>
                <td data-label="النوع الفرعي"><span class="diagnosis-subtype-badge">${escapeHtml(item.subtype)}</span></td>
                <td data-label="التاريخ">${escapeHtml(item.date)}</td>
                <td data-label="الشدة"><span class="diagnosis-subtype-badge" style="${getDiagnosisSeverityBadge(item.severity)}">${escapeHtml(item.severity)}</span></td>
                <td data-label="ملاحظات" style="max-width: 220px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editDiagnosisItem(${index})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteDiagnosisItem(${index})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updateDiagnosisCount();
    }

    const diagnosisForm = document.getElementById('diagnosisForm');
    if (diagnosisForm) {
        diagnosisForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('diagnosisEditIndex').value, 10);
            const item = {
                type: document.getElementById('diagnosisType').value,
                subtype: document.getElementById('diagnosisSubtype').value,
                date: document.getElementById('diagnosisDate').value,
                severity: document.getElementById('diagnosisSeverity').value,
                notes: document.getElementById('diagnosisNotes').value.trim()
            };

            if (editIndex >= 0) {
                diagnosisList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تعديل التشخيص.');
            } else {
                diagnosisList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة التشخيص.');
            }

            storage.set('diagnosis', diagnosisList);
            renderDiagnosisTable();
            resetDiagnosisForm();
            bnConfetti.fire();
        });
    }

    window.editDiagnosisItem = function (index) {
        const item = diagnosisList[index];
        if (!item) return;
        document.getElementById('diagnosisEditIndex').value = index;
        document.getElementById('diagnosisType').value = item.type;
        document.getElementById('diagnosisSubtype').value = item.subtype;
        document.getElementById('diagnosisDate').value = item.date;
        document.getElementById('diagnosisSeverity').value = item.severity;
        document.getElementById('diagnosisNotes').value = item.notes || '';
        document.getElementById('diagnosisFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل التشخيص';
        document.getElementById('diagnosisSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('diagnosisCancelBtn').classList.remove('d-none');
        document.getElementById('diagnosisForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.deleteDiagnosisItem = function (index) {
        if (index < 0 || index >= diagnosisList.length) return;
        const item = diagnosisList[index];
        showConfirmModal({
            title: 'تأكيد حذف التشخيص',
            subtitle: 'لن تتمكن من استرجاع التشخيص بعد الحذف',
            message: `هل أنت متأكد من حذف التشخيص <strong>${escapeHtml(item.type)}</strong>؟`,
            confirmText: 'نعم، احذف التشخيص',
            onConfirm: () => {
                diagnosisList.splice(index, 1);
                storage.set('diagnosis', diagnosisList);
                renderDiagnosisTable();
                resetDiagnosisForm();
                showToast('success', 'تم الحذف', 'تم حذف التشخيص.');
            }
        });
    };

    window.resetDiagnosisForm = function () {
        const form = document.getElementById('diagnosisForm');
        if (!form) return;
        form.reset();
        document.getElementById('diagnosisEditIndex').value = '-1';
        document.getElementById('diagnosisFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة تشخيص جديد';
        document.getElementById('diagnosisSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة التشخيص';
        document.getElementById('diagnosisCancelBtn').classList.add('d-none');
        document.querySelectorAll('#diagnosisForm .is-valid, #diagnosisForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#diagnosisForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    /* ============================================================
       9. Init
    ============================================================ */
    function doInit() {
        renderDiagnosisTable();
        bnValidation.attachToForm(document.getElementById('diagnosisForm'));

        setTimeout(() => {
            showToast('info', 'التشخيص', 'يمكنك إضافة وتعديل وحذف التشخيصات التفصيلية للمريض هنا.', 5000);
        }, 1000);

        console.log('%c✅ Diagnosis Page Ready',
            'background:#ef4444;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();