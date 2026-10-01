/* ============================================================
   Reports Manager — Clean Script
============================================================ */
(function () {
    'use strict';

    /* -----------------------------------------
       Context & Storage
    ----------------------------------------- */
    var params = new URLSearchParams(window.location.search);
    var patientId = params.get('patientId') || params.get('id') || sessionStorage.getItem('bnCurrentPatientId') || '1';
    var storageKey = 'reports_patient_' + patientId;

    try { sessionStorage.setItem('bnCurrentPatientId', patientId); } catch (e) {}

    var S = {
        pre: 'balancy_',
        ok: function () {
            try { var t = '_'; localStorage.setItem(t, t); localStorage.removeItem(t); return true; }
            catch (e) { return false; }
        },
        get: function (k, d) {
            if (d === undefined) d = null;
            if (!this.ok()) return d;
            try { var r = localStorage.getItem(this.pre + k); return r ? JSON.parse(r) : d; }
            catch (e) { return d; }
        },
        set: function (k, v) {
            if (!this.ok()) return false;
            try { localStorage.setItem(this.pre + k, JSON.stringify(v)); return true; }
            catch (e) { return false; }
        }
    };

    /* -----------------------------------------
       Utilities
    ----------------------------------------- */
    function esc(v) {
        var d = document.createElement('div');
        d.textContent = v == null ? '' : v;
        return d.innerHTML;
    }

    function fDate(d) {
        if (!d) return '-';
        try {
            var x = new Date(d);
            return x.getFullYear() + '-' +
                String(x.getMonth() + 1).padStart(2, '0') + '-' +
                String(x.getDate()).padStart(2, '0');
        } catch (e) { return d; }
    }

    function fDateTime(d) {
        if (!d) return '-';
        try {
            var x = new Date(d);
            return fDate(d) + ' ' +
                String(x.getHours()).padStart(2, '0') + ':' +
                String(x.getMinutes()).padStart(2, '0');
        } catch (e) { return d; }
    }

    function today() {
        var t = new Date();
        return t.getFullYear() + '-' +
            String(t.getMonth() + 1).padStart(2, '0') + '-' +
            String(t.getDate()).padStart(2, '0');
    }

    function isToday(d) {
        return d ? fDate(d) === today() : false;
    }

    function safeName(n) {
        return (n || 'report').replace(/[^\w\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 80) || 'report';
    }

    /* -----------------------------------------
       Toast
    ----------------------------------------- */
    var toastT = null;
    function toast(type, title, msg, dur) {
        if (dur === undefined) dur = 3500;
        var el = document.getElementById('toastEl');
        var ic = document.getElementById('toastIc');
        var t = document.getElementById('toastTitle');
        var m = document.getElementById('toastMsg');
        if (!el) return;

        if (toastT) clearTimeout(toastT);

        el.className = 'toast';
        el.classList.remove('t-success', 't-error', 't-warning', 't-info', 'is-visible');

        var map = {
            success: ['t-success', 'fa-circle-check'],
            error: ['t-error', 'fa-circle-xmark'],
            warning: ['t-warning', 'fa-triangle-exclamation'],
            info: ['t-info', 'fa-circle-info']
        };
        var cfg = map[type] || map.info;
        el.classList.add(cfg[0]);
        ic.innerHTML = '<i class="fa-solid ' + cfg[1] + '"></i>';
        t.textContent = title;
        m.textContent = msg;

        requestAnimationFrame(function () {
            el.classList.add('is-visible');
        });

        toastT = setTimeout(function () {
            el.classList.remove('is-visible');
        }, dur);
    }

    /* -----------------------------------------
       Types & Sections
    ----------------------------------------- */
    var TYPES = {
        medical: { label: 'تقرير طبي شامل', icon: 'fa-notes-medical', cls: 't-medical c-medical', desc: 'تقرير شامل يحتوي على جميع بيانات المريض من التشخيص والأدوية والمؤشرات الحيوية' },
        psych: { label: 'تقرير تقييم نفسي', icon: 'fa-brain', cls: 't-psych c-psych', desc: 'نتائج المقاييس النفسية والتقييمات (GAD-7، PHQ-9، MDQ، SDS، C-SSRS)' },
        meds: { label: 'تقرير الأدوية والوصفات', icon: 'fa-prescription', cls: 't-meds c-meds', desc: 'قائمة الأدوية الموصوفة، الأعراض الجانبية، والخطة العلاجية' },
        vitals: { label: 'تقرير المؤشرات الحيوية', icon: 'fa-heart-pulse', cls: 't-vitals c-vitals', desc: 'قراءات ضغط الدم والسكر والوزن والنبض مع التقييم' },
        visits: { label: 'تقرير الزيارات والمواعيد', icon: 'fa-calendar-check', cls: 't-visits c-visits', desc: 'سجل الزيارات السابقة، جلسات الاستماع، والمواعيد القادمة' },
        custom: { label: 'تقرير مخصص', icon: 'fa-sliders', cls: 't-custom c-custom', desc: 'اختر الأقسام التي تريد تضمينها في التقرير بحرية كاملة' }
    };

    var SECTIONS = [
        { id: 'personal', label: 'البيانات الشخصية', icon: 'fa-user', def: true },
        { id: 'depressionStory', label: 'قصة الاكتئاب', icon: 'fa-book-open', def: true },
        { id: 'chronicDiseases', label: 'الأمراض المزمنة', icon: 'fa-notes-medical', def: true },
        { id: 'chronicPsychDiseases', label: 'الأمراض النفسية المزمنة', icon: 'fa-brain', def: true },
        { id: 'familyHistory', label: 'التاريخ العائلي', icon: 'fa-people-roof', def: true },
        { id: 'vitals', label: 'المؤشرات الحيوية', icon: 'fa-heart-pulse', def: true },
        { id: 'gad7', label: 'مقياس القلق (GAD-7)', icon: 'fa-clipboard-question', def: true },
        { id: 'phq9', label: 'مقياس الاكتئاب (PHQ-9)', icon: 'fa-clipboard-question', def: true },
        { id: 'mdq', label: 'مقياس ثنائي القطب (MDQ)', icon: 'fa-clipboard-question', def: true },
        { id: 'sds', label: 'مقياس الإعاقة (SDS)', icon: 'fa-clipboard-question', def: true },
        { id: 'cssrs', label: 'مؤشر الأفكار الانتحارية', icon: 'fa-triangle-exclamation', def: true },
        { id: 'diagnosis', label: 'التشخيص', icon: 'fa-stethoscope', def: true },
        { id: 'medications', label: 'الأدوية الموصوفة', icon: 'fa-pills', def: true },
        { id: 'treatmentPlans', label: 'الخطة العلاجية', icon: 'fa-diagram-project', def: true },
        { id: 'sideEffects', label: 'الأعراض الجانبية', icon: 'fa-exclamation-triangle', def: true },
        { id: 'visits', label: 'الزيارات', icon: 'fa-calendar-check', def: true },
        { id: 'substanceUse', label: 'تعاطي المواد', icon: 'fa-wine-bottle', def: false },
        { id: 'listeningSessions', label: 'جلسات الاستماع', icon: 'fa-headphones', def: true },
        { id: 'patientNotes', label: 'ملاحظات المريض', icon: 'fa-note-sticky', def: true },
        { id: 'doctorNotes', label: 'ملاحظات الطبيب', icon: 'fa-user-doctor', def: true }
    ];

    /* -----------------------------------------
       State
    ----------------------------------------- */
    var reports = S.get(storageKey, []);
    var curFilter = 'all';
    var curSearch = '';
    var curSort = 'newest';
    var curPatientFilter = '';
    var curPreview = null;
    var wiz = { step: 1, type: 'medical', title: '', patient: '', sections: [], range: 'all', notes: '' };

    /* -----------------------------------------
       Data Readers
    ----------------------------------------- */
    function getPatient() {
        var d = S.get('patientData', {});
        if (d && Object.keys(d).length) return d;
        return { firstName: 'أحمد', lastName: 'محمد علي', dateOfBirth: '1994-05-15', gender: 'male', phone: '+49 151 12345678', email: 'ahmed@example.com', city: 'برلين' };
    }
    function getDepression() {
        var d = S.get('depressionStory', {});
        if (d && Object.keys(d).length) return d;
        return { onset: 'قبل 3 سنوات', triggers: 'ضغوط عمل', course: 'متذبذب', previousTreatment: 'دواء ونفسي', currentStatus: 'تحت المتابعة' };
    }
    function getChronic() {
        var d = S.get('chronicDiseases', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ name: 'ارتفاع ضغط الدم', date: '2021-04-10', meds: 'أملوديبين 5 مغ', status: 'نشط' }];
    }
    function getChronicPsych() {
        var d = S.get('chronicPsychDiseases', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ name: 'اضطراب الاكتئاب الجسيم', date: '2021-06-15', severity: 'متوسط', status: 'نشط' }];
    }
    function getFamily() {
        var d = S.get('familyHistory', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ relation: 'أب', conditions: 'ضغط وسكري' }, { relation: 'أم', conditions: 'اكتئاب' }];
    }
    function getVitals() {
        var d = S.get('vitalSigns', []);
        if (Array.isArray(d) && d.length) return d;
        return [
            { type: 'bloodPressure', value1: '145', value2: '92', status: 'danger', date: '2024-10-20' },
            { type: 'weight', value1: '82', status: 'normal', date: '2024-10-18' }
        ];
    }
    function getGAD7() { return S.get('gad7Result') || { totalScore: 12, severity: 'متوسط', completedAt: '2024-10-10' }; }
    function getPHQ9() { return S.get('phq9Result') || { totalScore: 18, severity: 'شديد', completedAt: '2024-10-12' }; }
    function getMDQ() { return S.get('mdqResult') || { totalScore: 7, severity: 'محتمل', completedAt: '2024-10-08' }; }
    function getSDS() { return S.get('sdsResult') || { totalScore: 8, severity: 'متوسط', completedAt: '2024-10-08' }; }
    function getCSSRS() { return S.get('cssrsResult') || { totalScore: 2, severity: 'متوسط', riskLevel: 'يحتاج متابعة', completedAt: '2024-10-14' }; }
    function getDiagnoses() {
        var d = S.get('diagnosis', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ type: 'اضطراب الاكتئاب الجسيم (MDD)', subtype: 'مع قلق', date: '2023-06-15', severity: 'متوسط', code: 'F32.1' }];
    }
    function getMeds() {
        var d = S.get('medications', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ name: 'سيرترالين', dose: '50 مغ', frequency: 'مرة يومياً', route: 'فموي', status: 'نشط', startDate: '2023-06-20' }];
    }
    function getPlans() {
        var d = S.get('treatmentPlans', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ name: 'خطة علاج القلق', status: 'نشطة', duration: 30, startDate: '2024-09-01', goals: 'تقليل القلق' }];
    }
    function getSideEffects() {
        var d = S.get('sideEffects', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ medication: 'سيرترالين', effect: 'غثيان خفيف', severity: 'خفيف', date: '2023-07-01', action: 'استمرار' }];
    }
    function getVisits() {
        var d = S.get('visits', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ reason: 'متابعة دورية', visitDate: '2024-10-15', nextDate: '2024-11-15', doctor: 'د. سارة أحمد' }];
    }
    function getSubstance() {
        var d = S.get('substanceUse', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ name: 'التدخين', amount: '10 سجائر', duration: '5 سنوات', status: 'نشط' }];
    }
    function getListening() {
        var d = S.get('listeningSessions', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ date: '2024-10-10', duration: 45, therapist: 'د. سارة أحمد', topic: 'القلق', notes: 'تحسن' }];
    }
    function getPatientNotes() {
        var d = S.get('patientNotes', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ date: '2024-10-12', note: 'أشعر بتحسن في النوم' }];
    }
    function getDoctorNotes() {
        var d = S.get('doctorNotes', []);
        if (Array.isArray(d) && d.length) return d;
        return [{ date: '2024-10-15', note: 'استجابة جيدة للعلاج', doctor: 'د. سارة أحمد' }];
    }

    /* -----------------------------------------
       Theme
    ----------------------------------------- */
    function initTheme() {
        var t = S.get('theme', 'light');
        document.documentElement.setAttribute('data-theme', t);
    }

    function toggleTheme() {
        var cur = document.documentElement.getAttribute('data-theme') || 'light';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        S.set('theme', next);
        return next;
    }

    /* -----------------------------------------
       Render Templates
    ----------------------------------------- */
    function renderTemplates() {
        var grid = document.getElementById('templatesGrid');
        if (!grid) return;
        grid.innerHTML = '';

        Object.keys(TYPES).forEach(function (key) {
            var t = TYPES[key];
            var card = document.createElement('div');
            card.className = 'tpl-card ' + t.cls;
            card.innerHTML =
                '<div class="tpl-icon"><i class="fa-solid ' + t.icon + '"></i></div>' +
                '<h3 class="tpl-name">' + esc(t.label) + '</h3>' +
                '<p class="tpl-desc">' + esc(t.desc) + '</p>' +
                '<div class="tpl-footer">' +
                    '<span>توليد التقرير</span>' +
                    '<i class="fa-solid fa-arrow-left"></i>' +
                '</div>';
            card.addEventListener('click', function () { openWizard(key); });
            grid.appendChild(card);
        });
    }

    /* -----------------------------------------
       Patient Filter Dropdown
    ----------------------------------------- */
    function updatePatientFilter() {
        var sel = document.getElementById('patientFilter');
        if (!sel) return;

        var current = sel.value;
        var patients = {};
        reports.forEach(function (r) {
            if (r.patientName && !r.deleted) {
                patients[r.patientName] = (patients[r.patientName] || 0) + 1;
            }
        });

        var sorted = Object.keys(patients).sort(function (a, b) {
            return a.localeCompare(b, 'ar');
        });

        sel.innerHTML = '<option value="">كل المرضى (' + reports.filter(function (r) { return !r.deleted; }).length + ')</option>';

        sorted.forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name + ' (' + patients[name] + ')';
            sel.appendChild(opt);
        });

        if (sorted.indexOf(current) !== -1) {
            sel.value = current;
        }
    }

    /* -----------------------------------------
       Filter & Sort
    ----------------------------------------- */
    function getFiltered() {
        var list = reports.slice();

        if (curFilter === 'favorite') {
            list = list.filter(function (r) { return r.favorite && !r.deleted; });
        } else if (curFilter === 'deleted') {
            list = list.filter(function (r) { return r.deleted; });
        } else if (curFilter !== 'all') {
            list = list.filter(function (r) { return r.type === curFilter && !r.deleted; });
        } else {
            list = list.filter(function (r) { return !r.deleted; });
        }

        // ✅ فلترة حسب المريض
        if (curPatientFilter) {
            list = list.filter(function (r) {
                return (r.patientName || '').trim() === curPatientFilter.trim();
            });
        }

        // ✅ البحث الشامل (اسم المريض + عنوان + النوع)
        if (curSearch) {
            var q = curSearch.toLowerCase().trim();
            list = list.filter(function (r) {
                return (r.title || '').toLowerCase().indexOf(q) !== -1 ||
                       (r.patientName || '').toLowerCase().indexOf(q) !== -1 ||
                       (r.typeLabel || '').toLowerCase().indexOf(q) !== -1;
            });
        }

        // ✅ الترتيب
        if (curSort === 'oldest') {
            list.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        } else if (curSort === 'name') {
            list.sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'ar'); });
        } else if (curSort === 'patient') {
            list.sort(function (a, b) { return (a.patientName || '').localeCompare(b.patientName || '', 'ar'); });
        } else {
            list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        }

        return list;
    }

    /* -----------------------------------------
       Render Reports
    ----------------------------------------- */
    function render() {
        updateCounts();
        updatePatientFilter();

        var list = getFiltered();
        var grid = document.getElementById('reportsGrid');
        var sub = document.getElementById('reportsSubtitle');
        if (sub) sub.textContent = list.length + ' تقرير';
        if (!grid) return;

        if (list.length === 0) {
            grid.innerHTML =
                '<div class="empty-box">' +
                    '<div class="empty-box-icon"><i class="fa-solid fa-file-circle-plus"></i></div>' +
                    '<h3>' + (reports.length === 0 ? 'لا توجد تقارير بعد' : 'لا توجد نتائج مطابقة') + '</h3>' +
                    '<p>' + (reports.length === 0 ? 'ابدأ بتوليد تقرير جديد من القوالب أعلاه' : 'جرب تغيير الفلاتر أو كلمة البحث') + '</p>' +
                '</div>';
            return;
        }

        grid.innerHTML = '';

        list.forEach(function (r) {
            var cfg = TYPES[r.type] || TYPES.custom;

            var tagsHTML = '';
            if (r.sections && r.sections.length) {
                var tags = r.sections.slice(0, 3).map(function (sid) {
                    var sec = null;
                    for (var i = 0; i < SECTIONS.length; i++) {
                        if (SECTIONS[i].id === sid) { sec = SECTIONS[i]; break; }
                    }
                    return sec ? '<span class="rpt-tag"><i class="fa-solid ' + sec.icon + '"></i>' + esc(sec.label) + '</span>' : '';
                }).join('');
                var more = r.sections.length > 3 ? '<span class="rpt-tag">+' + (r.sections.length - 3) + '</span>' : '';
                tagsHTML = '<div class="rpt-tags">' + tags + more + '</div>';
            }

            var actionsHTML;
            if (r.deleted) {
                actionsHTML = '<button class="rpt-btn b-restore" data-action="restore" data-id="' + r.id + '" title="استعادة"><i class="fa-solid fa-rotate-left"></i></button>';
            } else {
                actionsHTML =
                    '<button class="rpt-btn b-view" data-action="view" data-id="' + r.id + '" title="عرض"><i class="fa-solid fa-eye"></i></button>' +
                    '<button class="rpt-btn b-pdf" data-action="pdf" data-id="' + r.id + '" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>' +
                    '<button class="rpt-btn b-html" data-action="html" data-id="' + r.id + '" title="HTML"><i class="fa-solid fa-download"></i></button>' +
                    '<button class="rpt-btn b-print" data-action="print" data-id="' + r.id + '" title="طباعة"><i class="fa-solid fa-print"></i></button>' +
                    '<button class="rpt-btn b-fav ' + (r.favorite ? 'is-on' : '') + '" data-action="fav" data-id="' + r.id + '" title="مفضلة"><i class="fa-solid fa-star"></i></button>';
            }

            // ✅ شارة المريض — تظهر دائماً إذا كان الاسم موجوداً
            var patientBadgeHTML = '';
            if (r.patientName) {
                patientBadgeHTML =
                    '<div class="rpt-patient-badge">' +
                        '<div class="rpt-patient-badge-icon"><i class="fa-solid fa-user"></i></div>' +
                        '<span class="rpt-patient-badge-label">المريض:</span>' +
                        '<span class="rpt-patient-badge-name">' + esc(r.patientName) + '</span>' +
                    '</div>';
            }

            var card = document.createElement('div');
            card.className = 'rpt-card ' + cfg.cls + (r.favorite ? ' is-favorite' : '');

            card.innerHTML =
                patientBadgeHTML +
                '<div class="rpt-head">' +
                    '<div class="rpt-icon"><i class="fa-solid ' + cfg.icon + '"></i></div>' +
                    '<div class="rpt-info">' +
                        '<h4 class="rpt-title">' + esc(r.title) + '</h4>' +
                        '<div class="rpt-meta">' +
                            '<span class="rpt-meta-item"><i class="fa-solid fa-calendar"></i> ' + esc(fDate(r.createdAt)) + '</span>' +
                            '<span class="rpt-meta-item"><i class="fa-solid fa-tag"></i> ' + esc(r.typeLabel) + '</span>' +
                            (isToday(r.createdAt) ? '<span class="rpt-badge-new"><i class="fa-solid fa-circle" style="font-size: 6px;"></i> جديد</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="rpt-preview"><i class="fa-solid fa-file-lines"></i> <span>' + esc(r.preview || 'انقر للعرض') + '</span></div>' +
                tagsHTML +
                '<div class="rpt-actions">' + actionsHTML +
                    '<button class="rpt-btn b-del" data-action="del" data-id="' + r.id + '" title="حذف"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';

            card.addEventListener('click', function () { openPreview(r.id); });
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = btn.dataset.id;
                var act = btn.dataset.action;
                var r = null;
                for (var i = 0; i < reports.length; i++) {
                    if (reports[i].id === id) { r = reports[i]; break; }
                }
                if (!r) return;

                if (act === 'view') openPreview(id);
                else if (act === 'pdf') exportPDF(r);
                else if (act === 'html') downloadHTML(r);
                else if (act === 'print') printReport(r);
                else if (act === 'fav') toggleFav(id);
                else if (act === 'del') askDelete(id, r.deleted);
                else if (act === 'restore') restoreReport(id);
            });
        });
    }

    /* -----------------------------------------
       Update Counts
    ----------------------------------------- */
    function updateCounts() {
        var active = reports.filter(function (r) { return !r.deleted; });

        function setText(id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        }

        setText('tcAll', active.length);
        setText('tcMedical', active.filter(function (r) { return r.type === 'medical'; }).length);
        setText('tcPsych', active.filter(function (r) { return r.type === 'psych'; }).length);
        setText('tcMeds', active.filter(function (r) { return r.type === 'meds'; }).length);
        setText('tcVitals', active.filter(function (r) { return r.type === 'vitals'; }).length);
        setText('tcVisits', active.filter(function (r) { return r.type === 'visits'; }).length);
        setText('tcFav', active.filter(function (r) { return r.favorite; }).length);
        setText('tcDel', reports.filter(function (r) { return r.deleted; }).length);

        setText('stTotal', active.length);
        setText('stFav', active.filter(function (r) { return r.favorite; }).length);
        setText('stToday', active.filter(function (r) { return isToday(r.createdAt); }).length);

        // ✅ عدد المرضى الفريدين
        var uniquePatients = {};
        active.forEach(function (r) {
            if (r.patientName) uniquePatients[r.patientName.trim()] = true;
        });
        setText('stPatients', Object.keys(uniquePatients).length);
    }

    /* -----------------------------------------
       Wizard
    ----------------------------------------- */
    function openWizard(preset) {
        if (preset === undefined) preset = null;
        var modal = document.getElementById('wizardModal');
        if (!modal) return;

        wiz = { step: 1, type: preset || 'medical', title: '', patient: '', sections: [], range: 'all', notes: '' };

        if (preset && TYPES[preset]) {
            document.getElementById('wizType').value = preset;
            wiz.title = TYPES[preset].label + ' - ' + today();
            document.getElementById('wizTitle').value = wiz.title;
        }

        // ✅ اسم المريض الفارغ افتراضياً ليكتبه المستخدم
        document.getElementById('wizPatient').value = '';
        wiz.patient = '';

        wiz.sections = defaultSections(wiz.type);
        renderWizardSections();
        renderWizardStep();
        modal.classList.add('is-open');
    }

    function closeWizard() {
        var m = document.getElementById('wizardModal');
        if (m) m.classList.remove('is-open');
    }

    function defaultSections(type) {
        if (type === 'medical') return SECTIONS.filter(function (s) { return s.def; }).map(function (s) { return s.id; });
        if (type === 'psych') return ['personal', 'gad7', 'phq9', 'mdq', 'sds', 'cssrs'];
        if (type === 'meds') return ['personal', 'medications', 'sideEffects', 'treatmentPlans'];
        if (type === 'vitals') return ['personal', 'vitals', 'chronicDiseases'];
        if (type === 'visits') return ['personal', 'visits', 'listeningSessions', 'patientNotes', 'doctorNotes'];
        return [];
    }

    function renderWizardSections() {
        var grid = document.getElementById('wizSections');
        if (!grid) return;
        grid.innerHTML = '';

        SECTIONS.forEach(function (sec) {
            var label = document.createElement('label');
            label.className = 'sec-item';
            var checked = wiz.sections.indexOf(sec.id) !== -1 ? 'checked' : '';
            label.innerHTML =
                '<input type="checkbox" value="' + sec.id + '" ' + checked + '>' +
                '<span class="sec-check"><i class="fa-solid fa-check"></i></span>' +
                '<span class="sec-icon"><i class="fa-solid ' + sec.icon + '"></i></span>' +
                '<span class="sec-label">' + esc(sec.label) + '</span>';

            var cb = label.querySelector('input');
            cb.addEventListener('change', function () {
                if (cb.checked) {
                    if (wiz.sections.indexOf(sec.id) === -1) wiz.sections.push(sec.id);
                } else {
                    wiz.sections = wiz.sections.filter(function (s) { return s !== sec.id; });
                }
            });
            grid.appendChild(label);
        });
    }

    function renderWizardStep() {
        var s = wiz.step;

        document.querySelectorAll('.step').forEach(function (el) {
            var n = parseInt(el.dataset.step);
            el.classList.toggle('is-active', n === s);
            el.classList.toggle('is-done', n < s);
        });

        document.querySelectorAll('.step-panel').forEach(function (el) {
            el.classList.toggle('is-active', parseInt(el.dataset.panel) === s);
        });

        var prev = document.getElementById('wizPrev');
        var next = document.getElementById('wizNext');
        var save = document.getElementById('wizSave');

        prev.style.display = s > 1 ? 'inline-flex' : 'none';
        next.style.display = s < 3 ? 'inline-flex' : 'none';
        save.style.display = s === 3 ? 'inline-flex' : 'none';

        if (s === 3) buildPreview();
    }

    function buildPreview() {
        var el = document.getElementById('wizPreview');
        if (!el) return;
        el.innerHTML = buildReportHTML({
            type: wiz.type,
            title: wiz.title || 'تقرير',
            patientName: wiz.patient,
            sections: wiz.sections,
            range: wiz.range,
            notes: wiz.notes
        }, true);
    }

    /* -----------------------------------------
       Build Report HTML
    ----------------------------------------- */
    function buildReportHTML(cfg, mini) {
        var type = cfg.type;
        var title = cfg.title;
        var patient = cfg.patientName;
        var secs = cfg.sections || [];
        var range = cfg.range || 'all';
        var out = [];

        if (!mini) {
            // ✅ رأس التقرير مع شارة المريض البارزة
            out.push(
                '<div class="rep-head">' +
                    '<div class="rep-logo"><i class="fa-solid fa-heart-pulse"></i></div>' +
                    '<div>' +
                        '<h1>' + esc(title) + '</h1>' +
                        '<p>نظام بالنسي — ' + esc((TYPES[type] && TYPES[type].label) || '') + '</p>' +
                    '</div>' +
                '</div>'
            );

            // ✅ شارة المريض
            if (patient) {
                out.push(
                    '<div class="rep-patient-hero">' +
                        '<div class="rep-patient-hero-icon"><i class="fa-solid fa-user"></i></div>' +
                        '<div>' +
                            '<div class="rep-patient-hero-label">اسم المريض</div>' +
                            '<div class="rep-patient-hero-name">' + esc(patient) + '</div>' +
                        '</div>' +
                    '</div>'
                );
            }

            out.push(
                '<div class="rep-meta">' +
                    '<div class="rep-meta-item"><span class="rep-meta-label">التاريخ</span><span class="rep-meta-value">' + fDate(new Date().toISOString()) + '</span></div>' +
                    '<div class="rep-meta-item"><span class="rep-meta-label">النطاق</span><span class="rep-meta-value">' + rangeLabel(range) + '</span></div>' +
                    '<div class="rep-meta-item"><span class="rep-meta-label">عدد الأقسام</span><span class="rep-meta-value">' + secs.length + '</span></div>' +
                    '<div class="rep-meta-item"><span class="rep-meta-label">نوع التقرير</span><span class="rep-meta-value">' + esc((TYPES[type] && TYPES[type].label) || '') + '</span></div>' +
                '</div>'
            );
        } else {
            out.push(
                '<h1 style="color: var(--c-primary); border-bottom: 2px solid var(--c-primary); padding-bottom: 10px; margin-bottom: 16px; font-size: 19px;">' +
                    '<i class="fa-solid fa-file-lines"></i> ' + esc(title) +
                '</h1>' +
                (patient ? '<div style="background: var(--c-primary-soft); padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; font-weight: 700; color: var(--c-primary-dark);"><i class="fa-solid fa-user"></i> المريض: ' + esc(patient) + '</div>' : '') +
                '<div style="font-size: 12px; color: var(--c-text-3); margin-bottom: 14px;">' +
                    '<strong>التاريخ:</strong> ' + fDate(new Date().toISOString()) +
                    ' | <strong>النطاق:</strong> ' + rangeLabel(range) +
                '</div>'
            );
        }

        function has(id) { return secs.indexOf(id) !== -1; }

        if (has('personal')) {
            var p = getPatient();
            out.push(
                '<h2><i class="fa-solid fa-user"></i> البيانات الشخصية</h2>' +
                '<table>' +
                    '<tr><td>الاسم</td><td>' + esc([p.firstName, p.lastName].filter(Boolean).join(' ') || '-') + '</td></tr>' +
                    '<tr><td>تاريخ الميلاد</td><td>' + esc(p.dateOfBirth || '-') + '</td></tr>' +
                    '<tr><td>الجنس</td><td>' + (p.gender === 'male' ? 'ذكر' : p.gender === 'female' ? 'أنثى' : '-') + '</td></tr>' +
                    '<tr><td>الهاتف</td><td>' + esc(p.phone || '-') + '</td></tr>' +
                    '<tr><td>البريد</td><td>' + esc(p.email || '-') + '</td></tr>' +
                    '<tr><td>المدينة</td><td>' + esc(p.city || '-') + '</td></tr>' +
                '</table>'
            );
        }

        if (has('depressionStory')) {
            var d = getDepression();
            out.push(
                '<h2><i class="fa-solid fa-book-open"></i> قصة الاكتئاب</h2>' +
                '<table>' +
                    '<tr><td>البداية</td><td>' + esc(d.onset || '-') + '</td></tr>' +
                    '<tr><td>المحفزات</td><td>' + esc(d.triggers || '-') + '</td></tr>' +
                    '<tr><td>المسار</td><td>' + esc(d.course || '-') + '</td></tr>' +
                    '<tr><td>العلاج السابق</td><td>' + esc(d.previousTreatment || '-') + '</td></tr>' +
                    '<tr><td>الحالة الحالية</td><td>' + esc(d.currentStatus || '-') + '</td></tr>' +
                '</table>'
            );
        }

        if (has('chronicDiseases')) {
            out.push('<h2><i class="fa-solid fa-notes-medical"></i> الأمراض المزمنة</h2>');
            getChronic().forEach(function (c) {
                out.push('<div class="item"><strong>' + esc(c.name) + '</strong><div class="item-meta">' + esc(fDate(c.date)) + (c.meds ? ' | ' + esc(c.meds) : '') + (c.status ? ' | ' + esc(c.status) : '') + '</div></div>');
            });
        }

        if (has('chronicPsychDiseases')) {
            out.push('<h2><i class="fa-solid fa-brain"></i> الأمراض النفسية المزمنة</h2>');
            getChronicPsych().forEach(function (c) {
                out.push('<div class="item"><strong>' + esc(c.name) + '</strong><div class="item-meta">' + esc(fDate(c.date)) + ' | ' + esc(c.severity || '-') + '</div></div>');
            });
        }

        if (has('familyHistory')) {
            out.push('<h2><i class="fa-solid fa-people-roof"></i> التاريخ العائلي</h2>');
            getFamily().forEach(function (f) {
                out.push('<div class="item"><strong>' + esc(f.relation) + '</strong><div class="item-meta">' + esc(f.conditions || '') + '</div></div>');
            });
        }

        if (has('vitals')) {
            out.push('<h2><i class="fa-solid fa-heart-pulse"></i> المؤشرات الحيوية</h2>');
            getVitals().forEach(function (v) {
                var lbl = { bloodPressure: 'ضغط الدم', weight: 'الوزن', glucose: 'سكر الدم', heartRate: 'النبض' }[v.type] || v.type;
                out.push('<div class="item"><strong>' + esc(lbl) + '</strong>: ' + esc(v.value1) + (v.value2 ? '/' + esc(v.value2) : '') + '<div class="item-meta">' + esc(fDate(v.date)) + '</div></div>');
            });
        }

        if (has('gad7')) {
            var g = getGAD7();
            out.push('<h2><i class="fa-solid fa-clipboard-question"></i> GAD-7</h2><div class="item"><strong>' + g.totalScore + ' / 21</strong><div class="item-meta">' + esc(g.severity) + ' | ' + esc(fDate(g.completedAt)) + '</div></div>');
        }
        if (has('phq9')) {
            var ph = getPHQ9();
            out.push('<h2><i class="fa-solid fa-clipboard-question"></i> PHQ-9</h2><div class="item"><strong>' + ph.totalScore + ' / 27</strong><div class="item-meta">' + esc(ph.severity) + ' | ' + esc(fDate(ph.completedAt)) + '</div></div>');
        }
        if (has('mdq')) {
            var m = getMDQ();
            out.push('<h2><i class="fa-solid fa-clipboard-question"></i> MDQ</h2><div class="item"><strong>' + m.totalScore + ' / 13</strong><div class="item-meta">' + esc(m.severity) + '</div></div>');
        }
        if (has('sds')) {
            var s = getSDS();
            out.push('<h2><i class="fa-solid fa-clipboard-question"></i> SDS</h2><div class="item"><strong>' + s.totalScore + ' / 30</strong><div class="item-meta">' + esc(s.severity) + '</div></div>');
        }
        if (has('cssrs')) {
            var c = getCSSRS();
            out.push('<h2><i class="fa-solid fa-triangle-exclamation"></i> C-SSRS</h2><div class="item" style="border-right-color: #ef4444;"><strong style="color: #dc2626;">' + c.totalScore + ' / 6</strong><div class="item-meta">' + esc(c.severity) + ' | ' + esc(c.riskLevel) + '</div></div>');
        }
        if (has('diagnosis')) {
            out.push('<h2><i class="fa-solid fa-stethoscope"></i> التشخيص</h2>');
            getDiagnoses().forEach(function (x) {
                out.push('<div class="item"><strong>' + esc(x.type) + '</strong>' + (x.subtype ? ' - ' + esc(x.subtype) : '') + (x.code ? ' (' + esc(x.code) + ')' : '') + '<div class="item-meta">' + esc(fDate(x.date)) + ' | ' + esc(x.severity || '-') + '</div></div>');
            });
        }
        if (has('medications')) {
            out.push('<h2><i class="fa-solid fa-pills"></i> الأدوية</h2>');
            getMeds().filter(function (m) { return m.status === 'نشط'; }).forEach(function (m) {
                out.push('<div class="item"><strong>' + esc(m.name) + '</strong> - ' + esc(m.dose || '') + '<div class="item-meta">' + esc(m.frequency || '') + ' | ' + esc(m.route || '') + '</div></div>');
            });
        }
        if (has('treatmentPlans')) {
            out.push('<h2><i class="fa-solid fa-diagram-project"></i> الخطة العلاجية</h2>');
            getPlans().forEach(function (p2) {
                out.push('<div class="item"><strong>' + esc(p2.name) + '</strong><div class="item-meta">' + esc(p2.status || '') + (p2.goals ? ' | ' + esc(p2.goals) : '') + '</div></div>');
            });
        }
        if (has('sideEffects')) {
            out.push('<h2><i class="fa-solid fa-exclamation-triangle"></i> الأعراض الجانبية</h2>');
            getSideEffects().forEach(function (se) {
                out.push('<div class="item" style="border-right-color: #f59e0b;"><strong>' + esc(se.medication) + '</strong> - ' + esc(se.effect) + '<div class="item-meta">' + esc(se.severity) + ' | ' + esc(fDate(se.date)) + '</div></div>');
            });
        }
        if (has('visits')) {
            out.push('<h2><i class="fa-solid fa-calendar-check"></i> الزيارات</h2>');
            getVisits().forEach(function (v) {
                out.push('<div class="item"><strong>' + esc(v.reason) + '</strong><div class="item-meta">' + esc(fDate(v.visitDate)) + (v.doctor ? ' | ' + esc(v.doctor) : '') + '</div></div>');
            });
        }
        if (has('substanceUse')) {
            out.push('<h2><i class="fa-solid fa-wine-bottle"></i> تعاطي المواد</h2>');
            getSubstance().forEach(function (s2) {
                out.push('<div class="item"><strong>' + esc(s2.name) + '</strong><div class="item-meta">' + esc(s2.amount || '') + (s2.duration ? ' | ' + esc(s2.duration) : '') + '</div></div>');
            });
        }
        if (has('listeningSessions')) {
            out.push('<h2><i class="fa-solid fa-headphones"></i> جلسات الاستماع</h2>');
            getListening().forEach(function (l) {
                out.push('<div class="item"><strong>' + esc(l.topic) + '</strong><div class="item-meta">' + esc(fDate(l.date)) + ' | ' + esc(l.duration) + ' د' + (l.notes ? '<br>' + esc(l.notes) : '') + '</div></div>');
            });
        }
        if (has('patientNotes')) {
            out.push('<h2><i class="fa-solid fa-note-sticky"></i> ملاحظات المريض</h2>');
            getPatientNotes().forEach(function (n) {
                out.push('<div class="item"><div class="item-meta">' + esc(fDate(n.date)) + '</div>' + esc(n.note) + '</div>');
            });
        }
        if (has('doctorNotes')) {
            out.push('<h2><i class="fa-solid fa-user-doctor"></i> ملاحظات الطبيب</h2>');
            getDoctorNotes().forEach(function (n) {
                out.push('<div class="item"><div class="item-meta">' + esc(fDate(n.date)) + (n.doctor ? ' | ' + esc(n.doctor) : '') + '</div>' + esc(n.note) + '</div>');
            });
        }

        if (!mini) {
            out.push('<div class="rep-footer"><i class="fa-solid fa-shield-heart"></i> هذا التقرير تم توليده تلقائياً من نظام بالنسي' + (patient ? '<br>المريض: ' + esc(patient) : '') + '<br>التاريخ: ' + fDateTime(new Date().toISOString()) + '</div>');
        }

        return out.join('');
    }

    function rangeLabel(r) {
        var m = { all: 'كل الفترات', month: '30 يوم', '3months': '3 أشهر', '6months': '6 أشهر', year: 'سنة' };
        return m[r] || 'كل الفترات';
    }

    /* -----------------------------------------
       Preview Modal
    ----------------------------------------- */
    function openPreview(id) {
        var r = null;
        for (var i = 0; i < reports.length; i++) {
            if (reports[i].id === id) { r = reports[i]; break; }
        }
        if (!r) return;
        curPreview = r;

        document.getElementById('previewTitle').textContent = r.title;
        document.getElementById('previewSubtitle').textContent = (r.patientName ? 'المريض: ' + r.patientName + ' • ' : '') + r.typeLabel + ' • ' + fDate(r.createdAt);

        var c = document.getElementById('printableContainer');
        c.innerHTML = buildReportHTML({
            type: r.type,
            title: r.title,
            patientName: r.patientName,
            sections: r.sections || [],
            range: r.range || 'all',
            notes: r.notes || ''
        }, false);

        document.getElementById('previewModal').classList.add('is-open');
    }

    function closePreview() {
        document.getElementById('previewModal').classList.remove('is-open');
        curPreview = null;
    }

    /* -----------------------------------------
       Export PDF
    ----------------------------------------- */
    function exportPDF(r) {
        if (!r) return;
        if (typeof html2canvas === 'undefined' || !window.jspdf) {
            toast('error', 'خطأ', 'مكتبات PDF غير محملة');
            return;
        }

        var loading = document.getElementById('loadingEl');
        if (loading) loading.classList.add('is-visible');

        var html = buildReportHTML({
            type: r.type,
            title: r.title,
            patientName: r.patientName,
            sections: r.sections || [],
            range: r.range || 'all',
            notes: r.notes || ''
        }, false);

        var A4 = 794;
        var wrap = document.createElement('div');
        wrap.setAttribute('dir', 'rtl');
        wrap.style.cssText = 'position:fixed;top:0;left:0;width:' + A4 + 'px;padding:40px 45px;background:#ffffff;color:#0f172a;font-family:"Tajawal",Tahoma,Arial,sans-serif;font-size:14px;line-height:1.9;box-sizing:border-box;z-index:2147483647;direction:rtl;';

        wrap.innerHTML =
            '<style>' +
                '#__pdf, #__pdf * { box-sizing: border-box; font-family: "Tajawal", Tahoma, Arial, sans-serif; letter-spacing: 0 !important; }' +
                '#__pdf .rep-head { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 3px solid #0891b2; }' +
                '#__pdf .rep-logo { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #0891b2, #0d9488); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; }' +
                '#__pdf .rep-head h1 { margin: 0; font-size: 20px; font-weight: 800; color: #0e7490; }' +
                '#__pdf .rep-head p { margin: 3px 0 0; font-size: 12px; color: #64748b; }' +
                '#__pdf .rep-patient-hero { background: #ecfeff; border: 1px solid #cffafe; border-radius: 12px; padding: 14px 18px; margin-bottom: 18px; display: flex; align-items: center; gap: 14px; }' +
                '#__pdf .rep-patient-hero-icon { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0891b2, #0d9488); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; }' +
                '#__pdf .rep-patient-hero-label { font-size: 11px; font-weight: 800; color: #0e7490; text-transform: uppercase; margin: 0 0 3px; }' +
                '#__pdf .rep-patient-hero-name { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; }' +
                '#__pdf .rep-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px; background: #f8fafc; border-radius: 12px; margin-bottom: 20px; }' +
                '#__pdf .rep-meta-item { display: flex; flex-direction: column; gap: 2px; }' +
                '#__pdf .rep-meta-label { font-size: 10px; font-weight: 800; color: #0e7490; }' +
                '#__pdf .rep-meta-value { font-size: 13px; font-weight: 700; color: #0f172a; }' +
                '#__pdf h2 { font-size: 15px; font-weight: 800; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 2px dashed #cbd5e1; color: #0f172a; }' +
                '#__pdf h2 i { color: #0891b2; }' +
                '#__pdf table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }' +
                '#__pdf table tr { border-bottom: 1px dashed #e2e8f0; }' +
                '#__pdf table td { padding: 8px 4px; font-size: 13px; }' +
                '#__pdf table td:first-child { font-weight: 700; color: #64748b; width: 40%; }' +
                '#__pdf .item { padding: 10px 14px; background: #f8fafc; border-radius: 8px; border-right: 3px solid #0891b2; margin-bottom: 8px; font-size: 13px; }' +
                '#__pdf .item-meta { font-size: 11px; color: #64748b; margin-top: 4px; }' +
                '#__pdf .rep-footer { margin-top: 28px; padding-top: 14px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }' +
            '</style>' +
            '<div id="__pdf">' + html + '</div>';

        document.body.appendChild(wrap);

        var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

        ready.then(function () {
            setTimeout(function () {
                var jsPDF = window.jspdf.jsPDF;
                html2canvas(wrap, {
                    scale: 2.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    letterRendering: false,
                    windowWidth: A4,
                    width: A4
                }).then(function (canvas) {
                    var data = canvas.toDataURL('image/jpeg', 0.95);
                    var pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                    var pw = pdf.internal.pageSize.getWidth();
                    var ph = pdf.internal.pageSize.getHeight();
                    var iw = pw;
                    var ih = (canvas.height * iw) / canvas.width;
                    var left = ih;
                    var pos = 0;

                    pdf.addImage(data, 'JPEG', 0, pos, iw, ih);
                    left -= ph;

                    while (left > 0) {
                        pos = left - ih;
                        pdf.addPage();
                        pdf.addImage(data, 'JPEG', 0, pos, iw, ih);
                        left -= ph;
                    }

                    // ✅ اسم الملف يتضمن اسم المريض
                    var baseName = r.patientName ? r.patientName + '_' + r.title : r.title;
                    pdf.save(safeName(baseName) + '.pdf');

                    if (wrap.parentNode) document.body.removeChild(wrap);
                    if (loading) loading.classList.remove('is-visible');
                    toast('success', '✅ تم التحميل', 'تم تحميل التقرير بصيغة PDF');
                }).catch(function (err) {
                    console.error(err);
                    if (wrap.parentNode) document.body.removeChild(wrap);
                    if (loading) loading.classList.remove('is-visible');
                    toast('error', 'فشل التصدير', 'حدث خطأ أثناء توليد PDF');
                });
            }, 500);
        });
    }

    /* -----------------------------------------
       Download HTML
    ----------------------------------------- */
    function downloadHTML(r) {
        var html =
'<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<title>' + esc(r.title) + '</title>\n' +
'<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">\n' +
'<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">\n' +
'<style>body{font-family:Tajawal,sans-serif;padding:2rem;max-width:900px;margin:0 auto;color:#0f172a;line-height:1.8}h1{color:#0e7490;border-bottom:3px solid #0891b2;padding-bottom:.5rem}h2{color:#0f172a;margin-top:1.5rem;border-bottom:2px dashed #cbd5e1;padding-bottom:.4rem}h2 i{color:#0891b2}.rep-head{display:flex;align-items:center;gap:1rem;padding-bottom:1rem;margin-bottom:1.5rem;border-bottom:3px solid #0891b2}.rep-logo{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#0891b2,#0d9488);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem}.rep-patient-hero{background:#ecfeff;border:1px solid #cffafe;border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px}.rep-patient-hero-icon{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#0d9488);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px}.rep-patient-hero-label{font-size:11px;font-weight:800;color:#0e7490;text-transform:uppercase;margin:0 0 3px}.rep-patient-hero-name{font-size:17px;font-weight:800;color:#0f172a;margin:0}.rep-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;padding:1rem;background:#f8fafc;border-radius:12px;margin-bottom:1.5rem}.rep-meta-label{font-size:.7rem;font-weight:800;color:#0e7490}.rep-meta-value{font-size:.9rem;font-weight:700}table{width:100%;border-collapse:collapse}table td{padding:.5rem .25rem;border-bottom:1px dashed #e2e8f0}table td:first-child{font-weight:700;color:#64748b;width:40%}.item{padding:.6rem .85rem;background:#f8fafc;border-radius:8px;border-right:3px solid #0891b2;margin-bottom:.5rem}.item-meta{font-size:.75rem;color:#64748b;margin-top:.25rem}.rep-footer{margin-top:2rem;padding-top:1rem;border-top:2px solid #e2e8f0;text-align:center;font-size:.75rem;color:#94a3b8}</style>\n' +
'</head>\n<body>\n' +
buildReportHTML({
    type: r.type,
    title: r.title,
    patientName: r.patientName,
    sections: r.sections || [],
    range: r.range || 'all',
    notes: r.notes || ''
}, false) +
'\n</body>\n</html>';

        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        // ✅ اسم الملف يتضمن اسم المريض
        var baseName = r.patientName ? r.patientName + '_' + r.title : r.title;
        a.download = safeName(baseName) + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('success', 'تم التحميل', 'تم تحميل التقرير بصيغة HTML');
    }

    function printReport(r) {
        openPreview(r.id);
        setTimeout(function () { window.print(); }, 400);
    }

    /* -----------------------------------------
       Actions
    ----------------------------------------- */
    function toggleFav(id) {
        var r = null;
        for (var i = 0; i < reports.length; i++) {
            if (reports[i].id === id) { r = reports[i]; break; }
        }
        if (!r) return;
        r.favorite = !r.favorite;
        S.set(storageKey, reports);
        render();
        toast('success', r.favorite ? 'أضيف للمفضلة' : 'أزيل من المفضلة', r.title);
    }

    function restoreReport(id) {
        var r = null;
        for (var i = 0; i < reports.length; i++) {
            if (reports[i].id === id) { r = reports[i]; break; }
        }
        if (!r) return;
        r.deleted = false;
        S.set(storageKey, reports);
        render();
        toast('success', 'تم الاستعادة', 'تمت استعادة "' + r.title + '"');
    }

    function askDelete(id, isPerm) {
        var r = null;
        for (var i = 0; i < reports.length; i++) {
            if (reports[i].id === id) { r = reports[i]; break; }
        }
        if (!r) return;

        var modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = isPerm ? 'حذف نهائي' : 'تأكيد الحذف';
        document.getElementById('confirmSub').textContent = isPerm ? 'لا يمكن التراجع' : 'سيتم نقلها لسلة المحذوفات';
        document.getElementById('confirmMsg').innerHTML = 'هل أنت متأكد من حذف <strong>' + esc(r.title) + '</strong>؟';

        modal.classList.add('is-open');

        function cleanup() {
            modal.classList.remove('is-open');
            document.getElementById('confirmOk').removeEventListener('click', onOk);
            document.getElementById('confirmCancel').removeEventListener('click', onCancel);
        }

        function onOk() {
            cleanup();
            if (isPerm) {
                reports = reports.filter(function (x) { return x.id !== id; });
                toast('success', 'تم الحذف نهائياً', r.title);
            } else {
                r.deleted = true;
                r.deletedAt = new Date().toISOString();
                toast('warning', 'تم النقل للسلة', r.title);
            }
            S.set(storageKey, reports);
            render();
        }

        function onCancel() {
            cleanup();
        }

        document.getElementById('confirmOk').addEventListener('click', onOk);
        document.getElementById('confirmCancel').addEventListener('click', onCancel);
    }

    /* -----------------------------------------
       Save Report
    ----------------------------------------- */
    function saveReport() {
        // ✅ التحقق من اسم المريض
        var patientName = (wiz.patient || '').trim();
        if (!patientName) {
            toast('error', 'حقل مطلوب', 'يرجى إدخال اسم المريض');
            return;
        }

        var typeLabel = (TYPES[wiz.type] && TYPES[wiz.type].label) || 'تقرير';
        var title = wiz.title || typeLabel + ' - ' + today();

        var r = {
            id: 'rp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            patientId: patientId,
            type: wiz.type,
            typeLabel: typeLabel,
            title: title,
            patientName: patientName, // ✅ اسم المريض محفوظ
            sections: wiz.sections.slice(),
            range: wiz.range,
            notes: wiz.notes,
            preview: typeLabel + ' — ' + wiz.sections.length + ' قسم',
            favorite: false,
            deleted: false,
            createdAt: new Date().toISOString()
        };

        reports.push(r);
        S.set(storageKey, reports);
        closeWizard();
        render();
        toast('success', '✅ تم الحفظ', 'تم إنشاء تقرير المريض "' + patientName + '" بنجاح', 4000);
        setTimeout(function () { openPreview(r.id); }, 400);
    }

    /* -----------------------------------------
       Event Listeners
    ----------------------------------------- */
    function bindEvents() {
        var themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var t = toggleTheme();
                toast('success', 'تغيير المظهر', t === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري');
            });
        }

        var printHeaderBtn = document.getElementById('printHeaderBtn');
        if (printHeaderBtn) printHeaderBtn.addEventListener('click', function () { window.print(); });

        var fab = document.getElementById('fabBtn');
        if (fab) fab.addEventListener('click', function () { openWizard(); });

        var search = document.getElementById('searchInput');
        if (search) {
            search.addEventListener('input', function (e) {
                curSearch = e.target.value.trim();
                render();
            });
        }

        // ✅ فلترة المريض
        var patientFilter = document.getElementById('patientFilter');
        if (patientFilter) {
            patientFilter.addEventListener('change', function (e) {
                curPatientFilter = e.target.value;
                render();
            });
        }

        var sort = document.getElementById('sortSelect');
        if (sort) {
            sort.addEventListener('change', function (e) {
                curSort = e.target.value;
                render();
            });
        }

        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('is-active'); });
                tab.classList.add('is-active');
                curFilter = tab.dataset.filter || 'all';
                render();
            });
        });

        // Wizard
        var wizClose = document.getElementById('wizClose');
        var wizCancel = document.getElementById('wizCancel');
        var wizPrev = document.getElementById('wizPrev');
        var wizNext = document.getElementById('wizNext');
        var wizSave = document.getElementById('wizSave');
        var wizardModal = document.getElementById('wizardModal');

        if (wizClose) wizClose.addEventListener('click', closeWizard);
        if (wizCancel) wizCancel.addEventListener('click', closeWizard);

        if (wizardModal) {
            wizardModal.addEventListener('click', function (e) {
                if (e.target === wizardModal) closeWizard();
            });
        }

        if (wizPrev) {
            wizPrev.addEventListener('click', function () {
                if (wiz.step > 1) {
                    wiz.step--;
                    renderWizardStep();
                }
            });
        }

        if (wizNext) {
            wizNext.addEventListener('click', function () {
                if (wiz.step === 1) {
                    wiz.patient = document.getElementById('wizPatient').value.trim();
                    wiz.type = document.getElementById('wizType').value;
                    wiz.title = document.getElementById('wizTitle').value.trim();

                    // ✅ التحقق من اسم المريض
                    if (!wiz.patient) {
                        toast('error', 'حقل مطلوب', 'يرجى إدخال اسم المريض');
                        return;
                    }
                    if (!wiz.title) {
                        // ✅ توليد عنوان تلقائي
                        wiz.title = TYPES[wiz.type].label + ' - ' + today();
                        document.getElementById('wizTitle').value = wiz.title;
                    }
                    if (wiz.sections.length === 0) {
                        wiz.sections = defaultSections(wiz.type);
                        renderWizardSections();
                    }
                }
                if (wiz.step === 2) {
                    wiz.range = document.getElementById('wizRange').value;
                    wiz.notes = document.getElementById('wizNotes').value.trim();

                    if (wiz.sections.length === 0) {
                        toast('error', 'لا توجد أقسام', 'اختر قسماً واحداً على الأقل');
                        return;
                    }
                }
                if (wiz.step < 3) {
                    wiz.step++;
                    renderWizardStep();
                }
            });
        }

        if (wizSave) wizSave.addEventListener('click', saveReport);

        // Preview
        var previewClose = document.getElementById('previewClose');
        var previewClose2 = document.getElementById('previewClose2');
        var pdfBtn = document.getElementById('pdfBtn');
        var printBtn2 = document.getElementById('printBtn2');
        var htmlBtn = document.getElementById('htmlBtn');
        var previewModal = document.getElementById('previewModal');

        if (previewClose) previewClose.addEventListener('click', closePreview);
        if (previewClose2) previewClose2.addEventListener('click', closePreview);
        if (pdfBtn) pdfBtn.addEventListener('click', function () { if (curPreview) exportPDF(curPreview); });
        if (printBtn2) printBtn2.addEventListener('click', function () { window.print(); });
        if (htmlBtn) htmlBtn.addEventListener('click', function () { if (curPreview) downloadHTML(curPreview); });

        if (previewModal) {
            previewModal.addEventListener('click', function (e) {
                if (e.target === previewModal) closePreview();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeWizard();
                closePreview();
                var c = document.getElementById('confirmModal');
                if (c) c.classList.remove('is-open');
            }
        });
    }

    /* -----------------------------------------
       Sample Data
    ----------------------------------------- */
    function seedSamples() {
        if (reports.length > 0 || !patientId) return;
        var t = new Date();
        function sub(n) { var x = new Date(t); x.setDate(x.getDate() - n); return x.toISOString(); }

        reports = [
            {
                id: 'rp_s1', patientId: patientId, type: 'medical', typeLabel: 'تقرير طبي شامل',
                title: 'تقرير طبي شامل - أكتوبر 2024', patientName: 'أحمد محمد علي',
                sections: ['personal', 'depressionStory', 'chronicDiseases', 'familyHistory', 'vitals', 'diagnosis', 'medications', 'treatmentPlans', 'sideEffects', 'visits', 'listeningSessions', 'patientNotes', 'doctorNotes'],
                range: 'all', notes: '', preview: 'تقرير طبي شامل — 13 قسم',
                favorite: true, deleted: false, createdAt: sub(3)
            },
            {
                id: 'rp_s2', patientId: patientId, type: 'psych', typeLabel: 'تقرير تقييم نفسي',
                title: 'تقرير تقييم نفسي - المقاييس', patientName: 'أحمد محمد علي',
                sections: ['personal', 'gad7', 'phq9', 'mdq', 'sds', 'cssrs', 'chronicPsychDiseases'],
                range: 'month', notes: '', preview: 'تقرير تقييم نفسي — 7 أقسام',
                favorite: false, deleted: false, createdAt: sub(15)
            },
            {
                id: 'rp_s3', patientId: patientId, type: 'meds', typeLabel: 'تقرير الأدوية والوصفات',
                title: 'تقرير الأدوية - أكتوبر 2024', patientName: 'سارة خالد',
                sections: ['personal', 'medications', 'sideEffects', 'treatmentPlans'],
                range: '3months', notes: '', preview: 'تقرير الأدوية — 4 أقسام',
                favorite: false, deleted: false, createdAt: sub(25)
            }
        ];
        S.set(storageKey, reports);
    }

    /* -----------------------------------------
       Init
    ----------------------------------------- */
    function init() {
        initTheme();
        seedSamples();
        renderTemplates();
        render();
        bindEvents();

        setTimeout(function () {
            toast('info', '📊 مدير التقارير', 'اختر قالباً لبدء إنشاء تقرير جديد', 5000);
        }, 700);

        console.log('%c✅ Reports Manager Ready', 'background:#0891b2;color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 50);
    }

})();