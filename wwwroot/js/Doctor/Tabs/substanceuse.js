/* ============================================================
   Substance Use Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initSubstanceUse() {
    console.log('🚀 SubstanceUse.js initialized');

    /* ============================================================
       1. Storage Layer (fallback)
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
       3. Toast — نظام مدمج
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-su-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-su-toast-styles';
        style.textContent = `
            .bn-su-toast-overlay { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; display: none; align-items: center; justify-content: center; z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important; }
            .bn-su-toast-overlay.show { display: flex !important; }
            .bn-su-toast { min-width: 300px; max-width: 92vw; padding: 1.1rem 1.4rem; border-radius: 16px; display: flex; align-items: center; gap: 0.85rem; font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55); animation: bnSuToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; direction: rtl; line-height: 1.5; position: relative; }
            .bn-su-toast.hide { animation: bnSuToastOut 0.3s ease forwards; }
            .bn-su-toast-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.22); font-size: 1.05rem; }
            .bn-su-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-su-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-su-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-su-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-su-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-su-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-su-toast.info { background: linear-gradient(135deg, #dc2626, #991b1b); }
            @keyframes bnSuToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnSuToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => showBuiltInToast(type, title, message, duration), { once: true });
            return;
        }
        let overlay = document.getElementById('bnSuToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnSuToastOverlay';
            overlay.className = 'bn-su-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = { error: 'fa-circle-exclamation', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `bn-su-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-su-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-su-toast-body">
                <div class="bn-su-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-su-toast-message">${escapeHtml(message || '')}</div>
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
        colors: ['#dc2626', '#f87171', '#f59e0b', '#10b981', '#0891b2', '#ec4899', '#8b5cf6'],
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
            substanceName: { required: true, minLength: 2, maxLength: 80, messages: { required: 'اسم المادة مطلوب', minLength: 'حرفان على الأقل' } },
            substanceType: { required: true, messages: { required: 'يرجى اختيار نوع المادة' } },
            substanceRoute: { required: true, messages: { required: 'يرجى اختيار طريقة التعاطي' } },
            substanceFrequency: { required: true, messages: { required: 'يرجى اختيار التكرار' } },
            substanceAmount: { required: true, maxLength: 80, messages: { required: 'الجرعة مطلوبة' } },
            substanceLastUse: { required: true, dateNotFuture: true, messages: { required: 'تاريخ آخر استخدام مطلوب', dateNotFuture: 'التاريخ لا يمكن أن يكون مستقبلياً' } },
            substanceCurrentStatus: { required: true, messages: { required: 'يرجى اختيار الحالة' } },
            substanceSeverity: { required: true, messages: { required: 'يرجى اختيار شدة الاضطراب' } },
            substanceDuration: { numberRange: { min: 0, max: 80 }, messages: { numberRange: 'المدة بين 0 و 80 سنة' } },
            substanceAgeOfOnset: { numberRange: { min: 5, max: 100 }, messages: { numberRange: 'العمر بين 5 و 100' } },
            substanceQuitAttempts: { numberRange: { min: 0, max: 100 }, messages: { numberRange: 'العدد بين 0 و 100' } }
        },

        validators: {
            required: (v) => v !== null && v !== undefined && String(v).trim().length > 0,
            minLength: (v, len) => !v || v.trim().length >= len,
            maxLength: (v, len) => !v || v.length <= len,
            numberRange: (v, range) => {
                if (v === '' || v === null) return true;
                const n = Number(v);
                return !isNaN(n) && n >= range.min && n <= range.max;
            },
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
            if (rule.numberRange && !this.validators.numberRange(value, rule.numberRange)) {
                return { valid: false, type: 'error', message: rule.messages?.numberRange || 'القيمة خارج النطاق' };
            }
            if (rule.dateNotFuture && !this.validators.dateNotFuture(value)) {
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ في المستقبل' };
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
            const closeBtn = summary.querySelector('.bn-summary-close');
            closeBtn.addEventListener('click', () => {
                summary.style.transition = 'opacity 0.3s ease';
                summary.style.opacity = '0';
                setTimeout(() => summary.remove(), 300);
            });
        },

        attachToField(field) {
            const name = field.name || field.id;
            if (!this.rules[name]) return;
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label && this.rules[name].required) label.classList.add('required');
            const eventType = (field.type === 'date' || field.tagName === 'SELECT' || field.type === 'number') ? 'change' : 'blur';
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
       6. Confirm Modal
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
       7. Badge Helpers
    ============================================================ */
    function getSeverityBadge(severity) {
        if (!severity) return '';
        const map = {
            'خفيف': { cls: 'sev-mild', icon: 'fa-circle-check' },
            'متوسط': { cls: 'sev-moderate', icon: 'fa-circle-half-stroke' },
            'شديد': { cls: 'sev-severe', icon: 'fa-triangle-exclamation' }
        };
        const cfg = map[severity] || { cls: '', icon: 'fa-tag' };
        return `<span class="su-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(severity)}</span>`;
    }

    function getStatusBadge(status) {
        if (!status) return '';
        const map = {
            'نشط': { cls: 'status-active', icon: 'fa-circle-play' },
            'متوقف': { cls: 'status-stopped', icon: 'fa-circle-pause' },
            'في التعافي': { cls: 'status-recovery', icon: 'fa-heart-pulse' },
            'انتكاسة': { cls: 'status-relapse', icon: 'fa-rotate-left' }
        };
        const cfg = map[status] || { cls: '', icon: 'fa-tag' };
        return `<span class="su-badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${escapeHtml(status)}</span>`;
    }

    function getTypeBadge(type) {
        if (!type) return '';
        return `<span class="su-badge type-badge"><i class="fa-solid fa-tag"></i> ${escapeHtml(type)}</span>`;
    }

    /* ============================================================
       8. Substance Use CRUD
    ============================================================ */
    let substanceUseList = storage.get('substanceUse', [
        {
            name: 'الكحول', amount: '2-3 كؤوس يومياً', lastUse: '2024-01-15',
            notes: 'يتم المتابعة أسبوعياً.',
            type: 'كحول', route: 'فموي', frequency: 'يومياً',
            duration: 5, ageOfOnset: 20, reason: 'ترفيهي',
            currentStatus: 'نشط', craving: 7, severity: 'متوسط',
            physicalDependence: false, psychologicalDependence: true,
            impactWork: false, impactRelationships: true, impactHealth: true, impactLegal: false,
            quitAttempts: 2, lastQuitDate: '2023-11-01'
        }
    ]);

    // ✅ ترحيل البيانات القديمة
    substanceUseList = substanceUseList.map(item => {
        if (!item.type) item.type = 'أخرى';
        if (!item.route) item.route = 'فموي';
        if (!item.frequency) item.frequency = 'عرضياً';
        if (item.duration === undefined) item.duration = null;
        if (item.ageOfOnset === undefined) item.ageOfOnset = null;
        if (!item.reason) item.reason = '';
        if (!item.currentStatus) item.currentStatus = 'نشط';
        if (item.craving === undefined) item.craving = 0;
        if (!item.severity) item.severity = 'متوسط';
        if (item.physicalDependence === undefined) item.physicalDependence = false;
        if (item.psychologicalDependence === undefined) item.psychologicalDependence = false;
        if (item.impactWork === undefined) item.impactWork = false;
        if (item.impactRelationships === undefined) item.impactRelationships = false;
        if (item.impactHealth === undefined) item.impactHealth = false;
        if (item.impactLegal === undefined) item.impactLegal = false;
        if (item.quitAttempts === undefined) item.quitAttempts = 0;
        if (item.lastQuitDate === undefined) item.lastQuitDate = '';
        return item;
    });
    storage.set('substanceUse', substanceUseList);

    function updateStatsSummary() {
        const statActive = document.getElementById('suStatActive');
        const statRecovery = document.getElementById('suStatRecovery');
        const statRelapse = document.getElementById('suStatRelapse');
        const statSevere = document.getElementById('suStatSevere');
        if (!statActive) return;

        statActive.textContent = substanceUseList.filter(s => s.currentStatus === 'نشط').length;
        statRecovery.textContent = substanceUseList.filter(s => s.currentStatus === 'في التعافي').length;
        statRelapse.textContent = substanceUseList.filter(s => s.currentStatus === 'انتكاسة').length;
        statSevere.textContent = substanceUseList.filter(s => s.severity === 'شديد').length;
    }

    function renderSubstanceUseTable() {
        const tbody = document.getElementById('substanceUseTableBody');
        const emptyState = document.getElementById('substanceUseEmptyState');
        const badge = document.getElementById('substanceCountBadge');
        if (!tbody) return;

        tbody.innerHTML = '';
        emptyState.style.display = substanceUseList.length === 0 ? 'block' : 'none';

        if (badge) {
            if (substanceUseList.length > 0) {
                badge.textContent = substanceUseList.length + ' مادة';
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        substanceUseList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `su-rowSlideIn 0.35s ease ${index * 0.05}s both`;
            const craving = item.craving || 0;
            tr.innerHTML = `
                <td data-label="#"><span class="table-index">${index + 1}</span></td>
                <td data-label="اسم المادة">
                    <span class="substance-name">
                        <i class="fa-solid fa-wine-bottle"></i>
                        ${escapeHtml(item.name)}
                    </span>
                </td>
                <td data-label="النوع">${getTypeBadge(item.type)}</td>
                <td data-label="الجرعة">${escapeHtml(item.amount)}</td>
                <td data-label="التكرار">${escapeHtml(item.frequency || '—')}</td>
                <td data-label="آخر استخدام">${escapeHtml(item.lastUse)}</td>
                <td data-label="الحالة">${getStatusBadge(item.currentStatus)}</td>
                <td data-label="الشدة">${getSeverityBadge(item.severity)}</td>
                <td data-label="الرغبة">
                    <div class="su-craving-cell">
                        <div class="su-craving-bar">
                            <div class="su-craving-fill" style="width: ${craving * 10}%"></div>
                        </div>
                        <span class="su-craving-num">${craving}</span>
                    </div>
                </td>
                <td class="text-center">
                    <div class="action-btns">
                        <button type="button" class="btn btn-edit" onclick="editSubstanceUseItem(${index})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="btn btn-delete" onclick="deleteSubstanceUseItem(${index})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updateStatsSummary();
    }

    const substanceUseForm = document.getElementById('substanceUseForm');
    if (substanceUseForm) {
        substanceUseForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('substanceUseEditIndex').value);
            const item = {
                name: document.getElementById('substanceName').value.trim(),
                type: document.getElementById('substanceType').value,
                route: document.getElementById('substanceRoute').value,
                frequency: document.getElementById('substanceFrequency').value,
                amount: document.getElementById('substanceAmount').value.trim(),
                duration: document.getElementById('substanceDuration').value ? parseFloat(document.getElementById('substanceDuration').value) : null,
                ageOfOnset: document.getElementById('substanceAgeOfOnset').value ? parseInt(document.getElementById('substanceAgeOfOnset').value) : null,
                reason: document.getElementById('substanceReason').value,
                lastUse: document.getElementById('substanceLastUse').value,
                currentStatus: document.getElementById('substanceCurrentStatus').value,
                craving: parseInt(document.getElementById('substanceCraving').value) || 0,
                severity: document.getElementById('substanceSeverity').value,
                physicalDependence: document.getElementById('substancePhysicalDependence').checked,
                psychologicalDependence: document.getElementById('substancePsychologicalDependence').checked,
                impactWork: document.getElementById('substanceImpactWork').checked,
                impactRelationships: document.getElementById('substanceImpactRelationships').checked,
                impactHealth: document.getElementById('substanceImpactHealth').checked,
                impactLegal: document.getElementById('substanceImpactLegal').checked,
                quitAttempts: document.getElementById('substanceQuitAttempts').value ? parseInt(document.getElementById('substanceQuitAttempts').value) : 0,
                lastQuitDate: document.getElementById('substanceLastQuitDate').value,
                notes: document.getElementById('substanceNotes').value.trim()
            };

            if (editIndex === -1) {
                substanceUseList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة المادة.');
            } else {
                substanceUseList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تحديث بيانات المادة.');
            }

            storage.set('substanceUse', substanceUseList);
            resetSubstanceUseForm();
            renderSubstanceUseTable();
            bnConfetti.fire();
        });
    }

    window.editSubstanceUseItem = function (index) {
        const item = substanceUseList[index];
        if (!item) return;

        document.getElementById('substanceName').value = item.name || '';
        document.getElementById('substanceType').value = item.type || '';
        document.getElementById('substanceRoute').value = item.route || '';
        document.getElementById('substanceFrequency').value = item.frequency || '';
        document.getElementById('substanceAmount').value = item.amount || '';
        document.getElementById('substanceDuration').value = item.duration ?? '';
        document.getElementById('substanceAgeOfOnset').value = item.ageOfOnset ?? '';
        document.getElementById('substanceReason').value = item.reason || '';
        document.getElementById('substanceLastUse').value = item.lastUse || '';
        document.getElementById('substanceCurrentStatus').value = item.currentStatus || '';
        document.getElementById('substanceCraving').value = item.craving || 0;
        document.getElementById('substanceCravingValue').textContent = `${item.craving || 0} / 10`;
        document.getElementById('substanceSeverity').value = item.severity || '';
        document.getElementById('substancePhysicalDependence').checked = !!item.physicalDependence;
        document.getElementById('substancePsychologicalDependence').checked = !!item.psychologicalDependence;
        document.getElementById('substanceImpactWork').checked = !!item.impactWork;
        document.getElementById('substanceImpactRelationships').checked = !!item.impactRelationships;
        document.getElementById('substanceImpactHealth').checked = !!item.impactHealth;
        document.getElementById('substanceImpactLegal').checked = !!item.impactLegal;
        document.getElementById('substanceQuitAttempts').value = item.quitAttempts ?? '';
        document.getElementById('substanceLastQuitDate').value = item.lastQuitDate || '';
        document.getElementById('substanceNotes').value = item.notes || '';

        document.getElementById('substanceUseEditIndex').value = index;
        document.getElementById('substanceUseFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل سجل التعاطي';
        document.getElementById('substanceUseSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('substanceUseCancelBtn').classList.remove('d-none');
        document.getElementById('substanceUseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.name}`);
    };

    window.deleteSubstanceUseItem = function (index) {
        if (index < 0 || index >= substanceUseList.length) return;
        const item = substanceUseList[index];
        showConfirmModal({
            title: 'تأكيد حذف المادة',
            subtitle: 'لن تتمكن من استرجاعها',
            message: `هل أنت متأكد من حذف <strong>${escapeHtml(item.name)}</strong>؟`,
            confirmText: 'نعم، احذف',
            onConfirm: () => {
                substanceUseList.splice(index, 1);
                storage.set('substanceUse', substanceUseList);
                renderSubstanceUseTable();
                resetSubstanceUseForm();
                showToast('success', 'تم الحذف', 'تم حذف المادة.');
            }
        });
    };

    window.resetSubstanceUseForm = function () {
        const form = document.getElementById('substanceUseForm');
        if (!form) return;
        form.reset();
        document.getElementById('substanceUseEditIndex').value = '-1';
        document.getElementById('substanceCraving').value = 0;
        document.getElementById('substanceCravingValue').textContent = '0 / 10';
        document.getElementById('substanceUseFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة مادة جديدة';
        document.getElementById('substanceUseSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة المادة';
        document.getElementById('substanceUseCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       9. Init
    ============================================================ */
    function doInit() {
        renderSubstanceUseTable();
        bnValidation.attachToForm(document.getElementById('substanceUseForm'));

        // Craving slider update
        const cravingEl = document.getElementById('substanceCraving');
        const cravingValueEl = document.getElementById('substanceCravingValue');
        if (cravingEl && cravingValueEl) {
            cravingEl.addEventListener('input', function () {
                cravingValueEl.textContent = `${this.value} / 10`;
            });
        }

        setTimeout(() => {
            showToast('info', 'تعاطي المواد', 'سجّل نوع المادة، شدتها، وحالة التعافي مع التقييم الطبي الكامل.', 5000);
        }, 1000);

        console.log('%c✅ Substance Use Tab Loaded',
            'background:#dc2626;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();