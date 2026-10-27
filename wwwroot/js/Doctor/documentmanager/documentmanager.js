/* ============================================================
   Document Vault — Internal & External Patient Documents
   Scope: files only. No clinical scores/meds/sessions.
   ============================================================ */
(function initDocumentManager() {
    'use strict';
    console.log('🚀 DocumentManager.js initialized');

    /* ---------- 0. Patient Context ---------- */
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId') || urlParams.get('id')
        || sessionStorage.getItem('bnCurrentPatientId') || '';
    const patientName = patientId ? ('المريض رقم ' + patientId) : 'وثائق عامة';
    const storageKey = patientId ? `documents_patient_${patientId}` : 'documents_general';

    window.bnCurrentPatientId = patientId;
    if (patientId) sessionStorage.setItem('bnCurrentPatientId', patientId);

    /* ---------- 1. Storage ---------- */
    const bnStorage = {
        prefix: 'balancy_',
        isAvailable() {
            try { const t = '__bn_test__'; localStorage.setItem(t, t); localStorage.removeItem(t); return true; }
            catch (e) { return false; }
        },
        get(k, d = null) { if (!this.isAvailable()) return d; try { const r = localStorage.getItem(this.prefix + k); return r ? JSON.parse(r) : d; } catch (e) { return d; } },
        set(k, v) { if (!this.isAvailable()) return false; try { localStorage.setItem(this.prefix + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
    };

    /* ---------- 2. Theme ---------- */
    const bnTheme = {
        init() { this.apply(bnStorage.get('theme', 'light')); },
        apply(t) { document.documentElement.setAttribute('data-theme', t); bnStorage.set('theme', t); },
        toggle() { const c = document.documentElement.getAttribute('data-theme') || 'light'; const n = c === 'dark' ? 'light' : 'dark'; this.apply(n); return n; }
    };

    /* ---------- 3. Toast ---------- */
    let toastTimeoutId = null, toastHideTimeoutId = null;
    function showToast(type, title, message, duration = 3500) {
        const el = document.getElementById('notificationToast');
        if (!el) { console.log(`[Toast ${type}] ${title}: ${message}`); return; }
        if (toastTimeoutId) clearTimeout(toastTimeoutId);
        if (toastHideTimeoutId) clearTimeout(toastHideTimeoutId);

        const icon = document.getElementById('toastIcon');
        const titleEl = document.getElementById('toastTitle');
        const msgEl = document.getElementById('toastMessage');
        const bar = document.getElementById('toastProgressBar');

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

        bar.style.transition = 'none'; bar.style.width = '100%'; void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => { bar.style.transition = `width ${duration}ms linear`; bar.style.width = '0%'; }, 50);
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

    /* ---------- 4. Utilities ---------- */
    function escapeHtml(v) { const d = document.createElement('div'); d.textContent = v ?? ''; return d.innerHTML; }
    function formatDate(d) {
        if (!d) return '-';
        try { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
        catch (e) { return d; }
    }
    function formatSize(b) {
        if (!b) return '0 B';
        const u = ['B', 'KB', 'MB', 'GB']; let i = 0, s = b;
        while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
        return `${s.toFixed(s >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
    }
    function timeAgo(d) {
        if (!d) return '-';
        const diff = Date.now() - new Date(d).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'الآن';
        if (m < 60) return `منذ ${m} دقيقة`;
        const h = Math.floor(m / 60); if (h < 24) return `منذ ${h} ساعة`;
        const dd = Math.floor(h / 24); if (dd < 30) return `منذ ${dd} يوم`;
        const mo = Math.floor(dd / 30); if (mo < 12) return `منذ ${mo} شهر`;
        return `منذ ${Math.floor(mo / 12)} سنة`;
    }
    function todayStr() {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }
    function isExpired(doc) {
        if (!doc.expiry) return false;
        return new Date(doc.expiry).getTime() < Date.now();
    }

    /* ---------- 5. Config ---------- */
    const DOC_TYPES = {
        lab: { label: 'تحليل مخبري', icon: 'fa-flask-vial', cls: 'type-lab' },
        rx: { label: 'وصفة طبية', icon: 'fa-prescription-bottle-medical', cls: 'type-rx' },
        report: { label: 'تقرير طبي', icon: 'fa-file-medical', cls: 'type-report' },
        imaging: { label: 'صورة / أشعة', icon: 'fa-x-ray', cls: 'type-imaging' },
        referral: { label: 'إحالة / تحويل', icon: 'fa-share-nodes', cls: 'type-referral' },
        consent: { label: 'موافقة مستنيرة', icon: 'fa-signature', cls: 'type-consent' },
        certificate: { label: 'شهادة / إجازة', icon: 'fa-file-circle-check', cls: 'type-certificate' },
        discharge: { label: 'ملخص خروج', icon: 'fa-door-open', cls: 'type-discharge' },
        record: { label: 'سجل طبي سابق', icon: 'fa-file-shield', cls: 'type-record' },
        attachment: { label: 'مرفق عام', icon: 'fa-paperclip', cls: 'type-attachment' },
        other: { label: 'أخرى', icon: 'fa-file', cls: 'type-other' }
    };

    function getFileTypeFromName(name) {
        const ext = (name || '').split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'imaging';
        if (ext === 'pdf') return 'report';
        if (['dcm', 'dicom'].includes(ext)) return 'imaging';
        return 'other';
    }

    /* ---------- 6. State ---------- */
    let documents = bnStorage.get(storageKey, []);
    let currentFilter = 'all';
    let currentView = 'grid';
    let currentSearch = '';
    let currentDateFilter = '';
    let currentSourceFilter = '';
    let currentSort = 'newest';
    let currentTags = [];
    let selectedFile = null;
    let currentPreviewDoc = null;

    /* ---------- 7. Filtering ---------- */
    function getFilteredDocs() {
        let list = [...documents];

        if (currentFilter === 'favorite') {
            list = list.filter(d => d.favorite && !d.deleted);
        } else if (currentFilter === 'deleted') {
            list = list.filter(d => d.deleted);
        } else if (currentFilter === 'critical') {
            list = list.filter(d => d.critical && !d.deleted);
        } else if (currentFilter === 'expired') {
            list = list.filter(d => !d.deleted && isExpired(d));
        } else if (currentFilter === 'internal' || currentFilter === 'external') {
            list = list.filter(d => d.sourceType === currentFilter && !d.deleted);
        } else if (currentFilter !== 'all') {
            list = list.filter(d => d.type === currentFilter && !d.deleted);
        } else {
            list = list.filter(d => !d.deleted);
        }

        if (currentSourceFilter) {
            list = list.filter(d => d.sourceType === currentSourceFilter);
        }

        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            list = list.filter(d =>
                (d.name || '').toLowerCase().includes(q) ||
                (d.issuer || '').toLowerCase().includes(q) ||
                (d.category || '').toLowerCase().includes(q) ||
                (d.refNo || '').toLowerCase().includes(q) ||
                (d.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        if (currentDateFilter) {
            const now = Date.now();
            const th = { today: 86400000, week: 7 * 86400000, month: 30 * 86400000, year: 365 * 86400000 };
            const lim = th[currentDateFilter];
            if (lim) list = list.filter(d => (now - new Date(d.date).getTime()) <= lim);
        }

        switch (currentSort) {
            case 'oldest': list.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
            case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar')); break;
            case 'size': list.sort((a, b) => (b.size || 0) - (a.size || 0)); break;
            default: list.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        return list;
    }

    /* ---------- 8. Render ---------- */
    function render() {
        updateCounts();
        updateStats();

        const list = getFilteredDocs();
        const container = document.getElementById('docsContainer');
        if (!container) return;

        container.className = currentView === 'grid' ? 'docs-grid' : 'docs-list';

        if (list.length === 0) {
            container.innerHTML =`
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-folder-open"></i></div>
                    <h3>${documents.length === 0 ? 'لا توجد وثائق بعد' : 'لا توجد نتائج مطابقة'}</h3>
                    <p>${documents.length === 0 ? 'ابدأ برفع أول وثيقة للمريض' : 'جرب تغيير الفلاتر أو البحث'}</p>
                    ${documents.length === 0 ?`
                        <button type="button" class="btn-upload" onclick="window.bnDM.openUploadModal()">
                            <i class="fa-solid fa-cloud-arrow-up"></i> رفع وثيقة
                        </button>`: ''}
                </div>`;
            return;
        }

        container.innerHTML = '';
        list.forEach((doc, i) => {
            const cfg = DOC_TYPES[doc.type] || DOC_TYPES.other;
            const expired = isExpired(doc);
            const card = document.createElement('div');
            card.className = `doc-card ${cfg.cls} ${doc.favorite ? 'favorite' : ''} ${doc.deleted ? 'deleted' : ''} ${expired ? 'is-expired' : ''}`;
            card.style.animationDelay = `${i * 0.04}s`;

            const badges = [
                doc.critical ? '<span class="doc-badge lock" title="حساسة"><i class="fa-solid fa-lock"></i></span>' : '',
                doc.signed ? '<span class="doc-badge signed" title="موقّعة"><i class="fa-solid fa-signature"></i></span>' : '',
                expired ? '<span class="doc-badge expired" title="منتهية"><i class="fa-solid fa-hourglass-end"></i></span>' : ''
            ].join('');

            const srcChip = doc.sourceType === 'internal'
                ? '<span class="doc-source-chip internal"><i class="fa-solid fa-hospital"></i> داخلية</span>'
                : '<span class="doc-source-chip external"><i class="fa-solid fa-cloud-arrow-down"></i> خارجية</span>';

            const tagsHtml = (doc.tags || []).slice(0, 3).map(t =>
                `<span class="doc-tag"><i class="fa-solid fa-hashtag"></i>${escapeHtml(t)}</span>`
            ).join('');

            card.innerHTML =`
                <div class="doc-badges">${badges}</div>
                <div class="doc-card-header">
                    <div class="doc-icon ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i></div>
                    <div class="doc-info">
                        <h4 class="doc-name">${escapeHtml(doc.name)}</h4>
                        <div class="doc-meta">
                            <span class="doc-meta-item"><i class="fa-solid fa-calendar"></i>${escapeHtml(formatDate(doc.date))}</span>
                            ${doc.size ? `<span class="doc-meta-item"><i class="fa-solid fa-database"></i>${escapeHtml(formatSize(doc.size))}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="doc-card-preview">
                    <i class="fa-solid ${cfg.icon}"></i>
                    <span>${escapeHtml(cfg.label)}${doc.issuer ? ` • ${escapeHtml(doc.issuer)}` : ''}</span>
                </div>
                <div class="doc-meta" style="margin-bottom:.5rem;">${srcChip}</div>
                ${tagsHtml ? `<div class="doc-card-tags">${tagsHtml}</div>` : ''}
                <div class="doc-card-actions" onclick="event.stopPropagation()">
                    ${doc.deleted ?`
                        <button type="button" class="doc-action-btn restore" data-action="restore" data-id="${doc.id}" title="استعادة"><i class="fa-solid fa-rotate-left"></i></button>
                    `:`
                        <button type="button" class="doc-action-btn view" data-action="view" data-id="${doc.id}" title="عرض"><i class="fa-solid fa-eye"></i></button>
                        <button type="button" class="doc-action-btn download" data-action="download" data-id="${doc.id}" title="تحميل"><i class="fa-solid fa-download"></i></button>
                        <button type="button" class="doc-action-btn print" data-action="print" data-id="${doc.id}" title="طباعة"><i class="fa-solid fa-print"></i></button>
                        <button type="button" class="doc-action-btn favorite ${doc.favorite ? 'active' : ''}" data-action="favorite" data-id="${doc.id}" title="مفضلة"><i class="fa-solid fa-star"></i></button>
                    `}
                    <button type="button" class="doc-action-btn delete" data-action="delete" data-id="${doc.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            card.addEventListener('click', () => openPreviewModal(doc.id));
            container.appendChild(card);
        });

        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id, action = btn.dataset.action;
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
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('countAll', active.length);
        set('countInternal', active.filter(d => d.sourceType === 'internal').length);
        set('countExternal', active.filter(d => d.sourceType === 'external').length);
        set('countLab', active.filter(d => d.type === 'lab').length);
        set('countRx', active.filter(d => d.type === 'rx').length);
        set('countReport', active.filter(d => d.type === 'report').length);
        set('countImaging', active.filter(d => d.type === 'imaging').length);
        set('countReferral', active.filter(d => d.type === 'referral').length);
        set('countConsent', active.filter(d => d.type === 'consent').length);
        set('countCertificate', active.filter(d => d.type === 'certificate').length);
        set('countDischarge', active.filter(d => d.type === 'discharge').length);
        set('countRecord', active.filter(d => d.type === 'record').length);
        set('countAttachment', active.filter(d => d.type === 'attachment').length);
        set('countOther', active.filter(d => d.type === 'other').length);
        set('countCritical', active.filter(d => d.critical).length);
        set('countExpired', active.filter(d => isExpired(d)).length);
        set('countFavorite', active.filter(d => d.favorite).length);
        set('countDeleted', documents.filter(d => d.deleted).length);
    }

    function updateStats() {
        const active = documents.filter(d => !d.deleted);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('statTotal', active.length);
        set('statInternal', active.filter(d => d.sourceType === 'internal').length);
        set('statExternal', active.filter(d => d.sourceType === 'external').length);
        set('statCritical', active.filter(d => d.critical).length);
    }

    /* ---------- 9. Upload ---------- */
    function openUploadModal(editId = null) {
        const modal = document.getElementById('uploadModal');
        if (!modal) return;

        document.getElementById('uploadForm').reset();
        document.getElementById('uploadEditId').value = '';
        currentTags = [];
        selectedFile = null;
        const info = document.getElementById('selectedFileInfo');
        if (info) info.classList.remove('show');
        renderTags();

        const dateInput = document.getElementById('docDate');
        if (dateInput) dateInput.value = todayStr();

        const title = document.getElementById('uploadModalTitle');
        const subtitle = document.getElementById('uploadModalSubtitle');

        if (editId) {
            const doc = documents.find(d => d.id === editId);
            if (doc) {
                document.getElementById('uploadEditId').value = editId;
                document.getElementById('docSourceType').value = doc.sourceType || 'external';
                document.getElementById('docType').value = doc.type || '';
                document.getElementById('docName').value = doc.name || '';
                document.getElementById('docDate').value = doc.date || todayStr();
                document.getElementById('docIssuer').value = doc.issuer || '';
                document.getElementById('docCategory').value = doc.category || '';
                document.getElementById('docRefNo').value = doc.refNo || '';
                document.getElementById('docExpiry').value = doc.expiry || '';
                document.getElementById('docSigned').checked = !!doc.signed;
                document.getElementById('docCritical').checked = !!doc.critical;
                document.getElementById('docNotes').value = doc.notes || '';
                currentTags = [...(doc.tags || [])];
                renderTags();
                title.textContent = 'تعديل الوثيقة';
                subtitle.textContent = 'قم بتعديل البيانات ثم احفظ';
            }
        } else {
            title.textContent = 'رفع وثيقة جديدة';
            subtitle.textContent = patientId
                ? `إضافة وثيقة إلى خزانة ${patientName}`
                : 'املأ البيانات وأرفق الملف';
        }
        modal.classList.add('show');
    }

    function closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) modal.classList.remove('show');
        const form = document.getElementById('uploadForm');
        if (form) form.reset();
        currentTags = []; selectedFile = null;
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

    const uploadDropArea = document.getElementById('uploadDropArea');
    const fileInput = document.getElementById('fileInput');

    if (uploadDropArea && fileInput) {
        uploadDropArea.addEventListener('click', () => fileInput.click());
        uploadDropArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadDropArea.classList.add('dragover'); });
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
        selectedFile = { name: file.name, size: file.size, type: file.type };
        const info = document.getElementById('selectedFileInfo');
        if (info) info.classList.add('show');
        document.getElementById('selectedFileName').textContent = file.name;
        document.getElementById('selectedFileSize').textContent = formatSize(file.size);

        const detected = getFileTypeFromName(file.name);
        const typeSelect = document.getElementById('docType');
        if (typeSelect && !typeSelect.value) typeSelect.value = detected;

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

    /* Tags */
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
            chip.innerHTML =`
                <i class="fa-solid fa-hashtag"></i>
                ${escapeHtml(tag)}
                <button type="button" data-tag-index="${i}" aria-label="إزالة"><i class="fa-solid fa-xmark"></i></button>`;
            chip.querySelector('button').addEventListener('click', () => {
                currentTags.splice(i, 1);
                renderTags();
            });
            tagsWrapper.insertBefore(chip, tagInput);
        });
    }

    /* Save */
    const uploadSaveBtn = document.getElementById('uploadSaveBtn');
    if (uploadSaveBtn) {
        uploadSaveBtn.addEventListener('click', () => {
            const name = document.getElementById('docName').value.trim();
            const type = document.getElementById('docType').value;
            const date = document.getElementById('docDate').value;
            const sourceType = document.getElementById('docSourceType').value;

            if (!name) { showToast('error', 'حقل مطلوب', 'يرجى إدخال اسم الوثيقة.'); return; }
            if (!type) { showToast('error', 'حقل مطلوب', 'يرجى اختيار نوع الوثيقة.'); return; }
            if (!date) { showToast('error', 'حقل مطلوب', 'يرجى إدخال تاريخ الوثيقة.'); return; }

            const editId = document.getElementById('uploadEditId').value;
            const isEdit = editId !== '';

            const base = {
                patientId: patientId || null,
                name, type, date, sourceType,
                issuer: document.getElementById('docIssuer').value.trim(),
                category: document.getElementById('docCategory').value.trim(),
                refNo: document.getElementById('docRefNo').value.trim(),
                expiry: document.getElementById('docExpiry').value || null,
                signed: document.getElementById('docSigned').checked,
                critical: document.getElementById('docCritical').checked,
                notes: document.getElementById('docNotes').value.trim(),
                tags: [...currentTags],
                size: selectedFile ? selectedFile.size : 0,
                fileName: selectedFile ? selectedFile.name : '',
                updatedAt: new Date().toISOString()
            };

            if (isEdit) {
                const idx = documents.findIndex(d => d.id === editId);
                if (idx < 0) return;
                const prev = documents[idx];
                documents[idx] = {
                    ...prev, ...base,
                    size: selectedFile ? selectedFile.size : prev.size,
                    fileName: selectedFile ? selectedFile.name : prev.fileName
                };
                showToast('success', 'تم التعديل', 'تم تحديث بيانات الوثيقة.');
            } else {
                const doc = {
                    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    ...base,
                    favorite: false,
                    deleted: false,
                    createdAt: new Date().toISOString()
                };
                documents.push(doc);
                showToast('success', 'تم الرفع',
                    patientId
                        ? `تمت إضافة "${name}" إلى خزانة ${patientName}.`
                        : `تمت إضافة "${name}" إلى الوثائق.`);
            }

            bnStorage.set(storageKey, documents);
            render();
            closeUploadModal();
        });
    }

    /* ---------- 10. Actions ---------- */
    function toggleFavorite(id) {
        const doc = documents.find(d => d.id === id); if (!doc) return;
        doc.favorite = !doc.favorite;
        bnStorage.set(storageKey, documents); render();
        showToast('success', doc.favorite ? 'أضيف للمفضلة' : 'أزيل من المفضلة', doc.name);
    }
    function downloadDoc(doc) {
        showToast('info', 'جاري التحميل', `يتم تحضير "${doc.name}"...`);
        setTimeout(() => showToast('success', 'تم التحميل', `تم تحميل "${doc.name}".`), 800);
    }
    function printDoc(doc) {
        showToast('info', 'جاري الطباعة', `يتم تحضير "${doc.name}" للطباعة...`);
        setTimeout(() => window.print(), 500);
    }
    function restoreDoc(id) {
        const doc = documents.find(d => d.id === id); if (!doc) return;
        doc.deleted = false;
        bnStorage.set(storageKey, documents); render();
        showToast('success', 'تم الاستعادة', `تمت استعادة "${doc.name}".`);
    }
    function confirmDelete(id, isDeleted) {
        const doc = documents.find(d => d.id === id); if (!doc) return;
        const modal = document.getElementById('confirmModal'); if (!modal) return;

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
                doc.deleted = true; doc.deletedAt = new Date().toISOString();
                showToast('warning', 'تم النقل للسلة', `تم نقل "${doc.name}" إلى سلة المحذوفات.`);
            }
            bnStorage.set(storageKey, documents); render();
        };
        const onCancel = () => cleanup();
        const onOverlay = (e) => { if (e.target === modal) onCancel(); };

        document.getElementById('confirmOkBtn').addEventListener('click', onOk);
        document.getElementById('confirmCancelBtn').addEventListener('click', onCancel);
        modal.addEventListener('click', onOverlay);
    }

    /* ---------- 11. Preview ---------- */
    function openPreviewModal(id) {
        const doc = documents.find(d => d.id === id); if (!doc) return;
        currentPreviewDoc = doc;
        const cfg = DOC_TYPES[doc.type] || DOC_TYPES.other;

        document.getElementById('previewTitle').textContent = doc.name;
        document.getElementById('previewSubtitle').textContent =
            `${cfg.label} • ${doc.sourceType === 'internal' ? 'داخلية' : 'خارجية'}`;
        document.getElementById('previewIcon').innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;
        document.getElementById('previewThumbnail').innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;

        const notice = document.getElementById('previewSensitiveNotice');
        if (doc.critical) {
            notice.style.display = 'flex';
            notice.className = 'preview-sensitive-notice';
            notice.innerHTML = '<i class="fa-solid fa-lock"></i> وثيقة حساسة — الوصول مقيّد حسب الصلاحيات.';
        } else {
            notice.style.display = 'none'; notice.innerHTML = '';
        }

        let tagsHtml = '';
        if ((doc.tags || []).length > 0) {
            tagsHtml = doc.tags.map(t =>
                `<span class="doc-tag primary"><i class="fa-solid fa-hashtag"></i>${escapeHtml(t)}</span>`
            ).join('');
        }

        document.getElementById('previewInfo').innerHTML =`
            <div class="info-row">
                <div class="info-row-label">المصدر</div>
                <div class="info-row-value">${doc.sourceType === 'internal' ? 'داخلية — Balancy' : 'خارجية'}</div>
            </div>
            <div class="info-row">
                <div class="info-row-label">النوع</div>
                <div class="info-row-value">${escapeHtml(cfg.label)}</div>
            </div>
            <div class="info-row">
                <div class="info-row-label">تاريخ الوثيقة</div>
                <div class="info-row-value">${escapeHtml(formatDate(doc.date))}</div>
            </div>
            ${doc.issuer ?`
                <div class="info-row">
                    <div class="info-row-label">الجهة المصدرة</div>
                    <div class="info-row-value">${escapeHtml(doc.issuer)}</div>
                </div>`: ''}
            ${doc.category ?`
                <div class="info-row">
                    <div class="info-row-label">تصنيف فرعي</div>
                    <div class="info-row-value">${escapeHtml(doc.category)}</div>
                </div>`: ''}
            ${doc.refNo ?`
                <div class="info-row">
                    <div class="info-row-label">رقم مرجعي</div>
                    <div class="info-row-value">${escapeHtml(doc.refNo)}</div>
                </div>`: ''}
            ${doc.expiry ?`
                <div class="info-row">
                    <div class="info-row-label">تاريخ الانتهاء</div>
                    <div class="info-row-value">${escapeHtml(formatDate(doc.expiry))} ${isExpired(doc) ? '<span style="color:#f59e0b;font-weight:900;">(منتهية)</span>' : ''}</div>
                </div>`: ''}
            <div class="info-row">
                <div class="info-row-label">الحالة</div>
                <div class="info-row-value">
                    ${doc.signed ? '<span style="color:#10b981;font-weight:900;">موقّعة</span>' : 'غير موقّعة'}
                    ${doc.critical ? ' — <span style="color:#ef4444;font-weight:900;">حساسة</span>' : ''}
                </div>
            </div>
            ${doc.size ?`
                <div class="info-row">
                    <div class="info-row-label">حجم الملف</div>
                    <div class="info-row-value">${escapeHtml(formatSize(doc.size))}</div>
                </div>`: ''}
            ${tagsHtml ?`
                <div class="info-row">
                    <div class="info-row-label">الوسوم</div>
                    <div class="info-row-value tags">${tagsHtml}</div>
                </div>`: ''}
            ${doc.notes ?`
                <div class="info-row">
                    <div class="info-row-label">ملاحظات</div>
                    <div class="info-row-value">${escapeHtml(doc.notes)}</div>
                </div>`: ''}
            <div class="info-row">
                <div class="info-row-label">آخر تحديث</div>
                <div class="info-row-value">${escapeHtml(timeAgo(doc.updatedAt || doc.createdAt))}</div>
            </div>`;

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
    if (previewDownloadBtn) previewDownloadBtn.addEventListener('click', () => {
        if (currentPreviewDoc) downloadDoc(currentPreviewDoc);
    });
    const previewPrintBtn = document.getElementById('previewPrintBtn');
    if (previewPrintBtn) previewPrintBtn.addEventListener('click', () => {
        if (currentPreviewDoc) printDoc(currentPreviewDoc);
    });

    /* ---------- 12. Sidebar Nav ---------- */
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter || 'all';
            render();
        });
    });

    /* ---------- 13. Toolbar ---------- */
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', (e) => { currentSearch = e.target.value.trim(); render(); });

    const filterSource = document.getElementById('filterSource');
    if (filterSource) filterSource.addEventListener('change', (e) => { currentSourceFilter = e.target.value; render(); });

    const filterDate = document.getElementById('filterDate');
    if (filterDate) filterDate.addEventListener('change', (e) => { currentDateFilter = e.target.value; render(); });

    const sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.addEventListener('change', (e) => { currentSort = e.target.value; render(); });

    const viewGrid = document.getElementById('viewGrid');
    if (viewGrid) viewGrid.addEventListener('click', () => {
        currentView = 'grid';
        viewGrid.classList.add('active');
        document.getElementById('viewList')?.classList.remove('active');
        render();
    });
    const viewList = document.getElementById('viewList');
    if (viewList) viewList.addEventListener('click', () => {
        currentView = 'list';
        viewList.classList.add('active');
        document.getElementById('viewGrid')?.classList.remove('active');
        render();
    });

    /* ---------- 14. Global Drag & Drop ---------- */
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
        if (dragCounter <= 0) { dragCounter = 0; if (dropOverlay) dropOverlay.classList.remove('active'); }
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

    /* ---------- 15. Escape ---------- */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUploadModal(); closePreviewModal();
            document.getElementById('confirmModal')?.classList.remove('show');
        }
    });

    /* ---------- 16. Sample Data (demo only) ---------- */
    if (documents.length === 0 && patientId) {
        const today = new Date();
        const sub = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
        const fut = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

        documents = [
            {
                id: 'doc_sample_1', patientId,
                name: 'تحليل دم شامل — مختبر السلام', type: 'lab', sourceType: 'external',
                date: sub(3), issuer: 'مختبر السلام الطبي', category: 'تحاليل روتينية',
                refNo: 'LAB-2024-0045', expiry: null, signed: true, critical: false,
                notes: '', tags: ['دم', 'روتيني'], size: 245760, favorite: true, deleted: false,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_2', patientId,
                name: 'وصفة طبية — سيرترالين 50mg', type: 'rx', sourceType: 'internal',
                date: sub(7), issuer: 'د. أحمد المحمدي', category: '',
                refNo: 'RX-2024-0012', expiry: fut(23), signed: true, critical: false,
                notes: '', tags: ['سيرترالين'], size: 98304, favorite: false, deleted: false,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_3', patientId,
                name: 'تقرير طبي — مستشفى المدينة', type: 'report', sourceType: 'external',
                date: sub(15), issuer: 'مستشفى المدينة', category: '',
                refNo: '', expiry: null, signed: true, critical: false,
                notes: '', tags: ['تقرير'], size: 163840, favorite: false, deleted: false,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_4', patientId,
                name: 'صورة أشعة الصدر', type: 'imaging', sourceType: 'external',
                date: sub(30), issuer: 'مركز الأشعة الحديث', category: 'أشعة',
                refNo: '', expiry: null, signed: false, critical: false,
                notes: '', tags: ['أشعة'], size: 2097152, favorite: false, deleted: false,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_5', patientId,
                name: 'إحالة إلى أخصائي نفسي', type: 'referral', sourceType: 'internal',
                date: sub(10), issuer: 'د. أحمد المحمدي', category: '',
                refNo: 'REF-2024-0033', expiry: null, signed: true, critical: false,
                notes: '', tags: ['إحالة'], size: 51200, favorite: false, deleted: false,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            },
            {
                id: 'doc_sample_6', patientId,
                name: 'موافقة مستنيرة — خطة علاجية', type: 'consent', sourceType: 'internal',
                date: sub(20), issuer: 'Balancy', category: '',
                refNo: 'CON-2024-0011', expiry: null, signed: true, critical: true,
                notes: '', tags: ['موافقة'], size: 67584, favorite: false, deleted: false,
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            }
        ];
        bnStorage.set(storageKey, documents);
    }

    /* ---------- 17. Public API ---------- */
    window.bnDM = {
        openUploadModal, closeUploadModal,
        openPreviewModal, closePreviewModal,
        render, toast: showToast,
        patientId, patientName, storageKey
    };

    /* ---------- 18. Init ---------- */
    function doInit() {
        const banner = document.getElementById('patientBanner');
        if (patientId && banner) {
            banner.style.display = 'flex';
            const bn = document.getElementById('patientBannerName'); if (bn) bn.textContent = patientName;
            const bi = document.getElementById('patientBannerId'); if (bi) bi.textContent = patientId;
            const sub = document.getElementById('patientNameSubtitle'); if (sub) sub.textContent = patientName;
        }
        bnTheme.init();
        render();
        setTimeout(() => {
            showToast('info', 'خزانة الوثائق',
                patientId
                    ? `${patientName} — ${documents.filter(d => !d.deleted).length} وثيقة.`
                    : 'إدارة وثائق المريض الداخلية والخارجية.',
                4000);
        }, 800);
        console.log('%c✅ Document Vault Ready', 'background:#6366f1;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }

})();