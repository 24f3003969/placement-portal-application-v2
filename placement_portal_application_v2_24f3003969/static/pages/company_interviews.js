import { formatDateTime, getMinDateTime } from '../utils/formatDateTime.js';
import StudentProfile from '../components/student_profile.js';
const InterviewRoundView = {
    props: ['interviews', 'roundNumber', 'totalRounds', 'driveTitle', 'allDriveInterviews'],
    template: `
    <div>
        <div v-if="remarkToShow" class="remark-overlay" @click="remarkToShow = null">
            <div class="remark-box card card-body shadow-lg" @click.stop>
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0">{{ remarkToShow.title }}</h6>
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

        <h6 class="text-muted fw-bold mt-2 mb-1.5" style="font-size: 0.85rem;"><i class="bi bi-calendar2-week me-1"></i> Upcoming / Scheduled Interviews</h6>
        <div class="table-responsive shadow-sm rounded border bg-white mb-3" style="max-height: 250px; overflow-y: auto;">
            <table class="table table-hover table-sm align-middle mb-0" style="font-size: 0.8rem;">
                <thead class="table-light position-sticky top-0 z-1 shadow-xs">
                    <tr>
                        <th class="ps-3 py-1.5">Student Name</th>
                        <th class="py-1.5">Roll No</th>
                        <th class="py-1.5">Interview Date & Time</th>
                        <th class="py-1.5">Location / Link</th>
                        <th class="py-1.5">Previous Round Briefing</th>
                        <th class="pe-3 py-1.5">Action Desk</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="interview in scheduledInterviews" :key="interview.interview_id">
                        <td class="ps-3">
                            <button @click="$emit('view-profile', interview.student.user_id, interview.application_resume || interview.resume)" class="btn btn-link p-0 text-primary fw-bold text-decoration-none" style="font-size: 0.8rem;">
                                {{ interview.student.name }}
                            </button>
                        </td>
                        <td><span class="badge bg-light text-dark border px-1.5 py-0.5" style="font-size: 0.72rem;">{{ interview.student.roll_no }}</span></td>
                        <td class="fw-medium text-dark">
                            {{ formatDateTime(interview.datetime) }}
                            <span v-if="interview.status === 'suspended'" class="badge bg-warning text-dark ms-1 shadow-xs fw-semibold px-1.5 py-0.5" style="font-size: 0.7rem;">Temporarily on Hold</span>
                        </td>
                        <td>
                            <div v-if="interview.status === 'suspended'" class="text-danger fw-semibold">paused</div>
                            <div v-else>
                                <a v-if="isUrl(interview.location_or_link)" :href="interview.location_or_link" target="_blank" class="btn btn-xs btn-outline-primary px-2 py-0.5 rounded" style="font-size: 0.72rem;">
                                    <i class="bi bi-video"></i> Join Meeting
                                </a>
                                <span v-else class="small text-muted">{{ interview.location_or_link }}</span>
                            </div>
                        </td>
                        
                        <td>
                            <button v-if="getPreviousRoundRecord(interview)" class="btn btn-sm btn-link p-0 text-decoration-none" style="font-size: 0.8rem;" @click.stop="showPreviousRemark(interview)">
                                View Previous Remarks
                            </button>
                            <span v-else class="text-muted small" style="font-size: 0.75rem;">No previous remarks (Round 1)</span>
                        </td>
                        <td class="pe-3">
                            <span v-if="interview.status === 'suspended'" class="text-muted small fw-medium">Hold (Drive Suspended)</span>
                            <div v-else>
                                <button v-if="isPast(interview.datetime)" @click="$emit('perform-action', interview)" class="btn btn-xs btn-warning fw-bold px-2 py-0.5 rounded shadow-sm" style="font-size: 0.72rem;">
                                    Update Status
                                </button>
                                <button v-else @click="$emit('update-interview', interview)" class="btn btn-xs btn-info fw-bold px-2 py-0.5 rounded shadow-sm text-white" style="font-size: 0.72rem;">
                                    Update Interview
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="scheduledInterviews.length === 0">
                        <td colspan="7" class="text-center text-muted py-3 small">No scheduled evaluations live in this round block.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h6 class="text-muted fw-bold mt-3 mb-1.5" style="font-size: 0.85rem;"><i class="bi bi-clock-history me-1"></i> Completed Interview Logs</h6>
        <div class="table-responsive shadow-sm rounded border bg-white" style="max-height: 250px; overflow-y: auto;">
            <table class="table table-hover table-sm align-middle mb-0" style="font-size: 0.8rem;">
                <thead class="table-light position-sticky top-0 z-1 shadow-xs">
                    <tr>
                        <th class="ps-3 py-1.5">Student Name</th>
                        <th class="py-1.5">Roll No</th>
                        <th class="py-1.5">Interview Date & Time</th>
                        <th class="py-1.5">Location / Link</th>
                        <th class="py-1.5">Result Verdict</th>
                        <th class="pe-3 py-1.5">Evaluation Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="interview in completedInterviews" :key="interview.interview_id" class="table-opacity border-bottom">
                        <td class="ps-3">
                            <button @click="$emit('view-profile', interview.student.user_id, interview.application_resume || interview.resume)" class="btn btn-link p-0 text-primary fw-bold text-decoration-none" style="font-size: 0.8rem;">
                                {{ interview.student.name }}
                            </button>
                        </td>
                        <td>{{ interview.student.roll_no }}</td>
                        <td class="text-muted small" style="font-size: 0.75rem;">{{ formatDateTime(interview.datetime) }}</td>
                        <td>
                            <span class="small text-muted">{{ interview.location_or_link || 'N/A' }}</span>
                        </td>
                        <td>
                            <span :class="['badge rounded px-2 py-0.5', interview.result === 'passed' ? 'bg-success bg-gradient' : 'bg-danger']" style="font-size: 0.72rem;">
                                <i :class="interview.result === 'passed' ? 'bi bi-check-circle' : 'bi bi-x-circle'"></i> {{ interview.result.toUpperCase() }}
                            </span>
                        </td>
                        
                        <td class="pe-3">
                            <button v-if="interview.remarks || interview.student_facing_remarks" class="btn btn-sm btn-link p-0 text-decoration-none" style="font-size: 0.8rem;" @click.stop="showCurrentRoundRemark(interview)">
                                View Remarks
                            </button>
                            <span v-else class="text-muted small" style="font-size: 0.75rem;">No evaluation recorded</span>
                        </td>
                    </tr>
                    <tr v-if="completedInterviews.length === 0">
                        <td colspan="6" class="text-center text-muted py-3 small">No historical records logged for this session yet.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `,
    data() {
        return { remarkToShow: null };
    },
    computed: {
        scheduledInterviews() {
            return (this.interviews || []).filter(i => i.status === 'scheduled' || i.status === 'suspended');
        },
        completedInterviews() {
            return (this.interviews || []).filter(i => i.status === 'completed');
        }
    },
    methods: {
        formatDateTime,
        isPast(isoString) {
            if (!isoString) return false;
            return new Date(isoString) < new Date();
        },
        isUrl(text) {
            if (!text) return false;
            return text.startsWith('http://') || text.startsWith('https://');
        },
        
        // Looks through the nested array to find the true historical row matching the student
        getPreviousRoundRecord(currentInterview) {
            if (!this.allDriveInterviews || parseInt(currentInterview.round_no) <= 1) return null;
            const targetPrevRound = parseInt(currentInterview.round_no) - 1;
            
            return this.allDriveInterviews.find(i => 
                parseInt(i.application_id) === parseInt(currentInterview.application_id) && 
                parseInt(i.round_no) === targetPrevRound
            );
        },
        showPreviousRemark(interview) {
            const priorRecord = this.getPreviousRoundRecord(interview);
            if (priorRecord) {
                this.remarkToShow = {
                    internal: priorRecord.remarks || "No confidential notes provided.",
                    student: priorRecord.student_facing_remarks || "No student logs generated."
                };
            }
        },
        showCurrentRoundRemark(interview) {
            this.remarkToShow = {
                internal: interview.remarks || "No internal remarks logged for this round.",
                student: interview.student_facing_remarks || "No student remarks logged for this round."
            };
        }
    }
};

const CompanyInterviews = {
    template: `
    <div class="container-fluid py-2 px-3 small">
        <div v-if="remarkToShow" class="remark-overlay" @click="remarkToShow = null">
            <div class="remark-box card card-body shadow-lg" @click.stop>
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0">Previous Round Briefing</h6>
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

        <h4 class="fw-bold mb-2">Manage Interviews</h4>

        <div class="mb-2.5" v-if="drives.length > 0">
            <label for="driveSelector" class="form-label fw-semibold text-muted small mb-1">Select a Drive to View Interviews</label>
            <select id="driveSelector" class="form-select form-select-sm" v-model="selectedDriveId">
                <option :value="null">-- Please select a drive --</option>
                <option v-for="drive in drives" :key="drive.DriveID" :value="drive.DriveID">
                    (#{{drive.DriveID}}) {{ drive.JobTitle }}
                </option>
            </select>
        </div>
        <div v-else-if="!loading" class="alert alert-info py-2 px-3 small mb-2">
            No interviews have been scheduled for any of your drives yet.
        </div>

        <div class="row mb-2.5 mt-2" v-if="selectedDriveId">
            <div class="col-md-12">
                <div class="input-group shadow-sm">
                    <input 
                        type="text" 
                        class="form-control form-control-sm border-0 py-1.5" 
                        placeholder="Search student by Name or Roll No..." 
                        v-model="searchQuery"
                    >
                    <button v-if="searchQuery" class="btn btn-light btn-sm bg-white border-0 text-muted" @click="searchQuery = ''">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <button class="btn btn-primary btn-sm px-3 fw-bold" style="background-color: #003366;">
                        Search
                    </button>
                </div>
            </div>
        </div>

        <div v-if="selectedDrive">
            <hr class="my-2 text-muted opacity-25">
            <h5 class="fw-bold mb-2 text-dark">{{ selectedDrive.JobTitle }} - Interview Rounds</h5>
            <div v-if="!selectedDrive.noRounds || selectedDrive.noRounds < 1" class="alert alert-warning py-2 px-3 small">
                This drive has no interview rounds configured. Please edit the drive to add rounds.
            </div>

            <div v-else-if="selectedDrive.noRounds === 1" class="card border-0 shadow-sm">
                <div class="card-body p-2.5">
                    <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-1.5">
                        <h6 class="card-title fw-bold mb-0">Round 1: {{ selectedDrive.InterviewRounds[0] }}</h6>
                        <button class="btn btn-danger btn-xs fw-bold px-2 py-0.5 rounded shadow-sm" style="font-size: 0.72rem;" @click="closeRound(1)">
                            <i class="bi bi-x-circle me-1"></i> Close / Complete Round 1
                        </button>
                    </div>
                    <p class="text-muted small mb-2">Open to all shortlisted students.</p>
                    
                    <!-- Awaiting Scheduling Pool -->
                    <div v-if="awaitingSchedulingForActiveRound.length > 0" class="mb-3">
                        <h6 class="text-danger fw-bold mb-1.5" style="font-size: 0.85rem;"><i class="bi bi-hourglass-split me-1"></i> Awaiting Scheduling (Round 1)</h6>
                        <div class="table-responsive shadow-sm rounded border bg-white mb-2" style="max-height: 180px; overflow-y: auto;">
                            <table class="table table-hover table-sm align-middle mb-0" style="font-size: 0.8rem;">
                                <thead class="table-light position-sticky top-0 z-1 shadow-xs">
                                    <tr>
                                        <th class="ps-3 py-1.5">Student Name</th>
                                        <th class="py-1.5">Roll No</th>
                                        <th class="py-1.5">Target Round</th>
                                        <th class="py-1.5">Previous Round Briefing</th>
                                        <th class="pe-3 py-1.5 text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="cand in awaitingSchedulingForActiveRound" :key="cand.application_id">
                                        <td class="ps-3">
                                            <button @click="viewStudentProfile(cand.student.user_id)" class="btn btn-link p-0 text-primary fw-bold text-decoration-none" style="font-size: 0.8rem;">
                                                {{ cand.student.name }}
                                            </button>
                                        </td>
                                        <td><span class="badge bg-light text-dark border px-1.5 py-0.5" style="font-size: 0.72rem;">{{ cand.student.roll_no }}</span></td>
                                        <td><span class="badge bg-secondary px-1.5 py-0.5" style="font-size: 0.72rem;">{{ cand.round_name }}</span></td>
                                        <td>
                                            <button v-if="getAwaitingPrevRoundRecord(cand)" class="btn btn-sm btn-link p-0 text-decoration-none" style="font-size: 0.8rem;" @click.stop="showAwaitingPreviousRemark(cand)">
                                                View Previous Remarks
                                            </button>
                                            <span v-else class="text-muted small" style="font-size: 0.75rem;">No previous remarks (Round 1)</span>
                                        </td>
                                        <td class="pe-3 text-end">
                                            <button @click="openScheduleOnlyModal(cand)" class="btn btn-xs btn-success fw-bold px-2 py-0.5 rounded shadow-sm text-white" style="font-size: 0.72rem;">
                                                <i class="bi bi-calendar-event me-1"></i> Schedule Round
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <interview-round-view 
                        :interviews="interviewsByRound[1]" 
                        :round-number="1" 
                        :total-rounds="selectedDrive.noRounds" 
                        :drive-title="selectedDrive.JobTitle"
                        @perform-action="handleInterviewAction"
                        @update-interview="openRescheduleModal"
                        @view-profile="viewStudentProfile" />
                </div>
            </div>

            <div v-else>
                <ul class="nav nav-tabs" role="tablist" style="font-size: 0.85rem;">
                    <li class="nav-item" v-for="(roundName, index) in selectedDrive.InterviewRounds" :key="index">
                        <button :class="['nav-link py-1 px-3', { active: activeTab === (index + 1) }]" @click="activeTab = (index + 1)">
                            Round {{ index + 1 }}: {{ roundName }}
                        </button>
                    </li>
                </ul>
                <div class="tab-content pt-2">
                    <div v-for="(roundName, index) in selectedDrive.InterviewRounds" :key="index">
                        <div v-if="activeTab === (index + 1)" class="card card-body border-top-0 p-2.5">
                            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-1.5">
                                <h6 class="fw-bold mb-0">Round {{ index + 1 }}: {{ roundName }}</h6>
                                <button class="btn btn-danger btn-xs fw-bold px-2 py-0.5 rounded shadow-sm" style="font-size: 0.72rem;" @click="closeRound(index + 1)">
                                    <i class="bi bi-x-circle me-1"></i> Close / Complete Round {{ index + 1 }}
                                </button>
                            </div>
                            <p class="text-muted small mb-2">{{ getRoundHeading(index + 1) }}</p>
                            
                            <!-- Awaiting Scheduling Pool -->
                            <div v-if="awaitingSchedulingForActiveRound.length > 0" class="mb-3">
                                <h6 class="text-danger fw-bold mb-1.5" style="font-size: 0.85rem;"><i class="bi bi-hourglass-split me-1"></i> Awaiting Scheduling (Round {{ activeTab }})</h6>
                                <div class="table-responsive shadow-sm rounded border bg-white mb-2" style="max-height: 180px; overflow-y: auto;">
                                    <table class="table table-hover table-sm align-middle mb-0" style="font-size: 0.8rem;">
                                        <thead class="table-light position-sticky top-0 z-1 shadow-xs">
                                            <tr>
                                                <th class="ps-3 py-1.5">Student Name</th>
                                                <th class="py-1.5">Roll No</th>
                                                <th class="py-1.5">Target Round</th>
                                                <th class="py-1.5">Previous Round Briefing</th>
                                                <th class="pe-3 py-1.5 text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="cand in awaitingSchedulingForActiveRound" :key="cand.application_id">
                                                <td class="ps-3">
                                                    <button @click="viewStudentProfile(cand.student.user_id)" class="btn btn-link p-0 text-primary fw-bold text-decoration-none" style="font-size: 0.8rem;">
                                                        {{ cand.student.name }}
                                                    </button>
                                                </td>
                                                <td><span class="badge bg-light text-dark border px-1.5 py-0.5" style="font-size: 0.72rem;">{{ cand.student.roll_no }}</span></td>
                                                <td><span class="badge bg-secondary px-1.5 py-0.5" style="font-size: 0.72rem;">{{ cand.round_name }}</span></td>
                                                <td>
                                                    <button v-if="getAwaitingPrevRoundRecord(cand)" class="btn btn-sm btn-link p-0 text-decoration-none" style="font-size: 0.8rem;" @click.stop="showAwaitingPreviousRemark(cand)">
                                                        View Previous Remarks
                                                    </button>
                                                    <span v-else class="text-muted small" style="font-size: 0.75rem;">No previous remarks (Round 1)</span>
                                                </td>
                                                <td class="pe-3 text-end">
                                                    <button @click="openScheduleOnlyModal(cand)" class="btn btn-xs btn-success fw-bold px-2 py-0.5 rounded shadow-sm text-white" style="font-size: 0.72rem;">
                                                        <i class="bi bi-calendar-event me-1"></i> Schedule Round
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <interview-round-view 
                                :interviews="interviewsByRound[index + 1]" 
                                :round-number="index + 1" 
                                :total-rounds="selectedDrive.noRounds" 
                                :drive-title="selectedDrive.JobTitle"
                                
                                :all-drive-interviews="selectedDrive.interviews" 
                                
                                @perform-action="handleInterviewAction"
                                @update-interview="openRescheduleModal"
                                @view-profile="viewStudentProfile" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Update Status Modal -->
        <div class="modal fade" id="updateStatusModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content" v-if="selectedApplicationForUpdate">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            {{ selectedApplicationForUpdate.is_only_schedule ? 'Schedule Interview' : 'Update Status' }} for {{ selectedApplicationForUpdate.student.name }}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Job:</strong> {{ selectedDrive.JobTitle }}</p>
                        <div v-if="selectedApplicationForUpdate.is_only_schedule">
                            <p><strong>Status:</strong> Scheduling next interview round.</p>
                            <hr>
                            <div class="card p-3 bg-light border">
                                <h6 class="fw-bold">Schedule Round Details</h6>
                                <div class="row g-3">
                                    <div class="col-md-6"><label class="form-label small">Date and Time</label><input type="datetime-local" v-model="nextInterviewData.datetime" :min="getMinDateTime()" class="form-control"></div>
                                    <div class="col-md-6"><label class="form-label small">Location / Meet Link</label><input type="text" v-model="nextInterviewData.location" class="form-control"></div>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <p><strong>Current Status:</strong>
                                <span>
                                    Interview was scheduled for {{ formatDateTime(selectedApplicationForUpdate.datetime) }}. Please provide feedback.
                                </span>
                            </p>
                            <hr>
                            <!-- Feedback Section -->
                            <div class="card p-3 bg-light border mb-3">
                                <h6 class="fw-bold">Evaluation Feedback</h6>
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label class="form-label small fw-bold">Internal Assessment Notes</label>
                                        <textarea v-model="nextInterviewData.remarks" class="form-control" rows="2" placeholder="Write confidential internal feedback..."></textarea>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label small fw-bold">Notes for Student (Optional)</label>
                                        <textarea v-model="nextInterviewData.student_facing_remarks" class="form-control" rows="2" placeholder="Write notes to share with the student..."></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Next Round Promotion -->
                            <div v-if="selectedDrive.noRounds && selectedApplicationForUpdate.round_no < selectedDrive.noRounds">
                                <div class="form-check form-switch mb-3">
                                    <input class="form-check-input" type="checkbox" id="scheduleNowCheck" v-model="scheduleNow">
                                    <label class="form-check-label fw-bold" for="scheduleNowCheck">Schedule next round immediately</label>
                                </div>
                                
                                <div v-if="scheduleNow" class="card p-3 bg-light border">
                                    <h6 class="fw-bold">Schedule Round {{ selectedApplicationForUpdate.round_no + 1 }}: {{ getNextRoundName() }}</h6>
                                    <div class="row g-3">
                                        <div class="col-md-6"><label class="form-label small">Date and Time</label><input type="datetime-local" v-model="nextInterviewData.datetime" :min="getMinDateTime()" class="form-control"></div>
                                        <div class="col-md-6"><label class="form-label small">Location / Meet Link</label><input type="text" v-model="nextInterviewData.location" class="form-control"></div>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="alert alert-success p-3">
                                <h6 class="fw-bold mb-1"><i class="bi bi-info-circle-fill"></i> Final Decision</h6>
                                <p class="mb-0 small">This was the final interview round. Marking the candidate as 'Selected' will proceed with the job offer process.</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-between">
                        <!-- Left Aligned Reject (Hide if only scheduling) -->
                        <button v-if="!selectedApplicationForUpdate.is_only_schedule" class="btn btn-outline-danger" @click="openRejectionModal">Reject Application</button>
                        <span v-else></span>
                        
                        <div>
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <!-- If only scheduling -->
                            <button v-if="selectedApplicationForUpdate.is_only_schedule" class="btn btn-success" @click="scheduleNextRound">Schedule Round</button>
                            <!-- If evaluating with next round available -->
                            <button v-else-if="selectedApplicationForUpdate.round_no < selectedDrive.noRounds" 
                                    class="btn btn-primary" 
                                    @click="scheduleNow ? scheduleNextRound() : passRoundOnly()">
                                {{ scheduleNow ? 'Schedule & Promote' : 'Save Feedback & Pass' }}
                            </button>
                            <!-- If evaluating final round -->
                            <button v-else class="btn btn-success" @click="selectCandidate">Mark as Selected</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Rejection Reason Modal -->
        <div class="modal fade" id="rejectionReasonModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Reject Application</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Rejection Reason Category (Optional)</label>
                            <select v-model="rejectionCategory" class="form-select mb-2">
                                <option value="">Select standard category...</option>
                                <option value="Lacks required technical skills">Lacks required technical skills</option>
                                <option value="Does not meet CGPA criteria">Does not meet CGPA criteria</option>
                                <option value="Resume mismatch / Incomplete application">Resume mismatch / Incomplete application</option>
                                <option value="Failed live interviewing round steps">Failed live interviewing round steps</option>
                                <option value="Candidate was unresponsive or no-show">Candidate was unresponsive or no-show</option>
                                <option value="Position closed">Position closed</option>
                                <option value="Other">Other (custom reason)</option>
                            </select>
                        </div>
                        <div class="mb-3" v-if="rejectionCategory === 'Other' || !rejectionCategory">
                            <label class="form-label fw-bold">Custom Rejection Reason</label>
                            <textarea v-model="rejectionData.reason" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="mb-3"><label class="form-label">Note for Student (Optional)</label><textarea v-model="rejectionData.note" class="form-control" rows="2"></textarea></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" @click="confirmRejectApplication" :disabled="!rejectionCategory ? !rejectionData.reason : (rejectionCategory === 'Other' && !rejectionData.reason)">Confirm Rejection</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Reschedule / Cancel Modal -->
        <div class="modal fade" id="rescheduleModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" v-if="selectedApplicationForUpdate">
                    <div class="modal-header bg-light border-0">
                        <h5 class="modal-title fw-bold">Update Interview for {{ selectedApplicationForUpdate.student.name }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-3">
                        <div class="alert alert-info small mb-3">
                            <strong>Current Slot:</strong> {{ formatDateTime(selectedApplicationForUpdate.datetime) }}<br>
                            <strong>Reschedule Count:</strong> {{ selectedApplicationForUpdate.reschedule_count || 0 }}
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small">New Date & Time (Leave blank if cancelling)</label>
                            <input type="datetime-local" class="form-control" v-model="rescheduleData.datetime" :min="getMinDateTime()">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small">New Location / Meet Link (Optional, leave blank to keep current)</label>
                            <input type="text" class="form-control" v-model="rescheduleData.location" placeholder="e.g. Google Meet URL or Room No">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small">Reason (Mandatory)</label>
                            <textarea class="form-control" v-model="rescheduleData.reason" rows="3" placeholder="Reason for rescheduling or cancelling..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0 justify-content-between">
                        <button type="button" class="btn btn-danger btn-sm px-3 fw-bold" @click="submitInterviewUpdate('cancel')" :disabled="!rescheduleData.reason.trim()">Cancel Interview</button>
                        <div>
                            <button type="button" class="btn btn-secondary btn-sm me-2" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary btn-sm px-3 fw-bold shadow-sm" @click="submitInterviewUpdate('reschedule')" :disabled="!rescheduleData.reason.trim() || (rescheduleData.datetime === '')">Reschedule</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Profile Modal -->
        <div class="modal fade" id="quickProfileModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-light border-0">
                        <h5 class="modal-title fw-bold">Applicant Profile Overview</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <student-profile v-if="selectedStudentId" :user-id="selectedStudentId" :is-admin-view="true" :application-resume="selectedApplicationResume" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: {
        'interview-round-view': InterviewRoundView,
        'student-profile': StudentProfile
    },
    data() {
        return {
            drives: [],
            selectedDriveId: null,
            activeTab: 1,
            loading: true,
            searchQuery: '',
            selectedApplicationForUpdate: null,
            updateStatusModal: null,
            rescheduleModal: null,
            rescheduleData: { datetime: '', location: '', reason: '' },
            rejectionReasonModal: null,
            rejectionCategory: '',
            nextInterviewData: {
                datetime: '',
                location: '',
                remarks: '',
                student_facing_remarks: ''
            },
            rejectionData: {
                reason: '',
                note: ''
            },
            selectedStudentId: null,
            selectedApplicationResume: null,
            quickProfileModal: null,
            scheduleNow: true,
            remarkToShow: null
        };
    },
    computed: {
        selectedDrive() {
            if (!this.selectedDriveId) return null;
            return this.drives.find(d => d.DriveID === this.selectedDriveId);
        },
        interviewsByRound() {
            if (!this.selectedDrive || !this.selectedDrive.interviews) return {};
            
            let filteredInterviews = this.selectedDrive.interviews;
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase().trim();
                filteredInterviews = filteredInterviews.filter(i => {
                    const nameMatch = i.student?.name?.toLowerCase().includes(query);
                    const rollMatch = i.student?.roll_no?.toLowerCase().includes(query);
                    return nameMatch || rollMatch;
                });
            }

            const grouped = {};
            for (const interview of filteredInterviews) {
                const roundNo = parseInt(interview.round_no);
                if (!grouped[roundNo]) grouped[roundNo] = [];
                grouped[roundNo].push(interview);
            }
            return grouped;
        },
        awaitingSchedulingForActiveRound() {
            if (!this.selectedDrive || !this.selectedDrive.awaiting_scheduling) return [];
            const activeRound = this.selectedDrive.noRounds === 1 ? 1 : this.activeTab;
            let list = this.selectedDrive.awaiting_scheduling.filter(c => parseInt(c.round_no) === parseInt(activeRound));
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase().trim();
                list = list.filter(c => {
                    const nameMatch = c.student?.name?.toLowerCase().includes(query);
                    const rollMatch = c.student?.roll_no?.toLowerCase().includes(query);
                    return nameMatch || rollMatch;
                });
            }
            return list;
        }
    },
    methods: {
        formatDateTime,
        async fetchInterviews() {
            this.loading = true;
            try {
                const res = await fetch('/api/company_interviews', { headers: { 'Authentication-Token': localStorage.getItem('token') }});
                if (res.ok) {
                    this.drives = await res.json();
                    const driveIdFromQuery = this.$route.query.drive;
                    if (driveIdFromQuery && this.drives.some(d => d.DriveID == driveIdFromQuery)) {
                        this.selectedDriveId = parseInt(driveIdFromQuery);
                    }
                    else if (this.drives.length === 1) {
                        this.selectedDriveId = this.drives[0].DriveID;
                    }
                    const searchQueryFromQuery = this.$route.query.q;
                    if (searchQueryFromQuery) {
                        this.searchQuery = searchQueryFromQuery;
                    }
                } else { console.error("Failed to fetch interviews"); }
            } catch (err) { console.error("Error fetching interviews:", err); } 
            finally { this.loading = false; }
        },
        getRoundHeading(roundNumber) {
            if (roundNumber === 1) return "Open to all shortlisted students";
            return `Open only to students who passed Round ${roundNumber - 1}`;
        },
        getNextRoundName() {
            if (this.selectedApplicationForUpdate && this.selectedDrive && this.selectedDrive.InterviewRounds) {
                // round_no is 1-based, so using it as an index automatically points to the NEXT round
                const nextRoundIndex = parseInt(this.selectedApplicationForUpdate.round_no);
                return this.selectedDrive.InterviewRounds[nextRoundIndex] || `Round ${nextRoundIndex + 1}`;
            }
            return 'N/A';
        },
        handleInterviewAction(interview) {
            interview.round_no = parseInt(interview.round_no);
            if (this.selectedDrive.noRounds) {
                this.selectedDrive.noRounds = parseInt(this.selectedDrive.noRounds);
            }

            this.selectedApplicationForUpdate = interview;
            this.selectedApplicationForUpdate.is_only_schedule = false;
            this.scheduleNow = true; // default check to true

            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const defaultDateTime = `${yyyy}-${mm}-${dd}T11:00`;
            
            this.nextInterviewData = { 
                datetime: defaultDateTime, 
                location: '', 
                remarks: '', 
                student_facing_remarks: '' 
            };

            this.rejectionData = { reason: '', note: '' };
            this.updateStatusModal.show();
        },
        openScheduleOnlyModal(cand) {
            this.selectedApplicationForUpdate = {
                application_id: cand.application_id,
                student: cand.student,
                round_no: cand.round_no,
                is_only_schedule: true
            };
            this.scheduleNow = true;

            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const defaultDateTime = `${yyyy}-${mm}-${dd}T11:00`;
            
            this.nextInterviewData = { 
                datetime: defaultDateTime, 
                location: '', 
                remarks: '', 
                student_facing_remarks: '' 
            };

            this.updateStatusModal.show();
        },
        async passRoundOnly() {
            if (!this.selectedApplicationForUpdate || !this.selectedApplicationForUpdate.application_id) {
                return alert('Error: No application selected.');
            }
            try {
                const res = await fetch(`/api/view_application/${this.selectedApplicationForUpdate.application_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify({
                        action: 'complete_interview',
                        interview_result: 'passed',
                        remarks: this.nextInterviewData.remarks,
                        student_facing_remarks: this.nextInterviewData.student_facing_remarks
                    })
                });
                if (res.ok) {
                    alert('Interview round marked completed successfully.');
                    this.updateStatusModal.hide();
                    this.fetchInterviews();
                } else {
                    const err = await res.json();
                    alert(`Failed: ${err.message}`);
                }
            } catch (e) {
                console.error(e);
                alert("Error updating status.");
            }
        },
        openRejectionModal() {
            this.rejectionCategory = '';
            this.rejectionData = { reason: '', note: '' };
            this.updateStatusModal.hide();
            this.rejectionReasonModal.show();
        },
        openRescheduleModal(interview) {
            this.selectedApplicationForUpdate = interview;
            let formattedDt = '';
            if (interview.datetime) {
                formattedDt = interview.datetime.substring(0, 16);
            }
            this.rescheduleData = { 
                datetime: formattedDt, 
                location: interview.location_or_link || '', 
                reason: '' 
            };
            this.rescheduleModal.show();
        },
        async submitInterviewUpdate(action) {
            if (!this.rescheduleData.reason.trim()) return alert("Reason is mandatory.");
            if (action === 'reschedule' && !this.rescheduleData.datetime) return alert("New datetime is required to reschedule.");
            if (action === 'reschedule' && (!this.rescheduleData.location || !this.rescheduleData.location.trim())) {
                return alert("Location or meeting link is required to reschedule.");
            }
            if (action === 'reschedule' && new Date(this.rescheduleData.datetime) <= new Date()) {
                return alert("Rescheduled interview time must be in the future.");
            }
            
            const payload = { action: action, reason: this.rescheduleData.reason.trim() };
            if (action === 'reschedule') {
                payload.datetime = this.rescheduleData.datetime;
                payload.location = this.rescheduleData.location;
            }

            try {
                const res = await fetch(`/api/company_interviews/${this.selectedApplicationForUpdate.interview_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    this.rescheduleModal.hide();
                    this.fetchInterviews();
                } else { alert(`Failed to update interview: ${data.message}`); }
            } catch (err) {
                console.error(err); alert("An error occurred while updating the interview.");
            }
        },
        async confirmRejectApplication() {
            const finalReason = this.rejectionCategory === 'Other' || !this.rejectionCategory
                ? this.rejectionData.reason
                : this.rejectionCategory;

            if (!finalReason) return alert('Rejection reason is mandatory.');

            const res = await fetch(`/api/view_application/${this.selectedApplicationForUpdate.application_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ status: 'Rejected', rejection_reason: finalReason, note_for_student: this.rejectionData.note })
            });
            if (res.ok) {
                alert('Application has been rejected.');
                this.rejectionReasonModal.hide();
                this.fetchInterviews();
            } else {
                const err = await res.json();
                alert(`Failed to reject application: ${err.message}`);
            }
        },
        async closeRound(roundNo) {
            const confirmed = confirm(`Are you sure you want to close Round ${roundNo}? This will bulk-reject all candidates who have uncompleted interviews in this round.`);
            if (!confirmed) return;

            try {
                const res = await fetch(`/api/close_round/${this.selectedDriveId}/${roundNo}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': localStorage.getItem('token')
                    }
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message || 'Round closed successfully.');
                    this.fetchInterviews();
                } else {
                    alert(data.message || 'Failed to close round.');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while closing the round.');
            }
        },
        async scheduleNextRound(force = false) {
            if (!this.selectedApplicationForUpdate || !this.selectedApplicationForUpdate.application_id) {
                return alert('Error: No application selected.');
            }
            if (!this.nextInterviewData.datetime || !this.nextInterviewData.location) {
                return alert('Date, Time, and Location are required.');
            }
            if (new Date(this.nextInterviewData.datetime) <= new Date()) {
                return alert("Interview round time must be in the future.");
            }

            const formattedDateTime = this.nextInterviewData.datetime;

            try {
                const res = await fetch(`/api/view_application/${this.selectedApplicationForUpdate.application_id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify({
                        status: 'Interviewing',
                        datetime: formattedDateTime, 
                        location: this.nextInterviewData.location,
                        remarks: this.nextInterviewData.remarks,
                        student_facing_remarks: this.nextInterviewData.student_facing_remarks,
                        force_proceed: force // Pass the confirmation flag state down
                    })
                });

                if (res.ok) {
                    alert('Next interview round scheduled successfully.');
                    this.updateStatusModal.hide();
                    this.fetchInterviews();
                } 
                else if (res.status === 409) {
                    // CATCH COMPANY PARALLEL SLOT WARN
                    const data = await res.json();
                    if (data.requires_confirmation) {
                        if (confirm(`${data.warning_text}\n\nClick OK to confirm parallel slot allocation.`)) {
                            // Re-run the method instantly bypassing the block check!
                            this.scheduleNextRound(true); 
                        }
                    }
                } 
                else {
                    // CATCH TRUE STUDENT HARD BLOCKS (422 OR OTHER ERRORS)
                    const err = await res.json();
                    alert(`Scheduling Blocked: ${err.message}`);
                }
            } catch (e) {
                console.error("Networking tracking anomaly:", e);
            }
        },
        async selectCandidate() {
            if (!this.selectedApplicationForUpdate || !this.selectedApplicationForUpdate.application_id) {
                alert('Error: No application selected for marking as selected. Please try again.');
                return; // Prevent API call if application_id is missing
            }
            console.log("Marking candidate as selected for application ID:", this.selectedApplicationForUpdate.application_id);
            const res = await fetch(`/api/view_application/${this.selectedApplicationForUpdate.application_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ 
                    status: 'Selected',
                    remarks: this.nextInterviewData.remarks,
                    student_facing_remarks: this.nextInterviewData.student_facing_remarks
                })
            });
            if (res.ok) {
                alert('Candidate has been marked as selected! You can now send an offer from the Applications page.');
                this.updateStatusModal.hide();
                this.fetchInterviews();
            } else {
                const err = await res.json();
                alert(`Failed to select candidate: ${err.message}`);
            }
        },
        viewStudentProfile(userId, resume) {
            this.selectedStudentId = userId;
            this.selectedApplicationResume = resume;
            this.quickProfileModal.show();
        },
        getAwaitingPrevRoundRecord(cand) {
            if (!this.selectedDrive || !this.selectedDrive.interviews || parseInt(cand.round_no) <= 1) return null;
            const targetPrevRound = parseInt(cand.round_no) - 1;
            return this.selectedDrive.interviews.find(i =>
                parseInt(i.application_id) === parseInt(cand.application_id) &&
                parseInt(i.round_no) === targetPrevRound
            );
        },
        showAwaitingPreviousRemark(cand) {
            const priorRecord = this.getAwaitingPrevRoundRecord(cand);
            if (priorRecord) {
                this.remarkToShow = {
                    internal: priorRecord.remarks || "No confidential notes provided.",
                    student: priorRecord.student_facing_remarks || "No student logs generated."
                };
            }
        },
        getMinDateTime
    },
    watch: {
        selectedDriveId() { this.activeTab = 1; },
        '$route.query'(newQuery) {
            if (newQuery.drive) {
                this.selectedDriveId = parseInt(newQuery.drive);
            }
            if (newQuery.q !== undefined) {
                this.searchQuery = newQuery.q;
            }
        }
    },
    created() {
        this.fetchInterviews();
    },
    mounted() {
        this.updateStatusModal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
        this.rejectionReasonModal = new bootstrap.Modal(document.getElementById('rejectionReasonModal'));
        this.rescheduleModal = new bootstrap.Modal(document.getElementById('rescheduleModal'));

        this.quickProfileModal = new bootstrap.Modal(document.getElementById('quickProfileModal'));
        document.getElementById('quickProfileModal').addEventListener('hidden.bs.modal', () => {
            this.selectedStudentId = null;
        });

        // Inject styles dynamically to avoid Vue template compilation errors
        if (!document.getElementById('remark-overlay-styles')) {
            const style = document.createElement('style');
            style.id = 'remark-overlay-styles';
            style.innerHTML = `
            .remark-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1055; }
            .remark-box { width: 90%; max-width: 450px; }
            .clickable-row:hover { cursor: pointer; background-color: #f8f9fa; }
        `;
            document.head.appendChild(style);
        }
        console.log(this.completedInterviews)
    }
};

export default CompanyInterviews;
