/* ============================================================
   Depression Story Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initDepressionStory() {
    console.log('🚀 DepressionStory.js initialized');

    /* ============================================================
       1. Storage Layer (fallback)
    ============================================================ */
    const storage = (window.bnApp && window.bnApp.bnStorage) ? window.bnApp.bnStorage : {
        prefix: 'balancy_',
        isAvailable() {
            try {
                const test = '__bn_test__';
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
       2. Utilities — escapeHtml (مبكّر)
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       3. Toast — يدعم bnApp أو يعرض Toast مدمج على الشاشة
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-ds-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-ds-toast-styles';
        style.textContent = `
            .bn-ds-toast-overlay {
                position: fixed;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                pointer-events: none;
                padding: 1rem;
            }
            .bn-ds-toast-overlay.show { display: flex; }
            .bn-ds-toast {
                min-width: 300px;
                max-width: 92vw;
                padding: 1.1rem 1.4rem;
                border-radius: 16px;
                display: flex;
                align-items: center;
                gap: 0.85rem;
                font-family: 'Tajawal', sans-serif;
                font-weight: 800;
                font-size: 0.95rem;
                color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnDsToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                direction: rtl;
                line-height: 1.5;
            }
            .bn-ds-toast.hide { animation: bnDsToastOut 0.3s ease forwards; }
            .bn-ds-toast-icon {
                width: 38px;
                height: 38px;
                min-width: 38px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.22);
                font-size: 1.05rem;
            }
            .bn-ds-toast-body {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
                text-align: right;
            }
            .bn-ds-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-ds-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-ds-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-ds-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-ds-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-ds-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnDsToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnDsToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.92); }
            }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        let overlay = document.getElementById('bnDsToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnDsToastOverlay';
            overlay.className = 'bn-ds-toast-overlay';
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
        toast.className = `bn-ds-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-ds-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-ds-toast-body">
                <div class="bn-ds-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-ds-toast-message">${escapeHtml(message || '')}</div>
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
       5. Validation Engine — نسخة كاملة بأسلوب PersonalInfo
    ============================================================ */
    const bnValidation = {

        rules: {
            depressionStory: {
                required: true,
                minLength: 20,
                maxLength: 5000,
                noWhitespaceOnly: true,
                messages: {
                    required: 'قصة الاكتئاب مطلوبة',
                    minLength: 'القصة قصيرة جداً (20 حرفاً على الأقل)',
                    maxLength: 'القصة طويلة جداً (الحد الأقصى 5000 حرف)',
                    noWhitespaceOnly: 'لا يمكن أن تكون القصة فارغة أو مسافات فقط'
                }
            }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.trim().length >= len,
            maxLength: (value, len) => !value || value.length <= len,
            noWhitespaceOnly: (value) => {
                if (!value) return true;
                return value.trim().length > 0;
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

            if (rule.noWhitespaceOnly && !this.validators.noWhitespaceOnly(value)) {
                return { valid: false, type: 'error', message: rule.messages?.noWhitespaceOnly || 'لا يمكن أن يكون الحقل فارغاً' };
            }

            if (rule.minLength && !this.validators.minLength(value, rule.minLength)) {
                return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            }

            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
            }

            return { valid: true, type: 'success', message: 'صحيح' };
        },

        updateFieldUI(field, result) {
            const wrapper = field.closest('.col-12, .col-md-6, .col-md-12') || field.parentElement;

            field.classList.remove('is-valid', 'is-invalid');

            let messageEl = wrapper.querySelector('.bn-field-message');
            if (!messageEl) {
                messageEl = document.createElement('div');
                messageEl.className = 'bn-field-message';
                field.parentNode.insertBefore(messageEl, field.nextSibling);
            }

            if (result.valid && result.type === 'success' && field.value.trim().length >= 20) {
                field.classList.add('is-valid');
                messageEl.className = 'bn-field-message success show';
                messageEl.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>القصة مكتملة وجاهزة للحفظ</span>';
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
                    <button type="button" class="bn-summary-close" aria-label="إغلاق لوح الأخطاء">
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

            const closeBtn = summary.querySelector('.bn-summary-close');
            closeBtn.addEventListener('click', () => {
                summary.style.transition = 'opacity 0.3s ease';
                summary.style.opacity = '0';
                setTimeout(() => summary.remove(), 300);
            });

            const watchedFields = errors.map(e => e.field);
            const checkAllFixed = () => {
                const allFixed = watchedFields.every(f => {
                    const res = this.validateField(f);
                    return res.valid;
                });
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
            if (label && this.rules[name].required) {
                label.classList.add('required');
            }

            field.addEventListener('blur', () => {
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
       6. Auto-Save System
    ============================================================ */
    const bnAutoSave = {
        timers: {},
        delay: 1500,
        indicator: document.getElementById('saveIndicator'),
        indicatorText: document.getElementById('saveIndicatorText'),
        hideTimer: null,

        init() {
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

            storage.set('draft_' + key, {
                data,
                savedAt: new Date().toISOString()
            });

            this.showIndicator('saved');
        },

        restore(form, key) {
            const draft = storage.get('draft_' + key);
            if (!draft || !draft.data) return;

            const hasData = Object.values(draft.data).some(v => v && String(v).trim() !== '');
            if (!hasData) return;

            Object.entries(draft.data).forEach(([name, value]) => {
                const field = form.querySelector(`[name="${name}"]`);
                if (field) field.value = value;
            });

            updateCharCounter();
        },

        clearDraft(key) {
            storage.remove('draft_' + key);
        },

        showIndicator(state) {
            if (!this.indicator) return;
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
       7. Unsaved Changes Tracker
    ============================================================ */
    const bnUnsaved = {
        isDirty: false,
        markDirty() { this.isDirty = true; },
        markClean() { this.isDirty = false; }
    };

    window.addEventListener('beforeunload', (e) => {
        if (bnUnsaved.isDirty) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });

    /* ============================================================
       8. Character Counter
    ============================================================ */
    const MAX_CHARS = 5000;
    const MIN_CHARS = 20;

    function updateCharCounter() {
        const textarea = document.getElementById('depressionStory');
        const counter = document.getElementById('charCount');
        const counterWrap = document.getElementById('charCounter');

        if (!textarea || !counter || !counterWrap) return;

        const length = textarea.value.length;
        counter.textContent = length;

        counterWrap.classList.remove('warning', 'danger');

        if (length > MAX_CHARS) {
            counterWrap.classList.add('danger');
            counter.textContent = length;
        } else if (length > MAX_CHARS * 0.9) {
            counterWrap.classList.add('warning');
        }
    }

    /* ============================================================
       9. Mock Data & Load
    ============================================================ */
    const mockDepressionStory = {
        id: 1,
        story: 'بدأت أعراض الاكتئاب لدى المريض قبل نحو ثلاث سنوات، عقب فقدان وظيفته وتدهور أوضاعه المادية والأسرية. لاحظ المريض في البداية فقداناً تدريجياً للاهتمام بالأنشطة، مع شعور دائم بالحزن والإرهاق واضطراب في النوم والشهية. تمت مراجعة العيادة بعد ستة أشهر، وبدأ العلاج بمضادات الاكتئاب مع جلسات دعم نفسي أسبوعية.'
    };

    function loadDepressionStory() {
        const saved = storage.get('depressionStory', mockDepressionStory.story);
        const textarea = document.getElementById('depressionStory');
        if (textarea) textarea.value = saved || '';
        updateCharCounter();
    }

    /* ============================================================
       10. Submit Handler
    ============================================================ */
    const form = document.getElementById('depressionStoryForm');
    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);

            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const saveButton = document.getElementById('saveStoryButton');
            const saveButtonText = document.getElementById('saveStoryButtonText');
            const saveSpinner = document.getElementById('saveStorySpinner');
            const storyData = {
                id: mockDepressionStory.id,
                story: document.getElementById('depressionStory').value.trim()
            };

            saveButton.disabled = true;
            saveButtonText.classList.add('d-none');
            saveSpinner.classList.remove('d-none');

            try {
                await mockPostRequest(storyData);
                mockDepressionStory.story = storyData.story;
                storage.set('depressionStory', storyData.story);
                bnAutoSave.clearDraft('depressionStoryDraft');
                bnUnsaved.markClean();
                bnConfetti.fire();
                showToast('success', 'تم الحفظ بنجاح', 'تم حفظ قصة مرض الاكتئاب.');
            } catch (error) {
                showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ القصة.');
            } finally {
                saveButton.disabled = false;
                saveSpinner.classList.add('d-none');
                saveButtonText.classList.remove('d-none');
            }
        });

        form.addEventListener('input', () => bnUnsaved.markDirty());
    }

    async function mockPostRequest(data) {
        console.log('POST Depression Story:', data);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    /* ============================================================
       11. Init
    ============================================================ */
    function doInit() {
        loadDepressionStory();

        const textarea = document.getElementById('depressionStory');
        if (textarea) {
            textarea.addEventListener('input', updateCharCounter);
        }

        bnAutoSave.init();
        bnValidation.attachToForm(document.getElementById('depressionStoryForm'));

        setTimeout(() => {
            showToast('info', 'قصة مرض الاكتئاب', 'يمكنك قراءة وتعديل وحفظ القصة المرضية الكاملة للمريض هنا. يتم الحفظ تلقائياً أثناء الكتابة.', 5000);
        }, 1000);

        console.log('%c✅ Depression Story Tab Loaded',
            'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();