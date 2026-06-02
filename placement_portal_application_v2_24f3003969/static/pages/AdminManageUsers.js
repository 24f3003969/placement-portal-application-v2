import StudentProfile from '../components/student_profile.js';
import CompanyProfile from '../components/company_profile.js';
import { formatDateTime } from '../utils/formatDateTime.js';
const AdminManageUsers = {
    template: `
    <div class="container-fluid mt-2">
        <div class="position-relative mb-4">
            <div class="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" style="pointer-events: none; z-index: 0;">
                <h2 class="fw-bold mb-0 text-center" style="pointer-events: auto;">Manage Users</h2>
            </div>
            <ul class="nav nav-tabs position-relative" style="z-index: 1;">
                <li class="nav-item">
                    <button class="nav-link" :class="{ active: currentTab === 'students' }" @click="currentTab = 'students'">Students</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" :class="{ active: currentTab === 'companies' }" @click="currentTab = 'companies'">Companies</button>
                </li>
            </ul>
        </div>

        <!-- Students Tab -->
        <div v-if="currentTab === 'students'">
            <div class="row">
                <!-- Filters -->
                <div class="col-md-3">
                    <div class="card shadow-sm p-3">
                        <h5 class="fw-bold">Filters</h5>
                        <div class="mt-3">
                            <label class="form-label small fw-semibold text-muted">CGPA Greater Than</label>
                            <input type="number" step="0.1" class="form-control" v-model="studentFilters.cgpa" @input="debounceFetchStudents" placeholder="e.g., 7.5">
                        </div>
                        <div class="mt-3 d-flex align-items-center justify-content-between">
                            <label class="form-label small fw-semibold text-muted mb-0">Sort by Reg. Date</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="sortStudentRegDate" v-model="studentFilters.sortRegDateAsc">
                                <label class="form-check-label small text-muted" for="sortStudentRegDate">{{ studentFilters.sortRegDateAsc ? 'Asc' : 'Desc' }}</label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="col-md-9">
                    <!-- Search and Count -->
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="w-75">
                            <input type="text" class="form-control" v-model="studentFilters.q" @input="debounceFetchStudents" placeholder="Search by Name, Roll No, Department, Email, Phone...">
                        </div>
                        <span class="badge bg-primary rounded-pill fs-6">Total: {{ students.length }}</span>
                    </div>

                    <!-- Students Table -->
                    <div class="card shadow-sm mb-1">
                        <div class="card-header fw-bold d-flex justify-content-between">
                            <span>Active Students</span>
                            <button class="btn btn-sm btn-outline-secondary" @click="showDisabledStudents = !showDisabledStudents">
                                {{ showDisabledStudents ? 'Hide' : 'Show' }} Disabled Students
                            </button>
                        </div>
                        <div class="card-body table-scroll-md p-0">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Roll No</th>
                                        <th>Department</th>
                                        <th>Email</th>
                                        <th>CGPA</th>
                                        <th>Applications</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="student in students" :key="student.user_id">
                                        <td>{{ student.name }}</td>
                                        <td>{{ student.roll_no }}</td>
                                        <td>{{ student.department }}</td>
                                        <td>{{ student.email }}</td>
                                        <td>{{ student.cgpa }}</td>
                                        <td>{{ student.drives_applied_count }}</td>
                                        <td>
                                            <button class="btn btn-sm btn-info me-1 mb-1" @click="viewStudentProfile(student)">Profile</button>
                                            <button class="btn btn-sm btn-secondary me-1 mb-1" @click="viewStudentApplications(student)">Applications</button>
                                            <button class="btn btn-sm btn-danger mb-1" @click="openDisableModal(student)">Disable</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Disabled Students Table -->
                    <div v-if="showDisabledStudents" class="card shadow-sm mt-2">
                        <div class="card-header fw-bold">Disabled Students</div>
                        <div class="card-body table-scroll-sm">
                            <div v-if="disabledStudents.length > 0">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Roll No</th>
                                            <th>Disable Note</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="student in disabledStudents" :key="student.user_id">
                                            <td>{{ student.name }}</td>
                                            <td>{{ student.roll_no }}</td>
                                            <td>{{ student.disable_note || 'N/A' }}</td>
                                            <td><button class="btn btn-sm btn-success" @click="enableStudent(student)">Enable</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="text-center text-muted p-3">No disabled students found.</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modals for Students -->
            <div class="modal fade" id="disableStudentModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Disable {{ selectedStudent?.name }}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <label class="form-label">Reason/Note (Optional)</label>
                            <textarea v-model="disableNote" class="form-control"></textarea>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" @click="disableStudent">Confirm Disable</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="studentAppsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">Applications for {{ selectedStudent?.name }}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body bg-light" style="max-height: 60vh; overflow-y: auto;">
                            <div v-if="studentApplications.length > 0">
                                <div v-for="app in studentApplications" :key="app.id" class="card mb-3 shadow-sm border-0 rounded-4">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h5 class="card-title fw-bold text-primary mb-1">{{ app.drive.JobTitle }}</h5>
                                                <h6 class="card-subtitle text-muted mb-3"><i class="bi bi-building me-1"></i>{{ app.drive.company_name }}</h6>
                                            </div>
                                            <span class="badge fs-6" :class="app.rejection_reason || app.status === 'Rejected' ? 'bg-danger' : app.status === 'Hired' ? 'bg-success' : 'bg-warning text-dark'">
                                                {{ app.rejection_reason ? 'Rejected' : app.status }}
                                            </span>
                                        </div>
                                        <hr class="my-2">
                                        <div class="d-flex justify-content-between align-items-center mt-2">
                                            <small class="text-muted"><i class="bi bi-calendar me-1"></i>Applied: {{ formatDateTime(app.application_date, false) }}</small>
                                            <a v-if="app.resume" :href="'/' + app.resume" target="_blank" class="btn btn-sm btn-outline-dark">
                                                <i class="bi bi-file-earmark-pdf me-1"></i>View Resume
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="text-center text-muted p-5">
                                <i class="bi bi-folder-x fs-1 d-block mb-3"></i>
                                <h5>No applications found.</h5>
                                <p>This student has not applied to any drives yet.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Companies Tab -->
        <div v-if="currentTab === 'companies'">
             <div class="row">
                <!-- Filters -->
                <div class="col-md-3">
                    <div class="card shadow-sm p-3">
                        <h5 class="fw-bold">Company Filters</h5>
                        
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Company Status</label>
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="companyStatus" id="statusPending" value="pending" v-model="companyFilters.status">
                                <label class="btn btn-outline-primary btn-sm" for="statusPending">Pending</label>
                                
                                <input type="radio" class="btn-check" name="companyStatus" id="statusApproved" value="approved" v-model="companyFilters.status">
                                <label class="btn btn-outline-primary btn-sm" for="statusApproved">Approved</label>
                            </div>
                        </div>

                        <div class="mb-2 d-flex align-items-center justify-content-between">
                            <label class="form-label small fw-semibold text-muted mb-0">Sort By Registration</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="sortCompanyRegDate" v-model="companyFilters.sortByAsc">
                                <label class="form-check-label small text-muted" for="sortCompanyRegDate">{{ companyFilters.sortByAsc ? 'Asc' : 'Desc' }}</label>
                            </div>
                        </div>

                        <p class="text-muted small">Use the search bar to filter companies by name, address, contact, or email.</p>
                        <div class="mt-3" v-if="companyFilters.status === 'approved'">
                            <label class="form-label small fw-semibold text-muted">Filter by Department Interest</label>
                            <div class="border rounded p-2 bg-white" style="height: 150px; overflow-y: auto;">
                                <div v-for="dept in departments" :key="dept.id" class="form-check">
                                    <input class="form-check-input" type="checkbox" :id="'company-dept-' + dept.id" :value="dept.department" v-model="companyFilters.departments">
                                    <label class="form-check-label" :for="'company-dept-' + dept.id">
                                        {{ dept.department }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="col-md-9">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="w-75">
                            <input type="text" class="form-control" v-model="companyFilters.q" @input="debounceFetchCompanies" placeholder="Search by Name, Address, Contact...">
                        </div>
                        <span class="badge bg-primary rounded-pill fs-6" v-if="companyFilters.status === 'approved'">Total Approved: {{ approvedCompanies.length }}</span>
                        <span class="badge bg-primary rounded-pill fs-6" v-if="companyFilters.status === 'pending'">Total Pending: {{ pendingCompanies.length }}</span>
                    </div>

                    <div v-if="companyFilters.status === 'pending'">
                        <div class="card shadow-sm mb-4">
                            <div class="card-header fw-bold bg-warning-subtle">Pending Approvals</div>
                            <div class="card-body table-scroll-sm">
                                <div v-if="pendingCompanies.length > 0">
                                    <table class="table table-hover p-0">
                                        <thead><tr><th>Company Name</th><th>Email</th><th>Age</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            <tr v-for="company in pendingCompanies" :key="company.id">
                                                <td>{{ company.company_name }}</td>
                                                <td>{{ company.email }}</td>
                                                <td>{{ formatDateTime(getCompanyAge(company.registration_date),false) }}</td>
                                                <td>
                                                    <button class="btn btn-sm btn-info me-1" @click="viewCompanyProfile(company)">View</button>
                                                    <button class="btn btn-sm btn-success me-1" @click="updateCompanyStatus(company.id, 'approved')">Approve</button>
                                                    <button class="btn btn-sm btn-danger" @click="updateCompanyStatus(company.id, 'rejected')">Reject</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div v-else class="text-center text-muted p-3">No companies pending approval.</div>
                            </div>
                        </div>

                        <!-- Rejected Companies Table -->
                        <div class="card shadow-sm mt-4">
                            <div class="card-header fw-bold bg-danger-subtle text-danger-emphasis">Rejected Companies</div>
                            <div class="card-body table-scroll-sm">
                                <div v-if="rejectedCompanies.length > 0">
                                    <table class="table table-sm">
                                        <thead><tr><th>Company Name</th><th>Email</th><th>Age</th><th>Action</th></tr></thead>
                                        <tbody>
                                            <tr v-for="company in rejectedCompanies" :key="company.id">
                                                <td>{{ company.company_name }}</td>
                                                <td>{{ company.email }}</td>
                                                <td>{{ getCompanyAge(company.registration_date) }}</td>
                                                <td>
                                                    <button class="btn btn-sm btn-info me-1" @click="viewCompanyProfile(company)">View Profile</button>
                                                    <button class="btn btn-sm btn-info" @click="updateCompanyStatus(company.id,'re-evaluate')">Re-evaluate</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div v-else class="text-center text-muted p-3">No rejected companies found.</div>
                            </div>
                        </div>
                    </div>

                    <div v-if="companyFilters.status === 'approved'">
                        <div class="card shadow-sm">
                            <div class="card-header fw-bold d-flex justify-content-between">
                                <span>Approved Companies</span>
                                <button class="btn btn-sm btn-outline-secondary" @click="showDisabledCompanies = !showDisabledCompanies">
                                    {{ showDisabledCompanies ? 'Hide' : 'Show' }} Disabled Companies
                                </button>
                            </div>
                            <div class="card-body table-scroll-md p-0">
                                <div v-if="approvedCompanies.length > 0">
                                <table class="table table-hover">
                                    <thead><tr><th>Company Name</th><th>Top Dept.</th><th>Approved Drives</th><th>Rejected Drives</th><th>Registration Date</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        <tr v-for="company in approvedCompanies" :key="company.id" :class="{ 'table-danger': company.has_response_delay }" :title="company.has_response_delay ? 'So many delays in responding to applications' : ''">
                                            <td>{{ company.company_name }}</td>
                                            <td>{{ company.highest_posted_department }}</td>
                                            <td>{{ company.approved_drives_count }}</td>
                                            <td>{{ company.rejected_drives_count }}</td>
                                            <td>{{ company.registration_date ? company.registration_date.split('T')[0] : 'N/A' }}</td>
                                            <td>
                                                <button class="btn btn-sm btn-info me-1" @click="viewCompanyProfile(company)">Profile</button>
                                                <button class="btn btn-sm btn-secondary me-1" @click="viewCompanyDrives(company)">Drives</button>
                                                <button class="btn btn-sm btn-danger" @click="updateCompanyStatus(company.id, 'disabled')">Disable</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                </div>
                                <div v-else class="text-center text-muted p-3">No approved companies found.</div>
                            </div>
                        </div>
                        
                        <div v-if="showDisabledCompanies" class="card shadow-sm mt-4">
                            <div class="card-header fw-bold">Disabled Companies</div>
                            <div class="card-body table-scroll-sm">
                                <div v-if="disabledCompanies.length > 0">
                                <table class="table table-sm">
                                    <thead><tr><th>Company Name</th><th>Registration Date</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        <tr v-for="company in disabledCompanies" :key="company.id">
                                            <td>{{ company.company_name }}</td>
                                            <td>{{ company.registration_date ? company.registration_date.split('T')[0] : 'N/A' }}</td>
                                            <td>
                                                <button class="btn btn-sm btn-info me-1" @click="viewCompanyProfile(company)">Profile</button>
                                                <button class="btn btn-sm btn-success" @click="updateCompanyStatus(company.id, 'enabled')">Re-Enable</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                </div>
                                <div v-else class="text-center text-muted p-3">No disabled companies found.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Profile Modal -->
        <div class="modal fade" id="profileModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Profile Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <student-profile v-if="selectedProfile && selectedProfile.roll_no" :user-id="selectedProfile.user_id" :is-admin-view="true" :profile-data="selectedProfile" />
                        <company-profile v-if="selectedProfile && selectedProfile.company_name" :user-id="selectedProfile.user_id" :is-admin-view="true" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: { StudentProfile, CompanyProfile },
    data() {
        return {
            currentTab: 'students',
            allStudents: [],
            studentFilters: { q: '', cgpa: '' },
            selectedStudent: null,
            disableNote: '',
            studentApplications: [],
            disableStudentModal: null,
            studentAppsModal: null,
            allCompanies: [],
            companyFilters: { q: '', departments: [], status: 'pending', sortByAsc: false },
            departments: [],
            showDisabledCompanies: false,
            showDisabledStudents: false,
            profileModal: null,
            selectedProfile: null,
        }
    },
    computed: {
        filteredStudents() {
            let students = this.allStudents;
            if (!students) return [];

            // General search filter
            if (this.studentFilters.q) {
                const query = this.studentFilters.q.toLowerCase().trim();
                if (query) {
                    students = students.filter(s =>
                        (s.name && s.name.toLowerCase().includes(query)) ||
                        (s.roll_no && s.roll_no.toLowerCase().includes(query)) ||
                        (s.department && s.department.toLowerCase().includes(query)) ||
                        (s.email && s.email.toLowerCase().includes(query)) ||
                        (s.phone && s.phone.toLowerCase().includes(query))
                    );
                }
            }

            // CGPA filter
            if (this.studentFilters.cgpa) {
                students = students.filter(s => s.cgpa && parseFloat(s.cgpa) >= this.studentFilters.cgpa);
            }

            // Registration Date Sort
            students = [...students].sort((a, b) => {
                let valA = a.registration_date ? new Date(a.registration_date).getTime() : (a.user_id || 0);
                let valB = b.registration_date ? new Date(b.registration_date).getTime() : (b.user_id || 0);
                
                if (valA === valB) {
                    valA = a.user_id;
                    valB = b.user_id;
                }

                if (this.studentFilters.sortRegDateAsc) {
                    return valA - valB;
                } else {
                    return valB - valA;
                }
            });

            return students;
        },
        students() {
            return this.filteredStudents.filter(s => s.is_active);
        },
        disabledStudents() {
            return this.filteredStudents.filter(s => !s.is_active);
        },
        filteredCompanies() {
            let companies = this.allCompanies;
            if (!companies) return [];

            if (this.companyFilters.q) {
                const query = this.companyFilters.q.toLowerCase().trim();
                if (query) {
                    companies = companies.filter(c =>
                        (c.company_name && c.company_name.toLowerCase().includes(query)) ||
                        (c.address && c.address.toLowerCase().includes(query)) ||
                        (c.contact && c.contact.toLowerCase().includes(query)) ||
                        (c.email && c.email.toLowerCase().includes(query))
                    );
                }
            }
            
            if (this.companyFilters.status === 'approved' && this.companyFilters.departments && this.companyFilters.departments.length > 0) {
                const selectedDepts = this.companyFilters.departments;
                companies = companies.filter(c => {
                    if (!c.drive_departments || c.drive_departments.length === 0) return false;
                    return c.drive_departments.some(driveDepts => {
                        return selectedDepts.every(dept => driveDepts.some(d => (typeof d === 'object' ? d.department : String(d)) === dept));
                    });
                });
            }
            
            companies = [...companies].sort((a, b) => {
                let valA = a.registration_date ? new Date(a.registration_date).getTime() : (a.id || 0);
                let valB = b.registration_date ? new Date(b.registration_date).getTime() : (b.id || 0);
                
                if (valA === valB) {
                    valA = a.id;
                    valB = b.id;
                }

                if (this.companyFilters.sortByAsc) {
                    return valA - valB;
                } else {
                    return valB - valA;
                }
            });
            
            return companies;
        },
        pendingCompanies() { return this.filteredCompanies.filter(c => !c.is_approved && c.user_active); },
        approvedCompanies() { return this.filteredCompanies.filter(c => c.is_approved && c.user_active); },
        disabledCompanies() { return this.filteredCompanies.filter(c => c.is_approved && !c.user_active); },
        rejectedCompanies() { return this.filteredCompanies.filter(c => !c.is_approved && !c.user_active); }
    },
    methods: {
        formatDateTime,
        async fetchAllData() {
            const studentRes = await fetch(`/api/admin/students`, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
            if (studentRes.ok) this.allStudents = await studentRes.json();

            const companyRes = await fetch(`/api/admin/companies`, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
            if (companyRes.ok) this.allCompanies = await companyRes.json();

            const deptRes = await fetch(`/api/departments`, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
            if (deptRes.ok) this.departments = await deptRes.json();
        },
        viewStudentProfile(student) { this.selectedProfile = student; this.profileModal.show(); },
        async viewStudentApplications(student) {
            this.selectedStudent = student;
            const res = await fetch(`/api/admin/student/${student.user_id}/applications`, { 
                headers: { 'Authentication-Token': localStorage.getItem('token') } 
            });
            if (res.ok) { 
                this.studentApplications = await res.json(); 
                this.studentAppsModal.show(); 
            } else { 
                alert('Could not fetch applications.'); 
            }
        },
        openDisableModal(student) { this.selectedStudent = student; this.disableNote = ''; this.disableStudentModal.show(); },
        async disableStudent() {
            const res = await fetch(`/api/admin/student/${this.selectedStudent.user_id}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ action: 'disable', note: this.disableNote })
            });
            if (res.ok) { alert('Student disabled.'); this.disableStudentModal.hide(); this.fetchAllData(); }
            else { alert('Failed to disable student.'); }
        },
        async enableStudent(student) {
            const note = prompt(`Are you sure you want to re-enable ${student.name}? You can add an optional reactivation note below:`, "");
            if (note === null) return; // user cancelled
            const res = await fetch(`/api/admin/student/${student.user_id}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ action: 'enable', note: note })
            });
            if (res.ok) { alert('Student enabled.'); this.fetchAllData(); }
            else { alert('Failed to enable student.'); }
        },
        getCompanyAge(dateString) {
            if (!dateString || dateString === 'None' || dateString === '') return 'Unknown';
            const regDate = new Date(dateString);
            if (isNaN(regDate.getTime())) return 'Unknown';
            const now = new Date();
            const diffTime = now - regDate;
            if (diffTime < 0) return 'Today';
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return '1 day ago';
            if (diffDays < 30) return `${diffDays} days ago`;
            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths === 1) return '1 month ago';
            if (diffMonths < 12) return `${diffMonths} months ago`;
            const diffYears = Math.floor(diffDays / 365);
            if (diffYears === 1) return '1 year ago';
            return `${diffYears} years ago`;
        },
        debounceFetchStudents() {
            clearTimeout(this.studentSearchTimeout);
            this.studentSearchTimeout = setTimeout(() => { /* Reactivity handles filtering */ }, 300);
        },
        debounceFetchCompanies() {
            clearTimeout(this.companySearchTimeout);
            this.companySearchTimeout = setTimeout(() => { /* Reactivity handles filtering */ }, 300);
        },

        viewCompanyProfile(company) { this.selectedProfile = company; this.profileModal.show(); },
        viewCompanyDrives(company) { this.$router.push({ path: '/manage_drives', query: { q: company.company_name } }); },
        async updateCompanyStatus(companyId, status) {
            let note = "";
            if (status === 'disabled') {
                note = prompt("Are you sure you want to disable this company? You can add an optional reason note below:", "");
                if (note === null) return;
            } else if (status === 'enabled') {
                note = prompt("Are you sure you want to re-enable this company? You can add an optional note below:", "");
                if (note === null) return;
            } else {
                if (!confirm(`Are you sure you want to ${status} this company? `)) return;
            }
            const res = await fetch(`/api/admin/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ status: status, note: note })
            });
            if (res.ok) { alert(`Company status updated to ${status}. `); this.fetchAllData(); }
            else { alert('Failed to update status.'); }
        },
        switchTab(tab) {
            this.currentTab = tab; // Data is already fetched, just switch view
        }
    },
    watch: {
        '$route.query'(newQuery) {
            if (newQuery.tab) {
                this.currentTab = newQuery.tab;
            }
        }
    },
    mounted() {
        this.profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
        this.disableStudentModal = new bootstrap.Modal(document.getElementById('disableStudentModal'));
        this.studentAppsModal = new bootstrap.Modal(document.getElementById('studentAppsModal'));
        this.studentSearchTimeout = null;
        this.companySearchTimeout = null;   
        
        if (this.$route.query.studentId) {
            this.viewStudentProfile({ user_id: parseInt(this.$route.query.studentId) });
        }
        if (this.$route.query.tab) {
            this.currentTab = this.$route.query.tab;
        }
        document.getElementById('profileModal').addEventListener('hidden.bs.modal', () => { this.selectedProfile = null; });
        this.fetchAllData();
    }
};

export default AdminManageUsers;