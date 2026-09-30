/* ============================================================
   Personal Info Tab — Standalone Script (Fixed Submit Binding)
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initPersonalInfo() {
    console.log('🚀 PersonalInfo.js initialized');

    /* ============================================================
       1. Storage Layer
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
       2. Toast
    ============================================================ */
    const showToast = (window.bnApp && window.bnApp.showToast)
        ? window.bnApp.showToast
        : function (type, title, message, duration = 3500) {
            console.log(`[Toast ${type}] ${title}: ${message}`);
        };

    /* ============================================================
       3. Confetti
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
       4. Validation Engine (موحّد)
    ============================================================ */
    const bnValidation = {

        rules: {
            firstName: {
                required: true, minLength: 2, maxLength: 50,
                pattern: /^[\u0600-\u06FFa-zA-Z\s'.-]+$/,
                messages: {
                    required: 'الاسم مطلوب',
                    minLength: 'الاسم قصير جداً (حرفان على الأقل)',
                    maxLength: 'الاسم طويل جداً',
                    pattern: 'الاسم يحتوي على رموز غير مسموحة'
                }
            },
            lastName: {
                required: true, minLength: 2, maxLength: 50,
                pattern: /^[\u0600-\u06FFa-zA-Z\s'.-]+$/,
                messages: {
                    required: 'الكنية مطلوبة',
                    minLength: 'الكنية قصيرة جداً',
                    maxLength: 'الكنية طويلة جداً',
                    pattern: 'الكنية تحتوي على رموز غير مسموحة'
                }
            },
            dateOfBirth: {
                required: true, dateNotFuture: true,
                ageRange: { min: 1, max: 120 },
                messages: {
                    required: 'تاريخ الميلاد مطلوب',
                    dateNotFuture: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل',
                    ageRange: 'العمر يجب أن يكون بين سنة و 120 سنة'
                }
            },
            gender: { required: true, messages: { required: 'يرجى اختيار الجنس' } },
            phone: { required: false, phone: true, messages: { phone: 'رقم الهاتف غير صحيح (مثال: +49 151 12345678)' } },
            email: { required: false, email: true, maxLength: 100, messages: { email: 'صيغة البريد الإلكتروني غير صحيحة', maxLength: 'البريد طويل جداً' } },
            address: { required: true, minLength: 5, maxLength: 300, messages: { required: 'العنوان مطلوب', minLength: 'العنوان قصير جداً' } },
            city: { required: false, minLength: 2, maxLength: 60, pattern: /^[\u0600-\u06FFa-zA-Z\s'.-]+$/, messages: { pattern: 'المدينة تحتوي على رموز غير صحيحة' } }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len,
            pattern: (value, regex) => !value || regex.test(value),
            email: (value) => {
                if (!value) return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
            },
            phone: (value) => {
                if (!value) return true;
                const cleaned = value.replace(/[\s\-()]/g, '');
                return /^(\+?\d{1,4})?\d{7,15}$/.test(cleaned);
            },
            dateNotFuture: (value) => {
                if (!value) return true;
                const input = new Date(value);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                return input <= today;
            },
            ageRange: (value, range) => {
                if (!value) return true;
                const birth = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                return age >= range.min && age <= range.max;
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

            if (rule.email && !this.validators.email(value)) {
                return { valid: false, type: 'error', message: rule.messages?.email || 'بريد إلكتروني غير صحيح' };
            }

            if (rule.phone && !this.validators.phone(value)) {
                return { valid: false, type: 'error', message: rule.messages?.phone || 'رقم هاتف غير صحيح' };
            }

            if (rule.dateNotFuture && !this.validators.dateNotFuture(value)) {
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ لا يمكن أن يكون في المستقبل' };
            }

            if (rule.ageRange && !this.validators.ageRange(value, rule.ageRange)) {
                return { valid: false, type: 'error', message: rule.messages?.ageRange || `العمر يجب أن يكون بين ${rule.ageRange.min} و ${rule.ageRange.max}` };
            }

            return { valid: true, type: 'success', message: 'صحيح' };
        },

        updateFieldUI(field, result) {
            const wrapper = field.closest('.col-md-6, .col-md-12, .col-12') || field.parentElement;

            field.classList.remove('is-valid', 'is-invalid', 'is-warning');

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
                const icon = result.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';
                messageEl.innerHTML = `<i class="fa-solid ${icon}"></i><span>${result.message}</span>`;
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
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       5. Auto-Save System
    ============================================================ */
    const bnAutoSave = {
        timers: {},
        delay: 1500,
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
        },

        clearDraft(key) {
            storage.remove('draft_' + key);
        },

        showIndicator(state) {
            const indicator = document.getElementById('saveIndicator');
            const indicatorText = document.getElementById('saveIndicatorText');
            if (!indicator || !indicatorText) return;

            clearTimeout(this.hideTimer);
            indicator.classList.add('show');
            indicator.classList.remove('saved');

            if (state === 'saving') {
                indicatorText.textContent = 'جاري الحفظ التلقائي...';
            } else if (state === 'saved') {
                indicator.classList.add('saved');
                indicatorText.textContent = 'تم الحفظ التلقائي';
                this.hideTimer = setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
        }
    };

    /* ============================================================
       6. Unsaved Changes Tracker
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
       7. Mock Patient Data & Load
    ============================================================ */
    const mockPatientData = {
        id: 1,
        firstName: 'أحمد',
        lastName: 'محمد علي',
        dateOfBirth: '1994-05-15',
        gender: 'male',
        phone: '+49 151 12345678',
        email: 'ahmed.patient@example.com',
        address: 'شارع المثال 25، الطابق الثاني',
        city: 'برلين',
        maritalStatus: 'married'
    };

    function loadPatientData() {
        const saved = storage.get('patientData', mockPatientData);
        fillPatientForm(saved);
    }

    function fillPatientForm(patient) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('firstName', patient.firstName);
        set('lastName', patient.lastName);
        set('dateOfBirth', patient.dateOfBirth);
        set('gender', patient.gender);
        set('phone', patient.phone);
        set('email', patient.email);
        set('address', patient.address);
        set('city', patient.city);
        set('maritalStatus', patient.maritalStatus);
    }

    async function mockPostRequest(data) {
        console.log('POST Patient Data:', data);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    /* ============================================================
       8. ✅ Wait for form + Bind (الإصلاح الأساسي)
    ============================================================ */
    function waitForFormThenInit(attempt = 0) {
        const form = document.getElementById('personalInfoForm');

        if (!form) {
            if (attempt < 20) {
                setTimeout(() => waitForFormThenInit(attempt + 1), 100);
            } else {
                console.warn('⚠️ PersonalInfoForm not found after 2s');
            }
            return;
        }

        console.log('✅ PersonalInfoForm found — binding...');
        initForm(form);
    }

    function initForm(form) {
        // منع الربط المزدوج
        if (form.dataset.bnBound === '1') {
            console.log('ℹ️ Form already bound — skipping');
            return;
        }
        form.dataset.bnBound = '1';

        // 1. تحميل البيانات
        loadPatientData();

        // 2. Auto-save
        bnAutoSave.init();

        // 3. Validation
        bnValidation.attachToForm(form);

        // 4. ✅ ربط submit — مع preventDefault
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            event.stopPropagation();

            console.log('📤 Form submitted — validating...');

            const { isValid, errors } = bnValidation.validateForm(this);

            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق',
                    `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return false;
            }

            const saveButton = document.getElementById('saveButton');
            const saveButtonText = document.getElementById('saveButtonText');
            const saveSpinner = document.getElementById('saveSpinner');

            const formData = new FormData(this);
            const patientData = Object.fromEntries(formData.entries());
            patientData.id = mockPatientData.id;

            if (saveButton) saveButton.disabled = true;
            if (saveButtonText) saveButtonText.classList.add('d-none');
            if (saveSpinner) saveSpinner.classList.remove('d-none');

            try {
                await mockPostRequest(patientData);
                storage.set('patientData', patientData);
                bnAutoSave.clearDraft('patientData');
                Object.assign(mockPatientData, patientData);
                bnUnsaved.markClean();
                bnConfetti.fire();
                showToast('success', 'تم الحفظ بنجاح', 'تم تحديث البيانات الشخصية للمريض.');
            } catch (error) {
                showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ البيانات.');
            } finally {
                if (saveButton) saveButton.disabled = false;
                if (saveSpinner) saveSpinner.classList.add('d-none');
                if (saveButtonText) saveButtonText.classList.remove('d-none');
            }

            return false;
        });

        // 5. تتبع التغييرات
        form.addEventListener('input', () => bnUnsaved.markDirty());

        // 6. إشعار ترحيبي
        setTimeout(() => {
            showToast('info', 'البيانات الشخصية',
                'يمكنك عرض وتعديل المعلومات الشخصية للمريض هنا. يتم الحفظ تلقائياً أثناء الكتابة.',
                5000);
        }, 1000);

        console.log('%c✅ Personal Info Tab Loaded & Bound',
            'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    /* ============================================================
       9. Start
    ============================================================ */
    function doInit() {
        waitForFormThenInit();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }

})();