const classesList = ["Nursery", "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
let studentsData = [];
let attendanceData = {};
let academicSubjects = [];

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    try {
        const [studentsRes, attRes, subRes] = await Promise.all([
            fetch(`${API_BASE}/students`),
            fetch(`${API_BASE}/attendance`),
            fetch(`${API_BASE}/subjects`)
        ]);
        studentsData = await studentsRes.json();
        attendanceData = await attRes.json();
        academicSubjects = await subRes.json();

        populateDropdowns();
        updateDashboardCounts();
        renderStudentDirectory();
        renderMasterData();
        renderAcademicHub();
        renderFeeVouchers();
        setupMonthlyTab();
    } catch (e) {
        console.error('Failed to connect to backend server:', e);
    }
}

function updateDashboardCounts() {
    const totalEl = document.getElementById('totalStudentsCount');
    const paidEl = document.getElementById('paidCount');
    const pendingEl = document.getElementById('pendingCount');
    const activeEl = document.getElementById('activeStudentsCount');
    const todayCountEl = document.getElementById('admissionsTodayCount');
    const monthCountEl = document.getElementById('admissionsMonthCount');
    const feePctEl = document.getElementById('feeCollectionPct');

    if (totalEl) totalEl.innerText = studentsData.length;
    if (activeEl) activeEl.innerText = studentsData.length;

    let paid = studentsData.filter(s => s.feeStatus === "Paid").length;
    let pending = studentsData.length - paid;
    if (paidEl) paidEl.innerText = paid;
    if (pendingEl) pendingEl.innerText = pending;

    if (feePctEl && studentsData.length > 0) {
        let pct = Math.round((paid / studentsData.length) * 100);
        feePctEl.innerText = pct + '%';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    const todayAdmissions = studentsData.filter(s => s.admissionDate === todayStr).length;
    const monthAdmissions = studentsData.filter(s => s.admissionDate && s.admissionDate.startsWith(currentMonthPrefix)).length;

    if (todayCountEl) todayCountEl.innerText = todayAdmissions;
    if (monthCountEl) monthCountEl.innerText = monthAdmissions;

    renderDashboardCharts();
}

function renderDashboardCharts() {
    const chartContainer = document.getElementById('classEnrollmentChart');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';

    classesList.forEach(cls => {
        let count = studentsData.filter(s => s.className === cls).length;
        let percentage = studentsData.length > 0 ? (count / studentsData.length) * 100 : 0;

        let row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '15px';
        row.innerHTML = `
            <span style="width: 80px; font-weight: 600; font-size: 0.9rem;">${cls}</span>
            <div style="flex: 1; background: var(--bg-color); border-radius: 6px; height: 12px; overflow: hidden; border: 1px solid var(--border-color);">
                <div style="width: ${percentage}%; background: var(--accent-color); height: 100%; border-radius: 6px;"></div>
            </div>
            <span style="width: 40px; text-align: right; font-size: 0.85rem; color: #64748b;">${count}</span>
        `;
        chartContainer.appendChild(row);
    });
}

function setupEventListeners() {
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetSection = document.getElementById(tabId);
            if (targetSection) targetSection.classList.add('active');
            renderTabContent(tabId);
        });
    });

    const globalSearchInput = document.getElementById('globalSearch');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query.length > 0) {
                document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active'));
                
                const studentTabMenu = document.querySelector('.sidebar-menu li[data-tab="students"]');
                if (studentTabMenu) studentTabMenu.classList.add('active');
                const studentSection = document.getElementById('students');
                if (studentSection) studentSection.classList.add('active');
            }

            const filtered = studentsData.filter(s => 
                s.name.toLowerCase().includes(query) || 
                s.className.toLowerCase().includes(query) ||
                s.rollNo.toLowerCase().includes(query)
            );
            
            renderTableData('#studentTable tbody', filtered);
            renderMasterTableData(filtered);
        });
    }

    const openAdmitModalBtn = document.getElementById('openAdmitModalBtn');
    if (openAdmitModalBtn) {
        openAdmitModalBtn.onclick = () => {
            document.getElementById('admitStudentModal').style.display = 'block';
            document.getElementById('admitAdmissionDate').value = new Date().toISOString().split('T')[0];
        };
    }

    const closeAdmitModalBtn = document.querySelector('.close-modal-admit');
    if (closeAdmitModalBtn) {
        closeAdmitModalBtn.onclick = () => {
            document.getElementById('admitStudentModal').style.display = 'none';
        };
    }

    const admitForm = document.getElementById('admitStudentForm');
    if (admitForm) {
        admitForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const classSelect = document.getElementById('admitClassSelect');
            const selectedClass = classSelect ? classSelect.value : 'Nursery';
            const todayStr = new Date().toISOString().split('T')[0];

            const newStudent = {
                rollNo: `R-${100 + studentsData.length + 1}`,
                name: document.getElementById('admitName').value,
                className: selectedClass,
                dob: document.getElementById('admitDob') ? document.getElementById('admitDob').value : '2016-05-12',
                admissionDate: document.getElementById('admitAdmissionDate') ? document.getElementById('admitAdmissionDate').value : todayStr,
                fatherName: document.getElementById('admitFather').value,
                motherName: document.getElementById('admitMother').value,
                contactNo: document.getElementById('admitContact').value,
                emergencyContact: document.getElementById('admitEmergency').value,
                address: document.getElementById('admitAddress').value,
                admissionFee: document.getElementById('admitAdmissionFee').value,
                monthlyFee: document.getElementById('admitMonthlyFee').value,
                feeStatus: document.getElementById('admitFeeStatus').value
            };

            try {
                const res = await fetch(`${API_BASE}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newStudent)
                });
                if (res.ok) {
                    const data = await res.json();
                    newStudent.id = data.id;
                    studentsData.push(newStudent);
                    
                    updateDashboardCounts();
                    renderStudentDirectory();
                    renderMasterData();
                    renderFeeVouchers();
                    populateMonthlyStudents();
                    
                    document.getElementById('admitStudentModal').style.display = 'none';
                    this.reset();
                    alert('New Student Admitted & System Updated Successfully!');
                } else {
                    alert('Server error while saving admission.');
                }
            } catch (err) {
                console.error(err);
                alert('Error submitting admission form. Make sure server is running.');
            }
        });
    }

    const stdClassFilter = document.getElementById('studentClassFilter');
    if (stdClassFilter) stdClassFilter.addEventListener('change', renderStudentDirectory);

    const masterNameSearch = document.getElementById('masterNameSearch');
    if (masterNameSearch) masterNameSearch.addEventListener('input', renderMasterData);

    const masterClassFilter = document.getElementById('masterClassFilter');
    if (masterClassFilter) masterClassFilter.addEventListener('change', renderMasterData);

    const feeClassFilter = document.getElementById('feeClassFilter');
    if (feeClassFilter) feeClassFilter.addEventListener('change', renderFeeVouchers);

    const editForm = document.getElementById('editStudentForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = parseInt(document.getElementById('editStudentId').value);
            const updatedData = {
                name: document.getElementById('editName').value,
                className: document.getElementById('editClass').value,
                dob: document.getElementById('editDob').value,
                admissionDate: document.getElementById('editAdmissionDate').value,
                fatherName: document.getElementById('editFather').value,
                motherName: document.getElementById('editMother').value,
                contactNo: document.getElementById('editContact').value,
                emergencyContact: document.getElementById('editEmergency').value,
                address: document.getElementById('editAddress').value,
                admissionFee: document.getElementById('editAdmissionFee').value,
                monthlyFee: document.getElementById('editMonthlyFee').value,
                feeStatus: document.getElementById('editFeeStatus').value
            };

            try {
                const res = await fetch(`${API_BASE}/students/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                if (res.ok) {
                    let student = studentsData.find(s => s.id === id);
                    if (student) Object.assign(student, updatedData);
                    updateDashboardCounts();
                    document.getElementById('editStudentModal').style.display = 'none';
                    renderStudentDirectory();
                    renderMasterData();
                    renderFeeVouchers();
                }
            } catch (err) {
                alert('Error updating student');
            }
        });
    }

    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.onclick = function() {
            document.getElementById('editStudentModal').style.display = 'none';
        }
    }

    const attClassSel = document.getElementById('attClassSelect');
    if (attClassSel) attClassSel.addEventListener('change', loadAttendanceTable);
    
    const attDateInp = document.getElementById('attDateInput');
    if (attDateInp) attDateInp.addEventListener('change', loadAttendanceTable);

    const saveAttBtn = document.getElementById('saveAttendanceBtn');
    if (saveAttBtn) {
        saveAttBtn.addEventListener('click', async function() {
            let updatedBatch = {};
            document.querySelectorAll('.att-status-select').forEach(sel => {
                let key = sel.getAttribute('data-key');
                updatedBatch[key] = sel.value;
                attendanceData[key] = sel.value;
            });

            try {
                await fetch(`${API_BASE}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedBatch)
                });
                alert('Attendance saved successfully!');
            } catch (e) {
                alert('Error saving attendance');
            }
        });
    }

    const monthlyClassFilter = document.getElementById('monthlyClassFilter');
    if (monthlyClassFilter) {
        monthlyClassFilter.addEventListener('change', populateMonthlyStudents);
    }

    const generateMonthlyReportBtn = document.getElementById('generateMonthlyReport');
    if (generateMonthlyReportBtn) {
        generateMonthlyReportBtn.addEventListener('click', generateMonthlyAttendanceReport);
    }

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notifDropdown');
            if (dropdown) dropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', function() {
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.classList.remove('active');
    });

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
        });
    }
}

function renderTabContent(tabId) {
    if (tabId === 'students') renderStudentDirectory();
    if (tabId === 'attendance') setupAttendanceTab();
    if (tabId === 'monthly-attendance') setupMonthlyTab();
    if (tabId === 'fees') renderFeeVouchers();
    if (tabId === 'master-data') renderMasterData();
    if (tabId === 'academic') renderAcademicHub();
}

function populateDropdowns() {
    const classFilters = [
        document.getElementById('studentClassFilter'), 
        document.getElementById('attClassSelect'), 
        document.getElementById('feeClassFilter'),
        document.getElementById('masterClassFilter'),
        document.getElementById('subClassSelect'),
        document.getElementById('admitClassSelect')
    ];
    classFilters.forEach(select => {
        if (!select) return;
        select.innerHTML = select.id === 'attClassSelect' || select.id === 'subClassSelect' || select.id === 'admitClassSelect' ? '' : '<option value="">All Classes</option>';
        classesList.forEach(cls => {
            let opt = document.createElement('option');
            opt.value = cls;
            opt.innerText = cls;
            select.appendChild(opt);
        });
    });
}

function renderStudentDirectory() {
    const filterEl = document.getElementById('studentClassFilter');
    const filterVal = filterEl ? filterEl.value : '';
    let filtered = studentsData.filter(s => !filterVal || s.className === filterVal);
    renderTableData('#studentTable tbody', filtered);
}

function renderTableData(selector, list) {
    const tbody = document.querySelector(selector);
    if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach(s => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.rollNo}</td>
            <td>${s.name}</td>
            <td>${s.className}</td>
            <td>${s.fatherName}</td>
            <td>${s.address}</td>
            <td><span class="badge ${s.feeStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${s.feeStatus === 'Paid' ? 'Paid' : 'Unpaid (Pending)'}</span></td>
            <td>
                <button class="btn-sm btn-edit" onclick="openEditModal(${s.id})"><i class="fa-solid fa-pen"></i> Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMasterData() {
    const nameInput = document.getElementById('masterNameSearch');
    const classSelect = document.getElementById('masterClassFilter');
    const nameQuery = nameInput ? nameInput.value.toLowerCase().trim() : '';
    const classVal = classSelect ? classSelect.value : '';

    let filtered = studentsData.filter(s => {
        let matchesName = !nameQuery || s.name.toLowerCase().includes(nameQuery);
        let matchesClass = !classVal || s.className === classVal;
        return matchesName && matchesClass;
    });

    renderMasterTableData(filtered);
}

function renderMasterTableData(list) {
    const tbody = document.querySelector('#masterTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach(s => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.rollNo}</td>
            <td>${s.name}</td>
            <td>${s.className}</td>
            <td>${s.dob || '2016-05-12'}</td>
            <td>${s.admissionDate || '2026-10-13'}</td>
            <td>${s.fatherName} / ${s.motherName || 'Suraiya Bano'}</td>
            <td>${s.contactNo || '0300-1234567'}</td>
            <td>${s.address}</td>
            <td>${s.admissionFee || 'PKR 5,000'}</td>
            <td>${s.monthlyFee || 'PKR 12,000'}</td>
            <td><span class="badge ${s.feeStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${s.feeStatus}</span></td>
            <td><button class="btn-sm btn-edit" onclick="openEditModal(${s.id})">Edit Info</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditModal(id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) return;
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editName').value = student.name;
    document.getElementById('editClass').value = student.className;
    document.getElementById('editDob').value = student.dob || '2016-05-12';
    document.getElementById('editAdmissionDate').value = student.admissionDate || '2026-10-13';
    document.getElementById('editFather').value = student.fatherName || 'Muhammad Akram';
    document.getElementById('editMother').value = student.motherName || 'Suraiya Bano';
    document.getElementById('editContact').value = student.contactNo || '0300-1234567';
    document.getElementById('editEmergency').value = student.emergencyContact || '0321-7654321';
    document.getElementById('editAddress').value = student.address || '';
    document.getElementById('editAdmissionFee').value = student.admissionFee || 'PKR 5,000';
    document.getElementById('editMonthlyFee').value = student.monthlyFee || 'PKR 12,000';
    document.getElementById('editFeeStatus').value = student.feeStatus;
    document.getElementById('editStudentModal').style.display = 'block';
}

function setupAttendanceTab() {
    const dateInput = document.getElementById('attDateInput');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
    loadAttendanceTable();
}

function loadAttendanceTable() {
    const classSel = document.getElementById('attClassSelect');
    const dateInp = document.getElementById('attDateInput');
    if (!classSel || !dateInp) return;

    const cls = classSel.value;
    const date = dateInp.value;
    const tbody = document.querySelector('#attendanceTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = studentsData.filter(s => s.className === cls);
    list.forEach(s => {
        let key = `${date}_${s.id}`;
        let status = attendanceData[key] || 'Present';
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.rollNo}</td>
            <td>${s.name}</td>
            <td>
                <select class="att-status-select" data-key="${key}">
                    <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                    <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                    <option value="Leave" ${status === 'Leave' ? 'selected' : ''}>Leave</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupMonthlyTab() {
    const classSel = document.getElementById('monthlyClassFilter');
    const monthPicker = document.getElementById('monthlyMonthPicker');

    if (classSel) {
        classSel.innerHTML = '<option value="">Select Class</option>';
        classesList.forEach(cls => {
            let opt = document.createElement('option');
            opt.value = cls;
            opt.innerText = cls;
            classSel.appendChild(opt);
        });
    }

    if (monthPicker && !monthPicker.value) {
        monthPicker.value = '2026-10';
    }

    populateMonthlyStudents();
}

function populateMonthlyStudents() {
    const classSel = document.getElementById('monthlyClassFilter');
    const stdSel = document.getElementById('monthlyStudentFilter');
    if (!classSel || !stdSel) return;

    const selectedClass = classSel.value;
    stdSel.innerHTML = '<option value="">All Students in Class</option>';

    let filtered = selectedClass ? studentsData.filter(s => s.className === selectedClass) : studentsData;
    filtered.forEach(s => {
        let opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = `${s.name} (${s.rollNo})`;
        stdSel.appendChild(opt);
    });
}

function generateMonthlyAttendanceReport() {
    const classSel = document.getElementById('monthlyClassFilter');
    const stdSel = document.getElementById('monthlyStudentFilter');
    const monthPicker = document.getElementById('monthlyMonthPicker');
    const container = document.getElementById('monthlyReportContainer');

    if (!container) return;

    const selectedClass = classSel ? classSel.value : '';
    const selectedStdId = stdSel ? stdSel.value : '';
    const yearMonth = monthPicker ? monthPicker.value : '2026-10';

    if (!selectedClass) {
        alert('Please select a class first.');
        return;
    }

    let targetStudents = studentsData.filter(s => s.className === selectedClass);
    if (selectedStdId) {
        targetStudents = targetStudents.filter(s => s.id == selectedStdId);
    }

    if (targetStudents.length === 0) {
        container.innerHTML = '<p>No students found for the selected criteria.</p>';
        return;
    }

    let year = parseInt(yearMonth.split('-')[0]) || 2026;
    let month = parseInt(yearMonth.split('-')[1]) || 10;
    let daysInMonth = new Date(year, month, 0).getDate();

    let tableHTML = `<div style="overflow-x:auto;"><h3 style="margin-bottom:15px; color:var(--text-color);">Monthly Roster Report: ${selectedClass} (${yearMonth})</h3>`;
    tableHTML += '<table style="width:100%; border-collapse:collapse; background:var(--card-bg); font-size:0.85rem;">';
    tableHTML += '<thead><tr><th style="padding:8px; border:1px solid var(--border-color);">Roll No</th><th style="padding:8px; border:1px solid var(--border-color);">Student Name</th>';

    for (let d = 1; d <= daysInMonth; d++) {
        tableHTML += `<th style="padding:4px; text-align:center; border:1px solid var(--border-color); min-width:24px;">${d}</th>`;
    }
    tableHTML += '<th style="padding:8px; border:1px solid var(--border-color);">P</th><th style="padding:8px; border:1px solid var(--border-color);">A</th></tr></thead><tbody>';

    targetStudents.forEach(s => {
        let presentCount = 0;
        let absentCount = 0;

        tableHTML += `<tr><td style="padding:8px; border:1px solid var(--border-color);">${s.rollNo}</td><td style="padding:8px; border:1px solid var(--border-color); font-weight:600;">${s.name}</td>`;

        for (let d = 1; d <= daysInMonth; d++) {
            let dayStr = d < 10 ? `0${d}` : `${d}`;
            let dateKey = `${yearMonth}-${dayStr}_${s.id}`;
            let status = attendanceData[dateKey] || 'Present';

            let symbol = 'P';
            let bgStyle = 'color:#16a34a; font-weight:bold;';
            if (status === 'Absent') {
                symbol = 'A';
                bgStyle = 'color:#dc2626; font-weight:bold;';
                absentCount++;
            } else if (status === 'Leave') {
                symbol = 'L';
                bgStyle = 'color:#d97706; font-weight:bold;';
            } else {
                presentCount++;
            }

            tableHTML += `<td style="padding:4px; text-align:center; border:1px solid var(--border-color); ${bgStyle}">${symbol}</td>`;
        }

        tableHTML += `<td style="padding:8px; border:1px solid var(--border-color); color:#16a34a; font-weight:bold;">${presentCount}</td>`;
        tableHTML += `<td style="padding:8px; border:1px solid var(--border-color); color:#dc2626; font-weight:bold;">${absentCount}</td></tr>`;
    });

    tableHTML += '</tbody></table></div>';
    container.innerHTML = tableHTML;
}

function renderFeeVouchers() {
    const grid = document.getElementById('vouchersGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const filterEl = document.getElementById('feeClassFilter');
    const filterVal = filterEl ? filterEl.value : '';
    let filtered = studentsData.filter(s => !filterVal || s.className === filterVal);

    filtered.forEach(s => {
        let card = document.createElement('div');
        card.className = 'voucher-card';
        card.innerHTML = `
            <div class="voucher-header">
                <h4><i class="fa-solid fa-file-invoice-dollar"></i> Fee Voucher</h4>
                <span class="badge ${s.feeStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${s.feeStatus === 'Paid' ? 'Paid' : 'Unpaid (Pending)'}</span>
            </div>
            <div class="voucher-body">
                <div class="voucher-row"><span class="label">Roll No:</span><span class="value">${s.rollNo}</span></div>
                <div class="voucher-row"><span class="label">Student Name:</span><span class="value">${s.name}</span></div>
                <div class="voucher-row"><span class="label">Class:</span><span class="value">${s.className}</span></div>
                <div class="voucher-row"><span class="label">Admission Fee:</span><span class="value">${s.admissionFee || 'PKR 5,000'}</span></div>
                <div class="voucher-row"><span class="label">Monthly Tuition:</span><span class="value">${s.monthlyFee || 'PKR 12,000'}</span></div>
                <div class="voucher-amount-box">
                    <span class="amount-title">Total Due</span>
                    <span class="amount-value">${s.monthlyFee || 'PKR 12,000'}</span>
                </div>
            </div>
            <div class="voucher-footer">
                <small>EduFlow Finance Dept</small>
                <button class="btn-voucher-action" onclick="toggleFeeStatus(${s.id})">
                    <i class="fa-solid fa-rotate"></i> Change Status
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function toggleFeeStatus(id) {
    const s = studentsData.find(item => item.id === id);
    if (s) {
        s.feeStatus = s.feeStatus === 'Paid' ? 'Unpaid' : 'Paid';
        try {
            await fetch(`${API_BASE}/students/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s)
            });
            updateDashboardCounts();
            renderFeeVouchers();
            renderStudentDirectory();
            renderMasterData();
        } catch (e) {
            alert('Failed to update fee status');
        }
    }
}

function renderAcademicHub() {
    const listContainer = document.getElementById('academicSubjectsList');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    academicSubjects.forEach(sub => {
        let div = document.createElement('div');
        div.className = 'subject-card';
        div.innerHTML = `
            <div>
                <strong>${sub.name}</strong> (${sub.className || sub.class})
                <br><small>Teacher: <em>${sub.teacher}</em></small>
            </div>
            <button class="btn-sm btn-danger" onclick="deleteSubject(${sub.id})"><i class="fa-solid fa-trash"></i></button>
        `;
        listContainer.appendChild(div);
    });
}

function deleteSubject(id) {
    academicSubjects = academicSubjects.filter(sub => sub.id !== id);
    renderAcademicHub();
}

function printNewAdmissionsReport() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayList = studentsData.filter(s => s.admissionDate === todayStr);

    let printWin = window.open('', '', 'width=900,height=700');
    let htmlContent = '<html><head><title>New Admissions Report</title>' +
        '<style>body{font-family:sans-serif;padding:30px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:10px;text-align:left;} th{background:#f1f2f6;}</style>' +
        '</head><body>' +
        '<h2>EduFlow Enterprise - New Admissions Report (Today: ' + todayStr + ')</h2>' +
        '<p><strong>Total New Admissions Today:</strong> ' + todayList.length + '</p>' +
        '<table>' +
            '<thead><tr><th>Roll No</th><th>Student Name</th><th>Class</th><th>Father Name</th><th>Contact</th><th>Admission Date</th></tr></thead>' +
            '<tbody>' +
                todayList.map(s => '<tr><td>' + s.rollNo + '</td><td>' + s.name + '</td><td>' + s.className + '</td><td>' + s.fatherName + '</td><td>' + (s.contactNo || '0300-1234567') + '</td><td>' + s.admissionDate + '</td></tr>').join('') +
            '</tbody>' +
        '</table>' +
        '</body></html>';

    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    printWin.print();
}

function printMonthlyAdmissionsReport() {
    const currentMonthPrefix = new Date().toISOString().split('T')[0].substring(0, 7);
    const monthList = studentsData.filter(s => s.admissionDate && s.admissionDate.startsWith(currentMonthPrefix));

    let printWin = window.open('', '', 'width=900,height=700');
    let htmlContent = '<html><head><title>Monthly Admissions Report</title>' +
        '<style>body{font-family:sans-serif;padding:30px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:10px;text-align:left;} th{background:#f1f2f6;}</style>' +
        '</head><body>' +
        '<h2>EduFlow Enterprise - Monthly Admissions Report (' + currentMonthPrefix + ')</h2>' +
        '<p><strong>Total Admissions This Month:</strong> ' + monthList.length + '</p>' +
        '<table>' +
            '<thead><tr><th>Roll No</th><th>Student Name</th><th>Class</th><th>Father Name</th><th>Contact</th><th>Admission Date</th></tr></thead>' +
            '<tbody>' +
                monthList.map(s => '<tr><td>' + s.rollNo + '</td><td>' + s.name + '</td><td>' + s.className + '</td><td>' + s.fatherName + '</td><td>' + (s.contactNo || '0300-1234567') + '</td><td>' + s.admissionDate + '</td></tr>').join('') +
            '</tbody>' +
        '</table>' +
        '</body></html>';

    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    printWin.print();
}

function printClassAdmissionForms() {
    let printWin = window.open('', '', 'width=950,height=700');
    let htmlContent = '<html><head><title>Class-wise Admission Roster</title>' +
        '<style>body{font-family:sans-serif;padding:25px;} table{width:100%;border-collapse:collapse;margin-top:15px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:0.85rem;} th{background:#f1f2f6;}</style>' +
        '</head><body>' +
        '<h2>EduFlow Enterprise - Class Wise Admission Directory</h2>' +
        '<table>' +
            '<thead><tr><th>Roll No</th><th>Student Name</th><th>Class</th><th>DOB</th><th>Admission Date</th><th>Father Name</th><th>Contact</th><th>Karachi Address</th></tr></thead>' +
            '<tbody>' +
                studentsData.map(s => '<tr><td>' + s.rollNo + '</td><td>' + s.name + '</td><td>' + s.className + '</td><td>' + (s.dob || '2016-05-12') + '</td><td>' + (s.admissionDate || '2026-10-13') + '</td><td>' + s.fatherName + '</td><td>' + (s.contactNo || '0300-1234567') + '</td><td>' + s.address + '</td></tr>').join('') +
            '</tbody>' +
        '</table>' +
        '</body></html>';

    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    printWin.print();
}

function printBlankForm() {
    let printWin = window.open('', '', 'width=850,height=700');
    let htmlContent = '<html><head><title>Blank Admission Form</title>' +
        '<style>body{font-family:sans-serif;padding:40px;line-height:1.6;} .header{text-align:center;margin-bottom:20px;} .field{margin-bottom:15px;font-size:1rem;}</style>' +
        '</head><body>' +
        '<div class="header">' +
            '<h2>EDUFLOW ENTERPRISE SCHOOL SYSTEM</h2>' +
            '<p>Official Student Admission Application Form</p>' +
        '</div>' +
        '<hr><br>' +
        '<div class="field"><strong>1. Student Full Name:</strong> _________________________________________________</div>' +
        '<div class="field"><strong>2. Applying for Class:</strong> ____________________  <strong>3. Date of Birth:</strong> _______________</div>' +
        '<div class="field"><strong>4. Father Name:</strong> ________________________  <strong>5. Mother Name:</strong> _________________</div>' +
        '<div class="field"><strong>6. Residential Address (Karachi):</strong> ________________________________________________</div>' +
        '<div class="field"><strong>7. Contact Number:</strong> _____________________  <strong>8. Emergency Contact:</strong> ______________</div>' +
        '<div class="field"><strong>9. Admission Fee:</strong> PKR 5,000 &nbsp;&nbsp;&nbsp;&nbsp; <strong>10. Monthly Tuition Fee:</strong> PKR 12,000</div>' +
        '<br><br><br>' +
        '<div style="display:flex; justify-content:space-between;">' +
            '<p><strong>Date:</strong> _______________________</p>' +
            '<p><strong>Parent / Guardian Signature:</strong> _______________________</p>' +
        '</div>' +
        '</body></html>';

    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    printWin.print();
}