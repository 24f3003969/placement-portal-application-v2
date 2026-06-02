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
                    <button @click="$emit('back')" class="btn btn-light me-3"><i class="bi bi-arrow-left"></i> Back</button>
                    <h3 class="d-inline-block mb-0 fw-bold">Drive Insights: {{ drive.JobTitle }}</h3>
                </div>
                <div>
                    <button @click="showDetails = true" class="btn btn-outline-info me-2">View Drive Details</button>
                    <button v-if="userRole === 'comp'" @click="screenApplications" class="btn btn-primary"><i class="bi bi-person-check-fill me-2"></i>Screen Applications</button>
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
                                    <table class="table table-sm table-hover">
                                        <thead class="table-light" style="position: sticky; top: 0;">
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
            </div>
        </div>
    </div>
    <div v-else>
        <drive-details-view :drive="drive" mode="details_only" @back="showDetails = false"></drive-details-view>
    </div>
    `,
    data() {
        return {
            insights: null,
            loading: true,
            showDetails: false,
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
        }
    },
    mounted() {
        this.fetchInsights();
    }
};

export default ViewDrive;