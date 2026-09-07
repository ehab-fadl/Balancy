document.addEventListener("DOMContentLoaded", function () {
    // مراقبة حالة الإنترنت
    window.addEventListener("offline", function () {
        showAlert("انقطع الاتصال بالإنترنت. يرجى التحقق من الشبكة والمحاولة لاحقاً.", "error");
    });

    window.addEventListener("online", function () {
        showAlert("تم استعادة الاتصال بالإنترنت.", "success");
    });

    // عرض رسالة الشبكة
    function showAlert(message, type = "error") {
        let alertBox = document.getElementById("globalNetworkAlert");
        if (!alertBox) return;

        const alertText = document.getElementById("globalNetworkAlertText");
        if (alertText) {
            alertText.textContent = message;
        }

        // تغيير اللون بناءً على الحالة (أحمر عند الانقطاع، أخضر عند العودة)
        if (type === "success") {
            alertBox.style.backgroundColor = "#198754"; // أخضر
        } else {
            alertBox.style.backgroundColor = "#dc3545"; // أحمر
        }

        alertBox.style.display = "block";

        // إخفاء الرسالة بعد 5 ثوانٍ
        setTimeout(function () {
            alertBox.style.display = "none";
        }, 5000);
    }
});