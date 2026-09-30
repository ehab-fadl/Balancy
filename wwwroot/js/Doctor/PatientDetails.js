/* ============================================================
  Patient Details — Tabs Content Loader (SPA-style)
============================================================ */

(function initPatientDetails() {
    console.log('🚀 PatientDetails.js initialized');

    /* ============================================================
       0. Toast Helper (داخل IIFE — قبل أي استخدام)
    ============================================================ */
    function toast(type, title, message, duration = 3500) {
        if (window.bnApp && typeof window.bnApp.showToast === 'function') {
            return window.bnApp.showToast(type, title, message, duration);
        }
        if (typeof window.showToast === 'function') {
            return window.showToast(type, title, message, duration);
        }
        if (!window.__bnToastRetryScheduled) {
            window.__bnToastRetryScheduled = true;
            setTimeout(() => {
                window.__bnToastRetryScheduled = false;
                if (typeof window.showToast === 'function') {
                    window.showToast(type, title, message, duration);
                } else {
                    console.log(`[Toast ${type}] ${title}: ${message}`);
                }
            }, 300);
        } else {
            console.log(`[Toast ${type}] ${title}: ${message}`);
        }
    }

    /* ============================================================
       1. TAB ROUTES
    ============================================================ */
    const TAB_ROUTES = {
        personal: '/Doctor/Tabs/PersonalInfo',
        depressionStory: '/Doctor/Tabs/DepressionStory',
        chronic: '/Doctor/Tabs/ChronicDiseases',
        chronicPsych: '/Doctor/Tabs/ChronicPsych',
        familyHistory: '/Doctor/Tabs/FamilyHistory',
        vitalSigns: '/Doctor/Tabs/VitalSigns',
        gad7: '/Doctor/Tabs/Gad7',
        phq9: '/Doctor/Tabs/Phq9',
        mdq: '/Doctor/Tabs/Mdq',
        sds: '/Doctor/Tabs/Sds',
        cssrs: '/Doctor/Tabs/Cssrs',
        diagnosis: '/Doctor/Tabs/Diagnosis',
        prescribedMedications: '/Doctor/Tabs/Medications',
        treatmentPlans: '/Doctor/Tabs/TreatmentPlans',
        sideEffects: '/Doctor/Tabs/SideEffects',
        visits: '/Doctor/Tabs/Visits',
        substanceUse: '/Doctor/Tabs/SubstanceUse',
        listeningSessions: '/Doctor/Tabs/ListeningSessions',
        patientNotes: '/Doctor/Tabs/PatientNotes',
        doctorNotes: '/Doctor/Tabs/DoctorNotes'
    };

    const tabLabels = {
        personal: 'البيانات الشخصية',
        depressionStory: 'قصة الاكتئاب',
        chronic: 'الأمراض المزمنة',
        chronicPsych: 'الأمراض النفسية',
        familyHistory: 'التاريخ الطبي العائلي',
        vitalSigns: 'المؤشرات الحيوية',
        gad7: 'القلق (GAD-7)',
        phq9: 'الاكتئاب (PHQ-9)',
        mdq: 'ثنائي القطب (MDQ)',
        sds: 'الإعاقة (SDS)',
        cssrs: 'الخطر (C-SSRS)',
        diagnosis: 'التشخيص',
        prescribedMedications: 'الأدوية الموصوفة',
        treatmentPlans: 'الخطط العلاجية',
        sideEffects: 'الأعراض الجانبية',
        visits: 'الزيارات',
        substanceUse: 'تعاطي المواد',
        listeningSessions: 'جلسات الاستماع',
        patientNotes: 'ملاحظات المريض',
        doctorNotes: 'ملاحظات الطبيب'
    };

    /* ============================================================
       2. Container
    ============================================================ */
    function getOrCreateTabContentContainer() {
        let container = document.getElementById('tabContentContainer');
        if (container) return container;

        const navGroups = document.querySelector('.nav-groups-wrapper');
        if (!navGroups) return null;

        container = document.createElement('div');
        container.id = 'tabContentContainer';
        container.className = 'tab-content-container';
        container.style.marginTop = '1.5rem';
        navGroups.insertAdjacentElement('afterend', container);
        return container;
    }

    /* ============================================================
       3. Load Tab Content
    ============================================================ */
    async function loadTabContent(tabName, btnEl) {
        const container = getOrCreateTabContentContainer();
        if (!container) return;

        const route = TAB_ROUTES[tabName];
        if (!route) {
            showTabMessage(container, 'info', `تبويب "${tabLabels[tabName] || tabName}" قيد الإنشاء`);
            highlightTab(btnEl);
            return;
        }

        container.innerHTML = `
            <div class="tab-loading-state">
                <div class="tab-loading-spinner"></div>
                <p>جاري تحميل ${tabLabels[tabName] || tabName}...</p>
            </div>
        `;
        highlightTab(btnEl);

        try {
            const patientId = window.bnCurrentPatientId || 1;
            const url = `${route}?patientId=${patientId}&t=${Date.now()}`;
            console.log('📡 Fetching tab:', url);

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const bodyContent = doc.body.cloneNode(true);
            bodyContent.querySelectorAll('script').forEach(s => s.remove());

            container.innerHTML = '';
            while (bodyContent.firstChild) {
                container.appendChild(bodyContent.firstChild);
            }

            doc.querySelectorAll('link[rel="stylesheet"]').forEach(linkEl => {
                const href = linkEl.getAttribute('href');
                if (!href) return;
                const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                    .some(l => l.getAttribute('href') === href);
                if (!exists) {
                    const newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = href;
                    document.head.appendChild(newLink);
                }
            });

            doc.querySelectorAll('style').forEach(styleEl => {
                const newStyle = document.createElement('style');
                newStyle.setAttribute('data-tab-style', tabName);
                newStyle.textContent = styleEl.textContent;
                document.head.appendChild(newStyle);
            });

            const scripts = Array.from(doc.querySelectorAll('script'));
            for (const oldScript of scripts) {
                if (oldScript.src) {
                    await loadScript(oldScript.getAttribute('src'), tabName);
                } else {
                    const newScript = document.createElement('script');
                    newScript.textContent = oldScript.textContent;
                    document.body.appendChild(newScript);
                    document.body.removeChild(newScript);
                }
            }

            toast('success', 'تم التحميل', tabLabels[tabName] || tabName);
        } catch (err) {
            console.error('❌ خطأ تحميل التبويب:', err);
            container.innerHTML = `
                <div class="tab-error-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>تعذر تحميل التبويب</h3>
                    <p>${err.message}</p>
                </div>
            `;
            toast('error', 'خطأ', `تعذر تحميل ${tabLabels[tabName] || tabName}`);
        }
    }

    /* ============================================================
       4. Load External Script
    ============================================================ */
    function loadScript(src, tabName) {
        return new Promise((resolve) => {
            if (!src) return resolve();

            document.querySelectorAll(`script[data-tab-script="${tabName}"]`).forEach(s => s.remove());

            const newScript = document.createElement('script');
            newScript.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
            newScript.setAttribute('data-tab-script', tabName);
            newScript.onload = () => {
                console.log(`✅ Script loaded: ${src}`);
                resolve();
            };
            newScript.onerror = () => {
                console.warn(`⚠️ Script failed: ${src}`);
                resolve();
            };
            document.body.appendChild(newScript);
        });
    }

    /* ============================================================
       5. Highlight Tab
    ============================================================ */
    function highlightTab(btnEl) {
        document.querySelectorAll('.patient-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        if (btnEl) {
            btnEl.classList.add('active');
            btnEl.setAttribute('aria-selected', 'true');
        }
    }

    /* ============================================================
       6. Tab Message
    ============================================================ */
    function showTabMessage(container, type, text) {
        const icon = type === 'info' ? 'fa-circle-info'
            : type === 'error' ? 'fa-circle-xmark'
                : 'fa-triangle-exclamation';
        container.innerHTML = `
            <div class="tab-empty-state">
                <i class="fa-solid ${icon}"></i>
                <p>${text}</p>
            </div>
        `;
    }

    /* ============================================================
       7. Bind Tab Buttons
    ============================================================ */
    function bindTabButtons() {
        const tabButtons = document.querySelectorAll('.patient-tab-btn');
        console.log(`🔗 عدد التبويبات: ${tabButtons.length}`);

        tabButtons.forEach((btn) => {
            const tabName = btn.dataset.tab;
            if (!tabName) return;

            if (btn.dataset.bound === '1') return;
            btn.dataset.bound = '1';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                loadTabContent(tabName, btn);
            });
        });

        console.log('✅ تم ربط التبويبات');
    }

    /* ============================================================
       8. Bind Other Buttons
    ============================================================ */
    function bindOtherButtons() {
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn && !copyBtn.dataset.bound) {
            copyBtn.dataset.bound = '1';
            copyBtn.removeAttribute('onclick');
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleCopyCode();
            });
        }

        const printBtn = document.getElementById('fpPrintBtn');
        if (printBtn && !printBtn.dataset.bound) {
            printBtn.dataset.bound = '1';
            printBtn.onclick = null;
            printBtn.addEventListener('click', (e) => { e.preventDefault(); window.print(); });
        }

        const exportBtn = document.getElementById('fpExportBtn');
        if (exportBtn && !exportBtn.dataset.bound) {
            exportBtn.dataset.bound = '1';
            exportBtn.onclick = null;
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toast('success', 'تصدير', 'جاري تصدير الملف...');
            });
        }
    }

    /* ============================================================
       9. Copy Code
    ============================================================ */
    function handleCopyCode() {
        const code = 'AB123456';
        const button = document.getElementById('copyBtn');
        if (!button) return;

        const onSuccess = () => {
            button.classList.add('copied');
            button.innerHTML = '<i class="fa-solid fa-check ms-1"></i> تم النسخ';
            toast('success', 'تم النسخ', 'تم نسخ كود المريض.');
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = '<i class="fa-regular fa-copy ms-1"></i> نسخ الكود';
            }, 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(onSuccess).catch(() => fallbackCopy(code, onSuccess));
        } else {
            fallbackCopy(code, onSuccess);
        }
    }

    function fallbackCopy(text, onSuccess) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const ok = document.execCommand('copy');
            if (ok && typeof onSuccess === 'function') onSuccess();
        } catch (err) { }
        finally { document.body.removeChild(textarea); }
    }

    /* ============================================================
       10. Init
    ============================================================ */
    function doInit() {
        console.log('🎯 تهيئة صفحة تفاصيل المريض...');

        bindTabButtons();
        bindOtherButtons();

        const personalBtn = document.querySelector('.patient-tab-btn[data-tab="personal"]');
        if (personalBtn) {
            console.log('📂 فتح تبويب البيانات الشخصية تلقائياً');
            loadTabContent('personal', personalBtn);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 100);
    }

    /* ============================================================
       11. Expose
    ============================================================ */
    window.bnRebindTabs = function () {
        bindTabButtons();
        bindOtherButtons();
    };

    /* ============================================================
       12. Global Network Observer — إظهار Toast تلقائي
           عند عمليات الإضافة/التعديل/الحذف/الحفظ
           يعترض: fetch + XHR + jQuery.ajax + form.submit
           ⚠️ لا يعدّل أي منطق قديم — فقط يراقب ويُظهر تنبيه
    ============================================================ */
    (function installNetworkObserver() {
        if (window.__bnNetworkObserverInstalled) return;
        window.__bnNetworkObserverInstalled = true;

        const ACTION_MAP = [
            { keywords: ['/save', '/update', '/edit', 'save', 'update', 'حفظ', 'تعديل'], type: 'success', title: 'تم الحفظ' },
            { keywords: ['/add', '/create', '/insert', 'add', 'create', 'إضافة'], type: 'success', title: 'تمت الإضافة' },
            { keywords: ['/delete', '/remove', 'delete', 'remove', 'حذف'], type: 'warning', title: 'تم الحذف' },
            { keywords: ['/submit', 'submit'], type: 'success', title: 'تم الإرسال' }
        ];

        function isTabLoader(url) {
            return url && url.toString().includes('/Doctor/Tabs/');
        }

        function detectAction(url, method) {
            const u = (url || '').toString().toLowerCase();
            const m = (method || 'GET').toString().toUpperCase();

            const hasKeyword = ACTION_MAP.some(e => e.keywords.some(k => u.includes(k.toLowerCase())));
            if (m === 'GET' && !hasKeyword) return null;

            for (const entry of ACTION_MAP) {
                if (entry.keywords.some(k => u.includes(k.toLowerCase()))) {
                    return entry;
                }
            }
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
                return { type: 'success', title: 'تمت العملية' };
            }
            return null;
        }

        function notifySuccess(action) {
            toast(action.type, action.title, 'تمت العملية بنجاح.');
        }

        function notifyError(status) {
            toast('error', 'فشلت العملية', status ? `رمز الخطأ: ${status}` : 'تعذر الاتصال بالخادم');
        }

        /* ---------- 1. Fetch ---------- */
        const originalFetch = window.fetch.bind(window);
        window.fetch = async function (input, init) {
            const url = (typeof input === 'string') ? input : (input && input.url) || '';
            const method = (init && init.method) || (input && input.method) || 'GET';
            const action = detectAction(url, method);

            try {
                const response = await originalFetch(input, init);
                if (action && !isTabLoader(url)) {
                    response.ok ? notifySuccess(action) : notifyError(response.status);
                }
                return response;
            } catch (err) {
                if (action && !isTabLoader(url)) notifyError();
                throw err;
            }
        };

        /* ---------- 2. XMLHttpRequest ---------- */
        const XHR = window.XMLHttpRequest;
        if (XHR && !XHR.__bnWrapped) {
            const originalOpen = XHR.prototype.open;
            const originalSend = XHR.prototype.send;

            XHR.prototype.open = function (method, url) {
                this.__bnMethod = method;
                this.__bnUrl = url;
                return originalOpen.apply(this, arguments);
            };

            XHR.prototype.send = function () {
                const url = this.__bnUrl || '';
                const method = this.__bnMethod || 'GET';
                const action = detectAction(url, method);

                if (action && !isTabLoader(url)) {
                    this.addEventListener('load', () => {
                        if (this.status >= 200 && this.status < 300) notifySuccess(action);
                        else notifyError(this.status);
                    });
                    this.addEventListener('error', () => notifyError());
                }
                return originalSend.apply(this, arguments);
            };

            XHR.__bnWrapped = true;
        }

        /* ---------- 3. jQuery.ajax ---------- */
        if (window.jQuery && window.jQuery.ajax && !window.jQuery.ajax.__bnWrapped) {
            const originalAjax = window.jQuery.ajax;
            window.jQuery.ajax = function (options) {
                try {
                    const url = (typeof options === 'string') ? options : (options && options.url) || '';
                    const method = (options && (options.type || options.method)) || 'GET';
                    const action = detectAction(url, method);

                    if (action && !isTabLoader(url)) {
                        const originalSuccess = options.success;
                        const originalError = options.error;

                        options.success = function () {
                            notifySuccess(action);
                            if (typeof originalSuccess === 'function') originalSuccess.apply(this, arguments);
                        };
                        options.error = function (xhr) {
                            notifyError(xhr && xhr.status);
                            if (typeof originalError === 'function') originalError.apply(this, arguments);
                        };
                    }
                } catch (e) { /* silent */ }
                return originalAjax.apply(this, arguments);
            };
            window.jQuery.ajax.__bnWrapped = true;
        }

        /* ---------- 4. HTMLFormElement.submit (form عادي) ---------- */
        if (window.HTMLFormElement && !HTMLFormElement.prototype.submit.__bnWrapped) {
            const originalFormSubmit = HTMLFormElement.prototype.submit;
            HTMLFormElement.prototype.submit = function () {
                try {
                    const action = this.getAttribute('action') || window.location.pathname;
                    const method = (this.getAttribute('method') || 'GET').toUpperCase();
                    const detected = detectAction(action, method);
                    if (detected && !isTabLoader(action)) {
                        notifySuccess(detected);
                    }
                } catch (e) { /* silent */ }
                return originalFormSubmit.apply(this, arguments);
            };
            HTMLFormElement.prototype.submit.__bnWrapped = true;
        }

        console.log('✅ Network Observer installed (fetch + XHR + jQuery + form.submit)');
    })();

    /* ============================================================
       13. Toast Fallback — يضمن وجود window.showToast دائماً
           حتى لو فُقد Index.js أثناء SPA Navigation
           ⚠️ لا يستبدل النسخة الأصلية إن وُجدت
    ============================================================ */
    (function ensureGlobalToast() {
        if (typeof window.showToast === 'function') {
            console.log('✅ window.showToast موجود مسبقاً (Index.js)');
            return;
        }

        console.warn('⚠️ window.showToast غير موجود — تركيب نسخة احتياطية...');

        let toastTimeoutId = null;
        let toastHideTimeoutId = null;

        window.showToast = function (type, title, message, duration = 3500) {
            const toastEl = document.getElementById('notificationToast');
            if (!toastEl) {
                console.log(`[Toast ${type}] ${title}: ${message}`);
                return;
            }

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

            toastTimeoutId = setTimeout(() => {
                if (!toastEl.classList.contains('show')) return;
                toastEl.classList.add('hiding');
                toastHideTimeoutId = setTimeout(() => {
                    toastEl.classList.remove('show', 'hiding');
                }, 280);
            }, duration);
        };

        console.log('✅ window.showToast (backup) installed');
    })();

    /* ============================================================
       14. Console → Toast Bridge — الأهم!
           يعترض console.log ويلتقط أي رسالة تبدأ بـ "[Toast"
           ويحوّلها إلى Toast مرئي حقيقي.
           ⚠️ لا يعدّل أي منطق قديم — فقط يراقب console.log
    ============================================================ */
    (function installConsoleToastBridge() {
        if (window.__bnConsoleToastBridgeInstalled) return;
        window.__bnConsoleToastBridgeInstalled = true;

        const originalLog = console.log.bind(console);
        const originalWarn = console.warn.bind(console);
        const originalError = console.error.bind(console);

        // نمط: [Toast type] title: message
        const TOAST_PATTERN = /^\[Toast\s+(info|success|error|warning)\]\s*([^:]+):\s*(.+)$/i;

        // منع التكرار السريع (debounce 200ms على نفس الرسالة)
        const recentToasts = new Map();

        function tryEmitToast(text) {
            if (typeof text !== 'string') return false;
            const match = text.match(TOAST_PATTERN);
            if (!match) return false;

            const type = match[1].toLowerCase();
            const title = (match[2] || '').trim();
            const message = (match[3] || '').trim();

            const key = `${type}|${title}|${message}`;
            const now = Date.now();
            if (recentToasts.has(key) && (now - recentToasts.get(key)) < 200) {
                return true; // تجاهل التكرار
            }
            recentToasts.set(key, now);

            // نظّف الخريطة دورياً
            if (recentToasts.size > 50) {
                for (const [k, ts] of recentToasts) {
                    if (now - ts > 5000) recentToasts.delete(k);
                }
            }

            // استخدم showToast الأصلي (من Index.js)
            if (typeof window.showToast === 'function') {
                try {
                    window.showToast(type, title, message, 3500);
                } catch (e) { /* silent */ }
            }
            return true;
        }

        console.log = function (...args) {
            const first = args[0];
            if (typeof first === 'string') {
                tryEmitToast(first);
            }
            return originalLog(...args);
        };

        console.warn = function (...args) {
            const first = args[0];
            if (typeof first === 'string') {
                tryEmitToast(first);
            }
            return originalWarn(...args);
        };

        console.error = function (...args) {
            const first = args[0];
            if (typeof first === 'string') {
                tryEmitToast(first);
            }
            return originalError(...args);
        };

        console.log('✅ Console → Toast Bridge installed');
    })();

})();

/* ============================================================
   15. Bind patientId to Document Manager links
       ✅ المسار الصحيح: /Doctor/DocumentManager/DocumentManager
============================================================ */
(function bindPatientIdToDocLinks() {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patientId')
        || params.get('id')
        || sessionStorage.getItem('bnCurrentPatientId')
        || '';

    // حفظ في window و sessionStorage للاستخدام العام
    window.bnCurrentPatientId = patientId;
    if (patientId) sessionStorage.setItem('bnCurrentPatientId', patientId);

    console.log('🆔 PatientId المستخرج من URL:', patientId || '(غير محدد)');

    // ✅ المسار الصحيح لمدير الوثائق
    const DOCS_BASE_URL = '/Doctor/DocumentManager/DocumentManager';

    // إضافة patientId لكل زر وثائق
    ['openDocsBtn', 'fpDocsBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.href = patientId
                ? `${DOCS_BASE_URL}?patientId=${patientId}`
                : DOCS_BASE_URL;
            console.log(`✅ تم تحديث رابط ${id} → ${btn.href}`);
        }
    });
})();