import StudentResource from '../components/StudentResource.js';
import DriveDetailsView from '../components/drive_details_view.js'; // Assuming this component can display drive details
import ViewDrive from '../components/view_drive.js';
import RejectionModal from '../components/rejection_modal.js';
import { formatDateTime } from '../utils/formatDateTime.js';

const AdminManageDrives = {
    template: `
    <div class="container-fluid py-4">
        <div v-if="remarkToShow" class="remark-overlay" @click="remarkToShow = null">
            <div class="remark-box card card-body shadow-lg" @click.stop>
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0">Evaluation Remarks</h6>
                    <button type="button" class="btn-close" @click="remarkToShow = null"></button>
                </div>
                <hr class="my-2">
                <div v-if="remarkToShow.internal" class="mb-2">
                    <strong class="small text-danger"><i class="bi bi-lock-fill"></i> Confidential Assessment Notes:</strong>
                    <p class="mb-0 p-2 bg-light rounded mt-1 small text-dark">{{ remarkToShow.internal }}</p>
                </div>
                <div v-if="remarkToShow.student">
                    <strong class="small text-success"><i class="bi bi-eye-fill"></i> Dispatched Note for Student:</strong>
                    <p class="mb-0 p-2 bg-light rounded mt-1 small text-dark">{{ remarkToShow.student }}</p>
                </div>
            </div>
        </div>

        <div v-if="currentView === 'list'">
            <div class="row">
                <div class="col-md-3">
                    <div class="card shadow-sm p-3" style="position: sticky; top: 20px;">
                        <h5 class="fw-bold">Filters</h5>
                        <hr>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Drive Status</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Active" id="statusActive" v-model="selectedStatuses">
                                <label class="form-check-label" for="statusActive">Active</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Pending" id="statusPending" v-model="selectedStatuses">
                                <label class="form-check-label" for="statusPending">Pending</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Suspended" id="statusSuspended" v-model="selectedStatuses">
                                <label class="form-check-label" for="statusSuspended">Suspended</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Application Closed" id="statusClosed" v-model="selectedStatuses">
                                <label class="form-check-label" for="statusClosed">Applications Closed</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Closed" id="statusFinallyClosed" v-model="selectedStatuses">
                                <label class="form-check-label" for="statusFinallyClosed">Closed</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Rejected" id="statusRejected" v-model="selectedStatuses">
                                <label class="form-check-label" for="statusRejected">Rejected</label>
                            </div>
                        </div>
                        <hr>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Drive Type</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Job" id="typeJob" v-model="selectedTypes">
                                <label class="form-check-label" for="typeJob">Job</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="Internship" id="typeInternship" v-model="selectedTypes">
                                <label class="form-check-label" for="typeInternship">Internship</label>
                            </div>
                        </div>
                        <hr>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted">Sort By</label>
                            <select class="form-select" v-model="sortBy">
                                <option value="posted_date_desc">Posted Date (Newest First)</option>
                                <option value="apply_deadline_asc">Closing Soonest</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="col-md-9">
                    <h2 class="fw-bold mb-4">Manage Drives</h2>
                    
                    <div class="row mb-4">
                        <div class="col-md-12">
                            <div class="input-group shadow-sm">
                                <input 
                                    type="text" 
                                    class="form-control border-0" 
                                    placeholder="Search by Job Title, Company Name, or #DriveID" 
                                    v-model="searchQuery"
                                >
                                <button class="btn btn-primary px-4" style="background-color: #003366;">
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-primary rounded-pill fs-6">Total Matches: {{ filteredDrives.length }}</span>
                    </div>

                    <div class="row g-3">
                        <div v-if="filteredDrives.length === 0" class="text-center text-muted p-5">
                            <p>No drives found matching your criteria.</p>
                        </div>
                        <div v-for="drive in filteredDrives" :key="drive.DriveID" class="col-12 col-lg-6">
                            <student-resource 
                                :drive="drive"
                                :isDetailview="false"
                                :current-user-role="'admin'"
                                @approve="approveDrive(drive.DriveID)"
                                @reject="openActionModal(drive, 'Reject')"
                                @close="openActionModal(drive, 'Close')"
                                @suspend="openActionModal(drive, 'Suspend')"
                                @interviews="viewDriveInterviews(drive)"
                                @view="viewDriveDetails(drive)"
                                @viewNote="handleViewNote"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="currentView === 'details'">
            <view-drive 
                :drive="selectedDrive" 
                @back="currentView = 'list'; selectedDrive = null" 
                user-role="admin"
                @approve="approveDrive"
                @reject="openActionModal($event, 'Reject')"
                @suspend="openActionModal($event, 'Suspend')"
                @close="openActionModal($event, 'Close')"
                @close-applications="openActionModal($event, 'CloseApplications')"
            />
        </div>
        <div v-if="currentView === 'review'">
            <drive-details-view :drive="selectedDrive" mode="admin" @back="currentView = 'list'; selectedDrive = null" @success="handleReviewSuccess"/>
        </div>

        <!-- Drive Action Modal for Reject / Suspend / Close -->
        <div class="modal fade" id="driveActionModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content" v-if="selectedDrive">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ actionTitle }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Job Title:</strong> {{ selectedDrive.JobTitle }}</p>
                        <p><strong>Company:</strong> {{ selectedDrive.company_name }}</p>
                        <p><strong>Current Status:</strong> <span class="badge" :class="statusBadgeClass(selectedDrive.Status)">{{ selectedDrive.Status }}</span></p>
                        <hr>
                        <div class="mb-3">
                            <label class="form-label fw-bold">{{ remarkLabel }}</label>
                            <textarea v-model="actionRemarks" class="form-control" rows="3" :placeholder="remarkPlaceholder"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn" :class="actionButtonClass" @click="submitDriveAction" :disabled="isActionSubmitDisabled">
                            Confirm Action
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="interviewsModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content" v-if="selectedDrive">
                    <div class="modal-header">
                        <h5 class="modal-title">Interviews for {{ selectedDrive.JobTitle }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <h6 class="fw-bold mb-3">Upcoming Interviews</h6>
                        <div v-if="upcomingInterviews.length > 0" class="table-responsive mb-4">
                            <table class="table table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Round</th>
                                        <th>Date & Time</th>
                                        <th>Location / Link</th>
                                        <th>Reschedules</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="interview in upcomingInterviews" :key="interview.id">
                                        <td>{{ interview.student_name }} ({{ interview.student_roll_no }})</td>
                                        <td>Round {{ interview.round_no }}: {{ interview.round_name }}</td>
                                        <td>{{ formatDateTime(interview.datetime) }}</td>
                                        <td>
                                            <a v-if="isUrl(interview.location_or_link)" :href="interview.location_or_link" target="_blank">Join</a>
                                            <span v-else>{{ interview.location_or_link }}</span>
                                        </td>
                                        <td><span class="badge bg-secondary">{{ interview.reschedule_count || 0 }}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-danger" @click="cancelInterview(interview.id)">Cancel</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="alert alert-info">No upcoming interviews for this drive.</div>

                        <h6 class="fw-bold mb-3">Completed Interviews</h6>
                        <div v-if="completedInterviews.length > 0" class="table-responsive">
                            <table class="table table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Round</th>
                                        <th>Date & Time</th>
                                        <th>Status</th>
                                        <th>Result</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="interview in completedInterviews" :key="interview.id">
                                        <td>{{ interview.student_name }} ({{ interview.student_roll_no }})</td>
                                        <td>Round {{ interview.round_no }}: {{ interview.round_name }}</td>
                                        <td>{{ formatDateTime(interview.datetime) }}</td>
                                        <td>{{ interview.status }}</td>
                                        <td>{{ interview.result || 'N/A' }}</td>
                                        <td>
                                            <button v-if="interview.remarks || interview.student_facing_remarks" class="btn btn-sm btn-link p-0 text-decoration-none" @click.stop="showRemarks(interview)">
                                                View Remarks
                                            </button>
                                            <span v-else class="text-muted small">N/A</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="alert alert-info">No completed interviews for this drive.</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Cancel Interview Modal -->
        <div class="modal fade" id="cancelInterviewModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" v-if="interviewToCancel">
                    <div class="modal-header">
                        <h5 class="modal-title">Cancel Interview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Reason (Mandatory)</label>
                            <textarea class="form-control" v-model="cancelReason" rows="3" placeholder="Please provide the reason for cancellation..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-danger" @click="confirmCancelInterview" :disabled="!cancelReason.trim()">Cancel Interview</button>
                    </div>
                </div>
            </div>
        </div>
        <rejection-modal ref="rejectionModal" type="drive" @confirm="confirmAdminRejectDrive"></rejection-modal>
    </div>
    `,
    components: { StudentResource, DriveDetailsView, ViewDrive, RejectionModal },
    data() {
        return {
            allDrives: [], // Master list from backend
            searchQuery: '',
            selectedDrive: null,
            rejectionRemarks: '',
            driveActionModal: null,
            interviewsModal: null,
            selectedDriveInterviews: [],
            currentView: 'list',
            selectedStatuses: ['Active', 'Pending', 'Suspended', 'Application Closed', 'Closed'],
            selectedTypes: ['Job', 'Internship'],
            sortBy: 'posted_date_desc',
            interviewToCancel: null,
            cancelReason: '',
            cancelInterviewModal: null,
            actionType: '',
            actionRemarks: '',
            remarkToShow: null
        }
    },
    computed: {
        actionTitle() {
            if (this.actionType === 'Reject') return 'Reject Placement Drive';
            if (this.actionType === 'Suspend') return 'Suspend Placement Drive';
            if (this.actionType === 'Close') return 'Close Placement Drive';
            if (this.actionType === 'CloseApplications') return 'Close Applications';
            return 'Drive Action';
        },
        remarkLabel() {
            if (this.actionType === 'Reject') return 'Rejection Remarks (Required)';
            if (this.actionType === 'Suspend') return 'Suspension Reason (Required)';
            if (this.actionType === 'Close') return 'Closing Remarks (Optional)';
            if (this.actionType === 'CloseApplications') return 'Remarks (Optional)';
            return 'Remarks';
        },
        remarkPlaceholder() {
            if (this.actionType === 'Reject') return 'Specify why this placement drive is rejected...';
            if (this.actionType === 'Suspend') return 'Specify why this placement drive is suspended...';
            if (this.actionType === 'Close') return 'Specify why this placement drive is closed...';
            if (this.actionType === 'CloseApplications') return 'Specify why applications are being closed...';
            return '';
        },
        actionButtonClass() {
            if (this.actionType === 'Reject') return 'btn-danger';
            if (this.actionType === 'Suspend') return 'btn-warning text-dark';
            if (this.actionType === 'Close') return 'btn-danger';
            if (this.actionType === 'CloseApplications') return 'btn-outline-danger';
            return 'btn-primary';
        },
        isActionSubmitDisabled() {
            if (this.actionType === 'Reject' || this.actionType === 'Suspend') {
                return !this.actionRemarks.trim();
            }
            return false;
        },
        filteredDrives() {
            let results = this.allDrives || [];

            // 1. Filter by Status (Checkboxes)
            if (this.selectedStatuses && this.selectedStatuses.length > 0) {
                results = results.filter(drive => {
                    return this.selectedStatuses.includes(drive.Status);
                });
            } else {
                return []; // If no boxes checked, show nothing
            }

            // 1b. Filter by Drive Type (Checkboxes)
            if (this.selectedTypes && this.selectedTypes.length > 0) {
                results = results.filter(drive => {
                    return this.selectedTypes.includes(drive.Type);
                });
            } else {
                return []; // If no boxes checked, show nothing
            }

            // 2. Filter by Search Query
            const query = (this.searchQuery || '').toString().toLowerCase().trim();
            if (query) {
                const isIdSearch = query.startsWith('#');
                if (isIdSearch) {
                    const searchId = query.substring(1);
                    results = results.filter(drive => drive.DriveID.toString() === searchId);
                } else {
                    results = results.filter(drive => {
                        const jobTitle = (drive.JobTitle || '').toLowerCase();
                        const companyName = (drive.company_name || '').toLowerCase();
                        return jobTitle.includes(query) || companyName.includes(query);
                    });
                }
            }

            // 3. Sort Results
            results = [...results]; 
            results.sort((a, b) => {
                if (this.sortBy === 'apply_deadline_asc') {
                    return new Date(a.ApplyDeadline) - new Date(b.ApplyDeadline);
                } else {
                    return new Date(b.PostedDate) - new Date(a.PostedDate);
                }
            });

            return results;
        },
        upcomingInterviews() { 
            return this.selectedDriveInterviews.filter(i => i.status === 'scheduled' && new Date(i.datetime) > new Date()); 
        },
        completedInterviews() { 
            return this.selectedDriveInterviews.filter(i => i.status !== 'scheduled' || new Date(i.datetime) <= new Date()); 
        }
    },
    methods: {
        formatDateTime,
        async fetchDrives() {
            const res = await fetch('/api/admin/drives', { 
                headers: { 'Authentication-Token': localStorage.getItem('token') } 
            });
            if (res.ok) {
                this.allDrives = await res.json();
            } else {
                this.allDrives = [];
                console.error("Failed to fetch drives");
            }
        },
        viewDriveDetails(drive) {
            this.selectedDrive = drive;
            if (drive.Status === 'Pending' || drive.Status === 'Rejected') {
                this.currentView = 'review';
            } else {
                this.currentView = 'details';
            }
        },
        async approveDrive(driveId) { 
            if (confirm('Are you sure you want to approve and publish this drive?')) {
                await this.updateDriveStatus(driveId, 'Active'); 
            }
        },
        openActionModal(drive, type) {
            this.selectedDrive = drive;
            this.actionType = type;
            this.actionRemarks = '';
            if (type === 'Reject') {
                if (this.$refs.rejectionModal) {
                    this.$refs.rejectionModal.show();
                }
            } else {
                if (this.driveActionModal) {
                    this.driveActionModal.show();
                }
            }
        },
        async confirmAdminRejectDrive({ rejection_reason, note_for_student }) {
            if (!this.selectedDrive) return;
            const driveId = this.selectedDrive.DriveID;
            let finalRemarks = rejection_reason;
            if (note_for_student && note_for_student.trim()) {
                finalRemarks += "\nNote: " + note_for_student;
            }
            await this.updateDriveStatus(driveId, 'Rejected', finalRemarks);
            if (this.$refs.rejectionModal) {
                this.$refs.rejectionModal.hide();
            }
        },
        async submitDriveAction() {
            if (!this.selectedDrive) return;
            const driveId = this.selectedDrive.DriveID;
            
            let status = '';
            if (this.actionType === 'Reject') status = 'Rejected';
            else if (this.actionType === 'Suspend') status = 'Suspended';
            else if (this.actionType === 'Close') status = 'Closed';
            else if (this.actionType === 'CloseApplications') status = 'Application Closed';
            
            const confirmed = confirm(`Are you sure you want to change the status of this drive to ${status}?`);
            if (!confirmed) return;
            
            await this.updateDriveStatus(driveId, status, this.actionRemarks);
        },
        statusBadgeClass(status) {
            switch (status) {
                case 'Active': return 'bg-success';
                case 'Pending': return 'bg-warning text-dark';
                case 'Suspended': return 'bg-warning text-dark';
                case 'Rejected':
                case 'Application Closed': return 'bg-danger';
                case 'Closed': return 'bg-dark';
                default: return 'bg-secondary';
            }
        },
        async updateDriveStatus(driveId, status, remarks = null) {
            const payload = { status };
            if (remarks) payload.remarks = remarks;
            const res = await fetch(`/api/admin/drives/${driveId}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') }, 
                body: JSON.stringify(payload) 
            });
            if (res.ok) { 
                alert(`Drive status updated to ${status}.`); 
                if (this.driveActionModal) this.driveActionModal.hide(); 
                await this.fetchDrives(); 
                if (this.selectedDrive) {
                    const updated = this.allDrives.find(d => d.DriveID === driveId);
                    if (updated) this.selectedDrive = updated;
                }
            } else { 
                alert('Failed to update drive status.'); 
            }
        },
        async viewDriveInterviews(drive) {
            this.selectedDrive = drive;
            const res = await fetch(`/api/admin/drives/${drive.DriveID}/interviews`, { 
                headers: { 'Authentication-Token': localStorage.getItem('token') } 
            });
            if (res.ok) {
                this.selectedDriveInterviews = await res.json();
                this.interviewsModal.show();
            } else {
                alert('Failed to fetch interview details.');
            }
        },
        async cancelInterview(interviewId) {
            this.interviewToCancel = interviewId;
            this.cancelReason = '';
            this.cancelInterviewModal.show();
        },
        async confirmCancelInterview() {
            const res = await fetch(`/api/admin/drives/${this.selectedDrive.DriveID}/interviews/${this.interviewToCancel}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ status: 'canceled', remarks: this.cancelReason.trim() })
            });
            if (res.ok) {
                alert('Interview canceled successfully.');
                this.cancelInterviewModal.hide();
                this.viewDriveInterviews(this.selectedDrive); 
            } else {
                const err = await res.json();
                alert(`Failed to cancel interview: ${err.message}`);
            }
        },
        isUrl(text) {
            return text && (text.startsWith('http://') || text.startsWith('https://'));
        },
        handleReviewSuccess() {
            this.currentView = 'list';
            this.fetchDrives();
        },
        handleViewNote(drive) {
            if (drive && typeof drive === 'object') {
                const remark = drive.Remark;
                if (remark) {
                    const label = drive.Status === 'Suspended' ? 'Suspension Reason' : drive.Status === 'Rejected' ? 'Rejection Reason' : drive.Status==='Closed' ? 'Drive Closed' : drive.Status==='Application Closed' ? 'Applications Closed' : 'Remark';
                    alert(label + ': ' + remark);
                } else {
                    alert('No remark/reason was provided.');
                }
            } else {
                const remark = drive;
                if (remark) {
                    alert('Remark: ' + remark);
                } else {
                    alert('No remark was provided.');
                }
            }
        },
        showRemarks(interview) {
            this.remarkToShow = {
                internal: interview.remarks || "No internal remarks logged.",
                student: interview.student_facing_remarks || "No student remarks logged."
            };
        },
    },
    watch: {
        '$route.query.q'(newVal, oldVal) {
            if (newVal !== oldVal) {
                this.searchQuery = newVal || '';
            }
        }
    },
    mounted() {
        if (this.$route.query.q) {
            this.searchQuery = this.$route.query.q;
            this.selectedStatuses = ['Active', 'Pending', 'Application Closed', 'Closed', 'Rejected'];
        }
        this.fetchDrives(); 
        
        // Use nextTick to ensure the DOM is ready before Bootstrap hooks into it
        this.$nextTick(() => {
            const actionModalEl = document.getElementById('driveActionModal');
            if (actionModalEl) {
                this.driveActionModal = new bootstrap.Modal(actionModalEl);
            }
            
            const interviewsModalEl = document.getElementById('interviewsModal');
            if (interviewsModalEl) {
                this.interviewsModal = new bootstrap.Modal(interviewsModalEl);
            }
            
            const cancelModalEl = document.getElementById('cancelInterviewModal');
            if (cancelModalEl) {
                this.cancelInterviewModal = new bootstrap.Modal(cancelModalEl);
            }
        });

        // Inject styles dynamically to avoid Vue template compilation errors
        if (!document.getElementById('remark-overlay-styles')) {
            const style = document.createElement('style');
            style.id = 'remark-overlay-styles';
            style.innerHTML = `
            .remark-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1070; }
            .remark-box { width: 90%; max-width: 450px; }
            `;
            document.head.appendChild(style);
        }
    }
};

export default AdminManageDrives;