/* ============================================================
   C-SSRS Suicide Risk Assessment Tab — Standalone Script
============================================================ */

(function initCssrs() {
    console.log('🚀 C-SSRS.js initialized');

    /* ============================================================
       1. Storage Layer (fallback)
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
       2. Toast (fallback)
    ============================================================ */
    const showToast = (window.bnApp && window.bnApp.showToast)
        ? window.bnApp.showToast
        : function (type, title, message, duration = 3500) {
            console.log(`[Toast ${type}] ${title}: ${message}`);
        };

    /* ============================================================
       3. Confetti
    ============================================================ */
    const bnConfetti = {
        el: document.getElementById('bnConfetti'),
        colors: ['#dc2626', '#ef4444', '#f87171', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'],

        fire(duration = 2000) {
            if (!this.el) return;
            this.el.innerHTML = '';
            this.el.classList.add('active');

            const pieceCount = 60;

            for (let i = 0; i < pieceCount; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = Math.random() * 100 + '%';
                piece.style.animationDelay = Math.random() * 0.5 + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
                piece.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;
                this.el.appendChild(piece);
            }

            setTimeout(() => {
                this.el.classList.remove('active');
                this.el.innerHTML = '';
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
            severity: severity.name,
            severityKey: severity.key,
            description: severity.description,
            answers,
            testType: 'C-SSRS',
            completedAt: new Date().toISOString()
        };

        displayCssrsResult(currentCssrsResult);

        if (severity.key === 'severe') {
            showToast('error', 'تنبيه عاجل', 'تم رصد مؤشرات خطر انتحاري حرج. يرجى اتخاذ التدابير العاجلة.', 6000);
        }

        return currentCssrsResult;
    }

    function getCssrsSeverity(score) {
        if (score === 0) return {
            key: 'minimal',
            name: 'لا توجد مؤشرات خطر',
            description: 'لا توجد أفكار أو سلوكيات انتحارية ظاهرة.'
        };
        if (score <= 2) return {
            key: 'moderate',
            name: 'مخاطر منخفضة إلى متوسطة',
            description: 'وجود أفكار عابرة تتطلب المتابعة.'
        };
        return {
            key: 'severe',
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
            case 'minimal': badge.classList.add('severity-minimal'); break;
            case 'moderate': badge.classList.add('severity-moderate'); break;
            case 'severe': badge.classList.add('severity-severe'); break;
        }

        resultCard.classList.remove('critical');
        if (result.severityKey === 'severe') {
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
       8. Init + Submit Handler
    ============================================================ */
    function doInit() {
        renderCssrsQuestions();
        restoreCssrsDraft();
        updateCssrsAnswersStatus();

        const calcBtn = document.getElementById('cssrsCalculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculateCssrsScore(true));
        }

        const savedResult = storage.get('cssrsResult');
        if (savedResult && savedResult.totalScore !== undefined) {
            currentCssrsResult = savedResult;
            displayCssrsResult(savedResult);
        }

        const form = document.getElementById('cssrsForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculateCssrsScore(true);
                if (!result) return;

                const saveButton = document.getElementById('saveCssrsButton');
                const saveButtonText = document.getElementById('saveCssrsButtonText');
                const saveSpinner = document.getElementById('saveCssrsSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await mockSaveResult(result);

                    storage.set('cssrsResult', result);
                    storage.remove('draft_cssrsDraft');
                    storage.set('cssrsDraft', {
                        data: result.answers.reduce((acc, a) => {
                            acc[`cssrs_question_${a.questionNumber - 1}`] = String(a.score);
                            return acc;
                        }, {}),
                        savedAt: new Date().toISOString()
                    });

                    bnConfetti.fire();

                    if (result.severityKey === 'severe') {
                        showToast('success', 'تم الحفظ - تنبيه', `تم حفظ تقييم C-SSRS. النتيجة: ${result.totalScore} من 6 (خطر حرج).`, 6000);
                    } else {
                        showToast('success', 'تم الحفظ بنجاح', `تم حفظ تقييم C-SSRS. النتيجة: ${result.totalScore} من 6.`);
                    }
                } catch (error) {
                    showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ التقييم.');
                } finally {
                    saveButton.disabled = false;
                    saveSpinner.classList.add('d-none');
                    saveButtonText.classList.remove('d-none');
                }
            });
        }

        console.log('%c✅ C-SSRS Tab Loaded',
            'background:#dc2626;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    async function mockSaveResult(result) {
        console.log('Saving C-SSRS Result:', result);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();