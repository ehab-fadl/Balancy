/* ============================================================
   Patient Notes Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initPatientNotes() {
    console.log('🚀 PatientNotes.js initialized');

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
        if (document.getElementById('bn-pn-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-pn-toast-styles';
        style.textContent = `
            .bn-pn-toast-overlay { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
            .bn-pn-toast-overlay.show { display: flex !important; }
            .bn-pn-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnPnToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; position: relative; }
            .bn-pn-toast.hide { animation: bnPnToastOut 0.3s ease forwards; }
            .bn-pn-toast-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.22); font-size: 1.05rem; }
            .bn-pn-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-pn-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-pn-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-pn-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-pn-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-pn-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-pn-toast.info { background: linear-gradient(135deg, #6366f1, #4338ca); }
            @keyframes bnPnToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnPnToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnPnToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnPnToastOverlay';
            overlay.className = 'bn-pn-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-pn-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-pn-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-pn-toast-body">
                <div class="bn-pn-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-pn-toast-message">${escapeHtml(message || '')}</div>
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
       4. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#6366f1', '#8b5cf6', '#818cf8', '#10b981', '#f59e0b', '#ec4899', '#0891b2'],
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
       5. Validation Engine — مع القواعد الجديدة
    ============================================================ */
    const bnValidation = {
        rules: {
            noteTitle: {
                required: true, minLength: 3, maxLength: 150,
                messages: {
                    required: 'عنوان الملاحظة مطلوب',
                    minLength: 'العنوان قصير جداً (3 أحرف على الأقل)',
                    maxLength: 'العنوان طويل جداً'
                }
            },
            noteDate: {
                required: true,
                messages: { required: 'تاريخ الملاحظة مطلوب' }
            },
            noteType: {
                required: true,
                messages: { required: 'يرجى اختيار نوع الملاحظة' }
            },
            noteAuthor: {
                required: true, minLength: 2, maxLength: 100,
                messages: { required: 'اسم الكاتب مطلوب', minLength: 'الاسم قصير جداً' }
            },
            noteAuthorRole: {
                required: true,
                messages: { required: 'يرجى اختيار دور الكاتب' }
            },
            noteVisibility: {
                required: true,
                messages: { required: 'يرجى تحديد مستوى السرية' }
            },
            noteContent: {
                required: true, minLength: 10, maxLength: 3000,
                messages: {
                    required: 'محتوى الملاحظة مطلوب',
                    minLength: 'المحتوى قصير جداً (10 أحرف على الأقل)',
                    maxLength: 'الحد الأقصى 3000 حرف'
                }
            }
        },

        // ✅ قواعد شرطية
        conditionalRules: [
            {
                id: 'riskIfIncident',
                check: function () {
                    const noteType = document.getElementById('noteType').value;
                    const risk = document.getElementById('noteRiskLevel').value;
                    if (noteType === 'Incident' && !risk) {
                        return {
                            field: document.getElementById('noteRiskLevel'),
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
                    const suicidal = Array.from(document.querySelectorAll('.pn-symptom:checked')).some(c => c.value === 'أفكار انتحارية');
                    const risk = document.getElementById('noteRiskLevel').value;
                    if (suicidal && (!risk || risk === 'لا' || risk === 'منخفض')) {
                        return {
                            field: document.getElementById('noteRiskLevel'),
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
                    const linkType = document.getElementById('noteLinkType').value;
                    const linkItem = document.getElementById('noteLinkItem').value;
                    if (linkType && !linkItem) {
                        return {
                            field: document.getElementById('noteLinkItem'),
                            label: 'ربط بعنصر',
                            message: 'اختر العنصر الذي تريد ربط الملاحظة به',
                            type: 'error'
                        };
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

            // القواعد الشرطية
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
                    <button type="button" class="bn-summary-close" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <ul>
                    ${errors.map((e, i) => `<li data-error-index="${i}">${e.label}: ${e.message}</li>`).join('')}
                </ul>
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

            const closeBtn = summary.querySelector('.bn-summary-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    summary.style.transition = 'opacity 0.3s ease';
                    summary.style.opacity = '0';
                    setTimeout(() => summary.remove(), 300);
                });
            }
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
            'Progress': { cls: 'type-progress', label: 'Progress Note', icon: 'fa-file-lines' },
            'SOAP': { cls: 'type-soap', label: 'SOAP Note', icon: 'fa-notes-medical' },
            'Incident': { cls: 'type-incident', label: 'Incident Note', icon: 'fa-bolt' },
            'Handoff': { cls: 'type-handoff', label: 'Handoff', icon: 'fa-arrow-right-arrow-left' },
            'Consultation': { cls: 'type-consultation', label: 'Consultation', icon: 'fa-comments' },
            'Discharge': { cls: 'type-discharge', label: 'Discharge', icon: 'fa-door-open' },
            'Other': { cls: 'type-other', label: 'أخرى', icon: 'fa-tag' }
        };
        const cfg = map[type] || { cls: 'type-other', label: type, icon: 'fa-tag' };
        return `<span class="pn-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(cfg.label)}</span>`;
    }

    function getRiskBadge(level) {
        if (!level) return '<span class="pn-badge risk-none"><i class="fa-solid fa-minus"></i> غير مقيم</span>';
        const map = {
            'لا': { cls: 'risk-none', icon: 'fa-shield-halved', label: 'لا يوجد' },
            'منخفض': { cls: 'risk-low', icon: 'fa-shield-halved' },
            'متوسط': { cls: 'risk-medium', icon: 'fa-triangle-exclamation' },
            'عالي': { cls: 'risk-high', icon: 'fa-exclamation-circle' },
            'حرج': { cls: 'risk-critical', icon: 'fa-skull-crossbones' }
        };
        const cfg = map[level] || { cls: 'risk-none', icon: 'fa-minus', label: level };
        return `<span class="pn-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(cfg.label || level)}</span>`;
    }

    function getVisibilityBadge(visibility) {
        if (!visibility) return '';
        const map = {
            'خاص': { cls: 'vis-private', icon: 'fa-lock', label: 'خاص' },
            'للفريق': { cls: 'vis-team', icon: 'fa-users', label: 'للفريق' },
            'للمريض': { cls: 'vis-patient', icon: 'fa-eye', label: 'للمريض' }
        };
        const cfg = map[visibility] || { cls: 'vis-private', icon: 'fa-lock', label: visibility };
        return `<span class="pn-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(cfg.label)}</span>`;
    }

    function getMoodBadge(mood) {
        if (mood === null || mood === undefined) return '';
        let cls = 'mid';
        if (mood <= 3) cls = 'low';
        else if (mood >= 7) cls = 'high';
        return `<span class="note-mood ${cls}"><i class="fa-solid fa-face-smile"></i> المزاج: ${mood}/10</span>`;
    }

    function getNotePriorityClass(priority) {
        switch (priority) {
            case 'عاجلة': return 'note-priority-urgent';
            case 'مهمة': return 'note-priority-important';
            default: return 'note-priority-normal';
        }
    }

    /* ============================================================
       7. Critical Alert Banner
    ============================================================ */
    function checkForCriticalNotes() {
        const alertEl = document.getElementById('pnCriticalAlert');
        const msgEl = document.getElementById('pnCriticalMessage');
        if (!alertEl || !msgEl) return;

        const criticalNotes = patientNotesList.filter(n => {
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
        const reason = latest.riskLevel === 'حرج' ? 'خطر حرج' :
            latest.riskLevel === 'عالي' ? 'خطر عالي' :
                (latest.symptoms || []).includes('أفكار انتحارية') ? 'أفكار انتحارية' : 'إيذاء ذاتي';

        msgEl.innerHTML = `يوجد <strong>${criticalNotes.length}</strong> ملاحظة حرجة — آخرها: <strong>${escapeHtml(reason)}</strong> بتاريخ ${escapeHtml(latest.date)} (${escapeHtml(latest.title)})`;
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
       9. Load Context Options
    ============================================================ */
    function populateLinkItems() {
        const linkType = document.getElementById('noteLinkType');
        const linkItem = document.getElementById('noteLinkItem');
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
    let patientNotesList = storage.get('patientNotes', [
        {
            title: 'ملاحظة حول الحالة المزاجية',
            date: '2024-01-12',
            category: 'ملاحظة إكلينيكية',
            priority: 'مهمة',
            content: 'لاحظ المريض تحسناً ملحوظاً في المزاج العام خلال الأسبوع الأخير، مع زيادة في الدافعية للقيام بالأنشطة اليومية.',
            noteType: 'Progress',
            author: 'د. أحمد',
            authorRole: 'طبيب',
            visibility: 'خاص',
            riskLevel: 'منخفض',
            moodAtNote: 6,
            symptoms: ['قلق'],
            nextPlan: 'متابعة أسبوعية',
            linkType: '',
            linkItem: ''
        },
        {
            title: 'متابعة النوم',
            date: '2024-01-18',
            category: 'ملاحظة سلوكية',
            priority: 'عادية',
            content: 'استمرار اضطراب النوم مع صعوبة في النوم المبكر. ينصح بتقليل استخدام الشاشات قبل النوم بساعتين على الأقل.',
            noteType: 'SOAP',
            author: 'د. أحمد',
            authorRole: 'طبيب',
            visibility: 'للمريض',
            riskLevel: 'لا',
            moodAtNote: 5,
            symptoms: ['أرق'],
            nextPlan: 'تجربة روتين مسائي',
            linkType: 'جلسة',
            linkItem: 'جلسة متابعة أسبوعية'
        }
    ]);

    // ترحيل البيانات القديمة
    patientNotesList = patientNotesList.map(n => {
        if (n.noteType === undefined) n.noteType = 'Other';
        if (n.author === undefined) n.author = '';
        if (n.authorRole === undefined) n.authorRole = '';
        if (n.visibility === undefined) n.visibility = 'خاص';
        if (n.riskLevel === undefined) n.riskLevel = '';
        if (n.moodAtNote === undefined) n.moodAtNote = null;
        if (!Array.isArray(n.symptoms)) n.symptoms = [];
        if (n.nextPlan === undefined) n.nextPlan = '';
        if (n.linkType === undefined) n.linkType = '';
        if (n.linkItem === undefined) n.linkItem = '';
        return n;
    });
    storage.set('patientNotes', patientNotesList);

    function updateNotesCount() {
        const badge = document.getElementById('notesCountBadge');
        if (!badge) return;
        const count = patientNotesList.length;
        badge.textContent = count === 0 ? '0 ملاحظة' :
            count === 1 ? 'ملاحظة واحدة' :
                count === 2 ? 'ملاحظتان' :
                    count <= 10 ? `${count} ملاحظات` : `${count} ملاحظة`;
    }

    function getFilteredNotes() {
        const typeFilter = (document.getElementById('pnFilterType') || {}).value || '';
        const riskFilter = (document.getElementById('pnFilterRisk') || {}).value || '';

        return patientNotesList.filter(n => {
            if (typeFilter && n.noteType !== typeFilter) return false;
            if (riskFilter && n.riskLevel !== riskFilter) return false;
            return true;
        });
    }

    function renderPatientNotes() {
        const grid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('notesEmptyState');
        if (!grid) return;

        const filtered = getFilteredNotes();
        grid.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            emptyState.querySelector('p').textContent = patientNotesList.length === 0
                ? 'لا توجد ملاحظات مسجلة لهذا المريض حتى الآن.'
                : 'لا توجد ملاحظات مطابقة للفلتر.';
            updateNotesCount();
            checkForCriticalNotes();
            return;
        }
        emptyState.style.display = 'none';

        filtered.forEach((item) => {
            const realIndex = patientNotesList.indexOf(item);
            const card = document.createElement('div');
            card.className = `note-card ${getNotePriorityClass(item.priority)}`;

            // بناء الـ symptoms tags
            let symptomsHtml = '';
            if (item.symptoms && item.symptoms.length > 0) {
                symptomsHtml = '<div class="note-symptoms">' + item.symptoms.map(s => {
                    const isCritical = s === 'أفكار انتحارية' || s === 'إيذاء ذاتي';
                    return `<span class="note-symptom-tag ${isCritical ? 'critical' : ''}"><i class="fa-solid ${isCritical ? 'fa-triangle-exclamation' : 'fa-circle-dot'}"></i> ${escapeHtml(s)}</span>`;
                }).join('') + '</div>';
            }

            // ربط سياقي
            let linkBadge = '';
            if (item.linkType && item.linkItem) {
                linkBadge = `<span class="note-link-badge"><i class="fa-solid fa-link"></i> ${escapeHtml(item.linkType)}: ${escapeHtml(item.linkItem)}</span>`;
            }

            card.innerHTML = `
                <div class="note-badges-row">
                    ${getNoteTypeBadge(item.noteType)}
                    ${getRiskBadge(item.riskLevel)}
                    ${getVisibilityBadge(item.visibility)}
                    ${getMoodBadge(item.moodAtNote)}
                </div>
                <div class="note-card-header">
                    <h4 class="note-title">${escapeHtml(item.title)}</h4>
                    <span class="note-priority-badge ${getNotePriorityClass(item.priority)}">${escapeHtml(item.priority)}</span>
                </div>
                <div class="note-author-row">
                    <i class="fa-solid fa-user-pen"></i>
                    ${escapeHtml(item.author || 'غير محدد')}${item.authorRole ? ' • ' + escapeHtml(item.authorRole) : ''}
                </div>
                ${item.category ? `<div class="note-category"><i class="fa-solid fa-tag"></i> ${escapeHtml(item.category)}</div>` : ''}
                <div class="note-content">${escapeHtml(item.content)}</div>
                ${symptomsHtml}
                ${item.nextPlan ? `<div class="note-next-plan"><i class="fa-solid fa-forward ms-1"></i> ${escapeHtml(item.nextPlan)}</div>` : ''}
                ${linkBadge ? `<div style="margin-top:0.5rem;">${linkBadge}</div>` : ''}
                <div class="note-footer">
                    <div class="note-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${escapeHtml(item.date) || '-'}
                    </div>
                    <div class="note-actions">
                        <button type="button" class="btn btn-edit" onclick="editPatientNote(${realIndex})" aria-label="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-delete" onclick="deletePatientNote(${realIndex})" aria-label="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        updateNotesCount();
        checkForCriticalNotes();
    }

    /* ============================================================
       11. Form Submit
    ============================================================ */
    const patientNoteForm = document.getElementById('patientNoteForm');
    if (patientNoteForm) {
        patientNoteForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('noteEditIndex').value);
            const symptoms = Array.from(document.querySelectorAll('.pn-symptom:checked')).map(c => c.value);
            const item = {
                title: document.getElementById('noteTitle').value.trim(),
                date: document.getElementById('noteDate').value,
                noteType: document.getElementById('noteType').value,
                category: document.getElementById('noteCategory').value,
                author: document.getElementById('noteAuthor').value.trim(),
                authorRole: document.getElementById('noteAuthorRole').value,
                priority: document.getElementById('notePriority').value || 'عادية',
                riskLevel: document.getElementById('noteRiskLevel').value,
                moodAtNote: parseInt(document.getElementById('noteMoodAtNote').value) || 5,
                visibility: document.getElementById('noteVisibility').value,
                symptoms: symptoms,
                linkType: document.getElementById('noteLinkType').value,
                linkItem: document.getElementById('noteLinkItem').value,
                content: document.getElementById('noteContent').value.trim(),
                nextPlan: document.getElementById('noteNextPlan').value.trim()
            };

            if (editIndex === -1) {
                patientNotesList.unshift(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة الملاحظة بنجاح.');
            } else {
                patientNotesList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تحديث الملاحظة.');
            }

            storage.set('patientNotes', patientNotesList);
            resetPatientNoteForm();
            renderPatientNotes();
            bnConfetti.fire();

            // تنبيه إضافي إذا كانت حرجة
            if (item.riskLevel === 'حرج' || item.riskLevel === 'عالي') {
                setTimeout(() => {
                    showToast('error', 'تنبيه حرج', 'تم حفظ ملاحظة بمستوى خطر مرتفع — يجب المتابعة الفورية.', 6000);
                }, 500);
            }
        });
    }

    /* ============================================================
       12. Edit / Delete / Reset
    ============================================================ */
    window.editPatientNote = function (index) {
        const item = patientNotesList[index];
        if (!item) return;

        document.getElementById('noteTitle').value = item.title || '';
        document.getElementById('noteDate').value = item.date || '';
        document.getElementById('noteType').value = item.noteType || 'Other';
        document.getElementById('noteCategory').value = item.category || '';
        document.getElementById('noteAuthor').value = item.author || '';
        document.getElementById('noteAuthorRole').value = item.authorRole || '';
        document.getElementById('notePriority').value = item.priority || 'عادية';
        document.getElementById('noteRiskLevel').value = item.riskLevel || '';
        document.getElementById('noteMoodAtNote').value = item.moodAtNote ?? 5;
        document.getElementById('noteMoodAtNoteValue').textContent = `${item.moodAtNote ?? 5} / 10`;
        document.getElementById('noteVisibility').value = item.visibility || 'خاص';
        document.getElementById('noteContent').value = item.content || '';
        document.getElementById('noteNextPlan').value = item.nextPlan || '';
        document.getElementById('noteLinkType').value = item.linkType || '';

        // تحديث القائمة المنسدلة للعناصر المرتبطة
        const linkItem = document.getElementById('noteLinkItem');
        if (item.linkType) {
            const linkTypeEvent = new Event('change');
            document.getElementById('noteLinkType').dispatchEvent(linkTypeEvent);
            setTimeout(() => {
                linkItem.value = item.linkItem || '';
            }, 50);
        }

        document.querySelectorAll('.pn-symptom').forEach(c => { c.checked = (item.symptoms || []).includes(c.value); });

        document.getElementById('noteEditIndex').value = index;
        document.getElementById('noteFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الملاحظة';
        document.getElementById('noteSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('noteCancelBtn').classList.remove('d-none');
        document.getElementById('patientNoteForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.title}`);
    };

    window.deletePatientNote = function (index) {
        if (index < 0 || index >= patientNotesList.length) return;
        const item = patientNotesList[index];
        showConfirmModal({
            title: 'تأكيد حذف الملاحظة',
            subtitle: 'لن تتمكن من استرجاع هذه الملاحظة',
            message: `هل أنت متأكد من حذف الملاحظة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الملاحظة',
            onConfirm: () => {
                patientNotesList.splice(index, 1);
                storage.set('patientNotes', patientNotesList);
                renderPatientNotes();
                resetPatientNoteForm();
                showToast('success', 'تم الحذف', 'تم حذف الملاحظة.');
            }
        });
    };

    window.resetPatientNoteForm = function () {
        const form = document.getElementById('patientNoteForm');
        if (!form) return;
        form.reset();
        document.getElementById('noteEditIndex').value = '-1';
        document.getElementById('notePriority').value = 'عادية';
        document.getElementById('noteVisibility').value = 'خاص';
        document.getElementById('noteMoodAtNote').value = 5;
        document.getElementById('noteMoodAtNoteValue').textContent = '5 / 10';
        document.getElementById('noteLinkItem').innerHTML = '<option value="">اختر نوع الربط أولاً</option>';
        document.getElementById('noteLinkItem').disabled = true;
        document.querySelectorAll('.pn-symptom').forEach(c => c.checked = false);
        document.getElementById('noteFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة ملاحظة جديدة';
        document.getElementById('noteSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة الملاحظة';
        document.getElementById('noteCancelBtn').classList.add('d-none');
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
        renderPatientNotes();
        bnValidation.attachToForm(document.getElementById('patientNoteForm'));
        populateLinkItems();

        // Mood slider
        const moodEl = document.getElementById('noteMoodAtNote');
        const moodValEl = document.getElementById('noteMoodAtNoteValue');
        if (moodEl && moodValEl) {
            moodEl.addEventListener('input', function () {
                moodValEl.textContent = `${this.value} / 10`;
            });
        }

        // Filters
        const filterType = document.getElementById('pnFilterType');
        const filterRisk = document.getElementById('pnFilterRisk');
        if (filterType) filterType.addEventListener('change', renderPatientNotes);
        if (filterRisk) filterRisk.addEventListener('change', renderPatientNotes);

        // Critical alert close
        const criticalClose = document.getElementById('pnCriticalClose');
        if (criticalClose) {
            criticalClose.addEventListener('click', () => {
                document.getElementById('pnCriticalAlert').style.display = 'none';
            });
        }

        setTimeout(() => {
            showToast('info', 'ملاحظات المريض', 'سجّل الملاحظات مع نوعها، الخطر، الأعراض، والسرية.', 5000);
        }, 1000);

        console.log('%c✅ Patient Notes Tab Loaded',
            'background:#6366f1;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();