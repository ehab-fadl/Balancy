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
       2. Utilities — escapeHtml (مبكّر)
    ============================================================ */
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    /* ============================================================
       3. Toast — نظام مدمج مضمون العمل
    ============================================================ */
    function ensureToastStyles() {
        if (document.getElementById('bn-mdq-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-mdq-toast-styles';
        style.textContent = `
            .bn-mdq-toast-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 2147483647 !important;
                pointer-events: none;
                padding: 1rem;
                margin: 0 !important;
            }
            .bn-mdq-toast-overlay.show { display: flex !important; }
            .bn-mdq-toast {
                min-width: 300px;
                max-width: 92vw;
                padding: 1.1rem 1.4rem;
                border-radius: 16px;
                display: flex;
                align-items: center;
                gap: 0.85rem;
                font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
                font-weight: 800;
                font-size: 0.95rem;
                color: #fff;
                box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.55);
                animation: bnMdqToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                direction: rtl;
                line-height: 1.5;
                position: relative;
            }
            .bn-mdq-toast.hide { animation: bnMdqToastOut 0.3s ease forwards; }
            .bn-mdq-toast-icon {
                width: 38px;
                height: 38px;
                min-width: 38px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.22);
                font-size: 1.05rem;
            }
            .bn-mdq-toast-body {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
                text-align: right;
            }
            .bn-mdq-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-mdq-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-mdq-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-mdq-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-mdq-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-mdq-toast.info { background: linear-gradient(135deg, #d97706, #b45309); }
            @keyframes bnMdqToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnMdqToastOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-20px) scale(0.92); }
            }
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

        let overlay = document.getElementById('bnMdqToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnMdqToastOverlay';
            overlay.className = 'bn-mdq-toast-overlay';
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
        toast.className = `bn-mdq-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-mdq-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-mdq-toast-body">
                <div class="bn-mdq-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-mdq-toast-message">${escapeHtml(message || '')}</div>
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

    /**
     * showToast — يستخدم النظام المدمج مباشرة (مضمون)
     */
    const showToast = showBuiltInToast;

    /* ============================================================
       4. Confetti
    ============================================================ */
    const bnConfetti = {
        el: null,
        colors: ['#d97706', '#f59e0b', '#fbbf24', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'],

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

            const pieceCount = 60;

            for (let i = 0; i < pieceCount; i++) {
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
       5. MDQ Data
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
       6. Render Questions
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
       7. Score Calculation
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
       8. Draft Auto-Save
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
       9. Mock Save
    ============================================================ */
    async function mockSaveResult(result) {
        console.log('Saving MDQ Result:', result);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    /* ============================================================
       10. Init + Submit Handler
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

        // ✅ إشعار ترحيبي
        setTimeout(() => {
            showToast('info', 'اختبار MDQ', 'أجب على الأسئلة الـ 13 لتقييم احتمالية اضطراب ثنائي القطب. يتم الحفظ التلقائي لكل إجابة.', 5000);
        }, 1000);

        console.log('%c✅ MDQ Tab Loaded',
            'background:#d97706;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();