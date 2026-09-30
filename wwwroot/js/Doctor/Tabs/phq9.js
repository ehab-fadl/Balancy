/* ============================================================
   PHQ-9 Depression Scale Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initPhq9() {
    console.log('🚀 PHQ9.js initialized');

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
        colors: ['#4338ca', '#6366f1', '#818cf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],

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
       4. PHQ-9 Data
    ============================================================ */
    const phqQuestions = [
        'قليلة هي الاهتمامات أو المتعة في القيام بالأشياء.',
        'الشعور بالإحباط، الاكتئاب، أو اليأس.',
        'صعوبة في النوم، الاستمرار فيه، أو النوم لفترات طويلة جداً.',
        'الشعور بالتعب أو قلة الطاقة.',
        'ضعف الشهية أو الإفراط في تناول الطعام.',
        'الشعور بشعور سيء تجاه نفسك.',
        'صعوبة في التركيز على الأشياء.',
        'التحرك أو التحدث ببطء شديد أو على العكس التململ.',
        'أفكار بأنك تفضل الموت أو إيذاء نفسك بطريقة ما.'
    ];

    const answerOptions = [
        { text: 'مطلقاً', score: 0 },
        { text: 'لأيام قليلة', score: 1 },
        { text: 'أكثر من نصف الأيام', score: 2 },
        { text: 'تقريباً كل يوم', score: 3 }
    ];

    let currentPhqResult = null;

    /* ============================================================
       5. Render Questions
    ============================================================ */
    function renderPhqQuestions() {
        const container = document.getElementById('phqQuestionsContainer');
        if (!container) return;
        container.innerHTML = '';

        phqQuestions.forEach((question, questionIndex) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.style.animation = `phq-slideUpFade 0.4s ease ${questionIndex * 0.05}s both`;

            let optionsHtml = '';
            answerOptions.forEach(option => {
                const optionId = `phq_question_${questionIndex}_${option.score}`;
                optionsHtml += `
                    <div class="answer-option">
                        <input type="radio" name="phq_question_${questionIndex}" id="${optionId}" value="${option.score}">
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

        addPhqAnswerListeners();
    }

    function addPhqAnswerListeners() {
        document.querySelectorAll('#phqForm input[type="radio"]').forEach(input => {
            input.addEventListener('change', function () {
                this.closest('.question-item').classList.add('answered');
                updatePhqAnswersStatus();
                calculatePhqScore(false);
                savePhqDraft();
            });
        });
    }

    /* ============================================================
       6. Score Calculation
    ============================================================ */
    function calculatePhqScore(forceDisplay = true) {
        let totalScore = 0, answeredQuestions = 0;
        const answers = [];

        phqQuestions.forEach((question, index) => {
            const selected = document.querySelector(`input[name="phq_question_${index}"]:checked`);
            if (selected) {
                const score = parseInt(selected.value);
                totalScore += score;
                answeredQuestions++;
                answers.push({ questionNumber: index + 1, question, score });
            }
        });

        updatePhqAnswersStatus(answeredQuestions);

        if (answeredQuestions < 9) {
            if (forceDisplay) showToast('warning', 'إجابات غير مكتملة', `يرجى الإجابة على جميع الأسئلة. تمت الإجابة على ${answeredQuestions} من 9.`);
            return null;
        }

        const severity = getPhqSeverity(totalScore);
        currentPhqResult = {
            totalScore,
            severity: severity.name,
            severityKey: severity.key,
            description: severity.description,
            answers,
            testType: 'PHQ-9',
            completedAt: new Date().toISOString()
        };

        displayPhqResult(currentPhqResult);
        return currentPhqResult;
    }

    function getPhqSeverity(score) {
        if (score <= 4) return {
            key: 'minimal',
            name: 'لا توجد أعراض اكتئاب تذكر',
            description: 'مستوى طبيعي أو أدنى من أعراض الاكتئاب.'
        };
        if (score <= 9) return {
            key: 'mild',
            name: 'اكتئاب خفيف',
            description: 'تشير النتيجة إلى وجود أعراض اكتئاب خفيفة.'
        };
        if (score <= 14) return {
            key: 'moderate',
            name: 'اكتئاب متوسط',
            description: 'تشير النتيجة إلى مستوى متوسط من أعراض الاكتئاب.'
        };
        if (score <= 19) return {
            key: 'moderate',
            name: 'اكتئاب متوسط إلى شديد',
            description: 'أعراض اكتئاب واضحة تتطلب متابعة وثيقة.'
        };
        return {
            key: 'severe',
            name: 'اكتئاب حاد',
            description: 'تشير النتيجة إلى مستوى مرتفع وحاد من أعراض الاكتئاب.'
        };
    }

    function displayPhqResult(result) {
        const resultCard = document.getElementById('phqResultCard');
        const saveSection = document.getElementById('phqSaveSection');

        document.getElementById('phqTotalScore').textContent = result.totalScore;
        document.getElementById('phqResultDescription').textContent = result.description;

        const badge = document.getElementById('phqSeverityBadge');
        badge.textContent = result.severity;
        badge.className = 'severity-badge';

        switch (result.severityKey) {
            case 'minimal': badge.classList.add('severity-minimal'); break;
            case 'mild': badge.classList.add('severity-mild'); break;
            case 'moderate': badge.classList.add('severity-moderate'); break;
            case 'severe': badge.classList.add('severity-severe'); break;
        }

        const percentage = Math.round((result.totalScore / 27) * 100);
        document.getElementById('phqScoreProgress').style.width = `${percentage}%`;
        document.getElementById('phqProgressPercentage').textContent = `${percentage}%`;

        resultCard.classList.add('show');
        saveSection.classList.add('show');
    }

    function updatePhqAnswersStatus(answeredQuestions = null) {
        if (answeredQuestions === null) {
            answeredQuestions = document.querySelectorAll('#phqForm input[type="radio"]:checked').length;
        }
        const el = document.getElementById('phqAnswersStatus');
        if (!el) return;
        el.textContent = `تمت الإجابة على ${answeredQuestions} من 9 أسئلة`;
        el.classList.toggle('complete', answeredQuestions === 9);
    }

    /* ============================================================
       7. Draft Auto-Save
    ============================================================ */
    function savePhqDraft() {
        const draft = {};
        phqQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="phq_question_${index}"]:checked`);
            if (selected) draft[`phq_question_${index}`] = selected.value;
        });

        storage.set('draft_phq9Draft', {
            data: draft,
            savedAt: new Date().toISOString()
        });
    }

    function restorePhqDraft() {
        const draft = storage.get('draft_phq9Draft');
        if (!draft || !draft.data) return;

        Object.entries(draft.data).forEach(([name, value]) => {
            const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (input) {
                input.checked = true;
                input.closest('.question-item').classList.add('answered');
            }
        });

        updatePhqAnswersStatus();
    }

    /* ============================================================
       8. Init + Submit Handler
    ============================================================ */
    function doInit() {
        renderPhqQuestions();
        restorePhqDraft();
        updatePhqAnswersStatus();

        // زر الحساب
        const calcBtn = document.getElementById('phqCalculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculatePhqScore(true));
        }

        // إذا كان هناك نتيجة محفوظة سابقة، عرضها
        const savedResult = storage.get('phq9Result');
        if (savedResult && savedResult.totalScore !== undefined) {
            currentPhqResult = savedResult;
            displayPhqResult(savedResult);
        }

        // Submit handler
        const form = document.getElementById('phqForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculatePhqScore(true);
                if (!result) return;

                const saveButton = document.getElementById('savePhqButton');
                const saveButtonText = document.getElementById('savePhqButtonText');
                const saveSpinner = document.getElementById('savePhqSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await mockSaveResult(result);

                    storage.set('phq9Result', result);
                    storage.remove('draft_phq9Draft');
                    storage.set('phq9Draft', {
                        data: result.answers.reduce((acc, a) => {
                            acc[`phq_question_${a.questionNumber - 1}`] = String(a.score);
                            return acc;
                        }, {}),
                        savedAt: new Date().toISOString()
                    });

                    bnConfetti.fire();
                    showToast('success', 'تم الحفظ بنجاح', `تم حفظ نتيجة اختبار PHQ-9. النتيجة: ${result.totalScore} من 27.`);
                } catch (error) {
                    showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ نتيجة الاختبار.');
                } finally {
                    saveButton.disabled = false;
                    saveSpinner.classList.add('d-none');
                    saveButtonText.classList.remove('d-none');
                }
            });
        }

        console.log('%c✅ PHQ-9 Tab Loaded',
            'background:#4338ca;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    async function mockSaveResult(result) {
        console.log('Saving PHQ-9 Result:', result);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();