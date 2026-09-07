//دالة شروط كلمة السر 
document.addEventListener("DOMContentLoaded", function () {
    const passwordInput = document.getElementById("passwordInput");

    if (!passwordInput) return; // الحماية في حال لم يكن في الصفحة الحالية

    const ruleLength = document.getElementById("rule-length");
    const iconLength = document.getElementById("icon-length");
    const ruleUpper = document.getElementById("rule-upper");
    const iconUpper = document.getElementById("icon-upper");
    const ruleLower = document.getElementById("rule-lower");
    const iconLower = document.getElementById("icon-lower");
    const ruleNumber = document.getElementById("rule-number");
    const iconNumber = document.getElementById("icon-number");

    passwordInput.addEventListener("input", function () {
        const val = passwordInput.value;

        // 1. شرط 8 أحرف على الأقل
        if (val.length >= 8) {
            ruleLength.style.color = "#10b981"; // أخضر
            iconLength.className = "fa-solid fa-check";
        } else {
            ruleLength.style.color = "#6b7280"; // رمادي افتراضي
            iconLength.className = "fa-solid fa-circle-xmark";
        }

        // 2. شرط حرف كبير (A-Z)
        if (/[A-Z]/.test(val)) {
            ruleUpper.style.color = "#10b981";
            iconUpper.className = "fa-solid fa-check";
        } else {
            ruleUpper.style.color = "#6b7280";
            iconUpper.className = "fa-solid fa-circle-xmark";
        }

        // 3. شرط حرف صغير (a-z)
        if (/[a-z]/.test(val)) {
            ruleLower.style.color = "#10b981";
            iconLower.className = "fa-solid fa-check";
        } else {
            ruleLower.style.color = "#6b7280";
            iconLower.className = "fa-solid fa-circle-xmark";
        }

        // 4. شرط رقم (0-9)
        if (/[0-9]/.test(val)) {
            ruleNumber.style.color = "#10b981";
            iconNumber.className = "fa-solid fa-check";
        } else {
            ruleNumber.style.color = "#6b7280";
            iconNumber.className = "fa-solid fa-circle-xmark";
        }
    });
});


//دالة مطابقة كلمة السر 
document.addEventListener("DOMContentLoaded", function () {
    const passwordInput = document.getElementById("passwordInput"); // تأكد أن حقل كلمة المرور الأساسي لديه id="passwordInput"
    const confirmInput = document.getElementById("confirmPassword"); // مطابق للـ HTML لديك
    const submitBtn = document.getElementById("submitBtn");         // زر التسجيل
    const matchErrorSpan = document.getElementById("err-confirm");   // مطابق للـ HTML لديك

    if (!passwordInput || !confirmInput) return;

    function validateMatch() {
        const val = passwordInput.value;
        const confirmVal = confirmInput.value;

        // إذا كان حقل التأكيد فارغاً، نخفي الرسالة واللون الأحمر
        if (confirmVal === "") {
            if (matchErrorSpan) {
                matchErrorSpan.style.display = "none";
                matchErrorSpan.textContent = "";
            }
            confirmInput.classList.remove("is-invalid");
            if (submitBtn) submitBtn.setAttribute("disabled", "true");
            return;
        }

        // إذا تطابقت الكلمتان تماماً
        if (val === confirmVal) {
            if (matchErrorSpan) {
                matchErrorSpan.style.display = "none";
                matchErrorSpan.textContent = "";
            }
            confirmInput.classList.remove("is-invalid");
            if (submitBtn) submitBtn.removeAttribute("disabled"); // تفعيل زر التسجيل
        }
        // إذا اختلفتا (غير متطابقتان)
        else {
            if (matchErrorSpan) {
                matchErrorSpan.style.display = "block"; // إظهار العنصر
                matchErrorSpan.style.color = "red";     // اللون أحمر
                matchErrorSpan.textContent = "كلمتا المرور غير متطابقتين."; // النص باللون الأحمر
            }
            confirmInput.classList.add("is-invalid");     // إطار أحمر حول الحقل إن أردت
            if (submitBtn) submitBtn.setAttribute("disabled", "true"); // تعطيل الزر
        }
    }

    passwordInput.addEventListener("input", validateMatch);
    confirmInput.addEventListener("input", validateMatch);
});


// ----------------------------------------------------
// 1. دالة إظهار وإخفاء كلمة السر (Toggle Password)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {

    function setupPasswordToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);

        if (!btn || !input) return;

        btn.addEventListener("click", function (e) {
            e.preventDefault();

            const icon = btn.querySelector("i");

            if (input.type === "password") {
                input.type = "text";
                if (icon) {
                    icon.classList.remove("fa-eye-slash");
                    icon.classList.add("fa-eye");
                }
            } else {
                input.type = "password";
                if (icon) {
                    icon.classList.remove("fa-eye");
                    icon.classList.add("fa-eye-slash");
                }
            }
        });
    }

    // تفعيل الأزرار للحقلين الجديدين
    setupPasswordToggle("togglePasswordBtn", "passwordInput");
    setupPasswordToggle("toggleConfirmPasswordBtn", "confirmPassword");

});

//دالة حفظ البيانات بعد إنقطاع الإتصال
document.addEventListener("DOMContentLoaded", function () {
    const formId = "registerForm";
    const form = document.getElementById(formId);

    if (form) {
        const fields = ["firstName", "lastName", "email", "phone"];

        // 1. استعادة البيانات المخزنة محلياً عند فتح الصفحة
        fields.forEach(id => {
            const input = document.getElementById(id);
            const savedValue = localStorage.getItem("reg_" + id);
            if (input && savedValue && !input.value) {
                input.value = savedValue;
                // إطلاق حدث الإدخال ليتم تفعيل فحص صحة الشروط إن وجد
                input.dispatchEvent(new Event('input'));
            }
        });

        // 2. حفظ البيانات تلقائياً في LocalStorage كلما كتب المستخدم شيئاً
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener("input", function () {
                    localStorage.setItem("reg_" + id, input.value);
                });
            }
        });

        // 3. مسح البيانات المحفوظة محلياً فقط عند إرسال النموذج بنجاح (إذا كان الإنترنت متصلاً)
        form.addEventListener("submit", function () {
            if (navigator.onLine) {
                fields.forEach(id => localStorage.removeItem("reg_" + id));
            }
        });
    }
});