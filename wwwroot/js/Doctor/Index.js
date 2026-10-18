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
   5. Patients Data
============================================================ */
const mockPatients = [
    { id: 1, name: 'أحمد محمد علي', code: 'AB123456', age: 32, initial: 'أ' },
    { id: 2, name: 'سارة عبدالله حسن', code: 'CD234567', age: 27, initial: 'س' },
    { id: 3, name: 'خالد إبراهيم سالم', code: 'EF345678', age: 41, initial: 'خ' },
    { id: 4, name: 'فاطمة حسن مصطفى', code: 'GH456789', age: 23, initial: 'ف' },
    { id: 5, name: 'عمر يوسف النجار', code: 'IJ567890', age: 35, initial: 'ع' },
    { id: 6, name: 'مريم سعيد رمضان', code: 'KL678901', age: 26, initial: 'م' }
];

let selectedPatientId = null;
let isLoadingPatient = false;

/* ============================================================
   5.b Render Patients List
============================================================ */
function renderPatientsList(filterText = '') {
    const listEl = document.getElementById('patientsList');
    const emptyState = document.getElementById('patientsEmptyState');
    const countEl = document.getElementById('patientsCount');
    const footerCountEl = document.getElementById('footerCount');

    if (!listEl) return;

    const query = filterText.trim().toLowerCase();

    const filtered = mockPatients.filter(p => {
        if (!query) return true;
        return p.name.toLowerCase().includes(query) ||
            p.code.toLowerCase().includes(query) ||
            String(p.age).includes(query);
    });

    listEl.innerHTML = '';
    if (emptyState) emptyState.classList.toggle('show', filtered.length === 0);
    if (countEl) countEl.textContent = filtered.length;
    if (footerCountEl) footerCountEl.textContent = mockPatients.length;

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
                <p class="patient-meta">${patient.age} سنة · ${patient.code}</p>
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
}

/* ============================================================
   6. Load Patient Details
============================================================ */
async function loadPatientDetailsIntoMain(patientId) {
    if (isLoadingPatient) return;
    isLoadingPatient = true;

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
        const url = `/Doctor/PatientDetails?id=${patientId}&t=${Date.now()}`;
        const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        window.bnCurrentPatientId = patientId;
        sessionStorage.setItem('bnCurrentPatientId', patientId);

        const patientMain = doc.querySelector('.patient-main-content');

        mainArea.innerHTML = '';
        if (patientMain) {
            mainArea.appendChild(document.importNode(patientMain, true));
        } else {
            const bodyClone = doc.body.cloneNode(true);
            bodyClone.querySelectorAll('script').forEach(s => s.remove());
            mainArea.innerHTML = bodyClone.innerHTML;
        }

        ensureStylesheet('/css/doctor/patientdetails.css');

        await ensurePatientDetailsScript();

        if (typeof window.bnRebindTabs === 'function') {
            window.bnRebindTabs();
        }

        const personalBtn = mainArea.querySelector('.patient-tab-btn[data-tab="personal"]');
        if (personalBtn) {
            personalBtn.click();
        }
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
    const patient = mockPatients.find(p => p.id === patientId);
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

    // ✅ حفظ في sessionStorage + علامة الرجوع
    sessionStorage.setItem('bnCurrentPatientId', patient.id);
    sessionStorage.setItem('bnLastPatientName', patient.name);
    // ✅ علامة: "المستخدم كان في Doctor ويجب استعادة المريض عند الرجوع"
    sessionStorage.setItem('bnReturnToDoctor', 'true');

    renderPatientsList(document.getElementById('patientSearch')?.value || '');

    // ✅ تحديث الرابط
    const newUrl = `/Doctor?patientId=${patient.id}`;
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

    sessionStorage.setItem('bnCurrentPatientId', patientId);
    sessionStorage.setItem('bnLastPatientName', patientName || '');
    sessionStorage.setItem('bnReturnToDoctor', 'true');   // ✅ علامة الرجوع

    showToast('info', 'إحصائيات الاكتئاب',
        patientName ? `جارٍ فتح إحصائيات: ${patientName}` : 'جارٍ فتح الإحصائيات...');

    window.location.href = `/Doctor/Statistic?id=${patientId}`;
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
   9. Init — استعادة ذكية
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    bnTheme.init();
    ensureToastContainer();

    const urlParams = new URLSearchParams(window.location.search);
    const urlPatientId = urlParams.get('patientId');
    const sessionPatientId = sessionStorage.getItem('bnCurrentPatientId');

    // ✅ العلامة: هل يجب استعادة المريض؟
    const shouldRestore = sessionStorage.getItem('bnReturnToDoctor') === 'true';

    renderPatientsList();

    // ✅ أولوية 1: URL (?patientId=X) — دائماً يعمل
    // ✅ أولوية 2: sessionStorage — فقط إذا كانت علامة الرجوع موجودة
    let targetId = null;

    if (urlPatientId) {
        targetId = Number(urlPatientId);
    } else if (shouldRestore && sessionPatientId) {
        targetId = Number(sessionPatientId);
    }
    // وإلا → لا شيء (شاشة الترحيب)

    // ✅ احذف العلامة بعد الاستخدام
    sessionStorage.removeItem('bnReturnToDoctor');

    if (targetId && mockPatients.some(p => p.id === targetId)) {
        selectedPatientId = null;
        selectPatient(targetId);
    }
    // وإلا → شاشة الترحيب تلقائياً

    setTimeout(() => {
        if (selectedPatientId === null) {
            showToast('info', 'مرحباً بك', 'اختر مريضاً من القائمة لعرض ملفه الطبي.', 5000);
        }
    }, 800);

    console.log('%c✅ Index SPA Ready',
        'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
});

/* ============================================================
   10. Popstate — دعم زر الرجوع/التقدم
============================================================ */
window.addEventListener('popstate', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');

    if (patientId) {
        const id = Number(patientId);
        if (mockPatients.some(p => p.id === id)) {
            selectedPatientId = null;
            selectPatient(id);
        }
    } else {
        // رجوع لشاشة الترحيب
        selectedPatientId = null;
        sessionStorage.removeItem('bnCurrentPatientId');
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