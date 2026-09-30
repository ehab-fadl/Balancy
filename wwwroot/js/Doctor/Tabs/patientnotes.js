/* ============================================================
   Patient Notes Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initPatientNotes() {
    console.log('🚀 PatientNotes.js initialized');

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
        colors: ['#6366f1', '#8b5cf6', '#818cf8', '#10b981', '#f59e0b', '#ec4899', '#0891b2'],

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
            noteTitle: {
                required: true, minLength: 3, maxLength: 150,
                noWhitespaceOnly: true,
                messages: {
                    required: 'عنوان الملاحظة مطلوب',
                    minLength: 'العنوان قصير جداً (3 أحرف على الأقل)',
                    maxLength: 'العنوان طويل جداً',
                    noWhitespaceOnly: 'لا يمكن أن يكون العنوان فارغاً'
                }
            },
            noteDate: {
                required: true,
                messages: { required: 'تاريخ الملاحظة مطلوب' }
            },
            noteContent: {
                required: true, minLength: 10, maxLength: 3000,
                noWhitespaceOnly: true,
                messages: {
                    required: 'محتوى الملاحظة مطلوب',
                    minLength: 'المحتوى قصير جداً (10 أحرف على الأقل)',
                    maxLength: 'المحتوى طويل جداً (الحد الأقصى 3000 حرف)',
                    noWhitespaceOnly: 'لا يمكن أن يكون المحتوى فارغاً'
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
       6. Priority Helpers
    ============================================================ */
    function getNotePriorityClass(priority) {
        switch (priority) {
            case 'عاجلة': return 'note-priority-urgent';
            case 'مهمة': return 'note-priority-important';
            default: return 'note-priority-normal';
        }
    }

    function getNoteCardPriorityClass(priority) {
        switch (priority) {
            case 'عاجلة': return 'note-priority-urgent';
            case 'مهمة': return 'note-priority-important';
            default: return 'note-priority-normal';
        }
    }

    function updateNotesCount() {
        const badge = document.getElementById('notesCountBadge');
        if (!badge) return;
        const count = patientNotesList.length;
        badge.textContent = count === 0 ? '0 ملاحظة' :
            count === 1 ? 'ملاحظة واحدة' :
            count === 2 ? 'ملاحظتان' :
            count <= 10 ? `${count} ملاحظات` : `${count} ملاحظة`;
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
       8. Patient Notes CRUD
    ============================================================ */
    let patientNotesList = storage.get('patientNotes', [
        {
            title: 'ملاحظة حول الحالة المزاجية',
            date: '2024-01-12',
            category: 'ملاحظة إكلينيكية',
            priority: 'مهمة',
            content: 'لاحظ المريض تحسناً ملحوظاً في المزاج العام خلال الأسبوع الأخير، مع زيادة في الدافعية للقيام بالأنشطة اليومية.'
        },
        {
            title: 'متابعة النوم',
            date: '2024-01-18',
            category: 'ملاحظة سلوكية',
            priority: 'عادية',
            content: 'استمرار اضطراب النوم مع صعوبة في النوم المبكر. ينصح بتقليل استخدام الشاشات قبل النوم بساعتين على الأقل.'
        }
    ]);

    function renderPatientNotes() {
        const grid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('notesEmptyState');
        if (!grid) return;

        grid.innerHTML = '';
        emptyState.style.display = patientNotesList.length === 0 ? 'block' : 'none';

        if (patientNotesList.length === 0) {
            updateNotesCount();
            return;
        }

        patientNotesList.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `note-card ${getNoteCardPriorityClass(item.priority)}`;
            card.style.animation = `pn-noteSlideIn 0.4s ease ${index * 0.05}s both`;

            card.innerHTML = `
                <div class="note-card-header">
                    <h4 class="note-title">${escapeHtml(item.title)}</h4>
                    <span class="note-priority-badge ${getNotePriorityClass(item.priority)}">${escapeHtml(item.priority)}</span>
                </div>
                ${item.category ? `<div class="note-category"><i class="fa-solid fa-tag"></i> ${escapeHtml(item.category)}</div>` : ''}
                <div class="note-content">${escapeHtml(item.content)}</div>
                <div class="note-footer">
                    <div class="note-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${escapeHtml(item.date) || '-'}
                    </div>
                    <div class="note-actions">
                        <button type="button" class="btn btn-edit" onclick="editPatientNote(${index})" aria-label="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-delete" onclick="deletePatientNote(${index})" aria-label="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        updateNotesCount();
    }

    const patientNoteForm = document.getElementById('patientNoteForm');
    if (patientNoteForm) {
        patientNoteForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const { isValid, errors } = bnValidation.validateForm(this);
            if (!isValid) {
                // ✅ عرض لوح الأخطاء (جديد)
                bnValidation.showSummary(this, errors);
                bnValidation.scrollToFirstError(this);
                showToast('error', 'فشل التحقق', `يوجد ${errors.length} ${errors.length === 1 ? 'خطأ' : 'أخطاء'} في النموذج.`);
                return;
            }

            const editIndex = parseInt(document.getElementById('noteEditIndex').value);
            const item = {
                title: document.getElementById('noteTitle').value.trim(),
                date: document.getElementById('noteDate').value,
                category: document.getElementById('noteCategory').value,
                priority: document.getElementById('notePriority').value || 'عادية',
                content: document.getElementById('noteContent').value.trim()
            };

            if (editIndex === -1) {
                patientNotesList.push(item);
                showToast('success', 'تمت الإضافة', 'تمت إضافة الملاحظة بنجاح.');
            } else {
                patientNotesList[editIndex] = item;
                showToast('success', 'تم التعديل', 'تم تحديث الملاحظة بنجاح.');
            }

            storage.set('patientNotes', patientNotesList);
            resetPatientNoteForm();
            renderPatientNotes();
            bnConfetti.fire();
        });
    }

    window.editPatientNote = function (index) {
        const item = patientNotesList[index];
        if (!item) return;
        document.getElementById('noteTitle').value = item.title;
        document.getElementById('noteDate').value = item.date;
        document.getElementById('noteCategory').value = item.category || '';
        document.getElementById('notePriority').value = item.priority || 'عادية';
        document.getElementById('noteContent').value = item.content;
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
            subtitle: 'لن تتمكن من استرجاع هذه الملاحظة بعد الحذف',
            message: `هل أنت متأكد من حذف الملاحظة <strong>${escapeHtml(item.title)}</strong>؟`,
            confirmText: 'نعم، احذف الملاحظة',
            onConfirm: () => {
                patientNotesList.splice(index, 1);
                storage.set('patientNotes', patientNotesList);
                renderPatientNotes();
                resetPatientNoteForm();
                showToast('success', 'تم الحذف', 'تم حذف الملاحظة بنجاح.');
            }
        });
    };

    window.resetPatientNoteForm = function () {
        const form = document.getElementById('patientNoteForm');
        if (!form) return;
        form.reset();
        document.getElementById('noteEditIndex').value = '-1';
        document.getElementById('notePriority').value = 'عادية';
        document.getElementById('noteFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة ملاحظة جديدة';
        document.getElementById('noteSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة الملاحظة';
        document.getElementById('noteCancelBtn').classList.add('d-none');
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
        renderPatientNotes();
        bnValidation.attachToForm(document.getElementById('patientNoteForm'));

        setTimeout(() => {
            showToast('info', 'ملاحظات المريض', 'يمكنك إدارة ملاحظات المريض هنا.', 5000);
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