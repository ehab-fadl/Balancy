/* ============================================================
   SDS Sheehan Disability Scale Tab — Standalone Script
   يعمل مستقلاً AND يتكامل مع bnApp إذا وُجد
============================================================ */

(function initSds() {
    console.log('🚀 SDS.js initialized');

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
        if (document.getElementById('bn-sds-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'bn-sds-toast-styles';
        style.textContent = `
            .bn-sds-toast-overlay {
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
            .bn-sds-toast-overlay.show { display: flex !important; }
            .bn-sds-toast {
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
                animation: bnSdsToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                direction: rtl;
                line-height: 1.5;
                position: relative;
            }
            .bn-sds-toast.hide { animation: bnSdsToastOut 0.3s ease forwards; }
            .bn-sds-toast-icon {
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
            .bn-sds-toast-body {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
                text-align: right;
            }
            .bn-sds-toast-title { font-size: 0.95rem; font-weight: 900; }
            .bn-sds-toast-message { font-size: 0.8rem; font-weight: 600; opacity: 0.95; }
            .bn-sds-toast.error { background: linear-gradient(135deg, #ef4444, #b91c1c); }
            .bn-sds-toast.success { background: linear-gradient(135deg, #10b981, #047857); }
            .bn-sds-toast.warning { background: linear-gradient(135deg, #f59e0b, #b45309); }
            .bn-sds-toast.info { background: linear-gradient(135deg, #db2777, #be185d); }
            @keyframes bnSdsToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bnSdsToastOut {
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

        let overlay = document.getElementById('bnSdsToastOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bnSdsToastOverlay';
            overlay.className = 'bn-sds-toast-overlay';
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
        toast.className = `bn-sds-toast ${type}`;
        toast.innerHTML = `
            <div class="bn-sds-toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
            <div class="bn-sds-toast-body">
                <div class="bn-sds-toast-title">${escapeHtml(title || '')}</div>
                <div class="bn-sds-toast-message">${escapeHtml(message || '')}</div>
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
        colors: ['#db2777', '#e11d48', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'],

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
       5. SDS Data
    ============================================================ */
    const sdsQuestions = [
        {
            text: 'العمل / الدراسة',
            description: 'إلى أي درجة تعطلت أنشطتك المهنية أو الدراسية؟'
        },
        {
            text: 'الحياة الاجتماعية / أوقات الفراغ',
            description: 'إلى أي درجة تعطلت أنشطتك الاجتماعية والترفيهية؟'
        },
        {
            text: 'الحياة العائلية / المسؤوليات المنزلية',
            description: 'إلى أي درجة تعطلت مسؤولياتك الأسرية والمنزلية؟'
        }
    ];

    let currentSdsResult = null;

    /* ============================================================
       6. Render Questions
    ============================================================ */
    function renderSdsQuestions() {
        const container = document.getElementById('sdsQuestionsContainer');
        if (!container) return;
        container.innerHTML = '';

        sdsQuestions.forEach((question, questionIndex) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.style.animation = `sds-slideUpFade 0.4s ease ${questionIndex * 0.08}s both`;

            let optionsHtml = '';
            for (let i = 0; i <= 10; i++) {
                const optionId = `sds_question_${questionIndex}_${i}`;
                optionsHtml += `
                    <div class="answer-option">
                        <input type="radio" name="sds_question_${questionIndex}" id="${optionId}" value="${i}">
                        <label for="${optionId}" class="answer-label">
                            <span class="answer-text">${i}</span>
                        </label>
                    </div>
                `;
            }

            questionElement.innerHTML = `
                <div class="question-header">
                    <div class="question-number">${questionIndex + 1}</div>
                    <div class="question-text">
                        <div style="font-weight:900; margin-bottom:0.35rem;">${question.text}</div>
                        <div style="font-weight:600; font-size:0.85rem; color:var(--bn-text-soft);">${question.description}</div>
                    </div>
                </div>
                <div class="answers-grid">${optionsHtml}</div>
                <div class="scale-labels">
                    <span><i class="fa-solid fa-circle ms-1" style="font-size:0.5rem; color: var(--bn-success);"></i> لا تأثير (0)</span>
                    <span>تأثير شديد للغاية (10) <i class="fa-solid fa-circle ms-1" style="font-size:0.5rem; color: var(--bn-danger);"></i></span>
                </div>
            `;
            container.appendChild(questionElement);
        });

        addSdsAnswerListeners();
    }

    function addSdsAnswerListeners() {
        document.querySelectorAll('#sdsForm input[type="radio"]').forEach(input => {
            input.addEventListener('change', function () {
                this.closest('.question-item').classList.add('answered');
                updateSdsAnswersStatus();
                calculateSdsScore(false);
                saveSdsDraft();
            });
        });
    }

    /* ============================================================
       7. Score Calculation
    ============================================================ */
    function calculateSdsScore(forceDisplay = true) {
        let totalScore = 0, answeredQuestions = 0;
        const answers = [];

        sdsQuestions.forEach((question, index) => {
            const selected = document.querySelector(`input[name="sds_question_${index}"]:checked`);
            if (selected) {
                const score = parseInt(selected.value);
                totalScore += score;
                answeredQuestions++;
                answers.push({
                    questionNumber: index + 1,
                    question: question.text,
                    score
                });
            }
        });

        updateSdsAnswersStatus(answeredQuestions);

        if (answeredQuestions < 3) {
            if (forceDisplay) showToast('warning', 'إجابات غير مكتملة', `يرجى الإجابة على جميع الأسئلة. تمت الإجابة على ${answeredQuestions} من 3.`);
            return null;
        }

        const severity = getSdsSeverity(totalScore);
        currentSdsResult = {
            totalScore,
            severity: severity.name,
            severityKey: severity.key,
            description: severity.description,
            answers,
            testType: 'SDS',
            completedAt: new Date().toISOString()
        };

        displaySdsResult(currentSdsResult);
        return currentSdsResult;
    }

    function getSdsSeverity(score) {
        if (score <= 3) return {
            key: 'minimal',
            name: 'إعاقة خفيفة جداً أو معدومة',
            description: 'الأنشطة اليومية غير متأثرة بشكل ملحوظ.'
        };
        if (score <= 12) return {
            key: 'mild',
            name: 'إعاقة طفيفة',
            description: 'تأثير طفيف على الأداء الوظيفي أو الاجتماعي.'
        };
        if (score <= 20) return {
            key: 'moderate',
            name: 'إعاقة متوسطة',
            description: 'تعطيل واضح في مجالات الحياة المختلفة.'
        };
        return {
            key: 'severe',
            name: 'إعاقة شديدة وعالية',
            description: 'تعطيل شديد ومؤثر للغاية في الأداء.'
        };
    }

    function displaySdsResult(result) {
        const resultCard = document.getElementById('sdsResultCard');
        const saveSection = document.getElementById('sdsSaveSection');

        document.getElementById('sdsTotalScore').textContent = result.totalScore;
        document.getElementById('sdsResultDescription').textContent = result.description;

        const badge = document.getElementById('sdsSeverityBadge');
        badge.textContent = result.severity;
        badge.className = 'severity-badge';

        switch (result.severityKey) {
            case 'minimal': badge.classList.add('severity-minimal'); break;
            case 'mild': badge.classList.add('severity-mild'); break;
            case 'moderate': badge.classList.add('severity-moderate'); break;
            case 'severe': badge.classList.add('severity-severe'); break;
        }

        const percentage = Math.round((result.totalScore / 30) * 100);
        document.getElementById('sdsScoreProgress').style.width = `${percentage}%`;
        document.getElementById('sdsProgressPercentage').textContent = `${percentage}%`;

        resultCard.classList.add('show');
        saveSection.classList.add('show');
    }

    function updateSdsAnswersStatus(answeredQuestions = null) {
        if (answeredQuestions === null) {
            answeredQuestions = document.querySelectorAll('#sdsForm input[type="radio"]:checked').length;
        }
        const el = document.getElementById('sdsAnswersStatus');
        if (!el) return;
        el.textContent = `تمت الإجابة على ${answeredQuestions} من 3 أسئلة`;
        el.classList.toggle('complete', answeredQuestions === 3);
    }

    /* ============================================================
       8. Draft Auto-Save
    ============================================================ */
    function saveSdsDraft() {
        const draft = {};
        sdsQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="sds_question_${index}"]:checked`);
            if (selected) draft[`sds_question_${index}`] = selected.value;
        });

        storage.set('draft_sdsDraft', {
            data: draft,
            savedAt: new Date().toISOString()
        });
    }

    function restoreSdsDraft() {
        const draft = storage.get('draft_sdsDraft');
        if (!draft || !draft.data) return;

        Object.entries(draft.data).forEach(([name, value]) => {
            const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (input) {
                input.checked = true;
                input.closest('.question-item').classList.add('answered');
            }
        });

        updateSdsAnswersStatus();
    }

    /* ============================================================
       9. Init + Submit Handler
    ============================================================ */
    function doInit() {
        renderSdsQuestions();
        restoreSdsDraft();
        updateSdsAnswersStatus();

        // زر الحساب
        const calcBtn = document.getElementById('sdsCalculateButton');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => calculateSdsScore(true));
        }

        // إذا كان هناك نتيجة محفوظة سابقة، عرضها
        const savedResult = storage.get('sdsResult');
        if (savedResult && savedResult.totalScore !== undefined) {
            currentSdsResult = savedResult;
            displaySdsResult(savedResult);
        }

        // Submit handler
        const form = document.getElementById('sdsForm');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const result = calculateSdsScore(true);
                if (!result) return;

                const saveButton = document.getElementById('saveSdsButton');
                const saveButtonText = document.getElementById('saveSdsButtonText');
                const saveSpinner = document.getElementById('saveSdsSpinner');

                saveButton.disabled = true;
                saveButtonText.classList.add('d-none');
                saveSpinner.classList.remove('d-none');

                try {
                    await mockSaveResult(result);

                    storage.set('sdsResult', result);
                    storage.remove('draft_sdsDraft');
                    storage.set('sdsDraft', {
                        data: result.answers.reduce((acc, a) => {
                            acc[`sds_question_${a.questionNumber - 1}`] = String(a.score);
                            return acc;
                        }, {}),
                        savedAt: new Date().toISOString()
                    });

                    bnConfetti.fire();
                    showToast('success', 'تم الحفظ بنجاح', `تم حفظ نتيجة مقياس SDS. النتيجة: ${result.totalScore} من 30.`);
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
            showToast('info', 'مقياس SDS', 'قيّم درجة الإعاقة الوظيفية في مجالات العمل والحياة الاجتماعية والعائلية.', 5000);
        }, 1000);

        console.log('%c✅ SDS Tab Loaded',
            'background:#db2777;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    }

    async function mockSaveResult(result) {
        console.log('Saving SDS Result:', result);
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 800));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        setTimeout(doInit, 50);
    }
})();