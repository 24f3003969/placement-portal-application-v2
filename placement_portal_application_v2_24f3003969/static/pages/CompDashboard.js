import { formatDateTime } from '../utils/formatDateTime.js';
import StudentProfile from '../components/student_profile.js';

const CompDashboard={
    template:`
    <div class="container-fluid py-4">
        <div v-if="loading" class="d-flex justify-content-center align-items-center" style="height: 80vh;">
            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>

        <div v-if="!loading && dashboardData">
            <!-- 1. Top Section: KPI Cards -->
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="fw-bold">Company Dashboard</h3>
                <router-link to="/posted_drives?action=new" class="btn btn-primary">
                    <i class="bi bi-plus-circle me-2"></i>Post New Drive
                </router-link>
            </div>
            <div class="row g-3">
                <div class="col-md-3">
                    <router-link to="/posted_drives" class="text-decoration-none">
                        <div class="card shadow-sm border-0 h-100 hover-shadow transition-all">
                            <div class="card-body text-center p-3 d-flex flex-column justify-content-center">
                                <h6 class="text-uppercase small fw-bold text-muted mb-1">Active Drives</h6>
                                <h2 class="fw-bolder mb-0 text-dark">{{ dashboardData.kpis.active_drives }}</h2>
                            </div>
                        </div>
                    </router-link>
                </div>
                <div class="col-md-3">
                    <div class="card shadow-sm border-0 h-100 hover-shadow transition-all position-relative">
                        <div class="card-body p-3 d-flex flex-column justify-content-between">
                            <div class="text-center">
                                <h6 class="text-uppercase small fw-bold text-muted mb-1">Total Applicants</h6>
                                <h2 class="fw-bolder mb-0 text-dark">{{ dashboardData.kpis.total_applicants }}</h2>
                            </div>
                            <div style="height: 40px; width: 100%; margin-top: 10px;">
                                <canvas id="velocityChart"></canvas>
                            </div>
                        </div>
                        <router-link to="/company_applications" class="stretched-link"></router-link>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card shadow-sm border-0 h-100 hover-shadow transition-all">
                        <div class="card-body text-center p-3 d-flex flex-column justify-content-center">
                            <h6 class="text-uppercase small fw-bold text-muted mb-1">Time to Hire</h6>
                            <div class="d-flex align-items-center justify-content-center">
                                <h2 class="fw-bolder mb-0 text-primary">{{ dashboardData.insights.time_to_hire_days }}</h2>
                                <span class="ms-1 text-muted fw-bold">days</span>
                            </div>
                            <small class="text-muted mt-1" style="font-size: 0.65rem;">Average from app to offer</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <router-link to="/company_applications?status=Hired" class="text-decoration-none">
                        <div class="card shadow-sm border-0 h-100 hover-shadow transition-all">
                            <div class="card-body text-center p-3 d-flex flex-column justify-content-center">
                                <h6 class="text-uppercase small fw-bold text-muted mb-1">Hired Students</h6>
                                <h2 class="fw-bolder mb-0 text-success">{{ dashboardData.kpis.hired_students }}</h2>
                            </div>
                        </div>
                    </router-link>
                </div>
            </div>

            <!-- 2. Middle Section: Power Split -->
            <div class="row mt-4 g-3">
                <!-- Left Side: Hiring Funnel & Skill Cloud -->
                <div class="col-md-7 d-flex flex-column gap-3">
                    <div class="card shadow-sm border-0 flex-grow-1">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3 text-secondary text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.5px;">Hiring Funnel</h6>
                            <canvas id="funnelChart" style="max-height: 230px;"></canvas>
                        </div>
                    </div>
                    
                    <div class="card shadow-sm border-0">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3 text-secondary text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.5px;"><i class="bi bi-cloud-check text-info me-2"></i>Applicant Skill Cloud</h6>
                            <div class="d-flex flex-wrap gap-2">
                                <span v-for="skill in dashboardData.insights.skill_cloud" :key="skill.skill" 
                                      class="badge bg-light text-dark border shadow-sm px-3 py-2 fw-medium"
                                      :style="{ fontSize: Math.max(0.75, Math.min(1.1, 0.7 + (skill.count / (dashboardData.kpis.total_applicants || 1)))) + 'rem' }">
                                    {{ skill.skill }} <span class="opacity-50 small ms-1" style="font-size: 0.65rem;">({{ skill.count }})</span>
                                </span>
                                <div v-if="!dashboardData.insights.skill_cloud.length" class="text-muted small w-100 text-center py-2">No skill data available.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Side: Action Center -->
                <div class="col-md-5 d-flex flex-column gap-3">
                    <div class="card shadow-sm border-0">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3 text-secondary text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.5px;">Action Center</h6>
                            <div class="list-group list-group-flush">
                                
                                <router-link to="/company_applications?status=Pending" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-0 py-2 border-0 mb-1 rounded bg-light hover-accent">
                                    <div class="d-flex align-items-center">
                                        <div class="bg-primary text-white rounded p-2 me-3"><i class="bi bi-person-lines-fill"></i></div>
                                        <div>
                                            <div class="fw-bold" style="font-size: 0.85rem;">Pending Screenings</div>
                                            <small class="text-muted" style="font-size: 0.7rem;">Applicants waiting for initial review</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-primary rounded-pill me-2">{{ dashboardData.action_center.pending_screenings }}</span>
                                </router-link>
                                
                                <router-link to="/company_applications?status=Shortlisted&subFilter=awaiting" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-0 py-2 border-0 mb-1 rounded bg-light hover-accent">
                                    <div class="d-flex align-items-center">
                                        <div class="bg-info text-white rounded p-2 me-3"><i class="bi bi-calendar-plus-fill"></i></div>
                                        <div>
                                            <div class="fw-bold" style="font-size: 0.85rem;">Unscheduled Interviews</div>
                                            <small class="text-muted" style="font-size: 0.7rem;">Shortlisted students needing slots scheduled</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-info text-white rounded-pill me-2">{{ dashboardData.action_center.unscheduled }}</span>
                                </router-link>

                                <router-link to="/company_interviews" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-0 py-2 border-0 mb-1 rounded bg-light hover-accent">
                                    <div class="d-flex align-items-center">
                                        <div class="bg-warning text-dark rounded p-2 me-3"><i class="bi bi-chat-square-text-fill"></i></div>
                                        <div>
                                            <div class="fw-bold" style="font-size: 0.85rem;">Feedback Due</div>
                                            <small class="text-muted" style="font-size: 0.7rem;">Completed slots waiting for evaluations</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-warning text-dark rounded-pill me-2">{{ dashboardData.action_center.feedback_due }}</span>
                                </router-link>

                                <router-link to="/company_applications?status=Selected&subFilterSelected=pending" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-0 py-2 border-0 rounded bg-light hover-accent">
                                    <div class="d-flex align-items-center">
                                        <div class="bg-success text-white rounded p-2 me-3"><i class="bi bi-file-earmark-check-fill"></i></div>
                                        <div>
                                            <div class="fw-bold" style="font-size: 0.85rem;">Offers Pending Dispatch</div>
                                            <small class="text-muted" style="font-size: 0.7rem;">Selected candidates waiting for an offer letter</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-success rounded-pill me-2">{{ dashboardData.funnel.shortlisted - dashboardData.funnel.hired }}</span>
                                </router-link>

                            </div>
                        </div>
                    </div>
                    
                    <div class="card shadow-sm border-0 flex-grow-1" style="min-height: 250px;">
                        <div class="card-body d-flex flex-column h-100">
                            <h6 class="fw-bold mb-2 text-secondary text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.5px;">Recent Applications</h6>
                            <div class="list-group list-group-flush flex-grow-1" style="overflow-y: auto; max-height: 220px;">
                                <div v-for="(notification, index) in dashboardData.notifications" :key="'notif-' + index" class="list-group-item px-1 py-2 border-light">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold" style="width: 32px; height: 32px; font-size: 0.8rem;">
                                                {{ notification.student_name.charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <h6 class="mb-0 fw-bold" style="font-size: 0.85rem;"><a href="#" @click.prevent="viewStudentProfile(notification.student_id)" class="text-decoration-none text-dark hover-primary">{{ notification.student_name }}</a></h6>
                                                <small class="text-muted" style="font-size: 0.75rem;">{{ notification.job_title }}</small>
                                            </div>
                                        </div>
                                        <small class="text-muted fw-medium text-end" style="font-size: 0.65rem; min-width: 60px;">{{ formatRelativeTime(notification.timestamp) }}</small>
                                    </div>
                                    <div class="d-flex gap-2 mt-2 ms-5">
                                        <button @click="handleQuickAction(notification.id, 'Shortlisted')" class="btn btn-sm btn-success bg-gradient py-0 px-2 shadow-sm rounded-pill fw-medium" style="font-size: 0.65rem;"><i class="bi bi-check me-1"></i>Shortlist</button>
                                        <button @click="handleQuickAction(notification.id, 'Rejected')" class="btn btn-sm btn-outline-danger py-0 px-2 shadow-sm rounded-pill fw-medium" style="font-size: 0.65rem;"><i class="bi bi-x me-1"></i>Reject</button>
                                    </div>
                                </div>
                                <div v-if="dashboardData.notifications.length === 0" class="text-center text-muted p-3 mt-4">
                                    <i class="bi bi-inbox fs-3 d-block mb-2 opacity-50"></i>
                                    <small>No pending applications.</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. Bottom Section: Recent Hires -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3 text-secondary text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.5px;">Recent Hires</h6>
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="ps-3 border-0 rounded-start">Student Name</th>
                                            <th class="border-0">Role Hired For</th>
                                            <th class="border-0">Joining Date</th>
                                            <th class="text-end pe-3 border-0 rounded-end">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody style="max-height: 300px; overflow-y: auto;">
                                        <tr v-for="(hire, index) in dashboardData.recent_hires" :key="'hire-' + index">
                                            <td class="ps-3 fw-bold">
                                                <a href="#" @click.prevent="viewStudentProfile(hire.student_user_id)" class="text-decoration-none text-dark hover-primary">{{ hire.student_name }}</a>
                                            </td>
                                            <td>{{ hire.job_title }}</td>
                                            <td>{{ hire.hire_date ? formatDateTime(hire.hire_date,false) : 'N/A' }}</td>
                                            <td class="text-end pe-3">
                                                <div class="d-flex gap-1 justify-content-end">
                                                    <button @click="viewStudentProfile(hire.student_user_id)" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 shadow-sm" style="font-size: 0.75rem;">View Profile</button>
                                                    <a v-if="hire.offer_letter" :href="'/' + hire.offer_letter" target="_blank" class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 shadow-sm" style="font-size: 0.75rem;">View Offer</a>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="dashboardData.recent_hires.length === 0">
                                            <td colspan="4" class="text-center text-muted py-4">No students have been hired yet.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick View Modal -->
        <div class="modal fade" id="quickProfileModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-light border-0">
                        <h5 class="modal-title fw-bold">Applicant Profile Overview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <student-profile v-if="selectedStudentId" :user-id="selectedStudentId" :is-admin-view="true" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: {
        'student-profile': StudentProfile
    },
    data(){
        return{
            loading: true,
            dashboardData: null,
            funnelChart: null,
            velocityChart: null,
            selectedStudentId: null,
            quickProfileModal: null
        }
    },
    methods: {
        formatDateTime,
        formatRelativeTime(isoString) {
            const date = new Date(isoString);
            const now = new Date();
            const diffSeconds = Math.round((now - date) / 1000);
            const diffMinutes = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMinutes / 60);
            const diffDays = Math.round(diffHours / 24);

            if (diffSeconds < 60) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays === 1) return `Yesterday`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-IN');
        },
        async fetchDashboardData() {
            this.loading = true;
            try {
                const res = await fetch('/api/company_dashboard_summary', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) {
                    this.dashboardData = await res.json();
                    this.loading = false;
                    this.$nextTick(() => {
                        this.renderFunnelChart();
                        this.renderVelocityChart();
                    });
                } else {
                    alert("Could not load dashboard data.");
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                alert("An error occurred while loading the dashboard.");
            } finally {
                this.loading = false;
            }
        },
        async handleQuickAction(appId, status) {
            if (status === 'Rejected' && !confirm('Are you sure you want to reject this applicant?')) return;
            try {
                const res = await fetch(`/api/view_application/${appId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify({ status: status, rejection_reason: status === 'Rejected' ? 'Application did not meet requirements at this time.' : null })
                });
                if (res.ok) {
                    this.fetchDashboardData();
                } else {
                    alert('Action failed.');
                }
            } catch (err) {
                console.error(err);
            }
        },
        viewStudentProfile(studentUserId) {
            this.selectedStudentId = studentUserId;
            this.quickProfileModal.show();
        },
        renderFunnelChart() {
            if (this.funnelChart) this.funnelChart.destroy();
            const ctx = document.getElementById('funnelChart');
            if (!ctx || !this.dashboardData) return;

            const data = this.dashboardData.funnel;
            this.funnelChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Applied', 'Shortlisted', 'Interviewed', 'Hired'],
                    datasets: [{
                        label: 'Student Count',
                        data: [data.applied, data.shortlisted, data.interviewed, data.hired],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(255, 159, 64, 0.7)',
                            'rgba(75, 192, 192, 0.7)'
                        ],
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                    },
                    scales: {
                        x: { beginAtZero: true, grid: { display: false } },
                        y: { grid: { display: false } }
                    }
                }
            });
        },
        renderVelocityChart() {
            if (this.velocityChart) this.velocityChart.destroy();
            const ctx = document.getElementById('velocityChart');
            if (!ctx || !this.dashboardData || !this.dashboardData.insights) return;

            const data = this.dashboardData.insights.application_velocity;
            this.velocityChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.date),
                    datasets: [{
                        label: 'Applications',
                        data: data.map(d => d.count),
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.15)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: 0 }
                    },
                    layout: { padding: 0 }
                }
            });
        }
    },
    mounted(){
        this.fetchDashboardData();
        this.$nextTick(() => {
            const modalEl = document.getElementById('quickProfileModal');
            if (modalEl) {
                this.quickProfileModal = new bootstrap.Modal(modalEl);
                modalEl.addEventListener('hidden.bs.modal', () => {
                    this.selectedStudentId = null;
                });
            }
        });
    },
    beforeDestroy() {
        if (this.funnelChart) this.funnelChart.destroy();
        if (this.velocityChart) this.velocityChart.destroy();
    }
};


export default CompDashboard;
