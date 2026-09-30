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

document.getElementById('themeToggle').addEventListener('click', () => {
    const newTheme = bnTheme.toggle();
    const msg = newTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري';
    showToast('success', 'تغيير المظهر', msg);
});

/* ============================================================
   3. Toast
============================================================ */
let toastTimeoutId = null;
let toastHideTimeoutId = null;

function showToast(type, title, message, duration = 3500) {
    const toastEl = document.getElementById('notificationToast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const progressBar = document.getElementById('toastProgressBar');

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
}

// اجعلها متاحة عالمياً لـ PatientDetails.js
window.showToast = showToast;

function hideToast() {
    const toastEl = document.getElementById('notificationToast');
    if (!toastEl.classList.contains('show')) return;
    toastEl.classList.add('hiding');
    toastHideTimeoutId = setTimeout(() => {
        toastEl.classList.remove('show', 'hiding');
    }, 280);
}

document.getElementById('toastCloseBtn').addEventListener('click', hideToast);

/* ============================================================
   4. Confirm Modal
============================================================ */
function showConfirmModal({ title, subtitle, message, confirmText, onConfirm }) {
    const modal = document.getElementById('bnConfirmModal');
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

    const query = filterText.trim().toLowerCase();

    const filtered = mockPatients.filter(p => {
        if (!query) return true;
        return p.name.toLowerCase().includes(query) ||
            p.code.toLowerCase().includes(query) ||
            String(p.age).includes(query);
    });

    listEl.innerHTML = '';
    emptyState.classList.toggle('show', filtered.length === 0);
    countEl.textContent = filtered.length;
    footerCountEl.textContent = mockPatients.length;

    if (filtered.length === 0) return;

    filtered.forEach((patient, index) => {
        const li = document.createElement('li');
        li.className = 'patient-item' + (patient.id === selectedPatientId ? ' active' : '');
        li.dataset.patient = patient.id;
        li.tabIndex = 0;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', patient.id === selectedPatientId ? 'true' : 'false');
        li.style.animation = `slideUpFade 0.35s ease ${index * 0.04}s both`;

        // ← ← ← تمّت إضافة زر الإحصائيات هنا (بين patient-info و patient-arrow) ← ← ←
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

        // ← ← ← ربط زر الإحصائيات مع منع انتشار النقر ← ← ←
        const statsBtn = li.querySelector('.patient-stats-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // مهم: يمنع اختيار المريض عند الضغط على الزر
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
   6. Load Patient Details into Main Content Area
============================================================ */
async function loadPatientDetailsIntoMain(patientId) {
    if (isLoadingPatient) return;
    isLoadingPatient = true;

    const mainArea = document.querySelector('.main-content-area');
    if (!mainArea) {
        isLoadingPatient = false;
        return;
    }

    // Skeleton / Loading
    mainArea.innerHTML = `
        <div class="pd-inline-loading">
            <div class="pd-inline-spinner"></div>
            <p>جاري تحميل ملف المريض...</p>
        </div>
    `;

    try {
        // اجلب صفحة تفاصيل المريض كاملة
        const url = `/Doctor/PatientDetails?id=${patientId}&t=${Date.now()}`;
        const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // ضع PatientId في متغير عام ليستخدمه PatientDetails.js
        window.bnCurrentPatientId = patientId;

        // خذ محتوى <main class="patient-main-content"> فقط
        const patientMain = doc.querySelector('.patient-main-content');

        mainArea.innerHTML = '';
        if (patientMain) {
            mainArea.appendChild(document.importNode(patientMain, true));
        } else {
            // fallback: كل الـ body بدون scripts
            const bodyClone = doc.body.cloneNode(true);
            bodyClone.querySelectorAll('script').forEach(s => s.remove());
            mainArea.innerHTML = bodyClone.innerHTML;
        }

        // أضف styles الخاصة بـ PatientDetails إن لم تكن موجودة
        ensureStylesheet('/css/doctor/patientdetails.css');

        // شغّل PatientDetails.js مرة واحدة فقط
        await ensurePatientDetailsScript();

        // اربط التبويبات وأعد التهيئة
        if (typeof window.bnRebindTabs === 'function') {
            window.bnRebindTabs();
        }

        // افتح تبويب البيانات الشخصية تلقائياً
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
   6.b  Helpers: inject CSS / JS مرة واحدة
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
        // إذا كان السكربت محمّلاً والـ API متاح
        if (typeof window.bnRebindTabs === 'function') return resolve();

        // إذا كان الوسم موجوداً لكن لم يُنفّذ بعد
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
   7. Select Patient (SPA — بدون انتقال)
============================================================ */
function selectPatient(patientId) {
    const patient = mockPatients.find(p => p.id === patientId);
    if (!patient) return;

    // إذا نفس المريض → أعد التحميل فقط
    if (selectedPatientId === patientId) {
        loadPatientDetailsIntoMain(patientId);
        return;
    }

    // عند أول اختيار → بدون Modal
    if (selectedPatientId === null) {
        applyPatientSelection(patient);
        return;
    }

    // تبديل مريض → Modal تأكيد
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
    renderPatientsList(document.getElementById('patientSearch').value);
    showToast('success', 'تم اختيار المريض', `جارٍ تحميل ملف: ${patient.name}`);
    loadPatientDetailsIntoMain(patient.id);
}

/* ============================================================
   7.b فتح صفحة إحصائيات الاكتئاب للمريض (جديد)
============================================================ */
function openPatientStatistics(patientId, patientName) {
    if (!patientId) return;

    showToast('info', 'إحصائيات الاكتئاب',
        patientName ? `جارٍ فتح إحصائيات: ${patientName}` : 'جارٍ فتح الإحصائيات...');

    // الانتقال لصفحة Statistic كاملة
    window.location.href = `/Doctor/Statistic?id=${patientId}`;
}

// اجعلها متاحة عالمياً (اختياري، مفيد للاختبار من الـ Console)
window.openPatientStatistics = openPatientStatistics;

/* ============================================================
   8. Search
============================================================ */
document.getElementById('patientSearch').addEventListener('input', function () {
    renderPatientsList(this.value);
});

/* ============================================================
   9. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    bnTheme.init();

    const savedId = bnStorage.get('selectedPatientId', null);
    if (savedId && mockPatients.some(p => p.id === savedId)) {
        selectedPatientId = savedId;
    } else {
        selectedPatientId = null;
    }

    renderPatientsList();

    // حمّل أول مريض تلقائياً
    const firstId = selectedPatientId || mockPatients[0]?.id;
    if (firstId) {
        selectedPatientId = null; // حتى نتجاوز Modal
        selectPatient(firstId);
    }

    setTimeout(() => {
        showToast('info', 'مرحباً بك', 'اختر مريضاً من القائمة لعرض ملفه الطبي.', 5000);
    }, 800);

    console.log('%c✅ Index SPA Ready (Sidebar Right + Details Left)',
        'background:#0891b2;color:#fff;padding:8px 20px;border-radius:8px;font-weight:bold;font-size:14px;');
});