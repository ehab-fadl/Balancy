/* ============================================================
   Prescribed Medications Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق MedicationCreateDto/UpdateDto/ResponseDto
   - PDF يقرأ من البيانات المحمّلة من الـ API
   - يحذف: localStorage للمرضى
============================================================ */

(function initMedications() {
    console.log('🚀 Medications.js initialized');

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
        const form = document.getElementById('medicationForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('medicationForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=Medications',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateMedication',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateMedication',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=Medication'
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
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        } catch { return ''; }
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
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-med-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-med-toast-styles';
        style.textContent = `
            .bn-med-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-med-toast-overlay.show { display: flex !important; }
            .bn-med-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnMedToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-med-toast.hide { animation: bnMedToastOut 0.3s ease forwards; }
            .bn-med-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-med-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-med-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-med-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-med-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-med-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-med-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-med-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnMedToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnMedToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
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

    const showToast = showBuiltInToast;

    /* ============================================================
       2. Confetti
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
       4. Validation Engine
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
       6. Status Badge helper
    ============================================================ */
    function getMedicationStatusBadge(status) {
        switch (status) {
            case 'نشط': return 'med-status-active';
            case 'متوقف': return 'med-status-stopped';
            case 'مكتمل': return 'med-status-completed';
            case 'معلق مؤقتاً': return 'med-status-onhold';
            default: return 'med-status-completed';
        }
    }

    /* ============================================================
       7. State
    ============================================================ */
    let medicationsList = [];
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

    function mapMedicationDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            name: dto.name ?? dto.Name ?? '',
            dose: dto.dose ?? dto.Dose ?? '',
            frequency: dto.frequency ?? dto.Frequency ?? '',
            intakePeriod: dto.intakePeriod ?? dto.IntakePeriod ?? '',
            route: dto.route ?? dto.Route ?? '',
            startDate: normalizeDateForInput(dto.startDate ?? dto.StartDate),
            endDate: dto.endDate || dto.EndDate ? normalizeDateForInput(dto.endDate ?? dto.EndDate) : '',
            status: dto.status ?? dto.Status ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       9. Render table
    ============================================================ */
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
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" data-edit-index="${index}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-delete-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => editMedicationItem(parseInt(btn.dataset.editIndex, 10)));
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => deleteMedicationItem(parseInt(btn.dataset.deleteIndex, 10)));
        });
        updateMedicationsCount();
    }

    /* ============================================================
       10. Load from API
    ============================================================ */
    async function loadMedications() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            medicationsList = [];
            renderMedicationsTable();
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
            medicationsList = arr.map(mapMedicationDto);
            console.log('✅ Loaded medications:', medicationsList);
            renderMedicationsTable();
        } catch (err) {
            console.error('❌ فشل تحميل الأدوية:', err);
            medicationsList = [];
            renderMedicationsTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل الأدوية من الخدمة.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       11. Build payloads
    ============================================================ */
    function buildCreatePayload() {
        const patientId = getPatientId();
        return {
            patientId: patientId,
            name: document.getElementById('medicationName').value.trim(),
            dose: document.getElementById('medicationDose').value.trim(),
            frequency: document.getElementById('medicationFrequency').value,
            intakePeriod: document.getElementById('medicationIntakePeriod').value,
            route: document.getElementById('medicationRoute').value,
            startDate: toIsoDateTime(document.getElementById('medicationStartDate').value),
            endDate: toIsoDateTime(document.getElementById('medicationEndDate').value),
            status: document.getElementById('medicationStatus').value,
            notes: document.getElementById('medicationNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('medicationEditId').value.trim();
        return {
            id: editId,
            name: document.getElementById('medicationName').value.trim(),
            dose: document.getElementById('medicationDose').value.trim(),
            frequency: document.getElementById('medicationFrequency').value,
            intakePeriod: document.getElementById('medicationIntakePeriod').value,
            route: document.getElementById('medicationRoute').value,
            startDate: toIsoDateTime(document.getElementById('medicationStartDate').value),
            endDate: toIsoDateTime(document.getElementById('medicationEndDate').value),
            status: document.getElementById('medicationStatus').value,
            notes: document.getElementById('medicationNotes').value.trim() || null
        };
    }

    /* ============================================================
       12. API CRUD
    ============================================================ */
    async function createMedicationApi(payload) {
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

    async function updateMedicationApi(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف الدواء غير صالح: "${id}"`);
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

    async function deleteMedicationApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف الدواء غير صالح: "${id}"`);
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
    const medicationForm = document.getElementById('medicationForm');
    if (medicationForm) {
        medicationForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }
            const editId = document.getElementById('medicationEditId').value.trim();
            const isEdit = !!editId;
            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف الدواء غير صالح: "${editId}"`);
                return;
            }
            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('medicationSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateMedicationApi(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تعديل الدواء.');
                } else {
                    await createMedicationApi(payload);
                    showToast('success', 'تمت الإضافة', 'تمت إضافة الدواء.');
                }
                bnConfetti.fire();
                resetMedicationForm();
                await loadMedications();
            } catch (err) {
                console.error('❌ فشل حفظ الدواء:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ الدواء.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       14. Edit / Delete / Reset
    ============================================================ */
    function editMedicationItem(index) {
        const item = medicationsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا الدواء لا يحتوي على معرّف (id) صالح — لا يمكن تعديله.');
            return;
        }
        document.getElementById('medicationEditId').value = item.id;
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
        medicationForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function deleteMedicationItem(index) {
        const item = medicationsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا الدواء لا يحتوي على معرّف (id) صالح — لا يمكن حذفه.');
            return;
        }
        showConfirmModal({
            title: 'تأكيد حذف الدواء',
            subtitle: 'لن تتمكن من استرجاع الدواء بعد الحذف',
            message: `هل أنت متأكد من حذف الدواء <strong>${escapeHtml(item.name)}</strong>؟`,
            confirmText: 'نعم، احذف الدواء',
            onConfirm: async () => {
                try {
                    await deleteMedicationApi(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف الدواء.');
                    resetMedicationForm();
                    await loadMedications();
                } catch (err) {
                    console.error('❌ فشل حذف الدواء:', err);
                    showToast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف الدواء.');
                }
            }
        });
    }

    window.resetMedicationForm = function () {
        const form = document.getElementById('medicationForm');
        if (!form) return;
        form.reset();
        document.getElementById('medicationEditIndex').value = '-1';
        document.getElementById('medicationEditId').value = '';
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
       15. PDF Generation (قراءة من medicationsList المحمّل من DB)
    ============================================================ */
    function getPatientInfo() {
        let patient = null;
        try {
            if (window.bnApp && typeof window.bnApp.getPatientInfo === 'function') {
                patient = window.bnApp.getPatientInfo();
            }
        } catch (e) { }
        if (!patient) {
            // جرّب sessionStorage
            const name = sessionStorage.getItem('bnCurrentPatientName');
            const age = sessionStorage.getItem('bnCurrentPatientAge');
            const code = sessionStorage.getItem('bnCurrentPatientCode');
            if (name || age || code) {
                patient = { name: name || '—', age: age || '—', fileNumber: code || '—' };
            }
        }
        if (!patient) patient = { name: 'مريض', age: '—', fileNumber: '—' };
        return {
            name: patient.name || patient.fullName || 'غير محدد',
            age: patient.age || patient.patientAge || '—',
            fileNumber: patient.fileNumber || patient.id || '—'
        };
    }

    async function renderPlanToCanvas(activeMeds, patient) {
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) { }
        }
        await new Promise(r => setTimeout(r, 250));

        const A4_W = 794;
        const A4_H = 1123;
        const SCALE = 2.5;
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

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

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

        const HEADER_H = 90;
        const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
        grad.addColorStop(0, '#0891b2');
        grad.addColorStop(1, '#0e7490');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, HEADER_H);

        ctx.save();
        ctx.beginPath();
        ctx.arc(60, HEADER_H / 2, 26, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.direction = 'ltr';
        ctx.fillText('+', 60, HEADER_H / 2 + 1);
        ctx.restore();

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

        const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

        ctx.save();
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Tajawal, "Segoe UI", sans-serif';
        ctx.fillText('الخطة الدوائية للمريض', W - 30, 32);
        ctx.font = '600 11px Tajawal, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(todayStr, W - 30, 52);
        ctx.restore();

        let y = HEADER_H + 22;
        const PAD = 24;
        const CARD_W = W - PAD * 2;
        roundRect(PAD, y, CARD_W, 70, 12, '#f0fdfa', '#a7f3d0');

        const colW = CARD_W / 3;
        const labels = ['اسم المريض', 'العمر', 'عنوان الخطة'];
        const values = [patient.name, String(patient.age), 'خطة الأدوية النشطة'];

        labels.forEach((label, i) => {
            const colX = PAD + CARD_W - (i + 1) * colW;
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

        y += 88;
        roundRect(PAD, y, CARD_W, 44, 8, '#f8fafc', '#e2e8f0');
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(W - PAD, y + 8, 3, 28);
        drawText(
            'عزيزي المريض، فيما يلي خطتك الدوائية الحالية للأدوية النشطة فقط. يُرجى الالتزام بالجرعات والأوقات الموضحة.',
            W - PAD - 14, y + 22,
            { font: '600 10.5px Tajawal, sans-serif', color: '#475569', align: 'right', wrapWidth: CARD_W - 28, lineHeight: 15 }
        );

        y += 60;
        const tableX = PAD;
        const tableW = CARD_W;
        const rowH = 30;
        const headerH = 30;

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

        const fixedW = cols.reduce((s, c) => s + (c.w || 0), 0);
        cols[cols.length - 1].w = tableW - fixedW;

        const gradTable = ctx.createLinearGradient(tableX, y, tableX + tableW, y);
        gradTable.addColorStop(0, '#0891b2');
        gradTable.addColorStop(1, '#0e7490');
        ctx.fillStyle = gradTable;
        ctx.fillRect(tableX, y, tableW, headerH);

        let colX = tableX + tableW;
        cols.forEach((col) => {
            colX -= col.w;
            drawText(col.label, colX + col.w - 8, y + headerH / 2, {
                font: '900 10px Tajawal, sans-serif',
                color: '#ffffff',
                align: col.align === 'center' ? 'center' : 'right'
            });
            if (col.align === 'center') {
                const cx = colX + col.w / 2;
                drawText(col.label, cx, y + headerH / 2, {
                    font: '900 10px Tajawal, sans-serif',
                    color: '#ffffff',
                    align: 'center'
                });
            }
        });

        let rowY = y + headerH;
        activeMeds.forEach((med, i) => {
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(tableX, rowY, tableW, rowH);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tableX, rowY + rowH);
            ctx.lineTo(tableX + tableW, rowY + rowH);
            ctx.stroke();

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

        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tableX, y, tableW, headerH + activeMeds.length * rowH);

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

        y = rowY + 20;
        const notesH = 90;
        roundRect(PAD, y, CARD_W, notesH, 10, '#fffbeb', '#fde68a');

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

        y += notesH + 30;
        const sigW = 160;
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

        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            showToast('error', 'خطأ', 'مكتبة jsPDF لم تُحمّل بعد. تحقق من اتصال الإنترنت.');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner"></i> جاري التوليد...';

        try {
            const patient = getPatientInfo();
            const canvas = await renderPlanToCanvas(activeMeds, patient);

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
       16. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('medicationForm'));
        loadMedications();
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