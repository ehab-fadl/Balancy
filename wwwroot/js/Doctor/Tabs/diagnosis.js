/* ============================================================
   Diagnosis Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق DiagnosisCreateDto/UpdateDto/ResponseDto
   - يحافظ على: Validation, Toast, Modals, Confetti, Badges
   - يحذف: localStorage
============================================================ */

(function initDiagnosis() {
    console.log('🚀 Diagnosis.js initialized');

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
        const form = document.getElementById('diagnosisForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('diagnosisForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=Diagnoses',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateDiagnosis',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateDiagnosis',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=Diagnosis'
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

    /* ============================================================
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-dx-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-dx-toast-styles';
        style.textContent = `
            .bn-dx-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-dx-toast-overlay.show { display: flex !important; }
            .bn-dx-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnDxToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-dx-toast.hide { animation: bnDxToastOut 0.3s ease forwards; }
            .bn-dx-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-dx-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-dx-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-dx-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-dx-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-dx-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-dx-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-dx-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnDxToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnDxToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
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
        let overlay = document.getElementById('bnDxToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnDxToastOverlay';
            overlay.className = 'bn-dx-toast-overlay';
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
        toast.className = `bn-dx-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-dx-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-dx-toast-body">
                <div class="bn-dx-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-dx-toast-message">${escapeHtml(message || '')}</div>
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
            if (rule.required && !this.validators.required(value))
                return { valid: false, type: 'error', message: rule.messages?.required || 'هذا الحقل مطلوب' };
            if (!value || String(value).trim() === '') return { valid: true };
            if (rule.dateNotFuture && !this.validators.dateNotFuture(value))
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ لا يمكن أن يكون في المستقبل' };
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
            form.querySelectorAll('input, select, textarea').forEach(field => this.attachToField(field));
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
       6. Helpers
    ============================================================ */
    function getDiagnosisSeverityBadge(severity) {
        switch (severity) {
            case 'بسيط': return 'background: #d1fae5; color: #047857;';
            case 'متوسط': return 'background: #fef3c7; color: #b45309;';
            case 'شديد': return 'background: #fee2e2; color: #b91c1c;';
            case 'حرج': return 'background: #7f1d1d; color: #fecaca;';
            default: return 'background: #f1f5f9; color: #475569;';
        }
    }

    /* ============================================================
       7. State
    ============================================================ */
    let diagnosisList = [];
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

    function mapDiagnosisDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            type: dto.mainType ?? dto.MainType ?? '',
            subtype: dto.subType ?? dto.SubType ?? '',
            date: normalizeDateForInput(dto.diagnosisDate ?? dto.DiagnosisDate),
            severity: dto.severity ?? dto.Severity ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       9. Render table
    ============================================================ */
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
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" data-edit-index="${index}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-delete-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => editDiagnosisItem(parseInt(btn.dataset.editIndex, 10)));
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => deleteDiagnosisItem(parseInt(btn.dataset.deleteIndex, 10)));
        });

        updateDiagnosisCount();
    }

    /* ============================================================
       10. Load from API
    ============================================================ */
    async function loadDiagnoses() {
        if (isLoadingList) return;
        isLoadingList = true;

        const patientId = getPatientId();
        if (!patientId) {
            diagnosisList = [];
            renderDiagnosisTable();
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
            diagnosisList = arr.map(mapDiagnosisDto);
            console.log('✅ Loaded diagnoses:', diagnosisList);
            renderDiagnosisTable();
        } catch (err) {
            console.error('❌ فشل تحميل التشخيصات:', err);
            diagnosisList = [];
            renderDiagnosisTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل التشخيصات من الخدمة.');
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
            mainType: document.getElementById('diagnosisType').value,
            subType: document.getElementById('diagnosisSubtype').value,
            diagnosisDate: toIsoDateTime(document.getElementById('diagnosisDate').value),
            severity: document.getElementById('diagnosisSeverity').value,
            notes: document.getElementById('diagnosisNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('diagnosisEditId').value.trim();
        return {
            id: editId,
            mainType: document.getElementById('diagnosisType').value,
            subType: document.getElementById('diagnosisSubtype').value,
            diagnosisDate: toIsoDateTime(document.getElementById('diagnosisDate').value),
            severity: document.getElementById('diagnosisSeverity').value,
            notes: document.getElementById('diagnosisNotes').value.trim() || null
        };
    }

    /* ============================================================
       12. API CRUD
    ============================================================ */
    async function createDiagnosisApi(payload) {
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

    async function updateDiagnosisApi(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف التشخيص غير صالح: "${id}"`);
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

    async function deleteDiagnosisApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف التشخيص غير صالح: "${id}"`);
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
    const diagnosisForm = document.getElementById('diagnosisForm');
    if (diagnosisForm) {
        diagnosisForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editId = document.getElementById('diagnosisEditId').value.trim();
            const isEdit = !!editId;

            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف التشخيص غير صالح: "${editId}"`);
                return;
            }

            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('diagnosisSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateDiagnosisApi(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تعديل التشخيص.');
                } else {
                    await createDiagnosisApi(payload);
                    showToast('success', 'تمت الإضافة', 'تمت إضافة التشخيص.');
                }
                bnConfetti.fire();
                resetDiagnosisForm();
                await loadDiagnoses();
            } catch (err) {
                console.error('❌ فشل حفظ التشخيص:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ التشخيص.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       14. Edit / Delete / Reset
    ============================================================ */
    function editDiagnosisItem(index) {
        const item = diagnosisList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا التشخيص لا يحتوي على معرّف (id) صالح — لا يمكن تعديله.');
            return;
        }

        document.getElementById('diagnosisEditId').value = item.id;
        document.getElementById('diagnosisEditIndex').value = index;
        document.getElementById('diagnosisType').value = item.type;
        document.getElementById('diagnosisSubtype').value = item.subtype;
        document.getElementById('diagnosisDate').value = item.date;
        document.getElementById('diagnosisSeverity').value = item.severity;
        document.getElementById('diagnosisNotes').value = item.notes || '';
        document.getElementById('diagnosisFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل التشخيص';
        document.getElementById('diagnosisSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('diagnosisCancelBtn').classList.remove('d-none');
        diagnosisForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function deleteDiagnosisItem(index) {
        const item = diagnosisList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا التشخيص لا يحتوي على معرّف (id) صالح — لا يمكن حذفه.');
            return;
        }

        showConfirmModal({
            title: 'تأكيد حذف التشخيص',
            subtitle: 'لن تتمكن من استرجاع التشخيص بعد الحذف',
            message: `هل أنت متأكد من حذف التشخيص <strong>${escapeHtml(item.type)}</strong>؟`,
            confirmText: 'نعم، احذف التشخيص',
            onConfirm: async () => {
                try {
                    await deleteDiagnosisApi(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف التشخيص.');
                    resetDiagnosisForm();
                    await loadDiagnoses();
                } catch (err) {
                    console.error('❌ فشل حذف التشخيص:', err);
                    showToast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف التشخيص.');
                }
            }
        });
    }

    window.resetDiagnosisForm = function () {
        const form = document.getElementById('diagnosisForm');
        if (!form) return;
        form.reset();
        document.getElementById('diagnosisEditIndex').value = '-1';
        document.getElementById('diagnosisEditId').value = '';
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
       15. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(diagnosisForm);
        loadDiagnoses();

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