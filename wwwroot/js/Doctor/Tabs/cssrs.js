/* ============================================================
   C-SSRS Suicide Risk Assessment Tab — API-driven
   - GET: يجلب آخر تقييم C-SSRS للمريض عند فتح الصفحة
   - POST: كل حفظ = سجل جديد (assessment جديد في DB)
   - Severity: low / moderate / high / critical
   - IsCritical: true لو score >= 5
============================================================ */

(function initCssrs() {
    console.log('🚀 C-SSRS.js initialized');

    /* ============================================================
       0. Utilities
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    function getAntiForgeryToken() {
        return document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
    }

    function getPatientId() {
        const form = document.getElementById('cssrsForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('cssrsForm');
        return {
            latest: form?.dataset?.apiLatestUrl || '/Doctor?handler=LatestCssrs',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateCssrs'
        };
    }

    /* ============================================================
       1. Storage Layer
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
       2. Toast
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-cs-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-cs-toast-styles';
        style.textContent = `
            .bn-cs-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-cs-toast-overlay.show { display: flex !important; }
            .bn-cs-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnCsToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-cs-toast.hide { animation: bnCsToastOut 0.3s ease forwards; }
            .bn-cs-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-cs-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-cs-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-cs-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-cs-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-cs-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-cs-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-cs-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnCsToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnCsToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
        `;
        document.head.appendChild(style);
    }

    function showBuiltInToast(type, title, message, duration = 3200) {
        ensureToastStyles();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded',
                () => showBuiltInToast(type, title, message, duration),
                { once: true });
            return;
        }
        let overlay = document.getElementById('bnCsToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnCsToastOverlay';
            overlay.className = 'bn-cs-toast-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = '';
        const iconMap = {
            error: 'fa-circle-exclamation',
            success: 'fa-circle-check',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        const toast = document.createElement('div');
        toast.className = `bn-cs-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-cs-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-cs-toast-body">
                <div class="bn-cs-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-cs-toast-message">${escapeHtml(message || '')}</div>
            </div>
        `;
        overlay.appendChild(toast);
        overlay.classList.add('show');
        clearTimeout(overlay._hideTimer);
        clearTimeout(overlay._removeTimer);
        overlay._hideTimer = setTimeout(() => {
            toast.classList.add('hide');
            overlay._removeTimer = setTimeout(() => {
                overlay.classList.remove('show');
                overlay.innerHTML = '';
            }, 320);
        }, duration);
    }

    const showToast = showBuiltInToast;

    /* ============================================================
       3. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#dc2626', '#ef4444', '#f87171', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'],
        ensureEl() {
            if (this.el && document.body.contains(this.el)) return this.el;
            let existing = document.getElementById('bnConfetti');
            if (!existing) {
                existing = document.createElement('div');
                existing.className = 'bn-confetti';
                existing.id = 'bnConfetti';
                document.body.appendChild(existing);
            }
            this.el = existing;
            return existing;
        },
        fire(duration = 2000) {
            const el = this.ensureEl();
            if (!el) return;
            el.innerHTML = '';
            el.classList.add('active');
            for (let i = 0; i < 60; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = Math.random() * 100 + '%';
                piece.style.animationDelay = Math.random() * 0.5 + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
                piece.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
                el.appendChild(piece);
            }
            setTimeout(() => {
                el.classList.remove('active');
                el.innerHTML = '';
            }, duration);
        }
    };

    /* ============================================================
       4. C-SSRS Data
    ============================================================ */
    const cssrsQuestions = [
        '1. تمني الموت: هل شعرت برغبة في أن تكون ميتًا؟',
        '2. أفكار انتحارية غير محددة: هل راودتك أفكار في إنهاء حياتك؟',
        '3. أفكار انتحارية مع نية ودون خطة: هل راودتك فكرة الانتحار مع وجود نية؟',
        '4. أفكار انتحارية مع خطة ونية: هل راودتك فكرة مع خطة محددة؟',
        '5. السلوك الانتحاري الفعلي: هل قمت بأي محاولة لإنهاء حياتك؟',
        '6. السلوك الانتحاري السابق: هل سبق للمريض محاولة انتحار في الماضي؟'
    ];

    const cssrsAnswerOptions = [
        { text: 'لا', score: 0 },
        { text: 'نعم', score: 1 }
    ];

    let currentCssrsResult = null;

    /* ============================================================
       5. Render Questions
    ============================================================ */
    function renderCssrsQuestions() {
        const container = document.getElementById('cssrsQuestionsContainer');
        if (!container) return;
        container.innerHTML = '';

        cssrsQuestions.forEach((question, questionIndex) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.style.animation = `cssrs-slideUpFade 0.4s ease ${questionIndex * 0.06}s both`;

            let optionsHtml = '';
            cssrsAnswerOptions.forEach(option => {
                const optionId = `cssrs_question_${questionIndex}_${option.score}`;
                optionsHtml += `
                    <div class="answer-option">
                        <input type="radio" name="cssrs_question_${questionIndex}" id="${optionId}" value="${option.score}">
                        <label for="${optionId}" class="answer-label">
                            <span class="answer-text">${option.text}</span>
                            <span class="answer-score">${option.score === 1 ? 'نعم (مؤشر خطر)' : 'لا'}</span>
                        </label>
                    </div>
                `;
            });

            questionElement.innerHTML = `
                <div class="question-header">
                    <div class="question-number">${questionIndex + 1}</div>
                    <div class="question-text">${question}</div>
                </div>
                <div class="answers-grid">${optionsHtml}</div>
            `;
            container.appendChild(questionElement);
        });

        addCssrsAnswerListeners();
    }

    function addCssrsAnswerListeners() {
        document.querySelectorAll('#cssrsForm input[type="radio"]').forEach(input => {
            input.addEventListener('change', function () {
                const questionItem = this.closest('.question-item');
                questionItem.classList.add('answered');
                if (this.value === '1') {
                    questionItem.classList.add('answered-danger');
                } else {
                    questionItem.classList.remove('answered-danger');
                }
                updateCssrsAnswersStatus();
                calculateCssrsScore(false);
                saveCssrsDraft();
            });
        });
    }

    /* ============================================================
       6. Score Calculation
    ============================================================ */
    function calculateCssrsScore(forceDisplay = true) {
        let totalScore = 0, answeredQuestions = 0;
        const answers = [];

        cssrsQuestions.forEach((question, index) => {
            const selected = document.querySelector(`input[name="cssrs_question_${index}"]:checked`);
            if (selected) {
                const score = parseInt(selected.value);
                totalScore += score;
                answeredQuestions++;
                answers.push({
                    questionNumber: index + 1,
                    question,
                    score,
                    isRisk: score === 1
                });
            }
        });

        updateCssrsAnswersStatus(answeredQuestions);

        if (answeredQuestions < 6) {
            if (forceDisplay) showToast('warning', 'إجابات غير مكتملة', `يرجى الإجابة على جميع الأسئلة. تمت الإجابة على ${answeredQuestions} من 6.`);
            return null;
        }

        const severity = getCssrsSeverity(totalScore);
        currentCssrsResult = {
            totalScore,
            severity: severity.name,           // عرض بالعربي
            severityKey: severity.key,         // low / moderate / high / critical
            isCritical: severity.key === 'critical',
            description: severity.description,
            answers,
            testType: 'C-SSRS',
            completedAt: new Date().toISOString()
        };

        displayCssrsResult(currentCssrsResult);

        if (severity.key === 'critical') {
            showToast('error', 'تنبيه عاجل', 'تم رصد مؤشرات خطر انتحاري حرج. يرجى اتخاذ التدابير العاجلة.', 6000);
        }

        return currentCssrsResult;
    }

    function getCssrsSeverity(score) {
        if (score === 0) return {
            key: 'low',
            name: 'لا توجد مؤشرات خطر',
            description: 'لا توجد أفكار أو سلوكيات انتحارية ظاهرة.'
        };
        if (score <= 2) return {
            key: 'moderate',
            name: 'مخاطر منخفضة إلى متوسطة',
            description: 'وجود أفكار عابرة تتطلب المتابعة.'
        };
        if (score <= 4) return {
            key: 'high',
            name: 'مخاطر مرتفعة',
            description: 'وجود أفكار أو سلوكيات انتحارية تستدعي تدخلاً عاجلاً.'
        };
        return {
            key: 'critical',
            name: 'خطر انتحاري حرج',
            description: 'تنبيه عاجل: توجد مؤشرات خطورة حرجة تتطلب تدخلاً طارئاً!'
        };
    }

    function displayCssrsResult(result) {
        const resultCard = document.getElementById('cssrsResultCard');
        const saveSection = document.getElementById('cssrsSaveSection');
        const criticalAlert = document.getElementById('cssrsCriticalAlert');

        document.getElementById('cssrsTotalScore').textContent = result.totalScore;
        document.getElementById('cssrsResultDescription').textContent = result.description;

        const badge = document.getElementById('cssrsSeverityBadge');
        badge.textContent = result.severity;
        badge.className = 'severity-badge';

        switch (result.severityKey) {
            case 'low': badge.classList.add('severity-minimal'); break;
            case 'moderate': badge.classList.add('severity-moderate'); break;
            case 'high': badge.classList.add('severity-severe'); break;
            case 'critical': badge.classList.add('severity-severe'); break;
        }

        resultCard.classList.remove('critical');
        if (result.severityKey === 'critical' || result.isCritical) {
            resultCard.classList.add('critical');
            criticalAlert.classList.add('show');
        } else {
            criticalAlert.classList.remove('show');
        }

        const percentage = Math.round((result.totalScore / 6) * 100);
        document.getElementById('cssrsScoreProgress').style.width = `${percentage}%`;
        document.getElementById('cssrsProgressPercentage').textContent = `${percentage}%`;

        resultCard.classList.add('show');
        saveSection.classList.add('show');
    }

    function updateCssrsAnswersStatus(answeredQuestions = null) {
        if (answeredQuestions === null) {
            answeredQuestions = document.querySelectorAll('#cssrsForm input[type="radio"]:checked').length;
        }
        const el = document.getElementById('cssrsAnswersStatus');
        if (!el) return;
        el.textContent = `تمت الإجابة على ${answeredQuestions} من 6 أسئلة`;
        el.classList.toggle('complete', answeredQuestions === 6);
    }

    /* ============================================================
       7. Draft Auto-Save
    ============================================================ */
    function saveCssrsDraft() {
        const draft = {};
        cssrsQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="cssrs_question_${index}"]:checked`);
            if (selected) draft[`cssrs_question_${index}`] = selected.value;
        });

        storage.set('draft_cssrsDraft', {
            data: draft,
            savedAt: new Date().toISOString()
        });
    }

    function restoreCssrsDraft() {
        const draft = storage.get('draft_cssrsDraft');
        if (!draft || !draft.data) return;

        Object.entries(draft.data).forEach(([name, value]) => {
            const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (input) {
                input.checked = true;
                const questionItem = input.closest('.question-item');
                questionItem.classList.add('answered');
                if (value === '1') questionItem.classList.add('answered-danger');
            }
        });

        updateCssrsAnswersStatus();
    }

    /* ============================================================
       8. Apply server assessment to UI
    ============================================================ */
    function applyAssessmentToUI(assessment) {
        if (!assessment) return;

        const totalScore = typeof assessment.totalScore === 'number' ? assessment.totalScore
            : typeof assessment.TotalScore === 'number' ? assessment.TotalScore : 0;
        const severityRaw = assessment.severity ?? assessment.Severity ?? '';
        const isCritical = assessment.isCritical ?? assessment.IsCritical ?? false;
        const answersJson = assessment.answersJson ?? assessment.AnswersJson ?? '';

        const severityKey = mapSeverityNameToKey(severityRaw);
        const severityInfo = getCssrsSeverity(totalScore);

        const result = {
            totalScore,
            severity: severityInfo.name,
            severityKey,
            isCritical: isCritical || severityKey === 'critical',
            description: severityInfo.description,
            answers: [],
            testType: 'C-SSRS',
            completedAt: assessment.createdAt ?? assessment.CreatedAt ?? new Date().toISOString(),
            fromServer: true
        };

        if (answersJson) {
            try {
                const parsed = typeof answersJson === 'string' ? JSON.parse(answersJson) : answersJson;
                const answersArray = Array.isArray(parsed) ? parsed : (parsed.answers || []);
                answersArray.forEach(a => {
                    const idx = (a.questionNumber ?? a.QuestionNumber ?? 0) - 1;
                    const score = a.score ?? a.Score ?? 0;
                    if (idx >= 0 && idx < 6) {
                        const input = document.querySelector(`input[name="cssrs_question_${idx}"][value="${score}"]`);
                        if (input) {
                            input.checked = true;
                            const questionItem = input.closest('.question-item');
                            questionItem?.classList.add('answered');
                            if (score === 1) questionItem?.classList.add('answered-danger');
                        }
                    }
                });
                result.answers = answersArray;
                updateCssrsAnswersStatus();
            } catch (e) {
                console.warn('⚠️ فشل قراءة AnswersJson:', e);
            }
        }

        currentCssrsResult = result;
        displayCssrsResult(result);
    }

    function mapSeverityNameToKey(severity) {
        if (!severity) return 'low';
        const s = String(severity).trim().toLowerCase();
        if (s === 'critical' || s.includes('حرج')) return 'critical';
        if (s === 'high' || s.includes('مرتفع')) return 'high';
        if (s === 'moderate' || s.includes('متوسط')) return 'moderate';
        return 'low';
    }

    /* ============================================================
       9. Load latest assessment from API
    ============================================================ */
    async function loadLatestAssessment() {
        const patientId = getPatientId();
        if (!patientId) {
            console.warn('⚠️ No patientId — cannot load latest C-SSRS');
            return;
        }

        const urls = getApiUrls();
        const url = `${urls.latest}${urls.latest.includes('?') ? '&' : '?'}patientId=${encodeURIComponent(patientId)}`;

        try {
            const res = await fetch(url, {
                headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (res.status === 404) {
                console.log('ℹ️ No previous C-SSRS assessment for this patient.');
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const payload = await res.json();
            console.log('✅ Loaded latest C-SSRS:', payload);

            const assessment = (payload && payload.data && !Array.isArray(payload.data)) ? payload.data
                : Array.isArray(payload) ? payload[0] : payload;

            applyAssessmentToUI(assessment);
        } catch (err) {
            console.error('❌ فشل تحميل آخر تقييم C-SSRS:', err);
            showToast('error', 'فشل التحميل', 'تعذر تحميل آخر تقييم C-SSRS.');
        }
    }

    /* ============================================================
       10. Build POST payload (يطابق الـ entity)
    ============================================================ */
    function buildCreatePayload(result) {
        const patientId = getPatientId();
        // ✅ الباك إند يتوقع: low / moderate / high / critical + isCritical
        return {
            patientId: patientId,
            totalScore: result.totalScore,
            severity: result.severityKey,
            isCritical: result.isCritical || result.severityKey === 'critical',
            answersJson: JSON.stringify(result.answers || [])
        };
    }

    async function createAssessment(payload) {
        const urls = getApiUrls();
        const res = await fetch(urls.create, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'fetch',
                'Accept': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
        return text ? JSON.parse(text) : null;
    }

    /* ============================================================
       11. Init + Submit Handler
    ============================================================ */
    function doInit() {
        renderCssrsQuestions();
        restoreCssrsDraft();
        updateCssrsAnswersStatus();

        loadLatestAssessment();

        const calcBtn = document.getElementById('cssrsCalculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculateCssrsScore(true));
        }

        const form = document.getElementById('cssrsForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculateCssrsScore(true);
                if (!result) return;

                const patientId = getPatientId();
                if (!patientId) {
                    showToast('error', 'خطأ', 'معرّف المريض مفقود.');
                    return;
                }

                const payload = buildCreatePayload(result);
                console.log('📤 POST C-SSRS payload:', payload);

                const saveButton = document.getElementById('saveCssrsButton');
                const saveButtonText = document.getElementById('saveCssrsButtonText');
                const saveSpinner = document.getElementById('saveCssrsSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await createAssessment(payload);

                    storage.remove('draft_cssrsDraft');
                    bnConfetti.fire();

                    if (result.severityKey === 'critical') {
                        showToast('success', 'تم الحفظ - تنبيه', `تم حفظ تقييم C-SSRS. النتيجة: ${result.totalScore} من 6 (خطر حرج).`, 6000);
                    } else {
                        showToast('success', 'تم الحفظ بنجاح', `تم حفظ تقييم C-SSRS. النتيجة: ${result.totalScore} من 6.`);
                    }
                } catch (err) {
                    console.error('❌ فشل حفظ التقييم:', err);
                    showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ التقييم.');
                } finally {
                    saveButton.disabled = false;
                    saveSpinner.classList.add('d-none');
                    saveButtonText.classList.remove('d-none');
                }
            });
        }

        setTimeout(() => {
            showToast('info', 'تقييم C-SSRS', 'أجب على الأسئلة الستة لحساب درجة الخطر الانتحاري. كل حفظ = سجل جديد في قاعدة البيانات.', 5000);
        }, 1000);

        console.log('%c✅ C-SSRS Tab Loaded',
            'background:#dc2626;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();