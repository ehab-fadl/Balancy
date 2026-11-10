/* ============================================================
   0. Safe DOM Helpers
============================================================ */
const bnGet = (id) => document.getElementById(id);
const bnOn = (id, event, handler) => {
    const el = bnGet(id);
    if (el) el.addEventListener(event, handler);
};
const bnSetText = (id, text) => {
    const el = bnGet(id);
    if (el) el.textContent = text;
};

/* ============================================================
   1. Theme
============================================================ */
const bnTheme = {
    init() { this.apply(localStorage.getItem('balancy_theme') || 'light'); },
    apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('balancy_theme', t);
    },
    toggle() {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        this.apply(next);
        return next;
    }
};

/* ============================================================
   2. Toast
============================================================ */
let toastTimeoutId = null, toastHideTimeoutId = null;

function showToast(type, title, message, duration = 3500) {
    const el = bnGet('notificationToast');
    if (!el) return;

    const icon = bnGet('toastIcon');
    const ttl = bnGet('toastTitle');
    const msg = bnGet('toastMessage');
    const bar = bnGet('toastProgressBar');

    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    if (toastHideTimeoutId) clearTimeout(toastHideTimeoutId);

    el.className = 'toast toast-custom';
    el.classList.remove('show', 'hiding');

    if (type === 'success') {
        el.classList.add('toast-success');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else if (type === 'error') {
        el.classList.add('toast-error');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    } else if (type === 'warning') {
        el.classList.add('toast-warning');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
        el.classList.add('toast-info');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }

    if (ttl) ttl.textContent = title;
    if (msg) msg.textContent = message;

    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '100%';
    }

    void el.offsetWidth;
    el.classList.add('show');

    if (bar) {
        setTimeout(() => {
            bar.style.transition = `width ${duration}ms linear`;
            bar.style.width = '0%';
        }, 50);
    }

    toastTimeoutId = setTimeout(hideToast, duration);
}

function hideToast() {
    const el = bnGet('notificationToast');
    if (!el || !el.classList.contains('show')) return;
    el.classList.add('hiding');
    toastHideTimeoutId = setTimeout(() => el.classList.remove('show', 'hiding'), 280);
}

/* ============================================================
   3. Confetti
============================================================ */
const bnConfetti = {
    colors: ['#0891b2', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'],
    fire(duration = 2000) {
        const el = bnGet('bnConfetti');
        if (!el) return;
        el.innerHTML = '';
        el.classList.add('active');
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 0.5 + 's';
            p.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
            p.style.background = this.colors[Math.floor(Math.random() * this.colors.length)];
            p.style.transform = `rotate(${Math.random() * 360}deg)`;
            el.appendChild(p);
        }
        setTimeout(() => {
            el.classList.remove('active');
            el.innerHTML = '';
        }, duration);
    }
};

/* ============================================================
   4. API Client
============================================================ */
const bnEndpoints = window.BALANCY_ENDPOINTS || {
    patients: '?handler=Patients',
    patient: '?handler=Patient',
    deletePatient: '?handler=DeletePatient',
    patientFile: '/Doctor'
};

const bnApi = {
    async _request(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', ...(options.headers || {}) },
            ...options
        });

        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }

        if (!res.ok) {
            const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
            const e = new Error(msg);
            e.status = res.status;
            throw e;
        }
        return data;
    },

    async getPatients() {
        const data = await this._request(bnEndpoints.patients);
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.patients)) return data.patients;
        return [];
    },

    async deletePatient(id) {
        if (!id) throw new Error('معرّف المريض مطلوب');
        const sep = bnEndpoints.deletePatient.includes('?') ? '&' : '?';
        const url = `${bnEndpoints.deletePatient}${sep}id=${encodeURIComponent(id)}`;
        console.log('🌐 Delete request (POST) →', url);

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'fetch'
        };

        // ✅ إضافة Antiforgery token إذا كان متوفراً
        if (window.BALANCY_ANTIFORGERY) {
            headers['RequestVerificationToken'] = window.BALANCY_ANTIFORGERY;
        }

        try {
            return await this._request(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ id: String(id) })
            });
        } catch (err) {
            const status = err?.status || 0;
            if (status === 405) throw new Error('العملية غير مسموحة — OnPostDeletePatientAsync غير موجود');
            if (status === 404) throw new Error('المريض غير موجود — قد يكون محذوفاً مسبقاً');
            if (status === 403) throw new Error('غير مصرّح بحذف هذا المريض');
            if (status === 401) throw new Error('جلسة غير صالحة — أعد تسجيل الدخول');
            if (status === 400) throw new Error('طلب غير صالح — قد يكون Antiforgery Token مفقوداً');
            if (status === 502) throw new Error('تعذر الاتصال بخدمة المرضى');
            if (status >= 500) throw new Error(`خطأ في الخادم: ${err.message || status}`);
            throw err;
        }
    }
};

/* ============================================================
   5. Mapper
============================================================ */
function pickValue(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) {
        const v = obj[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
}

function pickString(obj, keys) {
    const v = pickValue(obj, keys);
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') {
        return String(v.name ?? v.Name ?? v.text ?? v.Text ?? v.title ?? v.Title ?? v.value ?? v.Value ?? '');
    }
    return String(v);
}

function pickNumber(obj, keys, fallback = 0) {
    const v = pickValue(obj, keys);
    if (v === undefined || v === null || v === '') return fallback;
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        return isNaN(n) ? fallback : n;
    }
    if (typeof v === 'object') {
        const n = v.count ?? v.Count ?? v.total ?? v.Total ?? v.value ?? v.Value ?? v.length ?? v.Length;
        if (typeof n === 'number') return n;
    }
    return fallback;
}

function pickDate(obj, keys) {
    const v = pickValue(obj, keys);
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
        const y = v.year ?? v.Year;
        const m = v.month ?? v.Month;
        const d = v.day ?? v.Day;
        if (y && m && d) {
            return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        return null;
    }
    return null;
}

function extractFromObject(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const candidates = [
        'name', 'Name', 'text', 'Text', 'title', 'Title', 'value', 'Value',
        'label', 'Label', 'displayName', 'DisplayName',
        'mainType', 'MainType', 'subType', 'SubType',
        'diagnosisType', 'DiagnosisType', 'description', 'Description',
        'code', 'Code', 'icdCode', 'IcdCode', 'icd10Code', 'Icd10Code'
    ];
    for (const key of candidates) {
        const v = obj[key];
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'number') return String(v);
        if (typeof v === 'object' && !Array.isArray(v)) {
            const inner = extractFromObject(v);
            if (inner) return inner;
        }
    }
    const main = obj.mainType ?? obj.MainType;
    const sub = obj.subType ?? obj.SubType;
    if (main && sub) return `${main} - ${sub}`;
    if (main) return String(main);
    return '';
}

function extractFromArray(arr) {
    for (const item of arr) {
        if (!item) continue;
        if (typeof item === 'string') {
            const s = item.trim();
            if (s) return s;
        }
        if (typeof item === 'object') {
            const fromObj = extractFromObject(item);
            if (fromObj) return fromObj;
        }
    }
    return '';
}

function extractDiagnosis(raw, nested) {
    const directKeys = [
        'diagnosis', 'Diagnosis', 'primaryDiagnosis', 'PrimaryDiagnosis',
        'mainDiagnosis', 'MainDiagnosis', 'currentDiagnosis', 'CurrentDiagnosis',
        'lastDiagnosis', 'LastDiagnosis', 'latestDiagnosis', 'LatestDiagnosis',
        'diagnosisName', 'DiagnosisName', 'diagnosisTitle', 'DiagnosisTitle',
        'diagnosisType', 'DiagnosisType', 'mainType', 'MainType',
        'disorder', 'Disorder', 'condition', 'Condition', 'primaryCondition', 'PrimaryCondition'
    ];
    for (const key of directKeys) {
        const v = raw[key];
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v === 'object' && !Array.isArray(v)) {
            const fromObj = extractFromObject(v);
            if (fromObj) return fromObj;
        }
        if (Array.isArray(v) && v.length > 0) {
            const fromArr = extractFromArray(v);
            if (fromArr) return fromArr;
        }
    }
    const arrayKeys = [
        'diagnoses', 'Diagnoses', 'patientDiagnoses', 'PatientDiagnoses',
        'diagnosisList', 'DiagnosisList', 'medicalDiagnoses', 'MedicalDiagnoses',
        'conditions', 'Conditions'
    ];
    for (const key of arrayKeys) {
        const v = raw[key];
        if (Array.isArray(v) && v.length > 0) {
            const fromArr = extractFromArray(v);
            if (fromArr) return fromArr;
        }
    }
    if (nested && typeof nested === 'object') {
        for (const key of directKeys) {
            const v = nested[key];
            if (v === undefined || v === null || v === '') continue;
            if (typeof v === 'string') return v.trim();
            if (typeof v === 'object' && !Array.isArray(v)) {
                const fromObj = extractFromObject(v);
                if (fromObj) return fromObj;
            }
            if (Array.isArray(v) && v.length > 0) {
                const fromArr = extractFromArray(v);
                if (fromArr) return fromArr;
            }
        }
    }
    return '';
}

function mapApiPatient(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const id = pickValue(raw, ['id', 'Id', 'patientId', 'PatientId']);
    if (!id) return null;

    const nested = raw.patientPersonalInfo ?? raw.PatientPersonalInfo ?? raw.personalInfo ?? raw.PersonalInfo ?? {};
    const fullName = pickString(raw, ['fullName', 'FullName', 'name', 'Name']) ||
        pickString(nested, ['fullName', 'FullName', 'name', 'Name']) || '';
    const nameParts = fullName.split(/\s+/).filter(Boolean);

    const firstName = pickString(raw, ['firstName', 'FirstName', 'givenName', 'GivenName']) ||
        pickString(nested, ['firstName', 'FirstName']) || nameParts[0] || '';
    const lastName = pickString(raw, ['lastName', 'LastName', 'familyName', 'FamilyName', 'surname', 'Surname']) ||
        pickString(nested, ['lastName', 'LastName']) || nameParts.slice(1).join(' ') || '';

    const statusRaw = pickString(raw, ['status', 'Status', 'patientStatus', 'PatientStatus']) || 'active';
    let status = statusRaw.toLowerCase();
    if (['active', 'نشط'].includes(status)) status = 'active';
    else if (['critical', 'حرج', 'danger', 'high'].includes(status)) status = 'critical';
    else if (['inactive', 'غير نشط', 'paused'].includes(status)) status = 'inactive';

    const riskRaw = pickString(raw, ['riskLevel', 'RiskLevel', 'risk', 'Risk', 'riskCategory', 'RiskCategory']) || 'low';
    let riskLevel = riskRaw.toLowerCase();
    if (['high', 'مرتفع', 'critical', 'severe'].includes(riskLevel)) riskLevel = 'high';
    else if (['medium', 'متوسط', 'moderate'].includes(riskLevel)) riskLevel = 'medium';
    else riskLevel = 'low';

    const diagnosis = extractDiagnosis(raw, nested);

    const medicationsCount = pickNumber(raw, [
        'medications', 'Medications', 'medicationsCount', 'MedicationsCount',
        'activeMedications', 'ActiveMedications', 'activeMedicationsCount', 'ActiveMedicationsCount',
        'medicationCount', 'MedicationCount', 'currentMedicationsCount', 'CurrentMedicationsCount'
    ], 0);

    const visitsCount = pickNumber(raw, [
        'visits', 'Visits', 'visitsCount', 'VisitsCount',
        'totalVisits', 'TotalVisits', 'visitCount', 'VisitCount'
    ], 0);

    const lastVisit = pickDate(raw, [
        'lastVisit', 'LastVisit', 'lastVisitDate', 'LastVisitDate',
        'lastVisitAt', 'LastVisitAt', 'mostRecentVisit', 'MostRecentVisit'
    ]);

    const nextVisit = pickDate(raw, [
        'nextVisit', 'NextVisit', 'nextVisitDate', 'NextVisitDate',
        'nextAppointment', 'NextAppointment', 'upcomingAppointment', 'UpcomingAppointment',
        'nextAppointmentDate', 'NextAppointmentDate'
    ]);

    const age = pickNumber(raw, ['age', 'Age'], 0);
    const genderRaw = pickString(raw, ['gender', 'Gender', 'sex', 'Sex']).toLowerCase();

    return {
        id: id,
        firstName: firstName,
        lastName: lastName,
        code: pickString(raw, ['patientCode', 'PatientCode', 'code', 'Code']) ||
            pickString(nested, ['patientCode', 'PatientCode', 'code', 'Code']) || '',
        age: age || null,
        dateOfBirth: pickDate(raw, ['dateOfBirth', 'DateOfBirth', 'birthDate', 'BirthDate']) ||
            pickDate(nested, ['dateOfBirth', 'DateOfBirth', 'birthDate', 'BirthDate']),
        gender: genderRaw || null,
        phone: pickString(raw, ['phone', 'Phone', 'phoneNumber', 'PhoneNumber', 'mobile', 'Mobile']) ||
            pickString(nested, ['phone', 'Phone', 'phoneNumber', 'PhoneNumber']) || '',
        email: pickString(raw, ['email', 'Email', 'emailAddress', 'EmailAddress']) ||
            pickString(nested, ['email', 'Email']) || '',
        city: pickString(raw, ['city', 'City', 'town', 'Town']) ||
            pickString(nested, ['city', 'City']) || '',
        address: pickString(raw, ['address', 'Address', 'street', 'Street']) ||
            pickString(nested, ['address', 'Address']) || '',
        maritalStatus: pickString(raw, ['maritalStatus', 'MaritalStatus', 'marriageStatus', 'MarriageStatus']) ||
            pickString(nested, ['maritalStatus', 'MaritalStatus']) || '',
        status: status,
        diagnosis: diagnosis,
        medications: medicationsCount,
        visits: visitsCount,
        lastVisit: lastVisit,
        nextVisit: nextVisit,
        riskLevel: riskLevel,
        createdAt: pickDate(raw, ['createdAt', 'CreatedAt', 'registrationDate', 'RegistrationDate', 'createdDate', 'CreatedDate'])
    };
}

/* ============================================================
   6. State
============================================================ */
let allPatients = [];
let filteredPatients = [];
let currentView = 'grid';
let pendingDeleteId = null;
let currentDetailsPatientId = null;
let isLoading = false;
let isDeleting = false;

/* ============================================================
   7. Utilities
============================================================ */
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}
function getInitials(f, l) { return (f?.charAt(0) || '') + (l?.charAt(0) || ''); }
function getGenderText(g) { return g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : '-'; }
function getStatusText(s) { return { active: 'نشط', critical: 'حرج', inactive: 'غير نشط' }[s] || 'غير معروف'; }
function getStatusIcon(s) { return { active: 'fa-circle-check', critical: 'fa-triangle-exclamation', inactive: 'fa-circle-pause' }[s] || 'fa-circle'; }
function formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}
function getRiskBadgeClass(l) { return { high: 'danger', medium: 'warning', low: 'success' }[l] || 'primary'; }
function getRiskText(l) { return { high: 'مرتفع', medium: 'متوسط', low: 'منخفض' }[l] || 'غير محدد'; }

/* ============================================================
   8. Statistics
============================================================ */
function updateStatistics() {
    const total = allPatients.length;
    const active = allPatients.filter(p => p.status === 'active').length;
    const critical = allPatients.filter(p => p.status === 'critical').length;

    const now = new Date();
    const visitsThisMonth = allPatients.filter(p => {
        if (!p.lastVisit) return false;
        const d = new Date(p.lastVisit);
        return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    bnSetText('statTotal', total);
    bnSetText('statActive', active);
    bnSetText('statCritical', critical);
    bnSetText('statVisits', visitsThisMonth);
}

/* ============================================================
   9. Filters
============================================================ */
function applyFilters() {
    const searchEl = bnGet('globalSearch');
    const genderEl = bnGet('filterGender');
    const statusEl = bnGet('filterStatus');
    const sortEl = bnGet('filterSort');

    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const g = genderEl ? genderEl.value : '';
    const s = statusEl ? statusEl.value : '';
    const sort = sortEl ? sortEl.value : 'name';

    filteredPatients = allPatients.filter(p => {
        const mQ = !q ||
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            (p.code && String(p.code).toLowerCase().includes(q)) ||
            (p.phone && String(p.phone).toLowerCase().includes(q)) ||
            (p.city && String(p.city).toLowerCase().includes(q));
        const mG = !g || p.gender === g;
        const mS = !s || p.status === s;
        return mQ && mG && mS;
    });

    filteredPatients.sort((a, b) => {
        switch (sort) {
            case 'name': return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'ar');
            case 'nameDesc': return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`, 'ar');
            case 'dateNewest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case 'dateOldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            case 'ageAsc': return (a.age || 0) - (b.age || 0);
            case 'ageDesc': return (b.age || 0) - (a.age || 0);
            default: return 0;
        }
    });

    render();
    updateResultsText();
    toggleResetButton();
}

function updateResultsText() {
    const count = filteredPatients.length;
    const total = allPatients.length;
    let text = '';
    if (isLoading) text = 'جاري تحميل المرضى...';
    else if (count === total && total > 0) text = `عرض جميع المرضى (${count})`;
    else if (total === 0) text = 'لا يوجد مرضى مسجّلون بعد';
    else if (count === 0) text = 'لا توجد نتائج مطابقة';
    else text = `عرض ${count} من أصل ${total} مريض`;
    bnSetText('resultsText', text);
}

function toggleResetButton() {
    const searchEl = bnGet('globalSearch');
    const genderEl = bnGet('filterGender');
    const statusEl = bnGet('filterStatus');
    const sortEl = bnGet('filterSort');

    const has = (searchEl && searchEl.value.trim() !== '') ||
        (genderEl && genderEl.value !== '') ||
        (statusEl && statusEl.value !== '') ||
        (sortEl && sortEl.value !== 'name');

    const btn = bnGet('resetFilters');
    if (btn) btn.classList.toggle('d-none', !has);
}

/* ============================================================
   10. Render
============================================================ */
function render() {
    const grid = bnGet('patientsGrid');
    const tbody = bnGet('patientsTableBody');
    const empty = bnGet('emptyState');
    const gridView = bnGet('patientsGridView');
    const tableView = bnGet('patientsTableView');

    if (filteredPatients.length === 0) {
        if (grid) grid.innerHTML = '';
        if (tbody) tbody.innerHTML = '';
        if (empty) empty.classList.remove('d-none');
        if (gridView) gridView.classList.add('d-none');
        if (tableView) tableView.classList.add('d-none');
        return;
    }

    if (empty) empty.classList.add('d-none');

    if (currentView === 'grid') {
        if (gridView) gridView.classList.remove('d-none');
        if (tableView) tableView.classList.add('d-none');
        renderGrid();
    } else {
        if (gridView) gridView.classList.add('d-none');
        if (tableView) tableView.classList.remove('d-none');
        renderTable();
    }
}

function renderGrid() {
    const grid = bnGet('patientsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    filteredPatients.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = `patient-card status-${p.status}`;
        card.style.animationDelay = `${i * 0.05}s`;
        card.dataset.id = p.id;
        card.innerHTML = `
            <div class="patient-card-header">
                <div class="patient-avatar-large">
                    ${getInitials(p.firstName, p.lastName)}
                    <span class="patient-status-dot status-${p.status}"></span>
                </div>
                <div class="patient-card-info">
                    <h3 class="patient-card-name">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</h3>
                    <span class="patient-card-code"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(p.code)}</span>
                </div>
            </div>
            <div class="patient-card-details">
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-cake-candles"></i> العمر</span>
                    <span class="detail-item-value">${p.age ?? '-'} سنة</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-venus-mars"></i> الجنس</span>
                    <span class="detail-item-value">${getGenderText(p.gender)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-phone"></i> الهاتف</span>
                    <span class="detail-item-value">${escapeHtml(p.phone || '-')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-city"></i> المدينة</span>
                    <span class="detail-item-value">${escapeHtml(p.city || '-')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-stethoscope"></i> التشخيص</span>
                    <span class="detail-item-value">${escapeHtml(p.diagnosis || '-')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-item-label"><i class="fa-solid fa-calendar-check"></i> آخر زيارة</span>
                    <span class="detail-item-value">${formatDate(p.lastVisit)}</span>
                </div>
            </div>
            <div class="patient-card-footer">
                <span class="patient-card-status status-${p.status}">
                    <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                    ${getStatusText(p.status)}
                </span>
                <div class="patient-card-actions">
                    <button type="button" class="action-btn action-view" data-action="view" data-id="${p.id}" title="عرض"><i class="fa-solid fa-eye"></i></button>
                    <button type="button" class="action-btn action-delete" data-action="delete" data-id="${p.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderTable() {
    const tbody = bnGet('patientsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredPatients.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="table-patient-cell">
                    <div class="table-avatar">${getInitials(p.firstName, p.lastName)}</div>
                    <div>
                        <p class="table-patient-name">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</p>
                        <p class="table-patient-sub">${escapeHtml(p.diagnosis || '-')}</p>
                    </div>
                </div>
            </td>
            <td><span class="table-code">${escapeHtml(p.code)}</span></td>
            <td>${p.age ?? '-'}</td>
            <td>${getGenderText(p.gender)}</td>
            <td>${escapeHtml(p.phone || '-')}</td>
            <td>${escapeHtml(p.city || '-')}</td>
            <td>
                <span class="patient-card-status status-${p.status}">
                    <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                    ${getStatusText(p.status)}
                </span>
            </td>
            <td>${formatDate(p.lastVisit)}</td>
            <td>
                <div class="table-actions">
                    <button type="button" class="action-btn action-view" data-action="view" data-id="${p.id}"><i class="fa-solid fa-eye"></i></button>
                    <button type="button" class="action-btn action-delete" data-action="delete" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/* ============================================================
   11. Actions — Delete
============================================================ */
function openDeleteModal(id) {
    const p = allPatients.find(x => String(x.id) === String(id));
    if (!p) {
        console.warn('⚠️ المريض غير موجود بالقائمة:', id);
        return;
    }

    pendingDeleteId = String(id);
    const msgEl = bnGet('deleteModalMessage');
    if (msgEl) {
        msgEl.innerHTML = `هل أنت متأكد من حذف المريض <strong>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</strong> نهائياً من النظام؟`;
    }
    const input = bnGet('deleteConfirmInput');
    if (input) input.value = '';
    const btn = bnGet('deleteConfirmBtn');
    if (btn) btn.disabled = true;
    const modal = bnGet('deleteModal');
    if (modal) modal.classList.add('show');
    if (input) setTimeout(() => input.focus(), 150);
}

function closeDeleteModal() {
    const modal = bnGet('deleteModal');
    if (modal) modal.classList.remove('show');
    pendingDeleteId = null;
    const input = bnGet('deleteConfirmInput');
    if (input) input.value = '';
    const btn = bnGet('deleteConfirmBtn');
    if (btn) btn.disabled = true;
}

async function confirmDelete() {
    console.log('🔍 confirmDelete START');
    console.log('  - isDeleting:', isDeleting);
    console.log('  - pendingDeleteId:', pendingDeleteId);

    if (isDeleting) {
        console.warn('⚠️ حذف قيد التنفيذ — تجاهل الضغطة المكررة');
        return;
    }
    if (!pendingDeleteId) {
        console.warn('⚠️ pendingDeleteId فارغ');
        return;
    }

    const p = allPatients.find(x => String(x.id) === String(pendingDeleteId));
    if (!p) {
        console.warn('⚠️ المريض غير موجود بالقائمة:', pendingDeleteId);
        closeDeleteModal();
        showToast('error', 'خطأ', 'المريض غير موجود في القائمة الحالية.', 4000);
        return;
    }

    isDeleting = true;

    const btn = bnGet('deleteConfirmBtn');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحذف...';
    }

    try {
        const id = String(pendingDeleteId);
        console.log('🗑️ Deleting patient:', id);

        const result = await bnApi.deletePatient(id);
        console.log('✅ Delete API result:', result);

        allPatients = allPatients.filter(x => String(x.id) !== id);
        closeDeleteModal();
        applyFilters();
        updateStatistics();
        bnConfetti.fire();
        showToast('success', 'تم الحذف بنجاح',
            `تم حذف المريض ${p.firstName} ${p.lastName} نهائياً من النظام.`, 4500);
    } catch (err) {
        console.error('❌ Delete failed:', err);

        const status = err?.status || '?';
        const msg = err?.message || 'تعذر حذف المريض';

        console.group('❌ Delete Error Details');
        console.error('Status Code:', status);
        console.error('Message:', msg);
        console.error('Full error:', err);
        console.groupEnd();

        // ✅ رسالة خطأ مفصّلة مع Status Code
        let userMessage = msg;
        if (status === 400) userMessage = 'طلب غير صالح — قد يكون Antiforgery Token مفقوداً';
        else if (status === 404) userMessage = 'OnPostDeletePatientAsync غير موجود أو المريض غير موجود';
        else if (status === 401) userMessage = 'جلسة غير صالحة — أعد تسجيل الدخول';
        else if (status === 403) userMessage = 'غير مصرّح بحذف هذا المريض';
        else if (status === 500) userMessage = 'خطأ في الخادم — قد توجد سجلات مرتبطة';
        else if (status === 502) userMessage = 'تعذر الاتصال بخدمة المرضى';

        showToast('error', 'فشل الحذف', `[${status}] ${userMessage}`, 8000);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml || '<i class="fa-solid fa-trash"></i> حذف نهائي';
        }
    } finally {
        isDeleting = false;
    }
}

/* ============================================================
   12. Details Modal
============================================================ */
function openDetails(id) {
    const p = allPatients.find(x => String(x.id) === String(id));
    if (!p) return;

    currentDetailsPatientId = String(id);

    const subtitle = bnGet('detailsModalSubtitle');
    if (subtitle) subtitle.textContent = `${p.firstName} ${p.lastName} · ${p.code}`;

    const body = bnGet('detailsModalBody');
    if (!body) return;

    body.innerHTML = `
        <div class="details-header-card">
            <div class="details-avatar">${getInitials(p.firstName, p.lastName)}</div>
            <div class="details-header-info">
                <h4>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</h4>
                <p><i class="fa-solid fa-hashtag"></i> ${escapeHtml(p.code)} · ${p.age ?? '-'} سنة · ${getGenderText(p.gender)}</p>
            </div>
            <span class="details-badge badge-${getRiskBadgeClass(p.riskLevel)}">
                <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                ${getStatusText(p.status)}
            </span>
        </div>
        <div class="details-section-title"><i class="fa-solid fa-user"></i> المعلومات الشخصية</div>
        <div class="details-grid">
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-phone"></i></div>
                <div class="details-item-content"><span class="details-item-label">الهاتف</span><span class="details-item-value">${escapeHtml(p.phone || '-')}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-envelope"></i></div>
                <div class="details-item-content"><span class="details-item-label">البريد</span><span class="details-item-value">${escapeHtml(p.email || '-')}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-city"></i></div>
                <div class="details-item-content"><span class="details-item-label">المدينة</span><span class="details-item-value">${escapeHtml(p.city || '-')}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-heart"></i></div>
                <div class="details-item-content"><span class="details-item-label">الحالة الاجتماعية</span><span class="details-item-value">${escapeHtml(p.maritalStatus || '-')}</span></div>
            </div>
            <div class="details-item" style="grid-column: 1 / -1;">
                <div class="details-item-icon"><i class="fa-solid fa-location-dot"></i></div>
                <div class="details-item-content"><span class="details-item-label">العنوان</span><span class="details-item-value">${escapeHtml(p.address || '-')}</span></div>
            </div>
        </div>
        <div class="details-section-title"><i class="fa-solid fa-notes-medical"></i> المعلومات الطبية</div>
        <div class="details-grid">
            <div class="details-item" style="grid-column: 1 / -1;">
                <div class="details-item-icon"><i class="fa-solid fa-stethoscope"></i></div>
                <div class="details-item-content"><span class="details-item-label">التشخيص</span><span class="details-item-value">${escapeHtml(p.diagnosis || 'غير محدد')}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-pills"></i></div>
                <div class="details-item-content"><span class="details-item-label">الأدوية</span><span class="details-item-value">${p.medications} دواء</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-calendar-check"></i></div>
                <div class="details-item-content"><span class="details-item-label">الزيارات</span><span class="details-item-value">${p.visits} زيارة</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-clock"></i></div>
                <div class="details-item-content"><span class="details-item-label">آخر زيارة</span><span class="details-item-value">${formatDate(p.lastVisit)}</span></div>
            </div>
            <div class="details-item">
                <div class="details-item-icon"><i class="fa-solid fa-calendar-plus"></i></div>
                <div class="details-item-content"><span class="details-item-label">الزيارة القادمة</span><span class="details-item-value">${p.nextVisit ? formatDate(p.nextVisit) : 'غير محدد'}</span></div>
            </div>
        </div>
        <div class="details-section-title"><i class="fa-solid fa-shield-heart"></i> مؤشرات الحالة</div>
        <div class="details-badges">
            <span class="details-badge badge-${getRiskBadgeClass(p.riskLevel)}">
                <i class="fa-solid fa-triangle-exclamation"></i>
                مستوى الخطورة: ${getRiskText(p.riskLevel)}
            </span>
            <span class="details-badge badge-${p.status === 'active' ? 'success' : p.status === 'critical' ? 'danger' : 'warning'}">
                <i class="fa-solid ${getStatusIcon(p.status)}"></i>
                ${getStatusText(p.status)}
            </span>
            <span class="details-badge badge-primary">
                <i class="fa-solid fa-calendar"></i>
                مسجّل من: ${formatDate(p.createdAt)}
            </span>
        </div>
    `;

    const modal = bnGet('detailsModal');
    if (modal) modal.classList.add('show');
}

function closeDetailsModal() {
    const modal = bnGet('detailsModal');
    if (modal) modal.classList.remove('show');
    currentDetailsPatientId = null;
}

/* ============================================================
   13. Event Delegation
============================================================ */
document.addEventListener('click', (e) => {

    if (e.target.closest('#themeToggle')) {
        e.preventDefault();
        const t = bnTheme.toggle();
        showToast('success', 'تغيير المظهر', t === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري');
        return;
    }

    if (e.target.closest('#toastCloseBtn')) {
        e.preventDefault();
        hideToast();
        return;
    }

    if (e.target.closest('#detailsCloseBtn')) {
        e.preventDefault();
        closeDetailsModal();
        return;
    }

    if (e.target.closest('#detailsCloseFooterBtn')) {
        e.preventDefault();
        closeDetailsModal();
        return;
    }

    if (e.target.closest('#detailsOpenFileBtn')) {
        e.preventDefault();
        if (!currentDetailsPatientId) return;
        const sep = bnEndpoints.patientFile.includes('?') ? '&' : '?';
        const url = `${bnEndpoints.patientFile}${sep}patientId=${encodeURIComponent(currentDetailsPatientId)}`;
        window.location.href = url;
        return;
    }

    const deleteBtn = e.target.closest('.action-btn.action-delete');
    if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        openDeleteModal(deleteBtn.dataset.id);
        return;
    }

    const viewBtn = e.target.closest('.action-btn.action-view');
    if (viewBtn) {
        e.preventDefault();
        e.stopPropagation();
        openDetails(viewBtn.dataset.id);
        return;
    }

    const patientCard = e.target.closest('.patient-card');
    if (patientCard && !e.target.closest('.action-btn')) {
        openDetails(patientCard.dataset.id);
        return;
    }

    const viewToggleBtn = e.target.closest('.view-btn');
    if (viewToggleBtn) {
        e.preventDefault();
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        viewToggleBtn.classList.add('active');
        currentView = viewToggleBtn.dataset.view;
        render();
        return;
    }

    if (e.target.closest('#clearSearch')) {
        e.preventDefault();
        const searchEl = bnGet('globalSearch');
        const clearBtn = bnGet('clearSearch');
        if (searchEl) searchEl.value = '';
        if (clearBtn) clearBtn.classList.add('d-none');
        applyFilters();
        return;
    }

    if (e.target.closest('#resetFilters') || e.target.closest('#emptyResetBtn')) {
        e.preventDefault();
        resetFilters();
        return;
    }

    if (e.target.closest('#deleteCancelBtn')) {
        e.preventDefault();
        closeDeleteModal();
        return;
    }

    if (e.target.closest('#deleteConfirmBtn')) {
        e.preventDefault();
        confirmDelete();
        return;
    }

    if (e.target.id === 'deleteModal') {
        closeDeleteModal();
        return;
    }

    if (e.target.id === 'detailsModal') {
        closeDetailsModal();
        return;
    }
});

/* ============================================================
   14. Input Events
============================================================ */
document.addEventListener('input', (e) => {
    if (e.target.id === 'deleteConfirmInput') {
        const btn = bnGet('deleteConfirmBtn');
        if (btn) btn.disabled = e.target.value.trim() !== 'حذف';
    }
    if (e.target.id === 'globalSearch') {
        const clearBtn = bnGet('clearSearch');
        if (clearBtn) clearBtn.classList.toggle('d-none', e.target.value === '');
        applyFilters();
    }
});

/* ============================================================
   15. Change Events
============================================================ */
document.addEventListener('change', (e) => {
    if (['filterGender', 'filterStatus', 'filterSort'].includes(e.target.id)) {
        applyFilters();
    }
});

/* ============================================================
   16. Keyboard Shortcuts
============================================================ */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDeleteModal();
        closeDetailsModal();
    }
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    if (ctrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchEl = bnGet('globalSearch');
        if (searchEl) {
            searchEl.focus();
            searchEl.select();
        }
    }
});

/* ============================================================
   17. Reset Filters
============================================================ */
function resetFilters() {
    const searchEl = bnGet('globalSearch');
    const genderEl = bnGet('filterGender');
    const statusEl = bnGet('filterStatus');
    const sortEl = bnGet('filterSort');
    const clearBtn = bnGet('clearSearch');

    if (searchEl) searchEl.value = '';
    if (genderEl) genderEl.value = '';
    if (statusEl) statusEl.value = '';
    if (sortEl) sortEl.value = 'name';
    if (clearBtn) clearBtn.classList.add('d-none');
    applyFilters();
    showToast('info', 'تم إعادة التعيين', 'تم إعادة تعيين جميع الفلاتر.');
}

/* ============================================================
   18. Load Patients from API
============================================================ */
async function loadPatients() {
    isLoading = true;
    updateResultsText();

    try {
        const raw = await bnApi.getPatients();

        if (Array.isArray(raw) && raw.length > 0) {
            console.groupCollapsed('🔍 [Balancy] أول عنصر من API');
            console.log('raw[0] =', raw[0]);
            console.log('keys =', Object.keys(raw[0]));
            console.groupEnd();
        }

        allPatients = raw.map(mapApiPatient).filter(Boolean);
        isLoading = false;

        updateStatistics();
        applyFilters();

        if (allPatients.length === 0) {
            showToast('info', 'لا يوجد مرضى', 'لم يتم العثور على أي مريض مسجّل حالياً.', 4000);
        } else {
            showToast('info', 'مرحباً بك', `تم تحميل ${allPatients.length} مريض من النظام.`, 4000);
        }
    } catch (err) {
        isLoading = false;
        allPatients = [];
        filteredPatients = [];
        updateStatistics();
        render();
        updateResultsText();
        showToast('error', 'فشل تحميل البيانات', err.message || 'تعذر الاتصال بخدمة المرضى.', 6000);
    }
}

/* ============================================================
   19. Init
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    bnTheme.init();
    bnSetText('statTotal', '…');
    bnSetText('statActive', '…');
    bnSetText('statCritical', '…');
    bnSetText('statVisits', '…');
    bnSetText('resultsText', 'جاري تحميل المرضى...');

    loadPatients();

    console.log('%c✅ All Patients Page Loaded',
        'background:#0891b2;color:#fff;padding:6px 16px;border-radius:6px;font-weight:bold;font-size:12px;');
});