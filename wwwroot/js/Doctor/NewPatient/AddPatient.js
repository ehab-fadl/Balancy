/* ============================================================
   1. Storage Layer
============================================================ */
const bnStorage = {
    prefix: 'balancy_',
    isAvailable() {
        try {
            const t = '__bn_test__';
            localStorage.setItem(t, t);
            localStorage.removeItem(t);
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

// ✅ حماية من عدم وجود العنصر
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = bnTheme.toggle();
        showToast('success', 'تغيير المظهر',
            newTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري');
    });
}

/* ============================================================
   3. Loading Bar
============================================================ */
const bnLoading = {
    el: document.getElementById('bnLoadingBar'),
    counter: 0,
    start() { this.counter++; if (this.el) this.el.classList.add('active'); },
    stop() {
        this.counter = Math.max(0, this.counter - 1);
        if (this.counter === 0 && this.el) setTimeout(() => this.el.classList.remove('active'), 200);
    }
};

/* ============================================================
   4. Toast
============================================================ */
let toastTimeoutId = null;
let toastHideTimeoutId = null;

function showToast(type, title, message, duration = 3500) {
    const toastEl = document.getElementById('notificationToast');
    if (!toastEl) return; // ✅ حماية

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
        if (toastIcon) toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else if (type === 'error') {
        toastEl.classList.add('toast-error');
        if (toastIcon) toastIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    } else if (type === 'warning') {
        toastEl.classList.add('toast-warning');
        if (toastIcon) toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
        toastEl.classList.add('toast-info');
        if (toastIcon) toastIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }

    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;

    if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '100%';
    }
    void toastEl.offsetWidth;
    toastEl.classList.add('show');

    if (progressBar) {
        setTimeout(() => {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        }, 50);
    }

    toastTimeoutId = setTimeout(() => hideToast(), duration);
}

function hideToast() {
    const toastEl = document.getElementById('notificationToast');
    if (!toastEl || !toastEl.classList.contains('show')) return;
    toastEl.classList.add('hiding');
    toastHideTimeoutId = setTimeout(() => {
        toastEl.classList.remove('show', 'hiding');
    }, 280);
}

const toastCloseBtn = document.getElementById('toastCloseBtn');
if (toastCloseBtn) toastCloseBtn.addEventListener('click', hideToast);

/* ============================================================
   5. Existing Patients Handler
============================================================ */
function showExistingPatients() {
    const patients = bnStorage.get('patients', []);
    if (patients.length === 0) {
        showToast('info', 'لا يوجد مرضى', 'لم يتم تسجيل أي مريض بعد. ابدأ بإضافة مريض جديد.', 4500);
    } else {
        showToast('info', 'قائمة المرضى',
            `يوجد ${patients.length} مريض مسجّل. سيتم فتح القائمة في التطبيق الكامل.`, 4500);
    }
}

/* ============================================================
   6. Keyboard Shortcuts
============================================================ */
const shortcutsBtn = document.getElementById('shortcutsBtn');
if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', () => {
        showToast('info', 'اختصارات لوحة المفاتيح',
            'Alt+P لقائمة المرضى · Ctrl+Shift+L لتبديل الثيم', 5000);
    });
}

document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const t = document.getElementById('themeToggle');
        if (t) t.click();
        return;
    }
    if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        showExistingPatients();
        return;
    }
});

/* ============================================================
   7. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    bnTheme.init();

    setTimeout(() => {
        showToast('info', 'مرحباً بك في بالنسي',
            'اضغط على «إضافة مريض جديد» لبدء ملف جديد.', 5000);
    }, 900);

    console.log('%c✅ Balancy — Add Patient Landing Ready',
        'background:#0891b2;color:#fff;padding:8px 18px;border-radius:8px;font-weight:bold;font-size:13px;');
});