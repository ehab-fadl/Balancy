/* ============================================================
   Side Effects Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق SideEffectCreateDto/UpdateDto/ResponseDto
   - يحافظ على: Toast, Modals, Validation, Confetti
   - يحذف: localStorage
============================================================ */

(function initSideEffects() {
    console.log('🚀 SideEffects.js initialized');

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
        const form = document.getElementById('sideEffectForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('sideEffectForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=SideEffects',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateSideEffect',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateSideEffect',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=SideEffect'
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
        if (document.getElementById('bn-se-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-se-toast-styles';
        style.textContent = `
            .bn-se-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-se-toast-overlay.show { display: flex !important; }
            .bn-se-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnSeToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-se-toast.hide { animation: bnSeToastOut 0.3s ease forwards; }
            .bn-se-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-se-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-se-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-se-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-se-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-se-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-se-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-se-toast.info { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            @keyframes bnSeToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnSeToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
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

    const showToast = showBuiltInToast;

    /* ============================================================
       2. Confetti
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
       6. State
    ============================================================ */
    let sideEffectsList = [];
    let isLoadingList = false;

    /* ============================================================
       7. Extract / mapping
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

    function mapSideEffectDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            medicationName: dto.medicationName ?? dto.MedicationName ?? '',
            symptom: dto.symptom ?? dto.Symptom ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       8. Render table
    ============================================================ */
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
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" data-edit-index="${index}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-delete-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => editSideEffectItem(parseInt(btn.dataset.editIndex, 10)));
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => deleteSideEffectItem(parseInt(btn.dataset.deleteIndex, 10)));
        });

        updateSideEffectsCount();
    }

    /* ============================================================
       9. Load from API
    ============================================================ */
    async function loadSideEffects() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            sideEffectsList = [];
            renderSideEffectsTable();
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
            sideEffectsList = arr.map(mapSideEffectDto);
            console.log('✅ Loaded side effects:', sideEffectsList);
            renderSideEffectsTable();
        } catch (err) {
            console.error('❌ فشل تحميل الأعراض الجانبية:', err);
            sideEffectsList = [];
            renderSideEffectsTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل الأعراض الجانبية.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       10. Build payloads
    ============================================================ */
    function buildCreatePayload() {
        const patientId = getPatientId();
        return {
            patientId: patientId,
            medicationName: document.getElementById('sideEffectMedicationName').value.trim(),
            symptom: document.getElementById('sideEffectSymptom').value.trim(),
            notes: document.getElementById('sideEffectNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('sideEffectEditId').value.trim();
        return {
            id: editId,
            medicationName: document.getElementById('sideEffectMedicationName').value.trim(),
            symptom: document.getElementById('sideEffectSymptom').value.trim(),
            notes: document.getElementById('sideEffectNotes').value.trim() || null
        };
    }

    /* ============================================================
       11. API CRUD
    ============================================================ */
    async function createSideEffectApi(payload) {
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

    async function updateSideEffectApi(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف العرض غير صالح: "${id}"`);
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

    async function deleteSideEffectApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف العرض غير صالح: "${id}"`);
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
       12. Form Submit
    ============================================================ */
    const sideEffectForm = document.getElementById('sideEffectForm');
    if (sideEffectForm) {
        sideEffectForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editId = document.getElementById('sideEffectEditId').value.trim();
            const isEdit = !!editId;

            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف العرض غير صالح: "${editId}"`);
                return;
            }

            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('sideEffectSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateSideEffectApi(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تعديل العرض الجانبي.');
                } else {
                    await createSideEffectApi(payload);
                    showToast('success', 'تمت الإضافة', 'تمت إضافة العرض الجانبي.');
                }
                bnConfetti.fire();
                resetSideEffectForm();
                await loadSideEffects();
            } catch (err) {
                console.error('❌ فشل حفظ العرض الجانبي:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء الحفظ.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       13. Edit / Delete / Reset
    ============================================================ */
    function editSideEffectItem(index) {
        const item = sideEffectsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا العرض لا يحتوي على معرّف (id) صالح — لا يمكن تعديله.');
            return;
        }
        document.getElementById('sideEffectEditId').value = item.id;
        document.getElementById('sideEffectEditIndex').value = index;
        document.getElementById('sideEffectMedicationName').value = item.medicationName;
        document.getElementById('sideEffectSymptom').value = item.symptom;
        document.getElementById('sideEffectNotes').value = item.notes || '';
        document.getElementById('sideEffectFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل العرض الجانبي';
        document.getElementById('sideEffectSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('sideEffectCancelBtn').classList.remove('d-none');
        sideEffectForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.symptom}`);
    }

    function deleteSideEffectItem(index) {
        const item = sideEffectsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا العرض لا يحتوي على معرّف (id) صالح — لا يمكن حذفه.');
            return;
        }
        showConfirmModal({
            title: 'تأكيد حذف العرض الجانبي',
            subtitle: 'لن تتمكن من استرجاع العرض الجانبي',
            message: `هل أنت متأكد من حذف العرض <strong>${escapeHtml(item.symptom)}</strong> للدواء <strong>${escapeHtml(item.medicationName)}</strong>؟`,
            confirmText: 'نعم، احذف العرض',
            onConfirm: async () => {
                try {
                    await deleteSideEffectApi(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف العرض الجانبي.');
                    resetSideEffectForm();
                    await loadSideEffects();
                } catch (err) {
                    console.error('❌ فشل حذف العرض:', err);
                    showToast('error', 'فشل', err.message || 'حدث خطأ أثناء الحذف.');
                }
            }
        });
    }

    window.resetSideEffectForm = function () {
        const form = document.getElementById('sideEffectForm');
        if (!form) return;
        form.reset();
        document.getElementById('sideEffectEditIndex').value = '-1';
        document.getElementById('sideEffectEditId').value = '';
        document.getElementById('sideEffectFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة عرض جانبي جديد';
        document.getElementById('sideEffectSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة العرض الجانبي';
        document.getElementById('sideEffectCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    /* ============================================================
       14. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('sideEffectForm'));
        loadSideEffects();

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