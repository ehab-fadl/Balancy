/* ============================================================
   Doctor Notes Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initDoctorNotes() {
    console.log('🚀 DoctorNotes.js initialized');

    /* ============================================================
       1. Storage Layer
    ============================================================ */
    const storage = (window.bnApp && window.bnApp.bnStorage) ? window.bnApp.bnStorage : {
        prefix: 'balancy_',
        isAvailable() {
            try { const t = '__bn_test__'; localStorage.setItem(t, t); localStorage.removeItem(t); return true; }
            catch (e) { return false; }
        },
        get(key, defaultValue = null) {
            if (!this.isAvailable()) return defaultValue;
            try { const raw = localStorage.getItem(this.prefix + key); return raw ? JSON.parse(raw) : defaultValue; }
            catch (e) { return defaultValue; }
        },
        set(key, value) {
            if (!this.isAvailable()) return false;
            try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); return true; }
            catch (e) { return false; }
        },
        remove(key) {
            if (!this.isAvailable()) return;
            try { localStorage.removeItem(this.prefix + key); } catch (e) { }
        }
    };

    /* ============================================================
       2. Utilities — escapeHtml
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       3. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-dn-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-dn-toast-styles';
        style.textContent = `
            .bn-dn-toast-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 100000; pointer-events: none; padding: 1rem; }
            .bn-dn-toast-overlay.show { display: flex; }
            .bn-dn-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnDnToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; }
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

    const showToast = (window.bnApp && typeof window.bnApp.showToast === 'function')
        ? window.bnApp.showToast
        : showBuiltInToast;

    /* ============================================================
       4. Confetti
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
            const pieceCount = 60;
            for (let i = 0; i < pieceCount; i++) {
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
       5. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            doctorNoteTitle: {
                required: true, minLength: 3, maxLength: 150,
                messages: {
                    required: 'عنوان الملاحظة الطبية مطلوب',
                    minLength: 'العنوان قصير جداً (3 أحرف على الأقل)',
                    maxLength: 'العنوان طويل جداً'
                }
            },
            doctorNoteDate: {
                required: true,
                messages: { required: 'تاريخ الملاحظة مطلوب' }
            },
            doctorNoteType: {
                required: true,
                messages: { required: 'يرجى اختيار نوع الملاحظة' }
            },
            doctorNoteAuthor: {
                required: true, minLength: 2, maxLength: 100,
                messages: { required: 'اسم الكاتب مطلوب', minLength: 'الاسم قصير جداً' }
            },
            doctorNoteAuthorRole: {
                required: true,
                messages: { required: 'يرجى اختيار دور الكاتب' }
            },
            doctorNoteVisibility: {
                required: true,
                messages: { required: 'يرجى تحديد مستوى السرية' }
            },
            doctorNoteContent: {
                required: true, minLength: 10, maxLength: 5000,
                messages: {
                    required: 'محتوى الملاحظة الطبية مطلوب',
                    minLength: 'المحتوى قصير جداً (10 أحرف على الأقل)',
                    maxLength: 'الحد الأقصى 5000 حرف'
                }
            },
            doctorNoteIcd10: {
                required: false, maxLength: 100,
                messages: { maxLength: 'كود ICD-10 طويل جداً' }
            }
        },

        // قواعد شرطية
        conditionalRules: [
            {
                id: 'riskIfIncident',
                check: function () {
                    const noteType = document.getElementById('doctorNoteType').value;
                    const risk = document.getElementById('doctorNoteRiskLevel').value;
                    if (noteType === 'Incident' && !risk) {
                        return {
                            field: document.getElementById('doctorNoteRiskLevel'),
                            label: 'مستوى الخطر',
                            message: 'يجب تقييم مستوى الخطر لملاحظات الحوادث الطارئة',
                            type: 'error'
                        };
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
                        return {
                            field: document.getElementById('doctorNoteRiskLevel'),
                            label: 'مستوى الخطر',
                            message: 'عند ملاحظة أفكار انتحارية، يجب تحديد مستوى خطر متوسط على الأقل',
                            type: 'error'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'linkItemRequired',
                check: function () {
                    const linkType = document.getElementById('doctorNoteLinkType').value;
                    const linkItem = document.getElementById('doctorNoteLinkItem').value;
                    if (linkType && !linkItem) {
                        return {
                            field: document.getElementById('doctorNoteLinkItem'),
                            label: 'ربط بعنصر',
                            message: 'اختر العنصر الذي تريد ربط الملاحظة به',
                            type: 'error'
                        };
                    }
                    return null;
                }
            },
            {
                id: 'evaluationMoodRequired',
                check: function () {
                    const noteType = document.getElementById('doctorNoteType').value;
                    if (noteType === 'Evaluation') {
                        const mood = document.getElementById('doctorNoteMoodAtNote').value;
                        if (mood === '' || mood === null) {
                            return {
                                field: document.getElementById('doctorNoteMoodAtNote'),
                                label: 'المزاج',
                                message: 'يجب تحديد مزاج المريض في التقييم النفسي',
                                type: 'error'
                            };
                        }
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
                    errors.push({ field, label: labelText, message: result.message, type: 'error' });
                }
            });

            this.conditionalRules.forEach(rule => {
                const err = rule.check();
                if (err) {
                    isValid = false;
                    errors.push(err);
                    if (err.field) {
                        const wrapper = err.field.closest('.col-md-6, .col-md-12, .col-12, .col-md-4, .col-md-8') || err.field.parentElement;
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
       6. Badge Helpers
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

    function getDoctorNotePriorityClass(priority) {
        switch (priority) {
            case 'عاجلة': return 'doctor-note-priority-urgent';
            case 'مهمة': return 'doctor-note-priority-important';
            default: return 'doctor-note-priority-normal';
        }
    }

    /* ============================================================
       7. Critical Alert
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
       8. Confirm Modal
    ============================================================ */
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

        const cleanup = () => {
            modal.classList.remove('show');
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
       9. Load Link Items
    ============================================================ */
    function populateLinkItems() {
        const linkType = document.getElementById('doctorNoteLinkType');
        const linkItem = document.getElementById('doctorNoteLinkItem');
        if (!linkType || !linkItem) return;

        linkType.addEventListener('change', function () {
            const type = this.value;
            linkItem.innerHTML = '<option value="">اختر العنصر</option>';
            linkItem.disabled = !type;

            if (!type) return;

            let items = [];
            if (type === 'جلسة') {
                items = storage.get('listeningSessions', []).map(s => ({ value: s.title, label: `${s.title} (${s.date})` }));
            } else if (type === 'زيارة') {
                items = storage.get('visits', []).map(v => ({ value: v.reason, label: `${v.reason} (${v.visitDate})` }));
            } else if (type === 'خطة') {
                items = storage.get('treatmentPlans', []).map(p => ({ value: p.name, label: p.name }));
            } else if (type === 'دواء') {
                items = storage.get('medications', []).map(m => ({ value: m.name, label: m.name }));
            }

            items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.value;
                opt.textContent = item.label;
                linkItem.appendChild(opt);
            });
        });
    }

    /* ============================================================
       10. CRUD
    ============================================================ */
    let doctorNotesList = storage.get('doctorNotes', [
        {
            title: 'التشخيص الأولي للحالة',
            date: '2024-01-08',
            category: 'تشخيص',
            priority: 'مهمة',
            content: 'بناءً على التقييم الإكلينيكي الأولي، تم تشخيص الحالة باضطراب القلق العام المصحوب بأعراض اكتئابية متوسطة.',
            noteType: 'Progress',
            author: 'د. أحمد',
            authorRole: 'طبيب',
            visibility: 'خاص',
            riskLevel: 'منخفض',
            moodAtNote: 5,
            symptoms: ['قلق'],
            icd10Code: 'F41.1 - اضطراب القلق العام',
            nextPlan: 'بدء العلاج الدوائي والسلوكي',
            linkType: '',
            linkItem: ''
        },
        {
            title: 'تعديل الخطة العلاجية',
            date: '2024-01-20',
            category: 'خطة علاجية',
            priority: 'عاجلة',
            content: 'نظراً لعدم الاستجابة الكافية، تقرر رفع الجرعة تدريجياً مع إضافة مضاد قلق قصير المفعول.',
            noteType: 'SOAP',
            author: 'د. أحمد',
            authorRole: 'طبيب',
            visibility: 'للفريق',
            riskLevel: 'متوسط',
            moodAtNote: 4,
            symptoms: ['قلق', 'أرق'],
            icd10Code: 'F41.1',
            nextPlan: 'متابعة بعد أسبوعين',
            linkType: 'خطة',
            linkItem: ''
        }
    ]);

    // ترحيل البيانات القديمة
    doctorNotesList = doctorNotesList.map(n => {
        if (n.noteType === undefined) n.noteType = 'Other';
        if (n.author === undefined) n.author = '';
        if (n.authorRole === undefined) n.authorRole = '';
        if (n.visibility === undefined) n.visibility = 'خاص';
        if (n.riskLevel === undefined) n.riskLevel = '';
        if (n.moodAtNote === undefined) n.moodAtNote = null;
        if (!Array.isArray(n.symptoms)) n.symptoms = [];
        if (n.icd10Code === undefined) n.icd10Code = '';
        if (n.nextPlan === undefined) n.nextPlan = '';
        if (n.linkType === undefined) n.linkType = '';
        if (n.linkItem === undefined) n.linkItem = '';
        return n;
    });
    storage.set('doctorNotes', doctorNotesList);

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
            emptyState.querySelector('p').textContent = doctorNotesList.length === 0
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
            card.className = `doctor-note-card ${getDoctorNotePriorityClass(item.priority)}`;

            let symptomsHtml = '';
            if (item.symptoms && item.symptoms.length > 0) {
                symptomsHtml = '<div class="dn-symptoms">' + item.symptoms.map(s => {
                    const isCritical = s === 'أفكار انتحارية' || s === 'إيذاء ذاتي';
                    return `<span class="dn-symptom-tag ${isCritical ? 'critical' : ''}"><i class="fa-solid ${isCritical ? 'fa-triangle-exclamation' : 'fa-circle-dot'}"></i> ${escapeHtml(s)}</span>`;
                }).join('') + '</div>';
            }

            let linkBadge = '';
            if (item.linkType && item.linkItem) {
                linkBadge = `<span class="dn-link-badge"><i class="fa-solid fa-link"></i> ${escapeHtml(item.linkType)}: ${escapeHtml(item.linkItem)}</span>`;
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
                    <span class="doctor-note-priority-badge ${getDoctorNotePriorityClass(item.priority)}">${escapeHtml(item.priority)}</span>
                </div>
                ${item.category ? `<div class="doctor-note-category"><i class="fa-solid fa-tag"></i> ${escapeHtml(item.category)}</div>` : ''}
                <div class="doctor-note-content">${escapeHtml(item.content)}</div>
                ${symptomsHtml}
                ${item.nextPlan ? `<div class="dn-next-plan"><i class="fa-solid fa-forward ms-1"></i> ${escapeHtml(item.nextPlan)}</div>` : ''}
                ${linkBadge ? `<div style="margin-top:0.5rem;">${linkBadge}</div>` : ''}
                <div class="doctor-note-footer">
                    <div class="doctor-note-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${escapeHtml(item.date) || '-'}
                    </div>
                    <div class="doctor-note-actions">
                        <button type="button" class="btn btn-outline-primary" onclick="editDoctorNote(${realIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteDoctorNote(${realIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        updateDoctorNotesCount();
        checkForCriticalNotes();
    }

    /* ============================================================
       11. Form Submit
    ============================================================ */
    const doctorNoteForm = document.getElementById('doctorNoteForm');
    if (doctorNoteForm) {
        doctorNoteForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('doctorNoteEditIndex').value, 10);
            const symptoms = Array.from(document.querySelectorAll('.dn-symptom:checked')).map(c => c.value);
            const item = {
                title: document.getElementById('doctorNoteTitle').value.trim(),
                date: document.getElementById('doctorNoteDate').value,
                noteType: document.getElementById('doctorNoteType').value,
                category: document.getElementById('doctorNoteCategory').value,
                author: document.getElementById('doctorNoteAuthor').value.trim(),
                authorRole: document.getElementById('doctorNoteAuthorRole').value,
                priority: document.getElementById('doctorNotePriority').value || 'عادية',
                riskLevel: document.getElementById('doctorNoteRiskLevel').value,
                moodAtNote: parseInt(document.getElementById('doctorNoteMoodAtNote').value) || 5,
                visibility: document.getElementById('doctorNoteVisibility').value,
                symptoms: symptoms,
                icd10Code: document.getElementById('doctorNoteIcd10').value.trim(),
                linkType: document.getElementById('doctorNoteLinkType').value,
                linkItem: document.getElementById('doctorNoteLinkItem').value,
                content: document.getElementById('doctorNoteContent').value.trim(),
                nextPlan: document.getElementById('doctorNoteNextPlan').value.trim()
            };

            if (editIndex >= 0) {
                doctorNotesList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تعديل الملاحظة الطبية.');
            } else {
                doctorNotesList.unshift(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة الملاحظة الطبية.');
            }

            storage.set('doctorNotes', doctorNotesList);
            renderDoctorNotes();
            resetDoctorNoteForm();
            bnConfetti.fire();

            if (item.riskLevel === 'حرج' || item.riskLevel === 'عالي') {
                setTimeout(() => {
                    showToast('error', 'تنبيه حرج', 'تم حفظ ملاحظة طبية بمستوى خطر مرتفع — يجب المتابعة الفورية.', 6000);
                }, 500);
            }
        });
    }

    /* ============================================================
       12. Edit / Delete / Reset
    ============================================================ */
    window.editDoctorNote = function (index) {
        const item = doctorNotesList[index];
        if (!item) return;

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
        document.getElementById('doctorNoteLinkType').value = item.linkType || '';

        const linkItem = document.getElementById('doctorNoteLinkItem');
        if (item.linkType) {
            const linkTypeEvent = new Event('change');
            document.getElementById('doctorNoteLinkType').dispatchEvent(linkTypeEvent);
            setTimeout(() => {
                linkItem.value = item.linkItem || '';
            }, 50);
        }

        document.querySelectorAll('.dn-symptom').forEach(c => { c.checked = (item.symptoms || []).includes(c.value); });

        document.getElementById('doctorNoteEditIndex').value = index;
        document.getElementById('doctorNoteFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الملاحظة الطبية';
        document.getElementById('doctorNoteSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات';
        document.getElementById('doctorNoteCancelBtn').classList.remove('d-none');
        document.getElementById('doctorNoteForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.title}`);
    };

    window.deleteDoctorNote = function (index) {
        if (index < 0 || index >= doctorNotesList.length) return;
        const item = doctorNotesList[index];
        showConfirmModal({
            title: 'تأكيد حذف الملاحظة الطبية',
            subtitle: 'لن تتمكن من استرجاع الملاحظة بعد الحذف',
            message: `هل أنت متأكد من حذف الملاحظة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الملاحظة',
            onConfirm: () => {
                doctorNotesList.splice(index, 1);
                storage.set('doctorNotes', doctorNotesList);
                renderDoctorNotes();
                resetDoctorNoteForm();
                showToast('success', 'تم الحذف', 'تم حذف الملاحظة الطبية.');
            }
        });
    };

    window.resetDoctorNoteForm = function () {
        const form = document.getElementById('doctorNoteForm');
        if (!form) return;
        form.reset();
        document.getElementById('doctorNoteEditIndex').value = '-1';
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
       13. Init
    ============================================================ */
    function doInit() {
        renderDoctorNotes();
        bnValidation.attachToForm(document.getElementById('doctorNoteForm'));
        populateLinkItems();

        const moodEl = document.getElementById('doctorNoteMoodAtNote');
        const moodValEl = document.getElementById('doctorNoteMoodValue');
        if (moodEl && moodValEl) {
            moodEl.addEventListener('input', function () {
                moodValEl.textContent = `${this.value} / 10`;
            });
        }

        const filterType = document.getElementById('dnFilterType');
        const filterRisk = document.getElementById('dnFilterRisk');
        if (filterType) filterType.addEventListener('change', renderDoctorNotes);
        if (filterRisk) filterRisk.addEventListener('change', renderDoctorNotes);

        const criticalClose = document.getElementById('dnCriticalClose');
        if (criticalClose) {
            criticalClose.addEventListener('click', () => {
                document.getElementById('dnCriticalAlert').style.display = 'none';
            });
        }

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