import StudentProfile from '../components/student_profile.js';
import CompanyProfile from '../components/company_profile.js';
import { formatDateTime } from '../utils/formatDateTime.js';
const AdminManageUsers = {
    template: `
    <div class="container-fluid mt-2 pb-5">
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
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="student in disabledStudents" :key="student.user_id">
                                            <td>{{ student.name }}</td>
                                            <td>{{ student.roll_no }}</td>
                                            <td>
                                                <button class="btn btn-sm btn-info me-1" @click="viewStudentProfile(student)">Profile</button>
                                                <button class="btn btn-sm btn-success" @click="enableStudent(student)">Enable</button>
                                            </td>
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
                            <textarea v-model="note" class="form-control"></textarea>
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
                        <div class="modal-body bg-light" style="max-height: 70vh; overflow-y: auto;">
                            <div v-if="studentApplications.length > 0">
                                <div class="table-responsive bg-white rounded border shadow-sm">
                                    <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.8rem; text-align: left;">
                                        <thead class="table-light">
                                            <tr>
                                                <th class="ps-3 py-2">Job Role</th>
                                                <th>Status</th>
                                                <th>Applied On</th>
                                                <th>Remarks</th>
                                                <th>Interviews</th>
                                                <th class="text-end pe-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Loop and collapse logic -->
                                            <template v-for="app in studentApplications" :key="app.id">
                                                <tr>
                                                    <td class="ps-3 py-2">
                                                        <strong class="text-primary d-block">{{ app.drive.JobTitle }}</strong>
                                                        <small class="text-muted"><i class="bi bi-building me-1"></i>{{ app.drive.company_name }}</small>
                                                    </td>
                                                    <td>
                                                        <span class="badge px-2 py-1" style="font-size: 0.7rem;" :class="app.rejection_reason || app.status === 'Rejected' ? 'bg-danger' : app.status === 'Hired' ? 'bg-success' : 'bg-warning text-dark'">
                                                            {{ app.rejection_reason ? 'Rejected' : app.status }}
                                                        </span>
                                                    </td>
                                                    <td class="text-muted">{{ formatDateTime(app.application_date, false) }}</td>
                                                    <td>
                                                        <span v-if="app.status === 'Rejected' || app.rejection_reason">
                                                            <a href="#" class="fw-semibold text-danger text-decoration-underline" @click.prevent="showRemarksDetail(app.rejection_reason, app.note_for_student)">View</a>
                                                        </span>
                                                        <span v-else class="text-muted small">-</span>
                                                    </td>
                                                    <td>
                                                        <span v-if="app.interviews && app.interviews.length > 0">
                                                            <button class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.7rem;" @click="toggleInterviewCollapse(app.id)">
                                                                Interviews ({{ app.interviews.length }})
                                                            </button>
                                                        </span>
                                                        <span v-else class="text-muted small">-</span>
                                                    </td>
                                                    <td class="text-end pe-3">
                                                        <a v-if="app.resume" :href="'/' + app.resume" target="_blank" class="btn btn-sm btn-outline-dark py-0.5 px-2 fw-medium me-1" style="font-size: 0.75rem;">
                                                            Resume
                                                        </a>
                                                    </td>
                                                </tr>
                                                <tr v-if="expandedAppInterviews === app.id" class="table-light">
                                                    <td colspan="6" class="p-3">
                                                        <div class="card border p-2 shadow-xs bg-white rounded">
                                                            <h6 class="fw-bold small text-muted mb-2"><i class="bi bi-calendar-event me-1"></i> Interview History for {{ app.drive.JobTitle }}:</h6>
                                                            <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.75rem;">
                                                                <thead class="table-light">
                                                                    <tr>
                                                                        <th>Round</th>
                                                                        <th>Date & Time</th>
                                                                        <th>Status</th>
                                                                        <th>Verdict</th>
                                                                        <th>Remark</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr v-for="i in app.interviews" :key="i.id">
                                                                        <td><strong>R{{ i.round_no }}: {{ i.round_name }}</strong></td>
                                                                        <td>{{ i.datetime_formatted }}</td>
                                                                        <td>
                                                                            <span class="badge" :class="i.status === 'scheduled' ? 'bg-primary' : i.status === 'completed' ? 'bg-success' : 'bg-secondary'">
                                                                                {{ i.status }}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <span v-if="i.result" class="badge" :class="i.result === 'passed' ? 'bg-success' : 'bg-danger'">
                                                                                {{ i.result }}
                                                                            </span>
                                                                            <span v-else class="text-muted">-</span>
                                                                        </td>
                                                                        <td>
                                                                            <a href="#" class="text-primary text-decoration-underline" @click.prevent="showRemarksDetail(i.remarks, i.student_facing_remarks)">Remark</a>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </template>
                                        </tbody>
                                    </table>
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
                                        <thead><tr><th>Company Name</th><th>Email</th><th>Registered</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            <tr v-for="company in pendingCompanies" :key="company.id">
                                                <td>{{ company.company_name }}</td>
                                                <td>{{ company.email }}</td>
                                                <td>{{ getCompanyAge(company.registration_date) }}</td>
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
                                        <thead><tr><th>Company Name</th><th>Email</th><th>Registered</th><th>Action</th></tr></thead>
                                        <tbody>
                                            <tr v-for="company in rejectedCompanies" :key="company.id">
                                                <td>{{ company.company_name }}</td>
                                                <td>{{ company.email }}</td>
                                                <td>{{ getCompanyAge(company.registration_date) }}</td>
                                                <td>
                                                    <button class="btn btn-sm btn-info me-1" @click="viewCompanyProfile(company)">View Profile</button>
                                                    <button class="btn btn-sm btn-warning" @click="updateCompanyStatus(company.id,'re-evaluate')">Re-evaluate</button>
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
        
        <!-- Remarks Detail Modal -->
        <div class="modal fade" id="remarksDetailModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow border-0">
                    <div class="modal-header bg-light">
                        <h6 class="modal-title fw-bold">Remarks Detail</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-3">
                        <div class="mb-3 text-start">
                            <span class="d-block small fw-bold text-danger"><i class="bi bi-lock-fill me-1"></i>Internal Remark:</span>
                            <p class="mb-0 p-2 bg-light rounded text-dark mt-1 small" style="white-space: pre-wrap;">{{ remarksDetail.internal || 'None' }}</p>
                        </div>
                        <div class="text-start">
                            <span class="d-block small fw-bold text-success"><i class="bi bi-eye-fill me-1"></i>Student Facing Remark:</span>
                            <p class="mb-0 p-2 bg-light rounded text-dark mt-1 small" style="white-space: pre-wrap;">{{ remarksDetail.student || 'None' }}</p>
                        </div>
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
            note: '',
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
            remarksDetail: { internal: '', student: '' },
            remarksDetailModal: null,
            expandedAppInterviews: null,
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
        toggleInterviewCollapse(appId) {
            this.expandedAppInterviews = this.expandedAppInterviews === appId ? null : appId;
        },
        showRemarksDetail(internal, student) {
            this.remarksDetail = { internal: internal || 'None', student: student || 'None' };
            if (this.remarksDetailModal) {
                this.remarksDetailModal.show();
            }
        },
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
        openDisableModal(student) { this.selectedStudent = student; this.note = ''; this.disableStudentModal.show(); },
        async disableStudent() {
            const res = await fetch(`/api/admin/student/${this.selectedStudent.user_id}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ action: 'disable', note: this.note })
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
        this.remarksDetailModal = new bootstrap.Modal(document.getElementById('remarksDetailModal'));
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