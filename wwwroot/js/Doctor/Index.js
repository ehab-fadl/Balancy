/* ============================================================
   1. Storage Layer
============================================================ */
const bnStorage = {
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
    }
};

/* ============================================================
   2. Theme Manager
============================================================ */
const bnTheme = {
    init() {
        const saved = bnStorage.get('theme', 'light');
        this.apply(saved);
    },
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        bnStorage.set('theme', theme);
    },
    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
        return next;
    }
};

/* ============================================================
   2.b Emergency Toast
============================================================ */
function bnEmergencyToast(type, title, message, duration = 3500) {
    let container = document.getElementById('bnEmergencyToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bnEmergencyToastContainer';
        container.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 20px !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            pointer-events: none !important;
        `;
        document.body.appendChild(container);
    }

    const colors = { success: '#16a34a', error: '#dc2626', warning: '#f59e0b', info: '#0ea5e9' };
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

    const el = document.createElement('div');
    el.style.cssText = `
        background: ${colors[type] || colors.info} !important;
        color: white !important;
        padding: 14px 20px !important;
        border-radius: 12px !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        font-size: 14px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.25) !important;
        pointer-events: auto !important;
        min-width: 280px !important;
        max-width: 420px !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        opacity: 0 !important;
        transform: translateX(-30px) !important;
        transition: all 0.3s ease !important;
        direction: rtl !important;
    `;
    el.innerHTML = `
        <span style="font-size:22px;font-weight:bold;flex-shrink:0;">${icons[type] || 'ℹ'}</span>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;margin-bottom:3px;font-size:14px;">${title}</div>
            <div style="font-size:12px;opacity:0.95;line-height:1.4;">${message}</div>
        </div>
    `;

    container.appendChild(el);

    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-30px)';
        setTimeout(() => el.remove(), 300);
    }, duration);
}

/* ============================================================
   2.c Toast Container Guard
============================================================ */
function ensureToastContainer() {
    let container = document.getElementById('toastContainer');

    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toastContainer';
        document.body.appendChild(container);
    } else if (container.parentElement !== document.body) {
        document.body.appendChild(container);
    }

    let toastEl = document.getElementById('notificationToast');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'notificationToast';
        toastEl.className = 'toast toast-custom';
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.setAttribute('data-bs-autohide', 'false');
        toastEl.innerHTML = `
            <div class="toast-body">
                <div class="toast-icon-wrap" id="toastIcon"></div>
                <div class="toast-content">
                    <strong id="toastTitle"></strong>
                    <div id="toastMessage" class="small"></div>
                </div>
                <button type="button" class="btn-close" id="toastCloseBtn" aria-label="إغلاق"></button>
            </div>
            <div class="toast-progress">
                <div class="toast-progress-bar" id="toastProgressBar"></div>
            </div>
        `;
        container.appendChild(toastEl);
    }

    const closeBtn = toastEl.querySelector('#toastCloseBtn');
    if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.dataset.bound = '1';
        closeBtn.addEventListener('click', hideToast);
    }

    return { container, toastEl };
}

/* ============================================================
   2.d Theme Toggle
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && !themeToggle.dataset.bound) {
        themeToggle.dataset.bound = '1';
        themeToggle.addEventListener('click', () => {
            const newTheme = bnTheme.toggle();
            const msg = newTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري';
            showToast('success', 'تغيير المظهر', msg);
        });
    }
});

/* ============================================================
   3. Toast
============================================================ */
let toastTimeoutId = null;
let toastHideTimeoutId = null;

function showToast(type, title, message, duration = 3500) {
    try {
        ensureToastContainer();

        const toastEl = document.getElementById('notificationToast');
        const toastIcon = document.getElementById('toastIcon');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        const progressBar = document.getElementById('toastProgressBar');

        if (!toastEl || !toastIcon || !toastTitle || !toastMessage || !progressBar) {
            return bnEmergencyToast(type, title, message, duration);
        }

        if (toastTimeoutId) clearTimeout(toastTimeoutId);
        if (toastHideTimeoutId) clearTimeout(toastHideTimeoutId);

        toastEl.className = 'toast toast-custom';
        toastEl.classList.remove('show', 'hiding');

        if (type === 'success') {
            toastEl.classList.add('toast-success');
            toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else if (type === 'error') {
            toastEl.classList.add('toast-error');
            toastIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        } else if (type === 'warning') {
            toastEl.classList.add('toast-warning');
            toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        } else {
            toastEl.classList.add('toast-info');
            toastIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        }

        toastTitle.textContent = title;
        toastMessage.textContent = message;

        progressBar.style.transition = 'none';
        progressBar.style.width = '100%';

        void toastEl.offsetWidth;
        toastEl.classList.add('show');

        setTimeout(() => {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        }, 50);

        toastTimeoutId = setTimeout(() => hideToast(), duration);
    } catch (e) {
        console.warn('⚠️ showToast فشلت:', e);
        bnEmergencyToast(type, title, message, duration);
    }
}

function hideToast() {
    const toastEl = document.getElementById('notificationToast');
    if (!toastEl) return;
    if (!toastEl.classList.contains('show')) return;
    toastEl.classList.add('hiding');
    toastHideTimeoutId = setTimeout(() => {
        toastEl.classList.remove('show', 'hiding');
    }, 280);
}

window.showToast = showToast;
window.hideToast = hideToast;
window.bnEmergencyToast = bnEmergencyToast;
window.ensureToastContainer = ensureToastContainer;

/* ============================================================
   4. Confirm Modal
============================================================ */
function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
    const modal = document.getElementById('bnConfirmModal');
    if (!modal) {
        if (window.confirm(message?.replace(/<[^>]*>/g, '') || 'هل أنت متأكد؟')) {
            if (typeof onConfirm === 'function') onConfirm();
        }
        return;
    }

    const titleEl = document.getElementById('bnConfirmModalTitle');
    const subtitleEl = document.getElementById('bnConfirmModalSubtitle');
    const messageEl = document.getElementById('bnConfirmModalMessage');
    const confirmBtn = document.getElementById('bnConfirmModalConfirm');

    titleEl.textContent = title || 'تأكيد';
    subtitleEl.textContent = subtitle || 'لا يمكن التراجع عن هذه العملية';
    messageEl.innerHTML = message || 'هل أنت متأكد؟';
    confirmBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${confirmText || 'نعم'}`;

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
   5. Patients Data — من الـ API
============================================================ */
let patients = [];
let selectedPatientId = null;
let isLoadingPatient = false;
let isLoadingPatients = false;

/**
 * استخراج الكود من patientCode (object) أو من حقل مسطح.
 */
function extractPatientCode(dto) {
    const pc = dto?.patientCode ?? dto?.PatientCode;

    if (pc && typeof pc === 'object') {
        return {
            code: pc.code ?? pc.Code ?? '',
            patientCodeId: pc.id ?? pc.Id ?? '',
            isActive: pc.isActive ?? pc.IsActive ?? null,
            generatedAt: pc.generatedAt ?? pc.GeneratedAt ?? null
        };
    }

    return {
        code: typeof pc === 'string' ? pc : (dto?.code ?? dto?.Code ?? ''),
        patientCodeId: '',
        isActive: null,
        generatedAt: null
    };
}

function mapPatientDto(dto) {
    if (!dto || typeof dto !== 'object') return null;

    const first = dto.firstName ?? dto.FirstName ?? '';
    const last = dto.lastName ?? dto.LastName ?? '';

    const fullName =
        dto.fullName ??
        dto.patientName ??
        dto.name ??
        ([first, last].filter(Boolean).join(' ').trim() || '');

    const id =
        dto.id ??
        dto.Id ??
        dto.patientId ??
        dto.PatientId ??
        '';

    const codeInfo = extractPatientCode(dto);

    let age = dto.age ?? dto.Age ?? dto.ageInYears ?? null;

    if (age == null) {
        const dobRaw = dto.dateOfBirth ?? dto.DateOfBirth;
        if (dobRaw) {
            const dob = new Date(dobRaw);
            if (!isNaN(dob.getTime())) {
                const diff = Date.now() - dob.getTime();
                age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
            }
        }
    }

    return {
        id: String(id),
        name: fullName || '(بدون اسم)',
        age,
        initial: fullName ? fullName.trim().charAt(0) : '?',
        code: codeInfo.code || '',
        patientCodeId: codeInfo.patientCodeId,
        codeIsActive: codeInfo.isActive,
        codeGeneratedAt: codeInfo.generatedAt
    };
}

function extractPatientArray(payload) {
    if (payload == null) return [];
    if (Array.isArray(payload)) return payload;

    const candidates = [
        payload.data,
        payload.items,
        payload.patients,
        payload.result,
        payload.$values,
        payload.data?.$values,
        payload.data?.items,
        payload.data?.patients,
        payload.result?.data,
        payload.result?.items
    ];

    for (const c of candidates) {
        if (Array.isArray(c)) return c;
    }

    for (const key of Object.keys(payload)) {
        if (Array.isArray(payload[key])) return payload[key];
        if (payload[key] && Array.isArray(payload[key].$values)) return payload[key].$values;
    }

    return [];
}

async function fetchPatientsFromServer() {
    if (isLoadingPatients) return;
    isLoadingPatients = true;

    const mainArea = document.querySelector('.main-content-area');
    if (mainArea) {
        mainArea.innerHTML = `
            <div class="pd-inline-loading">
                <div class="pd-inline-spinner"></div>
                <p>جاري تحميل قائمة المرضى...</p>
            </div>
        `;
    }

    try {
        const apiUrl = mainArea?.dataset?.patientsUrl || '/Doctor?handler=Patients';
        const res = await fetch(apiUrl, {
            headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
            credentials: 'same-origin'
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const payload = await res.json();
        console.log('📦 Patients API response shape:', payload);

        const list = extractPatientArray(payload);
        console.log(`📊 عدد المرضى المستخرجين: ${list.length}`);

        patients = list
            .map(mapPatientDto)
            .filter(p => p && p.id);

        console.log('👥 patients mapped:', patients);

        // ✅ استعادة شاشة الترحيب بدل الـ spinner
        if (mainArea) {
            mainArea.innerHTML = `
                <div class="content-placeholder" id="mainContentPlaceholder">
                    <div class="content-placeholder-icon">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h3>مرحباً بك في لوحة إدارة المرضى</h3>
                    <p>اختر مريضاً من القائمة على اليمين لعرض ملفه الطبي الكامل هنا.</p>
                    <span class="hint">
                        <i class="fa-solid fa-lightbulb"></i>
                        يمكنك البحث بالاسم أو الكود أو العمر
                    </span>
                </div>
            `;
        }

        // ✅ ارسم القائمة
        renderPatientsList(document.getElementById('patientSearch')?.value || '');
    } catch (err) {
        console.error('❌ فشل تحميل قائمة المرضى:', err);
        patients = [];
        renderPatientsList();
        showToast('error', 'خطأ', 'تعذر تحميل قائمة المرضى من الخدمة');
        if (mainArea) {
            mainArea.innerHTML = `
                <div class="pd-inline-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>تعذر تحميل قائمة المرضى</h3>
                    <p>${err.message}</p>
                </div>
            `;
        }
    } finally {
        isLoadingPatients = false;
    }
}

/* ============================================================
   5.b Ensure Patients List Container
============================================================ */
function ensurePatientsList() {
    let listEl = document.getElementById('patientsList');
    if (listEl) return listEl;

    console.warn('⚠️ #patientsList غير موجود — محاولة البحث أو الإنشاء...');

    // 1) ابحث في أي sidebar
    const sidebar = document.querySelector('.sidebar-wrapper')
        || document.querySelector('aside.sidebar-wrapper')
        || document.querySelector('aside');
    if (sidebar) {
        // ابحث جوه الـ sidebar عن أي ul موجود بالفعل
        listEl = sidebar.querySelector('ul.patients-list, ul#patientsList, ul[role="listbox"]');
        if (listEl) {
            if (!listEl.id) listEl.id = 'patientsList';
            listEl.classList.add('patients-list');
            console.log('✅ تم العثور على ul داخل sidebar وتصحيحه');
            return listEl;
        }

        // أنشئ ul جديد جوه sidebar
        listEl = document.createElement('ul');
        listEl.id = 'patientsList';
        listEl.className = 'patients-list';
        listEl.setAttribute('role', 'listbox');
        listEl.setAttribute('aria-label', 'قائمة المرضى');

        // حاول تحطه بعد .search-box أو في .patients-panel
        const panel = sidebar.querySelector('.patients-panel') || sidebar;
        const searchBox = panel.querySelector('.search-box');
        if (searchBox && searchBox.parentElement) {
            searchBox.insertAdjacentElement('afterend', listEl);
        } else {
            panel.appendChild(listEl);
        }

        console.log('✅ تم إنشاء #patientsList داخل sidebar');
        return listEl;
    }

    // 2) plan B: main-content-area
    const main = document.querySelector('.main-content-area');
    if (main) {
        listEl = document.createElement('ul');
        listEl.id = 'patientsList';
        listEl.className = 'patients-list';
        listEl.setAttribute('role', 'listbox');
        listEl.setAttribute('aria-label', 'قائمة المرضى');
        main.appendChild(listEl);
        console.log('✅ تم إنشاء #patientsList داخل .main-content-area');
        return listEl;
    }

    console.error('❌ لا يوجد sidebar ولا main-content-area — الصفحة غير متوقعة');
    return null;
}

/* ============================================================
   5.c Render Patients List
============================================================ */
function renderPatientsList(filterText = '') {
    const listEl = document.getElementById('patientsList');
    if (!listEl) {
        console.warn('⚠️ #patientsList غير موجود');
        return;
    }

    const emptyState = document.getElementById('patientsEmptyState');
    const countEl = document.getElementById('patientsCount');
    const footerCountEl = document.getElementById('footerCount');

    const query = (filterText || '').trim().toLowerCase();

    const filtered = patients.filter(p => {
        if (!query) return true;
        return (p.name || '').toLowerCase().includes(query) ||
            (p.code || '').toLowerCase().includes(query) ||
            (p.age != null && String(p.age).includes(query));
    });

    // ✅ امسح المحتوى القديم مرة واحدة في الأول
    listEl.innerHTML = '';

    if (emptyState) emptyState.classList.toggle('show', filtered.length === 0);
    if (countEl) countEl.textContent = filtered.length;
    if (footerCountEl) footerCountEl.textContent = patients.length;

    if (filtered.length === 0) return;

    filtered.forEach((patient, index) => {
        const li = document.createElement('li');
        li.className = 'patient-item' + (patient.id === selectedPatientId ? ' active' : '');
        li.dataset.patient = patient.id;
        li.tabIndex = 0;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', patient.id === selectedPatientId ? 'true' : 'false');
        li.style.animation = `slideUpFade 0.35s ease ${index * 0.04}s both`;

        li.innerHTML = `
            <div class="patient-avatar">${patient.initial}</div>
            <div class="patient-info">
                <p class="patient-name">${patient.name}</p>
                <p class="patient-meta">${patient.age != null ? patient.age + ' سنة · ' : ''}${patient.code || ''}</p>
            </div>
            <button type="button"
                    class="patient-stats-btn"
                    data-patient-id="${patient.id}"
                    title="إحصائيات الاكتئاب"
                    aria-label="عرض إحصائيات الاكتئاب للمريض ${patient.name}">
                <i class="fa-solid fa-chart-line"></i>
            </button>
            <i class="fa-solid fa-chevron-left patient-arrow"></i>
        `;

        const statsBtn = li.querySelector('.patient-stats-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openPatientStatistics(patient.id, patient.name);
            });
            statsBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openPatientStatistics(patient.id, patient.name);
                }
            });
        }

        li.addEventListener('click', () => selectPatient(patient.id));
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectPatient(patient.id);
            }
        });

        listEl.appendChild(li);
    });

    console.log(`✅ تم رسم ${filtered.length} مريض في القائمة`);
}
/* ============================================================
   6. Load Patient Details
============================================================ */
async function loadPatientDetailsIntoMain(patientId) {
    if (isLoadingPatient) return;
    isLoadingPatient = true;

    const patient = patients.find(p => p.id === patientId);
    const mainArea = document.querySelector('.main-content-area');
    if (!mainArea) {
        isLoadingPatient = false;
        return;
    }

    mainArea.innerHTML = `
        <div class="pd-inline-loading">
            <div class="pd-inline-spinner"></div>
            <p>جاري تحميل ملف المريض...</p>
        </div>
    `;

    try {
        if (patient) {
            window.bnCurrentPatientId = patient.id;
            window.bnCurrentPatientCode = patient.code;
            window.bnCurrentPatientName = patient.name;
            window.bnCurrentPatientAge = patient.age;

            sessionStorage.setItem('bnCurrentPatientId', patient.id);
            sessionStorage.setItem('bnCurrentPatientCode', patient.code || '');
            sessionStorage.setItem('bnCurrentPatientName', patient.name || '');
            sessionStorage.setItem('bnCurrentPatientAge', patient.age != null ? String(patient.age) : '');
        }

        const url = `/Doctor/PatientDetails?id=${encodeURIComponent(patientId)}&t=${Date.now()}`;
        const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const patientMain = doc.querySelector('.patient-main-content');

        mainArea.innerHTML = '';
        if (patientMain) {
            mainArea.appendChild(document.importNode(patientMain, true));
        } else {
            const bodyClone = doc.body.cloneNode(true);
            bodyClone.querySelectorAll('script').forEach(s => s.remove());
            mainArea.innerHTML = bodyClone.innerHTML;
        }

        // ✅ تعبئة الكود في صفحة التفاصيل
        fillPatientCodeInDetails(patient?.code);

        // ✅ تحديث روابط الوثائق والتقارير
        updateDocumentLinks(patientId);

        ensureStylesheet('/css/doctor/patientdetails.css');

        await ensurePatientDetailsScript();

        if (typeof window.bnRebindTabs === 'function') {
            window.bnRebindTabs();
        }

        const personalBtn = mainArea.querySelector('.patient-tab-btn[data-tab="personal"]');
        if (personalBtn) personalBtn.click();
    } catch (err) {
        console.error('❌ فشل تحميل تفاصيل المريض:', err);
        mainArea.innerHTML = `
            <div class="pd-inline-error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>تعذر تحميل ملف المريض</h3>
                <p>${err.message}</p>
            </div>
        `;
        showToast('error', 'خطأ', 'تعذر تحميل ملف المريض');
    } finally {
        isLoadingPatient = false;
    }
}

/**
 * يعبّئ #patientCode في صفحة التفاصيل بالكود الفعلي.
 */
function fillPatientCodeInDetails(code) {
    const codeEl = document.getElementById('patientCode');
    if (!codeEl) return;

    const safeCode = (code || '').toString().trim();

    if (!safeCode) {
        codeEl.innerHTML = `<span class="code-char">-</span>`;
        return;
    }

    codeEl.innerHTML = safeCode
        .split('')
        .map(ch => {
            const isLetter = /[A-Za-z]/.test(ch);
            return `<span class="code-char${isLetter ? ' letter' : ''}">${ch}</span>`;
        })
        .join('');
}

function updateDocumentLinks(patientId) {
    const DOCS_BASE = '/Doctor/DocumentManager/DocumentManager';
    const REPORTS_BASE = '/Doctor/Reports/Report';

    const docsBtn = document.getElementById('openDocsBtn');
    if (docsBtn) docsBtn.href = `${DOCS_BASE}?patientId=${encodeURIComponent(patientId)}`;

    const reportsBtn = document.getElementById('openReportsBtn');
    if (reportsBtn) reportsBtn.href = `${REPORTS_BASE}?patientId=${encodeURIComponent(patientId)}`;
}

/* ============================================================
   6.b  Helpers
============================================================ */
function ensureStylesheet(href) {
    if (!href) return;
    const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => (l.getAttribute('href') || '').includes(href));
    if (exists) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

function ensurePatientDetailsScript() {
    return new Promise((resolve) => {
        if (typeof window.bnRebindTabs === 'function') return resolve();

        const existing = document.querySelector('script[data-patientdetails="1"]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => resolve());
            return;
        }

        const script = document.createElement('script');
        script.src = '/js/doctor/patientdetails.js?t=' + Date.now();
        script.setAttribute('data-patientdetails', '1');
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.body.appendChild(script);
    });
}

/* ============================================================
   7. Select Patient
============================================================ */
function selectPatient(patientId) {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    if (selectedPatientId === patientId) {
        loadPatientDetailsIntoMain(patientId);
        return;
    }

    if (selectedPatientId === null) {
        applyPatientSelection(patient);
        return;
    }

    showConfirmModal({
        title: 'تبديل المريض',
        subtitle: 'سيتم تحميل ملف المريض المحدد',
        message: `هل أنت متأكد من الانتقال إلى ملف المريض <strong>${patient.name}</strong>؟`,
        confirmText: 'نعم، انتقل',
        onConfirm: () => applyPatientSelection(patient)
    });
}

function applyPatientSelection(patient) {
    selectedPatientId = patient.id;
    bnStorage.set('selectedPatientId', patient.id);

    sessionStorage.setItem('bnCurrentPatientId', patient.id);
    sessionStorage.setItem('bnCurrentPatientCode', patient.code || '');
    sessionStorage.setItem('bnCurrentPatientName', patient.name || '');
    sessionStorage.setItem('bnCurrentPatientAge', patient.age != null ? String(patient.age) : '');
    sessionStorage.setItem('bnReturnToDoctor', 'true');

    renderPatientsList(document.getElementById('patientSearch')?.value || '');

    const newUrl = `/Doctor?patientId=${encodeURIComponent(patient.id)}`;
    window.history.pushState(
        { patientId: patient.id },
        `ملف المريض: ${patient.name}`,
        newUrl
    );

    showToast('success', 'تم اختيار المريض', `جارٍ تحميل ملف: ${patient.name}`);
    loadPatientDetailsIntoMain(patient.id);
}

/* ============================================================
   7.b فتح صفحة إحصائيات الاكتئاب
============================================================ */
function openPatientStatistics(patientId, patientName) {
    if (!patientId) return;

    const patient = patients.find(p => p.id === patientId);

    sessionStorage.setItem('bnCurrentPatientId', patientId);
    sessionStorage.setItem('bnCurrentPatientCode', patient?.code || '');
    sessionStorage.setItem('bnLastPatientName', patientName || '');
    sessionStorage.setItem('bnReturnToDoctor', 'true');

    showToast('info', 'إحصائيات الاكتئاب',
        patientName ? `جارٍ فتح إحصائيات: ${patientName}` : 'جارٍ فتح الإحصائيات...');

    window.location.href = `/Doctor/Statistic?id=${encodeURIComponent(patientId)}`;
}

window.openPatientStatistics = openPatientStatistics;

/* ============================================================
   8. Search
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('patientSearch');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = '1';
        searchInput.addEventListener('input', function () {
            renderPatientsList(this.value);
        });
    }
});

/* ============================================================
   9. Init — تحميل المرضى من السيرفر + استعادة ذكية
============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
    bnTheme.init();
    ensureToastContainer();

    await fetchPatientsFromServer();

    const urlParams = new URLSearchParams(window.location.search);
    const urlPatientId = urlParams.get('patientId');
    const sessionPatientId = sessionStorage.getItem('bnCurrentPatientId');
    const shouldRestore = sessionStorage.getItem('bnReturnToDoctor') === 'true';

    let targetId = null;
    if (urlPatientId) {
        targetId = urlPatientId;
    } else if (shouldRestore && sessionPatientId) {
        targetId = sessionPatientId;
    }

    sessionStorage.removeItem('bnReturnToDoctor');

    if (targetId && patients.some(p => p.id === targetId)) {
        selectedPatientId = null;
        selectPatient(targetId);
    }

    setTimeout(() => {
        if (selectedPatientId === null) {
            showToast('info', 'مرحباً بك', 'اختر مريضاً من القائمة لعرض ملفه الطبي.', 5000);
        }
    }, 800);

    console.log('%c✅ Index SPA Ready (API-driven)',
        'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
});

/* ============================================================
   10. Popstate — دعم زر الرجوع/التقدم
============================================================ */
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');

    if (patientId) {
        if (patients.some(p => p.id === patientId)) {
            selectedPatientId = null;
            selectPatient(patientId);
        }
    } else {
        selectedPatientId = null;
        sessionStorage.removeItem('bnCurrentPatientId');
        sessionStorage.removeItem('bnCurrentPatientCode');
        sessionStorage.removeItem('bnReturnToDoctor');
        bnStorage.set('selectedPatientId', null);

        renderPatientsList();

        const mainArea = document.querySelector('.main-content-area');
        if (mainArea) {
            mainArea.innerHTML = `
                <div class="content-placeholder" id="mainContentPlaceholder">
                    <div class="content-placeholder-icon">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h3>مرحباً بك في لوحة إدارة المرضى</h3>
                    <p>اختر مريضاً من القائمة على اليمين لعرض ملفه الطبي الكامل هنا.</p>
                    <span class="hint">
                        <i class="fa-solid fa-lightbulb"></i>
                        يمكنك البحث بالاسم أو الكود أو العمر
                    </span>
                </div>
            `;
        }
    }
});