/* ============================================================
   Chronic Diseases Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق DTOs الباك إند:
     * Create: { patientId (guid), name, diagnosisDate (ISO), medications, notes? }
     * Update: { id (guid), name, diagnosisDate (ISO), medications, notes? }
   - يحافظ على: Validation, Toast, Confirm Modal, الأنماط
   - يحذف: mock list + localStorage
============================================================ */

(function initChronicDiseases() {
    console.log('🚀 ChronicDiseases.js initialized');

    /* ============================================================
       1. Utilities
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
        const form = document.getElementById('chronicForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('chronicForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=ChronicDiseases',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateChronicDisease',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateChronicDisease',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=ChronicDisease'
        };
    }

    function isValidGuid(value) {
        if (!value) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(value).trim());
    }

    /**
     * يحوّل قيمة <input type="date"> ("YYYY-MM-DD") إلى ISO DateTime كامل
     * لأن ChronicDiseaseCreateDto/UpdateDto بيتوقعوا DateTime.
     */
    function toIsoDateTime(dateInputValue) {
        if (!dateInputValue) return null;
        // "YYYY-MM-DD" → new Date في UTC
        const d = new Date(dateInputValue + 'T00:00:00Z');
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    }

    /**
     * يحوّل ISO DateTime من الـ API إلى "YYYY-MM-DD" لعرضه في input[type=date].
     */
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
       2. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-cd-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-cd-toast-styles';
        style.textContent = `
            .bn-cd-toast-overlay {
                position: fixed; inset: 0;
                display: none; align-items: center; justify-content: center;
                z-index: 100000; pointer-events: none; padding: 1rem;
            }
            .bn-cd-toast-overlay.show { display: flex; }
            .bn-cd-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnCdToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5;
            }
            .bn-cd-toast.hide { animation: bnCdToastOut 0.3s ease forwards; }
            .bn-cd-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-cd-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-cd-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-cd-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-cd-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-cd-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-cd-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-cd-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnCdToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnCdToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.92); }
            }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        let overlay = document.getElementById('bnCdToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnCdToastOverlay';
            overlay.className = 'bn-cd-toast-overlay';
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
        toast.className = `bn-cd-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-cd-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-cd-toast-body">
                <div class="bn-cd-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-cd-toast-message">${escapeHtml(message || '')}</div>
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
       3. Confirm Modal
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

        const cleanup = () => {
            modal.classList.remove('show');
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
       4. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            diseaseName: {
                required: true, minLength: 2, maxLength: 100,
                noWhitespaceOnly: true,
                messages: {
                    required: 'اسم المرض مطلوب',
                    minLength: 'اسم المرض قصير جداً (حرفان على الأقل)',
                    maxLength: 'اسم المرض طويل جداً',
                    noWhitespaceOnly: 'لا يمكن أن يكون اسم المرض فارغاً'
                }
            },
            diseaseDate: {
                required: true, dateNotFuture: true,
                messages: {
                    required: 'تاريخ التشخيص مطلوب',
                    dateNotFuture: 'تاريخ التشخيص لا يمكن أن يكون في المستقبل'
                }
            },
            diseaseMeds: {
                required: true, minLength: 2, maxLength: 200,
                noWhitespaceOnly: true,
                messages: {
                    required: 'الأدوية مطلوبة',
                    minLength: 'يرجى كتابة اسم الدواء على الأقل',
                    maxLength: 'قائمة الأدوية طويلة جداً',
                    noWhitespaceOnly: 'لا يمكن أن تكون الأدوية فارغة'
                }
            }
        },

        validators: {
            required: (v) => v !== null && v !== undefined && String(v).trim().length > 0,
            minLength: (v, len) => !v || v.trim().length >= len,
            maxLength: (v, len) => !v || v.length <= len,
            noWhitespaceOnly: (v) => !v || v.trim().length > 0,
            dateNotFuture: (v) => {
                if (!v) return true;
                const input = new Date(v);
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
            if (rule.noWhitespaceOnly && !this.validators.noWhitespaceOnly(value))
                return { valid: false, type: 'error', message: rule.messages?.noWhitespaceOnly || 'لا يمكن أن يكون الحقل فارغاً' };
            if (rule.minLength && !this.validators.minLength(value, rule.minLength))
                return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength))
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
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
                if (field.type === 'hidden') return;
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
                    <button type="button" class="bn-summary-close" aria-label="إغلاق">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
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

            summary.querySelector('.bn-summary-close').addEventListener('click', () => {
                summary.style.transition = 'opacity 0.3s ease';
                summary.style.opacity = '0';
                setTimeout(() => summary.remove(), 300);
            });

            const watchedFields = errors.map(e => e.field);
            const checkAllFixed = () => {
                const allFixed = watchedFields.every(f => this.validateField(f).valid);
                if (allFixed) {
                    summary.style.transition = 'opacity 0.3s ease';
                    summary.style.opacity = '0';
                    setTimeout(() => summary.remove(), 300);
                }
            };
            watchedFields.forEach(f => {
                const evt = (f.tagName === 'SELECT' || f.type === 'date') ? 'change' : 'input';
                f.addEventListener(evt, checkAllFixed);
            });
        },

        attachToField(field) {
            const name = field.name || field.id;
            if (!this.rules[name]) return;

            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label && this.rules[name].required) label.classList.add('required');

            const eventType = (field.type === 'date' || field.tagName === 'SELECT') ? 'change' : 'blur';

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
            form.querySelectorAll('input, select, textarea').forEach(f => this.attachToField(f));
        }
    };

    /* ============================================================
       5. State
    ============================================================ */
    let chronicDiseasesList = [];
    let isLoadingList = false;

    /* ============================================================
       6. Extract / mapping helpers
    ============================================================ */
    function extractArray(payload) {
        if (payload == null) return [];
        if (Array.isArray(payload)) return payload;

        const candidates = [
            payload.data,
            payload.items,
            payload.result,
            payload.$values,
            payload.data?.$values,
            payload.data?.items
        ];
        for (const c of candidates) {
            if (Array.isArray(c)) return c;
        }
        for (const key of Object.keys(payload)) {
            if (Array.isArray(payload[key])) return payload[key];
        }
        return [];
    }

    /**
     * يحوّل ResponseDto من الباك إند إلى الشكل الموحّد:
     *   ResponseDto = { Id, PatientId, Name, DiagnosisDate, Medications, Notes, CreatedAt, UpdatedAt }
     */
    function mapDiseaseDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            name: dto.name ?? dto.Name ?? '',
            date: normalizeDateForInput(dto.diagnosisDate ?? dto.DiagnosisDate),
            meds: dto.medications ?? dto.Medications ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       7. Render table
    ============================================================ */
    function renderChronicTable() {
        const tbody = document.getElementById('chronicTableBody');
        const emptyState = document.getElementById('chronicEmptyState');
        const badge = document.getElementById('chronicCountBadge');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = chronicDiseasesList.length === 0 ? 'block' : 'none';

        if (badge) {
            if (chronicDiseasesList.length > 0) {
                badge.textContent = chronicDiseasesList.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        chronicDiseasesList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `cd-rowSlideIn 0.35s ease ${index * 0.05}s both`;
            tr.innerHTML = `
                <td data-label="#">
                    <span class="table-index">${index + 1}</span>
                </td>
                <td data-label="اسم المرض">
                    <span class="disease-name">
                        <i class="fa-solid fa-disease"></i>
                        ${escapeHtml(item.name)}
                    </span>
                </td>
                <td data-label="تاريخ التشخيص">${escapeHtml(item.date || '—')}</td>
                <td data-label="الأدوية">${escapeHtml(item.meds || '—')}</td>
                <td data-label="ملاحظات">${item.notes ? escapeHtml(item.notes) : '<span style="color: var(--bn-text-muted);">—</span>'}</td>
                <td class="text-center">
                    <div class="action-btns">
                        <button type="button" class="btn btn-edit" data-edit-index="${index}" aria-label="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-delete" data-delete-index="${index}" aria-label="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.editIndex, 10);
                window.editChronicItem(i);
            });
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.deleteIndex, 10);
                window.deleteChronicItem(i);
            });
        });
    }

    /* ============================================================
       8. Load list from API
    ============================================================ */
    async function loadChronicDiseases() {
        if (isLoadingList) return;
        isLoadingList = true;

        const patientId = getPatientId();
        if (!patientId) {
            console.warn('⚠️ No patientId — cannot load chronic diseases');
            chronicDiseasesList = [];
            renderChronicTable();
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
            chronicDiseasesList = arr.map(mapDiseaseDto);

            console.log('✅ Loaded chronic diseases:', chronicDiseasesList);
            renderChronicTable();
        } catch (err) {
            console.error('❌ فشل تحميل الأمراض المزمنة:', err);
            chronicDiseasesList = [];
            renderChronicTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل الأمراض المزمنة من الخدمة.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       9. Build payload (يطابق DTOs الباك إند)
    ============================================================ */
    function buildCreatePayload() {
        const patientId = getPatientId();
        return {
            patientId: patientId,                                    // Guid
            name: document.getElementById('diseaseName').value.trim(),
            diagnosisDate: toIsoDateTime(document.getElementById('diseaseDate').value),  // ISO DateTime
            medications: document.getElementById('diseaseMeds').value.trim(),
            notes: document.getElementById('diseaseNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('chronicEditId').value.trim();
        return {
            id: editId,                                              // Guid — مطلوب في UpdateDto
            name: document.getElementById('diseaseName').value.trim(),
            diagnosisDate: toIsoDateTime(document.getElementById('diseaseDate').value),
            medications: document.getElementById('diseaseMeds').value.trim(),
            notes: document.getElementById('diseaseNotes').value.trim() || null
        };
    }

    /* ============================================================
       10. Create / Update / Delete
    ============================================================ */
    async function createDisease(payload) {
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

    async function updateDisease(id, payload) {
        if (!isValidGuid(id)) {
            throw new Error(`معرّف المرض غير صالح للـ PUT: "${id}"`);
        }

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

    async function deleteDisease(id) {
        if (!isValidGuid(id)) {
            throw new Error(`معرّف المرض غير صالح للحذف: "${id}"`);
        }
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
       11. Form submit
    ============================================================ */
    const chronicForm = document.getElementById('chronicForm');
    if (chronicForm) {
        chronicForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editId = document.getElementById('chronicEditId').value.trim();
            const isEdit = !!editId;

            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف المرض غير صالح: "${editId}". جرّب إعادة تحميل الصفحة.`);
                console.error('❌ Invalid editId:', editId, 'list:', chronicDiseasesList);
                return;
            }

            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('chronicSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateDisease(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تحديث المرض المزمن بنجاح.');
                } else {
                    await createDisease(payload);
                    showToast('success', 'تم الإضافة', 'تمت إضافة المرض المزمن بنجاح.');
                }

                resetChronicForm();
                await loadChronicDiseases();
            } catch (err) {
                console.error('❌ فشل حفظ المرض المزمن:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ المرض المزمن.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       12. Edit / Delete / Reset (global for onclick)
    ============================================================ */
    window.editChronicItem = function (index) {
        const item = chronicDiseasesList[index];
        if (!item) return;

        console.log('✏️ Editing item:', item);

        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا المرض لا يحتوي على معرّف (id) صالح من الخدمة — لا يمكن تعديله.');
            console.error('❌ item.id is missing/invalid:', item);
            return;
        }

        document.getElementById('diseaseName').value = item.name || '';
        document.getElementById('diseaseDate').value = item.date || '';
        document.getElementById('diseaseMeds').value = item.meds || '';
        document.getElementById('diseaseNotes').value = item.notes || '';
        document.getElementById('chronicEditId').value = item.id;
        document.getElementById('chronicEditIndex').value = index;
        document.getElementById('chronicFormTitle').textContent = 'تعديل المرض المزمن';
        document.getElementById('chronicSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('chronicCancelBtn').classList.remove('d-none');
        chronicForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.name}`);
    };

    window.deleteChronicItem = function (index) {
        const item = chronicDiseasesList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا المرض لا يحتوي على معرّف (id) صالح من الخدمة — لا يمكن حذفه.');
            console.error('❌ item.id is missing/invalid:', item);
            return;
        }

        showConfirmModal({
            title: 'تأكيد حذف المرض المزمن',
            subtitle: 'لن تتمكن من استرجاع هذا المرض بعد الحذف',
            message: `هل أنت متأكد من حذف المرض <strong>${escapeHtml(item.name)}</strong>؟`,
            confirmText: 'نعم، احذف المرض',
            onConfirm: async () => {
                try {
                    await deleteDisease(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف المرض المزمن بنجاح.');
                    resetChronicForm();
                    await loadChronicDiseases();
                } catch (err) {
                    console.error('❌ فشل حذف المرض المزمن:', err);
                    showToast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف المرض المزمن.');
                }
            }
        });
    };

    window.resetChronicForm = function () {
        const form = document.getElementById('chronicForm');
        if (!form) return;
        form.reset();
        document.getElementById('chronicEditId').value = '';
        document.getElementById('chronicEditIndex').value = '-1';
        document.getElementById('chronicFormTitle').textContent = 'إضافة مرض مزمن جديد';
        document.getElementById('chronicSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة المرض';
        document.getElementById('chronicCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       13. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('chronicForm'));
        loadChronicDiseases();

        setTimeout(() => {
            showToast('info', 'الأمراض المزمنة', 'يمكنك إضافة وتعديل وحذف الأمراض المزمنة (الجسدية) للمريض هنا.', 5000);
        }, 1000);

        console.log('%c✅ Chronic Diseases Tab Loaded',
            'background:#10b981;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();