/* ============================================================
   MDQ Bipolar Disorder Test Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initMdq() {
    console.log('🚀 MDQ.js initialized');

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
        colors: ['#d97706', '#f59e0b', '#fbbf24', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'],

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
       4. MDQ Data
    ============================================================ */
    const mdqQuestions = [
        'شعرت بحالة من المرح أو النشاط الزائد لدرجة أن الآخرين لاحظوا؟',
        'شعرت بالتهيج أو الغضب السريع لدرجة الصراخ في وجه الآخرين؟',
        'شعرت بالثقة بالنفس بشكل أكبر بكثير من المعتاد؟',
        'نمت لفترات قصيرة جداً ومع ذلك شعرت بالنشاط؟',
        'كنت تتحدث كثيراً وبسرعة لدرجة أن الآخرين لم يستطيعوا مجاراة حديثك؟',
        'كانت الأفكار تتسابق في سرك ولم تستطع إيقافها؟',
        'كنت تشتت بسهولة بسبب الأحداث الخارجية؟',
        'كانت لديك طاقة هائلة للقيام بالعديد من المهام في نفس الوقت؟',
        'قمت بأنشطة غير معتادة أو مغامرات محفوفة المخاطر؟',
        'أصبحت تصرفاتك الاجتماعية أو الجنسية غير معتادة بالنسبة لك؟',
        'هل حدثت أكثر من واحدة من هذه الأعراض في نفس الفترة الزمنية؟',
        'هل تسببت هذه الأعراض في مشاكل ملحوظة في عملك أو علاقاتك؟',
        'هل أخبرك أحد من عائلتك أو أصدقاؤك أنك كنت تعاني من هذه التغيرات؟'
    ];

    const mdqAnswerOptions = [
        { text: 'لا', score: 0 },
        { text: 'نعم', score: 1 }
    ];

    let currentMdqResult = null;

    /* ============================================================
       5. Render Questions
    ============================================================ */
    function renderMdqQuestions() {
        const container = document.getElementById('mdqQuestionsContainer');
        if (!container) return;
        container.innerHTML = '';

        mdqQuestions.forEach((question, questionIndex) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.style.animation = `mdq-slideUpFade 0.4s ease ${questionIndex * 0.04}s both`;

            let optionsHtml = '';
            mdqAnswerOptions.forEach(option => {
                const optionId = `mdq_question_${questionIndex}_${option.score}`;
                optionsHtml += `
                    <div class="answer-option">
                        <input type="radio" name="mdq_question_${questionIndex}" id="${optionId}" value="${option.score}">
                        <label for="${optionId}" class="answer-label">
                            <span class="answer-text">${option.text}</span>
                            <span class="answer-score">${option.score === 1 ? 'نعم (1 نقطة)' : 'لا (0 نقاط)'}</span>
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

        addMdqAnswerListeners();
    }

    function addMdqAnswerListeners() {
        document.querySelectorAll('#mdqForm input[type="radio"]').forEach(input => {
            input.addEventListener('change', function () {
                this.closest('.question-item').classList.add('answered');
                updateMdqAnswersStatus();
                calculateMdqScore(false);
                saveMdqDraft();
            });
        });
    }

    /* ============================================================
       6. Score Calculation
    ============================================================ */
    function calculateMdqScore(forceDisplay = true) {
        let totalScore = 0, answeredQuestions = 0;
        const answers = [];

        mdqQuestions.forEach((question, index) => {
            const selected = document.querySelector(`input[name="mdq_question_${index}"]:checked`);
            if (selected) {
                const score = parseInt(selected.value);
                totalScore += score;
                answeredQuestions++;
                answers.push({ questionNumber: index + 1, question, score });
            }
        });

        updateMdqAnswersStatus(answeredQuestions);

        if (answeredQuestions < 13) {
            if (forceDisplay) showToast('warning', 'إجابات غير مكتملة', `يرجى الإجابة على جميع الأسئلة. تمت الإجابة على ${answeredQuestions} من 13.`);
            return null;
        }

        const severity = getMdqSeverity(totalScore);
        currentMdqResult = {
            totalScore,
            severity: severity.name,
            severityKey: severity.key,
            description: severity.description,
            answers,
            testType: 'MDQ',
            completedAt: new Date().toISOString()
        };

        displayMdqResult(currentMdqResult);
        return currentMdqResult;
    }

    function getMdqSeverity(score) {
        if (score < 7) return {
            key: 'minimal',
            name: 'احتمالية منخفضة',
            description: 'لا توجد مؤشرات قوية لاضطراب ثنائي القطب.'
        };
        return {
            key: 'severe',
            name: 'احتمالية إيجابية مرتفعة',
            description: 'مؤشرات إيجابية تستدعي التقييم الإكلينيكي المفصل.'
        };
    }

    function displayMdqResult(result) {
        const resultCard = document.getElementById('mdqResultCard');
        const saveSection = document.getElementById('mdqSaveSection');

        document.getElementById('mdqTotalScore').textContent = result.totalScore;
        document.getElementById('mdqResultDescription').textContent = result.description;

        const badge = document.getElementById('mdqSeverityBadge');
        badge.textContent = result.severity;
        badge.className = 'severity-badge';

        switch (result.severityKey) {
            case 'minimal': badge.classList.add('severity-minimal'); break;
            case 'severe': badge.classList.add('severity-severe'); break;
        }

        const percentage = Math.round((result.totalScore / 13) * 100);
        document.getElementById('mdqScoreProgress').style.width = `${percentage}%`;
        document.getElementById('mdqProgressPercentage').textContent = `${percentage}%`;

        resultCard.classList.add('show');
        saveSection.classList.add('show');
    }

    function updateMdqAnswersStatus(answeredQuestions = null) {
        if (answeredQuestions === null) {
            answeredQuestions = document.querySelectorAll('#mdqForm input[type="radio"]:checked').length;
        }
        const el = document.getElementById('mdqAnswersStatus');
        if (!el) return;
        el.textContent = `تمت الإجابة على ${answeredQuestions} من 13 سؤالاً`;
        el.classList.toggle('complete', answeredQuestions === 13);
    }

    /* ============================================================
       7. Draft Auto-Save
    ============================================================ */
    function saveMdqDraft() {
        const draft = {};
        mdqQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="mdq_question_${index}"]:checked`);
            if (selected) draft[`mdq_question_${index}`] = selected.value;
        });

        storage.set('draft_mdqDraft', {
            data: draft,
            savedAt: new Date().toISOString()
        });
    }

    function restoreMdqDraft() {
        const draft = storage.get('draft_mdqDraft');
        if (!draft || !draft.data) return;

        Object.entries(draft.data).forEach(([name, value]) => {
            const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (input) {
                input.checked = true;
                input.closest('.question-item').classList.add('answered');
            }
        });

        updateMdqAnswersStatus();
    }

    /* ============================================================
       8. Init + Submit Handler
    ============================================================ */
    function doInit() {
        renderMdqQuestions();
        restoreMdqDraft();
        updateMdqAnswersStatus();

        // زر الحساب
        const calcBtn = document.getElementById('mdqCalculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculateMdqScore(true));
        }

        // إذا كان هناك نتيجة محفوظة سابقة، عرضها
        const savedResult = storage.get('mdqResult');
        if (savedResult && savedResult.totalScore !== undefined) {
            currentMdqResult = savedResult;
            displayMdqResult(savedResult);
        }

        // Submit handler
        const form = document.getElementById('mdqForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculateMdqScore(true);
                if (!result) return;

                const saveButton = document.getElementById('saveMdqButton');
                const saveButtonText = document.getElementById('saveMdqButtonText');
                const saveSpinner = document.getElementById('saveMdqSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await mockSaveResult(result);

                    storage.set('mdqResult', result);
                    storage.remove('draft_mdqDraft');
                    storage.set('mdqDraft', {
                        data: result.answers.reduce((acc, a) => {
                            acc[`mdq_question_${a.questionNumber - 1}`] = String(a.score);
                            return acc;
                        }, {}),
                        savedAt: new Date().toISOString()
                    });

                    bnConfetti.fire();
                    showToast('success', 'تم الحفظ بنجاح', `تم حفظ نتيجة اختبار MDQ. النتيجة: ${result.totalScore} من 13.`);
                } catch (error) {
                    showToast('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ نتيجة الاختبار.');
                } finally {
                    saveButton.disabled = false;
                    saveSpinner.classList.add('d-none');
                    saveButtonText.classList.remove('d-none');
                }
            });
        }

        console.log('%c✅ MDQ Tab Loaded',
            'background:#d97706;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    async function saveMdqResult(result) {
        console.log('Saving MDQ Result:', result);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();