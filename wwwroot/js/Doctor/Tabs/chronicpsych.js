/* ============================================================
   Chronic Psychiatric Diseases Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق DTOs الباك إند (Create/Update/Response)
   - يحافظ على: Validation, Toast, Confirm Modal, Badges, الأنماط
   - يحذف: mock list + localStorage
============================================================ */

(function initChronicPsych() {
    console.log('🚀 ChronicPsych.js initialized');

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
        const form = document.getElementById('chronicPsychForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('chronicPsychForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=ChronicPsychDiseases',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateChronicPsychDisease',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateChronicPsychDisease',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=ChronicPsychDisease'
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
       2. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-cp-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-cp-toast-styles';
        style.textContent = `
            .bn-cp-toast-overlay {
                position: fixed; inset: 0;
                display: none; align-items: center; justify-content: center;
                z-index: 100000; pointer-events: none; padding: 1rem;
            }
            .bn-cp-toast-overlay.show { display: flex; }
            .bn-cp-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnCpToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5;
            }
            .bn-cp-toast.hide { animation: bnCpToastOut 0.3s ease forwards; }
            .bn-cp-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-cp-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-cp-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-cp-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-cp-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-cp-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-cp-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-cp-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnCpToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnCpToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.92); }
            }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        let overlay = document.getElementById('bnCpToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnCpToastOverlay';
            overlay.className = 'bn-cp-toast-overlay';
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
        toast.className = `bn-cp-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-cp-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-cp-toast-body">
                <div class="bn-cp-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-cp-toast-message">${escapeHtml(message || '')}</div>
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
            cpName: {
                required: true, minLength: 2, maxLength: 100,
                noWhitespaceOnly: true,
                messages: {
                    required: 'اسم المرض النفسي مطلوب',
                    minLength: 'اسم المرض قصير جداً (حرفان على الأقل)',
                    maxLength: 'اسم المرض طويل جداً',
                    noWhitespaceOnly: 'لا يمكن أن يكون اسم المرض فارغاً'
                }
            },
            cpDate: {
                required: true, dateNotFuture: true,
                messages: {
                    required: 'تاريخ التشخيص مطلوب',
                    dateNotFuture: 'التاريخ لا يمكن أن يكون مستقبلياً'
                }
            },
            cpHospitalization: {
                required: true,
                messages: { required: 'يرجى تحديد حالة الدخول للمصح' }
            },
            cpMeds: {
                required: true, minLength: 2, maxLength: 200,
                noWhitespaceOnly: true,
                messages: {
                    required: 'الأدوية مطلوبة',
                    minLength: 'يرجى كتابة اسم الدواء على الأقل',
                    maxLength: 'قائمة الأدوية طويلة جداً',
                    noWhitespaceOnly: 'لا يمكن أن تكون الأدوية فارغة'
                }
            },
            cpSeverity: { required: true, messages: { required: 'يرجى اختيار شدة المرض' } },
            cpResponse: { required: true, messages: { required: 'يرجى اختيار مستوى الاستجابة' } }
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
       5. Badge Helpers
    ============================================================ */
    function getSeverityBadge(severity) {
        switch (severity) {
            case 'بسيط': return '<span class="badge-soft badge-mild"><i class="fa-solid fa-circle-check"></i> بسيط</span>';
            case 'متوسط': return '<span class="badge-soft badge-moderate"><i class="fa-solid fa-circle-half-stroke"></i> متوسط</span>';
            case 'شديد': return '<span class="badge-soft badge-severe"><i class="fa-solid fa-circle-exclamation"></i> شديد</span>';
            case 'حرج': return '<span class="badge-soft badge-critical"><i class="fa-solid fa-triangle-exclamation"></i> حرج</span>';
            default: return `<span class="badge-soft">${escapeHtml(severity || '-')}</span>`;
        }
    }

    function getResponseBadge(response) {
        switch (response) {
            case 'ممتازة': return '<span class="badge-soft badge-response-excellent"><i class="fa-solid fa-star"></i> ممتازة</span>';
            case 'جيدة': return '<span class="badge-soft badge-response-good"><i class="fa-solid fa-thumbs-up"></i> جيدة</span>';
            case 'جزئية': return '<span class="badge-soft badge-response-partial"><i class="fa-solid fa-circle-half-stroke"></i> جزئية</span>';
            case 'ضعيفة / مقاومة': return '<span class="badge-soft badge-response-poor"><i class="fa-solid fa-circle-xmark"></i> ضعيفة / مقاومة</span>';
            default: return `<span class="badge-soft">${escapeHtml(response || '-')}</span>`;
        }
    }

    function getHospitalizationBadge(value) {
        if (value === 'نعم') return '<span class="badge-soft badge-hospital-yes"><i class="fa-solid fa-hospital"></i> نعم</span>';
        if (value === 'لا') return '<span class="badge-soft badge-hospital-no"><i class="fa-solid fa-house-medical"></i> لا</span>';
        return `<span class="badge-soft">${escapeHtml(value || '-')}</span>`;
    }

    /* ============================================================
       6. State
    ============================================================ */
    let chronicPsychList = [];
    let isLoadingList = false;

    /* ============================================================
       7. Extract / mapping helpers
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

    function mapPsychDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            name: dto.name ?? dto.Name ?? '',
            date: normalizeDateForInput(dto.diagnosisDate ?? dto.DiagnosisDate),
            hospitalization: dto.hospitalization ?? dto.Hospitalization ?? '',
            meds: dto.medications ?? dto.Medications ?? '',
            severity: dto.severity ?? dto.Severity ?? '',
            response: dto.response ?? dto.Response ?? '',
            notes: dto.notes ?? dto.Notes ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       8. Render table
    ============================================================ */
    function renderChronicPsychTable() {
        const tbody = document.getElementById('chronicPsychTableBody');
        const emptyState = document.getElementById('chronicPsychEmptyState');
        const badge = document.getElementById('cpCountBadge');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = chronicPsychList.length === 0 ? 'block' : 'none';

        if (badge) {
            if (chronicPsychList.length > 0) {
                badge.textContent = chronicPsychList.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        chronicPsychList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `cp-rowSlideIn 0.35s ease ${index * 0.05}s both`;
            tr.innerHTML = `
                <td data-label="#">
                    <span class="table-index">${index + 1}</span>
                </td>
                <td data-label="اسم المرض">
                    <span class="disease-name">
                        <i class="fa-solid fa-brain"></i>
                        ${escapeHtml(item.name)}
                    </span>
                </td>
                <td data-label="تاريخ التشخيص">${escapeHtml(item.date || '—')}</td>
                <td data-label="دخول لمصح">${getHospitalizationBadge(item.hospitalization)}</td>
                <td data-label="الأدوية">${escapeHtml(item.meds || '—')}</td>
                <td data-label="الشدة">${getSeverityBadge(item.severity)}</td>
                <td data-label="الاستجابة">${getResponseBadge(item.response)}</td>
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
                window.editChronicPsychItem(i);
            });
        });
        tbody.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.deleteIndex, 10);
                window.deleteChronicPsychItem(i);
            });
        });
    }

    /* ============================================================
       9. Load list from API
    ============================================================ */
    async function loadChronicPsychDiseases() {
        if (isLoadingList) return;
        isLoadingList = true;

        const patientId = getPatientId();
        if (!patientId) {
            console.warn('⚠️ No patientId — cannot load chronic psych diseases');
            chronicPsychList = [];
            renderChronicPsychTable();
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
            chronicPsychList = arr.map(mapPsychDto);

            console.log('✅ Loaded chronic psych diseases:', chronicPsychList);
            renderChronicPsychTable();
        } catch (err) {
            console.error('❌ فشل تحميل الأمراض النفسية:', err);
            chronicPsychList = [];
            renderChronicPsychTable();
            showToast('error', 'فشل التحميل', 'تعذر تحميل الأمراض النفسية من الخدمة.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       10. Build payload
    ============================================================ */
    function buildCreatePayload() {
        const patientId = getPatientId();
        return {
            patientId: patientId,
            name: document.getElementById('cpName').value.trim(),
            diagnosisDate: toIsoDateTime(document.getElementById('cpDate').value),
            hospitalization: document.getElementById('cpHospitalization').value,
            medications: document.getElementById('cpMeds').value.trim(),
            severity: document.getElementById('cpSeverity').value,
            response: document.getElementById('cpResponse').value,
            notes: document.getElementById('cpNotes').value.trim() || null
        };
    }

    function buildUpdatePayload() {
        const editId = document.getElementById('cpEditId').value.trim();
        return {
            id: editId,
            name: document.getElementById('cpName').value.trim(),
            diagnosisDate: toIsoDateTime(document.getElementById('cpDate').value),
            hospitalization: document.getElementById('cpHospitalization').value,
            medications: document.getElementById('cpMeds').value.trim(),
            severity: document.getElementById('cpSeverity').value,
            response: document.getElementById('cpResponse').value,
            notes: document.getElementById('cpNotes').value.trim() || null
        };
    }

    /* ============================================================
       11. Create / Update / Delete
    ============================================================ */
    async function createPsychDisease(payload) {
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

    async function updatePsychDisease(id, payload) {
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

    async function deletePsychDisease(id) {
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
       12. Form submit
    ============================================================ */
    const chronicPsychForm = document.getElementById('chronicPsychForm');
    if (chronicPsychForm) {
        chronicPsychForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editId = document.getElementById('cpEditId').value.trim();
            const isEdit = !!editId;

            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف المرض غير صالح: "${editId}". جرّب إعادة تحميل الصفحة.`);
                return;
            }

            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('cpSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updatePsychDisease(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تحديث المرض النفسي بنجاح.');
                } else {
                    await createPsychDisease(payload);
                    showToast('success', 'تم الإضافة', 'تمت إضافة المرض النفسي بنجاح.');
                }
                resetChronicPsychForm();
                await loadChronicPsychDiseases();
            } catch (err) {
                console.error('❌ فشل حفظ المرض النفسي:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ المرض النفسي.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       13. Edit / Delete / Reset
    ============================================================ */
    window.editChronicPsychItem = function (index) {
        const item = chronicPsychList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا المرض لا يحتوي على معرّف (id) صالح — لا يمكن تعديله.');
            console.error('❌ item.id is missing/invalid:', item);
            return;
        }

        document.getElementById('cpName').value = item.name || '';
        document.getElementById('cpDate').value = item.date || '';
        document.getElementById('cpHospitalization').value = item.hospitalization || '';
        document.getElementById('cpMeds').value = item.meds || '';
        document.getElementById('cpSeverity').value = item.severity || '';
        document.getElementById('cpResponse').value = item.response || '';
        document.getElementById('cpNotes').value = item.notes || '';
        document.getElementById('cpEditId').value = item.id;
        document.getElementById('cpEditIndex').value = index;
        document.getElementById('cpFormTitle').textContent = 'تعديل المرض النفسي';
        document.getElementById('cpSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('cpCancelBtn').classList.remove('d-none');
        chronicPsychForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.name}`);
    };

    window.deleteChronicPsychItem = function (index) {
        const item = chronicPsychList[index];
        if (!item) return;

        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذا المرض لا يحتوي على معرّف (id) صالح — لا يمكن حذفه.');
            return;
        }

        showConfirmModal({
            title: 'تأكيد حذف المرض النفسي',
            subtitle: 'لن تتمكن من استرجاع هذا المرض بعد الحذف',
            message: `هل أنت متأكد من حذف المرض النفسي <strong>${escapeHtml(item.name)}</strong>؟`,
            confirmText: 'نعم، احذف المرض',
            onConfirm: async () => {
                try {
                    await deletePsychDisease(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف المرض النفسي بنجاح.');
                    resetChronicPsychForm();
                    await loadChronicPsychDiseases();
                } catch (err) {
                    console.error('❌ فشل حذف المرض النفسي:', err);
                    showToast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف المرض النفسي.');
                }
            }
        });
    };

    window.resetChronicPsychForm = function () {
        const form = document.getElementById('chronicPsychForm');
        if (!form) return;
        form.reset();
        document.getElementById('cpEditId').value = '';
        document.getElementById('cpEditIndex').value = '-1';
        document.getElementById('cpFormTitle').textContent = 'إضافة مرض نفسي مزمن جديد';
        document.getElementById('cpSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة المرض النفسي';
        document.getElementById('cpCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       14. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('chronicPsychForm'));
        loadChronicPsychDiseases();

        setTimeout(() => {
            showToast('info', 'الأمراض النفسية المزمنة', 'يمكنك إضافة وتعديل وحذف الأمراض النفسية المزمنة للمريض هنا، مع تتبع الاستجابة للعلاج.', 5000);
        }, 1000);

        console.log('%c✅ Chronic Psychiatric Tab Loaded',
            'background:#f59e0b;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();