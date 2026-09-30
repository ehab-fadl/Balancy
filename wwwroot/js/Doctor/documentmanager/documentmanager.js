/* ============================================================
   Document Manager — Complete Script (Clean, No C# dependency)
   IIFE معزول — لا يتعارض مع أي كود قديم
   patientId يُقرأ من URL مباشرة
============================================================ */
(function initDocumentManager() {
    'use strict';

    console.log('🚀 DocumentManager.js initialized');

    /* ============================================================
       0. Patient Context (من URL — بدون C#)
    ============================================================ */
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId')
        || urlParams.get('id')
        || sessionStorage.getItem('bnCurrentPatientId')
        || '';
    const patientName = patientId ? ('المريض رقم ' + patientId) : 'وثائق عامة';
    const storageKey = patientId ? `documents_patient_${patientId}` : 'documents_general';

    // حفظ في window للاستخدام العام
    window.bnCurrentPatientId = patientId;
    if (patientId) sessionStorage.setItem('bnCurrentPatientId', patientId);

    console.log(`📁 مدير الوثائق — ${patientName}${patientId ? ` (ID: ${patientId})` : ''}`);

    /* ============================================================
       1. Toast Helper
    ============================================================ */
    function toast(type, title, message, duration = 3500) {
        if (window.bnApp && typeof window.bnApp.showToast === 'function') {
            return window.bnApp.showToast(type, title, message, duration);
        }
        if (typeof window.showToast === 'function') {
            return window.showToast(type, title, message, duration);
        }
        console.log(`[Toast ${type}] ${title}: ${message}`);
    }

    /* ============================================================
       2. Storage (Scoped)
    ============================================================ */
    const bnStorage = {
        prefix: 'balancy_',
        isAvailable() {
            try {
                const test = '__bn_dm_test__';
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
        }
    };

    /* ============================================================
       3. Theme Manager
    ============================================================ */
    const bnTheme = {
        init() { this.apply(bnStorage.get('theme', 'light')); },
        apply(t) {
            document.documentElement.setAttribute('data-theme', t);
            bnStorage.set('theme', t);
        },
        toggle() {
            const cur = document.documentElement.getAttribute('data-theme') || 'light';
            const next = cur === 'dark' ? 'light' : 'dark';
            this.apply(next);
            return next;
        }
    };

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const t = bnTheme.toggle();
            showToast('success', 'تغيير المظهر',
                t === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري');
        });
    }

    /* ============================================================
       4. Toast (رسومي)
    ============================================================ */
    let toastTimeoutId = null;
    let toastHideTimeoutId = null;

    function showToast(type, title, message, duration = 3500) {
        const el = document.getElementById('notificationToast');
        if (!el) { console.log(`[Toast ${type}] ${title}: ${message}`); return; }

        const icon = document.getElementById('toastIcon');
        const titleEl = document.getElementById('toastTitle');
        const msgEl = document.getElementById('toastMessage');
        const bar = document.getElementById('toastProgressBar');

        if (toastTimeoutId) clearTimeout(toastTimeoutId);
        if (toastHideTimeoutId) clearTimeout(toastHideTimeoutId);

        el.className = 'toast toast-custom';
        el.classList.remove('show', 'hiding');

        const map = {
            success: ['toast-success', 'fa-circle-check'],
            error: ['toast-error', 'fa-circle-xmark'],
            warning: ['toast-warning', 'fa-triangle-exclamation'],
            info: ['toast-info', 'fa-circle-info']
        };
        const [cls, ic] = map[type] || map.info;
        el.classList.add(cls);
        icon.innerHTML = `<i class="fa-solid ${ic}"></i>`;

        titleEl.textContent = title;
        msgEl.textContent = message;

        bar.style.transition = 'none';
        bar.style.width = '100%';
        void el.offsetWidth;
        el.classList.add('show');

        setTimeout(() => {
            bar.style.transition = `width ${duration}ms linear`;
            bar.style.width = '0%';
        }, 50);

        toastTimeoutId = setTimeout(() => hideToast(), duration);
    }

    function hideToast() {
        const el = document.getElementById('notificationToast');
        if (!el || !el.classList.contains('show')) return;
        el.classList.add('hiding');
        toastHideTimeoutId = setTimeout(() => el.classList.remove('show', 'hiding'), 280);
    }

    const toastCloseBtn = document.getElementById('toastCloseBtn');
    if (toastCloseBtn) toastCloseBtn.addEventListener('click', hideToast);

    /* ============================================================
       5. Utilities
    ============================================================ */
    function escapeHtml(v) {
        const d = document.createElement('div');
        d.textContent = v ?? '';
        return d.innerHTML;
    }

    function formatDate(d) {
        if (!d) return '-';
        try {
            const x = new Date(d);
            const y = x.getFullYear();
            const m = String(x.getMonth() + 1).padStart(2, '0');
            const dd = String(x.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
        } catch (e) { return d; }
    }

    function formatSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0, s = bytes;
        while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
        return `${s.toFixed(s >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
    }

    function timeAgo(dateStr) {
        if (!dateStr) return '-';
        const diff = Date.now() - new Date(dateStr).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'الآن';
        if (min < 60) return `منذ ${min} دقيقة`;
        const h = Math.floor(min / 60);
        if (h < 24) return `منذ ${h} ساعة`;
        const d = Math.floor(h / 24);
        if (d < 30) return `منذ ${d} يوم`;
        const m = Math.floor(d / 30);
        if (m < 12) return `منذ ${m} شهر`;
        return `منذ ${Math.floor(m / 12)} سنة`;
    }

    function getTodayDate() {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }

    /* ============================================================
       6. Config
    ============================================================ */
    const DOC_TYPES = {
        lab: { label: 'تحليل مخبري', icon: 'fa-flask-vial', cls: 'type-lab' },
        rx: { label: 'وصفة طبية', icon: 'fa-prescription-bottle-medical', cls: 'type-rx' },
        report: { label: 'تقرير طبي', icon: 'fa-file-medical', cls: 'type-report' },
        attachment: { label: 'مرفق عام', icon: 'fa-paperclip', cls: 'type-attachment' },
        record: { label: 'سجل طبي', icon: 'fa-file-shield', cls: 'type-record' },
        image: { label: 'صورة طبية', icon: 'fa-image', cls: 'type-image' },
        pdf: { label: 'مستند PDF', icon: 'fa-file-pdf', cls: 'type-pdf' },
        other: { label: 'أخرى', icon: 'fa-file', cls: 'type-other' }
    };

    function getFileTypeFromName(name) {
        const ext = (name || '').split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
        if (ext === 'pdf') return 'pdf';
        if (['dcm', 'dicom'].includes(ext)) return 'image';
        return 'other';
    }

    /* ============================================================
       7. State (مربوط بالمريض)
    ============================================================ */
    let documents = bnStorage.get(storageKey, []);
    let currentFilter = 'all';
    let currentView = 'grid';
    let currentSearch = '';
    let currentDateFilter = '';
    let currentSort = 'newest';
    let currentTags = [];
    let selectedFile = null;
    let currentPreviewDoc = null;

    /* ============================================================
       8. Render
    ============================================================ */
    function getFilteredDocs() {
        let list = [...documents];

        if (currentFilter === 'favorite') {
            list = list.filter(d => d.favorite && !d.deleted);
        } else if (currentFilter === 'deleted') {
            list = list.filter(d => d.deleted);
        } else if (currentFilter !== 'all') {
            list = list.filter(d => d.type === currentFilter && !d.deleted);
        } else {
            list = list.filter(d => !d.deleted);
        }

        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            list = list.filter(d =>
                (d.name || '').toLowerCase().includes(q) ||
                (d.source || '').toLowerCase().includes(q) ||
                (d.category || '').toLowerCase().includes(q) ||
                (d.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        if (currentDateFilter) {
            const now = Date.now();
            const thresholds = {
                today: 24 * 3600 * 1000,
                week: 7 * 24 * 3600 * 1000,
                month: 30 * 24 * 3600 * 1000,
                year: 365 * 24 * 3600 * 1000
            };
            const limit = thresholds[currentDateFilter];
            if (limit) {
                list = list.filter(d => (now - new Date(d.date).getTime()) <= limit);
            }
        }

        switch (currentSort) {
            case 'oldest':
                list.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'name':
                list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
                break;
            case 'size':
                list.sort((a, b) => (b.size || 0) - (a.size || 0));
                break;
            default:
                list.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        return list;
    }

    function render() {
        updateCounts();
        updateStats();

        const list = getFilteredDocs();
        const container = document.getElementById('docsContainer');
        if (!container) return;

        container.className = currentView === 'grid' ? 'docs-grid' : 'docs-list';

        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h3>${documents.length === 0 ? 'لا توجد وثائق بعد' : 'لا توجد نتائج مطابقة'}</h3>
                    <p>${documents.length === 0 ? 'ابدأ برفع أول وثيقة للمريض' : 'جرب تغيير الفلاتر أو البحث'}</p>
                    ${documents.length === 0 ? `
                        <button type="button" class="btn-upload" onclick="window.bnDM.openUploadModal()">
                            <i class="fa-solid fa-cloud-arrow-up"></i>
                            رفع وثيقة جديدة
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        list.forEach((doc, i) => {
            const card = document.createElement('div');
            card.className = `doc-card ${DOC_TYPES[doc.type]?.cls || ''} ${doc.favorite ? 'favorite' : ''} ${doc.deleted ? 'deleted' : ''}`;
            card.style.animationDelay = `${i * 0.04}s`;

            const config = DOC_TYPES[doc.type] || DOC_TYPES.other;
            const tagsHtml = (doc.tags || []).slice(0, 3).map(t =>
                `<span class="doc-tag"><i class="fa-solid fa-hashtag"></i>${escapeHtml(t)}</span>`
            ).join('');

            card.innerHTML = `
                <div class="doc-card-header">
                    <div class="doc-icon ${config.cls}">
                        <i class="fa-solid ${config.icon}"></i>
                    </div>
                    <div class="doc-info">
                        <h4 class="doc-name">${escapeHtml(doc.name)}</h4>
                        <div class="doc-meta">
                            <span class="doc-meta-item">
                                <i class="fa-solid fa-calendar"></i>
                                ${escapeHtml(formatDate(doc.date))}
                            </span>
                            ${doc.size ? `
                                <span class="doc-meta-item">
                                    <i class="fa-solid fa-database"></i>
                                    ${escapeHtml(formatSize(doc.size))}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="doc-card-preview">
                    <i class="fa-solid ${config.icon}"></i>
                    <span>${escapeHtml(config.label)}${doc.source ? ` • ${escapeHtml(doc.source)}` : ''}</span>
                </div>

                ${tagsHtml ? `<div class="doc-card-tags">${tagsHtml}</div>` : ''}

                <div class="doc-card-actions" onclick="event.stopPropagation()">
                    ${doc.deleted ? `
                        <button type="button" class="doc-action-btn restore" data-action="restore" data-id="${doc.id}" title="استعادة">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                    ` : `
                        <button type="button" class="doc-action-btn view" data-action="view" data-id="${doc.id}" title="عرض">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="doc-action-btn download" data-action="download" data-id="${doc.id}" title="تحميل">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button type="button" class="doc-action-btn print" data-action="print" data-id="${doc.id}" title="طباعة">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button type="button" class="doc-action-btn favorite ${doc.favorite ? 'active' : ''}" data-action="favorite" data-id="${doc.id}" title="مفضلة">
                            <i class="fa-solid fa-star"></i>
                        </button>
                    `}
                    <button type="button" class="doc-action-btn delete" data-action="delete" data-id="${doc.id}" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            card.addEventListener('click', () => openPreviewModal(doc.id));
            container.appendChild(card);
        });

        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                const doc = documents.find(d => d.id === id);
                if (!doc) return;

                if (action === 'view') openPreviewModal(id);
                else if (action === 'download') downloadDoc(doc);
                else if (action === 'print') printDoc(doc);
                else if (action === 'favorite') toggleFavorite(id);
                else if (action === 'delete') confirmDelete(id, doc.deleted);
                else if (action === 'restore') restoreDoc(id);
            });
        });
    }

    function updateCounts() {
        const active = documents.filter(d => !d.deleted);
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('countAll', active.length);
        set('countLab', active.filter(d => d.type === 'lab').length);
        set('countRx', active.filter(d => d.type === 'rx').length);
        set('countReport', active.filter(d => d.type === 'report').length);
        set('countAttachment', active.filter(d => d.type === 'attachment').length);
        set('countRecord', active.filter(d => d.type === 'record').length);
        set('countFavorite', active.filter(d => d.favorite).length);
        set('countDeleted', documents.filter(d => d.deleted).length);
    }

    function updateStats() {
        const active = documents.filter(d => !d.deleted);
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('statTotal', active.length);
        set('statLabs', active.filter(d => d.type === 'lab').length);
        set('statRx', active.filter(d => d.type === 'rx').length);
        set('statReports', active.filter(d => d.type === 'report').length);
    }

    /* ============================================================
       9. Upload
    ============================================================ */
    function openUploadModal(editId = null) {
        const modal = document.getElementById('uploadModal');
        if (!modal) return;

        const title = document.getElementById('uploadModalTitle');
        const subtitle = document.getElementById('uploadModalSubtitle');

        document.getElementById('uploadForm').reset();
        document.getElementById('uploadEditIndex').value = '-1';
        currentTags = [];
        selectedFile = null;
        const info = document.getElementById('selectedFileInfo');
        if (info) info.classList.remove('show');
        renderTags();

        const dateInput = document.getElementById('docDate');
        if (dateInput) dateInput.value = getTodayDate();

        if (editId) {
            const doc = documents.find(d => d.id === editId);
            if (doc) {
                document.getElementById('uploadEditIndex').value = editId;
                document.getElementById('docName').value = doc.name || '';
                document.getElementById('docType').value = doc.type || '';
                document.getElementById('docDate').value = doc.date || getTodayDate();
                document.getElementById('docSource').value = doc.source || '';
                document.getElementById('docCategory').value = doc.category || '';
                document.getElementById('docNotes').value = doc.notes || '';
                currentTags = [...(doc.tags || [])];
                renderTags();
                title.textContent = 'تعديل الوثيقة';
                subtitle.textContent = 'قم بتعديل البيانات ثم احفظ';
            }
        } else {
            title.textContent = 'رفع وثيقة جديدة';
            subtitle.textContent = patientId
                ? `إضافة وثيقة إلى ملف ${patientName}`
                : 'املأ البيانات وأرفق الملف';
        }

        modal.classList.add('show');
    }

    function closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) modal.classList.remove('show');
        const form = document.getElementById('uploadForm');
        if (form) form.reset();
        currentTags = [];
        selectedFile = null;
        const info = document.getElementById('selectedFileInfo');
        if (info) info.classList.remove('show');
        renderTags();
    }

    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) uploadBtn.addEventListener('click', () => openUploadModal());

    const fabUpload = document.getElementById('fabUpload');
    if (fabUpload) fabUpload.addEventListener('click', () => openUploadModal());

    const uploadModalClose = document.getElementById('uploadModalClose');
    if (uploadModalClose) uploadModalClose.addEventListener('click', closeUploadModal);

    const uploadCancelBtn = document.getElementById('uploadCancelBtn');
    if (uploadCancelBtn) uploadCancelBtn.addEventListener('click', closeUploadModal);

    const uploadModal = document.getElementById('uploadModal');
    if (uploadModal) {
        uploadModal.addEventListener('click', (e) => {
            if (e.target.id === 'uploadModal') closeUploadModal();
        });
    }

    // Drop area
    const uploadDropArea = document.getElementById('uploadDropArea');
    const fileInput = document.getElementById('fileInput');

    if (uploadDropArea && fileInput) {
        uploadDropArea.addEventListener('click', () => fileInput.click());
        uploadDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropArea.classList.add('dragover');
        });
        uploadDropArea.addEventListener('dragleave', () => uploadDropArea.classList.remove('dragover'));
        uploadDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });
    }

    function handleFile(file) {
        if (file.size > 50 * 1024 * 1024) {
            showToast('error', 'حجم الملف كبير', 'الحد الأقصى 50 ميجابايت.');
            return;
        }
        selectedFile = {
            name: file.name,
            size: file.size,
            type: file.type
        };

        const info = document.getElementById('selectedFileInfo');
        if (info) info.classList.add('show');
        document.getElementById('selectedFileName').textContent = file.name;
        document.getElementById('selectedFileSize').textContent = formatSize(file.size);

        const detected = getFileTypeFromName(file.name);
        if (detected !== 'other') {
            document.getElementById('docType').value = detected;
        }

        const nameInput = document.getElementById('docName');
        if (nameInput && !nameInput.value) {
            nameInput.value = file.name.replace(/\.[^.]+$/, '');
        }
    }

    const removeFileBtn = document.getElementById('removeFileBtn');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            selectedFile = null;
            if (fileInput) fileInput.value = '';
            const info = document.getElementById('selectedFileInfo');
            if (info) info.classList.remove('show');
        });
    }

    // Tags
    const tagInput = document.getElementById('tagInput');
    const tagsWrapper = document.getElementById('tagsWrapper');

    if (tagInput && tagsWrapper) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const val = tagInput.value.trim();
                if (val && !currentTags.includes(val) && currentTags.length < 10) {
                    currentTags.push(val);
                    renderTags();
                    tagInput.value = '';
                }
            } else if (e.key === 'Backspace' && !tagInput.value && currentTags.length > 0) {
                currentTags.pop();
                renderTags();
            }
        });
    }

    function renderTags() {
        if (!tagsWrapper) return;
        tagsWrapper.querySelectorAll('.tag-chip').forEach(el => el.remove());
        currentTags.forEach((tag, i) => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `
                <i class="fa-solid fa-hashtag"></i>
                ${escapeHtml(tag)}
                <button type="button" data-tag-index="${i}" aria-label="إزالة"><i class="fa-solid fa-xmark"></i></button>
            `;
            chip.querySelector('button').addEventListener('click', () => {
                currentTags.splice(i, 1);
                renderTags();
            });
            tagsWrapper.insertBefore(chip, tagInput);
        });
    }

    // Save
    const uploadSaveBtn = document.getElementById('uploadSaveBtn');
    if (uploadSaveBtn) {
        uploadSaveBtn.addEventListener('click', () => {
            const name = document.getElementById('docName').value.trim();
            const type = document.getElementById('docType').value;
            const date = document.getElementById('docDate').value;

            if (!name) { showToast('error', 'حقل مطلوب', 'يرجى إدخال اسم الوثيقة.'); return; }
            if (!type) { showToast('error', 'حقل مطلوب', 'يرجى اختيار نوع الوثيقة.'); return; }
            if (!date) { showToast('error', 'حقل مطلوب', 'يرجى إدخال تاريخ الوثيقة.'); return; }

            const editIndex = parseInt(document.getElementById('uploadEditIndex').value, 10);
            const doc = {
                id: editIndex >= 0
                    ? documents.find(d => d.id === editIndex).id
                    : 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                patientId: patientId || null,
                name, type, date,
                source: document.getElementById('docSource').value.trim(),
                category: document.getElementById('docCategory').value.trim(),
                notes: document.getElementById('docNotes').value.trim(),
                tags: [...currentTags],
                size: selectedFile ? selectedFile.size : 0,
                fileName: selectedFile ? selectedFile.name : '',
                favorite: false,
                deleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editIndex >= 0) {
                const idx = documents.findIndex(d => d.id === editIndex);
                doc.favorite = documents[idx].favorite;
                doc.deleted = documents[idx].deleted;
                doc.createdAt = documents[idx].createdAt;
                doc.size = selectedFile ? selectedFile.size : documents[idx].size;
                doc.fileName = selectedFile ? selectedFile.name : documents[idx].fileName;
                documents[idx] = doc;
                showToast('success', 'تم التعديل', 'تم تحديث بيانات الوثيقة.');
            } else {
                documents.push(doc);
                showToast('success', 'تم الرفع',
                    patientId
                        ? `تمت إضافة "${name}" إلى وثائق ${patientName}.`
                        : `تمت إضافة "${name}" إلى الوثائق.`);
            }

            bnStorage.set(storageKey, documents);
            render();
            closeUploadModal();
        });
    }

    /* ============================================================
       10. Document Actions
    ============================================================ */
    function toggleFavorite(id) {
        const doc = documents.find(d => d.id === id);
        if (!doc) return;
        doc.favorite = !doc.favorite;
        bnStorage.set(storageKey, documents);
        render();
        showToast('success', doc.favorite ? 'أضيف للمفضلة' : 'أزيل من المفضلة', doc.name);
    }

    function downloadDoc(doc) {
        showToast('info', 'جاري التحميل', `يتم تحضير "${doc.name}" للتحميل...`);
        setTimeout(() => {
            showToast('success', 'تم التحميل', `تم تحميل "${doc.name}".`);
        }, 800);
    }

    function printDoc(doc) {
        showToast('info', 'جاري الطباعة', `يتم تحضير "${doc.name}" للطباعة...`);
        setTimeout(() => window.print(), 500);
    }

    function restoreDoc(id) {
        const doc = documents.find(d => d.id === id);
        if (!doc) return;
        doc.deleted = false;
        bnStorage.set(storageKey, documents);
        render();
        showToast('success', 'تم الاستعادة', `تمت استعادة "${doc.name}".`);
    }

    function confirmDelete(id, isDeleted) {
        const doc = documents.find(d => d.id === id);
        if (!doc) return;

        const modal = document.getElementById('confirmModal');
        if (!modal) return;

        document.getElementById('confirmTitle').textContent = isDeleted ? 'حذف نهائي' : 'تأكيد الحذف';
        document.getElementById('confirmSubtitle').textContent = isDeleted ? 'لا يمكن التراجع' : 'سيتم نقلها لسلة المحذوفات';
        document.getElementById('confirmMessage').innerHTML = `هل أنت متأكد من حذف <strong>${escapeHtml(doc.name)}</strong>؟`;

        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            document.getElementById('confirmOkBtn').removeEventListener('click', onOk);
            document.getElementById('confirmCancelBtn').removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOverlay);
        };

        const onOk = () => {
            cleanup();
            if (isDeleted) {
                documents = documents.filter(d => d.id !== id);
                showToast('success', 'تم الحذف نهائياً', `تم حذف "${doc.name}".`);
            } else {
                doc.deleted = true;
                doc.deletedAt = new Date().toISOString();
                showToast('warning', 'تم النقل للسلة', `تم نقل "${doc.name}" إلى سلة المحذوفات.`);
            }
            bnStorage.set(storageKey, documents);
            render();
        };

        const onCancel = () => cleanup();
        const onOverlay = (e) => { if (e.target === modal) onCancel(); };

        document.getElementById('confirmOkBtn').addEventListener('click', onOk);
        document.getElementById('confirmCancelBtn').addEventListener('click', onCancel);
        modal.addEventListener('click', onOverlay);
    }

    /* ============================================================
       11. Preview Modal
    ============================================================ */
    function openPreviewModal(id) {
        const doc = documents.find(d => d.id === id);
        if (!doc) return;
        currentPreviewDoc = doc;

        const config = DOC_TYPES[doc.type] || DOC_TYPES.other;

        document.getElementById('previewTitle').textContent = doc.name;
        document.getElementById('previewSubtitle').textContent = config.label;
        document.getElementById('previewIcon').innerHTML = `<i class="fa-solid ${config.icon}"></i>`;
        document.getElementById('previewThumbnail').innerHTML = `<i class="fa-solid ${config.icon}"></i>`;

        let tagsHtml = '';
        if ((doc.tags || []).length > 0) {
            tagsHtml = doc.tags.map(t =>
                `<span class="doc-tag primary"><i class="fa-solid fa-hashtag"></i>${escapeHtml(t)}</span>`
            ).join('');
        }

        document.getElementById('previewInfo').innerHTML = `
            <div class="info-row">
                <div class="info-row-label">الاسم</div>
                <div class="info-row-value">${escapeHtml(doc.name)}</div>
            </div>
            <div class="info-row">
                <div class="info-row-label">النوع</div>
                <div class="info-row-value">${escapeHtml(config.label)}</div>
            </div>
            <div class="info-row">
                <div class="info-row-label">التاريخ</div>
                <div class="info-row-value">${escapeHtml(formatDate(doc.date))}</div>
            </div>
            ${doc.source ? `
                <div class="info-row">
                    <div class="info-row-label">المصدر</div>
                    <div class="info-row-value">${escapeHtml(doc.source)}</div>
                </div>
            ` : ''}
            ${doc.category ? `
                <div class="info-row">
                    <div class="info-row-label">التصنيف الفرعي</div>
                    <div class="info-row-value">${escapeHtml(doc.category)}</div>
                </div>
            ` : ''}
            ${doc.size ? `
                <div class="info-row">
                    <div class="info-row-label">حجم الملف</div>
                    <div class="info-row-value">${escapeHtml(formatSize(doc.size))}</div>
                </div>
            ` : ''}
            ${tagsHtml ? `
                <div class="info-row">
                    <div class="info-row-label">الوسوم</div>
                    <div class="info-row-value tags">${tagsHtml}</div>
                </div>
            ` : ''}
            ${doc.notes ? `
                <div class="info-row">
                    <div class="info-row-label">ملاحظات</div>
                    <div class="info-row-value">${escapeHtml(doc.notes)}</div>
                </div>
            ` : ''}
            <div class="info-row">
                <div class="info-row-label">آخر تحديث</div>
                <div class="info-row-value">${escapeHtml(timeAgo(doc.updatedAt || doc.createdAt))}</div>
            </div>
        `;

        document.getElementById('previewModal').classList.add('show');
    }

    function closePreviewModal() {
        document.getElementById('previewModal').classList.remove('show');
        currentPreviewDoc = null;
    }

    const previewCloseBtn = document.getElementById('previewCloseBtn');
    if (previewCloseBtn) previewCloseBtn.addEventListener('click', closePreviewModal);

    const previewCloseBtn2 = document.getElementById('previewCloseBtn2');
    if (previewCloseBtn2) previewCloseBtn2.addEventListener('click', closePreviewModal);

    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') closePreviewModal();
        });
    }

    const previewDownloadBtn = document.getElementById('previewDownloadBtn');
    if (previewDownloadBtn) {
        previewDownloadBtn.addEventListener('click', () => {
            if (currentPreviewDoc) downloadDoc(currentPreviewDoc);
        });
    }

    const previewPrintBtn = document.getElementById('previewPrintBtn');
    if (previewPrintBtn) {
        previewPrintBtn.addEventListener('click', () => {
            if (currentPreviewDoc) printDoc(currentPreviewDoc);
        });
    }

    /* ============================================================
       12. Sidebar Navigation
    ============================================================ */
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter || 'all';
            render();
        });
    });

    /* ============================================================
       13. Toolbar
    ============================================================ */
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim();
            render();
        });
    }

    const filterDate = document.getElementById('filterDate');
    if (filterDate) {
        filterDate.addEventListener('change', (e) => {
            currentDateFilter = e.target.value;
            render();
        });
    }

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            currentSort = e.target.value;
            render();
        });
    }

    const viewGrid = document.getElementById('viewGrid');
    if (viewGrid) {
        viewGrid.addEventListener('click', () => {
            currentView = 'grid';
            viewGrid.classList.add('active');
            const vl = document.getElementById('viewList');
            if (vl) vl.classList.remove('active');
            render();
        });
    }

    const viewList = document.getElementById('viewList');
    if (viewList) {
        viewList.addEventListener('click', () => {
            currentView = 'list';
            viewList.classList.add('active');
            const vg = document.getElementById('viewGrid');
            if (vg) vg.classList.remove('active');
            render();
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => window.print());

    // Back to patient details
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (patientId) {
                window.location.href = `/Doctor/PatientDetails?patientId=${patientId}`;
            } else {
                history.back();
            }
        });
    }

    /* ============================================================
       14. Global Drag & Drop
    ============================================================ */
    let dragCounter = 0;
    const dropOverlay = document.getElementById('dropOverlay');

    document.addEventListener('dragenter', (e) => {
        if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
            dragCounter++;
            if (dropOverlay) dropOverlay.classList.add('active');
        }
    });

    document.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            if (dropOverlay) dropOverlay.classList.remove('active');
        }
    });

    document.addEventListener('dragover', (e) => e.preventDefault());

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (dropOverlay) dropOverlay.classList.remove('active');

        if (e.dataTransfer.files.length) {
            openUploadModal();
            setTimeout(() => handleFile(e.dataTransfer.files[0]), 100);
        }
    });

    /* ============================================================
       15. Escape Key
    ============================================================ */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUploadModal();
            closePreviewModal();
            const c = document.getElementById('confirmModal');
            if (c) c.classList.remove('show');
        }
    });

    /* ============================================================
       16. Sample Data (فقط إذا كان هناك patientId للتجربة)
    ============================================================ */
    if (documents.length === 0 && patientId) {
        const today = new Date();
        const sub = (d, n) => {
            const x = new Date(today);
            x.setDate(x.getDate() - n);
            return x.toISOString().slice(0, 10);
        };

        documents = [
            {
                id: 'doc_sample_1',
                patientId: patientId,
                name: 'تحليل دم شامل - أكتوبر 2024',
                type: 'lab',
                date: sub(today, 3),
                source: 'مختبر السلام الطبي',
                category: 'تحاليل روتينية',
                notes: 'نتائج طبيعية باستثناء ارتفاع طفيف في الكوليسترول.',
                tags: ['دم', 'كوليسترول', 'روتيني'],
                size: 245760,
                favorite: true,
                deleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_2',
                patientId: patientId,
                name: 'وصفة طبية - سيرترالين 50mg',
                type: 'rx',
                date: sub(today, 7),
                source: 'د. أحمد المحمدي',
                category: 'مضادات اكتئاب',
                notes: 'قرص واحد صباحاً لمدة 30 يوماً.',
                tags: ['سيرترالين', 'اكتئاب'],
                size: 98304,
                favorite: false,
                deleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_3',
                patientId: patientId,
                name: 'تقرير تقييم نفسي - PHQ-9',
                type: 'report',
                date: sub(today, 15),
                source: 'د. سارة الحسن',
                category: 'تقييمات نفسية',
                notes: 'النتيجة: 18/27 - اكتئاب متوسط إلى شديد.',
                tags: ['PHQ-9', 'تقييم'],
                size: 163840,
                favorite: false,
                deleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_4',
                patientId: patientId,
                name: 'صورة أشعة الصدر',
                type: 'image',
                date: sub(today, 30),
                source: 'مستشفى المدينة',
                category: 'أشعة',
                notes: '',
                tags: ['أشعة', 'صدر'],
                size: 2097152,
                favorite: false,
                deleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_5',
                patientId: patientId,
                name: 'تحليل السكر التراكمي',
                type: 'lab',
                date: sub(today, 45),
                source: 'مختبر الحياة',
                category: 'تحاليل سكر',
                notes: 'HbA1c = 6.2% - ما قبل السكري.',
                tags: ['سكر', 'HbA1c'],
                size: 180224,
                favorite: false,
                deleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        bnStorage.set(storageKey, documents);
    }

    /* ============================================================
       17. Expose API
    ============================================================ */
    window.bnDM = {
        openUploadModal,
        closeUploadModal,
        openPreviewModal,
        closePreviewModal,
        render,
        toast: showToast,
        patientId,
        patientName,
        storageKey
    };

    /* ============================================================
       18. Init
    ============================================================ */
    function doInit() {
        console.log(`🎯 تهيئة مدير الوثائق${patientId ? ` للمريض #${patientId}` : ''}`);

        // ✅ تحديث Patient Banner (فقط إذا كان هناك patientId)
        const banner = document.getElementById('patientBanner');
        if (patientId && banner) {
            banner.style.display = 'flex';

            const bannerName = document.getElementById('patientBannerName');
            if (bannerName) bannerName.textContent = patientName;

            const bannerId = document.getElementById('patientBannerId');
            if (bannerId) bannerId.textContent = patientId;

            const subtitle = document.getElementById('patientNameSubtitle');
            if (subtitle) subtitle.textContent = patientName;
        }

        bnTheme.init();
        render();

        setTimeout(() => {
            showToast('info', 'مدير الوثائق',
                patientId
                    ? `${patientName} — ${documents.filter(d => !d.deleted).length} وثيقة.`
                    : 'إدارة شاملة لجميع وثائق المريض.',
                5000);
        }, 800);

        console.log('%c✅ Document Manager Ready',
            'background:#6366f1;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }

})();