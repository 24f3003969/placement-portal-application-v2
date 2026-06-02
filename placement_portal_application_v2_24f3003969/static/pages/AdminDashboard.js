import StudentProfile from "../components/student_profile.js";
import CompanyProfile from "../components/company_profile.js";
import { formatDateTime } from "../utils/formatDateTime.js";

const AdminDashboard={
    template:`
    <div class="container-fluid px-3 py-2 bg-light min-vh-100" style="font-size: 0.8rem;">
        <div v-if="loading" class="d-flex justify-content-center align-items-center" style="height: 80vh;">
            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-if="currentView === 'departments'" class="card shadow-sm border-0 mb-2">
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h4 class="card-title">Add New Department</h4>
                    <button class="btn btn-sm btn-secondary mb-1 align-items-end" @click="currentView = 'summary'">Back</button>
                </div>
                <form @submit.prevent="submitDepartmentForm">
                    <div class="row g-2 align-items-center">
                        <div class="col-sm-6 col-md-4">
                            <label for="departmentName" class="form-label fw-bold">Department Name:  </label>
                        </div>
                        <div class="col-sm-6 col-md-4">
                            <input type="text" class="form-control mb-0" placeholder="Enter department name" id="departmentName" v-model="newDepartment" required>
                        </div>
                        <div class="col-auto">
                            <button type="submit" class="btn btn-primary">Add Department</button>
                        </div>
                    </div>
                </form>
                <div v-if="!departments || departments.length==0" class="alert alert-info py-1.5 px-3 small m-0">No departments found. Please add a department to get started.</div>
                <div v-else class="mt-1">
                    <span class="small fw-bold text-muted d-block mb-2">Existing Registered Disciplines:</span>
                    <div class="row row-cols-1 row-cols-md-2 g-2">
                        <div v-for="dept in departments" :key="dept.id" class="col">
                            <div class="p-2 bg-white border rounded d-flex justify-content-between align-items-center">
                                <span class="small">{{ dept.department }}</span>
                                <button class="btn btn-xs text-danger p-0" @click="deleteDepartment(dept.id)">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="!loading && dashboardData && currentView === 'summary'">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <div>
                    <h4 class="fw-bold text-dark mb-0" style="letter-spacing: -0.5px;">Real-Time Pulse</h4>
                </div>
                <div>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill py-1.5 px-2.5 me-2" style="font-size: 0.7rem; font-weight: 600;">
                        {{ departments ? departments.length : 0 }} Active Departments
                    </span>
                    <button class="btn btn-xs btn-primary shadow-2xs" @click="manageDepartments">Manage</button>
                </div>
            </div>
            <div class="row mb-2 g-2">
                <div class="col" v-for="(stat, key) in pulseStats" :key="key">
                    <div class="card shadow-sm border-0 h-100" :class="stat.class" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div class="card-body text-center p-2">
                            <span class="text-muted text-uppercase tracking-wider d-block mb-0" style="font-size: 0.62rem; font-weight: 700;">{{ stat.label }}</span>
                            <h4 class="fw-black text-dark mb-1 mt-1" style="font-size: 1.35rem; letter-spacing: -0.5px;">{{ dashboardData.pulse_stats[key] }}</h4>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. Main Body: 3-Column Layout -->
            <div class="row g-3">

                <!-- A. Left Division: Talent Metrics -->
                <div class="col-lg-3 col-md-2">
                    <div class="d-flex flex-column h-100 justify-content-between">
                        <div>
                            <span class="fw-bold text-uppercase text-secondary tracking-wider d-block mb-2" style="font-size: 0.68rem;">The Talent Metrics</span>
                            <div class="card shadow-2xs border-0 mb-2">
                                <div class="card-body p-2">
                                    <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;"><i class="bi bi-pie-chart text-primary me-1.5"></i> Department Health</span>
                                    <div class="list-group list-group-flush" style="max-height: 140px; overflow-y: auto;">
                                        <div v-for="branch in dashboardData.talent_metrics.branch_health" :key="branch.department" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-1 py-1.5 border-light rounded" style="font-size: 0.72rem;">
                                            <span class="text-truncate fw-medium me-2" style="max-width: 145px; color: #2c3e50;">{{ branch.department }}</span>
                                            <span class="badge bg-primary text-white rounded-pill font-monospace shadow-sm" style="font-size: 0.65rem;">{{ branch.percentage }}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card shadow-2xs border-0 mb-2">
                                <div class="card-body p-2">
                                    <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;"><i class="bi bi-lightning text-warning me-1.5"></i>Skills Heatmap (Top 5)</span>
                                    <div class="list-group list-group-flush">
                                        <div v-for="(skill, index) in dashboardData.talent_metrics.skills_heatmap" :key="'skill-' + index" class="list-group-item d-flex justify-content-between align-items-center px-1 py-1.5 border-light rounded" style="font-size: 0.72rem;">
                                            <span class="text-capitalize fw-medium text-secondary">{{ skill.skill }}</span>
                                            <span class="badge bg-info-subtle text-info-emphasis fw-bold rounded-pill font-monospace shadow-sm" style="font-size: 0.65rem;">{{ skill.count }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row g-2">
                                <div class="col-6">
                                    <div class="card shadow-sm border-0 bg-white text-center border-light py-2" style="transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                                        <span class="text-muted d-block text-uppercase tracking-wider px-1 mb-0" style="font-size: 0.58rem; font-weight: 700;">Avg Req GPA</span>
                                        <span class="fw-black text-primary d-block mt-0.5" style="font-size: 1.15rem; letter-spacing: -0.5px;">{{ dashboardData.talent_metrics.average_cgpa }}</span>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card shadow-sm border-0 bg-primary bg-gradient text-white text-center py-2" style="transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                                        <span class="text-white-50 d-block text-uppercase tracking-wider px-1 mb-0" style="font-size: 0.58rem; font-weight: 700;">Campus Eligible</span>
                                        <span class="fw-black text-white d-block mt-0.5" style="font-size: 1.15rem; letter-spacing: -0.5px;">{{ dashboardData.talent_metrics.eligibility_ratio }}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- B. Center-Main Division: Activity Hub -->
                <div class="col-lg-6 col-md-8">
                    <span class="fw-bold text-uppercase text-secondary tracking-wider d-block mb-2" style="font-size: 0.68rem;">The Activity Hub</span>
                    <div class="card shadow-2xs border-0 mb-2">
                        <div class="card-body p-2">
                            <div class="row g-2 mb-2">
                                <div class="col-md-8">
                                    <div class="card shadow-sm border-0 h-100">
                                        <div class="card-body p-2">
                                            <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;">Placement Funnel</span>
                                            <div style="position: relative; height: 260px; width: 100%;">
                                                <canvas id="funnelChart" ref="funnelChartCanvas"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card shadow-sm border-0 h-100">
                                        <div class="card-body p-2 d-flex flex-column justify-content-between">
                                            <span class="fw-bold text-dark d-block mb-1 text-center" style="font-size: 0.72rem;"><i class="bi bi-pie-chart text-primary me-1"></i>Market Mix</span>
                                            <div class="text-center mb-1">
                                                <span class="text-xxs fw-bold text-muted text-uppercase tracking-wider d-block mb-1" style="font-size: 0.58rem;">Work Mode</span>
                                                <div style="position: relative; height: 110px;">
                                                    <canvas id="workModeChart" ref="workModeChartCanvas"></canvas>
                                                </div>
                                            </div>
                                            <div class="text-center border-top border-light pt-2">
                                                <span class="text-xxs fw-bold text-muted text-uppercase tracking-wider d-block mb-1" style="font-size: 0.58rem;">Drive Type</span>
                                                <div style="position: relative; height: 110px;">
                                                    <canvas id="typeChart" ref="typeChartCanvas"></canvas>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card shadow-sm border-0">
                                <div class="card-body p-2">
                                    <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;">Latest Pending Company Approvals</span>
                                    <div class="table-responsive" style="max-height: 160px; overflow-y: auto;">
                                        <table class="table table-sm table-hover mb-0 align-middle">
                                            <tbody>
                                                <tr v-for="company in dashboardData.activity_hub.latest_pending_companies" :key="company.id" style="cursor: pointer;" @click="viewProfile(company)">
                                                    <td><strong class="text-primary">{{ company.company_name }}</strong></td>
                                                    <td class="text-end">
                                                        <button class="btn btn-sm btn-outline-primary py-0 px-2 me-1 shadow-sm" style="font-size: 0.65rem;" @click.stop="viewProfile(company)">View</button>
                                                        <button class="btn btn-sm btn-success py-0 px-2 me-1 shadow-sm" style="font-size: 0.65rem;" @click.stop="manageCompany(company.id, 'approved')">Approve</button>
                                                        <button class="btn btn-sm btn-danger py-0 px-2 shadow-sm" style="font-size: 0.65rem;" @click.stop="manageCompany(company.id, 'rejected')">Reject</button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p v-if="!dashboardData.activity_hub.latest_pending_companies.length" class="small text-muted mb-0 mt-1">No new companies are pending approval.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- C. Right Division: Urgent Queue -->
                <div class="col-lg-3 col-md-12">
                    <span class="fw-bold text-uppercase text-danger tracking-wider d-block mb-2" style="font-size: 0.68rem;">Action Required</span>
                    
                    <!-- System Alerts -->
                    <div class="card shadow-sm border-0 mb-3 border-start border-4" style="border-color: #fd7e14 !important; background-color: #fff9f5;">
                        <div class="card-body p-2">
                            <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;"><i class="bi bi-exclamation-triangle me-1.5" style="color: #fd7e14;"></i>System Alerts</span>
                            <div class="list-group list-group-flush" style="max-height: 160px; overflow-y: auto;">
                                <div v-for="(alert, index) in dashboardData.urgent_queue.system_alerts" :key="'alert-' + index" class="list-group-item px-1 py-1.5 border-light bg-transparent" style="font-size: 0.72rem;">
                                    <span class="text-dark fw-medium">{{ alert.message }}</span>
                                    <button class="btn btn-link btn-sm p-0 ms-1 text-decoration-none fw-bold" style="color: #fd7e14;" @click="goToDrive(alert.id)">Review</button>
                                </div>
                                <div v-if="!dashboardData.urgent_queue.system_alerts.length" class="text-muted small px-2 py-1">No system alerts.</div>
                            </div>
                        </div>
                    </div>

                    <!-- Placement Insights -->
                    <div class="card shadow-sm border-0 mb-3 border-start border-info border-4" style="background-color: #f0f8ff;">
                        <div class="card-body p-2">
                            <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;"><i class="bi bi-lightbulb-fill text-info me-1.5"></i>Placement Insights</span>
                            <div class="list-group list-group-flush" style="max-height: 160px; overflow-y: auto;">
                                <div v-for="(insight, index) in dashboardData.urgent_queue.placement_insights" :key="index" class="list-group-item px-1 py-1.5 border-light bg-transparent" style="font-size: 0.72rem;">
                                    <div class="d-flex align-items-start">
                                        <i class="bi mt-0.5 me-1.5" :class="getInsightIcon(insight.type)"></i>
                                        <span class="text-dark fw-medium">{{ insight.message }}</span>
                                    </div>
                                    <div v-if="insight.drive_id" class="text-end mt-1">
                                        <button class="btn btn-sm btn-info py-0 px-2 text-white shadow-sm" style="font-size: 0.65rem;" @click="goToDrive(insight.drive_id)">View Drive</button>
                                    </div>
                                </div>
                                <div v-if="!dashboardData.urgent_queue.placement_insights.length" class="text-muted small px-2 py-1">No new insights.</div>
                            </div>
                        </div>
                    </div>

                    <!-- Urgent Drive Approvals -->
                    <div class="card shadow-sm border-0 border-start border-danger border-4" style="background-color: #fff5f5;">
                        <div class="card-body p-2">
                            <span class="fw-bold text-dark d-block mb-1.5" style="font-size: 0.72rem;"><i class="bi bi-clock-history text-warning me-1.5"></i>Expiring Pending Drives</span>
                            <div class="list-group list-group-flush" style="max-height: 160px; overflow-y: auto;">
                                <div v-for="drive in dashboardData.urgent_queue.urgent_drive_approvals" :key="drive.DriveID" class="list-group-item list-group-item-action px-1 py-1 border-light bg-transparent" style="cursor: pointer;" @click="goToDrive(drive.DriveID)">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span class="fw-bold text-primary text-truncate" style="font-size: 0.7rem; max-width: 120px;">{{ drive.JobTitle }}</span>
                                        <span class="badge bg-danger text-white shadow-sm" style="font-size: 0.6rem;">{{ formatDateTime(drive.ApplyDeadline, false) }}</span>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="text-dark fw-bold text-truncate" style="font-size: 0.65rem; max-width: 100px;">{{ drive.company_name }}</span>
                                        <div>
                                            <button class="btn btn-xs btn-success py-0 px-1 me-1 shadow-sm" style="font-size: 0.6rem;" @click.stop="updateDriveStatus(drive.DriveID, 'Approved')"><i class="bi bi-check"></i></button>
                                            <button class="btn btn-xs btn-danger py-0 px-1 shadow-sm" style="font-size: 0.6rem;" @click.stop="openDriveRejectModal(drive)"><i class="bi bi-x"></i></button>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!dashboardData.urgent_queue.urgent_drive_approvals.length" class="text-muted small px-2 py-1">No urgent pending drives.</div>
                            </div>
                            <div v-if="dashboardData.urgent_queue.urgent_drive_approvals_total > 3" class="text-center mt-2">
                                <router-link to="/manage_drives" class="btn btn-outline-danger btn-sm py-0 px-2 fw-bold" style="font-size: 0.65rem;">View all {{ dashboardData.urgent_queue.urgent_drive_approvals_total }} pending</router-link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Profile Modal -->
         <div class="modal fade" id="profileModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content" v-if="selectedItem">
                    <div class="modal-header"><h5 class="modal-title">Profile Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <student-profile v-if="selectedItem.roll_no" :user-id="selectedItem.user_id" :is-admin-view="true" :profile-data="selectedItem" />
                        <company-profile v-if="selectedItem.company_name" :user-id="selectedItem.user_id" :is-admin-view="true" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Drive Rejection Modal -->
        <div class="modal fade" id="driveRejectModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" v-if="selectedItem">
                    <div class="modal-header">
                        <h5 class="modal-title">Reject Drive: {{ selectedItem.JobTitle }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label">Rejection Remarks (Required)</label>
                        <textarea v-model="rejectionRemarks" class="form-control" rows="3"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" @click="rejectSelectedDrive" :disabled="!rejectionRemarks">Confirm Rejection</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: { StudentProfile, CompanyProfile },
    data(){
        return{
            loading: true,
            currentView: 'summary',
            dashboardData: null,
            selectedItem: null,
            profileModal: null,
            funnelChart: null,
            driveRejectionModal: null,
            rejectionRemarks: '',
            workModeChart: null,
            typeChart: null,
            departments: [],
            newDepartment: '',
            pulseStats: {
                active_students: { label: 'Active Students', class: 'bg-white border-bottom border-primary border-3' },
                active_companies: { label: 'Active Companies', class: 'bg-white border-bottom border-info border-3' },
                active_drives: { label: 'Active Drives', class: 'bg-white border-bottom border-secondary border-3' },
                pending_approvals: { label: 'Pending Approvals', class: 'bg-warning-subtle border-bottom border-warning border-3' },
                total_placed: { label: 'Total Placed', class: 'bg-success-subtle border-bottom border-success border-3' },
            },
        }
    },
    methods: {
        formatDateTime,
        async fetchDashboardData() {
            this.loading = true;
            const res = await fetch('/api/admin_dashboard', 
                { headers: { 'Authentication-Token': localStorage.getItem('token') }});
            if (res.ok) {
                this.dashboardData = await res.json();
                console.log(this.dashboardData);
                this.loading = false;
                this.$nextTick(() => {
                    this.renderFunnelChart();
                    this.renderMarketMixCharts();
                });
            } else {
                alert("Could not load admin dashboard data.");
            }
        },
        async fetchDepartments() {
            const res = await fetch('/api/departments', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                this.departments = await res.json();
            } else {
                // Don't alert, just log, as it's a background fetch on dashboard load
                console.error("Could not load departments for dashboard summary.");
            }
        },
        renderFunnelChart() {
            if (this.funnelChart) this.funnelChart.destroy();
            const canvas = this.$refs.funnelChartCanvas;
            if (!canvas) {
                console.error("Funnel chart canvas element not found in DOM.");
                return;
            }
            const ctx = canvas.getContext('2d');
            const data = this.dashboardData.activity_hub.placement_funnel;
            this.funnelChart = new Chart(ctx, { //
                type: 'bar',
                data: {
                    labels: ['Applied', 'Shortlisted', 'Interviewing', 'Hired'],
                    datasets: [{
                        label: 'Applications Count', //
                        data: [data.applied, data.shortlisted, data.interviewing, data.hired],
                        backgroundColor: ['#0d6efd', '#ffc107', '#fd7e14', '#198754'],
                    }]
                },
                options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
            });
        },
        renderMarketMixCharts() {
            if (this.workModeChart) this.workModeChart.destroy();
            if (this.typeChart) this.typeChart.destroy();

            const wmCanvas = this.$refs.workModeChartCanvas;
            const tyCanvas = this.$refs.typeChartCanvas;
            if (!wmCanvas || !tyCanvas) return;

            const mixData = this.dashboardData.activity_hub.market_mix;

            // 1. Work Mode Doughnut
            this.workModeChart = new Chart(wmCanvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: mixData.work_modes.map(d => d.label),
                    datasets: [{
                        data: mixData.work_modes.map(d => d.value),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } }
                }
            });

            // 2. Drive Type Doughnut
            this.typeChart = new Chart(tyCanvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: mixData.drive_types.map(d => d.label),
                    datasets: [{
                        data: mixData.drive_types.map(d => d.value),
                        backgroundColor: ['#8b5cf6', '#ec4899']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } }
                }
            });
        },
        async manageCompany(companyId, action) {
            if (!confirm(`Are you sure you want to ${action} this company?`)) return;
            const res = await fetch(`/api/admin/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ status: action })
            });
            const data = await res.json();
            alert(data.message);
            if (res.ok) {
                this.fetchDashboardData();
            }
        },
        async updateDriveStatus(driveId, status, remarks = null) {
            if (status === 'Approved' && !confirm('Are you sure you want to approve this drive?')) return;
            
            const payload = { status };
            if (remarks) payload.remarks = remarks;

            const res = await fetch(`/api/admin/drives/${driveId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`Drive status updated to ${status}.`);
                if (this.driveRejectionModal) this.driveRejectionModal.hide();
                this.fetchDashboardData(); // Refresh
            } else {
                alert('Failed to update drive status.');
            }
        },
        async manageDepartments() {
            this.currentView = 'departments';
            // Fetch existing departments when admin clicks "Manage Departments"
            const res = await fetch('/api/departments', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                this.departments = await res.json();
            } else {
                alert("Could not load departments.");
            }
        },
        async submitDepartmentForm() {
            const res = await fetch('/api/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ name: this.newDepartment })
            });
            if (res.ok) {
                alert("Department added successfully.");
                this.newDepartment = '';
                this.manageDepartments();
            } else {
                alert("Failed to add department.");
            }
        },
        async deleteDepartment(departmentId) {
            if (!confirm('Are you sure you want to delete this department?')) return;
            const res = await fetch(`/api/departments/${departmentId}`, {
                method: 'DELETE',
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                alert(res.message || "Department deleted successfully.");
                this.manageDepartments();
            } else {
                alert(res.message || "Failed to delete department.");
            }
        },
        getInsightIcon(type) {
            switch (type) {
                case 'warning': return 'bi-exclamation-triangle-fill text-warning';
                case 'info': return 'bi-info-circle-fill text-info';
                case 'danger': return 'bi-exclamation-octagon-fill text-danger';
                case 'success': return 'bi-check-circle-fill text-success';
                default: return 'bi-lightbulb-fill text-secondary';
            }
        },
        getInsightClass(type) {
            // Returns Bootstrap alert classes for styling the list item background
            switch (type) {
                case 'warning': return 'alert-warning';
                case 'info': return 'alert-info';
                case 'danger': return 'alert-danger';
                case 'success': return 'alert-success';
                default: return '';
            }
        },
        formatDate(isoString) {
            if (!isoString) return 'N/A';
            return isoString.split('T')[0];
        },
        openDriveRejectModal(drive) {
            this.selectedItem = drive;
            this.rejectionRemarks = '';
            this.driveRejectionModal.show();
        },
        viewProfile(item) {
            this.selectedItem = item;
            this.profileModal.show();
        },
        goToDrive(driveId) {
            this.$router.push({ path: '/manage_drives', query: { q: `#${driveId}` } });
        },
        goToStudentsBySkill(skillName) {
            this.$router.push({ path: '/manage_users', query: { tab: 'students', skill: skillName } });
        },
        rejectSelectedDrive() {
            if (!this.rejectionRemarks) {
                alert('Rejection remarks are required.');
                return;
            }
            this.updateDriveStatus(this.selectedItem.DriveID, 'Rejected', this.rejectionRemarks);
        }
    },
    watch: {
        currentView(newVal) {
            // If the admin clicks "Back" to return to the summary...
            if (newVal === 'summary' && this.dashboardData) {
                // Wait for Vue to physically put the <canvas> tags back in the HTML
                this.$nextTick(() => {
                    this.renderFunnelChart();
                    this.renderMarketMixCharts();
                });
            }
        }
    },
    async mounted() {
        this.profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
        this.driveRejectionModal = new bootstrap.Modal(document.getElementById('driveRejectModal'));
        document.getElementById('profileModal').addEventListener('hidden.bs.modal', () => {
            this.selectedItem = null;
        });

        await this.fetchDepartments();
        if (this.departments.length == 0) {
            this.currentView = 'departments';
        } else {
            this.currentView = 'summary';
        }
        await this.fetchDashboardData();
    },
    beforeUnmount() {
        if (this.funnelChart) {
            this.funnelChart.destroy();
        }
        if (this.renderMarketMixCharts) {
            if (this.workModeChart) this.workModeChart.destroy();
            if (this.typeChart) this.typeChart.destroy();
        }
    }
}

export default AdminDashboard;