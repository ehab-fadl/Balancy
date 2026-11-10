/* ============================================================
   Doctor Notes Tab — API-driven (GET/POST/PUT/DELETE)
   - يطابق DoctorNoteCreateDto/UpdateDto/ResponseDto
   - Symptoms → string مفصول بفاصلة
   - LinkItemId → GUID من قوائم العناصر المحمّلة من الـ API
   - Icd10 → string
   - يحذف: localStorage + mock data
============================================================ */

(function initDoctorNotes() {
    console.log('🚀 DoctorNotes.js initialized');

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
        const form = document.getElementById('doctorNoteForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('doctorNoteForm');
        return {
            list: form?.dataset?.apiListUrl || '/Doctor?handler=DoctorNotes',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateDoctorNote',
            update: form?.dataset?.apiUpdateUrl || '/Doctor?handler=UpdateDoctorNote',
            del: form?.dataset?.apiDeleteUrl || '/Doctor?handler=DoctorNote',
            sessions: form?.dataset?.apiSessionsUrl || '/Doctor?handler=ListeningSessions',
            visits: form?.dataset?.apiVisitsUrl || '/Doctor?handler=Visits',
            plans: form?.dataset?.apiPlansUrl || '/Doctor?handler=TreatmentPlans',
            medications: form?.dataset?.apiMedicationsUrl || '/Doctor?handler=Medications'
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

    function splitCommaString(str) {
        if (!str) return [];
        return String(str).split(',').map(s => s.trim()).filter(Boolean);
    }

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

    /* ============================================================
       1. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-dn-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-dn-toast-styles';
        style.textContent = `
            .bn-dn-toast-overlay { position: fixed !important; inset: 0 !important; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
            .bn-dn-toast-overlay.show { display: flex !important; }
            .bn-dn-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnDnToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; position: relative; }
            .bn-dn-toast.hide { animation: bnDnToastOut 0.3s ease forwards; }
            .bn-dn-toast-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.22); font-size: 1.05rem; }
            .bn-dn-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-dn-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-dn-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-dn-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-dn-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-dn-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-dn-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnDnToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnDnToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnDnToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnDnToastOverlay';
            overlay.className = 'bn-dn-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-dn-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-dn-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-dn-toast-body">
                <div class="bn-dn-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-dn-toast-message">${escapeHtml(message || '')}</div>
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
        colors: ['#4338ca', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#0891b2', '#ec4899'],
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
       3. Validation
    ============================================================ */
    const bnValidation = {
        rules: {
            doctorNoteTitle: { required: true, minLength: 3, maxLength: 150, messages: { required: 'عنوان الملاحظة الطبية مطلوب', minLength: 'العنوان قصير جداً (3 أحرف على الأقل)' } },
            doctorNoteDate: { required: true, messages: { required: 'تاريخ الملاحظة مطلوب' } },
            doctorNoteType: { required: true, messages: { required: 'يرجى اختيار نوع الملاحظة' } },
            doctorNoteAuthor: { required: true, minLength: 2, maxLength: 100, messages: { required: 'اسم الكاتب مطلوب', minLength: 'الاسم قصير جداً' } },
            doctorNoteAuthorRole: { required: true, messages: { required: 'يرجى اختيار دور الكاتب' } },
            doctorNoteVisibility: { required: true, messages: { required: 'يرجى تحديد مستوى السرية' } },
            doctorNoteContent: { required: true, minLength: 10, maxLength: 5000, messages: { required: 'محتوى الملاحظة الطبية مطلوب', minLength: 'المحتوى قصير جداً (10 أحرف على الأقل)' } },
            doctorNoteIcd10: { required: false, maxLength: 100, messages: { maxLength: 'كود ICD-10 طويل جداً' } }
        },
        conditionalRules: [
            {
                id: 'riskIfIncident',
                check: function () {
                    const noteType = document.getElementById('doctorNoteType').value;
                    const risk = document.getElementById('doctorNoteRiskLevel').value;
                    if (noteType === 'Incident' && !risk) {
                        return { field: document.getElementById('doctorNoteRiskLevel'), label: 'مستوى الخطر', message: 'يجب تقييم مستوى الخطر لملاحظات الحوادث الطارئة', type: 'error' };
                    }
                    return null;
                }
            },
            {
                id: 'suicidalIdeationRisk',
                check: function () {
                    const suicidal = Array.from(document.querySelectorAll('.dn-symptom:checked')).some(c => c.value === 'أفكار انتحارية');
                    const risk = document.getElementById('doctorNoteRiskLevel').value;
                    if (suicidal && (!risk || risk === 'لا' || risk === 'منخفض')) {
                        return { field: document.getElementById('doctorNoteRiskLevel'), label: 'مستوى الخطر', message: 'عند ملاحظة أفكار انتحارية، يجب تحديد مستوى خطر متوسط على الأقل', type: 'error' };
                    }
                    return null;
                }
            }
        ],
        validators: {
            required: (v) => v !== null && v !== undefined && String(v).trim().length > 0,
            minLength: (v, len) => !v || v.trim().length >= len,
            maxLength: (v, len) => !v || v.length <= len
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
                return { valid: false, type: 'error', message: rule.messages?.minLength || `الحد الأدنى ${rule.minLength}` };
            }
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength}` };
            }
            return { valid: true, type: 'success', message: 'صحيح' };
        },
        updateFieldUI(field, result) {
            if (!field) return;
            const wrapper = field.closest('.col-md-6, .col-md-12, .col-12, .col-md-4, .col-md-8') || field.parentElement;
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
                if (field.type === 'hidden' || field.type === 'checkbox' || field.type === 'range') return;
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
            this.conditionalRules.forEach(rule => {
                const err = rule.check();
                if (err) {
                    isValid = false;
                    errors.push(err);
                    if (err.field) {
                        const wrapper = err.field.closest('.col-md-6, .col-md-12, .col-12') || err.field.parentElement;
                        if (wrapper) {
                            let msgEl = wrapper.querySelector('.bn-field-message');
                            if (!msgEl) {
                                msgEl = document.createElement('div');
                                msgEl.className = 'bn-field-message';
                                err.field.parentNode.insertBefore(msgEl, err.field.nextSibling);
                            }
                            msgEl.className = 'bn-field-message error show';
                            msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${err.message}</span>`;
                        }
                    }
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
                    if (field) {
                        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => field.focus({ preventScroll: true }), 400);
                    }
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
       4. Badge Helpers
    ============================================================ */
    function getNoteTypeBadge(type) {
        if (!type) return '';
        const map = {
            'Progress': { cls: 'type-progress', label: 'Progress', icon: 'fa-file-lines' },
            'SOAP': { cls: 'type-soap', label: 'SOAP', icon: 'fa-notes-medical' },
            'Incident': { cls: 'type-incident', label: 'Incident', icon: 'fa-bolt' },
            'Handoff': { cls: 'type-handoff', label: 'Handoff', icon: 'fa-arrow-right-arrow-left' },
            'Consultation': { cls: 'type-consultation', label: 'Consultation', icon: 'fa-comments' },
            'Discharge': { cls: 'type-discharge', label: 'Discharge', icon: 'fa-door-open' },
            'Evaluation': { cls: 'type-evaluation', label: 'Evaluation', icon: 'fa-brain' },
            'Other': { cls: 'type-other', label: 'أخرى', icon: 'fa-tag' }
        };
        const cfg = map[type] || { cls: 'type-other', label: type, icon: 'fa-tag' };
        return `<span class="dn-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(cfg.label)}</span>`;
    }

    function getRiskBadge(level) {
        if (!level) return '<span class="dn-badge risk-none"><i class="fa-solid fa-minus"></i> غير مقيم</span>';
        const map = {
            'لا': { cls: 'risk-none', icon: 'fa-shield-halved', label: 'لا يوجد' },
            'منخفض': { cls: 'risk-low', icon: 'fa-shield-halved' },
            'متوسط': { cls: 'risk-medium', icon: 'fa-triangle-exclamation' },
            'عالي': { cls: 'risk-high', icon: 'fa-exclamation-circle' },
            'حرج': { cls: 'risk-critical', icon: 'fa-skull-crossbones' }
        };
        const cfg = map[level] || { cls: 'risk-none', icon: 'fa-minus', label: level };
        return `<span class="dn-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(cfg.label || level)}</span>`;
    }

    function getVisibilityBadge(visibility) {
        if (!visibility) return '';
        const map = {
            'خاص': { cls: 'vis-private', icon: 'fa-lock', label: 'خاص' },
            'للفريق': { cls: 'vis-team', icon: 'fa-users', label: 'للفريق' },
            'للمريض': { cls: 'vis-patient', icon: 'fa-eye', label: 'للمريض' }
        };
        const cfg = map[visibility] || { cls: 'vis-private', icon: 'fa-lock', label: visibility };
        return `<span class="dn-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(cfg.label)}</span>`;
    }

    function getMoodBadge(mood) {
        if (mood === null || mood === undefined) return '';
        let cls = 'mid';
        if (mood <= 3) cls = 'low';
        else if (mood >= 7) cls = 'high';
        return `<span class="dn-mood-badge ${cls}"><i class="fa-solid fa-face-smile"></i> المزاج: ${mood}/10</span>`;
    }

    function getPriorityClass(priority) {
        switch (priority) {
            case 'عاجلة': return 'doctor-note-priority-urgent';
            case 'مهمة': return 'doctor-note-priority-important';
            default: return 'doctor-note-priority-normal';
        }
    }

    /* ============================================================
       5. Critical Alert
    ============================================================ */
    function checkForCriticalNotes() {
        const alertEl = document.getElementById('dnCriticalAlert');
        const msgEl = document.getElementById('dnCriticalMessage');
        if (!alertEl || !msgEl) return;

        const criticalNotes = doctorNotesList.filter(n => {
            const hasSuicidal = (n.symptoms || []).includes('أفكار انتحارية');
            const hasSelfHarm = (n.symptoms || []).includes('إيذاء ذاتي');
            const isCriticalRisk = n.riskLevel === 'حرج' || n.riskLevel === 'عالي';
            return hasSuicidal || hasSelfHarm || isCriticalRisk;
        });

        if (criticalNotes.length === 0) {
            alertEl.style.display = 'none';
            return;
        }

        const latest = criticalNotes[0];
        const reason = latest.riskLevel === 'حرج' ? 'خطر حرج'
            : latest.riskLevel === 'عالي' ? 'خطر عالي'
                : (latest.symptoms || []).includes('أفكار انتحارية') ? 'أفكار انتحارية'
                    : 'إيذاء ذاتي';

        msgEl.innerHTML = `يوجد <strong>${criticalNotes.length}</strong> ملاحظة طبية حرجة — آخرها: <strong>${escapeHtml(reason)}</strong> بتاريخ ${escapeHtml(latest.date)} (${escapeHtml(latest.title)})`;
        alertEl.style.display = 'flex';
    }

    /* ============================================================
       6. Confirm Modal
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
       7. Link Items from API
    ============================================================ */
    const linkItemsCache = {
        sessions: [],
        visits: [],
        plans: [],
        medications: []
    };

    async function loadLinkItems(type) {
        const patientId = getPatientId();
        if (!patientId) return [];

        const urls = getApiUrls();
        const mapUrls = {
            sessions: urls.sessions,
            visits: urls.visits,
            plans: urls.plans,
            medications: urls.medications
        };

        const url = mapUrls[type];
        if (!url) return [];

        const fullUrl = `${url}${url.includes('?') ? '&' : '?'}patientId=${encodeURIComponent(patientId)}`;
        try {
            const res = await fetch(fullUrl, {
                headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
                credentials: 'same-origin'
            });
            if (!res.ok) return [];
            const payload = await res.json();
            const arr = extractArray(payload);
            const mapped = arr.map(item => {
                const id = item.id ?? item.Id ?? '';
                let label = '';
                if (type === 'sessions') {
                    const title = item.title ?? item.Title ?? '';
                    const date = normalizeDateForInput(item.sessionDate ?? item.SessionDate);
                    label = `${title}${date ? ` (${date})` : ''}`;
                } else if (type === 'visits') {
                    const reason = item.reason ?? item.Reason ?? '';
                    const date = normalizeDateForInput(item.visitDate ?? item.VisitDate);
                    label = `${reason}${date ? ` (${date})` : ''}`;
                } else if (type === 'plans') {
                    label = item.name ?? item.Name ?? '';
                } else if (type === 'medications') {
                    label = item.name ?? item.Name ?? '';
                }
                return { id, label };
            }).filter(x => x.id);
            linkItemsCache[type] = mapped;
            return mapped;
        } catch (err) {
            console.warn('⚠️ فشل تحميل عناصر الربط:', err);
            return [];
        }
    }

    function populateLinkItems() {
        const linkType = document.getElementById('doctorNoteLinkType');
        const linkItem = document.getElementById('doctorNoteLinkItem');
        if (!linkType || !linkItem) return;

        linkType.addEventListener('change', async function () {
            const type = this.value;
            linkItem.innerHTML = '<option value="">اختر العنصر</option>';
            linkItem.disabled = !type;

            if (!type) return;

            const typeKeyMap = {
                'جلسة': 'sessions',
                'زيارة': 'visits',
                'خطة': 'plans',
                'دواء': 'medications'
            };
            const key = typeKeyMap[type];
            if (!key) return;

            const items = await loadLinkItems(key);
            items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.label;
                linkItem.appendChild(opt);
            });
        });
    }

    /* ============================================================
       8. State + Mappers
    ============================================================ */
    let doctorNotesList = [];
    let isLoadingList = false;

    function mapDoctorNoteDto(dto) {
        return {
            id: dto.id ?? dto.Id ?? '',
            patientId: dto.patientId ?? dto.PatientId ?? '',
            title: dto.title ?? dto.Title ?? '',
            date: normalizeDateForInput(dto.noteDate ?? dto.NoteDate),
            noteType: dto.noteType ?? dto.NoteType ?? '',
            category: dto.category ?? dto.Category ?? '',
            author: dto.author ?? dto.Author ?? '',
            authorRole: dto.authorRole ?? dto.AuthorRole ?? '',
            priority: dto.priority ?? dto.Priority ?? 'عادية',
            riskLevel: dto.riskLevel ?? dto.RiskLevel ?? '',
            icd10Code: dto.icd10 ?? dto.Icd10 ?? '',
            moodAtNote: dto.moodAtNote ?? dto.MoodAtNote ?? 5,
            visibility: dto.visibility ?? dto.Visibility ?? 'خاص',
            symptoms: splitCommaString(dto.symptoms ?? dto.Symptoms),
            linkType: dto.linkType ?? dto.LinkType ?? '',
            linkItemId: dto.linkItemId ?? dto.LinkItemId ?? '',
            content: dto.content ?? dto.Content ?? '',
            nextPlan: dto.nextPlan ?? dto.NextPlan ?? '',
            createdAt: dto.createdAt ?? dto.CreatedAt ?? null,
            updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? null
        };
    }

    /* ============================================================
       9. Render
    ============================================================ */
    function updateDoctorNotesCount() {
        const badge = document.getElementById('doctorNotesCountBadge');
        if (!badge) return;
        const count = doctorNotesList.length;
        badge.textContent = count === 0 ? '0 ملاحظة' : count === 1 ? 'ملاحظة واحدة' : count === 2 ? 'ملاحظتان' : count <= 10 ? `${count} ملاحظات` : `${count} ملاحظة`;
    }

    function getFilteredNotes() {
        const typeFilter = (document.getElementById('dnFilterType') || {}).value || '';
        const riskFilter = (document.getElementById('dnFilterRisk') || {}).value || '';
        return doctorNotesList.filter(n => {
            if (typeFilter && n.noteType !== typeFilter) return false;
            if (riskFilter && n.riskLevel !== riskFilter) return false;
            return true;
        });
    }

    function renderDoctorNotes() {
        const grid = document.getElementById('doctorNotesGrid');
        const emptyState = document.getElementById('doctorNotesEmptyState');
        if (!grid || !emptyState) return;

        const filtered = getFilteredNotes();
        grid.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            const p = emptyState.querySelector('p');
            if (p) p.textContent = doctorNotesList.length === 0
                ? 'لا توجد ملاحظات طبية مسجلة لهذا المريض حتى الآن.'
                : 'لا توجد ملاحظات مطابقة للفلتر.';
            updateDoctorNotesCount();
            checkForCriticalNotes();
            return;
        }
        emptyState.style.display = 'none';

        filtered.forEach((item) => {
            const realIndex = doctorNotesList.indexOf(item);
            const card = document.createElement('div');
            card.className = `doctor-note-card ${getPriorityClass(item.priority)}`;

            let symptomsHtml = '';
            if (item.symptoms && item.symptoms.length > 0) {
                symptomsHtml = '<div class="dn-symptoms">' + item.symptoms.map(s => {
                    const isCritical = s === 'أفكار انتحارية' || s === 'إيذاء ذاتي';
                    return `<span class="dn-symptom-tag ${isCritical ? 'critical' : ''}"><i class="fa-solid ${isCritical ? 'fa-triangle-exclamation' : 'fa-circle-dot'}"></i> ${escapeHtml(s)}</span>`;
                }).join('') + '</div>';
            }

            card.innerHTML = `
                <div class="dn-badges-row">
                    ${getNoteTypeBadge(item.noteType)}
                    ${getRiskBadge(item.riskLevel)}
                    ${getVisibilityBadge(item.visibility)}
                    ${getMoodBadge(item.moodAtNote)}
                </div>
                ${item.icd10Code ? `<div class="dn-icd-badge"><i class="fa-solid fa-barcode"></i> ${escapeHtml(item.icd10Code)}</div>` : ''}
                <div class="dn-author-row">
                    <i class="fa-solid fa-user-pen"></i>
                    ${escapeHtml(item.author || 'غير محدد')}${item.authorRole ? ' • ' + escapeHtml(item.authorRole) : ''}
                </div>
                <div class="doctor-note-card-header">
                    <h4 class="doctor-note-title">${escapeHtml(item.title)}</h4>
                    <span class="doctor-note-priority-badge ${getPriorityClass(item.priority)}">${escapeHtml(item.priority)}</span>
                </div>
                ${item.category ? `<div class="doctor-note-category"><i class="fa-solid fa-tag"></i> ${escapeHtml(item.category)}</div>` : ''}
                <div class="doctor-note-content">${escapeHtml(item.content)}</div>
                ${symptomsHtml}
                ${item.nextPlan ? `<div class="dn-next-plan"><i class="fa-solid fa-forward ms-1"></i> ${escapeHtml(item.nextPlan)}</div>` : ''}
                <div class="doctor-note-footer">
                    <div class="doctor-note-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${escapeHtml(item.date) || '-'}
                    </div>
                    <div class="doctor-note-actions">
                        <button type="button" class="btn btn-outline-primary" data-edit-index="${realIndex}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="btn btn-outline-danger" data-delete-index="${realIndex}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-edit-index]').forEach(btn => {
            btn.addEventListener('click', () => editDoctorNote(parseInt(btn.dataset.editIndex, 10)));
        });
        grid.querySelectorAll('[data-delete-index]').forEach(btn => {
            btn.addEventListener('click', () => deleteDoctorNote(parseInt(btn.dataset.deleteIndex, 10)));
        });

        updateDoctorNotesCount();
        checkForCriticalNotes();
    }

    /* ============================================================
       10. Load from API
    ============================================================ */
    async function loadDoctorNotes() {
        if (isLoadingList) return;
        isLoadingList = true;
        const patientId = getPatientId();
        if (!patientId) {
            doctorNotesList = [];
            renderDoctorNotes();
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
            doctorNotesList = arr.map(mapDoctorNoteDto);
            console.log('✅ Loaded doctor notes:', doctorNotesList);
            renderDoctorNotes();
        } catch (err) {
            console.error('❌ فشل تحميل ملاحظات الطبيب:', err);
            doctorNotesList = [];
            renderDoctorNotes();
            showToast('error', 'فشل التحميل', 'تعذر تحميل ملاحظات الطبيب.');
        } finally {
            isLoadingList = false;
        }
    }

    /* ============================================================
       11. Build payloads
    ============================================================ */
    function buildBasePayload() {
        const symptoms = Array.from(document.querySelectorAll('.dn-symptom:checked')).map(c => c.value);
        const linkType = document.getElementById('doctorNoteLinkType').value || null;
        const linkItem = document.getElementById('doctorNoteLinkItem').value || null;

        return {
            title: document.getElementById('doctorNoteTitle').value.trim(),
            noteDate: toIsoDateTime(document.getElementById('doctorNoteDate').value),
            noteType: document.getElementById('doctorNoteType').value,
            category: document.getElementById('doctorNoteCategory').value || null,
            author: document.getElementById('doctorNoteAuthor').value.trim(),
            authorRole: document.getElementById('doctorNoteAuthorRole').value,
            priority: document.getElementById('doctorNotePriority').value || 'عادية',
            riskLevel: document.getElementById('doctorNoteRiskLevel').value || null,
            icd10: document.getElementById('doctorNoteIcd10').value.trim() || null,
            moodAtNote: parseInt(document.getElementById('doctorNoteMoodAtNote').value, 10) || 5,
            visibility: document.getElementById('doctorNoteVisibility').value || 'خاص',
            symptoms: symptoms.length ? symptoms.join(', ') : null,
            linkType: linkType,
            linkItemId: linkType && linkItem && isValidGuid(linkItem) ? linkItem : null,
            content: document.getElementById('doctorNoteContent').value.trim(),
            nextPlan: document.getElementById('doctorNoteNextPlan').value.trim() || null
        };
    }

    function buildCreatePayload() {
        const payload = buildBasePayload();
        payload.patientId = getPatientId();
        return payload;
    }

    function buildUpdatePayload() {
        const payload = buildBasePayload();
        payload.id = document.getElementById('doctorNoteEditId').value.trim();
        return payload;
    }

    /* ============================================================
       12. API CRUD
    ============================================================ */
    async function createDoctorNoteApi(payload) {
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

    async function updateDoctorNoteApi(id, payload) {
        if (!isValidGuid(id)) throw new Error(`معرّف الملاحظة غير صالح: "${id}"`);
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

    async function deleteDoctorNoteApi(id) {
        if (!isValidGuid(id)) throw new Error(`معرّف الملاحظة غير صالح: "${id}"`);
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
    const doctorNoteForm = document.getElementById('doctorNoteForm');
    if (doctorNoteForm) {
        doctorNoteForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء.`);
                return;
            }

            const editId = document.getElementById('doctorNoteEditId').value.trim();
            const isEdit = !!editId;

            if (isEdit && !isValidGuid(editId)) {
                showToast('error', 'خطأ', `معرّف الملاحظة غير صالح: "${editId}"`);
                return;
            }

            const payload = isEdit ? buildUpdatePayload() : buildCreatePayload();
            console.log(`📤 ${isEdit ? 'PUT' : 'POST'} payload:`, payload);

            const submitBtn = document.getElementById('doctorNoteSubmitBtn');
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> جاري الحفظ...';

            try {
                if (isEdit) {
                    await updateDoctorNoteApi(editId, payload);
                    showToast('success', 'تم التعديل', 'تم تعديل الملاحظة الطبية.');
                } else {
                    await createDoctorNoteApi(payload);
                    showToast('success', 'تمت الإضافة', 'تمت إضافة الملاحظة الطبية.');
                }
                bnConfetti.fire();
                resetDoctorNoteForm();
                await loadDoctorNotes();

                if (payload.riskLevel === 'حرج' || payload.riskLevel === 'عالي') {
                    setTimeout(() => {
                        showToast('error', 'تنبيه حرج', 'تم حفظ ملاحظة طبية بمستوى خطر مرتفع — يجب المتابعة الفورية.', 6000);
                    }, 500);
                }
            } catch (err) {
                console.error('❌ فشل حفظ الملاحظة:', err);
                showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء الحفظ.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    /* ============================================================
       14. Edit / Delete / Reset
    ============================================================ */
    function editDoctorNote(index) {
        const item = doctorNotesList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذه الملاحظة لا تحتوي على معرّف (id) صالح — لا يمكن تعديلها.');
            return;
        }
        document.getElementById('doctorNoteEditId').value = item.id;
        document.getElementById('doctorNoteEditIndex').value = index;
        document.getElementById('doctorNoteTitle').value = item.title || '';
        document.getElementById('doctorNoteDate').value = item.date || '';
        document.getElementById('doctorNoteType').value = item.noteType || 'Other';
        document.getElementById('doctorNoteCategory').value = item.category || '';
        document.getElementById('doctorNoteAuthor').value = item.author || '';
        document.getElementById('doctorNoteAuthorRole').value = item.authorRole || '';
        document.getElementById('doctorNotePriority').value = item.priority || 'عادية';
        document.getElementById('doctorNoteRiskLevel').value = item.riskLevel || '';
        document.getElementById('doctorNoteMoodAtNote').value = item.moodAtNote ?? 5;
        document.getElementById('doctorNoteMoodValue').textContent = `${item.moodAtNote ?? 5} / 10`;
        document.getElementById('doctorNoteVisibility').value = item.visibility || 'خاص';
        document.getElementById('doctorNoteContent').value = item.content || '';
        document.getElementById('doctorNoteNextPlan').value = item.nextPlan || '';
        document.getElementById('doctorNoteIcd10').value = item.icd10Code || '';

        document.querySelectorAll('.dn-symptom').forEach(c => { c.checked = (item.symptoms || []).includes(c.value); });

        // تحميل عناصر الربط لو موجود
        const linkTypeEl = document.getElementById('doctorNoteLinkType');
        const linkItemEl = document.getElementById('doctorNoteLinkItem');
        linkTypeEl.value = item.linkType || '';
        if (item.linkType) {
            linkTypeEl.dispatchEvent(new Event('change'));
            setTimeout(() => {
                linkItemEl.value = item.linkItemId || '';
            }, 600);
        } else {
            linkItemEl.innerHTML = '<option value="">اختر نوع الربط أولاً</option>';
            linkItemEl.disabled = true;
        }

        document.getElementById('doctorNoteFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الملاحظة الطبية';
        document.getElementById('doctorNoteSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات';
        document.getElementById('doctorNoteCancelBtn').classList.remove('d-none');
        doctorNoteForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.title}`);
    }

    function deleteDoctorNote(index) {
        const item = doctorNotesList[index];
        if (!item) return;
        if (!item.id || !isValidGuid(item.id)) {
            showToast('error', 'خطأ', 'هذه الملاحظة لا تحتوي على معرّف (id) صالح — لا يمكن حذفها.');
            return;
        }
        showConfirmModal({
            title: 'تأكيد حذف الملاحظة الطبية',
            subtitle: 'لن تتمكن من استرجاع الملاحظة بعد الحذف',
            message: `هل أنت متأكد من حذف الملاحظة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الملاحظة',
            onConfirm: async () => {
                try {
                    await deleteDoctorNoteApi(item.id);
                    showToast('success', 'تم الحذف', 'تم حذف الملاحظة الطبية.');
                    resetDoctorNoteForm();
                    await loadDoctorNotes();
                } catch (err) {
                    console.error('❌ فشل حذف الملاحظة:', err);
                    showToast('error', 'فشل', err.message || 'حدث خطأ أثناء الحذف.');
                }
            }
        });
    }

    window.resetDoctorNoteForm = function () {
        const form = document.getElementById('doctorNoteForm');
        if (!form) return;
        form.reset();
        document.getElementById('doctorNoteEditIndex').value = '-1';
        document.getElementById('doctorNoteEditId').value = '';
        document.getElementById('doctorNotePriority').value = 'عادية';
        document.getElementById('doctorNoteVisibility').value = 'خاص';
        document.getElementById('doctorNoteMoodAtNote').value = 5;
        document.getElementById('doctorNoteMoodValue').textContent = '5 / 10';
        document.getElementById('doctorNoteLinkItem').innerHTML = '<option value="">اختر نوع الربط أولاً</option>';
        document.getElementById('doctorNoteLinkItem').disabled = true;
        document.querySelectorAll('.dn-symptom').forEach(c => c.checked = false);
        document.getElementById('doctorNoteFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة ملاحظة طبية جديدة';
        document.getElementById('doctorNoteSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة الملاحظة الطبية';
        document.getElementById('doctorNoteCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       15. Init
    ============================================================ */
    function doInit() {
        bnValidation.attachToForm(document.getElementById('doctorNoteForm'));
        populateLinkItems();

        // ضبط تاريخ اليوم افتراضياً
        const noteDateEl = document.getElementById('doctorNoteDate');
        if (noteDateEl && !noteDateEl.value) {
            noteDateEl.value = new Date().toISOString().slice(0, 10);
        }

        // Mood slider
        const moodEl = document.getElementById('doctorNoteMoodAtNote');
        const moodValEl = document.getElementById('doctorNoteMoodValue');
        if (moodEl && moodValEl) {
            moodEl.addEventListener('input', function () {
                moodValEl.textContent = `${this.value} / 10`;
            });
        }

        // Filters
        const filterType = document.getElementById('dnFilterType');
        const filterRisk = document.getElementById('dnFilterRisk');
        if (filterType) filterType.addEventListener('change', renderDoctorNotes);
        if (filterRisk) filterRisk.addEventListener('change', renderDoctorNotes);

        // Critical alert close
        const criticalClose = document.getElementById('dnCriticalClose');
        if (criticalClose) {
            criticalClose.addEventListener('click', () => {
                document.getElementById('dnCriticalAlert').style.display = 'none';
            });
        }

        loadDoctorNotes();

        setTimeout(() => {
            showToast('info', 'ملاحظات الطبيب المعالج', 'سجّل الملاحظات الطبية مع النوع، الخطر، الأعراض، والسرية.', 5000);
        }, 1000);

        console.log('%c✅ Doctor Notes Tab Loaded',
            'background:#4338ca;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();