document.addEventListener("DOMContentLoaded", function () {

    // ============================================================
    // Password Validation - تعمل على كامل الصفحة
    // ============================================================

    function validatePassword(password, elements) {

        const rules = {
            length: password.length >= 8,
            case: /[A-Z]/.test(password) && /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        updateCondition(elements.length, rules.length);
        updateCondition(elements.case, rules.case);
        updateCondition(elements.number, rules.number);
        updateCondition(elements.special, rules.special);

        return Object.values(rules).every(Boolean);
    }


    // ============================================================
    // تحديث شكل شرط كلمة المرور
    // ============================================================

    function updateCondition(element, isValid) {

        if (!element) return;

        const icon = element.querySelector("i");

        if (isValid) {

            element.classList.remove("text-danger");
            element.classList.add("text-success");

            if (icon) {
                icon.classList.remove("fa-circle");
                icon.classList.add("fa-circle-check");
            }

        } else {

            element.classList.remove("text-success");
            element.classList.add("text-danger");

            if (icon) {
                icon.classList.remove("fa-circle-check");
                icon.classList.add("fa-circle");
            }
        }
    }


    // ============================================================
    // إعداد أي نموذج Password
    // ============================================================

    function setupPasswordValidation(config) {

        const password = document.getElementById(config.passwordId);
        const confirm = document.getElementById(config.confirmId);
        const submit = document.getElementById(config.submitId);
        const matchError = document.getElementById(config.matchErrorId);

        /*
         * إذا لم يكن هذا النموذج موجوداً في الصفحة
         * نتجاهله بدون أي Error.
         */
        if (!password) return;


        function validate() {

            const passwordValue = password.value;
            const confirmValue = confirm ? confirm.value : "";


            // ----------------------------------------------------
            // 1. التحقق من شروط كلمة المرور
            // ----------------------------------------------------

            const passwordIsValid = validatePassword(
                passwordValue,
                config.conditions
            );


            // ----------------------------------------------------
            // 2. التحقق من تطابق كلمة المرور
            // ----------------------------------------------------

            const passwordsMatch =
                passwordValue.length > 0 &&
                confirmValue.length > 0 &&
                passwordValue === confirmValue;


            // ----------------------------------------------------
            // 3. رسالة عدم التطابق
            // ----------------------------------------------------

            if (matchError) {

                if (
                    confirmValue.length > 0 &&
                    !passwordsMatch
                ) {
                    matchError.classList.remove("d-none");
                } else {
                    matchError.classList.add("d-none");
                }
            }


            // ----------------------------------------------------
            // 4. تفعيل زر الإرسال
            // ----------------------------------------------------

            if (submit) {

                submit.disabled = !(
                    passwordIsValid &&
                    passwordsMatch
                );
            }
        }


        // مراقبة كلمة المرور
        password.addEventListener("input", validate);


        // مراقبة تأكيد كلمة المرور
        if (confirm) {
            confirm.addEventListener("input", validate);
        }


        // التحقق الأولي
        validate();
    }


    // ============================================================
    // 1. تغيير كلمة المرور
    // ============================================================

    setupPasswordValidation({

        passwordId: "newPasswordInput",

        confirmId: "confirmPasswordInput",

        submitId: "submitBtn",

        matchErrorId: "passwordMatchError",

        conditions: {
            length: document.getElementById("lengthCheck"),
            case: document.getElementById("caseCheck"),
            number: document.getElementById("numberCheck"),
            special: document.getElementById("specialCheck")
        }
    });


    // ============================================================
    // 2. إعادة تعيين كلمة المرور
    // ============================================================

    setupPasswordValidation({

        passwordId: "newPasswordResetInput",

        confirmId: "confirmPasswordResetInput",

        submitId: "submitResetBtn",

        matchErrorId: "passwordResetMatchError",

        conditions: {
            length: document.getElementById("lengthResetCheck"),
            case: document.getElementById("caseResetCheck"),
            number: document.getElementById("numberResetCheck"),
            special: document.getElementById("specialResetCheck")
        }
    });


    // ============================================================
    // إظهار / إخفاء كلمة المرور
    // ============================================================

    const togglePasswordBtns =
        document.querySelectorAll(".toggle-password-btn");


    togglePasswordBtns.forEach(function (btn) {

        btn.addEventListener("click", function () {

            const targetId =
                this.getAttribute("data-target");

            const passwordInput =
                document.getElementById(targetId);

            const icon =
                this.querySelector("i");


            if (!passwordInput) return;


            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                if (icon) {
                    icon.classList.remove("fa-eye-slash");
                    icon.classList.add("fa-eye");
                }

            } else {

                passwordInput.type = "password";

                if (icon) {
                    icon.classList.remove("fa-eye");
                    icon.classList.add("fa-eye-slash");
                }
            }
        });
    });


    // ============================================================
    // دالة إرسال البريد لرمز التحقق
    // ============================================================

    const forgotPasswordForm = document.getElementById("forgotPasswordForm");

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", async function (e) {
            e.preventDefault(); // منع إعادة تحميل الصفحة

            const emailInput = document.getElementById("forgotEmailInput");
            const alertContainer = document.getElementById("forgotAlertContainer");
            const submitBtn = document.getElementById("submitForgotBtn");

            if (!emailInput || !emailInput.value) {
                return;
            }

            const email = emailInput.value;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...';

            try {
                // استخراج الـ Request Verification Token الخاص بـ ASP.NET Core حماية الـ CSRF
                const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
                const headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                };

                if (tokenElement) {
                    headers["RequestVerificationToken"] = tokenElement.value;
                }

                // إرسال الطلب إلى الـ PageHandler المحدد
                const response = await fetch('?handler=ForgotPassword', {
                    method: 'POST',
                    headers: headers,
                    body: new URLSearchParams({ email: email })
                });

                const result = await response.json();

                if (result.success) {
                    // عرض رسالة النجاح
                    alertContainer.innerHTML = `
                        <div class="alert-box alert-success">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>${result.message}</span>
                        </div>`;

                    // اختيارياً: نقل البريد الإلكتروني تلقائياً إلى حقل إعادة التعيين لتسهيل المهمة على المستخدم
                    const resetEmailInput = document.getElementById("ResetInput_Email");
                    if (resetEmailInput) {
                        resetEmailInput.value = email;
                    }

                    // الانتقال تلقائياً إلى تبويب إعادة التعيين (Tab-reset) بعد نجاح الإرسال
                    setTimeout(() => {
                        const tabReset = document.getElementById("tab-reset");
                        if (tabReset) tabReset.checked = true;
                    }, 2000);

                } else {
                    // عرض رسالة الخطأ القادمة من الـ Server
                    alertContainer.innerHTML = `
                        <div class="alert-box alert-danger">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span>${result.message}</span>
                        </div>`;
                }
            } catch (error) {
                console.error("Error:", error);
                alertContainer.innerHTML = `
                    <div class="alert-box alert-danger">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.</span>
                    </div>`;
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> إرسال رمز التحقق';
            }
        });
    }

});