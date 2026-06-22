import StudentResource from "../components/StudentResource.js";
import DriveDetailView from "../components/drive_details_view.js";
import ViewDrive from "../components/view_drive.js";
import DriveDetailsForm from "../components/drive_details_form.js";

const PostedDrives={
    template:`
    <div v-if="view==='drives'" class="container-fluid min-vh-100">
        <div class="row">
            <div class="col-md-2 mb-4">
                <div class="card border-0 shadow-sm p-4 rounded-4 bg-light" style="top:20px;">
                    <h5 class="fw-bold">Filters</h5>
                    <div class="filter-section mt-3">
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Placement Type</label>
                            <select class="form-select form-select-sm border-0 shadow-sm py-2 px-3" v-model="selectedType">
                                <option value="">All Types</option>
                                <option value="Job">Job</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Status</label>
                            <select class="form-select form-select-sm border-0 shadow-sm py-2 px-3" v-model="selectedStatus">
                                <option value="">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Application Closed">Applications Closed</option>
                                <option value="Closed">Closed</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Pending">Pending</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Work Mode</label>
                            <select class="form-select form-select-sm border-0 shadow-sm py-2 px-3" v-model="selectedMode">
                                <option value="">All Modes</option>
                                <option value="remote">Remote</option>
                                <option value="onsite">Onsite</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-8">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="fw-bold mb-0 pt-2">Posted Placement Drives</h4>
                    <button class="btn btn-success btn-sm" data-bs-toggle="modal" 
                        data-bs-target="#typeSelectorModal">Post New </button>
                    <span class="badge bg-primary rounded-pill">{{ active_count }} Active</span>
                </div>
                <hr>
                <div class="row mb-2">
                    <div class="col-md-12">
                        <div class="input-group shadow-sm">
                            <input 
                                type="text" 
                                class="form-control border-0" 
                                placeholder="Filter by Type, Location, Duration..." 
                                v-model="searchQuery"
                                @keyup.enter="handleSearch"
                            >
                            <button class="btn btn-primary px-4" @click="handleSearch" style="background-color: #003366;">
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                <div class="row g-3 drives-scroll">
                    <div v-for="drive in filteredResources" :key="drive.DriveID" class="col-12 col-lg-6">
                        <student-resource 
                            :drive="drive"
                            :isDetailview="false"
                            :current-user-role="userRole"
                            @view="viewDrive"
                            @close-applications="closeApplications"
                            @close-drive="closeDrive"
                            @viewNote="handleViewNote"
                             />
                    </div>
                </div>
            </div>
            <div class="col-md-2" id="drive-insights">
                <div class="card border-0 shadow-sm p-4 rounded-4 bg-light" style="position: sticky; top: 20px;">
                    <h5 class="fw-bold mb-3">Top Performing Drives</h5>
                    <div v-if="topDrives.length > 0">
                        <ul class="list-group list-group-flush">
                            <li v-for="drive in topDrives" :key="drive.DriveID" 
                                class="list-group-item bg-light d-flex justify-content-between align-items-center"
                                @click="filterByDrive(drive.JobTitle)"
                                style="cursor: pointer;">
                                <span class="fw-semibold">{{ drive.JobTitle }}</span>
                                <span class="badge bg-primary rounded-pill">{{ drive.applicant_count }}</span>
                            </li>
                        </ul>
                    </div>
                    <div v-else class="text-center text-muted small p-3">
                        No applicant data yet.
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="typeSelectorModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-body p-5 text-center">
                        <h4 class="fw-bold mb-4">What would you like to Post?</h4>
                        <div class="d-flex justify-content-center gap-3">
                        <button @click="openFullForm('Job')" class="btn btn-outline-primary p-4 w-50">
                            <i class="bi bi-briefcase fs-2 d-block mb-2"></i> Job
                        </button>
                        <button @click="openFullForm('Internship')" class="btn btn-outline-primary p-4 w-50">
                            <i class="bi bi-mortarboard fs-2 d-block mb-2"></i> Internship
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div v-else>
        <view-drive
            v-if="view==='drives_stats'"
            :drive="currentForm"
            @back="view='drives' ; this.fetchDrives ; this.fetchTopDrives"
            :user-role="userRole"
        />
        <drive-detail-view
            v-if="view==='drive_details'"
            :drive="currentForm"
            mode="details_only"
            @back="view='drives'"
        />
        <drive-details-form
            v-if="view==='create'"
            @success="handleSuccess"
            :driveType="selectedType"
            :drive="currentForm"
            @cancel="view='drives'; this.fetchDrives ; this.fetchTopDrives"
            mode="employer" >
        </drive-details-form>
    </div>
    `,
    data() {
        return {
            allResources: [],
            selectedType: '',
            selectedStatus: '',
            selectedMode: '',
            searchQuery: '',
            currentForm: null,
            view: 'drives',
            active_count: 0,
            topDrives: [],
            cardMap:{
                'Total Applicants':'total_applicants',
                'Hired':'hired',
                'Interviews Today':'interviews_today'
            },
            saveAsTemplate: false,
            newTemplateName: '',
        };
    },
    components: { DriveDetailView, StudentResource, ViewDrive, DriveDetailsForm},
    computed: {
        userRole() {
            return this.$store.state.role;
        },
        filteredResources() {
            if (!Array.isArray(this.allResources)) return [];

            let results = this.allResources;

            // Apply status filter
            if (this.selectedStatus) {
                    results = results.filter(d => d.Status === this.selectedStatus);
            }

            // Apply type filter
            if (this.selectedType && this.selectedType.trim() !== '') {
                const sel = this.selectedType.toString().toLowerCase();
                results = results.filter(d => (d.Type || '').toString().toLowerCase() === sel);
            }
            if(this.selectedMode && this.selectedMode.trim() !== ''){
                const sel = this.selectedMode.toString().toLowerCase();
                results = results.filter(d => (d.WorkMode || '').toString().toLowerCase() === sel);
            }
            // Apply search query across common fields
            const query = (this.searchQuery || '').toString().toLowerCase().trim();
            const postedDateFromQuery = this.$route.query.posted;
            const searchFromQuery = (this.$route.query.search || '').toString().toLowerCase().trim();

            if (!query) return results;

            const searchResults = results.filter(drive => {
                const type = (drive.Type || '') + '';
                const jobtitle = (drive.JobTitle || '') + '';
                const location = (drive.Location || '') + '';
                const duration = (drive.Duration || '') + '';

                return (
                    type.toLowerCase().includes(query) ||
                    jobtitle.toLowerCase().includes(query) ||
                    location.toLowerCase().includes(query) ||
                    duration.toLowerCase().includes(query)
                );
            });

            if (postedDateFromQuery && query === searchFromQuery) {
                return searchResults.filter(drive => drive.PostedDate === postedDateFromQuery);
            }
            return searchResults;
        },
    },
    methods: {
        handleSearch() {
            this.searchQuery = this.searchQuery.trim();

            if (this.filteredResources.length === 0) {
                console.warn("No drives match your search criteria");
            } else {
                console.log(`Found ${this.filteredResources.length} matching drives`);
            }
            
            const resultsSection = document.querySelector('.row.g-3');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
        },
        viewDrive(drive) {
            this.currentForm = drive;
            if (drive.Status === 'Pending' || drive.Status === 'Rejected') {
                this.view = 'drive_details';
            } else {
                this.view = 'drives_stats';
            }
        },
        handleViewNote(drive) {
            if (drive && typeof drive === 'object') {
                const remark = drive.Remark;
                if (remark) {
                    const label = drive.Status === 'Suspended' ? 'Suspension Reason' : 'Rejection Remark';
                    alert(label + ': ' + remark);
                } else {
                    alert('No remark/reason was provided.');
                }
            } else {
                const remark = drive;
                if (remark) {
                    alert('Rejection Remark: ' + remark);
                } else {
                    alert('No rejection remark was provided.');
                }
            }
        },
        async closeApplications(driveId) {
            if (!confirm('Are you sure you want to close applications for this drive? This will stop new student applications but keep existing applications and interviews active.')) return;
            const response = await fetch(`/api/drive_application/${driveId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                },
                body: JSON.stringify({ action: 'close_applications' })
            });
            if (response.ok) {
                alert("Applications closed successfully.");
                const drive = this.allResources.find(d => d.DriveID === driveId);
                if (drive) {
                    drive.Status = 'Application Closed';
                }
                this.fetchDrives();
                this.fetchTopDrives();
            } else {
                alert("Failed to close applications.");
            }
        },
        async closeDrive(driveId) {
            if (!confirm('Are you sure you want to finally close this drive? This will cancel all remaining/uncompleted interviews and reject all remaining applications.')) return;
            const response = await fetch(`/api/drive_application/${driveId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                },
                body: JSON.stringify({ action: 'close_drive' })
            });
            if (response.ok) {
                alert("Drive closed successfully.");
                const drive = this.allResources.find(d => d.DriveID === driveId);
                if (drive) {
                    drive.Status = 'Closed';
                }
                this.fetchDrives();
                this.fetchTopDrives();
            } else {
                alert("Failed to close drive.");
            }
        },
        async fetchTopDrives() {
            try {
                const res = await fetch('/api/company_drive_stats', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) {
                    this.topDrives = await res.json();
                }
            } catch (err) {
                console.error("Failed to fetch top drives:", err);
            }
        },
        filterByDrive(jobTitle) {
            this.searchQuery = jobTitle;
        },
        openFullForm(type){
            this.selectedType=type;
            this.currentForm = null;
            this.view='create';
            const modal=bootstrap.Modal.getInstance(document.getElementById('typeSelectorModal'));
            if (modal) modal.hide();
        },
        async fetchDrives() {
            try {
                const res = await fetch(window.location.origin + '/api/placement_drives', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') } // Make sure this says localStorage!
                });
                if (res.ok) {
                    this.allResources = await res.json();
                    this.active_count = this.allResources.filter(d => d.Status === 'Active').length;
                }
            } catch (err) {
                console.error("Fetch drives failed:", err);
            }
        },
        handleSuccess() {
            alert("Drive submitted for Admin Approval!");
            this.view = 'drives';
            this.currentForm = null;
            this.fetchDrives();
        }
    },
    mounted() {
        this.fetchDrives();
        this.fetchTopDrives();
        // Check for a search query in the URL to pre-filter the list
        const searchQueryFromQuery = this.$route.query.search;
        if (searchQueryFromQuery) {
            this.searchQuery = searchQueryFromQuery;
        }
        if (this.$route.query.action === 'new') {
            const modal = new bootstrap.Modal(document.getElementById('typeSelectorModal'));
            modal.show();
        }
    },
}

export default PostedDrives;