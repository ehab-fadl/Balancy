/* ============================================================
   GAD-7 Anxiety Scale Tab — API-driven
   - GET: يجلب آخر تقييم GAD-7 للمريض عند فتح الصفحة
   - POST: كل حفظ = سجل جديد (assessment جديد في DB)
   - Severity: minimal / mild / moderate / severe (lowercase — مطابق للـ entity)
============================================================ */

(function initGad7() {
    console.log('🚀 GAD7.js initialized');

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
        const form = document.getElementById('gadForm');
        return form?.dataset?.patientId?.trim()
            || document.getElementById('patientId')?.value?.trim()
            || sessionStorage.getItem('bnCurrentPatientId')?.trim()
            || '';
    }

    function getApiUrls() {
        const form = document.getElementById('gadForm');
        return {
            latest: form?.dataset?.apiLatestUrl || '/Doctor?handler=LatestGad7',
            create: form?.dataset?.apiCreateUrl || '/Doctor?handler=CreateGad7'
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
        if (document.getElementById('bn-gad-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-gad-toast-styles';
        style.textContent = `
            .bn-gad-toast-overlay {
                position: fixed !important; inset: 0 !important;
                display: none; align-items: center; justify-content: center;
                z-index: 2147483647 !important; pointer-events: none; padding: 1rem; margin: 0 !important;
            }
            .bn-gad-toast-overlay.show { display: flex !important; }
            .bn-gad-toast {
                min-width: 300px; max-width: 92vw;
                padding: 1.1rem 1.4rem; border-radius: 16px;
                display: flex; align-items: center; gap: 0.85rem;
                font-family: 'Tajawal', sans-serif; font-weight: 800;
                font-size: 0.95rem; color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnGadToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto; direction: rtl; line-height: 1.5; position: relative;
            }
            .bn-gad-toast.hide { animation: bnGadToastOut 0.3s ease forwards; }
            .bn-gad-toast-icon {
                width: 38px; height: 38px; min-width: 38px;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                background: rgba(255, 255, 255, 0.22); font-size: 1.05rem;
            }
            .bn-gad-toast-body { display: flex; flex-direction: column; gap: 0.15rem; text-align: right; }
            .bn-gad-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-gad-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-gad-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-gad-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-gad-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-gad-toast.info { background: linear-gradient(135deg, #0891b2, #0e7490); }
            @keyframes bnGadToastIn { from { opacity: 0; transform: translateY(20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes bnGadToastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-20px) scale(0.92); } }
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
        let overlay = document.getElementById('bnGadToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnGadToastOverlay';
            overlay.className = 'bn-gad-toast-overlay';
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
        toast.className = `bn-gad-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-gad-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-gad-toast-body">
                <div class="bn-gad-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-gad-toast-message">${escapeHtml(message || '')}</div>
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
        colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],
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
       4. GAD-7 Questions & Answers
    ============================================================ */
    const gadQuestions = [
        'الشعور بالعصبية أو القلق أو التوتر.',
        'عدم القدرة على إيقاف أو السيطرة على القلق.',
        'القلق المفرط بشأن أمور مختلفة.',
        'صعوبة الاسترخاء.',
        'التوتر لدرجة صعوبة الجلوس بهدوء.',
        'الانزعاج أو الغضب بسهولة.',
        'الخوف من أن يحدث شيء فظيع.'
    ];

    const answerOptions = [
        { text: 'مطلقاً', score: 0 },
        { text: 'لأيام قليلة', score: 1 },
        { text: 'أكثر من نصف الأيام', score: 2 },
        { text: 'تقريباً كل يوم', score: 3 }
    ];

    let currentResult = null;

    /* ============================================================
       5. Render Questions
    ============================================================ */
    function renderQuestions() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;
        container.innerHTML = '';

        gadQuestions.forEach((question, questionIndex) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.dataset.question = questionIndex + 1;
            questionElement.style.animation = `gad-slideUpFade 0.4s ease ${questionIndex * 0.05}s both`;

            let optionsHtml = '';
            answerOptions.forEach(option => {
                const optionId = `gad7_question_${questionIndex}_${option.score}`;
                optionsHtml += `
                    <div class="answer-option">
                        <input type="radio" name="gad7_question_${questionIndex}" id="${optionId}" value="${option.score}">
                        <label for="${optionId}" class="answer-label">
                            <span class="answer-text">${option.text}</span>
                            <span class="answer-score">${option.score} نقطة</span>
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

        addAnswerListeners();
    }

    function addAnswerListeners() {
        document.querySelectorAll('#gadForm input[type="radio"]').forEach(input => {
            input.addEventListener('change', function () {
                this.closest('.question-item').classList.add('answered');
                updateAnswersStatus();
                calculateScore(false);
                saveDraft();
            });
        });
    }

    /* ============================================================
       6. Score Calculation
    ============================================================ */
    function calculateScore(forceDisplay = true) {
        let totalScore = 0, answeredQuestions = 0;
        const answers = [];

        gadQuestions.forEach((question, index) => {
            const selected = document.querySelector(`input[name="gad7_question_${index}"]:checked`);
            if (selected) {
                const score = parseInt(selected.value);
                totalScore += score;
                answeredQuestions++;
                answers.push({ questionNumber: index + 1, question, score });
            }
        });

        updateAnswersStatus(answeredQuestions);

        if (answeredQuestions < 7) {
            if (forceDisplay) showToast('warning', 'إجابات غير مكتملة', `يرجى الإجابة على جميع الأسئلة. تمت الإجابة على ${answeredQuestions} من 7.`);
            return null;
        }

        const severity = getSeverity(totalScore);
        currentResult = {
            totalScore,
            severity: severity.name,           // عرض بالعربي
            severityKey: severity.key,         // minimal / mild / moderate / severe
            description: severity.description,
            answers,
            testType: 'GAD-7',
            completedAt: new Date().toISOString()
        };

        displayResult(currentResult);
        return currentResult;
    }

    function getSeverity(score) {
        if (score <= 4) return {
            key: 'minimal',
            name: 'أعراض بسيطة جداً',
            description: 'تشير النتيجة إلى مستوى منخفض جداً من أعراض القلق.'
        };
        if (score <= 9) return {
            key: 'mild',
            name: 'قلق طفيف',
            description: 'تشير النتيجة إلى وجود أعراض قلق خفيفة.'
        };
        if (score <= 14) return {
            key: 'moderate',
            name: 'قلق متوسط',
            description: 'تشير النتيجة إلى مستوى متوسط من أعراض القلق.'
        };
        return {
            key: 'severe',
            name: 'قلق حاد',
            description: 'تشير النتيجة إلى مستوى مرتفع من أعراض القلق.'
        };
    }

    function displayResult(result) {
        const resultCard = document.getElementById('resultCard');
        const saveSection = document.getElementById('saveSection');

        document.getElementById('totalScore').textContent = result.totalScore;
        document.getElementById('resultDescription').textContent = result.description;

        const severityBadge = document.getElementById('severityBadge');
        severityBadge.textContent = result.severity;
        severityBadge.className = 'severity-badge';

        switch (result.severityKey) {
            case 'minimal': severityBadge.classList.add('severity-minimal'); break;
            case 'mild': severityBadge.classList.add('severity-mild'); break;
            case 'moderate': severityBadge.classList.add('severity-moderate'); break;
            case 'severe': severityBadge.classList.add('severity-severe'); break;
        }

        const percentage = Math.round((result.totalScore / 21) * 100);
        document.getElementById('scoreProgress').style.width = `${percentage}%`;
        document.getElementById('progressPercentage').textContent = `${percentage}%`;

        resultCard.classList.add('show');
        saveSection.classList.add('show');
    }

    function updateAnswersStatus(answeredQuestions = null) {
        if (answeredQuestions === null) {
            answeredQuestions = document.querySelectorAll('#gadForm input[type="radio"]:checked').length;
        }
        const el = document.getElementById('answersStatus');
        if (!el) return;
        el.textContent = `تمت الإجابة على ${answeredQuestions} من 7 أسئلة`;
        el.classList.toggle('complete', answeredQuestions === 7);
    }

    /* ============================================================
       7. Draft Auto-Save
    ============================================================ */
    function saveDraft() {
        const draft = {};
        gadQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="gad7_question_${index}"]:checked`);
            if (selected) draft[`gad7_question_${index}`] = selected.value;
        });

        storage.set('draft_gad7Draft', {
            data: draft,
            savedAt: new Date().toISOString()
        });
    }

    function restoreDraft() {
        const draft = storage.get('draft_gad7Draft');
        if (!draft || !draft.data) return;

        Object.entries(draft.data).forEach(([name, value]) => {
            const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (input) {
                input.checked = true;
                input.closest('.question-item').classList.add('answered');
            }
        });

        updateAnswersStatus();
    }

    /* ============================================================
       8. Apply server assessment to UI
    ============================================================ */
    function applyAssessmentToUI(assessment) {
        if (!assessment) return;

        const totalScore = typeof assessment.totalScore === 'number' ? assessment.totalScore
            : typeof assessment.TotalScore === 'number' ? assessment.TotalScore : 0;
        const severityRaw = assessment.severity ?? assessment.Severity ?? '';
        const answersJson = assessment.answersJson ?? assessment.AnswersJson ?? '';

        const severityKey = mapSeverityNameToKey(severityRaw);
        const severityInfo = getSeverity(totalScore);

        const result = {
            totalScore,
            severity: severityInfo.name,          // نعرض العربي دائماً
            severityKey,
            description: severityInfo.description,
            answers: [],
            testType: 'GAD-7',
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
                    if (idx >= 0 && idx < 7) {
                        const input = document.querySelector(`input[name="gad7_question_${idx}"][value="${score}"]`);
                        if (input) {
                            input.checked = true;
                            input.closest('.question-item')?.classList.add('answered');
                        }
                    }
                });
                result.answers = answersArray;
                updateAnswersStatus();
            } catch (e) {
                console.warn('⚠️ فشل قراءة AnswersJson:', e);
            }
        }

        currentResult = result;
        displayResult(result);
    }

    /**
     * يحوّل severity من الـ API (minimal/mild/moderate/severe أو العربي) إلى key.
     */
    function mapSeverityNameToKey(severity) {
        if (!severity) return 'minimal';
        const s = String(severity).trim().toLowerCase();
        if (s === 'severe' || s.includes('حاد')) return 'severe';
        if (s === 'moderate' || s.includes('متوسط')) return 'moderate';
        if (s === 'mild' || s.includes('طفيف')) return 'mild';
        return 'minimal';
    }

    /* ============================================================
       9. Load latest assessment from API
    ============================================================ */
    async function loadLatestAssessment() {
        const patientId = getPatientId();
        if (!patientId) {
            console.warn('⚠️ No patientId — cannot load latest GAD-7');
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
                console.log('ℹ️ No previous GAD-7 assessment for this patient.');
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const payload = await res.json();
            console.log('✅ Loaded latest GAD-7:', payload);

            const assessment = (payload && payload.data && !Array.isArray(payload.data)) ? payload.data
                : Array.isArray(payload) ? payload[0] : payload;

            applyAssessmentToUI(assessment);
        } catch (err) {
            console.error('❌ فشل تحميل آخر تقييم GAD-7:', err);
            showToast('error', 'فشل التحميل', 'تعذر تحميل آخر تقييم GAD-7.');
        }
    }

    /* ============================================================
       10. Build POST payload (يطابق الـ entity)
    ============================================================ */
    function buildCreatePayload(result) {
        const patientId = getPatientId();
        // ✅ الباك إند يتوقع: minimal / mild / moderate / severe (lowercase)
        //    الـ entity: public string Severity // minimal, mild, moderate, severe
        return {
            patientId: patientId,
            totalScore: result.totalScore,
            severity: result.severityKey,               // ← القيمة الإنجليزية
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
        renderQuestions();
        restoreDraft();
        updateAnswersStatus();

        // Load latest from server
        loadLatestAssessment();

        // Calculate button
        const calcBtn = document.getElementById('calculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculateScore(true));
        }

        // Submit — كل حفظ = سجل جديد
        const form = document.getElementById('gadForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculateScore(true);
                if (!result) return;

                const patientId = getPatientId();
                if (!patientId) {
                    showToast('error', 'خطأ', 'معرّف المريض مفقود.');
                    return;
                }

                const payload = buildCreatePayload(result);
                console.log('📤 POST GAD-7 payload:', payload);

                const saveButton = document.getElementById('saveGadButton');
                const saveButtonText = document.getElementById('saveGadButtonText');
                const saveSpinner = document.getElementById('saveGadSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await createAssessment(payload);

                    storage.remove('draft_gad7Draft');
                    bnConfetti.fire();
                    showToast('success', 'تم الحفظ بنجاح',
                        `تم حفظ تقييم GAD-7 جديد. النتيجة: ${result.totalScore} من 21.`);
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
            showToast('info', 'اختبار GAD-7', 'أجب على الأسئلة السبعة لحساب درجة القلق. كل حفظ = سجل جديد في قاعدة البيانات.', 5000);
        }, 1000);

        console.log('%c✅ GAD-7 Tab Loaded',
            'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();