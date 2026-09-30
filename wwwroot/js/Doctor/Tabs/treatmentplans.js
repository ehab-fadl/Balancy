/* ============================================================
   Treatment Plans Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initTreatmentPlans() {
    console.log('🚀 TreatmentPlans.js initialized');

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
       2. Toast (fallback)
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
        el: document.getElementById('bnConfetti'),
        colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],

        fire(duration = 2000) {
            if (!this.el) {
                const confettiEl = document.createElement('div');
                confettiEl.className = 'bn-confetti';
                confettiEl.id = 'bnConfetti';
                document.body.appendChild(confettiEl);
                this.el = confettiEl;
            }
            this.el.innerHTML = '';
            this.el.classList.add('active');

            const pieceCount = 60;
            for (let i = 0; i < pieceCount; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = Math.random() * 100 + '%';
                piece.style.animationDelay = Math.random() * 0.5 + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
                piece.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
                this.el.appendChild(piece);
            }

            setTimeout(() => {
                this.el.classList.remove('active');
                this.el.innerHTML = '';
            }, duration);
        }
    };

    /* ============================================================
       4. Focus Trap Utility
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
       5. Validation Engine
    ============================================================ */
    const bnValidation = {

        rules: {
            tpPlanName: { required: true, minLength: 3, maxLength: 150, messages: { required: 'اسم الخطة مطلوب' } },
            tpPlanDuration: { required: true, numberRange: { min: 1, max: 3650 }, messages: { required: 'مدة الخطة مطلوبة', numberRange: 'المدة يجب أن تكون بين 1 و 3650 يوم' } },
            tpPlanStatus: { required: true, messages: { required: 'يرجى اختيار حالة الخطة' } }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len,
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
       6. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       7. Modals (Edit + Confirm)
    ============================================================ */
    function showEditModal({ title, subtitle, label, value, onSave, placeholder }) {
        const modal = document.getElementById('bnEditModal');
        const titleEl = document.getElementById('bnEditModalTitle');
        const subtitleEl = document.getElementById('bnEditModalSubtitle');
        const labelEl = document.getElementById('bnEditModalLabel');
        const inputEl = document.getElementById('bnEditModalInput');

        titleEl.textContent = title || 'تعديل';
        subtitleEl.textContent = subtitle || 'قم بتعديل النص ثم اضغط حفظ';
        labelEl.textContent = label || 'النص';
        inputEl.value = value || '';
        inputEl.placeholder = placeholder || '';

        modal.classList.add('show');
        bnFocusTrap.activate(modal);

        const cleanup = () => {
            modal.classList.remove('show');
            bnFocusTrap.deactivate();
            document.getElementById('bnEditModalSave').removeEventListener('click', onSaveHandler);
            document.getElementById('bnEditModalCancel').removeEventListener('click', onCancelHandler);
            inputEl.removeEventListener('keydown', onKeyHandler);
            modal.removeEventListener('click', onOverlayClick);
        };

        const onSaveHandler = () => {
            const newValue = inputEl.value.trim();
            if (!newValue) {
                inputEl.style.borderColor = '#ef4444';
                setTimeout(() => { inputEl.style.borderColor = ''; }, 1200);
                return;
            }
            cleanup();
            onSave(newValue);
        };

        const onCancelHandler = () => cleanup();
        const onKeyHandler = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSaveHandler(); }
            else if (e.key === 'Escape') { e.preventDefault(); onCancelHandler(); }
        };
        const onOverlayClick = (e) => { if (e.target === modal) onCancelHandler(); };

        document.getElementById('bnEditModalSave').addEventListener('click', onSaveHandler);
        document.getElementById('bnEditModalCancel').addEventListener('click', onCancelHandler);
        inputEl.addEventListener('keydown', onKeyHandler);
        modal.addEventListener('click', onOverlayClick);

        setTimeout(() => { inputEl.focus(); inputEl.select(); }, 120);
    }

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
        bnFocusTrap.activate(modal);

        const cleanup = () => {
            modal.classList.remove('show');
            bnFocusTrap.deactivate();
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
       8. Treatment Plans CRUD
    ============================================================ */
    let treatmentPlansList = storage.get('treatmentPlans', [
        {
            name: 'خطة علاج القلق العام - المرحلة الأولى',
            duration: 30, status: 'نشطة', doctor: 'د. محمد العتيبي',
            notes: 'التركيز على تثبيت الجرعة الدوائية مع بدء جلسات العلاج المعرفي السلوكي.',
            problems: [
                {
                    text: 'القلق المفرط والمستمر',
                    goals: [
                        { text: 'تقليل شدة نوبات القلق اليومية', means: [{ text: 'تمارين التنفس العميق مرتين يومياً' }, { text: 'جلسة علاج معرفي سلوكي أسبوعية' }] },
                        { text: 'تحسين القدرة على التحكم بالقلق', means: [{ text: 'تدوين الأفكار القلقة يومياً' }] }
                    ]
                },
                {
                    text: 'اضطراب النوم',
                    goals: [{ text: 'تحسين جودة النوم', means: [{ text: 'روتين استرخاء مسائي ثابت' }, { text: 'إيقاف الشاشات قبل النوم بساعتين' }] }]
                }
            ]
        }
    ]);

    function getTpStatusBadge(status) {
        switch (status) {
            case 'نشطة': return 'tp-badge tp-badge-active';
            case 'مكتملة': return 'tp-badge tp-badge-completed';
            case 'ملغاة': return 'tp-badge tp-badge-cancelled';
            default: return 'tp-badge tp-badge-completed';
        }
    }

    function updateTpPlansCount() {
        const badge = document.getElementById('tpPlansCountBadge');
        if (!badge) return;
        const count = treatmentPlansList.length;
        badge.textContent = count === 0 ? '0 خطة' :
            count === 1 ? 'خطة واحدة' :
            count === 2 ? 'خطتان' :
            count <= 10 ? `${count} خطط` : `${count} خطة`;
    }

    function renderTreatmentPlans() {
        const container = document.getElementById('treatmentPlansContainer');
        const emptyState = document.getElementById('tpEmptyState');
        if (!container || !emptyState) return;

        container.innerHTML = '';
        if (treatmentPlansList.length === 0) {
            emptyState.classList.remove('d-none');
            updateTpPlansCount();
            return;
        }
        emptyState.classList.add('d-none');

        treatmentPlansList.forEach((plan, planIndex) => {
            const card = document.createElement('div');
            card.className = 'tp-plan-card';
            card.style.animation = `tp-slideUpFade 0.4s ease ${planIndex * 0.08}s both`;

            let problemsHtml = '';
            if (plan.problems.length === 0) {
                problemsHtml = `<p class="tp-empty-hint"><i class="fa-solid fa-circle-info ms-1"></i> لم تُضف أي مشاكل لهذه الخطة بعد.</p>`;
            } else {
                plan.problems.forEach((problem, problemIndex) => {
                    let goalsHtml = '';
                    if (problem.goals.length === 0) {
                        goalsHtml = `<p class="tp-empty-hint">لا توجد أهداف بعد.</p>`;
                    } else {
                        problem.goals.forEach((goal, goalIndex) => {
                            let meansHtml = '';
                            if (goal.means.length === 0) {
                                meansHtml = `<p class="tp-empty-hint">لا توجد وسائل بعد.</p>`;
                            } else {
                                goal.means.forEach((mean, meanIndex) => {
                                    meansHtml += `
                                        <div class="tp-mean">
                                            <span class="tp-mean-text"><i class="fa-solid fa-check-double"></i> ${escapeHtml(mean.text)}</span>
                                            <span class="tp-mini-actions">
                                                <button type="button" class="btn btn-outline-primary" onclick="editTpMean(${planIndex},${problemIndex},${goalIndex},${meanIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                                <button type="button" class="btn btn-outline-danger" onclick="deleteTpMean(${planIndex},${problemIndex},${goalIndex},${meanIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                            </span>
                                        </div>
                                    `;
                                });
                            }
                            goalsHtml += `
                                <div class="tp-goal">
                                    <div class="tp-goal-head">
                                        <span class="tp-goal-title"><i class="fa-solid fa-bullseye"></i> ${escapeHtml(goal.text)}</span>
                                        <span class="tp-mini-actions">
                                            <button type="button" class="btn btn-outline-primary" onclick="editTpGoal(${planIndex},${problemIndex},${goalIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                            <button type="button" class="btn btn-outline-danger" onclick="deleteTpGoal(${planIndex},${problemIndex},${goalIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                        </span>
                                    </div>
                                    <div class="tp-means">${meansHtml}</div>
                                    <div class="tp-inline-form">
                                        <input type="text" id="tpMeanInput_${planIndex}_${problemIndex}_${goalIndex}" placeholder="أضف وسيلة جديدة...">
                                        <button type="button" class="btn btn-success" onclick="addTpMean(${planIndex},${problemIndex},${goalIndex})"><i class="fa-solid fa-plus ms-1"></i> إضافة وسيلة</button>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    problemsHtml += `
                        <div class="tp-problem">
                            <div class="tp-problem-head">
                                <span class="tp-problem-title"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(problem.text)}</span>
                                <span class="tp-mini-actions">
                                    <button type="button" class="btn btn-outline-primary" onclick="editTpProblem(${planIndex},${problemIndex})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                                    <button type="button" class="btn btn-outline-danger" onclick="deleteTpProblem(${planIndex},${problemIndex})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                                </span>
                            </div>
                            <div class="tp-goals">${goalsHtml}</div>
                            <div class="tp-inline-form">
                                <input type="text" id="tpGoalInput_${planIndex}_${problemIndex}" placeholder="أضف هدفاً جديداً...">
                                <button type="button" class="btn btn-primary" onclick="addTpGoal(${planIndex},${problemIndex})"><i class="fa-solid fa-plus ms-1"></i> إضافة هدف</button>
                            </div>
                        </div>
                    `;
                });
            }

            card.innerHTML = `
                <div class="tp-plan-header">
                    <div>
                        <h4 class="tp-plan-title"><i class="fa-solid fa-clipboard-list text-primary"></i> ${escapeHtml(plan.name)}</h4>
                        <div class="tp-plan-meta">
                            <span class="tp-badge ${getTpStatusBadge(plan.status)}">${escapeHtml(plan.status)}</span>
                            <span><i class="fa-solid fa-hourglass-half ms-1"></i> ${escapeHtml(plan.duration)} يوم</span>
                            ${plan.doctor ? `<span><i class="fa-solid fa-user-doctor ms-1"></i> ${escapeHtml(plan.doctor)}</span>` : ''}
                        </div>
                    </div>
                    <div class="tp-plan-actions">
                        <button type="button" class="btn btn-outline-primary" onclick="editTreatmentPlan(${planIndex})"><i class="fa-solid fa-pen ms-1"></i> تعديل</button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteTreatmentPlan(${planIndex})"><i class="fa-solid fa-trash ms-1"></i> حذف</button>
                    </div>
                </div>
                ${plan.notes ? `<div class="tp-plan-notes"><i class="fa-solid fa-note-sticky ms-1"></i> ${escapeHtml(plan.notes)}</div>` : ''}
                <div class="tp-tree">${problemsHtml}</div>
                <div class="tp-add-problem-wrap">
                    <div class="tp-inline-form">
                        <input type="text" id="tpProblemInput_${planIndex}" placeholder="أضف مشكلة جديدة...">
                        <button type="button" class="btn btn-warning text-white" onclick="addTpProblem(${planIndex})"><i class="fa-solid fa-plus ms-1"></i> إضافة مشكلة</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        updateTpPlansCount();
    }

    const treatmentPlanForm = document.getElementById('treatmentPlanForm');
    if (treatmentPlanForm) {
        treatmentPlanForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} أخطاء في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('tpEditIndex').value, 10);
            const name = document.getElementById('tpPlanName').value.trim();
            const duration = parseInt(document.getElementById('tpPlanDuration').value, 10);
            const status = document.getElementById('tpPlanStatus').value;
            const doctor = document.getElementById('tpPlanDoctor').value.trim();
            const notes = document.getElementById('tpPlanNotes').value.trim();

            if (editIndex >= 0) {
                const existing = treatmentPlansList[editIndex];
                treatmentPlansList[editIndex] = { ...existing, name, duration, status, doctor, notes };
                showToast('success', 'تم التعديل', 'تم تحديث الخطة.');
            } else {
                treatmentPlansList.push({ name, duration, status, doctor, notes, problems: [] });
                showToast('success', 'تمت الإضافة', 'تمت إضافة الخطة.');
            }

            storage.set('treatmentPlans', treatmentPlansList);
            renderTreatmentPlans();
            resetTreatmentPlanForm();
            bnConfetti.fire();
        });
    }

    window.editTreatmentPlan = function (index) {
        const plan = treatmentPlansList[index];
        if (!plan) return;
        document.getElementById('tpEditIndex').value = index;
        document.getElementById('tpPlanName').value = plan.name;
        document.getElementById('tpPlanDuration').value = plan.duration;
        document.getElementById('tpPlanStatus').value = plan.status;
        document.getElementById('tpPlanDoctor').value = plan.doctor || '';
        document.getElementById('tpPlanNotes').value = plan.notes || '';
        document.getElementById('tpFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الخطة';
        document.getElementById('tpSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('tpCancelBtn').classList.remove('d-none');
        document.getElementById('treatmentPlanForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.deleteTreatmentPlan = function (index) {
        if (index < 0 || index >= treatmentPlansList.length) return;
        const plan = treatmentPlansList[index];
        showConfirmModal({
            title: 'تأكيد حذف الخطة',
            subtitle: 'سيتم حذف كل المشاكل والأهداف والوسائل التابعة لها',
            message: `هل أنت متأكد من حذف الخطة <strong>${escapeHtml(plan.name)}</strong>؟`,
            confirmText: 'نعم، احذف الخطة',
            onConfirm: () => {
                treatmentPlansList.splice(index, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                resetTreatmentPlanForm();
                showToast('success', 'تم الحذف', 'تم حذف الخطة.');
            }
        });
    };

    window.resetTreatmentPlanForm = function () {
        const form = document.getElementById('treatmentPlanForm');
        if (!form) return;
        form.reset();
        document.getElementById('tpEditIndex').value = '-1';
        document.getElementById('tpFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة خطة علاجية جديدة';
        document.getElementById('tpSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة الخطة';
        document.getElementById('tpCancelBtn').classList.add('d-none');
        document.querySelectorAll('#treatmentPlanForm .is-valid, #treatmentPlanForm .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#treatmentPlanForm .bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    window.addTpProblem = function (planIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan) return;
        const input = document.getElementById(`tpProblemInput_${planIndex}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص المشكلة.'); return; }
        plan.problems.push({ text, goals: [] });
        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', 'تمت الإضافة', 'تمت إضافة المشكلة.');
    };

    window.editTpProblem = function (planIndex, problemIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan || !plan.problems[problemIndex]) return;
        showEditModal({
            title: 'تعديل المشكلة',
            subtitle: 'قم بتعديل نص المشكلة ثم اضغط حفظ',
            label: 'نص المشكلة',
            value: plan.problems[problemIndex].text,
            placeholder: 'اكتب نص المشكلة...',
            onSave: (newValue) => {
                plan.problems[problemIndex].text = newValue;
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم التعديل', 'تم تعديل المشكلة.');
            }
        });
    };

    window.deleteTpProblem = function (planIndex, problemIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan || !plan.problems[problemIndex]) return;
        const problem = plan.problems[problemIndex];
        showConfirmModal({
            title: 'تأكيد حذف المشكلة',
            subtitle: 'سيتم حذف كل الأهداف والوسائل التابعة لها',
            message: `هل أنت متأكد من حذف المشكلة <strong>${escapeHtml(problem.text)}</strong>؟`,
            confirmText: 'نعم، احذف المشكلة',
            onConfirm: () => {
                plan.problems.splice(problemIndex, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم الحذف', 'تم حذف المشكلة.');
            }
        });
    };

    window.addTpGoal = function (planIndex, problemIndex) {
        const plan = treatmentPlansList[planIndex];
        if (!plan || !plan.problems[problemIndex]) return;
        const input = document.getElementById(`tpGoalInput_${planIndex}_${problemIndex}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص الهدف.'); return; }
        plan.problems[problemIndex].goals.push({ text, means: [] });
        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', 'تمت الإضافة', 'تمت إضافة الهدف.');
    };

    window.editTpGoal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;
        showEditModal({
            title: 'تعديل الهدف',
            subtitle: 'قم بتعديل نص الهدف',
            label: 'نص الهدف',
            value: goal.text,
            placeholder: 'اكتب نص الهدف...',
            onSave: (newValue) => {
                goal.text = newValue;
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم التعديل', 'تم تعديل الهدف.');
            }
        });
    };

    window.deleteTpGoal = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goals = plan?.problems?.[problemIndex]?.goals;
        if (!goals || !goals[goalIndex]) return;
        const goal = goals[goalIndex];
        showConfirmModal({
            title: 'تأكيد حذف الهدف',
            subtitle: 'سيتم حذف كل الوسائل التابعة لهذا الهدف',
            message: `هل أنت متأكد من حذف الهدف <strong>${escapeHtml(goal.text)}</strong>؟`,
            confirmText: 'نعم، احذف الهدف',
            onConfirm: () => {
                goals.splice(goalIndex, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم الحذف', 'تم حذف الهدف.');
            }
        });
    };

    window.addTpMean = function (planIndex, problemIndex, goalIndex) {
        const plan = treatmentPlansList[planIndex];
        const goal = plan?.problems?.[problemIndex]?.goals?.[goalIndex];
        if (!goal) return;
        const input = document.getElementById(`tpMeanInput_${planIndex}_${problemIndex}_${goalIndex}`);
        const text = input ? input.value.trim() : '';
        if (!text) { showToast('warning', 'حقل فارغ', 'يرجى كتابة نص الوسيلة.'); return; }
        goal.means.push({ text });
        storage.set('treatmentPlans', treatmentPlansList);
        renderTreatmentPlans();
        showToast('success', 'تمت الإضافة', 'تمت إضافة الوسيلة.');
    };

    window.editTpMean = function (planIndex, problemIndex, goalIndex, meanIndex) {
        const plan = treatmentPlansList[planIndex];
        const mean = plan?.problems?.[problemIndex]?.goals?.[goalIndex]?.means?.[meanIndex];
        if (!mean) return;
        showEditModal({
            title: 'تعديل الوسيلة',
            subtitle: 'قم بتعديل نص الوسيلة',
            label: 'نص الوسيلة',
            value: mean.text,
            placeholder: 'اكتب نص الوسيلة...',
            onSave: (newValue) => {
                mean.text = newValue;
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم التعديل', 'تم تعديل الوسيلة.');
            }
        });
    };

    window.deleteTpMean = function (planIndex, problemIndex, goalIndex, meanIndex) {
        const plan = treatmentPlansList[planIndex];
        const means = plan?.problems?.[problemIndex]?.goals?.[goalIndex]?.means;
        if (!means || !means[meanIndex]) return;
        const mean = means[meanIndex];
        showConfirmModal({
            title: 'تأكيد حذف الوسيلة',
            subtitle: 'لن تتمكن من استرجاع الوسيلة',
            message: `هل أنت متأكد من حذف الوسيلة <strong>${escapeHtml(mean.text)}</strong>؟`,
            confirmText: 'نعم، احذف الوسيلة',
            onConfirm: () => {
                means.splice(meanIndex, 1);
                storage.set('treatmentPlans', treatmentPlansList);
                renderTreatmentPlans();
                showToast('success', 'تم الحذف', 'تم حذف الوسيلة.');
            }
        });
    };

    /* ============================================================
       9. Init
    ============================================================ */
    function doInit() {
        renderTreatmentPlans();
        bnValidation.attachToForm(document.getElementById('treatmentPlanForm'));

        setTimeout(() => {
            showToast('info', 'الخطط العلاجية', 'يمكنك إنشاء خطط علاجية هرمية: مشاكل ← أهداف ← وسائل.', 5000);
        }, 1000);

        console.log('%c✅ Treatment Plans Tab Loaded',
            'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();