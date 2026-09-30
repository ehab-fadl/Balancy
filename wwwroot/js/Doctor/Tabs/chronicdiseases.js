/* ============================================================
   Chronic Diseases Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initChronicDiseases() {
    console.log('🚀 ChronicDiseases.js initialized');

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
       3. Confirm Modal
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
            noWhitespaceOnly: (v) => {
                if (!v) return true;
                return v.trim().length > 0;
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

            if (rule.noWhitespaceOnly && !this.validators.noWhitespaceOnly(value)) {
                return { valid: false, type: 'error', message: rule.messages?.noWhitespaceOnly || 'لا يمكن أن يكون الحقل فارغاً' };
            }
            if (rule.minLength && !this.validators.minLength(value, rule.minLength)) {
                return { valid: false, type: 'error', message: rule.messages?.minLength || `يجب أن يكون ${rule.minLength} أحرف على الأقل` };
            }
            if (rule.maxLength && !this.validators.maxLength(value, rule.maxLength)) {
                return { valid: false, type: 'error', message: rule.messages?.maxLength || `الحد الأقصى ${rule.maxLength} حرف` };
            }
            if (rule.dateNotFuture && !this.validators.dateNotFuture(value)) {
                return { valid: false, type: 'error', message: rule.messages?.dateNotFuture || 'التاريخ لا يمكن أن يكون في المستقبل' };
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

        /* ============================================================
           ✅ showSummary — جديد
           - اللوح يبقى ظاهراً (لا يختفي تلقائياً)
           - زر إغلاق (×) يدوي
           - يختفي تلقائياً فقط عند تصحيح كل الأخطاء
        ============================================================ */
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
            form.querySelectorAll('input, select, textarea').forEach(field => this.attachToField(field));
        }
    };

    /* ============================================================
       5. Escape HTML
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       6. Chronic Diseases CRUD
    ============================================================ */
    let chronicDiseasesList = storage.get('chronicDiseases', [
        { name: 'ارتفاع ضغط الدم', date: '2021-04-10', meds: 'أملوديبين 5 مغ', notes: 'يتم فحص الضغط بشكل منتظم.' }
    ]);

    function renderChronicTable() {
        const tbody = document.getElementById('chronicTableBody');
        const emptyState = document.getElementById('chronicEmptyState');
        const badge = document.getElementById('chronicCountBadge');
        if (!tbody) return;

        tbody.innerHTML = '';
        emptyState.style.display = chronicDiseasesList.length === 0 ? 'block' : 'none';

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
                <td data-label="تاريخ التشخيص">${escapeHtml(item.date)}</td>
                <td data-label="الأدوية">${escapeHtml(item.meds)}</td>
                <td data-label="ملاحظات">${item.notes ? escapeHtml(item.notes) : '<span style="color: var(--bn-text-muted);">—</span>'}</td>
                <td class="text-center">
                    <div class="action-btns">
                        <button type="button" class="btn btn-edit" onclick="editChronicItem(${index})" aria-label="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-delete" onclick="deleteChronicItem(${index})" aria-label="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const chronicForm = document.getElementById('chronicForm');
    if (chronicForm) {
        chronicForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                // ✅ عرض لوح الأخطاء (جديد)
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('chronicEditIndex').value);
            const item = {
                name: document.getElementById('diseaseName').value.trim(),
                date: document.getElementById('diseaseDate').value,
                meds: document.getElementById('diseaseMeds').value.trim(),
                notes: document.getElementById('diseaseNotes').value.trim()
            };

            if (editIndex === -1) {
                chronicDiseasesList.push(item);
                showToast('success', 'تم الإضافة', 'تمت إضافة المرض المزمن بنجاح.');
            } else {
                chronicDiseasesList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تحديث المرض المزمن بنجاح.');
            }

            storage.set('chronicDiseases', chronicDiseasesList);
            resetChronicForm();
            renderChronicTable();
        });
    }

    // ✅ Expose globally (يُستدعى من onclick في HTML)
    window.editChronicItem = function (index) {
        const item = chronicDiseasesList[index];
        if (!item) return;
        document.getElementById('diseaseName').value = item.name;
        document.getElementById('diseaseDate').value = item.date;
        document.getElementById('diseaseMeds').value = item.meds;
        document.getElementById('diseaseNotes').value = item.notes || '';
        document.getElementById('chronicEditIndex').value = index;
        document.getElementById('chronicFormTitle').textContent = 'تعديل المرض المزمن';
        document.getElementById('chronicSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('chronicCancelBtn').classList.remove('d-none');
        document.getElementById('chronicForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.name}`);
    };

    window.deleteChronicItem = function (index) {
        if (index < 0 || index >= chronicDiseasesList.length) return;
        const item = chronicDiseasesList[index];
        showConfirmModal({
            title: 'تأكيد حذف المرض المزمن',
            subtitle: 'لن تتمكن من استرجاع هذا المرض بعد الحذف',
            message: `هل أنت متأكد من حذف المرض <strong>${escapeHtml(item.name)}</strong>؟`,
            confirmText: 'نعم، احذف المرض',
            onConfirm: () => {
                chronicDiseasesList.splice(index, 1);
                storage.set('chronicDiseases', chronicDiseasesList);
                renderChronicTable();
                resetChronicForm();
                showToast('success', 'تم الحذف', 'تم حذف المرض المزمن بنجاح.');
            }
        });
    };

    window.resetChronicForm = function () {
        const form = document.getElementById('chronicForm');
        if (!form) return;
        form.reset();
        document.getElementById('chronicEditIndex').value = '-1';
        document.getElementById('chronicFormTitle').textContent = 'إضافة مرض مزمن جديد';
        document.getElementById('chronicSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة المرض';
        document.getElementById('chronicCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
        // ✅ إزالة لوح الأخطاء عند إعادة التعيين
        const summary = form.querySelector('.bn-validation-summary');
        if (summary) summary.remove();
    };

    /* ============================================================
       7. Init
    ============================================================ */
    function doInit() {
        renderChronicTable();
        bnValidation.attachToForm(document.getElementById('chronicForm'));

        // ✅ إشعار ترحيبي عند فتح التبويب (مثل Diagnosis و PersonalInfo و DepressionStory)
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