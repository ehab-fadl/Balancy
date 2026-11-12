/* ============================================================
   Visits Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق VisitCreateDto/UpdateDto/ResponseDto (بما فيها NextVisitDate)
   - زر "حجز موعد الزيارة القادمة" → NextVisitDate + localStorage.appointments (احتياطي)
   - يحافظ على: Toast, Modals, Validation, Confetti, Badges
   - يحذف: localStorage للمرضى
============================================================ */

(function initVisits() {
    console.log('🚀 Visits.js initialized');

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
        const form = document.getElementById('visitForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('visitForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=Visits',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateVisit',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateVisit',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=Visit'
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
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch { return ''; }
    }

    function formatDateArabic(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; }
    }

    /* ============================================================
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-vis-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-vis-toast-styles';
        style.textContent = `
            .bn-vis-toast-overlay { position: fixed !important; inset: 0 !important; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
            .bn-vis-toast-overlay.show { display: flex !important; }
            .bn-vis-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnVisToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; position: relative; }
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
       2. Confetti
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
            setTimeout(() => { el.classList.remove('active'); el.innerHTML = ''; }, duration);
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
            modal.classList.remove('show'); bnFocusTrap.deactivate();
            confirmBtn.removeEventListener('click', onConfirmHandler);
            cancelBtn.removeEventListener('click', onCancelHandler);
            modal.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeyHandler);
        };
        const onConfirmHandler = () => { cleanup(); if (typeof onConfirm === 'function') onConfirm(); };
        const onCancelHandler = () => cleanup();
        const onOverlayClick = (e) => { if (e.target === modal) onCancelHandler(); };
        const onKeyHandler = (e) => { if (e.key === 'Escape') onCancelHandler(); else if (e.key === 'Enter') { e.preventDefault(); onConfirmHandler(); } };
        confirmBtn.addEventListener('click', onConfirmHandler);
        cancelBtn.addEventListener('click', onCancelHandler);
        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyHandler);
    }

    /* ============================================================
       6. Badge Helpers
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
       7. State + Mappers
    ============================================================ */
    let visitsList = [];
    let isLoadingList = false;
    let pendingNextVisitDate = null;  // للاستخدام المحلي عند حجز موعد

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

    function mapVisitDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            reason: dto.reason ?? dto.Reason ?? '',
            visitDate: normalizeDateForInput(dto.visitDate ?? dto.VisitDate),
            type: dto.visitType ?? dto.VisitType ?? '',
            location: dto.visitLocation ?? dto.VisitLocation ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            nextVisitDate: dto.nextVisitDate || dto.NextVisitDate ? normalizeDateForInput(dto.nextVisitDate ?? dto.NextVisitDate) : '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       8. Render table
    ============================================================ */
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
            const nextVisitHtml = item.nextVisitDate
                ? `<span class="badge bg-info text-dark"><i class="fa-solid fa-calendar-check"></i> ${escapeHtml(formatDateArabic(item.nextVisitDate))}</span>`
                : '<span class="text-muted">—</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold" data-label="#">${index + 1}</td>
                <td data-label="السبب" style="max-width: 200px; white-space: normal;">${escapeHtml(item.reason)}</td>
                <td data-label="النوع">${getVisitTypeBadge(item.type)}</td>
                <td data-label="المكان">${getVisitLocationBadge(item.location)}</td>
                <td data-label="التاريخ"><span class="visit-date-badge">${escapeHtml(formatDateArabic(item.visitDate))}</span></td>
                <td data-label="الزيارة القادمة">${nextVisitHtml}</td>
                <td data-label="ملاحظات" style="max-width: 180px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '-'}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" data-edit-index="${index}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-delete-index="${index}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => editVisitItem(parseInt(btn.dataset.editIndex, 10)));
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => deleteVisitItem(parseInt(btn.dataset.deleteIndex, 10)));
        });

        updateVisitsCount();
    }

    /* ============================================================
       9. Load from API
    ============================================================ */
    async function loadVisits() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            visitsList = [];
            renderVisitsTable();
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
            visitsList = arr.map(mapVisitDto);
            console.log('✅ Loaded visits:', visitsList);
            renderVisitsTable();
        } catch (err) {
            console.error('❌ فشل تحميل الزيارات:', err);
            visitsList = [];
            renderVisitsTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل الزيارات.');
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
            reason: document.getElementById('visitReason').value.trim(),
            visitDate: toIsoDateTime(document.getElementById('visitDate').value),
            visitType: document.getElementById('visitType').value,
            visitLocation: document.getElementById('visitLocation').value,
            notes: document.getElementById('visitNotes').value.trim() || null,
            nextVisitDate: pendingNextVisitDate ? toIsoDateTime(pendingNextVisitDate) : null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('visitEditId').value.trim();
        return {
            id: editId,
            reason: document.getElementById('visitReason').value.trim(),
            visitDate: toIsoDateTime(document.getElementById('visitDate').value),
            visitType: document.getElementById('visitType').value,
            visitLocation: document.getElementById('visitLocation').value,
            notes: document.getElementById('visitNotes').value.trim() || null,
            nextVisitDate: pendingNextVisitDate ? toIsoDateTime(pendingNextVisitDate) : null
        };
    }

    /* ============================================================
       11. API CRUD
    ============================================================ */
    async function createVisitApi(payload) {
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

    async function updateVisitApi(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف الزيارة غير صالح: "${id}"`);
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

    async function deleteVisitApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف الزيارة غير صالح: "${id}"`);
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
    const visitForm = document.getElementById('visitForm');
    if (visitForm) {
        visitForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }
            const editId = document.getElementById('visitEditId').value.trim();
            const isEdit = !!editId;
            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف الزيارة غير صالح: "${editId}"`);
                return;
            }
            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('visitSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateVisitApi(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تعديل الزيارة.');
                } else {
                    await createVisitApi(payload);
                    showToast('success', 'تم التسجيل', 'تم تسجيل الزيارة.');
                }
                bnConfetti.fire();
                resetVisitForm();
                await loadVisits();
            } catch (err) {
                console.error('❌ فشل حفظ الزيارة:', err);
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
    function editVisitItem(index) {
        const item = visitsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذه الزيارة لا تحتوي على معرّف (id) صالح — لا يمكن تعديلها.');
            return;
        }
        document.getElementById('visitEditId').value = item.id;
        document.getElementById('visitEditIndex').value = index;
        document.getElementById('visitReason').value = item.reason;
        document.getElementById('visitDate').value = item.visitDate;
        document.getElementById('visitType').value = item.type || '';
        document.getElementById('visitLocation').value = item.location || '';
        document.getElementById('visitNotes').value = item.notes || '';
        document.getElementById('visitFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الزيارة';
        document.getElementById('visitSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('visitCancelBtn').classList.remove('d-none');

        // حفظ NextVisitDate لو موجود
        pendingNextVisitDate = item.nextVisitDate || null;
        updateNextVisitPreview();

        visitForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل الزيارة: ${item.reason}`);
    }

    function deleteVisitItem(index) {
        const item = visitsList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذه الزيارة لا تحتوي على معرّف (id) صالح — لا يمكن حذفها.');
            return;
        }
        showConfirmModal({
            title: 'تأكيد حذف الزيارة',
            subtitle: 'لن تتمكن من استرجاع هذه الزيارة',
            message: `هل أنت متأكد من حذف الزيارة <strong>${escapeHtml(item.reason)}</strong> بتاريخ <strong>${escapeHtml(formatDateArabic(item.visitDate))}</strong>؟`,
            confirmText: 'نعم، احذف الزيارة',
            onConfirm: async () => {
                try {
                    await deleteVisitApi(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف الزيارة.');
                    resetVisitForm();
                    await loadVisits();
                } catch (err) {
                    console.error('❌ فشل حذف الزيارة:', err);
                    showToast('error', 'فشل', err.message || 'حدث خطأ أثناء الحذف.');
                }
            }
        });
    }

    window.resetVisitForm = function () {
        const form = document.getElementById('visitForm');
        if (!form) return;
        form.reset();
        document.getElementById('visitEditIndex').value = '-1';
        document.getElementById('visitEditId').value = '';
        document.getElementById('visitFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> تسجيل زيارة جديدة';
        document.getElementById('visitSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> تسجيل الزيارة';
        document.getElementById('visitCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        pendingNextVisitDate = null;
        updateNextVisitPreview();
    };

    /* ============================================================
       14. Next Visit Preview
    ============================================================ */
    function updateNextVisitPreview() {
        const preview = document.getElementById('nextVisitPreview');
        const text = document.getElementById('nextVisitPreviewText');
        if (!preview || !text) return;
        if (pendingNextVisitDate) {
            text.textContent = formatDateArabic(pendingNextVisitDate);
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
            text.textContent = '—';
        }
    }

    const clearNextVisitBtn = document.getElementById('clearNextVisitBtn');
    if (clearNextVisitBtn) {
        clearNextVisitBtn.addEventListener('click', () => {
            pendingNextVisitDate = null;
            updateNextVisitPreview();
            showToast('info', 'تم المسح', 'تم إلغاء موعد الزيارة القادمة.');
        });
    }

    /* ============================================================
       15. Inline Appointment Modal (يعدّل NextVisitDate + localStorage)
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

        const patientName = sessionStorage.getItem('bnCurrentPatientName') || '';
        const visitReason = document.getElementById('visitReason')?.value.trim() || '';
        const visitNotes = document.getElementById('visitNotes')?.value.trim() || '';

        if (patientInput) patientInput.value = patientName;
        if (reasonInput) reasonInput.value = visitReason;
        if (notesInput) notesInput.value = visitNotes;
        if (dateInput) {
            // افتراضياً اليوم
            const today = new Date().toISOString().slice(0, 10);
            dateInput.value = today;
        }
        if (subtitle) {
            subtitle.textContent = patientName ? `سيتم إضافة الموعد إلى: ${patientName}` : 'املأ بيانات الموعد ثم احفظ';
        }
        modal.classList.add('show');
        setTimeout(() => {
            if (dateInput) dateInput.focus();
        }, 150);
    }

    function closeInlineAppointmentModal() {
        const modal = document.getElementById('inlineAppointmentModal');
        if (modal) modal.classList.remove('show');
    }

    function saveAppointmentToLocalStorage(apt) {
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
            inlineForm.addEventListener('submit', async function (e) {
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

                const saveBtn = document.getElementById('inlineAptSave');
                const originalHtml = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

                try {
                    // ✅ 1) إرسال الموعد إلى الباك إند ليُحفظ في جدول Appointments
                    const patientId = getPatientId();
                    const response = await fetch('/Doctor/Appointments/Appointments?handler=Create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'RequestVerificationToken': getAntiForgeryToken()
                        },
                        body: JSON.stringify({
                            patientId: patientId,
                            scheduledDate: new Date(date).toISOString(),
                            scheduledTime: time,
                            reason: reason,
                            notes: notes,
                            visitType: "متابعة",
                            visitLocation: "عيادة"
                        })
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => null);
                        throw new Error(errData?.error || `HTTP ${response.status}`);
                    }

                    // ✅ 2) تحديث NextVisitDate في الـ Visit
                    pendingNextVisitDate = date;
                    updateNextVisitPreview();

                    closeInlineAppointmentModal();
                    showToast('success', 'تم حفظ الموعد',
                        `تمت إضافة الموعد إلى العيادة: ${formatDateArabic(date)} ${time}`,
                        4000);
                    bnConfetti.fire();

                } catch (err) {
                    console.error('❌ فشل حجز الموعد:', err);
                    showToast('error', 'فشل الحجز', err.message || 'تعذر حفظ الموعد في النظام.');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalHtml;
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
       16. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('visitForm'));

        // ضبط تاريخ اليوم افتراضياً
        const visitDateEl = document.getElementById('visitDate');
        if (visitDateEl && !visitDateEl.value) {
            visitDateEl.value = new Date().toISOString().slice(0, 10);
        }

        loadVisits();

        const bookAppointmentBtn = document.getElementById('bookAppointmentBtn');
        if (bookAppointmentBtn) bookAppointmentBtn.addEventListener('click', openInlineAppointmentModal);

        bindInlineAppointmentEvents();
        updateNextVisitPreview();

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