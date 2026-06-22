import DriveDetailsView from './drive_details_view.js';

const ViewDrive = {
    props: ['drive', 'userRole'],
    components: {
        'drive-details-view': DriveDetailsView,
    },
    template: `
    <div v-if="!showDetails">
        <div class="container py-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <button @click="$emit('back'); fetchInsights()" class="btn btn-light me-3"><i class="bi bi-arrow-left"></i> Back</button>
                    <h3 class="d-inline-block mb-0 fw-bold">Drive Insights: {{ drive.JobTitle }}</h3>
                    <span class="badge ms-3" :class="statusBadgeClass(drive.Status)">{{ drive.Status }}</span>
                </div>
                <div>
                    <button @click="showDetails = true; fetchInsights()" class="btn btn-outline-info me-2">View Drive Details</button>
                    
                    <span v-if="userRole === 'admin'" class="d-inline-block">
                        <span v-if="drive.Status === 'Active'">
                            <button @click="$emit('suspend', drive); fetchInsights()" class="btn btn-warning me-2"><i class="bi bi-pause-fill me-1"></i>Suspend</button>
                            <button @click="$emit('close-applications', drive); fetchInsights()" class="btn btn-outline-danger me-2"><i class="bi bi-x-circle-fill me-1"></i>Close Applications</button>
                            <button @click="$emit('close', drive); fetchInsights()" class="btn btn-danger me-2"><i class="bi bi-x-circle-fill me-1"></i>Close Drive</button>
                        </span>
                        <span v-else-if="drive.Status === 'Suspended'">
                            <button @click="$emit('approve', drive.DriveID); fetchInsights()" class="btn btn-success me-2"><i class="bi bi-play-fill me-1"></i>Re-activate</button>
                            <button @click="$emit('close-applications', drive); fetchInsights()" class="btn btn-outline-danger me-2"><i class="bi bi-x-circle-fill me-1"></i>Close Applications</button>
                            <button @click="$emit('close', drive); fetchInsights()" class="btn btn-danger me-2"><i class="bi bi-x-circle-fill me-1"></i>Close Drive</button>
                        </span>
                        <span v-else-if="drive.Status === 'Pending'">
                            <button @click="$emit('approve', drive.DriveID); fetchInsights()" class="btn btn-success me-2"><i class="bi bi-check-circle-fill me-1"></i>Approve</button>
                            <button @click="$emit('reject', drive); fetchInsights()" class="btn btn-danger me-2"><i class="bi bi-x-circle-fill me-1"></i>Reject</button>
                        </span>
                        <span v-else-if="drive.Status === 'Application Closed'">
                            <button @click="$emit('close', drive); fetchInsights()" class="btn btn-danger me-2"><i class="bi bi-x-circle-fill me-1"></i>Close Drive</button>
                        </span>
                    </span>
                    
                    <button v-if="userRole === 'comp'" @click="screenApplications(); fetchInsights()" class="btn btn-primary"><i class="bi bi-person-check-fill me-2"></i>Screen Applications</button>
                </div>
            </div>

            <div v-if="loading" class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-if="!loading && insights">
                <div class="row">
                    <div class="col-md-3">
                        <div class="card text-center shadow-sm border-0 h-100">
                            <div class="card-body">
                                <h6 class="text-muted small text-uppercase">Screening Pass Rate</h6>
                                <p class="fs-2 fw-bold mb-0">{{ insights.pass_rate }}%</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center shadow-sm border-0 h-100">
                            <div class="card-body">
                                <h6 class="text-muted small text-uppercase">Avg. CGPA (All)</h6>
                                <p class="fs-2 fw-bold mb-0">{{ insights.avg_cgpa_all }}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center shadow-sm border-0 h-100">
                            <div class="card-body">
                                <h6 class="text-muted small text-uppercase">Avg. CGPA (Shortlisted)</h6>
                                <p class="fs-2 fw-bold mb-0">{{ insights.avg_cgpa_shortlisted }}</p>
                            </div>
                        </div>
                    </div>
                     <div class="col-md-3">
                        <div class="card text-center shadow-sm border-0 h-100">
                            <div class="card-body">
                                <h6 class="text-muted small text-uppercase">Least Common Skill</h6>
                                <p class="fs-4 fw-bold mb-0 mt-2">{{ insights.least_common_skill || 'N/A' }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Funnel / Application Status Distribution -->
                <div class="row mt-4" v-if="insights.status_distribution">
                    <div class="col-12">
                        <div class="card shadow-sm border-0">
                            <div class="card-body">
                                <h5 class="fw-bold mb-3">Recruitment Funnel Breakdown</h5>
                                <div class="d-flex flex-wrap gap-2 text-start">
                                    <div v-for="(count, status) in insights.status_distribution" :key="status" class="px-3 py-2 bg-light rounded border text-center flex-grow-1 shadow-xs">
                                        <h6 class="text-muted small text-uppercase mb-1" style="font-size: 0.65rem;">{{ status }}</h6>
                                        <span class="fs-4 fw-bold text-dark">{{ count }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-md-5">
                        <div class="card shadow-sm border-0 h-100">
                            <div class="card-body">
                                <h5 class="fw-bold mb-3">Top 3 Skills</h5>
                                <ul v-if="insights.top_skills && insights.top_skills.length" class="list-group list-group-flush">
                                    <li v-for="skill in insights.top_skills" :key="skill.skill" class="list-group-item d-flex justify-content-between align-items-center">
                                        <span class="fw-medium">{{ skill.skill }}</span>
                                        <span class="badge bg-primary rounded-pill">{{ skill.percentage }}%</span>
                                    </li>
                                </ul>
                                <p v-else class="text-muted">No skill data available.</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="card shadow-sm border-0 h-100">
                            <div class="card-body">
                                <h5 class="fw-bold mb-3">Department Distribution</h5>
                                <div v-if="insights.department_distribution && insights.department_distribution.length">
                                    <div v-for="dept in insights.department_distribution" :key="dept.department" class="mb-2">
                                        <div class="d-flex justify-content-between">
                                            <span class="small fw-medium">{{ dept.department }}</span>
                                            <span class="small fw-medium">{{ dept.percentage }}%</span>
                                        </div>
                                        <div class="progress" style="height: 10px;">
                                            <div class="progress-bar" role="progressbar" :style="{ width: dept.percentage + '%' }" :aria-valuenow="dept.percentage" aria-valuemin="0" aria-valuemax="100"></div>
                                        </div>
                                    </div>
                                </div>
                                 <p v-else class="text-muted">No department data available.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card shadow-sm border-0">
                            <div class="card-body">
                                <h5 class="fw-bold mb-3">Hired Students</h5>
                                <div v-if="insights.hired_students && insights.hired_students.length > 0" class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                                    <table class="table table-sm table-hover text-start">
                                        <thead class="table-light text-secondary" style="position: sticky; top: 0; font-size: 0.75rem;">
                                            <tr>
                                                <th>Name</th>
                                                <th>Roll No</th>
                                                <th>Joining Date</th>
                                                <th>CTC/Stipend</th>
                                                <th>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="student in insights.hired_students" :key="student.roll_no">
                                                <td>{{ student.name }}</td>
                                                <td>{{ student.roll_no }}</td>
                                                <td>{{ formatDate(student.joining_date) }}</td>
                                                <td>{{ student.salary }} {{ student.type === 'Job' ? 'LPA' : '/month' }}</td>
                                                <td>{{ student.type }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p v-else class="text-muted m-0">No students have been hired from this drive yet.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Complete Applicant List Table -->
                <div class="row mt-4" v-if="userRole === 'admin'">
                    <div class="col-12">
                        <div class="card shadow-sm border-0">
                            <div class="card-body">
                                <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                                    <h5 class="fw-bold mb-0">All Applicants ({{ insights.all_applicants ? insights.all_applicants.length : 0 }})</h5>
                                    <div class="w-100 w-sm-25">
                                        <input type="text" class="form-control form-control-sm" v-model="applicantSearch" placeholder="Search by name, roll no, status...">
                                    </div>
                                </div>
                                <div v-if="filteredApplicants && filteredApplicants.length > 0" class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                    <table class="table table-sm table-hover align-middle text-start">
                                        <thead class="table-light text-secondary" style="position: sticky; top: 0; font-size: 0.75rem;">
                                            <tr>
                                                <th>Name</th>
                                                <th>Roll No</th>
                                                <th>Department</th>
                                                <th>CGPA</th>
                                                <th>Apply Date</th>
                                                <th>Latest Round</th>
                                                <th>Round Status</th>
                                                <th>Application Status</th>
                                                <th class="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody style="font-size: 0.8rem;">
                                            <tr v-for="applicant in filteredApplicants" :key="applicant.id">
                                                <td><strong>{{ applicant.name }}</strong></td>
                                                <td>{{ applicant.roll_no }}</td>
                                                <td>{{ applicant.department }}</td>
                                                <td><span class="badge bg-secondary-subtle text-secondary-emphasis">{{ applicant.cgpa }}</span></td>
                                                <td>{{ formatDate(applicant.application_date) }}</td>
                                                <td>{{ applicant.latest_interview_round }}</td>
                                                <td>
                                                    <span class="badge" :class="interviewStatusBadge(applicant.latest_interview_status)">
                                                        {{ applicant.latest_interview_status }}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="badge" :class="statusBadgeClass(applicant.status)">
                                                        {{ applicant.status }}
                                                    </span>
                                                </td>
                                                <td class="text-end">
                                                    <a v-if="applicant.resume" :href="'/' + applicant.resume" target="_blank" class="btn btn-sm btn-outline-dark me-1 py-0 px-2 fw-medium" style="font-size: 0.7rem;">
                                                        <i class="bi bi-file-earmark-pdf"></i> Resume
                                                    </a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p v-else class="text-muted m-0">No applicants matching search criteria.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
    <div v-else>
        <drive-details-view :drive="drive" mode="details_only" @back="showDetails = false; fetchInsights()"></drive-details-view>
    </div>
    `,
    data() {
        return {
            insights: null,
            loading: true,
            showDetails: false,
            applicantSearch: '',
        }
    },
    computed: {
        filteredApplicants() {
            if (!this.insights || !this.insights.all_applicants) return [];
            const query = this.applicantSearch.toLowerCase().trim();
            if (!query) return this.insights.all_applicants;
            return this.insights.all_applicants.filter(app => 
                (app.name && app.name.toLowerCase().includes(query)) ||
                (app.roll_no && app.roll_no.toLowerCase().includes(query)) ||
                (app.department && app.department.toLowerCase().includes(query)) ||
                (app.status && app.status.toLowerCase().includes(query)) ||
                (app.latest_interview_round && app.latest_interview_round.toLowerCase().includes(query))
            );
        }
    },
    watch: {
        drive: {
            handler(newVal) {
                if (newVal) {
                    this.fetchInsights();
                }
            },
            deep: true
        }
    },
    methods: {
        formatDate(isoString) {
            if (!isoString) return 'N/A';
            return new Date(isoString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },
        async fetchInsights() {
            this.loading = true;
            try {
                const res = await fetch(`/api/drive_viewing/${this.drive.DriveID}`, {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) {
                    this.insights = await res.json();
                } else {
                    console.error("Failed to fetch drive insights");
                    alert("Could not load drive statistics.");
                }
            } catch (error) {
                console.error("Error fetching insights:", error);
            } finally {
                this.loading = false;
            }
        },
        screenApplications() {
            this.$router.push({ path: '/company_applications', query: { drive_id: this.drive.DriveID } });
        },
        statusBadgeClass(status) {
            switch (status) {
                case 'Applied': return 'bg-light text-dark border';
                case 'Active': return 'bg-success';
                case 'Pending': return 'bg-warning text-dark';
                case 'Suspended': return 'bg-warning text-dark';
                case 'Shortlisted': return 'bg-info text-white';
                case 'Interviewing': return 'bg-primary text-white';
                case 'Selected': return 'bg-success text-white';
                case 'Hired': return 'bg-success text-white';
                case 'Rejected':
                case 'Application Closed': return 'bg-danger';
                case 'Closed': return 'bg-dark';
                default: return 'bg-secondary';
            }
        },
        statusColorClass(status) {
            switch (status) {
                case 'Hired': return 'text-success';
                case 'Selected': return 'text-success';
                case 'Shortlisted': return 'text-info';
                case 'Interviewing': return 'text-primary';
                case 'Rejected': return 'text-danger';
                case 'Suspended': return 'text-warning';
                default: return 'text-secondary';
            }
        },
        interviewStatusBadge(status) {
            switch (status) {
                case 'scheduled': return 'bg-primary text-white';
                case 'completed': return 'bg-success text-white';
                case 'canceled': return 'bg-danger text-white';
                case 'suspended': return 'bg-warning text-dark';
                default: return 'bg-secondary text-white';
            }
        },
        viewProfileFromInsights(applicant) {
            this.$router.push({ path: '/manage_users', query: { studentId: applicant.user_id } });
        }
    },
    mounted() {
        this.fetchInsights();
    }
};

export default ViewDrive;