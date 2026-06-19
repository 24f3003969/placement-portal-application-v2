import StudentProfile from '../components/student_profile.js';

const AdminReports = {
    template: `
    <div class="container-fluid mt-4">
        <h2 class="fw-bold mb-4">Admin Reports & Queries</h2>

        <ul class="nav nav-tabs mb-4">
            <li class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'reports' }" @click="currentTab = 'reports'">Reports</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'queries' }" @click="currentTab = 'queries'">Queries</button>
            </li>
        </ul>

        <div v-if="currentTab === 'reports'">
            <div class="row">
                <div class="col-md-4">
                    <div class="card shadow-sm p-3 mb-4 h-100 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h5 class="fw-bold mb-3">Placement Rates by Department</h5>
                        <div style="position: relative; height: 260px; width: 100%;">
                            <canvas id="placementRateChart"></canvas>
                        </div>
                        <div v-if="placementRates.length === 0" class="text-center text-muted p-4">No placement data available.</div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="row">
                        <div class="col-md-6">
                        <div class="card shadow-sm p-3 mb-4 h-100 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <h5 class="fw-bold mb-3">Unplaced Students ({{ unplacedStudents.length }})</h5>
                            <div v-if="unplacedStudents.length > 0" class="table-responsive" style="max-height: 260px; overflow-y: auto;">
                                <table class="table table-hover table-sm align-middle mb-0">
                                    <thead class="table-light" style="position: sticky; top: 0; max-height: 260px; overflow-y: auto;">
                                        <tr>
                                            <th>Name</th>
                                            <th>Roll No</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="student in unplacedStudents" :key="student.user_id">
                                            <td>
                                                <a href="#" @click.prevent="openProfileModal(student.user_id, 'details')" class="text-decoration-none fw-semibold text-primary">
                                                    {{ student.name }}
                                                </a>
                                            </td>
                                            <td>{{ student.roll_no }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="text-center text-muted p-4 mt-auto">No students found who are unplaced.</div>
                        </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card shadow-sm p-3 mb-4 h-100 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                <h5 class="fw-bold mb-3">Multiple Offer Holders ({{ multipleOfferHolders.length }})</h5>
                                <div v-if="multipleOfferHolders.length > 0" class="table-responsive" style="max-height: 260px; overflow-y: auto;">
                                    <table class="table table-hover table-sm align-middle mb-0">
                                        <thead class="table-light" style="position: sticky; top: 0; max-height: 260px; overflow-y: auto;">
                                            <tr>
                                                <th>Name</th>
                                                <th>Roll No</th>
                                                <th>Offers Received</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="student in multipleOfferHolders" :key="student.user_id">
                                                <td>
                                                    <a href="#" @click.prevent="openProfileModal(student.user_id, 'details')" class="text-decoration-none fw-semibold text-primary">
                                                        {{ student.name }}
                                                    </a>
                                                </td>
                                                <td>{{ student.roll_no }}</td>
                                                <td>
                                                    <span class="badge bg-success rounded-pill fs-6" style="cursor: pointer;" @click="viewStudentOffers(student)" title="View offers">
                                                        {{ student.offer_count }}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div v-else class="text-center text-muted p-4 mt-auto">No students currently holding multiple offers.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- New Hired Insights Section -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card shadow-sm p-3 h-100 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h5 class="fw-bold mb-3">Package Insights</h5>
                        <div class="d-flex flex-column gap-3 justify-content-center h-100">
                            <div class="alert alert-success border-0 shadow-sm d-flex align-items-center mb-0">
                                <i class="bi bi-trophy fs-1 me-3 opacity-75"></i>
                                <div>
                                    <h6 class="mb-0">Highest Package</h6>
                                    <h3 class="fw-bold mb-0">{{ hiredInsights.highest_package != null ? hiredInsights.highest_package + ' LPA' : 'N/A' }}</h3>
                                </div>
                            </div>
                            <div class="alert alert-info border-0 shadow-sm d-flex align-items-center mb-0">
                                <i class="bi bi-cash-stack fs-1 me-3 opacity-75"></i>
                                <div>
                                    <h6 class="mb-0">Average Package</h6>
                                    <h3 class="fw-bold mb-0">{{ hiredInsights.average_package != null ? hiredInsights.average_package + ' LPA' : 'N/A' }}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="card shadow-sm p-3 h-100 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h5 class="fw-bold mb-3">Year-wise Package Trends</h5>
                        <div style="position: relative; height: 200px; width: 100%;">
                            <canvas id="packageTrendChart"></canvas>
                        </div>
                        <div v-if="!hiredInsights.year_wise || hiredInsights.year_wise.length === 0" class="text-center text-muted p-4 mt-auto">No trend data available.</div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'queries'">
            <div class="card shadow-sm p-4 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <h5 class="fw-bold mb-3">User Support Queries</h5>
                <div v-if="loadingQueries" class="d-flex justify-content-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div v-else-if="queries.length === 0" class="text-center text-muted p-5">
                    <i class="bi bi-check-circle fs-1 text-success d-block mb-3"></i>
                    <h5>All caught up!</h5>
                    <p>No support queries found.</p>
                </div>
                <div v-else class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                    <table class="table table-hover table-sm align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Identifier</th>
                                <th>Message</th>
                                <th>Received On</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="query in queries" :key="query.id">
                                <td><span class="fw-bold">{{ query.identifier }}</span></td>
                                <td style="max-width: 350px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ query.message }}</td>
                                <td>{{ new Date(query.created_at).toLocaleString() }}</td>
                                <td><span :class="getStatusBadge(query.status)" class="badge">{{ query.status }}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-primary" @click="openResponseModal(query)">View / Respond</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="modal fade" id="studentProfileModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Student Profile</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <student-profile 
                            v-if="selectedStudentId" 
                            :user-id="selectedStudentId" 
                            :is-admin-view="true" 
                            :initial-tab="profileTab" 
                        />
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="responseModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content" v-if="selectedQuery">
                    <div class="modal-header">
                        <h5 class="modal-title">Respond to Query</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-4">
                            <p class="text-muted small mb-1">Message from {{ selectedQuery.identifier }}:</p>
                            <div class="p-3 bg-light rounded border">{{ selectedQuery.message }}</div>
                        </div>
                        <div class="mb-3">
                            <label for="responseText" class="form-label fw-bold">Your Response</label>
                            <textarea v-model="responseText" class="form-control" id="responseText" rows="4" placeholder="Type your response here..." :disabled="selectedQuery.status === 'Closed'"></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="responseStatus" class="form-label fw-bold">Update Status</label>
                            <select v-model="responseStatus" class="form-select" id="responseStatus" :disabled="selectedQuery.status === 'Closed'">
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" @click="submitResponse" v-if="selectedQuery.status !== 'Closed'">Save & Send Response</button>
                        <span v-else class="text-danger fw-bold small"><i class="bi bi-lock-fill me-1"></i>This query is closed and cannot be updated.</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="studentOffersModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow" v-if="selectedStudentOffers">
                    <div class="modal-header bg-light border-0">
                        <h5 class="modal-title fw-bold">Offers for {{ selectedStudentOffers.name }} ({{ selectedStudentOffers.roll_no }})</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th class="ps-4">Company</th>
                                        <th>Role</th>
                                        <th>Type</th>
                                        <th>Compensation</th>
                                        <th class="pe-4">Student Decision</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(offer, index) in selectedStudentOffers.offers" :key="index">
                                        <td class="ps-4 fw-bold">{{ offer.company_name }}</td>
                                        <td>{{ offer.job_title }}</td>
                                        <td>{{ offer.type }}</td>
                                        <td>{{ offer.salary }}</td>
                                        <td class="pe-4">
                                            <span :class="getDecisionBadge(offer.app_status)">{{ offer.decision }}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer border-0 bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: {
        StudentProfile // Registering the component
    },
    data() {
        return {
            currentTab: 'reports',
            placementRates: [],
            unplacedStudents: [],
            multipleOfferHolders: [],
            selectedStudentOffers: null,
            offersModal: null,
            placementChart: null,
            queries: [],
            loadingQueries: false,
            selectedQuery: null,
            responseModal: null,
            responseText: '',
            responseStatus: 'In Progress',
            
            // Data for Profile Modal
            studentProfileModal: null,
            selectedStudentId: null,
            profileTab: 'details', 
            
            // Hired Insights
            hiredInsights: {
                highest_package: null,
                average_package: null,
                year_wise: []
            },
            packageTrendChart: null,
        };
    },
    methods: {
        async fetchPlacementRates() {
            const res = await fetch('/api/admin/reports/placement_rates', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                this.placementRates = await res.json();
                this.renderPlacementChart();
            } else {
                console.error('Failed to fetch placement rates.');
            }
        },
        renderPlacementChart() {
            this.$nextTick(() => {
                const canvas = document.getElementById('placementRateChart');
                if (!canvas) return; 

                if (this.placementChart) {
                    this.placementChart.destroy();
                }
                const ctx = canvas.getContext('2d');
                this.placementChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: this.placementRates.map(d => d.department),
                        datasets: [{
                            label: 'Placement Rate (%)',
                            data: this.placementRates.map(d => d.placement_rate),
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: { display: true, text: 'Placement Rate (%)' }
                            },
                            x: {
                                title: { display: true, text: 'Department' }
                            }
                        }
                    }
                });
            });
        },
        async fetchUnplacedStudents() {
            const res = await fetch('/api/admin/reports/unplaced_students', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                this.unplacedStudents = await res.json();
            }
        },
        async fetchMultipleOfferHolders() {
            const res = await fetch('/api/admin/reports/multiple_offers', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                this.multipleOfferHolders = await res.json();
            }
        },
        async fetchQueries() {
            this.loadingQueries = true;
            try {
                const res = await fetch('/api/admin/support_queries', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) {
                    this.queries = await res.json();
                    this.queries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                } else {
                    alert('Failed to fetch support queries.');
                }
            } finally {
                this.loadingQueries = false;
            }
        },
        getStatusBadge(status) {
            switch (status) {
                case 'Open': return 'bg-warning text-dark';
                case 'In Progress': return 'bg-info text-dark';
                case 'Closed': return 'bg-success';
                default: return 'bg-secondary';
            }
        },
        openResponseModal(query) {
            this.selectedQuery = query;
            this.responseText = query.response || '';
            this.responseStatus = query.status;
            this.responseModal.show();
        },
        async submitResponse() {
            if (!this.responseText) {
                alert('Response text cannot be empty.');
                return;
            }
            const res = await fetch(`/api/admin/support_queries/${this.selectedQuery.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ response: this.responseText, status: this.responseStatus })
            });
            if (res.ok) {
                alert('Response submitted successfully.');
                this.responseModal.hide();
                this.fetchQueries();
            }
        },
        async fetchHiredInsights() {
            try {
                const res = await fetch('/api/admin/reports/hired_insights', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) {
                    this.hiredInsights = await res.json();
                    this.renderPackageTrendChart();
                } else {
                    console.error('Failed to fetch hired insights.');
                }
            } catch (err) {
                console.error('Failed to fetch hired insights:', err);
            }
        },
        renderPackageTrendChart() {
            this.$nextTick(() => {
                const canvas = document.getElementById('packageTrendChart');
                if (!canvas || !this.hiredInsights.year_wise || this.hiredInsights.year_wise.length === 0) return;

                if (this.packageTrendChart) {
                    this.packageTrendChart.destroy();
                }
                const ctx = canvas.getContext('2d');
                this.packageTrendChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: this.hiredInsights.year_wise.map(d => d.year),
                        datasets: [{
                            label: 'Average Package (LPA)',
                            data: this.hiredInsights.year_wise.map(d => d.avg_package),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3
                        }, {
                            label: 'Highest Package (LPA)',
                            data: this.hiredInsights.year_wise.map(d => d.highest_package),
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.3
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Package (LPA)' } }, x: { title: { display: true, text: 'Year' } } } }
                });
            });
        },
        // Opens the Modal and sets the User ID and Target Tab
        openProfileModal(userId, tabName) {
            this.selectedStudentId = userId;
            this.profileTab = tabName;
            this.studentProfileModal.show();
        },
        async loadReportsData() {
            await Promise.all([
                this.fetchPlacementRates(),
                this.fetchUnplacedStudents(),
                this.fetchMultipleOfferHolders(),
                this.fetchHiredInsights()
            ]);
        },
        viewStudentOffers(student) {
            this.selectedStudentOffers = student;
            this.offersModal.show();
        },
        getDecisionBadge(status) {
            switch (status) {
                case 'Hired': return 'badge bg-success text-white shadow-sm';
                case 'Selected': return 'badge bg-warning text-dark';
                case 'Rejected': return 'badge bg-danger text-white';
                default: return 'badge bg-secondary text-white';
            }
        },
    },
    watch: {
        currentTab(newTab) {
            if (newTab === 'reports') {
                if (this.placementRates.length === 0) {
                    this.loadReportsData();
                } else {
                    this.renderPlacementChart();
                    this.renderPackageTrendChart();
                }
            } else if (newTab === 'queries') {
                this.fetchQueries();
            }
        }
    },
    mounted() {
        this.loadReportsData();
        const offersModalEl = document.getElementById('studentOffersModal');
            if (offersModalEl) {
                this.offersModal = new bootstrap.Modal(offersModalEl);
            }
        this.$nextTick(() => {
            const responseModalEl = document.getElementById('responseModal');
            if (responseModalEl) {
                this.responseModal = new bootstrap.Modal(responseModalEl);
            }

            const profileModalEl = document.getElementById('studentProfileModal');
            if (profileModalEl) {
                this.studentProfileModal = new bootstrap.Modal(profileModalEl);
                
                // Clear the user ID when the modal closes so it remounts fresh next time
                profileModalEl.addEventListener('hidden.bs.modal', () => {
                    this.selectedStudentId = null;
                });
            }
        });
    },
    beforeDestroy() {
        if (this.placementChart) {
            this.placementChart.destroy();
        }
        if (this.packageTrendChart) {
            this.packageTrendChart.destroy();
        }
    }
};

export default AdminReports;