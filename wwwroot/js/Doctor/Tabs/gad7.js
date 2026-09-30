/* ============================================================
   GAD-7 Anxiety Scale Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initGad7() {
    console.log('🚀 GAD7.js initialized');

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
        colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],

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
       4. GAD-7 Data
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
            severity: severity.name,
            severityKey: severity.key,
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
       8. Init + Submit Handler
    ============================================================ */
    function doInit() {
        renderQuestions();
        restoreDraft();
        updateAnswersStatus();

        // زر الحساب
        const calcBtn = document.getElementById('calculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculateScore(true));
        }

        // إذا كان هناك نتيجة محفوظة سابقة، عرضها
        const savedResult = storage.get('gad7Result');
        if (savedResult && savedResult.totalScore !== undefined) {
            currentResult = savedResult;
            displayResult(savedResult);
        }

        // Submit handler
        const form = document.getElementById('gadForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculateScore(true);
                if (!result) return;

                const saveButton = document.getElementById('saveGadButton');
                const saveButtonText = document.getElementById('saveGadButtonText');
                const saveSpinner = document.getElementById('saveGadSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await mockSaveResult(result);

                    storage.set('gad7Result', result);
                    storage.remove('draft_gad7Draft');
                    storage.set('gad7Draft', {
                        data: result.answers.reduce((acc, a) => {
                            acc[`gad7_question_${a.questionNumber - 1}`] = String(a.score);
                            return acc;
                        }, {}),
                        savedAt: new Date().toISOString()
                    });

                    bnConfetti.fire();
                    showToast('success', 'تم الحفظ بنجاح', `تم حفظ نتيجة اختبار GAD-7. النتيجة: ${result.totalScore} من 21.`);
                } catch (error) {
                    showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ نتيجة الاختبار.');
                } finally {
                    saveButton.disabled = false;
                    saveSpinner.classList.add('d-none');
                    saveButtonText.classList.remove('d-none');
                }
            });
        }

        console.log('%c✅ GAD-7 Tab Loaded',
            'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    async function mockSaveResult(result) {
        console.log('Saving GAD-7 Result:', result);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();