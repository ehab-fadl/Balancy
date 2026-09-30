/* ============================================================
   Appointments.js — النسخة النهائية المصححة
============================================================ */

/* ============================================================
   1. Storage Layer
============================================================ */
const bnStorage = {
    prefix: 'balancy_',
    get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(this.prefix + key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) { return defaultValue; }
    },
    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (e) { return false; }
    }
};

/* ============================================================
   2. Safe DOM Helper
============================================================ */
const bnGet = (id) => document.getElementById(id);

/* ============================================================
   3. Toast
============================================================ */
let toastTimeout = null;

function showToast(type, title, message, duration = 3500) {
    const el = bnGet('notificationToast');
    if (!el) return;

    const icon = bnGet('toastIcon');
    const ttl = bnGet('toastTitle');
    const msg = bnGet('toastMessage');

    if (toastTimeout) clearTimeout(toastTimeout);

    el.className = 'toast-custom';
    el.classList.remove('show');

    const icons = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-circle-xmark"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>'
    };

    el.classList.add(`toast-${type}`);
    if (icon) icon.innerHTML = icons[type] || icons.info;
    if (ttl) ttl.textContent = title;
    if (msg) msg.textContent = message;

    void el.offsetWidth;
    el.classList.add('show');

    toastTimeout = setTimeout(() => el.classList.remove('show'), duration);
}

/* ============================================================
   4. Data Access
============================================================ */
function loadAppointments() {
    const visits = bnStorage.get('visits', []);
    const savedApts = bnStorage.get('appointments', []);

    const aptsFromVisits = visits
        .filter(v => v.nextDate)
        .map(v => ({
            id: `visit_${v.reason}_${v.nextDate}_${v.nextTime || ''}`,
            patientName: v.reason || 'غير محدد',
            patientId: null,
            date: v.nextDate,
            time: v.nextTime || '',
            reason: v.reason || 'متابعة',
            notes: v.notes || '',
            source: 'visits'
        }));

    return [...aptsFromVisits, ...savedApts];
}

function saveAppointment(apt) {
    const apts = bnStorage.get('appointments', []);
    apts.push(apt);
    bnStorage.set('appointments', apts);
}

function updateAppointment(id, apt) {
    const apts = bnStorage.get('appointments', []);
    const index = apts.findIndex(a => a.id === id);
    if (index >= 0) {
        apts[index] = { ...apts[index], ...apt };
        bnStorage.set('appointments', apts);
    }
}

function deleteAppointment(id) {
    const apts = bnStorage.get('appointments', []);
    const filtered = apts.filter(a => a.id !== id);
    bnStorage.set('appointments', filtered);
}

/* ============================================================
   5. Helpers
============================================================ */
function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStatus(dateStr, timeStr) {
    const today = getTodayString();
    if (!dateStr) return 'past';
    if (dateStr === today) return 'today';
    if (dateStr < today) return 'overdue';
    return 'upcoming';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]}`;
    } catch (e) { return dateStr; }
}

function formatTime(timeStr) {
    if (!timeStr) return '--:--';
    try {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h, 10);
        const period = hour >= 12 ? 'م' : 'ص';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${period}`;
    } catch (e) { return timeStr; }
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

/* ============================================================
   6. State
============================================================ */
let currentSearch = '';
let currentFilter = 'all';
let currentSort = 'dateAsc';
let currentApts = [];
let pendingDeleteId = null;

/* ============================================================
   7. Render
============================================================ */
function render() {
    const container = bnGet('appointmentsContainer');
    if (!container) return;

    let apts = [...currentApts];

    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        apts = apts.filter(a =>
            (a.patientName || '').toLowerCase().includes(q) ||
            (a.reason || '').toLowerCase().includes(q)
        );
    }

    if (currentFilter !== 'all') {
        apts = apts.filter(a => {
            const status = getStatus(a.date, a.time);
            if (currentFilter === 'today') return status === 'today';
            if (currentFilter === 'upcoming') return status === 'upcoming';
            if (currentFilter === 'overdue') return status === 'overdue';
            if (currentFilter === 'past') return status === 'past';
            return true;
        });
    }

    apts.sort((a, b) => {
        if (currentSort === 'dateAsc') return (a.date + a.time).localeCompare(b.date + b.time);
        if (currentSort === 'dateDesc') return (b.date + b.time).localeCompare(a.date + a.time);
        if (currentSort === 'nameAsc') return (a.patientName || '').localeCompare(b.patientName || '', 'ar');
        return 0;
    });

    const todayStr = getTodayString();
    const statToday = bnGet('statToday');
    const statWeek = bnGet('statWeek');
    const statMonth = bnGet('statMonth');
    const statOverdue = bnGet('statOverdue');

    if (statToday) statToday.textContent = currentApts.filter(a => a.date === todayStr).length;
    if (statWeek) statWeek.textContent = currentApts.filter(a => {
        if (!a.date) return false;
        const diff = Math.ceil((new Date(a.date) - new Date()) / 86400000);
        return diff >= 0 && diff <= 7;
    }).length;
    if (statMonth) statMonth.textContent = currentApts.filter(a => {
        if (!a.date) return false;
        const d = new Date(a.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    if (statOverdue) statOverdue.textContent = currentApts.filter(a => getStatus(a.date, a.time) === 'overdue').length;

    if (apts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-calendar-xmark"></i>
                </div>
                <h3>لا توجد مواعيد</h3>
                <p>${currentSearch || currentFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'ابدأ بإضافة موعد جديد'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    apts.forEach((apt, i) => {
        const status = getStatus(apt.date, apt.time);
        const statusText = {
            today: 'اليوم',
            upcoming: 'قادم',
            overdue: 'متأخر',
            past: 'منتهي'
        }[status];

        const card = document.createElement('div');
        card.className = `appointment-card status-${status}`;
        card.style.animationDelay = `${i * 0.04}s`;

        card.innerHTML = `
            <div class="apt-datetime">
                <div class="apt-date">${formatDate(apt.date)}</div>
                <div class="apt-time">${formatTime(apt.time)}</div>
            </div>

            <div class="apt-info">
                <p class="apt-patient">
                    <i class="fa-solid fa-user" style="color: var(--bn-primary); margin-inline-end: 0.3rem;"></i>
                    ${escapeHtml(apt.patientName || 'مريض')}
                </p>
                <p class="apt-reason">${escapeHtml(apt.reason || 'زيارة')}</p>
                <div class="apt-meta">
                    ${apt.notes ? `<span class="apt-meta-item"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(apt.notes.substring(0, 30))}${apt.notes.length > 30 ? '...' : ''}</span>` : ''}
                    ${apt.source === 'visits' ? '<span class="apt-meta-item"><i class="fa-solid fa-link"></i> من الزيارات</span>' : ''}
                </div>
            </div>

            <span class="apt-status-badge apt-status-${status}">
                <i class="fa-solid fa-circle" style="font-size: 0.4rem;"></i>
                ${statusText}
            </span>

            <div class="apt-actions">
                ${apt.source === 'visits' ? '' : `
                    <button type="button" class="apt-btn edit" data-action="edit" data-id="${apt.id}" title="تعديل">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                `}
                <button type="button" class="apt-btn delete" data-action="delete" data-id="${apt.id}" data-source="${apt.source || 'appointments'}" title="حذف">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll('.apt-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => editAppointment(btn.dataset.id));
    });
    container.querySelectorAll('.apt-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => openDeleteConfirm(btn.dataset.id));
    });
}

/* ============================================================
   8. Modal
============================================================ */
function openAddModal() {
    const editId = bnGet('editId');
    const modalTitle = bnGet('modalTitle');
    const modalSubtitle = bnGet('modalSubtitle');
    const form = bnGet('appointmentForm');
    const aptDate = bnGet('aptDate');
    const modal = bnGet('appointmentModal');

    if (editId) editId.value = '';
    if (modalTitle) modalTitle.textContent = 'إضافة موعد جديد';
    if (modalSubtitle) modalSubtitle.textContent = 'املأ البيانات التالية لحجز الموعد';
    if (form) form.reset();
    if (aptDate) aptDate.value = getTodayString();
    if (modal) modal.classList.add('show');
}

function editAppointment(id) {
    const apt = currentApts.find(a => a.id === id);
    if (!apt) return;

    const editId = bnGet('editId');
    const modalTitle = bnGet('modalTitle');
    const modalSubtitle = bnGet('modalSubtitle');
    const aptPatient = bnGet('aptPatient');
    const aptDate = bnGet('aptDate');
    const aptTime = bnGet('aptTime');
    const aptReason = bnGet('aptReason');
    const aptNotes = bnGet('aptNotes');
    const modal = bnGet('appointmentModal');

    if (editId) editId.value = id;
    if (modalTitle) modalTitle.textContent = 'تعديل الموعد';
    if (modalSubtitle) modalSubtitle.textContent = 'عدّل البيانات ثم احفظ';
    if (aptPatient) aptPatient.value = apt.patientName || '';
    if (aptDate) aptDate.value = apt.date || '';
    if (aptTime) aptTime.value = apt.time || '';
    if (aptReason) aptReason.value = apt.reason || '';
    if (aptNotes) aptNotes.value = apt.notes || '';
    if (modal) modal.classList.add('show');
}

function closeModal() {
    const modal = bnGet('appointmentModal');
    if (modal) modal.classList.remove('show');
}

/* ============================================================
   9. Delete
============================================================ */
function openDeleteConfirm(id) {
    pendingDeleteId = id;
    const apt = currentApts.find(a => a.id === id);
    const msg = bnGet('confirmMessage');
    const modal = bnGet('confirmModal');

    if (msg) msg.innerHTML = `هل أنت متأكد من حذف موعد <strong>${escapeHtml(apt?.patientName || '')}</strong>؟`;
    if (modal) modal.classList.add('show');
}

/* ============================================================
   10. Events — جميعها محمية
============================================================ */

// زر "إضافة موعد جديد"
const addBtn = bnGet('addAppointmentBtn');
if (addBtn) {
    addBtn.addEventListener('click', openAddModal);
} else {
    console.warn('⚠️ زر addAppointmentBtn غير موجود');
}

// زر "إلغاء" في المودال
const cancelButton = bnGet('cancelBtn');
if (cancelButton) {
    cancelButton.addEventListener('click', closeModal);
}

// خلفية المودال
const modal = bnGet('appointmentModal');
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'appointmentModal') closeModal();
    });
}

// نموذج الموعد
const aptForm = bnGet('appointmentForm');
if (aptForm) {
    aptForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const editId = bnGet('editId');
        const id = editId ? editId.value : '';
        const apt = {
            patientName: bnGet('aptPatient') ? bnGet('aptPatient').value.trim() : '',
            date: bnGet('aptDate') ? bnGet('aptDate').value : '',
            time: bnGet('aptTime') ? bnGet('aptTime').value : '',
            reason: bnGet('aptReason') ? bnGet('aptReason').value.trim() : '',
            notes: bnGet('aptNotes') ? bnGet('aptNotes').value.trim() : ''
        };

        if (!apt.patientName || !apt.date || !apt.time || !apt.reason) {
            showToast('error', 'حقول ناقصة', 'يرجى ملء جميع الحقول المطلوبة.');
            return;
        }

        if (id) {
            updateAppointment(id, apt);
            showToast('success', 'تم التعديل', 'تم تحديث الموعد بنجاح.');
        } else {
            apt.id = 'apt_' + Date.now();
            apt.source = 'appointments';
            saveAppointment(apt);
            showToast('success', 'تم الحفظ', 'تم إضافة الموعد بنجاح.');
        }

        closeModal();
        loadAndRender();
    });
} else {
    console.warn('⚠️ نموذج appointmentForm غير موجود');
}

// البحث
const searchEl = bnGet('searchInput');
if (searchEl) {
    searchEl.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        render();
    });
}

// فلترة
const filterStatusEl = bnGet('filterStatus');
if (filterStatusEl) {
    filterStatusEl.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        render();
    });
}

// الترتيب
const filterSortEl = bnGet('filterSort');
if (filterSortEl) {
    filterSortEl.addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
    });
}

// زر إلغاء الحذف
const confirmCancelBtn = bnGet('confirmCancel');
if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
        const confirmModalEl = bnGet('confirmModal');
        if (confirmModalEl) confirmModalEl.classList.remove('show');
        pendingDeleteId = null;
    });
}

// زر تأكيد الحذف
const confirmDeleteBtn = bnGet('confirmDelete');
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
        if (!pendingDeleteId) return;

        const apt = currentApts.find(a => a.id === pendingDeleteId);

        if (apt && apt.source === 'visits') {
            const visits = bnStorage.get('visits', []);
            const filtered = visits.filter(v => {
                return !(v.nextDate === apt.date && (v.nextTime || '') === (apt.time || ''));
            });
            bnStorage.set('visits', filtered);
            showToast('success', 'تم الحذف', 'تم حذف الموعد من الزيارات.');
        } else {
            deleteAppointment(pendingDeleteId);
            showToast('success', 'تم الحذف', 'تم حذف الموعد بنجاح.');
        }

        const confirmModalEl = bnGet('confirmModal');
        if (confirmModalEl) confirmModalEl.classList.remove('show');
        pendingDeleteId = null;
        loadAndRender();
    });
}

/* ============================================================
   11. Init
============================================================ */
function loadAndRender() {
    currentApts = loadAppointments();
    render();
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Appointments.js initialized');

    loadAndRender();

    setTimeout(() => {
        showToast('info', 'نظام المواعيد', `يوجد حالياً ${currentApts.length} موعد مسجل.`, 4000);
    }, 800);

    console.log('%c✅ Appointments Page Loaded',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
    console.log(`📅 المواعيد: ${currentApts.length}`);
});