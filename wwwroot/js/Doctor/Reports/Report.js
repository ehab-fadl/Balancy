/* ============================================================
   Reports Manager — Dynamic Form Edition
   - كل حقل في الوثيقة القانونية يُدخله الطبيب يدوياً
   - يُخزَّن في localStorage بهيكل DB-ready
   - الانتقال للـ Backend لاحقاً = تغيير دالة saveReport فقط
============================================================ */
(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var patientId = params.get('patientId') || params.get('id') || sessionStorage.getItem('bnCurrentPatientId') || '1';
    var storageKey = 'reports_patient_' + patientId;
    try { sessionStorage.setItem('bnCurrentPatientId', patientId); } catch (e) { }

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

    function esc(v) { var d = document.createElement('div'); d.textContent = v == null ? '' : v; return d.innerHTML; }
    function fDate(d) {
        if (!d) return '-';
        try { var x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
        catch (e) { return d; }
    }
    function fDateTime(d) {
        if (!d) return '-';
        try { var x = new Date(d); return fDate(d) + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); }
        catch (e) { return d; }
    }
    function today() { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
    function isToday(d) { return d ? fDate(d) === today() : false; }
    function safeName(n) { return (n || 'report').replace(/[^\w\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 80) || 'report'; }
    function calcAge(dob) {
        if (!dob) return '-';
        try { var b = new Date(dob), t = new Date(); var age = t.getFullYear() - b.getFullYear(); var m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--; return age + ' سنة'; }
        catch (e) { return '-'; }
    }

    var toastT = null;
    function toast(type, title, msg, dur) {
        if (dur === undefined) dur = 3500;
        var el = document.getElementById('toastEl'); var ic = document.getElementById('toastIc'); var t = document.getElementById('toastTitle'); var m = document.getElementById('toastMsg');
        if (!el) return;
        if (toastT) clearTimeout(toastT);
        el.className = 'toast';
        el.classList.remove('t-success', 't-error', 't-warning', 't-info', 'is-visible');
        var map = { success: ['t-success', 'fa-circle-check'], error: ['t-error', 'fa-circle-xmark'], warning: ['t-warning', 'fa-triangle-exclamation'], info: ['t-info', 'fa-circle-info'] };
        var cfg = map[type] || map.info;
        el.classList.add(cfg[0]); ic.innerHTML = '<i class="fa-solid ' + cfg[1] + '"></i>';
        t.textContent = title; m.textContent = msg;
        requestAnimationFrame(function () { el.classList.add('is-visible'); });
        toastT = setTimeout(function () { el.classList.remove('is-visible'); }, dur);
    }

    /* ============================================================
       TYPES — 6 clinical + 15 legal
    ============================================================ */
    var TYPES = {
        // Clinical
        medical: { label: 'تقرير طبي شامل', icon: 'fa-notes-medical', cls: 't-medical c-medical', group: 'clinical' },
        psych: { label: 'تقرير تقييم نفسي', icon: 'fa-brain', cls: 't-psych c-psych', group: 'clinical' },
        meds: { label: 'تقرير الأدوية والوصفات', icon: 'fa-prescription', cls: 't-meds c-meds', group: 'clinical' },
        vitals: { label: 'تقرير المؤشرات الحيوية', icon: 'fa-heart-pulse', cls: 't-vitals c-vitals', group: 'clinical' },
        visits: { label: 'تقرير الزيارات والمواعيد', icon: 'fa-calendar-check', cls: 't-visits c-visits', group: 'clinical' },
        emergency: { label: 'تقرير طوارئ', icon: 'fa-triangle-exclamation', cls: 't-emergency c-emergency', group: 'clinical' },

        // Legal — 15
        consent: { label: 'موافقة مستنيرة', icon: 'fa-file-signature', cls: 't-consent c-consent', group: 'legal' },
        legalReport: { label: 'تقرير قانوني / قضائي', icon: 'fa-scale-balanced', cls: 't-legal c-legal', group: 'legal' },
        violenceRisk: { label: 'تقييم خطر العنف', icon: 'fa-shield-halved', cls: 't-violence c-violence', group: 'legal' },
        treatmentPlan: { label: 'خطة علاجية رسمية', icon: 'fa-clipboard-check', cls: 't-tplan c-tplan', group: 'legal' },
        discharge: { label: 'ملخص خروج / تحويل', icon: 'fa-door-open', cls: 't-discharge c-discharge', group: 'legal' },
        refusal: { label: 'رفض العلاج', icon: 'fa-hand', cls: 't-refusal c-refusal', group: 'legal' },
        capacity: { label: 'تقرير الأهلية العقلية', icon: 'fa-brain', cls: 't-capacity c-capacity', group: 'legal' },
        involuntary: { label: 'تقرير الإدخال القسري', icon: 'fa-lock', cls: 't-involuntary c-involuntary', group: 'legal' },
        fitnessWork: { label: 'تقرير اللياقة للعمل', icon: 'fa-briefcase-medical', cls: 't-fitness c-fitness', group: 'legal' },
        mandatoryReport: { label: 'إفادة الإبلاغ الإلزامي', icon: 'fa-bullhorn', cls: 't-mandatory c-mandatory', group: 'legal' },
        roi: { label: 'نموذج الإفراج عن المعلومات', icon: 'fa-share-from-square', cls: 't-roi c-roi', group: 'legal' },
        antidepressantMonitoring: { label: 'مراقبة مضادات الاكتئاب', icon: 'fa-chart-line', cls: 't-monitoring c-monitoring', group: 'legal' },
        ectPre: { label: 'تقرير ما قبل ECT / rTMS', icon: 'fa-bolt', cls: 't-ect c-ect', group: 'legal' },
        secondOpinion: { label: 'تقرير الرأي الثاني', icon: 'fa-user-doctor', cls: 't-second c-second', group: 'legal' },
        npp: { label: 'إشعار الخصوصية', icon: 'fa-shield-heart', cls: 't-npp c-npp', group: 'legal' },

        custom: { label: 'تقرير مخصص', icon: 'fa-sliders', cls: 't-custom c-custom', group: 'clinical' }
    };

    /* ============================================================
       FIELD SCHEMAS — تعريف ديناميكي لكل نوع
       كل نوع يعرّف حقوله الخاصة التي يدخلها الطبيب
       نوع الحقل: text, textarea, date, number, select, checkbox, checkboxGroup
    ============================================================ */
    var FIELD_SCHEMAS = {
        // ============ CONSENT — موافقة مستنيرة ============
        consent: {
            sections: [
                {
                    title: 'بيانات الموافقة',
                    icon: 'fa-file-signature',
                    fields: [
                        {
                            id: 'consentType', label: 'نوع الموافقة', type: 'select', required: true, options: [
                                'موافقة على العلاج النفسي', 'موافقة على العلاج الدوائي',
                                'موافقة على العلاج المشترك', 'موافقة على ECT / rTMS',
                                'موافقة على تبادل معلومات'
                            ]
                        },
                        { id: 'consentPurpose', label: 'الغرض من الموافقة', type: 'textarea', required: true, placeholder: 'اكتب وصفاً واضحاً للغرض...' }
                    ]
                },
                {
                    title: 'العلاج المقترح',
                    icon: 'fa-pills',
                    fields: [
                        { id: 'consentTreatment', label: 'العلاج المقترح', type: 'textarea', required: true, placeholder: 'مثال: سيرترالين 50mg + CBT أسبوعياً...' },
                        { id: 'consentDuration', label: 'المدة المتوقعة', type: 'text', required: true, placeholder: 'مثال: 6 أشهر' }
                    ]
                },
                {
                    title: 'المخاطر التي تم إفصاحها للمريض',
                    icon: 'fa-triangle-exclamation',
                    fields: [
                        { id: 'consentRisks', label: 'المخاطر الموضحة', type: 'textarea', required: true, placeholder: 'اذكر المخاطر التي أُفصح عنها للمريض...' },
                        { id: 'consentBenefits', label: 'الفوائد المتوقعة', type: 'textarea', required: false, placeholder: 'الفوائد التي تم شرحها...' },
                        { id: 'consentAlternatives', label: 'البدائل التي تم شرحها', type: 'textarea', required: false, placeholder: 'البدائل العلاجية...' }
                    ]
                },
                {
                    title: 'إقرار المريض',
                    icon: 'fa-check-circle',
                    fields: [
                        { id: 'consentUnderstood', label: 'المريض أكد أنه فهم المعلومات', type: 'checkbox', required: true },
                        { id: 'consentVoluntary', label: 'الموافقة صادرة طوعاً', type: 'checkbox', required: true },
                        { id: 'consentQuestionsAnswered', label: 'أُتيحت الفرصة لطرح الأسئلة', type: 'checkbox', required: true },
                        { id: 'consentWithdrawRight', label: 'المريض يعلم حقه في سحب الموافقة', type: 'checkbox', required: true }
                    ]
                }
            ]
        },

        // ============ LEGAL REPORT — تقرير قضائي ============
        legalReport: {
            sections: [
                {
                    title: 'الجهة الطالبة والسؤال المحال',
                    icon: 'fa-scale-balanced',
                    fields: [
                        { id: 'legalRequestingParty', label: 'الجهة الطالبة', type: 'text', required: true, placeholder: 'مثال: المحكمة / جهة العمل' },
                        { id: 'legalReferralQuestion', label: 'السؤال المحال', type: 'textarea', required: true, placeholder: 'ما هو السؤال القانوني المطروح؟' }
                    ]
                },
                {
                    title: 'الوقائع (Data)',
                    icon: 'fa-list-check',
                    fields: [
                        { id: 'legalFacts', label: 'الوقائع الموثقة', type: 'textarea', required: true, placeholder: 'اذكر الوقائع بناءً على المقابلة والفحص...' },
                        { id: 'legalSources', label: 'مصادر المعلومات', type: 'text', required: false, placeholder: 'مثال: المقابلة، المقاييس، السجل الطبي' }
                    ]
                },
                {
                    title: 'الاستنتاجات (Opinions)',
                    icon: 'fa-gavel',
                    fields: [
                        { id: 'legalOpinion', label: 'الرأي الطبي', type: 'textarea', required: true, placeholder: 'الاستنتاج الطبي النهائي...' },
                        { id: 'legalLimitations', label: 'محددات التقرير', type: 'textarea', required: false, placeholder: 'قيود على التقرير (معلومات ناقصة، عدم تعاون...)' }
                    ]
                }
            ]
        },

        // ============ VIOLENCE RISK ============
        violenceRisk: {
            sections: [
                {
                    title: 'تقييم الخطر',
                    icon: 'fa-shield-halved',
                    fields: [
                        { id: 'violenceRiskLevel', label: 'مستوى الخطر', type: 'select', required: true, options: ['منخفض', 'متوسط', 'عالي', 'حرج'] },
                        { id: 'violenceTargets', label: 'الأهداف المحتملة', type: 'textarea', required: true, placeholder: 'من قد يكونون في خطر؟ (إن وجدوا)' },
                        { id: 'violenceMeans', label: 'الوسائل المتاحة', type: 'textarea', required: true, placeholder: 'هل توجد وسائل خطرة متاحة؟' }
                    ]
                },
                {
                    title: 'الإجراءات المتخذة',
                    icon: 'fa-list-check',
                    fields: [
                        { id: 'violenceDutyToProtect', label: 'تفعيل واجب الحماية (Tarasoff)', type: 'checkbox', required: false },
                        { id: 'violenceRecipient', label: 'الجهة المُبلغ عنها', type: 'text', required: false, placeholder: 'إذا تم إبلاغ جهة...' },
                        { id: 'violenceActions', label: 'الإجراءات التفصيلية', type: 'textarea', required: true, placeholder: 'ما تم فعله بالتحديد...' }
                    ]
                }
            ]
        },

        // ============ TREATMENT PLAN ============
        treatmentPlan: {
            sections: [
                {
                    title: 'معلومات الخطة',
                    icon: 'fa-clipboard-check',
                    fields: [
                        { id: 'tplanDiagnosis', label: 'التشخيص الحالي', type: 'text', required: true, placeholder: 'مثال: F32.1 — اضطراب اكتئابي متوسط' },
                        { id: 'tplanStartDate', label: 'تاريخ البدء', type: 'date', required: true },
                        { id: 'tplanEndDate', label: 'تاريخ الانتهاء المتوقع', type: 'date', required: true }
                    ]
                },
                {
                    title: 'الأهداف العلاجية',
                    icon: 'fa-bullseye',
                    fields: [
                        { id: 'tplanGoalsShort', label: 'أهداف قصيرة المدى (1-3 أشهر)', type: 'textarea', required: true },
                        { id: 'tplanGoalsLong', label: 'أهداف طويلة المدى (6-12 شهر)', type: 'textarea', required: true }
                    ]
                },
                {
                    title: 'الوسائل والجلسات',
                    icon: 'fa-calendar-days',
                    fields: [
                        { id: 'tplanSessionFrequency', label: 'تكرار الجلسات', type: 'select', required: true, options: ['أسبوعياً', 'كل أسبوعين', 'شهرياً', 'حسب الحاجة'] },
                        { id: 'tplanSessionType', label: 'نوع الجلسات', type: 'text', required: true, placeholder: 'CBT / DBT / دعمي...' },
                        { id: 'tplanMedications', label: 'الأدوية', type: 'textarea', required: false, placeholder: 'قائمة الأدوية الموصوفة...' }
                    ]
                },
                {
                    title: 'آلية المراجعة',
                    icon: 'fa-clock-rotate-left',
                    fields: [
                        { id: 'tplanReviewDate', label: 'تاريخ المراجعة القادم', type: 'date', required: true },
                        { id: 'tplanReviewCriteria', label: 'معايير تقييم التقدم', type: 'textarea', required: false }
                    ]
                }
            ]
        },

        // ============ DISCHARGE ============
        discharge: {
            sections: [
                {
                    title: 'معلومات الخروج',
                    icon: 'fa-door-open',
                    fields: [
                        { id: 'dischargeType', label: 'نوع الخروج', type: 'select', required: true, options: ['خروج نهائي', 'تحويل لطبيب آخر', 'انتهاء الخطة', 'خروج ضد النصيحة', 'خروج إداري'] },
                        { id: 'dischargeReason', label: 'سبب الخروج', type: 'textarea', required: true },
                        { id: 'dischargeDate', label: 'تاريخ الخروج', type: 'date', required: true }
                    ]
                },
                {
                    title: 'ملخص العلاج',
                    icon: 'fa-clipboard-list',
                    fields: [
                        { id: 'dischargeSummary', label: 'ملخص ما تم إنجازه', type: 'textarea', required: true },
                        { id: 'dischargeDiagnosis', label: 'التشخيص عند الخروج', type: 'text', required: true },
                        { id: 'dischargeMeds', label: 'الأدوية الحالية', type: 'textarea', required: false }
                    ]
                },
                {
                    title: 'خطة المتابعة',
                    icon: 'fa-route',
                    fields: [
                        { id: 'dischargeFollowUp', label: 'خطة المتابعة', type: 'textarea', required: true },
                        { id: 'dischargeWarnings', label: 'علامات التحذير التي تستدعي العودة', type: 'textarea', required: true },
                        { id: 'dischargeReferredTo', label: 'تم التحويل إلى', type: 'text', required: false }
                    ]
                }
            ]
        },

        // ============ REFUSAL ============
        refusal: {
            sections: [
                {
                    title: 'موضوع الرفض',
                    icon: 'fa-hand',
                    fields: [
                        { id: 'refusalWhat', label: 'ما الذي يرفضه المريض', type: 'textarea', required: true },
                        { id: 'refusalDate', label: 'تاريخ الرفض', type: 'date', required: true }
                    ]
                },
                {
                    title: 'ما تم شرحه للمريض',
                    icon: 'fa-comment-medical',
                    fields: [
                        { id: 'refusalExplained', label: 'المعلومات التي تم شرحها', type: 'textarea', required: true },
                        { id: 'refusalRisksWarned', label: 'المخاطر التي حُذّر منها', type: 'textarea', required: true }
                    ]
                },
                {
                    title: 'تقييم الأهلية',
                    icon: 'fa-brain',
                    fields: [
                        { id: 'refusalCapacity', label: 'المريض كامل الأهلية لاتخاذ القرار', type: 'checkbox', required: true },
                        { id: 'refusalNoPressure', label: 'القرار صادر دون ضغط خارجي', type: 'checkbox', required: true },
                        { id: 'refusalUnderstands', label: 'المريض يفهم عواقب رفضه', type: 'checkbox', required: true },
                        { id: 'refusalNotes', label: 'ملاحظات الطبيب', type: 'textarea', required: false }
                    ]
                }
            ]
        },

        // ============ CAPACITY ============
        capacity: {
            sections: [
                {
                    title: 'سبب تقييم الأهلية',
                    icon: 'fa-question',
                    fields: [
                        { id: 'capacityReason', label: 'سبب التقييم', type: 'textarea', required: true, placeholder: 'مثال: طلب المحكمة / رفض العلاج / توقيع عقد' },
                        { id: 'capacityDate', label: 'تاريخ التقييم', type: 'date', required: true }
                    ]
                },
                {
                    title: 'اختبارات الأهلية الأربعة (MCA 2005)',
                    icon: 'fa-list-ol',
                    fields: [
                        { id: 'capacityUnderstand', label: '1. الفهم (Understanding)', type: 'select', required: true, options: ['سليم', 'ضعيف', 'غائب'] },
                        { id: 'capacityRetain', label: '2. الاستيعاب (Retention)', type: 'select', required: true, options: ['سليم', 'ضعيف', 'غائب'] },
                        { id: 'capacityReasoning', label: '3. الاستدلال (Reasoning)', type: 'select', required: true, options: ['سليم', 'ضعيف', 'غائب'] },
                        { id: 'capacityCommunicate', label: '4. التعبير (Communication)', type: 'select', required: true, options: ['سليم', 'ضعيف', 'غائب'] }
                    ]
                },
                {
                    title: 'الخلاصة',
                    icon: 'fa-check-double',
                    fields: [
                        { id: 'capacityConclusion', label: 'الخلاصة النهائية', type: 'select', required: true, options: ['كامل الأهلية', 'أهلية جزئية', 'فاقد الأهلية'] },
                        { id: 'capacityJustification', label: 'التبرير التفصيلي', type: 'textarea', required: true }
                    ]
                }
            ]
        },

        // ============ INVOLUNTARY ============
        involuntary: {
            sections: [
                {
                    title: 'معلومات الاحتجاز',
                    icon: 'fa-lock',
                    fields: [
                        { id: 'involuntaryDate', label: 'تاريخ الاحتجاز', type: 'date', required: true },
                        { id: 'involuntaryLegalBasis', label: 'الأساس القانوني', type: 'text', required: true, placeholder: 'مثال: Mental Health Act Section 2' },
                        { id: 'involuntaryDuration', label: 'المدة المتوقعة', type: 'text', required: true, placeholder: 'مثال: 28 يوماً' }
                    ]
                },
                {
                    title: 'المعايير المستوفاة',
                    icon: 'fa-gavel',
                    fields: [
                        { id: 'involuntaryMentalDisorder', label: 'يوجد اضطراب نفسي', type: 'checkbox', required: true },
                        { id: 'involuntaryRiskSelf', label: 'خطر على الذات', type: 'checkbox', required: false },
                        { id: 'involuntaryRiskOthers', label: 'خطر على الآخرين', type: 'checkbox', required: false },
                        { id: 'involuntaryRefusedVoluntary', label: 'رفض العلاج الطوعي', type: 'checkbox', required: true },
                        { id: 'involuntaryJustification', label: 'التبرير التفصيلي', type: 'textarea', required: true }
                    ]
                },
                {
                    title: 'البدائل التي تم النظر فيها',
                    icon: 'fa-arrows-split-up-and-left',
                    fields: [
                        { id: 'involuntaryAlternatives', label: 'البدائل الأقل تقييداً', type: 'textarea', required: true, placeholder: 'ما البدائل التي دُرست ولماذا رُفضت؟' }
                    ]
                }
            ]
        },

        // ============ FITNESS FOR WORK ============
        fitnessWork: {
            sections: [
                {
                    title: 'بيانات التقرير',
                    icon: 'fa-briefcase',
                    fields: [
                        { id: 'fitnessType', label: 'نوع التقرير', type: 'select', required: true, options: ['إعفاء من العمل', 'إجازة مرضية', 'عودة تدريجية', 'تقييم للإعاقة'] },
                        { id: 'fitnessRequestedBy', label: 'الجهة الطالبة', type: 'text', required: true, placeholder: 'صاحب العمل / شركة التأمين' },
                        { id: 'fitnessDate', label: 'تاريخ التقرير', type: 'date', required: true }
                    ]
                },
                {
                    title: 'تقييم القدرة',
                    icon: 'fa-gauge-high',
                    fields: [
                        { id: 'fitnessWorkCapacity', label: 'القدرة على العمل', type: 'select', required: true, options: ['غير قادر تماماً', 'قادر جزئياً', 'قادر بشروط'] },
                        { id: 'fitnessDuration', label: 'المدة المتوقعة', type: 'text', required: true, placeholder: 'مثال: 4-6 أسابيع' },
                        { id: 'fitnessLimitations', label: 'القيود الوظيفية', type: 'textarea', required: true }
                    ]
                },
                {
                    title: 'التوصيات',
                    icon: 'fa-lightbulb',
                    fields: [
                        { id: 'fitnessRecommendations', label: 'التوصيات', type: 'textarea', required: true },
                        { id: 'fitnessReviewDate', label: 'موعد إعادة التقييم', type: 'date', required: false }
                    ]
                }
            ]
        },

        // ============ MANDATORY REPORTING ============
        mandatoryReport: {
            sections: [
                {
                    title: 'تفاصيل الإبلاغ',
                    icon: 'fa-bullhorn',
                    fields: [
                        { id: 'mandatoryRecipient', label: 'الجهة المُبلغ عنها', type: 'text', required: true, placeholder: 'الشرطة / الطرف المستهدف / جهة الحماية' },
                        { id: 'mandatoryDate', label: 'تاريخ الإبلاغ', type: 'date', required: true },
                        { id: 'mandatoryMethod', label: 'طريقة الإبلاغ', type: 'select', required: true, options: ['هاتفياً', 'كتابياً', 'حضورياً', 'إلكترونياً'] }
                    ]
                },
                {
                    title: 'التهديد',
                    icon: 'fa-triangle-exclamation',
                    fields: [
                        { id: 'mandatoryThreatDetails', label: 'تفاصيل التهديد', type: 'textarea', required: true },
                        { id: 'mandatoryTarget', label: 'الطرف المستهدف', type: 'text', required: true },
                        { id: 'mandatoryCredibility', label: 'مصداقية التهديد', type: 'select', required: true, options: ['منخفضة', 'متوسطة', 'عالية'] }
                    ]
                },
                {
                    title: 'الإجراءات',
                    icon: 'fa-list-check',
                    fields: [
                        { id: 'mandatoryActions', label: 'الإجراءات المتخذة', type: 'textarea', required: true },
                        { id: 'mandatoryReferenced', label: 'رقم الإبلاغ / المرجع', type: 'text', required: false }
                    ]
                }
            ]
        },

        // ============ ROI ============
        roi: {
            sections: [
                {
                    title: 'المستلم المصرح له',
                    icon: 'fa-users',
                    fields: [
                        { id: 'roiRecipientName', label: 'اسم المستلم', type: 'text', required: true },
                        { id: 'roiRecipientRelation', label: 'العلاقة بالمريض', type: 'text', required: true, placeholder: 'طبيب آخر / محامي / تأمين...' },
                        { id: 'roiRecipientContact', label: 'بيانات الاتصال', type: 'text', required: true }
                    ]
                },
                {
                    title: 'السجلات المشمولة',
                    icon: 'fa-folder-open',
                    fields: [
                        { id: 'roiRecords', label: 'السجلات التي يُفرج عنها', type: 'textarea', required: true, placeholder: 'اذكر السجلات المحددة...' },
                        { id: 'roiExcluded', label: 'السجلات المستثناة', type: 'textarea', required: false, placeholder: 'مثال: Psychotherapy Notes' }
                    ]
                },
                {
                    title: 'الصلاحية',
                    icon: 'fa-calendar-check',
                    fields: [
                        { id: 'roiValidFrom', label: 'صالح من', type: 'date', required: true },
                        { id: 'roiValidTo', label: 'صالح حتى', type: 'date', required: true },
                        { id: 'roiRevocable', label: 'قابل للإلغاء كتابياً', type: 'checkbox', required: true }
                    ]
                }
            ]
        },

        // ============ ANTIDEPRESSANT MONITORING ============
        antidepressantMonitoring: {
            sections: [
                {
                    title: 'بيانات الدواء',
                    icon: 'fa-pills',
                    fields: [
                        { id: 'monMedication', label: 'الدواء', type: 'text', required: true },
                        { id: 'monDose', label: 'الجرعة', type: 'text', required: true },
                        { id: 'monStartDate', label: 'تاريخ البدء', type: 'date', required: true }
                    ]
                },
                {
                    title: 'القراءة الأساسية',
                    icon: 'fa-chart-simple',
                    fields: [
                        { id: 'monBaselinePHQ9', label: 'PHQ-9 قبل البدء', type: 'number', required: true, min: 0, max: 27 },
                        { id: 'monBaselineCSSRS', label: 'C-SSRS قبل البدء', type: 'number', required: true, min: 0, max: 6 },
                        { id: 'monBaselineNotes', label: 'ملاحظات البداية', type: 'textarea', required: false }
                    ]
                },
                {
                    title: 'خطة المراقبة الأسبوعية',
                    icon: 'fa-calendar-week',
                    fields: [
                        { id: 'monWeek1', label: 'الأسبوع 1 — ملاحظات', type: 'textarea', required: false },
                        { id: 'monWeek2', label: 'الأسبوع 2 — ملاحظات', type: 'textarea', required: false },
                        { id: 'monWeek3', label: 'الأسبوع 3 — ملاحظات', type: 'textarea', required: false },
                        { id: 'monWeek4', label: 'الأسبوع 4 — ملاحظات', type: 'textarea', required: false }
                    ]
                },
                {
                    title: 'الأعراض الجانبية',
                    icon: 'fa-exclamation-triangle',
                    fields: [
                        { id: 'monSideEffects', label: 'الأعراض الجانبية المُلاحظة', type: 'textarea', required: false },
                        { id: 'monRiskAlert', label: 'تنبيه: زيادة أفكار انتحارية؟', type: 'checkbox', required: false }
                    ]
                }
            ]
        },

        // ============ PRE-ECT ============
        ectPre: {
            sections: [
                {
                    title: 'دواعي الإجراء',
                    icon: 'fa-bolt',
                    fields: [
                        { id: 'ectIndication', label: 'دواعي ECT / rTMS', type: 'textarea', required: true },
                        { id: 'ectPriorTreatments', label: 'العلاجات السابقة', type: 'textarea', required: true, placeholder: 'ما فشل من أدوية/علاجات؟' }
                    ]
                },
                {
                    title: 'الفحوصات الطبية',
                    icon: 'fa-heart-pulse',
                    fields: [
                        { id: 'ectECG', label: 'ECG', type: 'select', required: true, options: ['طبيعي', 'غير طبيعي — يحتاج متابعة'] },
                        { id: 'ectLabResults', label: 'الفحوصات المخبرية', type: 'textarea', required: false },
                        { id: 'ectBloodPressure', label: 'ضغط الدم', type: 'text', required: true }
                    ]
                },
                {
                    title: 'تقييم التخدير',
                    icon: 'fa-syringe',
                    fields: [
                        { id: 'ectMallampati', label: 'Mallampati', type: 'select', required: true, options: ['1', '2', '3', '4'] },
                        { id: 'ectAllergies', label: 'الحساسية', type: 'textarea', required: false },
                        { id: 'ectWeight', label: 'الوزن (كغ)', type: 'number', required: true },
                        { id: 'ectClearance', label: 'لائق للتخدير', type: 'checkbox', required: true }
                    ]
                }
            ]
        },

        // ============ SECOND OPINION ============
        secondOpinion: {
            sections: [
                {
                    title: 'سبب طلب الرأي الثاني',
                    icon: 'fa-question',
                    fields: [
                        { id: 'soReason', label: 'سبب الطلب', type: 'textarea', required: true },
                        { id: 'soRequestedBy', label: 'الطالب', type: 'text', required: true },
                        { id: 'soQuestions', label: 'الأسئلة المحددة', type: 'textarea', required: true }
                    ]
                },
                {
                    title: 'مراجعة الخطة',
                    icon: 'fa-clipboard-list',
                    fields: [
                        { id: 'soCurrentDiagnosis', label: 'التشخيص الحالي', type: 'text', required: true },
                        { id: 'soCurrentMeds', label: 'الأدوية الحالية', type: 'textarea', required: true },
                        { id: 'soResponse', label: 'الاستجابة للعلاج', type: 'select', required: true, options: ['كاملة', 'جزئية', 'لا استجابة'] }
                    ]
                },
                {
                    title: 'التوصية',
                    icon: 'fa-lightbulb',
                    fields: [
                        { id: 'soRecommendation', label: 'التوصية', type: 'select', required: true, options: ['الموافقة على الخطة', 'تعديل الخطة', 'اقتراح بديل'] },
                        { id: 'soJustification', label: 'التبرير', type: 'textarea', required: true }
                    ]
                }
            ]
        },

        // ============ NPP ============
        npp: {
            sections: [
                {
                    title: 'إقرار استلام الإشعار',
                    icon: 'fa-shield-heart',
                    fields: [
                        { id: 'nppReceived', label: 'المريض استلم الإشعار', type: 'checkbox', required: true },
                        { id: 'nppDate', label: 'تاريخ الاستلام', type: 'date', required: true }
                    ]
                },
                {
                    title: 'الجهة المسؤولة عن الخصوصية',
                    icon: 'fa-address-card',
                    fields: [
                        { id: 'nppOfficer', label: 'مسؤول الخصوصية', type: 'text', required: true },
                        { id: 'nppContact', label: 'بيانات الاتصال', type: 'text', required: true }
                    ]
                },
                {
                    title: 'ملاحظات',
                    icon: 'fa-note-sticky',
                    fields: [
                        { id: 'nppNotes', label: 'ملاحظات إضافية', type: 'textarea', required: false }
                    ]
                }
            ]
        }
    };

    /* ============================================================
       REPORTS STATE
    ============================================================ */
    var reports = S.get(storageKey, []);
    var curFilter = 'all', curSearch = '', curSort = 'newest', curPatientFilter = '', curPreview = null, curTplGroup = 'clinical';

    /* ============================================================
       WIZARD STATE — يحتوي الآن formData لكل حقل يدخله الطبيب
    ============================================================ */
    var wiz = {
        step: 1,
        type: '',
        title: '',
        patient: '',
        patientDob: '',
        patientGender: '',
        docDate: today(),
        formData: {},   // ← كل حقل يدخله الطبيب
        notes: ''
    };

    /* ============================================================
       THEME
    ============================================================ */
    function initTheme() { var t = S.get('theme', 'light'); document.documentElement.setAttribute('data-theme', t); }
    function toggleTheme() { var cur = document.documentElement.getAttribute('data-theme') || 'light'; var next = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); S.set('theme', next); return next; }

    /* ============================================================
       RENDER TEMPLATES
    ============================================================ */
    function renderTemplates() {
        var grid = document.getElementById('templatesGrid'); if (!grid) return; grid.innerHTML = '';
        Object.keys(TYPES).forEach(function (key) {
            var t = TYPES[key]; if (t.group !== curTplGroup) return;
            var card = document.createElement('div'); card.className = 'tpl-card ' + t.cls;
            card.innerHTML = '<div class="tpl-icon"><i class="fa-solid ' + t.icon + '"></i></div><h3 class="tpl-name">' + esc(t.label) + '</h3><p class="tpl-desc">انقر لفتح النموذج وإدخال البيانات يدوياً</p><div class="tpl-footer"><span>فتح النموذج</span><i class="fa-solid fa-arrow-left"></i></div>';
            card.addEventListener('click', function () { openWizard(key); }); grid.appendChild(card);
        });
    }

    /* ============================================================
       PATIENT FILTER
    ============================================================ */
    function updatePatientFilter() {
        var sel = document.getElementById('patientFilter'); if (!sel) return;
        var current = sel.value; var patients = {};
        reports.forEach(function (r) { if (r.patientName && !r.deleted) patients[r.patientName] = (patients[r.patientName] || 0) + 1; });
        var sorted = Object.keys(patients).sort(function (a, b) { return a.localeCompare(b, 'ar'); });
        sel.innerHTML = '<option value="">كل المرضى (' + reports.filter(function (r) { return !r.deleted; }).length + ')</option>';
        sorted.forEach(function (name) { var opt = document.createElement('option'); opt.value = name; opt.textContent = name + ' (' + patients[name] + ')'; sel.appendChild(opt); });
        if (sorted.indexOf(current) !== -1) sel.value = current;
    }

    /* ============================================================
       FILTER & RENDER REPORTS
    ============================================================ */
    function getFiltered() {
        var list = reports.slice();
        if (curFilter === 'favorite') list = list.filter(function (r) { return r.favorite && !r.deleted; });
        else if (curFilter === 'deleted') list = list.filter(function (r) { return r.deleted; });
        else if (curFilter === 'legal') list = list.filter(function (r) { return !r.deleted && TYPES[r.type] && TYPES[r.type].group === 'legal'; });
        else if (curFilter !== 'all') list = list.filter(function (r) { return r.type === curFilter && !r.deleted; });
        else list = list.filter(function (r) { return !r.deleted; });
        if (curPatientFilter) list = list.filter(function (r) { return (r.patientName || '').trim() === curPatientFilter.trim(); });
        if (curSearch) { var q = curSearch.toLowerCase().trim(); list = list.filter(function (r) { return (r.title || '').toLowerCase().indexOf(q) !== -1 || (r.patientName || '').toLowerCase().indexOf(q) !== -1 || (r.typeLabel || '').toLowerCase().indexOf(q) !== -1; }); }
        if (curSort === 'oldest') list.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        else if (curSort === 'name') list.sort(function (a, b) { return (a.title || '').localeCompare(b.title || '', 'ar'); });
        else if (curSort === 'patient') list.sort(function (a, b) { return (a.patientName || '').localeCompare(b.patientName || '', 'ar'); });
        else list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        return list;
    }

    function render() {
        updateCounts(); updatePatientFilter();
        var list = getFiltered(); var grid = document.getElementById('reportsGrid'); var sub = document.getElementById('reportsSubtitle');
        if (sub) sub.textContent = list.length + ' تقرير'; if (!grid) return;
        if (list.length === 0) { grid.innerHTML = '<div class="empty-box"><div class="empty-box-icon"><i class="fa-solid fa-file-circle-plus"></i></div><h3>' + (reports.length === 0 ? 'لا توجد تقارير بعد' : 'لا توجد نتائج مطابقة') + '</h3><p>' + (reports.length === 0 ? 'ابدأ بتوليد تقرير جديد من القوالب أعلاه' : 'جرب تغيير الفلاتر أو كلمة البحث') + '</p></div>'; return; }
        grid.innerHTML = '';
        list.forEach(function (r) {
            var cfg = TYPES[r.type] || TYPES.custom;
            var actionsHTML = r.deleted
                ? '<button class="rpt-btn b-restore" data-action="restore" data-id="' + r.id + '" title="استعادة"><i class="fa-solid fa-rotate-left"></i></button>'
                : '<button class="rpt-btn b-view" data-action="view" data-id="' + r.id + '" title="عرض"><i class="fa-solid fa-eye"></i></button>' +
                '<button class="rpt-btn b-pdf" data-action="pdf" data-id="' + r.id + '" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>' +
                '<button class="rpt-btn b-html" data-action="html" data-id="' + r.id + '" title="HTML"><i class="fa-solid fa-download"></i></button>' +
                '<button class="rpt-btn b-print" data-action="print" data-id="' + r.id + '" title="طباعة"><i class="fa-solid fa-print"></i></button>' +
                '<button class="rpt-btn b-fav ' + (r.favorite ? 'is-on' : '') + '" data-action="fav" data-id="' + r.id + '" title="مفضلة"><i class="fa-solid fa-star"></i></button>';
            var patientBadge = r.patientName ? '<div class="rpt-patient-badge"><div class="rpt-patient-badge-icon"><i class="fa-solid fa-user"></i></div><span class="rpt-patient-badge-label">المريض:</span><span class="rpt-patient-badge-name">' + esc(r.patientName) + '</span></div>' : '';
            var legalBadge = (cfg.group === 'legal') ? '<span class="rpt-tag" style="background:#fef3c7;color:#92400e;border-color:#fde68a;"><i class="fa-solid fa-scale-balanced"></i> وثيقة قانونية</span>' : '';
            var card = document.createElement('div'); card.className = 'rpt-card ' + cfg.cls + (r.favorite ? ' is-favorite' : '');
            card.innerHTML = patientBadge + '<div class="rpt-head"><div class="rpt-icon"><i class="fa-solid ' + cfg.icon + '"></i></div><div class="rpt-info"><h4 class="rpt-title">' + esc(r.title) + '</h4><div class="rpt-meta"><span class="rpt-meta-item"><i class="fa-solid fa-calendar"></i> ' + esc(fDate(r.createdAt)) + '</span><span class="rpt-meta-item"><i class="fa-solid fa-tag"></i> ' + esc(r.typeLabel) + '</span>' + (isToday(r.createdAt) ? '<span class="rpt-badge-new"><i class="fa-solid fa-circle" style="font-size: 6px;"></i> جديد</span>' : '') + '</div></div></div><div class="rpt-preview"><i class="fa-solid fa-file-lines"></i> <span>' + esc(r.preview || 'انقر للعرض') + '</span></div>' + (legalBadge ? '<div class="rpt-tags">' + legalBadge + '</div>' : '') + '<div class="rpt-actions">' + actionsHTML + '<button class="rpt-btn b-del" data-action="del" data-id="' + r.id + '" title="حذف"><i class="fa-solid fa-trash"></i></button></div>';
            card.addEventListener('click', function () { openPreview(r.id); }); grid.appendChild(card);
        });
        grid.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation(); var id = btn.dataset.id; var act = btn.dataset.action; var r = null;
                for (var i = 0; i < reports.length; i++) { if (reports[i].id === id) { r = reports[i]; break; } } if (!r) return;
                if (act === 'view') openPreview(id); else if (act === 'pdf') exportPDF(r); else if (act === 'html') downloadHTML(r); else if (act === 'print') printReport(r); else if (act === 'fav') toggleFav(id); else if (act === 'del') askDelete(id, r.deleted); else if (act === 'restore') restoreReport(id);
            });
        });
    }

    function updateCounts() {
        var active = reports.filter(function (r) { return !r.deleted; });
        function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
        setText('tcAll', active.length); setText('tcMedical', active.filter(function (r) { return r.type === 'medical'; }).length); setText('tcPsych', active.filter(function (r) { return r.type === 'psych'; }).length);
        setText('tcLegal', active.filter(function (r) { return TYPES[r.type] && TYPES[r.type].group === 'legal'; }).length);
        setText('tcFav', active.filter(function (r) { return r.favorite; }).length); setText('tcDel', reports.filter(function (r) { return r.deleted; }).length);
        setText('stTotal', active.length); setText('stFav', active.filter(function (r) { return r.favorite; }).length); setText('stToday', active.filter(function (r) { return isToday(r.createdAt); }).length);
        setText('stLegal', active.filter(function (r) { return TYPES[r.type] && TYPES[r.type].group === 'legal'; }).length);
    }

    /* ============================================================
       WIZARD — OPEN / CLOSE
    ============================================================ */
    function openWizard(preset) {
        var modal = document.getElementById('wizardModal'); if (!modal) return;
        wiz = { step: 1, type: preset || 'consent', title: '', patient: '', patientDob: '', patientGender: '', docDate: today(), formData: {}, notes: '' };

        // املأ الحقول من بيانات المريض الحالية إن وجدت
        var cachedPatient = S.get('patientData', null);
        if (cachedPatient && cachedPatient.firstName) {
            wiz.patient = (cachedPatient.firstName || '') + ' ' + (cachedPatient.lastName || '');
            wiz.patientDob = cachedPatient.dateOfBirth || '';
            wiz.patientGender = cachedPatient.gender || '';
        }

        document.getElementById('wizPatient').value = wiz.patient;
        document.getElementById('wizPatientDob').value = wiz.patientDob;
        document.getElementById('wizPatientGender').value = wiz.patientGender;
        document.getElementById('wizType').value = wiz.type;
        document.getElementById('wizTitle').value = '';
        document.getElementById('wizDate').value = wiz.docDate;

        document.getElementById('wizModalTitle').textContent = TYPES[wiz.type] ? TYPES[wiz.type].label : 'تقرير جديد';
        document.getElementById('wizModalSubtitle').textContent = 'أدخل كل البيانات يدوياً — لن يتم تخمين أي حقل';

        wiz.step = 1;
        renderWizardStep();
        modal.classList.add('is-open');
    }

    function closeWizard() { var m = document.getElementById('wizardModal'); if (m) m.classList.remove('is-open'); }

    function renderWizardStep() {
        var s = wiz.step;
        document.querySelectorAll('.step').forEach(function (el) { var n = parseInt(el.dataset.step); el.classList.toggle('is-active', n === s); el.classList.toggle('is-done', n < s); });
        document.querySelectorAll('.step-panel').forEach(function (el) { el.classList.toggle('is-active', parseInt(el.dataset.panel) === s); });
        var prev = document.getElementById('wizPrev'); var next = document.getElementById('wizNext'); var save = document.getElementById('wizSave');
        prev.style.display = s > 1 ? 'inline-flex' : 'none'; next.style.display = s < 3 ? 'inline-flex' : 'none'; save.style.display = s === 3 ? 'inline-flex' : 'none';
        if (s === 2) renderDynamicFields();
        if (s === 3) buildPreview();
    }

    /* ============================================================
       RENDER DYNAMIC FIELDS — حسب النوع
    ============================================================ */
    function renderDynamicFields() {
        var container = document.getElementById('wizDynamicFields'); if (!container) return;
        container.innerHTML = '';

        var schema = FIELD_SCHEMAS[wiz.type];
        if (!schema) {
            container.innerHTML = '<div class="wiz-empty"><i class="fa-solid fa-info-circle"></i><p>هذا النوع من التقارير لا يحتوي على حقول إضافية — سيتم توليده من بيانات المريض الأساسية.</p></div>';
            return;
        }

        schema.sections.forEach(function (section) {
            var sec = document.createElement('div');
            sec.className = 'wiz-section';
            var html = '<div class="wiz-section-title"><i class="fa-solid ' + (section.icon || 'fa-list') + '"></i>' + esc(section.title) + '</div>';

            section.fields.forEach(function (field) {
                var val = wiz.formData[field.id];
                if (val === undefined) val = field.type === 'checkbox' ? false : '';

                html += '<div class="wiz-field">';
                if (field.type !== 'checkbox') {
                    html += '<label for="fld_' + field.id + '">' +
                        '<i class="fa-solid ' + iconForType(field.type) + '"></i> ' +
                        esc(field.label) +
                        (field.required ? ' <span class="req">*</span>' : '') +
                        '</label>';
                }

                if (field.type === 'text' || field.type === 'number' || field.type === 'date') {
                    html += '<input type="' + field.type + '" id="fld_' + field.id + '" data-field-id="' + field.id + '" ' +
                        'value="' + esc(val) + '"' +
                        (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') +
                        (field.min !== undefined ? ' min="' + field.min + '"' : '') +
                        (field.max !== undefined ? ' max="' + field.max + '"' : '') + '>';
                } else if (field.type === 'textarea') {
                    html += '<textarea id="fld_' + field.id + '" data-field-id="' + field.id + '" ' +
                        (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') + '>' + esc(val) + '</textarea>';
                } else if (field.type === 'select') {
                    html += '<select id="fld_' + field.id + '" data-field-id="' + field.id + '">';
                    html += '<option value="">— اختر —</option>';
                    (field.options || []).forEach(function (opt) {
                        html += '<option value="' + esc(opt) + '"' + (val === opt ? ' selected' : '') + '>' + esc(opt) + '</option>';
                    });
                    html += '</select>';
                } else if (field.type === 'checkbox') {
                    var checked = val ? 'checked' : '';
                    html += '<label class="wiz-checkbox' + (val ? ' checked' : '') + '">' +
                        '<input type="checkbox" id="fld_' + field.id + '" data-field-id="' + field.id + '" ' + checked + '>' +
                        '<span>' + esc(field.label) + (field.required ? ' <span class="req">*</span>' : '') + '</span></label>';
                }

                if (field.required && field.type !== 'checkbox') {
                    // لا helper افتراضي
                }
                html += '</div>';
            });

            sec.innerHTML = html;
            container.appendChild(sec);
        });

        // ربط event listeners
        container.querySelectorAll('[data-field-id]').forEach(function (el) {
            var fieldId = el.dataset.fieldId;
            var evt = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') ? 'change' : 'input';
            el.addEventListener(evt, function () {
                if (el.type === 'checkbox') {
                    wiz.formData[fieldId] = el.checked;
                    el.closest('.wiz-checkbox').classList.toggle('checked', el.checked);
                } else {
                    wiz.formData[fieldId] = el.value;
                }
            });
        });
    }

    function iconForType(t) {
        if (t === 'date') return 'fa-calendar';
        if (t === 'number') return 'fa-hashtag';
        if (t === 'textarea') return 'fa-align-right';
        if (t === 'select') return 'fa-list';
        return 'fa-keyboard';
    }

    /* ============================================================
       BUILD PREVIEW — من البيانات التي أدخلها الطبيب
    ============================================================ */
    function buildPreview() {
        var el = document.getElementById('wizPreview'); if (!el) return;
        el.innerHTML = buildReportHTML({
            type: wiz.type,
            title: wiz.title || (TYPES[wiz.type] ? TYPES[wiz.type].label : 'تقرير'),
            patientName: wiz.patient,
            patientDob: wiz.patientDob,
            patientGender: wiz.patientGender,
            docDate: wiz.docDate,
            formData: wiz.formData,
            notes: wiz.notes
        }, true);
    }

    /* ============================================================
       BUILD REPORT HTML — يعتمد على formData
    ============================================================ */
    function buildReportHTML(cfg, mini) {
        var type = cfg.type;
        var title = cfg.title;
        var patient = cfg.patientName;
        var dob = cfg.patientDob;
        var gender = cfg.patientGender;
        var docDate = cfg.docDate || today();
        var formData = cfg.formData || {};
        var legal = isLegalType(type);
        var out = [];

        if (!mini) {
            out.push('<div class="rep-head"><div class="rep-logo"><i class="fa-solid ' + (legal ? 'fa-scale-balanced' : 'fa-heart-pulse') + '"></i></div><div><h1>' + esc(title) + '</h1><p>نظام بالنسي — ' + esc((TYPES[type] && TYPES[type].label) || '') + '</p></div></div>');
            if (legal) out.push(legalBannerHTML());
            if (patient) {
                out.push('<div class="rep-patient-hero"><div class="rep-patient-hero-icon"><i class="fa-solid fa-user"></i></div><div><div class="rep-patient-hero-label">اسم المريض</div><div class="rep-patient-hero-name">' + esc(patient) + '</div></div></div>');
            }
            out.push(
                '<div class="rep-meta">' +
                '<div class="rep-meta-item"><span class="rep-meta-label">تاريخ الوثيقة</span><span class="rep-meta-value">' + esc(fDate(docDate)) + '</span></div>' +
                (dob ? '<div class="rep-meta-item"><span class="rep-meta-label">تاريخ الميلاد</span><span class="rep-meta-value">' + esc(fDate(dob)) + ' (' + esc(calcAge(dob)) + ')</span></div>' : '') +
                (gender ? '<div class="rep-meta-item"><span class="rep-meta-label">الجنس</span><span class="rep-meta-value">' + (gender === 'male' ? 'ذكر' : 'أنثى') + '</span></div>' : '') +
                '<div class="rep-meta-item"><span class="rep-meta-label">نوع الوثيقة</span><span class="rep-meta-value">' + esc((TYPES[type] && TYPES[type].label) || '') + '</span></div>' +
                '</div>'
            );
        } else {
            out.push('<h1 style="color: var(--c-primary); border-bottom: 2px solid var(--c-primary); padding-bottom: 10px; margin-bottom: 16px; font-size: 19px;"><i class="fa-solid ' + (legal ? 'fa-scale-balanced' : 'fa-file-lines') + '"></i> ' + esc(title) + '</h1>' +
                (patient ? '<div style="background: var(--c-primary-soft); padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; font-weight: 700; color: var(--c-primary-dark);"><i class="fa-solid fa-user"></i> المريض: ' + esc(patient) + '</div>' : '') +
                '<div style="font-size: 12px; color: var(--c-text-3); margin-bottom: 14px;"><strong>التاريخ:</strong> ' + esc(fDate(docDate)) + '</div>');
        }

        // ═══ اطبع الحقول التي أدخلها الطبيب ═══
        var schema = FIELD_SCHEMAS[type];
        if (schema) {
            schema.sections.forEach(function (section) {
                out.push('<h2><i class="fa-solid ' + (section.icon || 'fa-list') + '"></i> ' + esc(section.title) + '</h2>');
                var anyField = false;
                section.fields.forEach(function (field) {
                    var val = formData[field.id];
                    if (val === undefined || val === '' || val === null || val === false) return;
                    anyField = true;

                    if (field.type === 'checkbox') {
                        out.push('<div class="item"><i class="fa-solid fa-check-circle" style="color:#16a34a;"></i> ' + esc(field.label) + '</div>');
                    } else {
                        var valStr = field.type === 'date' ? fDate(val) : String(val);
                        out.push('<div class="item"><strong>' + esc(field.label) + ':</strong> ' + esc(valStr) + '</div>');
                    }
                });
                if (!anyField) {
                    out.push('<div class="item" style="opacity:0.5; font-style:italic;">— لم يتم إدخال بيانات في هذا القسم —</div>');
                }
            });
        }

        // ملاحظات إضافية
        if (cfg.notes) {
            out.push('<h2><i class="fa-solid fa-note-sticky"></i> ملاحظات إضافية</h2><div class="item">' + esc(cfg.notes) + '</div>');
        }

        // التوقيعات
        if (!mini) {
            if (legal) {
                out.push(signaturesBlockHTML(patient));
            } else {
                out.push('<div class="rep-signature"><div class="rep-signature-block"><div class="rep-signature-line"></div><div class="rep-signature-label">توقيع الطبيب المعالج</div><div class="rep-signature-name">د. _________________</div></div><div class="rep-signature-block"><div class="rep-signature-line"></div><div class="rep-signature-label">ختم العيادة</div><div class="rep-signature-name">Balancy Clinic</div></div></div>');
            }
            out.push('<div class="rep-disclaimer"><i class="fa-solid fa-shield-heart"></i> ' + (legal ? 'هذه وثيقة قانونية صادرة عن نظام بالنسي. صحة محتواها تعتمد على دقة المعلومات التي أدخلها الطبيب.' : 'هذا التقرير صادر عن نظام بالنسي.') + ' — التاريخ: ' + fDateTime(new Date().toISOString()) + '</div>');
        }

        return out.join('');
    }

    function isLegalType(type) { return TYPES[type] && TYPES[type].group === 'legal'; }

    function legalBannerHTML() {
        return '<div class="rep-legal-banner"><div class="rep-legal-banner-icon"><i class="fa-solid fa-scale-balanced"></i></div><div class="rep-legal-banner-body"><h4 class="rep-legal-banner-title">وثيقة قانونية / إدارية</h4><p class="rep-legal-banner-desc">هذه الوثيقة تُحفظ في السجل الطبي للمريض. جميع البيانات الواردة فيها أدخلها الطبيب يدوياً.</p></div></div>';
    }

    function signaturesBlockHTML(patientName) {
        return '<div class="rep-legal-signatures"><div class="rep-sig-block"><div class="rep-sig-block-label">توقيع الطبيب المعالج</div><div class="rep-sig-block-line"></div><div class="rep-sig-block-name">د. ____________________</div><div class="rep-sig-block-meta">التاريخ: ' + fDate(new Date().toISOString()) + '</div></div><div class="rep-sig-block"><div class="rep-sig-block-label">توقيع المريض</div><div class="rep-sig-block-line"></div><div class="rep-sig-block-name">' + esc(patientName || '_______________') + '</div><div class="rep-sig-block-meta">التاريخ: ' + fDate(new Date().toISOString()) + '</div></div></div><div class="rep-witness-row"><div class="rep-witness-block"><div class="rep-witness-line"></div>شاهد 1 (الاسم والتوقيع)</div><div class="rep-witness-block"><div class="rep-witness-line"></div>شاهد 2 (الاسم والتوقيع)</div></div>';
    }

    /* ============================================================
       SAVE REPORT — إلى localStorage بهيكل DB-ready
       عند تطوير الـ Backend: استبدل localStorage.set بـ POST API
    ============================================================ */
    function saveReport() {
        // التحقق من الحقول المطلوبة
        var patientName = (wiz.patient || '').trim();
        if (!patientName) { toast('error', 'حقل مطلوب', 'يرجى إدخال اسم المريض'); wiz.step = 1; renderWizardStep(); return; }
        var title = (wiz.title || '').trim();
        if (!title) { toast('error', 'حقل مطلوب', 'يرجى إدخال عنوان الوثيقة'); wiz.step = 1; renderWizardStep(); return; }

        // التحقق من الحقول المطلوبة في النموذج الديناميكي
        var schema = FIELD_SCHEMAS[wiz.type];
        if (schema) {
            var missing = [];
            schema.sections.forEach(function (section) {
                section.fields.forEach(function (field) {
                    if (field.required) {
                        var v = wiz.formData[field.id];
                        if (v === undefined || v === '' || v === null || v === false) {
                            missing.push(field.label);
                        }
                    }
                });
            });
            if (missing.length > 0) {
                toast('error', 'حقول مطلوبة', 'يرجى تعبئة: ' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? '...' : ''));
                wiz.step = 2; renderWizardStep(); return;
            }
        }

        var typeLabel = (TYPES[wiz.type] && TYPES[wiz.type].label) || 'تقرير';
        var legal = isLegalType(wiz.type);

        // ═══ هيكل DB-ready — نفس أسماء الأعمدة المتوقعة في SQL ═══
        var report = {
            id: 'rp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            patientId: patientId,
            reportType: wiz.type,               // ReportType (nvarchar)
            reportTitle: title,                  // ReportTitle
            patientName: patientName,            // PatientName (snapshot)
            patientDob: wiz.patientDob || null,  // PatientDob (snapshot)
            patientGender: wiz.patientGender || null,
            documentDate: wiz.docDate || today(),
            formData: JSON.parse(JSON.stringify(wiz.formData)), // FormData (JSON)
            notes: wiz.notes || '',
            isLegal: legal,                      // IsSensitive
            status: 'Draft',                     // Status (Draft / Signed / Archived)
            favorite: false,
            deleted: false,
            createdAt: new Date().toISOString(), // CreatedAt
            updatedAt: new Date().toISOString(),
            createdByUserId: null,               // CreatedByUserId (يُملأ لاحقاً من السيرفر)
            signedByDoctorId: null,
            signedAt: null,
            patientSignedAt: null,
            expiresAt: null,
            // Preview text (للعرض فقط — يمكن توليده من formData)
            preview: typeLabel + ' — ' + Object.keys(wiz.formData).length + ' حقل مُدخل'
        };

        reports.push(report);

        // ═══ محاكاة DB: حفظ في localStorage ═══
        S.set(storageKey, reports);

        closeWizard();
        render();
        toast('success', '✅ تم الحفظ', 'تم حفظ الوثيقة "' + title + '" — البيانات محفوظة محلياً في انتظار ربط قاعدة البيانات', 4500);
        setTimeout(function () { openPreview(report.id); }, 400);
    }

    /* ============================================================
       PREVIEW & EXPORT (لا تغيير جوهري)
    ============================================================ */
    function openPreview(id) {
        var r = null; for (var i = 0; i < reports.length; i++) { if (reports[i].id === id) { r = reports[i]; break; } } if (!r) return; curPreview = r;
        document.getElementById('previewTitle').textContent = r.reportTitle || r.title;
        document.getElementById('previewSubtitle').textContent = (r.patientName ? 'المريض: ' + r.patientName + ' • ' : '') + (r.typeLabel || (TYPES[r.reportType] && TYPES[r.reportType].label)) + ' • ' + fDate(r.createdAt);
        document.getElementById('printableContainer').innerHTML = buildReportHTML({
            type: r.reportType || r.type,
            title: r.reportTitle || r.title,
            patientName: r.patientName,
            patientDob: r.patientDob,
            patientGender: r.patientGender,
            docDate: r.documentDate || r.createdAt,
            formData: r.formData || {},
            notes: r.notes || ''
        }, false);
        document.getElementById('previewModal').classList.add('is-open');
    }

    function closePreview() { document.getElementById('previewModal').classList.remove('is-open'); curPreview = null; }

    function printReport(r) { openPreview(r.id); setTimeout(function () { window.print(); }, 400); }
    function toggleFav(id) { var r = null; for (var i = 0; i < reports.length; i++) { if (reports[i].id === id) { r = reports[i]; break; } } if (!r) return; r.favorite = !r.favorite; S.set(storageKey, reports); render(); toast('success', r.favorite ? 'أضيف للمفضلة' : 'أزيل من المفضلة', r.reportTitle || r.title); }
    function restoreReport(id) { var r = null; for (var i = 0; i < reports.length; i++) { if (reports[i].id === id) { r = reports[i]; break; } } if (!r) return; r.deleted = false; S.set(storageKey, reports); render(); toast('success', 'تم الاستعادة', r.reportTitle || r.title); }

    function askDelete(id, isPerm) {
        var r = null; for (var i = 0; i < reports.length; i++) { if (reports[i].id === id) { r = reports[i]; break; } } if (!r) return;
        var modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = isPerm ? 'حذف نهائي' : 'تأكيد الحذف';
        document.getElementById('confirmSub').textContent = isPerm ? 'لا يمكن التراجع' : 'سيتم نقلها لسلة المحذوفات';
        document.getElementById('confirmMsg').innerHTML = 'هل أنت متأكد من حذف <strong>' + esc(r.reportTitle || r.title) + '</strong>؟';
        modal.classList.add('is-open');
        function cleanup() { modal.classList.remove('is-open'); document.getElementById('confirmOk').removeEventListener('click', onOk); document.getElementById('confirmCancel').removeEventListener('click', onCancel); }
        function onOk() { cleanup(); if (isPerm) { reports = reports.filter(function (x) { return x.id !== id; }); toast('success', 'تم الحذف نهائياً', r.reportTitle || r.title); } else { r.deleted = true; r.deletedAt = new Date().toISOString(); toast('warning', 'تم النقل للسلة', r.reportTitle || r.title); } S.set(storageKey, reports); render(); }
        function onCancel() { cleanup(); }
        document.getElementById('confirmOk').addEventListener('click', onOk); document.getElementById('confirmCancel').addEventListener('click', onCancel);
    }

    function exportPDF(r) {
        if (!r) return;
        if (typeof html2canvas === 'undefined' || !window.jspdf) { toast('error', 'خطأ', 'مكتبات PDF غير محملة'); return; }
        var loading = document.getElementById('loadingEl'); if (loading) loading.classList.add('is-visible');
        var html = buildReportHTML({ type: r.reportType || r.type, title: r.reportTitle || r.title, patientName: r.patientName, patientDob: r.patientDob, patientGender: r.patientGender, docDate: r.documentDate || r.createdAt, formData: r.formData || {}, notes: r.notes || '' }, false);
        var A4 = 794;
        var wrap = document.createElement('div'); wrap.setAttribute('dir', 'rtl');
        wrap.style.cssText = 'position:fixed;top:0;left:0;width:' + A4 + 'px;padding:40px 45px;background:#ffffff;color:#0f172a;font-family:"Tajawal",Tahoma,Arial,sans-serif;font-size:14px;line-height:1.9;box-sizing:border-box;z-index:2147483647;direction:rtl;';
        wrap.innerHTML = '<style>#__pdf,#__pdf *{box-sizing:border-box;font-family:"Tajawal",Tahoma,Arial,sans-serif;letter-spacing:0!important;}#__pdf .rep-head{display:flex;align-items:center;gap:16px;padding-bottom:16px;margin-bottom:20px;border-bottom:3px solid #0891b2;}#__pdf .rep-logo{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#0891b2,#0d9488);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;}#__pdf .rep-head h1{margin:0;font-size:20px;font-weight:800;color:#0e7490;}#__pdf .rep-head p{margin:3px 0 0;font-size:12px;color:#64748b;}#__pdf .rep-patient-hero{background:#ecfeff;border:1px solid #cffafe;border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px;}#__pdf .rep-patient-hero-icon{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#0d9488);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;}#__pdf .rep-patient-hero-label{font-size:11px;font-weight:800;color:#0e7490;text-transform:uppercase;margin:0 0 3px;}#__pdf .rep-patient-hero-name{font-size:17px;font-weight:800;color:#0f172a;margin:0;}#__pdf .rep-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;background:#f8fafc;border-radius:12px;margin-bottom:20px;}#__pdf .rep-meta-item{display:flex;flex-direction:column;gap:2px;}#__pdf .rep-meta-label{font-size:10px;font-weight:800;color:#0e7490;}#__pdf .rep-meta-value{font-size:13px;font-weight:700;color:#0f172a;}#__pdf h2{font-size:15px;font-weight:800;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px dashed #cbd5e1;color:#0f172a;}#__pdf h2 i{color:#0891b2;}#__pdf .item{padding:10px 14px;background:#f8fafc;border-radius:8px;border-right:3px solid #0891b2;margin-bottom:8px;font-size:13px;}#__pdf .item strong{color:#0e7490;}#__pdf .rep-legal-banner{display:flex;gap:14px;padding:16px 22px;border-radius:12px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #d97706;margin-bottom:22px;color:#78350f;}#__pdf .rep-legal-banner-icon{width:46px;height:46px;min-width:46px;border-radius:50%;background:rgba(255,255,255,0.55);display:flex;align-items:center;justify-content:center;font-size:20px;}#__pdf .rep-legal-banner-title{font-size:15px;font-weight:900;margin:0 0 4px;}#__pdf .rep-legal-banner-desc{font-size:12px;margin:0;font-weight:600;line-height:1.6;}#__pdf .rep-legal-signatures{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:30px;padding:24px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;}#__pdf .rep-sig-block{display:flex;flex-direction:column;gap:8px;padding:14px 16px;background:white;border:1px solid #e2e8f0;border-radius:10px;}#__pdf .rep-sig-block-label{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;}#__pdf .rep-sig-block-line{height:42px;border-bottom:1.5px dashed #94a3b8;margin-bottom:6px;}#__pdf .rep-sig-block-name{font-size:13px;font-weight:800;color:#0f172a;}#__pdf .rep-sig-block-meta{font-size:11px;color:#64748b;font-weight:600;}#__pdf .rep-witness-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding-top:18px;border-top:2px dashed #cbd5e1;}#__pdf .rep-witness-block{text-align:center;font-size:12px;color:#64748b;font-weight:700;}#__pdf .rep-witness-line{height:38px;border-bottom:1.5px dashed #94a3b8;margin-bottom:6px;}#__pdf .rep-signature{display:flex;justify-content:space-between;gap:40px;margin-top:40px;padding:20px 40px;border-top:2px dashed #cbd5e1;}#__pdf .rep-signature-block{flex:1;text-align:center;}#__pdf .rep-signature-line{height:40px;border-bottom:1.5px dashed #94a3b8;margin-bottom:8px;}#__pdf .rep-signature-label{font-size:12px;font-weight:800;color:#64748b;}#__pdf .rep-signature-name{font-size:11px;color:#94a3b8;margin-top:2px;}#__pdf .rep-disclaimer{margin-top:24px;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:11px;color:#78350f;line-height:1.7;text-align:center;font-weight:600;}</style><div id="__pdf">' + html + '</div>';
        document.body.appendChild(wrap);
        var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        ready.then(function () {
            setTimeout(function () {
                var jsPDF = window.jspdf.jsPDF;
                html2canvas(wrap, { scale: 2.5, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false, letterRendering: false, windowWidth: A4, width: A4 }).then(function (canvas) {
                    var data = canvas.toDataURL('image/jpeg', 0.95);
                    var pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                    var pw = pdf.internal.pageSize.getWidth();
                    var ph = pdf.internal.pageSize.getHeight();
                    var iw = pw; var ih = (canvas.height * iw) / canvas.width;
                    var left = ih; var pos = 0;
                    pdf.addImage(data, 'JPEG', 0, pos, iw, ih); left -= ph;
                    while (left > 0) { pos = left - ih; pdf.addPage(); pdf.addImage(data, 'JPEG', 0, pos, iw, ih); left -= ph; }
                    var baseName = r.patientName ? r.patientName + '_' + (r.reportTitle || r.title) : (r.reportTitle || r.title);
                    pdf.save(safeName(baseName) + '.pdf');
                    if (wrap.parentNode) document.body.removeChild(wrap); if (loading) loading.classList.remove('is-visible');
                    toast('success', '✅ تم التحميل', 'تم تحميل الوثيقة بصيغة PDF');
                }).catch(function (err) { console.error(err); if (wrap.parentNode) document.body.removeChild(wrap); if (loading) loading.classList.remove('is-visible'); toast('error', 'فشل التصدير', 'حدث خطأ أثناء توليد PDF'); });
            }, 500);
        });
    }

    function downloadHTML(r) {
        var html = '<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<title>' + esc(r.reportTitle || r.title) + '</title>\n<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">\n<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&family=Cairo:wght@700;800&display=swap" rel="stylesheet">\n<style>body{font-family:Tajawal,sans-serif;padding:2rem;max-width:900px;margin:0 auto;color:#0f172a;line-height:1.8}h1{color:#0e7490;border-bottom:3px solid #0891b2;padding-bottom:.5rem}h2{color:#0f172a;margin-top:1.5rem;border-bottom:2px dashed #cbd5e1;padding-bottom:.4rem;display:flex;align-items:center;gap:10px}h2 i{color:#0891b2}.rep-head{display:flex;align-items:center;gap:1rem;padding-bottom:1rem;margin-bottom:1.5rem;border-bottom:3px solid #0891b2}.rep-logo{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#0891b2,#0d9488);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem}.rep-patient-hero{background:#ecfeff;border:1px solid #cffafe;border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px}.rep-patient-hero-icon{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#0d9488);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px}.rep-patient-hero-label{font-size:11px;font-weight:800;color:#0e7490;text-transform:uppercase;margin:0 0 3px}.rep-patient-hero-name{font-size:17px;font-weight:800;color:#0f172a;margin:0}.rep-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;padding:1rem;background:#f8fafc;border-radius:12px;margin-bottom:1.5rem}.rep-meta-label{font-size:.7rem;font-weight:800;color:#0e7490}.rep-meta-value{font-size:.9rem;font-weight:700}.item{padding:.6rem .85rem;background:#f8fafc;border-radius:8px;border-right:3px solid #0891b2;margin-bottom:.5rem}.item strong{color:#0e7490}.rep-legal-banner{display:flex;gap:14px;padding:16px 22px;border-radius:12px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #d97706;margin-bottom:22px;color:#78350f}.rep-legal-banner-icon{width:46px;height:46px;min-width:46px;border-radius:50%;background:rgba(255,255,255,0.55);display:flex;align-items:center;justify-content:center;font-size:20px}.rep-legal-banner-title{font-size:15px;font-weight:900;margin:0 0 4px}.rep-legal-banner-desc{font-size:12px;margin:0;font-weight:600}.rep-legal-signatures{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:30px;padding:24px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px}.rep-sig-block{display:flex;flex-direction:column;gap:8px;padding:14px 16px;background:white;border:1px solid #e2e8f0;border-radius:10px}.rep-sig-block-label{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase}.rep-sig-block-line{height:42px;border-bottom:1.5px dashed #94a3b8;margin-bottom:6px}.rep-sig-block-name{font-size:13px;font-weight:800;color:#0f172a}.rep-sig-block-meta{font-size:11px;color:#64748b;font-weight:600}.rep-witness-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding-top:18px;border-top:2px dashed #cbd5e1}.rep-witness-block{text-align:center;font-size:12px;color:#64748b;font-weight:700}.rep-witness-line{height:38px;border-bottom:1.5px dashed #94a3b8;margin-bottom:6px}.rep-signature{display:flex;justify-content:space-between;gap:40px;margin-top:40px;padding:20px 40px;border-top:2px dashed #cbd5e1}.rep-signature-block{flex:1;text-align:center}.rep-signature-line{height:40px;border-bottom:1.5px dashed #94a3b8;margin-bottom:8px}.rep-signature-label{font-size:12px;font-weight:800;color:#64748b}.rep-signature-name{font-size:11px;color:#94a3b8;margin-top:2px}.rep-disclaimer{margin-top:24px;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:11px;color:#78350f;line-height:1.7;text-align:center;font-weight:600}</style>\n</head>\n<body>\n' + buildReportHTML({ type: r.reportType || r.type, title: r.reportTitle || r.title, patientName: r.patientName, patientDob: r.patientDob, patientGender: r.patientGender, docDate: r.documentDate || r.createdAt, formData: r.formData || {}, notes: r.notes || '' }, false) + '\n</body>\n</html>';
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url;
        a.download = safeName((r.patientName ? r.patientName + '_' : '') + (r.reportTitle || r.title)) + '.html';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        toast('success', 'تم التحميل', 'تم تحميل الوثيقة بصيغة HTML');
    }

    /* ============================================================
       EVENT BINDINGS
    ============================================================ */
    function bindEvents() {
        var fab = document.getElementById('fabBtn'); if (fab) fab.addEventListener('click', function () { openWizard('consent'); });
        var search = document.getElementById('searchInput'); if (search) search.addEventListener('input', function (e) { curSearch = e.target.value.trim(); render(); });
        var patientFilter = document.getElementById('patientFilter'); if (patientFilter) patientFilter.addEventListener('change', function (e) { curPatientFilter = e.target.value; render(); });
        var sort = document.getElementById('sortSelect'); if (sort) sort.addEventListener('change', function (e) { curSort = e.target.value; render(); });
        var tabs = document.querySelectorAll('.tab-btn'); tabs.forEach(function (tab) { tab.addEventListener('click', function () { tabs.forEach(function (t) { t.classList.remove('is-active'); }); tab.classList.add('is-active'); curFilter = tab.dataset.filter || 'all'; render(); }); });
        var tplTabs = document.querySelectorAll('.tpl-tab'); tplTabs.forEach(function (t) { t.addEventListener('click', function () { tplTabs.forEach(function (x) { x.classList.remove('is-active'); }); t.classList.add('is-active'); curTplGroup = t.dataset.tplGroup || 'clinical'; renderTemplates(); }); });

        // Wizard
        var wizClose = document.getElementById('wizClose'); var wizCancel = document.getElementById('wizCancel'); var wizPrev = document.getElementById('wizPrev'); var wizNext = document.getElementById('wizNext'); var wizSave = document.getElementById('wizSave'); var wizardModal = document.getElementById('wizardModal');
        if (wizClose) wizClose.addEventListener('click', closeWizard);
        if (wizCancel) wizCancel.addEventListener('click', closeWizard);
        if (wizardModal) wizardModal.addEventListener('click', function (e) { if (e.target === wizardModal) closeWizard(); });

        if (wizPrev) wizPrev.addEventListener('click', function () {
            // حفظ الحقول الحالية قبل الرجوع
            captureStep1();
            if (wiz.step > 1) { wiz.step--; renderWizardStep(); }
        });

        if (wizNext) wizNext.addEventListener('click', function () {
            if (wiz.step === 1) {
                if (!captureStep1()) return;
            }
            if (wiz.step === 2) {
                // تحقق من الحقول المطلوبة قبل المعاينة
                var schema = FIELD_SCHEMAS[wiz.type];
                if (schema) {
                    var missing = [];
                    schema.sections.forEach(function (section) { section.fields.forEach(function (f) { if (f.required) { var v = wiz.formData[f.id]; if (v === undefined || v === '' || v === null || v === false) missing.push(f.label); } }); });
                    if (missing.length > 0) { toast('error', 'حقول مطلوبة', 'يرجى تعبئة: ' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? '...' : '')); return; }
                }
            }
            if (wiz.step < 3) { wiz.step++; renderWizardStep(); }
        });

        if (wizSave) wizSave.addEventListener('click', saveReport);

        // Preview
        var pc = document.getElementById('previewClose'); var pc2 = document.getElementById('previewClose2'); var pdfBtn = document.getElementById('pdfBtn'); var printBtn2 = document.getElementById('printBtn2'); var htmlBtn = document.getElementById('htmlBtn'); var pModal = document.getElementById('previewModal');
        if (pc) pc.addEventListener('click', closePreview);
        if (pc2) pc2.addEventListener('click', closePreview);
        if (pdfBtn) pdfBtn.addEventListener('click', function () { if (curPreview) exportPDF(curPreview); });
        if (printBtn2) printBtn2.addEventListener('click', function () { window.print(); });
        if (htmlBtn) htmlBtn.addEventListener('click', function () { if (curPreview) downloadHTML(curPreview); });
        if (pModal) pModal.addEventListener('click', function (e) { if (e.target === pModal) closePreview(); });

        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeWizard(); closePreview(); var c = document.getElementById('confirmModal'); if (c) c.classList.remove('is-open'); } });
    }

    function captureStep1() {
        var p = document.getElementById('wizPatient').value.trim();
        if (!p) { toast('error', 'حقل مطلوب', 'يرجى إدخال اسم المريض'); return false; }
        wiz.patient = p;
        wiz.patientDob = document.getElementById('wizPatientDob').value;
        wiz.patientGender = document.getElementById('wizPatientGender').value;
        wiz.type = document.getElementById('wizType').value;
        wiz.title = document.getElementById('wizTitle').value.trim();
        wiz.docDate = document.getElementById('wizDate').value || today();
        if (!wiz.title) { toast('error', 'حقل مطلوب', 'يرجى إدخال عنوان الوثيقة'); return false; }
        return true;
    }

    /* ============================================================
       INIT
    ============================================================ */
    function init() {
        initTheme();
        renderTemplates();
        render();
        bindEvents();
        setTimeout(function () { toast('info', '📊 مدير التقارير', 'كل حقل في الوثيقة القانونية يُدخله الطبيب يدوياً — لا بيانات تلقائية', 5000); }, 700);
        console.log('%c✅ Reports Manager Ready (Dynamic Form Edition)', 'background:#0891b2;color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;');
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { setTimeout(init, 50); }
})();