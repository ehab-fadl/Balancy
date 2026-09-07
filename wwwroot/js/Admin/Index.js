//دالة البحث
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.querySelector('input[name="SearchQuery"]');
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                searchInput.form.submit();
            }, 500); // ينتظر نصف ثانية بعد توقف الكتابة ليقوم بإرسال الطلب تلقائياً
        });
    }
});
