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
        colors: ['#1d4ed8', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],

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
       5. Validation Engine — مبسّطة
    ============================================================ */
    const bnValidation = {

        rules: {
            visitReason: { required: true, minLength: 3, maxLength: 200, messages: { required: 'سبب الزيارة مطلوب' } },
            visitDate: { required: true, messages: { required: 'تاريخ الزيارة مطلوب' } }
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
       8. Visit Management CRUD — مبسّط
    ============================================================ */
    let visitsList = storage.get('visits', []);

    function updateVisitsCount() {
        const badge = document.getElementById('visitsCountBadge');
        if (!badge) return;
        const count = visitsList.length;
        badge.textContent = count === 0 ? '0 زيارة' :
            count === 1 ? 'زيارة واحدة' :
            count === 2 ? 'زيارتان' :
            count <= 10 ? `${count} زيارات` : `${count} زيارة`;
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
                <td data-label="السبب" style="max-width: 220px; white-space: normal;">${escapeHtml(item.reason)}</td>
                <td data-label="تاريخ الزيارة"><span class="visit-date-badge">${escapeHtml(item.visitDate)}</span></td>
                <td data-label="ملاحظات" style="max-width: 220px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '-'}</td>
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
       8.5 Inline Appointment Booking — Modal داخل الزيارة
    ============================================================ */

    // ✅ حقن Modal الحجز في DOM
    function injectAppointmentModal() {
        if (document.getElementById('inlineAppointmentModal')) return;

        const modalHTML = `
            <div class="bn-modal-overlay" id="inlineAppointmentModal" role="dialog" aria-modal="true">
                <div class="bn-modal">
                    <div class="bn-modal-header">
                        <div class="bn-modal-header-icon">
                            <i class="fa-solid fa-calendar-plus"></i>
                        </div>
                        <div class="bn-modal-header-text">
                            <h3>حجز موعد الزيارة القادمة</h3>
                            <p id="inlineAptSubtitle">املأ بيانات الموعد ثم احفظ</p>
                        </div>
                    </div>
                    <form id="inlineAppointmentForm" novalidate>
                        <div class="bn-modal-body">

                            <div class="form-group">
                                <label for="inlineAptPatient">
                                    <i class="fa-solid fa-user"></i>
                                    اسم المريض
                                </label>
                                <input type="text" id="inlineAptPatient" placeholder="اسم المريض" required>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="inlineAptDate">
                                        <i class="fa-solid fa-calendar-days"></i>
                                        تاريخ الموعد
                                    </label>
                                    <input type="date" id="inlineAptDate" required>
                                </div>
                                <div class="form-group">
                                    <label for="inlineAptTime">
                                        <i class="fa-solid fa-clock"></i>
                                        ساعة الموعد
                                    </label>
                                    <input type="time" id="inlineAptTime" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="inlineAptReason">
                                    <i class="fa-solid fa-comment-medical"></i>
                                    سبب الزيارة
                                </label>
                                <input type="text" id="inlineAptReason" placeholder="مثال: متابعة دورية" required>
                            </div>

                            <div class="form-group">
                                <label for="inlineAptNotes">
                                    <i class="fa-solid fa-note-sticky"></i>
                                    ملاحظات (اختياري)
                                </label>
                                <textarea id="inlineAptNotes" rows="3" placeholder="ملاحظات إضافية..."></textarea>
                            </div>

                        </div>
                        <div class="bn-modal-footer">
                            <button type="button" class="bn-btn bn-btn-ghost" id="inlineAptCancel">
                                <i class="fa-solid fa-xmark"></i> إلغاء
                            </button>
                            <button type="submit" class="bn-btn bn-btn-primary" id="inlineAptSave">
                                <i class="fa-solid fa-floppy-disk"></i> حفظ الموعد
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML.trim();
        document.body.appendChild(tempDiv.firstChild);
    }

    // ✅ فتح المودال مع تعبئة تلقائية
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

        // ✅ إعادة تعيين
        if (form) form.reset();

        // ✅ تعبئة تلقائية من سياق الزيارة
        const editIndex = parseInt(document.getElementById('visitEditIndex').value, 10);
        const reasonField = document.getElementById('visitReason');
        const dateField = document.getElementById('visitDate');
        const notesField = document.getElementById('visitNotes');

        let patientName = '';
        let visitReason = '';
        let lastVisitDate = '';

        // محاولة استخراج اسم المريض من الصفحة الأم
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

        // ✅ تعبئة الحقول
        if (patientInput) patientInput.value = patientName;
        if (reasonInput) reasonInput.value = visitReason;
        if (dateInput) dateInput.value = lastVisitDate;

        // ✅ تحقق من صحة التاريخ
        if (dateInput && lastVisitDate) {
            const today = new Date().toISOString().slice(0, 10);
            if (dateInput.value < today) dateInput.value = today;
        }

        // ✅ Subtitle ذكي
        if (subtitle) {
            subtitle.textContent = patientName
                ? `سيتم إضافة الموعد إلى: ${patientName}`
                : 'املأ بيانات الموعد ثم احفظ';
        }

        // ✅ إظهار المودال
        modal.classList.add('show');

        // ✅ Focus على أول حقل فارغ
        setTimeout(() => {
            if (patientInput && !patientInput.value) patientInput.focus();
            else if (dateInput && !dateInput.value) dateInput.focus();
            else if (dateInput) dateInput.focus();
        }, 150);
    }

    // ✅ إغلاق المودال
    function closeInlineAppointmentModal() {
        const modal = document.getElementById('inlineAppointmentModal');
        if (modal) modal.classList.remove('show');
    }

    // ✅ حفظ الموعد في localStorage
    function saveInlineAppointment(apt) {
        const prefix = 'balancy_';
        let appointments = [];
        try {
            const raw = localStorage.getItem(prefix + 'appointments');
            appointments = raw ? JSON.parse(raw) : [];
        } catch (e) {
            appointments = [];
        }

        appointments.push(apt);

        try {
            localStorage.setItem(prefix + 'appointments', JSON.stringify(appointments));
            return true;
        } catch (e) {
            console.error('فشل حفظ الموعد:', e);
            return false;
        }
    }

    // ✅ ربط الأحداث (يُستدعى عند التهيئة)
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

                // ✅ فاليديشن
                if (!patient || !date || !time || !reason) {
                    showToast('error', 'حقول ناقصة', 'يرجى ملء جميع الحقول المطلوبة.');
                    return;
                }

                // ✅ تحقق من أن التاريخ ليس في الماضي
                const today = new Date().toISOString().slice(0, 10);
                if (date < today) {
                    showToast('error', 'تاريخ غير صالح', 'لا يمكن حجز موعد في تاريخ سابق.');
                    return;
                }

                // ✅ إنشاء كائن الموعد
                const apt = {
                    id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    patientName: patient,
                    date: date,
                    time: time,
                    reason: reason,
                    notes: notes,
                    source: 'appointments',
                    createdAt: new Date().toISOString()
                };

                // ✅ حفظ
                if (saveInlineAppointment(apt)) {
                    closeInlineAppointmentModal();
                    showToast('success', 'تم حفظ الموعد', `${patient} — ${date} ${time}`, 4000);
                    bnConfetti.fire();

                    // ✅ إطلاق حدث مخصص
                    window.dispatchEvent(new CustomEvent('appointmentAdded', { detail: apt }));
                } else {
                    showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ الموعد.');
                }
            });
        }

        if (inlineCancel) {
            inlineCancel.addEventListener('click', closeInlineAppointmentModal);
        }

        if (inlineModal) {
            inlineModal.addEventListener('click', (e) => {
                if (e.target.id === 'inlineAppointmentModal') closeInlineAppointmentModal();
            });
        }

        // ✅ ESC لإغلاق المودال
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const m = document.getElementById('inlineAppointmentModal');
                if (m && m.classList.contains('show')) closeInlineAppointmentModal();
            }
        });
    }

    /* ============================================================
       9. Edit / Delete / Reset
    ============================================================ */
    window.editVisitItem = function (index) {
        const item = visitsList[index];
        if (!item) return;
        document.getElementById('visitEditIndex').value = index;
        document.getElementById('visitReason').value = item.reason;
        document.getElementById('visitDate').value = item.visitDate;
        document.getElementById('visitNotes').value = item.notes || '';
        document.getElementById('visitFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الزيارة';
        document.getElementById('visitSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('visitCancelBtn').classList.remove('d-none');
        document.getElementById('visitForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
       10. Init
    ============================================================ */
    function doInit() {
        renderVisitsTable();
        bnValidation.attachToForm(document.getElementById('visitForm'));

        // ✅ ربط زر حجز الموعد
        const bookAppointmentBtn = document.getElementById('bookAppointmentBtn');
        if (bookAppointmentBtn) {
            bookAppointmentBtn.addEventListener('click', openInlineAppointmentModal);
        }

        // ✅ ربط أحداث المودال
        bindInlineAppointmentEvents();

        setTimeout(() => {
            showToast('info', 'الزيارات', 'يمكنك تسجيل زيارات المريض مع تحديد سبب الزيارة والملاحظات.', 5000);
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