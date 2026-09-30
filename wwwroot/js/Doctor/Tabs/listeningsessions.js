/* ============================================================
   Listening Sessions Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initListeningSessions() {
    console.log('🚀 ListeningSessions.js initialized');

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
        colors: ['#0891b2', '#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],

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
       4. Validation Engine
    ============================================================ */
    const bnValidation = {
        rules: {
            sessionTitle: {
                required: true, minLength: 3, maxLength: 150,
                noWhitespaceOnly: true,
                messages: {
                    required: 'عنوان الجلسة مطلوب',
                    minLength: 'العنوان قصير جداً (3 أحرف على الأقل)',
                    maxLength: 'العنوان طويل جداً',
                    noWhitespaceOnly: 'لا يمكن أن يكون العنوان فارغاً'
                }
            },
            sessionDate: {
                required: true,
                messages: { required: 'تاريخ الجلسة مطلوب' }
            },
            sessionDuration: {
                required: false, numberRange: { min: 1, max: 480 },
                messages: { numberRange: 'المدة يجب أن تكون بين 1 و 480 دقيقة' }
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
            numberRange: (value, range) => {
                if (value === '' || value === null || value === undefined) return true;
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
                const evt = (f.tagName === 'SELECT' || f.type === 'date' || f.type === 'time') ? 'change' : 'input';
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

            const eventType = (field.type === 'date' || field.type === 'time' || field.tagName === 'SELECT') ? 'change' : 'blur';

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
       6. Badge Helpers
    ============================================================ */
    function getSessionStatusBadge(status) {
        switch (status) {
            case 'مكتملة':
                return '<span class="badge-soft badge-status-completed"><i class="fa-solid fa-circle-check"></i> مكتملة</span>';
            case 'مجدولة':
                return '<span class="badge-soft badge-status-scheduled"><i class="fa-regular fa-clock"></i> مجدولة</span>';
            case 'ملغية':
                return '<span class="badge-soft badge-status-cancelled"><i class="fa-solid fa-circle-xmark"></i> ملغية</span>';
            case 'مؤجلة':
                return '<span class="badge-soft badge-status-postponed"><i class="fa-solid fa-clock-rotate-left"></i> مؤجلة</span>';
            default:
                return '<span class="badge-soft">-</span>';
        }
    }

    function getSessionTypeBadge(type) {
        if (!type) return '<span class="badge-soft">-</span>';
        return `<span class="badge-soft badge-type-default"><i class="fa-solid fa-tag"></i> ${escapeHtml(type)}</span>`;
    }

    /* ============================================================
       7. Confirm Modal
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
       8. Listening Sessions CRUD
    ============================================================ */
    let listeningSessionsList = storage.get('listeningSessions', [
        {
            title: 'جلسة استماع أولى - تقييم مبدئي',
            date: '2024-01-10',
            time: '10:30',
            duration: 45,
            type: 'جلسة استماع فردية',
            status: 'مكتملة',
            notes: 'تم الاستماع لمشكلات المريض الأساسية ووضع خطة أولية للمتابعة.'
        },
        {
            title: 'جلسة متابعة أسبوعية',
            date: '2024-01-17',
            time: '11:00',
            duration: 30,
            type: 'جلسة متابعة',
            status: 'مكتملة',
            notes: 'تحسن ملحوظ في المزاج، الاستمرار على نفس الجرعة الدوائية.'
        }
    ]);

    function renderListeningSessionsTable() {
        const tbody = document.getElementById('sessionTableBody');
        const emptyState = document.getElementById('sessionEmptyState');
        const badge = document.getElementById('sessionCountBadge');
        if (!tbody) return;

        tbody.innerHTML = '';
        emptyState.style.display = listeningSessionsList.length === 0 ? 'block' : 'none';

        if (badge) {
            if (listeningSessionsList.length > 0) {
                badge.textContent = listeningSessionsList.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        listeningSessionsList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `ls-rowSlideIn 0.35s ease ${index * 0.05}s both`;
            tr.innerHTML = `
                <td data-label="#">
                    <span class="table-index">${index + 1}</span>
                </td>
                <td data-label="عنوان الجلسة">
                    <span class="session-title">
                        <i class="fa-solid fa-headphones"></i>
                        ${escapeHtml(item.title)}
                    </span>
                </td>
                <td data-label="التاريخ">${escapeHtml(item.date)}</td>
                <td data-label="الوقت">${item.time ? escapeHtml(item.time) : '—'}</td>
                <td data-label="المدة">${item.duration ? escapeHtml(item.duration) + ' دقيقة' : '—'}</td>
                <td data-label="النوع">${getSessionTypeBadge(item.type)}</td>
                <td data-label="الحالة">${getSessionStatusBadge(item.status)}</td>
                <td data-label="ملاحظات" style="max-width: 250px; white-space: normal;">${item.notes ? escapeHtml(item.notes) : '—'}</td>
                <td class="text-center">
                    <div class="action-btns">
                        <button type="button" class="btn btn-edit" onclick="editListeningSessionItem(${index})" aria-label="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-delete" onclick="deleteListeningSessionItem(${index})" aria-label="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const listeningSessionForm = document.getElementById('listeningSessionForm');
    if (listeningSessionForm) {
        listeningSessionForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                // ✅ عرض لوح الأخطاء (جديد)
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('sessionEditIndex').value);
            const item = {
                title: document.getElementById('sessionTitle').value.trim(),
                date: document.getElementById('sessionDate').value,
                time: document.getElementById('sessionTime').value,
                duration: document.getElementById('sessionDuration').value,
                type: document.getElementById('sessionType').value,
                status: document.getElementById('sessionStatus').value,
                notes: document.getElementById('sessionNotes').value.trim()
            };

            if (editIndex === -1) {
                listeningSessionsList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة جلسة الاستماع بنجاح.');
            } else {
                listeningSessionsList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تحديث بيانات الجلسة بنجاح.');
            }

            storage.set('listeningSessions', listeningSessionsList);
            resetListeningSessionForm();
            renderListeningSessionsTable();
            bnConfetti.fire();
        });
    }

    window.editListeningSessionItem = function (index) {
        const item = listeningSessionsList[index];
        if (!item) return;
        document.getElementById('sessionTitle').value = item.title;
        document.getElementById('sessionDate').value = item.date;
        document.getElementById('sessionTime').value = item.time || '';
        document.getElementById('sessionDuration').value = item.duration || '';
        document.getElementById('sessionType').value = item.type || '';
        document.getElementById('sessionStatus').value = item.status || '';
        document.getElementById('sessionNotes').value = item.notes || '';
        document.getElementById('sessionEditIndex').value = index;
        document.getElementById('sessionFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل جلسة الاستماع';
        document.getElementById('sessionSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديل';
        document.getElementById('sessionCancelBtn').classList.remove('d-none');
        document.getElementById('listeningSessionForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('info', 'وضع التعديل', `يمكنك الآن تعديل: ${item.title}`);
    };

    window.deleteListeningSessionItem = function (index) {
        if (index < 0 || index >= listeningSessionsList.length) return;
        const item = listeningSessionsList[index];
        showConfirmModal({
            title: 'تأكيد حذف الجلسة',
            subtitle: 'لن تتمكن من استرجاع هذه الجلسة بعد الحذف',
            message: `هل أنت متأكد من حذف الجلسة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الجلسة',
            onConfirm: () => {
                listeningSessionsList.splice(index, 1);
                storage.set('listeningSessions', listeningSessionsList);
                renderListeningSessionsTable();
                resetListeningSessionForm();
                showToast('success', 'تم الحذف', 'تم حذف جلسة الاستماع بنجاح.');
            }
        });
    };

    window.resetListeningSessionForm = function () {
        const form = document.getElementById('listeningSessionForm');
        if (!form) return;
        form.reset();
        document.getElementById('sessionEditIndex').value = '-1';
        document.getElementById('sessionFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة جلسة استماع جديدة';
        document.getElementById('sessionSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة الجلسة';
        document.getElementById('sessionCancelBtn').classList.add('d-none');
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
       9. Init
    ============================================================ */
    function doInit() {
        renderListeningSessionsTable();
        bnValidation.attachToForm(document.getElementById('listeningSessionForm'));

        setTimeout(() => {
            showToast('info', 'جلسات الاستماع', 'يمكنك إدارة جلسات الاستماع والمتابعة هنا.', 5000);
        }, 1000);

        console.log('%c✅ Listening Sessions Tab Loaded',
            'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }
})();