document.addEventListener("DOMContentLoaded", function () {
    // تفعيل زر إظهار/إخفاء كلمة المرور لكل العناصر التي تحمل الكلاس toggle-password
    const toggleButtons = document.querySelectorAll(".toggle-password");

    toggleButtons.forEach(button => {
        button.addEventListener("click", function () {
            // العثور على الحاوية المشتركة للأب
            const wrapper = this.closest(".input-wrapper");
            if (!wrapper) return;

            // البحث عن حقل الإدخال بداخله (سواء كان password أو text)
            const input = wrapper.querySelector("input");
            const icon = this.querySelector("i");

            if (input) {
                const isPassword = input.type === "password";

                // تبديل النوع
                input.type = isPassword ? "text" : "password";

                // تبديل الأيقونة بسلاسة
                if (icon) {
                    icon.classList.toggle("fa-eye-slash", !isPassword);
                    icon.classList.toggle("fa-eye", isPassword);
                }
            }
        });
    });
});

//دالة حفظ البيانات في حال إنقطاع الإتصال 
    document.addEventListener("DOMContentLoaded", function () {
        const emailInput = document.getElementById("Input_Email"); // استناداً لربط asp-for

    // 1. استعادة البريد المخزن محلياً إن وجد
    if (emailInput && localStorage.getItem("saved_login_email")) {
        emailInput.value = localStorage.getItem("saved_login_email");
        }

    // 2. حفظ البريد تلقائياً عند الكتابة
    if (emailInput) {
        emailInput.addEventListener("input", function () {
            localStorage.setItem("saved_login_email", emailInput.value);
        });
        }

    // 3. مسح البريد المخزن عند تسجيل الدخول بنجاح
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", function () {
            if (navigator.onLine) {
                localStorage.removeItem("saved_login_email");
            }
        });
        }
    });
