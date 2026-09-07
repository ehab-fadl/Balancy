@if (TempData["SuccessMessage"] != null) {
         src="https://cdn.jsdelivr.net/npm/sweetalert2@11"
        
            document.addEventListener("DOMContentLoaded", function () {
                Swal.fire({
                    icon: 'success',
                    title: 'تم بنجاح!',
                    text: '@Html.Raw(TempData["SuccessMessage"])',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    didClose: () => {
                        @if (TempData["RedirectUrl"] != null)
                            {
                                <text>window.location.href = '@TempData["RedirectUrl"]';</text>
                        }
                                }
                });
            });
        
}

@if (TempData["ErrorMessage"] != null) {
        src="https://cdn.jsdelivr.net/npm/sweetalert2@11"
        
            document.addEventListener("DOMContentLoaded", function () {
                Swal.fire({
                    icon: 'error',
                    title: 'عذراً!',
                    text: '@Html.Raw(TempData["ErrorMessage"])',
                    confirmButtonText: 'حسناً'
                });
            });
       
}