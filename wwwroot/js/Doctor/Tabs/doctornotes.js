/* ============================================================
   Doctor Notes Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initDoctorNotes() {
    console.log('🚀 DoctorNotes.js initialized');

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
        colors: ['#4338ca', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#0891b2', '#ec4899'],

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
            doctorNoteTitle: {
                required: true, minLength: 3, maxLength: 150,
                messages: { required: 'عنوان الملاحظة الطبية مطلوب' }
            },
            doctorNoteDate: {
                required: true,
                messages: { required: 'تاريخ الملاحظة مطلوب' }
            },
            doctorNoteContent: {
                required: true, minLength: 10, maxLength: 3000,
                messages: { required: 'محتوى الملاحظة الطبية مطلوب', minLength: 'المحتوى قصير جداً' }
            }
        },

        validators: {
            required: (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            },
            minLength: (value, len) => !value || value.length >= len,
            maxLength: (value, len) => !value || value.length <= len,
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
       5. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

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
       7. Doctor Notes CRUD
    ============================================================ */
    let doctorNotesList = storage.get('doctorNotes', [
        { title: 'التشخيص الأولي للحالة', date: '2024-01-08', category: 'تشخيص', priority: 'مهمة', content: 'بناءً على التقييم الإكلينيكي الأولي، تم تشخيص الحالة باضطراب القلق العام المصحوب بأعراض اكتئابية متوسطة.' },
        { title: 'تعديل الخطة العلاجية', date: '2024-01-20', category: 'خطة علاجية', priority: 'عاجلة', content: 'نظراً لعدم الاستجابة الكافية، تقرر رفع الجرعة تدريجياً مع إضافة مضاد قلق قصير المفعول.' }
    ]);

    function getDoctorNotePriorityClass(priority) {
        switch (priority) {
            case 'عاجلة': return 'doctor-note-priority-urgent';
            case 'مهمة': return 'doctor-note-priority-important';
            default: return 'doctor-note-priority-normal';
        }
    }

    function updateDoctorNotesCount() {
        const badge = document.getElementById('doctorNotesCountBadge');
        if (!badge) return;
        const count = doctorNotesList.length;
        badge.textContent = count === 0 ? '0 ملاحظة' :
            count === 1 ? 'ملاحظة واحدة' :
            count === 2 ? 'ملاحظتان' :
            count <= 10 ? `${count} ملاحظات` : `${count} ملاحظة`;
    }

    function renderDoctorNotes() {
        const grid = document.getElementById('doctorNotesGrid');
        const emptyState = document.getElementById('doctorNotesEmptyState');
        if (!grid || !emptyState) return;

        grid.innerHTML = '';
        if (doctorNotesList.length === 0) {
            emptyState.classList.remove('d-none');
            updateDoctorNotesCount();
            return;
        }
        emptyState.classList.add('d-none');

        doctorNotesList.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `doctor-note-card ${getDoctorNotePriorityClass(item.priority)}`;
            card.style.animation = `dn-slideUpFade 0.4s ease ${index * 0.05}s both`;
            card.innerHTML = `
                <div class="doctor-note-card-header">
                    <h4 class="doctor-note-title">${escapeHtml(item.title)}</h4>
                    <span class="doctor-note-priority-badge ${getDoctorNotePriorityClass(item.priority)}">${escapeHtml(item.priority)}</span>
                </div>
                ${item.category ? `<div class="doctor-note-category"><i class="fa-solid fa-tag"></i> ${escapeHtml(item.category)}</div>` : ''}
                <div class="doctor-note-content">${escapeHtml(item.content)}</div>
                <div class="doctor-note-footer">
                    <div class="doctor-note-date"><i class="fa-regular fa-calendar"></i> ${escapeHtml(item.date) || '-'}</div>
                    <div class="doctor-note-actions">
                        <button type="button" class="btn btn-outline-primary" onclick="editDoctorNote(${index})" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteDoctorNote(${index})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        updateDoctorNotesCount();
    }

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
            const item = {
                title: document.getElementById('doctorNoteTitle').value.trim(),
                date: document.getElementById('doctorNoteDate').value,
                category: document.getElementById('doctorNoteCategory').value,
                priority: document.getElementById('doctorNotePriority').value || 'عادية',
                content: document.getElementById('doctorNoteContent').value.trim()
            };

            if (editIndex >= 0) {
                doctorNotesList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تعديل الملاحظة الطبية.');
            } else {
                doctorNotesList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة الملاحظة الطبية.');
            }

            storage.set('doctorNotes', doctorNotesList);
            renderDoctorNotes();
            resetDoctorNoteForm();
            bnConfetti.fire();
        });
    }

    window.editDoctorNote = function (index) {
        const item = doctorNotesList[index];
        if (!item) return;
        document.getElementById('doctorNoteEditIndex').value = index;
        document.getElementById('doctorNoteTitle').value = item.title;
        document.getElementById('doctorNoteDate').value = item.date;
        document.getElementById('doctorNoteCategory').value = item.category || '';
        document.getElementById('doctorNotePriority').value = item.priority || 'عادية';
        document.getElementById('doctorNoteContent').value = item.content;
        document.getElementById('doctorNoteFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تعديل الملاحظة الطبية';
        document.getElementById('doctorNoteSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk ms-1"></i> حفظ التعديلات';
        document.getElementById('doctorNoteCancelBtn').classList.remove('d-none');
        document.getElementById('doctorNoteForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        document.getElementById('doctorNoteFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة ملاحظة طبية جديدة';
        document.getElementById('doctorNoteSubmitBtn').innerHTML = '<i class="fa-solid fa-plus ms-1"></i> إضافة الملاحظة الطبية';
        document.getElementById('doctorNoteCancelBtn').classList.add('d-none');
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        form.querySelectorAll('.bn-field-message').forEach(el => {
            el.className = 'bn-field-message';
            el.innerHTML = '';
        });
    };

    /* ============================================================
       8. Init
    ============================================================ */
    function doInit() {
        renderDoctorNotes();
        bnValidation.attachToForm(document.getElementById('doctorNoteForm'));

        setTimeout(() => {
            showToast('info', 'ملاحظات الطبيب المعالج', 'يمكنك إضافة وتعديل وحذف ملاحظات الطبيب المعالج هنا.', 5000);
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