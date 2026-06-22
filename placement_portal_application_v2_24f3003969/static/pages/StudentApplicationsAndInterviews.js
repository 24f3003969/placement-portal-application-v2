import DriveDetailsView from '../components/drive_details_view.js';
import { formatDateTime } from '../utils/formatDateTime.js';

const StudentApplicationsAndInterviews = {
    template: `
    <div class="container my-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="fw-bold mb-0">My Applications & Interviews</h3>
            <button class="btn btn-outline-secondary btn-sm shadow-sm" @click="goToExport">
                <i class="bi bi-download me-1"></i> Export History
            </button>
        </div>

        <ul class="nav nav-tabs mb-2">
            <li class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'applications' }" @click="currentTab = 'applications'">My Applications</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'interviews' }" @click="currentTab = 'interviews'">My Interviews</button>
            </li>
        </ul>

        <div v-if="currentTab === 'applications'">
            <div class="card shadow-sm border-0 p-3 mb-2">
                <h6 class="fw-bold mb-3">Application Insights (This Month)</h6>
                <div v-if="applicationInsights" class="row g-2">
                    <div class="col-md-3 col-sm-6">
                        <div class="alert alert-info py-2 px-3 border-0 shadow-sm h-100 d-flex align-items-center mb-0">
                            <i class="bi bi-info-circle fs-4 me-2 opacity-75"></i>
                            <div class="small"><strong>{{ applicationInsights.totalApplicationsThisMonth }}</strong> Total Applied</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="alert alert-danger py-2 px-3 border-0 shadow-sm h-100 d-flex align-items-center mb-0">
                            <i class="bi bi-x-circle fs-4 me-2 opacity-75"></i>
                            <div class="small"><strong>{{ applicationInsights.rejectedPreScreening }}</strong> Screen Rejects</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="alert alert-warning py-2 px-3 border-0 shadow-sm h-100 d-flex align-items-center mb-0">
                            <i class="bi bi-exclamation-triangle fs-4 me-2 opacity-75"></i>
                            <div class="small"><strong>{{ applicationInsights.rejectedFirstRound }}</strong> Round 1 Rejects</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <div class="alert alert-success py-2 px-3 border-0 shadow-sm h-100 d-flex align-items-center mb-0">
                            <i class="bi bi-check-circle fs-4 me-2 opacity-75"></i>
                            <div class="small"><strong>{{ applicationInsights.selectedThisMonth }}</strong> Offers Received</div>
                        </div>
                    </div>
                </div>
                <div v-else class="text-center p-2 text-muted small">
                    No insights available for this month yet.
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-2">
                <div class="card-header bg-white py-3">
                    <h5 class="fw-bold mb-0">Active Applications</h5>
                </div>
                <div class="card-body p-0">
                    <div v-if="sortedApplications.length > 0" class="table-responsive table-scroll-md">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Job Role</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                    <th>Resume</th>
                                    <th class="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in sortedApplications" :key="app.id" :class="{ 'table-success': app.status === 'Selected' || app.status === 'Hired' }">
                                    <td class="ps-2 py-1">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-primary text-white rounded text-center me-3 d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 40px; height: 40px; font-size: 1.2rem;">
                                                {{ app.drive.company_name.charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <h6 class="mb-0 fw-bold">
                                                    <a href="#" @click.prevent="showDriveInfo(app)" class="text-decoration-none text-dark hover-primary">{{ app.drive.JobTitle }}</a>
                                                </h6>
                                                <small class="text-muted">{{ app.drive.company_name }}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span v-if="app.drive && app.drive.Status === 'Suspended'" class="badge bg-warning text-dark shadow-sm">Temporarily on Hold</span>
                                        <span v-else :class="statusBadge(app.rejection_reason ? 'Rejected' : app.status)">{{ app.rejection_reason ? 'Rejected' : app.status }}</span>
                                        <span v-if="app.is_currently_eligible === false" class="badge bg-danger text-white ms-1" :title="app.eligibility_issues ? app.eligibility_issues.join(', ') : 'Profile ineligible'">Not Eligible</span>
                                    </td>
                                    <td>{{ formatDateTime(app.application_datetime) }}</td>
                                    <td>
                                        <a v-if="app.resume || (profile && profile.resume)" :href="'/' + (app.resume || (profile && profile.resume))" target="_blank" class="btn btn-sm btn-light text-danger border" title="View Resume">
                                            <i class="bi bi-file-earmark-pdf-fill"></i>
                                        </a>
                                        <span v-else class="text-muted small">N/A</span>
                                    </td>
                                    <td class="text-end pe-4">
                                        <button v-if="app.status === 'Pending'" @click="cancelApplication(app.id)" class="btn btn-sm btn-outline-danger">Cancel</button>
                                        <button v-else-if="['Shortlisted', 'Interviewing'].includes(app.status)" @click="viewInterviewDetails(app.id)" class="btn btn-sm btn-outline-primary">View Interview</button>
                                        <template v-else-if="app.status === 'Selected'">
                                            <span v-if="!app.offer_letter" class="badge bg-warning text-dark px-2 py-1"><i class="bi bi-hourglass-split me-1"></i>Offer Awaiting</span>
                                            <button v-else @click="viewPlacementOffer(app.id)" class="btn btn-sm btn-success shadow-sm">View Offer</button>
                                        </template>
                                        <button v-else-if="app.status === 'Hired' || (app.status === 'Rejected' && app.offer_sent_date)" @click="viewPlacementOffer(app.id)" class="btn btn-sm btn-success shadow-sm">View Offer</button>
                                        <span v-else class="text-muted small">-</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-center p-5 text-muted">
                        <i class="bi bi-folder-x fs-1 d-block mb-3 opacity-50"></i>
                        <h5>No Active Applications</h5>
                        <p>You haven't applied to any drives yet, or your applications are no longer active.</p>
                    </div>
                </div>
            </div>

            <!-- Past Applications Card -->
            <div class="card shadow-sm border-0 mb-4 mt-3">
                <div class="card-header bg-white py-3">
                    <h5 class="fw-bold mb-0">Past Applications (Last 5)</h5>
                </div>
                <div class="card-body p-0">
                    <div v-if="pastApplications.length > 0" class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Job Role</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                    <th>Resume</th>
                                    <th class="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in pastApplications" :key="app.id">
                                    <td class="ps-2 py-1">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-secondary text-white rounded text-center me-3 d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 40px; height: 40px; font-size: 1.2rem;">
                                                {{ app.drive.company_name.charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <h6 class="mb-0 fw-bold">
                                                    <a href="#" @click.prevent="showDriveInfo(app)" class="text-decoration-none text-dark hover-primary">{{ app.drive.JobTitle }}</a>
                                                </h6>
                                                <small class="text-muted">{{ app.drive.company_name }}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span :class="statusBadge(app.rejection_reason ? 'Rejected' : app.status)">{{ app.rejection_reason ? 'Rejected' : app.status }}</span>
                                    </td>
                                    <td>{{ formatDateTime(app.application_datetime) }}</td>
                                    <td>
                                        <a v-if="app.resume || (profile && profile.resume)" :href="'/' + (app.resume || (profile && profile.resume))" target="_blank" class="btn btn-sm btn-light text-danger border" title="View Resume">
                                            <i class="bi bi-file-earmark-pdf-fill"></i>
                                        </a>
                                        <span v-else class="text-muted small">N/A</span>
                                    </td>
                                    <td class="text-end pe-4">
                                        <button class="btn btn-sm btn-outline-secondary" @click="showRemark(app.rejection_reason || app.offer_message || 'No remarks logged.')">
                                            Remarks
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-center p-4 text-muted">
                        <i class="bi bi-archive fs-2 d-block mb-2 opacity-50"></i>
                        <p class="mb-0 small">No past applications found.</p>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'interviews'">
            <div class="card shadow-sm border-0 p-3 mb-4">
                <h6 class="fw-bold mb-3">Interview Insights (This Month)</h6>
                <div v-if="interviewInsights" class="row g-2">
                    <div class="col-md-6">
                        <div class="alert alert-success py-2 px-3 border-0 shadow-sm h-100 d-flex align-items-center mb-0">
                            <i class="bi bi-check-circle fs-4 me-2 opacity-75"></i>
                            <div class="small">You cleared <strong>{{ interviewInsights.clearedThisMonth }}</strong> interviews.</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="alert alert-warning py-2 px-3 border-0 shadow-sm h-100 d-flex align-items-center mb-0">
                            <i class="bi bi-hourglass-split fs-4 me-2 opacity-75"></i>
                            <div class="small">You have <strong>{{ interviewInsights.missedThisMonth }}</strong> interviews awaiting results.</div>
                        </div>
                    </div>
                </div>
                <div v-else class="text-center p-2 text-muted small">
                    No interview insights available for this month yet.
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="card-header bg-white py-3">
                    <h5 class="fw-bold mb-0">Upcoming Interviews</h5>
                </div>
                <div class="card-body p-0">
                    <div v-if="upcomingInterviews.length > 0" class="table-responsive table-scroll-sm">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Job Role</th>
                                    <th>Round</th>
                                    <th>Date & Time</th>
                                    <th>Location / Link</th>
                                    <th class="text-end pe-4">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="interview in upcomingInterviews" :key="interview.interview_id">
                                    <td class="ps-4 py-3">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-primary text-white rounded text-center me-3 d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 40px; height: 40px; font-size: 1.2rem;">
                                                {{ interview.drive.company_name.charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <h6 class="mb-0 fw-bold">{{ interview.drive.JobTitle }}</h6>
                                                <small class="text-muted">{{ interview.drive.company_name }}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        Round {{ interview.round_no }}: {{ interview.round_name }}
                                        <span v-if="interview.status === 'suspended'" class="badge bg-warning text-dark ms-1 shadow-xs fw-semibold">Temporarily on Hold</span>
                                        <span v-if="interview.is_currently_eligible === false" class="badge bg-danger text-white ms-1" :title="interview.eligibility_issues ? interview.eligibility_issues.join(', ') : 'Profile ineligible'">Not Eligible</span>
                                    </td>
                                    <td>{{ formatDateTime(interview.datetime) }}</td>
                                    <td>
                                        <span v-if="interview.status === 'suspended'" class="text-danger fw-semibold">paused</span>
                                        <span v-else>
                                            <a v-if="isUrl(interview.location_or_link)" :href="interview.location_or_link" target="_blank" class="btn btn-sm btn-outline-primary">
                                                Join Meeting <i class="bi bi-box-arrow-up-right"></i>
                                            </a>
                                            <span v-else>{{ interview.location_or_link }}</span>
                                        </span>
                                    </td>
                                    <td class="text-end pe-4">
                                        <button v-if="interview.remarks" @click="showRemark(interview.remarks)" class="btn btn-sm btn-link p-0 text-decoration-none">View Notes</button>
                                        <span v-else class="text-muted small">N/A</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-center p-2 text-muted">
                        <i class="bi bi-calendar2-check fs-1 d-block mb-3 opacity-50"></i>
                        No upcoming interviews.
                    </div>
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="card-body">
                    <h5 class="fw-bold mb-0">Completed & Past Evaluations</h5>
                    <hr class="mt-2 mb-3">
                    <div v-if="completedAndMissedInterviews.length > 0" class="table-responsive table-scroll-sm">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Job Role</th>
                                    <th>Round</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th class="text-end pe-4">Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="interview in completedAndMissedInterviews" :key="interview.interview_id">
                                    <td class="ps-4 py-3">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-primary text-white rounded text-center me-3 d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 40px; height: 40px; font-size: 1.2rem;">
                                                {{ interview.drive.company_name.charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <h6 class="mb-0 fw-bold">{{ interview.drive.JobTitle }}</h6>
                                                <small class="text-muted">{{ interview.drive.company_name }}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        Round {{ interview.round_no }}: {{ interview.round_name }}
                                        <span v-if="interview.is_currently_eligible === false" class="badge bg-danger text-white ms-1" :title="interview.eligibility_issues ? interview.eligibility_issues.join(', ') : 'Profile ineligible'">Not Eligible</span>
                                    </td>
                                    <td>{{ formatDateTime(interview.datetime) }}</td>
                                    <td>
                                        <span v-if="interview.status=='scheduled'" class="badge bg-warning text-dark">result awaiting</span>
                                        <span v-else :class="interviewStatusBadge(interview.status)">{{ interview.status }}</span>
                                        </td>
                                    <td class="text-end pe-4">
                                        <div class="d-flex align-items-center justify-content-end gap-1">
                                            <span v-if="interview.result" :class="interviewResultBadge(interview.result)">{{ interview.result }}</span>
                                            <span v-else class="text-muted">N/A</span>
                                            <button v-if="interview.student_facing_remarks" 
                                                    @click="showRemark(interview.student_facing_remarks)" 
                                                    class="btn btn-link p-0 text-decoration-none ms-1" 
                                                    title="View feedback notes">
                                                <i class="bi bi-chat-left-text text-primary fs-6"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-center p-4 text-muted">
                        No completed or past interviews.
                    </div>
                </div>
            </div>
        </div>

        <div v-if="remarkToShow" class="remark-overlay" @click="remarkToShow = null">
            <div class="remark-box card card-body shadow-lg border-0" @click.stop>
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0">Remark / Feedback</h6>
                    <button type="button" class="btn-close" @click="remarkToShow = null"></button>
                </div>
                <hr>
                <p class="mb-0">{{ remarkToShow }}</p>
            </div>
        </div>

        <!-- DRIVE DETAILS MODAL -->
        <div class="modal fade" id="driveDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg" v-if="selectedDriveToApply">
                    <div class="modal-header bg-light border-bottom-0 pb-0">
                        <button type="button" class="btn-close" @click="closeDriveDetailsModal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0">
                        <drive-details-view 
                            @cancel="closeDriveDetailsModal"
                            :drive="selectedDriveToApply" 
                            @back="closeDriveDetailsModal"
                            mode="details_only" />
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="interviewDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow" v-if="selectedApplicationForInterview">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Interview Details: {{ selectedApplicationForInterview.drive.JobTitle }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div v-if="interviewsForSelectedApplication.length === 0" class="text-center text-muted py-4">
                            <i class="bi bi-calendar-x fs-1 d-block mb-3 opacity-50"></i>
                            <p class="mb-0">No interview rounds have been scheduled for this application yet.</p>
                        </div>
                        <div v-else>
                            <div class="table-responsive rounded border shadow-sm bg-white">
                                <table class="table align-middle mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="ps-4">Round</th>
                                            <th>Date & Time</th>
                                            <th>Location / Link</th>
                                            <th>Status</th>
                                            <th>Result</th>
                                            <th class="pe-4 text-end">Notes for You</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="interview in interviewsForSelectedApplication" :key="interview.interview_id" class="border-bottom">
                                            <td class="ps-4 py-3">
                                                <div class="fw-bold">Round {{ interview.round_no }}</div>
                                                <small class="text-muted">{{ interview.round_name }}</small>
                                            </td>
                                            <td>{{ formatDateTime(interview.datetime) }}</td>
                                            <td>
                                                <span v-if="interview.status === 'suspended'" class="text-danger fw-semibold">paused</span>
                                                <span v-else>
                                                    <a v-if="isUrl(interview.location_or_link) && interview.status === 'scheduled'" :href="interview.location_or_link" target="_blank" class="btn btn-xs btn-outline-primary px-2 py-1 rounded-pill">
                                                        <i class="bi bi-video"></i> Join Meeting
                                                    </a>
                                                    <span v-else class="small text-muted">{{ interview.location_or_link }}</span>
                                                </span>
                                            </td>
                                            <td>
                                                <span v-if="interview.status === 'scheduled' && new Date(interview.datetime) < new Date()" class="badge bg-warning text-dark">result awaiting</span>
                                                <span v-else :class="interviewStatusBadge(interview.status)">{{ interview.status }}</span>
                                            </td>
                                            <td>
                                                <span v-if="interview.result" :class="interviewResultBadge(interview.result)">{{ interview.result }}</span>
                                                <span v-else class="text-muted">N/A</span>
                                            </td>
                                            <td class="pe-4 text-end">
                                                <span v-if="interview.student_facing_remarks" class="small text-dark font-monospace bg-light p-1 rounded border border-light-subtle d-inline-block text-wrap" style="max-width: 250px;">
                                                    {{ interview.student_facing_remarks }}
                                                </span>
                                                <span v-else class="text-muted small">None</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="placementOfferModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow" v-if="selectedApplicationForOffer">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title fw-bold">Placement Offer: {{ selectedApplicationForOffer.drive.company_name }}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row">
                            <div class="col-md-8 border-end">
                                <h3 class="fw-bold text-success">{{ selectedApplicationForOffer.drive.JobTitle }}</h3>
                                <p class="text-muted fs-5 mb-4">at {{ selectedApplicationForOffer.drive.company_name }}</p>

                                <div v-if="selectedApplicationForOffer.offer_message" class="alert alert-success-subtle border-success">
                                    <h6 class="fw-bold text-success-emphasis"><i class="bi bi-chat-quote-fill me-2"></i>Message from the employer:</h6>
                                    <p class="mb-0 fst-italic">"{{ selectedApplicationForOffer.offer_message }}"</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="bg-light rounded p-3 h-100">
                                    <h6 class="fw-bold text-muted small text-uppercase mb-3">Offer Details</h6>
                                    <p class="mb-2 small"><strong>Sent On:</strong><br> {{ formatDateTime(selectedApplicationForOffer.offer_sent_date) }}</p>
                                    
                                    <!-- If the offer is accepted (status == 'Hired') -->
                                    <template v-if="selectedApplicationForOffer.status === 'Hired'">
                                        <div class="alert alert-success text-center mb-3">
                                            <i class="bi bi-check-circle-fill fs-4 d-block mb-1"></i>
                                            <span class="fw-bold">Offer Accepted</span>
                                        </div>
                                        <p v-if="selectedApplicationForOffer.joining_date" class="mb-3 small"><strong>Joining Date:</strong><br> {{ formatDateTime(selectedApplicationForOffer.joining_date) }}</p>
                                        <div v-if="selectedApplicationForOffer.offer_letter" class="mb-3">
                                            <a :href="'/' + selectedApplicationForOffer.offer_letter" target="_blank" class="btn btn-success w-100 mb-2">
                                                <i class="bi bi-eye me-1"></i> View Offer Letter
                                            </a>
                                        </div>
                                    </template>

                                    <!-- If the offer is rejected -->
                                    <template v-else-if="selectedApplicationForOffer.status === 'Rejected'">
                                        <div class="alert alert-danger text-center mb-3">
                                            <i class="bi bi-x-circle-fill fs-4 d-block mb-1"></i>
                                            <span class="fw-bold">Offer Rejected</span>
                                        </div>
                                    </template>

                                    <!-- If the offer is active (status == 'Selected') -->
                                    <template v-else-if="selectedApplicationForOffer.status === 'Selected'">
                                        <p class="mb-3 small text-danger"><strong>Expires On:</strong><br> {{ formatDateTime(selectedApplicationForOffer.offer_expiry_date) }}</p>
                                        
                                        <div v-if="!selectedApplicationForOffer.is_offer_expired">
                                            <div v-if="selectedApplicationForOffer.offer_letter" class="mb-3">
                                                <a :href="'/' + selectedApplicationForOffer.offer_letter" target="_blank" class="btn btn-outline-success w-100 mb-2">
                                                    <i class="bi bi-eye me-1"></i> View Offer Letter
                                                </a>
                                            </div>
                                        </div>
                                        <div v-else class="alert alert-warning text-start">
                                            <span class="fw-bold d-block text-center mb-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>Offer Expired</span>
                                            <small class="d-block text-muted text-center">This offer has expired. You can contact support/employer to request an offer letter extension if you still want to accept it.</small>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button v-if="selectedApplicationForOffer.status === 'Selected' && !selectedApplicationForOffer.is_offer_expired" type="button" class="btn btn-outline-danger" @click="rejectOffer(selectedApplicationForOffer.id)">Reject Offer</button>
                        <button v-if="selectedApplicationForOffer.status === 'Selected' && !selectedApplicationForOffer.is_offer_expired" type="button" class="btn btn-success px-4" @click="acceptOffer(selectedApplicationForOffer.id)">Accept Offer</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: {
        'drive-details-view': DriveDetailsView,
    },
    data() {
        return {
            currentTab: 'applications',
            allApplications: [],
            allInterviews: [],
            remarkToShow: null,
            selectedApplicationForInterview: null,
            selectedApplicationForOffer: null,
            interviewDetailsModal: null,
            placementOfferModal: null,
            driveDetailsModal: null,
            selectedDriveToApply: null,
            profile: null,
        };
    },
    computed: {
        sortedApplications() {
            const statusOrder = { 'Selected': 1, 'Shortlisted': 2, 'Interviewing': 3, 'Pending': 4};
            return [...this.allApplications]
                .filter(app => !app.rejection_reason && app.status !== 'Rejected' && app.status !== 'Hired' && app.status !== 'Cancelled')
                .sort((a, b) => {
                    const statusA = statusOrder[a.status] || 99;
                    const statusB = statusOrder[b.status] || 99;
                    return statusA - statusB;
                });
        },
        pastApplications() {
            return [...this.allApplications]
                .filter(app => app.rejection_reason || app.status === 'Rejected' || app.status === 'Hired' || app.status === 'Cancelled')
                .sort((a, b) => new Date(b.application_datetime) - new Date(a.application_datetime))
                .slice(0, 5);
        },
        applicationInsights() {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            const applicationsThisMonth = this.allApplications.filter(app => {
                const appDate = new Date(app.application_datetime);
                return appDate >= startOfMonth && appDate <= endOfMonth;
            });

            const rejectedPreScreening = applicationsThisMonth.filter(app => {
                const appInterviews = this.allInterviews.filter(i => parseInt(i.application_id) === parseInt(app.id));
                return (app.status === 'Rejected') && (appInterviews.length === 0);
            }).length;

            const rejectedFirstRound = applicationsThisMonth.filter(app => {
                const appInterviews = this.allInterviews.filter(i => parseInt(i.application_id) === parseInt(app.id));
                return (app.rejection_reason || app.status === 'Rejected') && 
                       appInterviews.length > 0 && 
                       appInterviews.some(int => parseInt(int.round_no) === 1 && int.result === 'failed');
            }).length;

            const selectedThisMonth = applicationsThisMonth.filter(app => ['Selected', 'Hired'].includes(app.status) && !app.rejection_reason).length;

            return {
                totalApplicationsThisMonth: applicationsThisMonth.length,
                rejectedPreScreening,
                rejectedFirstRound,
                selectedThisMonth,
            };
        },
        upcomingInterviews() {
            const now = new Date();
            return this.allInterviews.filter(interview => {
                const interviewDateTime = new Date(interview.datetime);
                return (interview.status === 'scheduled' || interview.status === 'suspended') && interviewDateTime > now;
            }).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        },
        completedAndMissedInterviews() {
            const now = new Date();
            return this.allInterviews.filter(interview => {
                const interviewDateTime = new Date(interview.datetime);
                return interview.status === 'completed' || (interview.status === 'scheduled' && interviewDateTime < now);
            }).sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        },
        interviewInsights() {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            const interviewsThisMonth = this.allInterviews.filter(interview => {
                const interviewDateTime = new Date(interview.datetime);
                return interviewDateTime >= startOfMonth && interviewDateTime <= endOfMonth;
            });

            const clearedThisMonth = interviewsThisMonth.filter(interview => interview.result === 'passed').length;
            const missedThisMonth = interviewsThisMonth.filter(interview => interview.status === 'scheduled' && new Date(interview.datetime) < now).length;

            return {
                clearedThisMonth,
                missedThisMonth,
            };
        },
        interviewsForSelectedApplication() {
            if (!this.selectedApplicationForInterview) return [];
            return this.allInterviews.filter(i => parseInt(i.application_id) === parseInt(this.selectedApplicationForInterview.id))
                                     .sort((a, b) => parseInt(a.round_no) - parseInt(b.round_no));
        }
    },
    methods: {
        formatDateTime,
        deadlinePassed(expiryDateString) {
            if (!expiryDateString) return false; // If there's no date, assume it's not expired
            
            const expiryDate = new Date(expiryDateString);
            const now = new Date();
            return now > expiryDate; 
        },
        async fetchStudentData() {
            try {
                const appRes = await fetch('/api/student_applications_api', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (appRes.ok) {
                    this.allApplications = await appRes.json();
                } else {
                    console.error('Failed to fetch applications:', appRes.status);
                }

                const interviewRes = await fetch('/api/student_interviews', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (interviewRes.ok) {
                    this.allInterviews = await interviewRes.json();
                } else {
                    console.error('Failed to fetch interviews:', interviewRes.status);
                }
                
                const profRes = await fetch('/api/student_profile', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (profRes.ok) {
                    this.profile = await profRes.json();
                }
            } catch (error) {
                console.error('Error fetching student data:', error);
            }
        },
        statusBadge(status) {
            switch (status) {
                case 'Pending': return 'badge bg-primary text-white';
                case 'Shortlisted': return 'badge bg-warning text-dark';
                case 'Selected': return 'badge bg-success text-white shadow-sm';
                case 'Rejected': return 'badge bg-danger text-white';
                case 'Hired': return 'badge bg-info text-white';
                case 'Cancelled': return 'badge bg-secondary text-white';
                default: return 'badge bg-secondary text-white';
            }
        },
        interviewStatusBadge(status) {
            switch (status) {
                case 'scheduled': return 'badge bg-primary';
                case 'completed': return 'badge bg-success';
                case 'canceled': return 'badge bg-danger';
                default: return 'badge bg-secondary';
            }
        },
        interviewResultBadge(result) {
            switch (result) {
                case 'passed': return 'badge bg-success';
                case 'failed': return 'badge bg-danger';
                default: return 'badge bg-secondary';
            }
        },
        // --- NEW FEATURES ---
        goToExport() {
            // Redirect to the profile page (where the export button lives)
            this.$router.push({ path: '/student_profile' });
        },
        showDriveInfo(app) {
            this.selectedDriveToApply = { DriveID: app.DriveID, ...app.drive };
            this.$nextTick(() => {
                if (this.driveDetailsModal) {
                    this.driveDetailsModal.show();
                }
            });
        },
        closeDriveDetailsModal() {
            if (this.driveDetailsModal) {
                this.driveDetailsModal.hide();
            }
            setTimeout(() => {
                this.selectedDriveToApply = null;
            }, 300);
        },
        async cancelApplication(applicationId) {
            if (confirm('Are you sure you want to cancel this application? This action cannot be undone.')) {
                try {
                    const res = await fetch(`/api/student_application_api/${applicationId}/cancel`, {
                        method: 'PUT',
                        headers: { 'Authentication-Token': localStorage.getItem('token') }
                    });
                    if (res.ok) {
                        alert('Application cancelled successfully!');
                        this.fetchStudentData();
                    } else {
                        const errorData = await res.json();
                        alert(`Failed to cancel application: ${errorData.message || 'Please try again.'}`);
                    }
                } catch (error) {
                    console.error('Error cancelling application:', error);
                    alert('An error occurred while cancelling the application.');
                }
            }
        },
        viewInterviewDetails(applicationId) {
            this.selectedApplicationForInterview = this.allApplications.find(app => app.id === applicationId);
            this.interviewDetailsModal.show();
        },
        viewPlacementOffer(applicationId) {
            this.selectedApplicationForOffer = this.allApplications.find(app => app.id === applicationId);
            this.placementOfferModal.show();
        },
        async acceptOffer(applicationId) {
            if (confirm('Are you sure you want to ACCEPT this offer? This commits you to the job and city.')) {
                try {
                    const res = await fetch(`/api/student_application/${applicationId}/accept_offer`, {
                        method: 'PUT',
                        headers: { 'Authentication-Token': localStorage.getItem('token') }
                    });
                    if (res.ok) {
                        alert('Offer accepted successfully! Congratulations!');
                        this.fetchStudentData();
                        this.placementOfferModal.hide();
                    } else {
                        const errorData = await res.json();
                        alert(`Failed to accept offer: ${errorData.message || 'Please try again.'}`);
                    }
                } catch (error) {
                    console.error('Error accepting offer:', error);
                    alert('An error occurred while accepting the offer.');
                }
            }
        },
        async rejectOffer(applicationId) {
            if (confirm('Are you sure you want to REJECT this offer? This action cannot be undone.')) {
                try {
                    const res = await fetch(`/api/student_application/${applicationId}/reject_offer`, {
                        method: 'PUT',
                        headers: { 'Authentication-Token': localStorage.getItem('token') }
                    });
                    if (res.ok) {
                        alert('Offer rejected successfully.');
                        this.fetchStudentData();
                        this.placementOfferModal.hide();
                    } else {
                        const errorData = await res.json();
                        alert(`Failed to reject offer: ${errorData.message || 'Please try again.'}`);
                    }
                } catch (error) {
                    console.error('Error rejecting offer:', error);
                    alert('An error occurred while rejecting the offer.');
                }
            }
        },
        isUrl(text) {
            if (!text) return false;
            return text.startsWith('http://') || text.startsWith('https://');
        },
        showRemark(remark) {
            this.remarkToShow = remark;
        },
    },
    mounted() {
        this.fetchStudentData();
        this.interviewDetailsModal = new bootstrap.Modal(document.getElementById('interviewDetailsModal'));
        this.placementOfferModal = new bootstrap.Modal(document.getElementById('placementOfferModal'));
        this.driveDetailsModal = new bootstrap.Modal(document.getElementById('driveDetailsModal'));

        if (!document.getElementById('remark-overlay-styles')) {
            const style = document.createElement('style');
            style.id = 'remark-overlay-styles';
            style.innerHTML = `
            .remark-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1055; backdrop-filter: blur(2px); }
            .remark-box { width: 90%; max-width: 450px; }`;
            document.head.appendChild(style);
        }
    },
};

export default StudentApplicationsAndInterviews;