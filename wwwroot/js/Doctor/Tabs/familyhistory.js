/* ============================================================
   Family Medical History — Tab Script (Standalone + Integrated)
   يعتمد على: window.showToast (من Index.js) أو fallback داخلي
              CSS Variables من PatientDetails.css
   لا يتعارض مع أي كود قديم — كل شيء داخل IIFE
============================================================ */
(function initFamilyHistoryTab() {
    'use strict';

    console.log('🚀 FamilyHistory.js initialized');

    /* ============================================================
       0. Toast Helper (يستخدم window.showToast إن وُجد)
    ============================================================ */
    function toast(type, title, message, duration = 3500) {
        if (window.bnApp && typeof window.bnApp.showToast === 'function') {
            return window.bnApp.showToast(type, title, message, duration);
        }
        if (typeof window.showToast === 'function') {
            return window.showToast(type, title, message, duration);
        }
        // fallback — console (يُلتقط بواسطة Console → Toast Bridge)
        console.log(`[Toast ${type}] ${title}: ${message}`);
    }

    /* ============================================================
       1. Storage Layer (Scoped — لا يتعارض مع أي bnStorage آخر)
    ============================================================ */
    const bnStorage = {
        prefix: 'balancy_',
        isAvailable() {
            try {
                const test = '__bn_fh_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) { return false; }
        },
        get(key, defaultValue = null) {
            if (!this.isAvailable()) return defaultValue;
            try {
                const raw = localStorage.getItem(this.prefix + key);
                return raw ? JSON.parse(raw) : defaultValue;
            } catch (e) { return defaultValue; }
        },
        set(key, value) {
            if (!this.isAvailable()) return false;
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
                return true;
            } catch (e) { return false; }
        },
        remove(key) {
            if (!this.isAvailable()) return;
            try { localStorage.removeItem(this.prefix + key); } catch (e) { }
        }
    };

    /* ============================================================
       2. Loading Bar (يستخدم #bnLoadingBar إن وُجد، وإلا يتجاهل)
    ============================================================ */
    const bnLoading = {
        el: document.getElementById('bnLoadingBar'),
        counter: 0,
        start() {
            if (!this.el) return;
            this.counter++;
            this.el.classList.add('active');
        },
        stop() {
            if (!this.el) return;
            this.counter = Math.max(0, this.counter - 1);
            if (this.counter === 0) {
                setTimeout(() => this.el.classList.remove('active'), 200);
            }
        }
    };

    /* ============================================================
       3. Confetti (ينشئ حاويته داخل الـ wrapper إن لم توجد)
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#0891b2'],

        ensureEl() {
            if (this.el && document.body.contains(this.el)) return this.el;
            let existing = document.getElementById('bnConfetti');
            if (!existing) {
                existing = document.createElement('div');
                existing.className = 'bn-confetti';
                existing.id = 'bnConfetti';
                existing.setAttribute('aria-hidden', 'true');
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

            setTimeout(() => {
                el.classList.remove('active');
                el.innerHTML = '';
            }, duration);
        }
    };

    /* ============================================================
       4. Focus Trap
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
                modalEl,
                previousActive,
                getFocusable: () => Array.from(modalEl.querySelectorAll(focusableSelector))
                    .filter(el => el.offsetParent !== null),
                handleKeydown: (e) => {
                    if (e.key !== 'Tab') return;
                    const focusables = trap.getFocusable();
                    if (focusables.length === 0) { e.preventDefault(); return; }
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];

                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault(); last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault(); first.focus();
                    }
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
       5. Validation Engine (Scoped)
    ============================================================ */
    const bnValidation = {
        rules: {
            relativeRelation: {
                required: true,
                messages: { required: 'صلة القرابة مطلوبة' }
            },
            relativeConditions: {
                required: true, minLength: 2, maxLength: 500,
                messages: {
                    required: 'الأمراض / الحالات مطلوبة',
                    minLength: 'يجب كتابة حالة واحدة على الأقل'
                }
            },
            relativeName: {
                required: false, minLength: 2, maxLength: 60,
                pattern: /^[\u0600-\u06FFa-zA-Z\s'.-]*$/,
                messages: { pattern: 'الاسم يحتوي على رموز غير مسموحة' }
            },
            relativeAge: {
                required: false, numberRange: { min: 0, max: 120 },
                messages: { numberRange: 'العمر يجب أن يكون بين 0 و 120' }
            }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len,
            pattern: (value, regex) => !value || regex.test(value),
            numberRange: (value, range) => {
                if (value === '' || value === null) return true;
                const num = Number(value);
                if (isNaN(num)) return false;
                return num >= range.min && num <= range.max;
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
            if (!value || String(value).trim() === '') {
                return { valid: true };
            }
            if (rule.minLength && !this.validators.minLength(value, rule.minLength)) {
                return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            }
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
            }
            if (rule.pattern && !this.validators.pattern(value, rule.pattern)) {
                return { valid: false, type: 'error', message: rule.messages?.pattern || 'صيغة غير صحيحة' };
            }
            if (rule.numberRange && !this.validators.numberRange(value, rule.numberRange)) {
                return { valid: false, type: 'error', message: rule.messages?.numberRange || `القيمة يجب أن تكون بين ${rule.numberRange.min} و ${rule.numberRange.max}` };
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
            if (label && this.rules[name].required) {
                label.classList.add('required');
            }

            const eventType = (field.tagName === 'SELECT' || field.type === 'date' || field.type === 'number') ? 'change' : 'blur';

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
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       6. Auto-Save System (Scoped)
    ============================================================ */
    const bnAutoSave = {
        timers: {},
        delay: 1500,
        indicator: null,
        indicatorText: null,
        hideTimer: null,

        ensureIndicator() {
            this.indicator = document.getElementById('saveIndicator');
            this.indicatorText = document.getElementById('saveIndicatorText');
        },

        init() {
            this.ensureIndicator();
            document.querySelectorAll('[data-autosave]').forEach(form => {
                const key = form.dataset.autosave;
                this.restore(form, key);
                form.addEventListener('input', () => this.scheduleSave(form, key));
                form.addEventListener('change', () => this.scheduleSave(form, key));
            });
        },

        scheduleSave(form, key) {
            clearTimeout(this.timers[key]);
            this.showIndicator('saving');
            this.timers[key] = setTimeout(() => this.save(form, key), this.delay);
        },

        save(form, key) {
            const data = {};
            const formData = new FormData(form);
            for (const [k, v] of formData.entries()) data[k] = v;

            bnStorage.set('draft_' + key, {
                data,
                savedAt: new Date().toISOString()
            });

            this.showIndicator('saved');
        },

        restore(form, key) {
            const draft = bnStorage.get('draft_' + key);
            if (!draft || !draft.data) return;

            const hasData = Object.values(draft.data).some(v => v && String(v).trim() !== '');
            if (!hasData) return;

            Object.entries(draft.data).forEach(([name, value]) => {
                const field = form.querySelector(`[name="${name}"]`);
                if (field) field.value = value;
            });
        },

        clearDraft(key) {
            bnStorage.remove('draft_' + key);
        },

        showIndicator(state) {
            this.ensureIndicator();
            if (!this.indicator || !this.indicatorText) return;

            clearTimeout(this.hideTimer);
            this.indicator.classList.add('show');
            this.indicator.classList.remove('saved');

            if (state === 'saving') {
                this.indicatorText.textContent = 'جاري الحفظ التلقائي...';
            } else if (state === 'saved') {
                this.indicator.classList.add('saved');
                this.indicatorText.textContent = 'تم الحفظ التلقائي';
                this.hideTimer = setTimeout(() => {
                    this.indicator.classList.remove('show');
                }, 2000);
            }
        }
    };

    /* ============================================================
       7. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       8. Modals (Edit + Confirm)
       - Edit Modal: يُنشأ ديناميكياً إن لم يوجد #bnEditModal
       - Confirm Modal: يُنشأ ديناميكياً إن لم يوجد #bnConfirmModal
    ============================================================ */
    function ensureEditModal() {
        let modal = document.getElementById('bnEditModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.className = 'bn-modal-overlay';
        modal.id = 'bnEditModal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="bn-modal">
                <div class="bn-modal-header">
                    <div class="bn-modal-header-icon">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </div>
                    <div class="bn-modal-header-text">
                        <h3 id="bnEditModalTitle">تعديل</h3>
                        <p id="bnEditModalSubtitle">قم بتعديل النص ثم اضغط حفظ</p>
                    </div>
                </div>
                <div class="bn-modal-body">
                    <label for="bnEditModalInput">
                        <i class="fa-solid fa-keyboard"></i>
                        <span id="bnEditModalLabel">النص</span>
                    </label>
                    <input type="text" id="bnEditModalInput" class="bn-modal-input" autocomplete="off">
                </div>
                <div class="bn-modal-footer">
                    <button type="button" class="bn-btn bn-btn-ghost" id="bnEditModalCancel">
                        <i class="fa-solid fa-xmark"></i> إلغاء
                    </button>
                    <button type="button" class="bn-btn bn-btn-primary" id="bnEditModalSave">
                        <i class="fa-solid fa-floppy-disk"></i> حفظ التعديل
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function ensureConfirmModal() {
        let modal = document.getElementById('bnConfirmModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.className = 'bn-modal-overlay';
        modal.id = 'bnConfirmModal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="bn-modal bn-modal-danger">
                <div class="bn-modal-header">
                    <div class="bn-modal-header-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div class="bn-modal-header-text">
                        <h3 id="bnConfirmModalTitle">تأكيد الحذف</h3>
                        <p id="bnConfirmModalSubtitle">لا يمكن التراجع عن هذه العملية</p>
                    </div>
                </div>
                <div class="bn-modal-body">
                    <p class="bn-modal-message" id="bnConfirmModalMessage">هل أنت متأكد؟</p>
                </div>
                <div class="bn-modal-footer">
                    <button type="button" class="bn-btn bn-btn-ghost" id="bnConfirmModalCancel">
                        <i class="fa-solid fa-xmark"></i> إلغاء
                    </button>
                    <button type="button" class="bn-btn bn-btn-danger" id="bnConfirmModalConfirm">
                        <i class="fa-solid fa-trash"></i> نعم، احذف
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
        const modal = ensureConfirmModal();
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
       9. Helpers
    ============================================================ */
    function getRelationIcon(relation) {
        const icons = {
            'أب': 'fa-mars',
            'أم': 'fa-venus',
            'جد': 'fa-person-cane',
            'جدة': 'fa-person-cane',
            'أخ': 'fa-mars',
            'أخت': 'fa-venus',
            'عم': 'fa-mars',
            'عمة': 'fa-venus',
            'خال': 'fa-mars',
            'خالة': 'fa-venus'
        };
        return icons[relation] || 'fa-user';
    }

    function getSeverityText(severity) {
        const map = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة', unknown: 'غير معروفة' };
        return map[severity] || 'غير معروفة';
    }

    function getSeverityIcon(severity) {
        const map = {
            low: 'fa-circle-check',
            medium: 'fa-triangle-exclamation',
            high: 'fa-circle-exclamation',
            unknown: 'fa-circle-question'
        };
        return map[severity] || 'fa-circle-question';
    }

    function getConditionClass(type) {
        return ['genetic', 'psych', 'chronic', 'other'].includes(type) ? type : 'other';
    }

    /* ============================================================
       10. Relatives CRUD
    ============================================================ */
    let relativesList = bnStorage.get('familyHistory', []);

    function updateRelativesCount() {
        const badge = document.getElementById('relativesCountBadge');
        if (!badge) return;
        const count = relativesList.length;
        badge.textContent = count === 0 ? '0 أفراد' :
            count === 1 ? 'فرد واحد' :
                count === 2 ? 'فردان' :
                    `${count} أفراد`;
    }

    function render() {
        const grid = document.getElementById('relativesGrid');
        if (!grid) return;

        updateRelativesCount();

        const statTotal = document.getElementById('statTotal');
        const statGenetic = document.getElementById('statGenetic');
        const statPsych = document.getElementById('statPsych');
        const statChronic = document.getElementById('statChronic');

        if (statTotal) statTotal.textContent = relativesList.length;

        const geneticCount = relativesList.reduce((acc, r) => {
            const conds = (r.conditions || '').toLowerCase();
            return acc + (conds.includes('وراث') || conds.includes('جين') ? 1 : 0);
        }, 0);
        if (statGenetic) statGenetic.textContent = geneticCount;

        const psychCount = relativesList.reduce((acc, r) => {
            const conds = (r.conditions || '').toLowerCase();
            return acc + (conds.includes('اكتئاب') || conds.includes('قلق') || conds.includes('نفس') || conds.includes('فصام') || conds.includes('توحد') ? 1 : 0);
        }, 0);
        if (statPsych) statPsych.textContent = psychCount;

        const chronicCount = relativesList.reduce((acc, r) => {
            const conds = (r.conditions || '').toLowerCase();
            return acc + (conds.includes('سكر') || conds.includes('ضغط') || conds.includes('قلب') || conds.includes('سرطان') || conds.includes('ربو') ? 1 : 0);
        }, 0);
        if (statChronic) statChronic.textContent = chronicCount;

        if (relativesList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fa-solid fa-people-roof"></i>
                    </div>
                    <h3>لا يوجد أفراد مسجّلون</h3>
                    <p>ابدأ بإضافة أفراد العائلة مع تاريخهم الطبي</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        relativesList.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `relative-card severity-${item.severity || 'unknown'}`;
            card.style.animationDelay = `${index * 0.05}s`;

            const conditions = (item.conditions || '').split(',').map(c => c.trim()).filter(Boolean);

            let conditionsHtml = '';
            conditions.forEach((cond, i) => {
                const cls = getConditionClass(item.conditionType);
                conditionsHtml += `<span class="condition-tag ${cls}" style="animation-delay: ${i * 0.05}s">${escapeHtml(cond)}</span>`;
            });

            card.innerHTML = `
                <div class="relative-header">
                    <div class="relative-avatar">
                        <i class="fa-solid ${getRelationIcon(item.relation)}"></i>
                    </div>
                    <div class="relative-info">
                        <h4 class="relative-name">
                            ${item.name ? escapeHtml(item.name) : escapeHtml(item.relation)}
                            <span class="relation-badge">
                                <i class="fa-solid fa-link"></i>
                                ${escapeHtml(item.relation)}
                            </span>
                        </h4>
                        <div class="relative-meta">
                            ${item.age ? `<span class="relative-meta-item"><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(item.age)} سنة</span>` : ''}
                            ${item.status ? `<span class="relative-meta-item"><i class="fa-solid fa-heart-pulse"></i> ${escapeHtml(item.status)}</span>` : ''}
                        </div>
                    </div>
                    <span class="severity-badge ${item.severity || 'unknown'}">
                        <i class="fa-solid ${getSeverityIcon(item.severity)}"></i>
                        ${getSeverityText(item.severity)}
                    </span>
                </div>

                <div class="conditions-section">
                    <div class="conditions-label">
                        <i class="fa-solid fa-notes-medical"></i>
                        الأمراض / الحالات:
                    </div>
                    <div class="conditions-tags">
                        ${conditionsHtml || '<span class="text-muted" style="font-size: 0.75rem;">لا توجد أمراض مسجّلة</span>'}
                    </div>
                </div>

                ${item.notes ? `
                    <div class="relative-notes">
                        <i class="fa-solid fa-note-sticky ms-1"></i>
                        ${escapeHtml(item.notes)}
                    </div>
                ` : ''}

                <div class="relative-actions">
                    <button type="button" class="action-btn edit" data-action="edit" data-index="${index}" title="تعديل">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="action-btn delete" data-action="delete" data-index="${index}" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });

        // Event delegation بدل inline onclick (أنظف ولا يعتمد على window.*)
        grid.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => editRelative(parseInt(btn.dataset.index, 10)));
        });
        grid.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteRelative(parseInt(btn.dataset.index, 10)));
        });
    }

    /* ============================================================
       11. Form Submit
    ============================================================ */
    const relativeForm = document.getElementById('relativeForm');
    if (relativeForm) {
        relativeForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                toast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('editIndex').value, 10);
            const item = {
                relation: document.getElementById('relativeRelation').value,
                name: document.getElementById('relativeName').value.trim(),
                age: document.getElementById('relativeAge').value,
                status: document.getElementById('relativeStatus').value,
                severity: document.getElementById('relativeSeverity').value,
                conditionType: document.getElementById('relativeConditionType').value,
                conditions: document.getElementById('relativeConditions').value.trim(),
                notes: document.getElementById('relativeNotes').value.trim()
            };

            if (editIndex >= 0) {
                item.createdAt = relativesList[editIndex].createdAt;
                relativesList[editIndex] = item;
                toast('success', 'تم التعديل', 'تم تحديث بيانات الفرد بنجاح.');
            } else {
                item.createdAt = new Date().toISOString();
                relativesList.push(item);
                toast('success', 'تمت الإضافة', 'تمت إضافة الفرد إلى التاريخ الطبي العائلي.');
            }

            bnStorage.set('familyHistory', relativesList);
            render();
            resetRelativeForm();
            bnConfetti.fire();
        });
    }

    /* ============================================================
       12. Edit / Delete / Reset
    ============================================================ */
    function editRelative(index) {
        const item = relativesList[index];
        if (!item) return;

        document.getElementById('editIndex').value = index;
        document.getElementById('relativeRelation').value = item.relation || '';
        document.getElementById('relativeName').value = item.name || '';
        document.getElementById('relativeAge').value = item.age || '';
        document.getElementById('relativeStatus').value = item.status || '';
        document.getElementById('relativeSeverity').value = item.severity || 'unknown';
        document.getElementById('relativeConditionType').value = item.conditionType || 'genetic';
        document.getElementById('relativeConditions').value = item.conditions || '';
        document.getElementById('relativeNotes').value = item.notes || '';

        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل بيانات الفرد';
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('cancelBtn').classList.remove('d-none');

        const card = document.querySelector('.add-relative-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function deleteRelative(index) {
        if (index < 0 || index >= relativesList.length) return;
        const item = relativesList[index];
        const name = item.name || item.relation;

        showConfirmModal({
            title: 'تأكيد حذف الفرد',
            subtitle: 'لن تتمكن من استرجاع بيانات الفرد',
            message: `هل أنت متأكد من حذف <strong>${escapeHtml(name)}</strong> من التاريخ الطبي العائلي؟`,
            confirmText: 'نعم، احذف',
            onConfirm: () => {
                relativesList.splice(index, 1);
                bnStorage.set('familyHistory', relativesList);
                render();
                resetRelativeForm();
                toast('success', 'تم الحذف', 'تم حذف الفرد من السجل بنجاح.');
            }
        });
    }

    function resetRelativeForm() {
        const form = document.getElementById('relativeForm');
        if (!form) return;
        form.reset();
        document.getElementById('editIndex').value = '-1';
        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة فرد من العائلة';
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة الفرد';
        document.getElementById('cancelBtn').classList.add('d-none');
        document.querySelectorAll('#relativeForm .is-valid, #relativeForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#relativeForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    }

    /* ============================================================
       13. Bind Buttons (Cancel)
    ============================================================ */
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetRelativeForm);
    }

    /* ============================================================
       14. Init
    ============================================================ */
    function doInit() {
        console.log('🎯 تهيئة تبويب التاريخ الطبي العائلي...');

        // Init auto-save
        bnAutoSave.init();

        // Init validation
        bnValidation.attachToForm(relativeForm);

        // Render
        render();

        // Welcome toast
        setTimeout(() => {
            toast('info', 'التاريخ الطبي العائلي', 'سجّل الأمراض الوراثية والمزمنة في عائلة المريض.', 5000);
        }, 800);

        console.log('%c✅ Family Medical History Ready',
            'background:#8b5cf6;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }

})();