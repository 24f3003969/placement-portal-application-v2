import { formatDateTime } from '../utils/formatDateTime.js';
import StudentProfile from '../components/student_profile.js';

const GettedApplications = {
    template: `
    <div>
        <div>
            <!-- Global Utilities Filtering Row -->
            <div class="row align-items-center g-3 p-3 bg-white border-bottom shadow-sm mb-3 rounded">
                <div class="col-md-12">
                    <div class="d-flex flex-wrap align-items-center gap-3">
                        <div class="dropdown">
                            <button class="btn btn-light border dropdown-toggle btn-sm fw-bold" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-funnel-fill me-1"></i> Filter Dashboard
                            </button>
                            <div class="dropdown-menu p-3 shadow" style="min-width: 290px;">
                                <div class="mb-2.5">
                                    <label class="form-label small fw-bold text-primary mb-1">Placement Drive</label>
                                    <select class="form-select form-select-sm" v-model="selectedDriveId" @change="fetchApplications" :disabled="driveLocked" style="max-height: 150px; overflow-y: auto;">
                                        <option value="">All Active Drives (Global Pool)</option>
                                        <option v-for="drive in placementDrivesList" :key="drive.DriveID" :value="drive.DriveID">
                                            (#{{drive.DriveID}}) {{ drive.JobTitle }} - {{ drive.CompanyName }}
                                        </option>
                                    </select>
                                </div>
                                <hr class="my-2.5 text-muted opacity-25">
                                <div class="mb-2.5">
                                    <label class="form-label small fw-semibold text-muted mb-1">Placement Type</label>
                                    <select class="form-select form-select-sm" v-model="selectedType">
                                        <option value="">All Types</option>
                                        <option value="Job">Job</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                </div>
                                <div class="mb-2.5">
                                    <label class="form-label small fw-semibold text-muted mb-1">Minimum CGPA Filter</label>
                                    <input type="number" step="0.1" class="form-control form-control-sm" v-model="minCGPA" placeholder="e.g. 7.5">
                                </div>
                                <div class="mb-2.5">
                                    <label class="form-label small fw-semibold text-muted mb-1">Skills Filter</label>
                                    <div class="d-flex flex-wrap gap-1 p-2 border rounded bg-light mb-1 align-items-center" style="min-height: 34px;">
                                        <span v-for="(skill, idx) in filterSkills" :key="idx" class="badge bg-primary text-white d-flex align-items-center gap-1 px-2 py-1 rounded-pill" style="font-size: 0.7rem;">
                                            {{ skill }}
                                            <i class="bi bi-x" style="cursor: pointer;" @click="removeFilterSkill(idx)"></i>
                                        </span>
                                        <input 
                                            type="text" 
                                            class="border-0 bg-transparent flex-grow-1 p-0 small" 
                                            placeholder="Type skill & press Enter..." 
                                            v-model="skillFilterInput" 
                                            @keydown.enter.prevent="addFilterSkill"
                                            @blur="addFilterSkill"
                                            style="outline: none; font-size: 0.8rem; min-width: 100px;"
                                        >
                                    </div>
                                    <div v-if="suggestedSkills.length > 0" class="mt-1.5" style="font-size: 0.75rem;">
                                        <span class="text-muted">Suggested: </span>
                                        <span v-for="(skill, index) in suggestedSkills" :key="skill">
                                            <span @click="toggleSuggestedSkill(skill)" class="text-primary fw-semibold" style="cursor: pointer; text-decoration: underline;">{{ skill }}</span><span v-if="index < suggestedSkills.length - 1" class="text-muted">, </span>
                                        </span>
                                    </div>
                                </div>
                                <div class="mb-1">
                                    <label class="form-label small fw-semibold text-muted mb-1">Availability Window</label>
                                    <select class="form-select form-select-sm" v-model="filterAvailability">
                                        <option value="all">All Candidates</option>
                                        <option value="immediate">Immediate Joiners Only</option>
                                        <option value="delayed">Delayed Availabilities</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Main Live Substring Query Search Engine -->
                        <div class="flex-grow-1">
                            <div class="input-group shadow-sm">
                                <input 
                                    type="text" 
                                    class="form-control border-0 py-2" 
                                    placeholder="Search by Student Name, Roll No, Job Title" 
                                    v-model="searchQuery"
                                    @input="debounceFetchApplications"
                                >
                                <button v-if="searchQuery" class="btn btn-light bg-white border-0 text-muted" @click="searchQuery = ''; fetchApplications()">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                                <button class="btn btn-primary px-4 fw-bold" @click="fetchApplications" style="background-color: #003366;">
                                    Search
                                </button>
                            </div>
                        </div>

                        <!-- Sorting Engine -->
                        <div class="d-flex align-items-center gap-2">
                            <label class="form-label small fw-bold mb-0 text-muted text-nowrap">Sort By:</label>
                            <select v-model="sortby" class="form-select form-select-sm w-auto shadow-sm border-0">
                                <option value="none">Default Ledger</option>
                                <option value="cgpa">CGPA (High to Low)</option>
                                <option value="apply_datetime">Application Time (Oldest First)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Active Filters Row (if any filter is applied) -->
                    <div v-if="hasActiveFilters" class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top w-100">
                        <span class="small fw-bold text-muted me-2">Active Filters:</span>
                        <span v-if="selectedDriveId" class="badge bg-light text-dark border px-2 py-1 small">
                            Drive: #{{selectedDriveId}}
                            <i class="bi bi-x ms-1 text-danger" style="cursor: pointer;" @click="selectedDriveId = ''; fetchApplications()"></i>
                        </span>
                        <span v-if="selectedType" class="badge bg-light text-dark border px-2 py-1 small">
                            Type: {{selectedType}}
                            <i class="bi bi-x ms-1 text-danger" style="cursor: pointer;" @click="selectedType = ''"></i>
                        </span>
                        <span v-if="minCGPA" class="badge bg-light text-dark border px-2 py-1 small">
                            CGPA &ge; {{minCGPA}}
                            <i class="bi bi-x ms-1 text-danger" style="cursor: pointer;" @click="minCGPA = null"></i>
                        </span>
                        <span v-if="filterAvailability !== 'all'" class="badge bg-light text-dark border px-2 py-1 small">
                            Availability: {{filterAvailability === 'immediate' ? 'Immediate' : 'Delayed'}}
                            <i class="bi bi-x ms-1 text-danger" style="cursor: pointer;" @click="filterAvailability = 'all'"></i>
                        </span>
                        <span v-for="(skill, index) in filterSkills" :key="index" class="badge bg-primary text-white px-2 py-1 small rounded-pill d-inline-flex align-items-center gap-1">
                            Skill: {{skill}}
                            <i class="bi bi-x" style="cursor: pointer;" @click="removeFilterSkill(index)"></i>
                        </span>
                        <button class="btn btn-link btn-sm text-danger p-0 ms-auto fw-bold text-decoration-none" @click="clearAllFilters">Clear All</button>
                    </div>
                </div>
            </div>

            <div class="row g-3">
                <!-- Main Operations Core Interface Layout Grid -->
                <div class="col-md-9 text-center" style="min-height: 500px;">
                    <div class="mt-2 d-flex flex-column">
                        <!-- 5 Master Category Channels Dynamic Navigation Pills -->
                        <ul class="nav nav-pills mb-2 justify-content-between bg-white p-1 border rounded shadow-sm flex-grow-1">
                            <li class="nav-item" v-for="(val, label) in cardMap" :key="label">
                                <button class="nav-link fw-bold px-3 py-1.5 transition-all"
                                        :class="{ 'active': activeStatus === label }"
                                        @click="activeStatus = label"
                                        style="border-radius: 6px; font-size: 0.85rem;">
                                    {{ label }} 
                                    <span class="badge ms-1" :class="activeStatus === label ? 'bg-white text-primary' : 'bg-secondary text-white'">
                                        {{ getTabCount(label) }}
                                    </span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <!-- TAB 1: SCREENING ROOM CONTAINER -->
                    <div v-if="activeStatus === 'Pending'" class="table-responsive table-scroll-md bg-white rounded border p-2 shadow-sm text-start">
                        <div v-if="groupedApplications.pendingApplications.length === 0">
                            <h5 class="fw-bold mb-0 text-center py-3 text-muted">No Incoming Profiles In Screening Roster</h5>
                        </div>
                        <div v-else>
                            <h5 class="fw-bold mb-2 text-dark border-bottom pb-1 small"><i class="bi bi-door-open me-2 text-primary"></i>Pending Review</h5>
                            <table class="table table-sm table-hover align-middle mb-0 small">
                                <thead class="table-light text-secondary">
                                    <tr>
                                        <th>Student Identity</th>
                                        <th>Target Campaign</th>
                                        <th>Pipeline Status</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="app in groupedApplications.pendingApplications" :key="app.id">
                                        <td>
                                            <!-- Profile Avatars + Badge directly right of name -->
                                            <div class="d-flex align-items-center gap-2">
                                                <img :src="app.student.profile_pic || '/static/images/default-avtar.png'" class="rounded-circle shadow-sm border" style="width:36px; height:36px; object-fit:cover; cursor: pointer;" @click="viewApplication(app.id)" title="View Student Profile">
                                                <div>
                                                    <div class="d-flex align-items-center gap-2 mb-0">
                                                        <span class="fw-bold text-dark mb-0" style="cursor: pointer;" @click="viewApplication(app.id)">{{ app.student.name }}</span>
                                                        <span v-if="app.available_immediately != false" class="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style="font-size: 0.65rem;">Immediate</span>
                                                        <span v-else class="d-inline-flex flex-wrap align-items-center gap-1">
                                                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5" style="font-size: 0.65rem;" :title="app.availability_remarks">Delayed</span>
                                                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5" style="font-size: 0.65rem;">(from {{formatDateTime(app.available_from, false)}})</span>
                                                        </span>
                                                    </div>
                                                    <small class="text-muted font-monospace">{{ app.student.roll_no }} | CGPA: <strong class="text-primary">{{app.student.cgpa}}</strong></small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong class="d-block text-dark">{{ app.drive.JobTitle }}</strong>
                                            <span class="small text-muted">Drive #{{app.drive.DriveID}}</span>
                                        </td>
                                        <td>
                                            <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-0.5"><i class="bi bi-hourglass-split me-1"></i>Pending Review</span>
                                            <small class="d-block text-muted mt-1" style="font-size: 0.7rem;">Applied: {{formatDateTime(app.application_date, false)}}</small>
                                        </td>
                                        <td class="text-center">
                                            <!-- Alerts empty for pending -->
                                            <button @click="shortlistApplication(app.id)" class="btn btn-success btn-sm px-2 py-0.5 mb-1 w-100 fw-bold shadow-sm" style="font-size: 0.75rem;"><i class="bi bi-check-circle me-1"></i> Shortlist</button>
                                            <button @click="openRejectionModalDirect(app)" class="btn btn-outline-danger btn-sm px-2 py-0.5 w-100 fw-bold" style="font-size: 0.75rem;"><i class="bi bi-x-circle me-1"></i> Reject</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB 2: ACTIVE EVALUATION GAUNTLET -->
                    <div v-if="activeStatus === 'Shortlisted'" class="table-responsive table-scroll-md bg-white rounded border p-2 shadow-sm text-start">
                        <div v-if="!groupedApplications.awaitingSchedule.length && !groupedApplications.interviewing.length">
                            <h5 class="fw-bold mb-0 text-center py-3 text-muted">No Candidates In Pipeline</h5>
                        </div>
                        <div v-else>
                            <h5 class="fw-bold mb-2 text-dark border-bottom pb-1 small"><i class="bi bi-cpu-fill me-2 text-primary"></i>Interview Pipeline</h5>
                            <table class="table table-sm table-hover align-middle mb-0 small">
                                <thead class="table-light text-secondary">
                                    <tr>
                                        <th>Student Identity</th>
                                        <th>Target Campaign</th>
                                        <th>Pipeline Status & Round</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="app in filteredShortlisted" :key="app.id" style="max-height: 120px; overflow-y: auto;">
                                        <td>
                                            <div class="d-flex align-items-center gap-2">
                                                <img :src="app.student.profile_pic || '/static/images/default-avtar.png'" class="rounded-circle shadow-sm border" style="width:36px; height:36px; object-fit:cover; cursor: pointer;" @click="viewApplication(app.id)" title="View Student Profile">
                                                <div>
                                                    <div class="d-flex align-items-center gap-2 mb-0">
                                                        <span class="fw-bold text-dark mb-0" style="cursor: pointer;" @click="viewApplication(app.id)">{{ app.student.name }}</span>
                                                        <span v-if="app.available_immediately != false" class="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style="font-size: 0.65rem;">Immediate</span>
                                                        <span v-else class="d-inline-flex flex-wrap align-items-center gap-1">
                                                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5" style="font-size: 0.65rem;" :title="app.availability_remarks">Delayed</span>
                                                            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5" style="font-size: 0.65rem;">(from {{formatDateTime(app.available_from,false)}})</span>
                                                        </span>
                                                    </div>
                                                    <small class="text-muted font-monospace">{{ app.student.roll_no }} | CGPA: <strong class="text-primary">{{app.student.cgpa}}</strong></small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong class="d-block text-dark">{{ app.drive.JobTitle }}</strong>
                                            <span class="small text-muted">Drive #{{app.drive.DriveID}}</span>
                                        </td>
                                        <td>
                                            <!-- Explicit Pipeline Status -->
                                            <div v-if="app.interview_datetime === 'N/A' || app.interview_datetime === 'Not Scheduled' || !app.interview_datetime">
                                                <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5">
                                                    <i class="bi bi-calendar-x me-1"></i>Awaiting Round {{ app.round_no || 1 }} Schedule
                                                </span>
                                            </div>
                                            <div v-else>
                                                <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-0.5 mb-1">
                                                    <i class="bi bi-calendar-check me-1"></i>Round {{ app.round_no || 1 }} Scheduled
                                                </span>
                                                <small class="d-block text-dark fw-bold font-monospace mt-1">{{ formatDateTime(app.interview_datetime) }}</small>
                                            </div>
                                        </td>
                                        <td class="text-center align-middle" style="width: 200px;">
                                            <!-- High Visibility Alert Badge -->
                                            <div v-if="app.interview_datetime && app.interview_datetime !== 'N/A' && isInterviewToday(app.interview_datetime)" class="text-danger small fw-bold mb-1 animate-pulse bg-danger-subtle rounded py-0.5 border border-danger-subtle">
                                                <i class="bi bi-alarm-fill me-1"></i>Interview Today!
                                            </div>
        
                                            <!-- Action Buttons -->
                                            <button v-if="app.interview_datetime === 'N/A' || !app.interview_datetime" @click="openScheduleModalDirect(app)" class="btn btn-primary btn-sm px-2 py-0.5 w-100 fw-bold shadow-sm mb-1" style="font-size: 0.75rem;"><i class="bi bi-calendar-event me-1"></i>Schedule Slot</button>
                                            <button v-else @click="manageInterviews(app.drive.DriveID, app.student.roll_no)" class="btn btn-dark btn-sm px-2 py-0.5 w-100 fw-bold shadow-sm mb-1" style="font-size: 0.75rem;"><i class="bi bi-camera-video me-1"></i>View Interview</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB 3: SELECTED CANDIDATES -->
                    <div v-if="activeStatus === 'Selected'" class="table-responsive table-scroll-md bg-white rounded border p-2 shadow-sm text-start">
                        <div v-if="groupedApplications.selectedCandidates.length === 0">
                            <h5 class="fw-bold mb-0 text-center py-3 text-muted">No Candidates Selected Yet</h5>
                        </div>
                        <div v-else>
                            <h5 class="fw-bold mb-2 text-dark border-bottom pb-1 small"><i class="bi bi-safe2-fill me-2 text-success"></i>Selected Candidates (Offer Desk)</h5>
                            <table class="table table-sm table-hover align-middle mb-0 small">
                                <thead class="table-light">
                                    <tr>
                                        <th>Student Identity</th>
                                        <th>Target Campaign</th>
                                        <th>Pipeline Status</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="app in groupedApplications.selectedCandidates" :key="app.id">
                                        <td>
                                            <div class="d-flex align-items-center gap-2">
                                                <img :src="app.student.profile_pic || '/static/images/default-avtar.png'" class="rounded-circle shadow-sm border" style="width:36px; height:36px; object-fit:cover; cursor: pointer;" @click="viewApplication(app.id)" title="View Student Profile">
                                                <div>
                                                    <div class="d-flex align-items-center gap-2 mb-0">
                                                        <span class="fw-bold text-dark mb-0" style="cursor: pointer;" @click="viewApplication(app.id)">{{ app.student.name }}</span>
                                                        <span v-if="app.student.available_immediately != false" class="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style="font-size: 0.65rem;">Immediate</span>
                                                        <span v-else class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5" style="font-size: 0.65rem;" :title="app.student.availability_remarks">Delayed</span>
                                                    </div>
                                                    <small class="text-muted font-monospace">{{ app.student.roll_no }}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong class="d-block text-dark">{{ app.drive.JobTitle }}</strong>
                                            <span class="small text-muted">Drive #{{app.drive.DriveID}}</span>
                                        </td>
                                        <td>
                                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5"><i class="bi bi-award me-1"></i>Selected (Offer Phase)</span>
                                            <small class="d-block text-muted mt-1" style="font-size: 0.7rem;">Selected on: {{ formatDateTime(app.selected_date || app.application_date, false) }}</small>
                                        </td>
                                        <td class="text-center align-middle" style="width: 200px;">
                                            <!-- High Visibility Alert Badge -->
                                            <div v-if="!app.offer_sent" class="text-warning-emphasis small fw-bold mb-1 animate-pulse bg-warning-subtle rounded py-0.5 border border-warning-subtle">
                                                <i class="bi bi-envelope-exclamation-fill me-1"></i>Offer waiting to send!
                                            </div>
                                            
                                            <!-- Action Buttons -->
                                            <button v-if="!app.offer_sent" @click="openSendOfferModal(app)" class="btn btn-success btn-sm px-2 py-0.5 w-100 fw-bold shadow-sm" style="font-size: 0.75rem;"><i class="bi bi-send-plus me-1"></i>Generate Offer</button>
                                            <div v-else>
                                                <a :href="'/' + app.offer_letter" target="_blank" class="btn btn-sm btn-outline-success px-2 py-0.5 w-100 fw-bold mb-1" style="font-size: 0.75rem;"><i class="bi bi-filetype-pdf me-1"></i> View Sent Letter</a>
                                                <button v-if="app.offer_status === 'Sent'" @click="openExtendOfferModal(app)" class="btn btn-sm btn-warning px-2 py-0.5 w-100 fw-bold mt-1 text-dark" style="font-size: 0.75rem;"><i class="bi bi-calendar-plus me-1"></i>Extend Deadline</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB 4: HIRED BOARD -->
                    <div v-if="activeStatus === 'Hired'" class="table-responsive table-scroll-md bg-white rounded border p-2 shadow-sm text-start">
                        <!-- Content logic identically structured with profile avatar gap layouts... -->
                        <div v-if="groupedApplications.hiredCandidates.length === 0">
                            <h5 class="fw-bold mb-0 text-center py-3 text-muted">No Candidates Hired Yet</h5>
                        </div>
                        <div v-else>
                            <h5 class="fw-bold mb-2 text-dark border-bottom pb-1 small"><i class="bi bi-trophy-fill me-2 text-warning"></i>Hired Board (Onboarding)</h5>
                            <table class="table table-sm table-hover align-middle mb-0 small">
                                <thead class="table-light">
                                    <tr>
                                        <th>Student Identity</th>
                                        <th>Target Campaign</th>
                                        <th>Pipeline Status</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="app in groupedApplications.hiredCandidates" :key="app.id">
                                        <td>
                                            <div class="d-flex align-items-center gap-2">
                                                <img :src="app.student.profile_pic || '/static/images/default-avtar.png'" class="rounded-circle shadow-sm border" style="width:36px; height:36px; object-fit:cover; cursor: pointer;" @click="viewApplication(app.id)">
                                                <div>
                                                    <span class="fw-bold text-dark d-block mb-0" style="cursor: pointer;" @click="viewApplication(app.id)">{{ app.student.name }}</span>
                                                    <small class="text-muted font-monospace">{{ app.student.roll_no }}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td><strong>{{ app.drive.JobTitle }}</strong></td>
                                        <td>
                                            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5"><i class="bi bi-emoji-smile-fill me-1"></i>Hired</span>
                                            <small class="d-block text-muted mt-1" style="font-size: 0.7rem;">Joining: {{ formatDateTime(app.joining_date, false) }}</small>
                                        </td>
                                        <td class="text-center">
                                            <a v-if="app.offer_letter" :href="'/' + app.offer_letter" target="_blank" class="btn btn-outline-dark btn-sm py-0.5 fw-bold" style="font-size: 0.75rem;"><i class="bi bi-file-earmark-lock-fill text-danger me-1"></i> Vault PDF</a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB 5: REJECTED POOL -->
                    <div v-if="activeStatus === 'Rejected'" class="table-responsive table-scroll-md bg-white rounded border p-2 shadow-sm text-start">
                        <div v-if="groupedApplications.rejectedApplications.length === 0">
                            <h5 class="fw-bold mb-0 text-center py-3 text-muted">No Rejected Candidates</h5>
                        </div>
                        <div v-else>
                            <h5 class="fw-bold mb-2 text-dark border-bottom pb-1 small"><i class="bi bi-archive-fill me-2 text-danger"></i>Rejected Candidates Archive</h5>
                            <table class="table table-sm table-hover align-middle mb-0 small">
                                <thead class="table-light">
                                    <tr>
                                        <th>Student Identity</th>
                                        <th>Pipeline Status</th>
                                        <th style="width: 40%;">Rejection Reason</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="app in groupedApplications.rejectedApplications" :key="app.id">
                                        <td>
                                            <div class="d-flex align-items-center gap-2">
                                                <img :src="app.student.profile_pic || '/static/images/default-avtar.png'" class="rounded-circle shadow-sm border" style="width:36px; height:36px; object-fit:cover; cursor: pointer;" @click="viewApplication(app.id)">
                                                <div>
                                                    <span class="fw-bold text-dark d-block mb-0" style="cursor: pointer;" @click="viewApplication(app.id)">{{ app.student.name }}</span>
                                                    <small class="text-muted font-monospace">{{ app.student.roll_no }}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5"><i class="bi bi-x-octagon me-1"></i>Rejected</span></td>
                                        <td><div class="p-1 bg-light border rounded small">{{ app.rejection_reason || 'No failure log reason entered.' }}</div></td>
                                        <td class="text-center">
                                            <button @click="openRestoreAuditOverrideModal(app)" class="btn btn-outline-warning text-dark btn-sm py-0.5 fw-bold" style="font-size: 0.75rem;"><i class="bi bi-arrow-counterclockwise me-1"></i> Restore</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Live Metrics Sidebar Analytics Columns Panel -->
                <div class="col-md-3">
                    <div class="vstack gap-3 mt-1">
                        <div v-for="(val, label) in cardStats" :key="label" class="card shadow-sm border-0 border-start border-4" :class="getSidebarBorderClass(val)">
                            <div class="card-body p-3">
                                <h6 class="text-muted mb-1 small fw-bold text-uppercase tracking-wider">{{ label }}</h6>
                                <h2 class="mb-0 fw-bold font-monospace text-dark">{{ getStatCountValue(val) }}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODALS (Application Details, Reject, Offer, Restore) -->
        <!-- EXTENDED APPLICATION PROFILE SPECIFICATION DETAILS MODAL -->
        <div class="modal fade" id="applicationDetailModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" v-if="selectedApplication">
                    <div class="modal-header border-0 bg-light p-3">
                        <h5 class="modal-title fw-bold text-dark"><i class="bi bi-person-badge-fill me-2 text-primary"></i>Student Profile</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <student-profile :user-id="selectedApplication.student?.user_id || selectedApplication.student_id" :is-admin-view="true" :application-resume="selectedApplication.resume"></student-profile>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button class="btn btn-secondary px-4 btn-sm" data-bs-dismiss="modal">Close Workspace</button>
                        
                        <template v-if="selectedApplication.status === 'Pending'">
                            <button class="btn btn-danger px-4 btn-sm fw-bold" @click="openRejectionModalFromDetails">Reject Roster Placement</button>
                            <button class="btn btn-success px-4 btn-sm fw-bold" @click="shortlistApplication(selectedApplication.id)">Shortlist Candidate</button>
                        </template>

                        <template v-else-if="(selectedApplication.status === 'Shortlisted' || selectedApplication.status === 'Interview') && selectedApplication.interview_datetime === 'N/A'">
                            <button class="btn btn-danger px-4 btn-sm fw-bold" @click="openRejectionModalFromDetails">Reject Candidate From Pipeline</button>
                            <button class="btn btn-success px-4 btn-sm fw-bold" @click="openScheduleSection"><i class="bi bi-calendar-check me-1"></i>Schedule Interview Round</button>
                        </template>

                        <div v-if="showSchedule" class="w-100 border-top mt-3 pt-3 text-start">
                            <h5 class="fw-bold text-dark mb-3"><i class="bi bi-clock me-2 text-primary"></i>Configure Interview Slot</h5>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Interview Timestamp Allocation</label>
                                    <input type="datetime-local" v-model="interview.datetime" class="form-control form-control-sm">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Location Vector (or Virtual Link URL)</label>
                                    <input type="text" v-model="interview.location" class="form-control form-control-sm" placeholder="e.g. Google Meet URL or Room B Floor">
                                </div>
                            </div>
                            <div class="d-flex justify-content-end gap-2 mt-3">
                                <button class="btn btn-light border btn-sm" @click="showSchedule = false">Cancel Slot Config</button>
                                <button class="btn btn-success btn-sm px-4 fw-bold shadow-sm" @click="scheduleInterview">Commit Slot Verification Schedule</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Other standard modals (Reject, Send Offer, Restore Audit) preserved internally as coded in previous response exactly -> omitting large HTML blocks solely for character brevity but they remain identical -->
        <!-- REJECTION INPUT MODAL -->
        <div class="modal fade" id="rejectionReasonModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-danger text-white border-0">
                        <h5 class="modal-title fw-bold"><i class="bi bi-slash-circle me-2"></i>Terminate Roster Operations</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-3 text-start">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">Mandatory Rejection Reason</label>
                            <textarea v-model="rejectionData.reason" class="form-control font-monospace" rows="3" placeholder="e.g. Failed to cross technical evaluation..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Dismiss</button>
                        <button type="button" class="btn btn-danger btn-sm px-3 fw-bold" @click="confirmRejectApplication" :disabled="!rejectionData.reason.trim()">Commit Eviction Drop</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- CONTRACT COMPILATION MODAL -->
        <div class="modal fade" id="sendOfferModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-success text-white border-0">
                        <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-post me-2"></i>Configure Contract</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-3 text-start" v-if="selectedApplicationForUpdate">
                        <div class="alert alert-light p-2 small border mb-3">Compiling legal employment contract assignment targeting: <strong class="text-success">{{ selectedApplicationForUpdate.student?.name }}</strong></div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold small">Offer Acceptance System Expiry Date</label>
                                <input type="date" v-model="offerData.expiry_date" class="form-control form-control-sm" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold small">Anticipated Onboarding Joining Date</label>
                                <input type="date" v-model="offerData.joining_date" class="form-control form-control-sm" required>
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-bold small">Optional Offer Message / Notes</label>
                                <textarea v-model="offerData.message" class="form-control font-monospace" rows="3" placeholder="Additional notes to include in the offer letter..."></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Abort Config</button>
                        <button type="button" class="btn btn-success btn-sm px-3 fw-bold shadow-sm" @click="sendOffer" :disabled="!offerData.expiry_date || !offerData.joining_date || offerGenerationLoading">
                            <span v-if="offerGenerationLoading" class="spinner-border spinner-border-sm me-1" role="status"></span>
                            {{ offerGenerationLoading ? 'Executing Task...' : 'Generate & Dispatch Offer' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- OVERRIDE MODAL -->
        <div class="modal fade" id="restoreAuditOverrideModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-warning text-dark border-0">
                        <h5 class="modal-title fw-bold"><i class="bi bi-shield-exclamation me-2"></i>Override Compliance Pipeline</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-3 text-start" v-if="selectedApplicationForUpdate">
                        <p class="small text-muted">You are leveraging administrative bypass overrides to restore <strong class="text-dark">{{ selectedApplicationForUpdate.student?.name }}</strong>.</p>
                        <div class="mb-1">
                            <label class="form-label fw-bold small text-dark">Audit Justification Statement (Mandatory)</label>
                            <textarea v-model="restoreAuditReason" class="form-control font-monospace" rows="3" placeholder="Reason for pipeline override restoration..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Abort Bypass</button>
                        <button type="button" class="btn btn-warning text-dark btn-sm px-3 fw-bold shadow-sm" @click="confirmRestoreApplicationPipeline" :disabled="!restoreAuditReason.trim()">Execute Restore</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXTEND OFFER EXPIRY DATE MODAL -->
        <div class="modal fade" id="extendOfferModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-warning text-dark border-0">
                        <h5 class="modal-title fw-bold"><i class="bi bi-calendar-plus me-2"></i>Extend Offer Deadline</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-3 text-start" v-if="selectedApplicationForOffer">
                        <p class="small text-muted">Extend the response deadline for <strong class="text-dark">{{ selectedApplicationForOffer.student?.name }}</strong>.</p>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-dark">Current Expiry Date</label>
                            <input type="text" class="form-control bg-light" :value="formatDateTime(selectedApplicationForOffer.offer_expiry_date, false)" readonly>
                        </div>
                        <div class="mb-1">
                            <label class="form-label fw-bold small text-dark">New Expiry Date (Mandatory)</label>
                            <input type="date" v-model="extendOfferData.new_expiry_date" class="form-control" :min="getMinExtendExpiryDate()">
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-warning text-dark btn-sm px-3 fw-bold shadow-sm" @click="submitExtendOffer" :disabled="!extendOfferData.new_expiry_date || extendOfferLoading">
                            <span v-if="extendOfferLoading" class="spinner-border spinner-border-sm me-1"></span>
                            Extend Deadline
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: { StudentProfile },
    data() {
        return {
            stats: {},
            allApplications: [],
            placementDrivesList: [], 
            selectedDriveId: '',     
            driveLocked: false,      
            activeStatus: 'Pending', 
            sortby: 'none',
            selectedApplication: null,
            selectedApplicationForUpdate: null,
            selectedType: '',
            minCGPA: null,
            searchQuery: '',
            filterAvailability: 'all', 
            restoreAuditReason: '',    
            interview: { datetime: '', location: '' },
            rejectionData: { reason: '', note: '' },
            offerData: { expiry_date: '', joining_date: '', message: '' },
            offerGenerationLoading: false,
            showSchedule: false,
            selectedApplicationForOffer: null,
            extendOfferModal: null,
            extendOfferData: { new_expiry_date: '' },
            extendOfferLoading: false,
            cardMap: {
                'Pending': 'pending_applications',
                'Shortlisted': 'shortlisted',
                'Selected': 'selected',
                'Hired': 'hired',
                'Rejected': 'rejected'
            },
            cardStats: {
                'Total Pipeline Pool': 'total_applications',
                'Screening Room Actions': 'pending_applications',
                'Active Loop Evaluations': 'scheduled_interviews'
            },
            applicationDetailModal: null,
            rejectionReasonModal: null,
            sendOfferModal: null,
            restoreAuditOverrideModal: null, 
            searchTimeout: null,
            shortlistedFilter: 'all', 
            filterSkills: [],
            skillFilterInput: '',
        }
    },
    computed: {
        hasActiveFilters() {
            return this.selectedDriveId || this.selectedType || this.minCGPA || this.filterAvailability !== 'all' || this.filterSkills.length > 0;
        },
        filteredApplications() {
            let applications = [...this.allApplications];

            if (this.selectedDriveId) {
                applications = applications.filter(app => app.drive && app.drive.DriveID == this.selectedDriveId);
            }
            if (this.selectedType) {
                applications = applications.filter(app => app.drive && app.drive.Type === this.selectedType);
            }
            if (this.minCGPA) {
                applications = applications.filter(app => app.student && app.student.cgpa >= parseFloat(this.minCGPA));
            }
            if (this.filterAvailability === 'immediate') {
                applications = applications.filter(app => app.student && app.available_immediately != false);
            } else if (this.filterAvailability === 'delayed') {
                applications = applications.filter(app => app.student && app.available_immediately == false);
            }
            if (this.filterSkills && this.filterSkills.length > 0) {
                applications = applications.filter(app => {
                    const rawSkills = app.stud_skills || app.student?.skills || '';
                    const studentSkills = Array.isArray(rawSkills) 
                        ? rawSkills.join(', ').toLowerCase() 
                        : rawSkills.toLowerCase();
                    
                    return this.filterSkills.every(skill => 
                        studentSkills.includes(skill.toLowerCase().trim())
                    );
                });
            }
            if (this.searchQuery.trim()) {
                const query = this.searchQuery.toLowerCase().trim();
                
                applications = applications.filter(app => {
                    const nameMatch = app.student?.name?.toLowerCase().includes(query);
                    const rollMatch = app.student?.roll_no?.toLowerCase().includes(query);
                    const titleMatch = app.drive?.JobTitle?.toLowerCase().includes(query);
                    
                    return nameMatch || rollMatch || titleMatch;
                });
            }
            if (this.sortby === 'cgpa') {
                applications.sort((a, b) => (b.student?.cgpa || 0) - (a.student?.cgpa || 0));
            } else if (this.sortby === 'apply_datetime') {
                applications.sort((a, b) => new Date(a.application_date) - new Date(b.application_date));
            }

            return applications;
        },
        groupedApplications() {
            const groups = {
                pendingApplications: [],
                awaitingSchedule: [],
                interviewing: [],
                selectedCandidates: [],
                hiredCandidates: [],
                rejectedApplications: []
            };

            for (const app of this.filteredApplications) {
                    if (app.rejection_reason) {
                        groups.rejectedApplications.push(app);
                        continue;
                    }

                    switch (app.status) {
                        case 'Applied':
                        case 'Pending':
                            groups.pendingApplications.push(app);
                            break;
                        case 'Shortlisted':
                        case 'Interview': 
                            if (app.interview_datetime === 'N/A' || !app.interview_datetime) {
                                groups.awaitingSchedule.push(app);
                            } else {
                                groups.interviewing.push(app);
                            }
                            break;
                        case 'Selected':
                            groups.selectedCandidates.push(app);
                            break;
                        case 'Hired':
                            groups.hiredCandidates.push(app);
                            break;
                        // 'Rejected' case is now handled by rejection_reason
                    }
                }
            return groups;
        },
        filteredShortlisted() {
            const allShortlisted = [
                ...this.groupedApplications.awaitingSchedule, 
                ...this.groupedApplications.interviewing
            ].sort((a, b) => new Date(b.application_date) - new Date(a.application_date));
    
            if (this.shortlistedFilter === 'awaiting') {
                return this.groupedApplications.awaitingSchedule;
            }
            if (this.shortlistedFilter === 'interviewing') {
                return this.groupedApplications.interviewing;
            }
            return allShortlisted;
        },
        suggestedSkills() {
            const skillsCount = {};
            this.allApplications.forEach(app => {
                const rawSkills = app.stud_skills || app.student?.skills;
                const parseSkill = (s) => {
                    if (s) {
                        const trimmed = s.trim();
                        if (trimmed) {
                            const normalized = trimmed.toLowerCase();
                            const displayName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                            skillsCount[displayName] = (skillsCount[displayName] || 0) + 1;
                        }
                    }
                };
                if (Array.isArray(rawSkills)) {
                    rawSkills.forEach(parseSkill);
                } else if (typeof rawSkills === 'string' && rawSkills) {
                    rawSkills.split(',').forEach(parseSkill);
                }
            });

            return Object.entries(skillsCount)
                .filter(([skill]) => !this.filterSkills.some(fs => fs.toLowerCase() === skill.toLowerCase()))
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([skill]) => skill);
        }
    },
    methods: {
        formatDateTime,
        addFilterSkill() {
            const skill = this.skillFilterInput.trim();
            if (skill && !this.filterSkills.includes(skill)) {
                this.filterSkills.push(skill);
            }
            this.skillFilterInput = '';
        },
        removeFilterSkill(index) {
            this.filterSkills.splice(index, 1);
        },
        toggleSuggestedSkill(skill) {
            if (skill && !this.filterSkills.includes(skill)) {
                this.filterSkills.push(skill);
            }
        },
        clearAllFilters() {
            this.selectedDriveId = '';
            this.selectedType = '';
            this.minCGPA = null;
            this.filterAvailability = 'all';
            this.filterSkills = [];
            this.fetchApplications();
        },
        
        // This validates if the active interview date in the pipeline actually takes place TODAY
        isInterviewToday(datetimeStr) {
            if (!datetimeStr || datetimeStr === 'N/A') return false;
            const interviewDate = new Date(datetimeStr);
            const today = new Date();
            return interviewDate.getDate() === today.getDate() &&
                   interviewDate.getMonth() === today.getMonth() &&
                   interviewDate.getFullYear() === today.getFullYear();
        },
        
        getTabCount(label) {
            if (label === 'Pending') return this.groupedApplications.pendingApplications.length;
            if (label === 'Shortlisted') return this.groupedApplications.awaitingSchedule.length + this.groupedApplications.interviewing.length;
            if (label === 'Selected') return this.groupedApplications.selectedCandidates.length;
            if (label === 'Hired') return this.groupedApplications.hiredCandidates.length;
            if (label === 'Rejected') return this.groupedApplications.rejectedApplications.length;
            return 0;
        },
        getStatCountValue(val) {
            if (val === 'total_applications') return this.allApplications.length;
            if (val === 'pending_applications') return this.allApplications.filter(a => a.status === 'Applied' || a.status === 'Pending').length;
            if (val === 'scheduled_interviews') return this.allApplications.filter(a => (a.status === 'Shortlisted' || a.status === 'Interview') && a.interview_datetime !== 'N/A' && a.interview_datetime).length;
            if (val === 'rejected') return this.allApplications.filter(a => a.status === 'Rejected').length;
            return this.stats[val] || 0;
        },
        getSidebarBorderClass(val) {
            if (val === 'total_applications') return 'border-primary';
            if (val === 'pending_applications') return 'border-warning';
            return 'border-info';
        },
        openScheduleSection() {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            this.interview.datetime = `${yyyy}-${mm}-${dd}T11:00`;
            this.showSchedule = true;
        },
        async fetchPlacementDrivesDropdownList() {
            try {
                const res = await fetch('/api/placement_drives', {
                    headers: {'Authentication-Token': localStorage.getItem('token')}
                });
                if (res.ok) {
                    this.placementDrivesList = await res.json();
                }
            } catch (e) {
                console.error("Error generating drive links", e);
            }
        },
        async fetchApplications() {
            const params = new URLSearchParams();
            if (this.selectedDriveId) params.append('drive_id', this.selectedDriveId);
            if (this.selectedType) params.append('type', this.selectedType);
            if (this.minCGPA) params.append('cgpa', this.minCGPA);
            if (this.searchQuery) params.append('q', this.searchQuery);

            const res = await fetch(`/api/company_applications?${params.toString()}`, {
                headers: {'Authentication-Token': localStorage.getItem('token')}
            });
            if (res.ok) {
                const data = await res.json();
                this.stats = data.stats || {};
                this.allApplications = data.applications || [];
            }
        },
        async shortlistApplication(appId) {
            if (confirm('Are you sure you want to transition this candidate into the active interview pipeline?')) {
                const res = await fetch(`/api/view_application/${appId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify({ status: 'Shortlisted' })
                });
                if (res.ok) {
                    if(this.applicationDetailModal) this.applicationDetailModal.hide(); 
                    this.fetchApplications(); 
                }
            }
        },
        debounceFetchApplications() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => { this.fetchApplications(); }, 300);
        },
        async viewApplication(app_id){
            const appFromList = this.allApplications.find(app => app.id === app_id);
            try {
                const res = await fetch(`/api/view_application/${app_id}`,{
                    headers:{'Authentication-Token':localStorage.getItem('token')}
                });
                if(res.ok){
                    const basicAppInfo = await res.json();
                    this.selectedApplication = { ...appFromList, ...basicAppInfo };
                    this.applicationDetailModal.show();
                } else {
                    const err = await res.json();
                    console.warn(err.message);
                    this.selectedApplication = { ...appFromList };
                    this.applicationDetailModal.show();
                }
            } catch (err) {
                console.error(err);
                this.selectedApplication = { ...appFromList };
                this.applicationDetailModal.show();
            }
        },
        openScheduleModalDirect(app) {
            this.selectedApplication = app;
            this.openScheduleSection();
            this.applicationDetailModal.show();
            
            fetch(`/api/view_application/${app.id}`,{
                headers:{'Authentication-Token':localStorage.getItem('token')}
            }).then(res => {
                if(res.ok) {
                    res.json().then(data => {
                        this.selectedApplication = { ...app, ...data };
                    });
                }
            }).catch(err => console.error(err));
        },
        async scheduleInterview(){
            const targetAppId = this.selectedApplication.application_id || this.selectedApplication.id;
            if (!targetAppId) return;

            try {
                const res = await fetch(`/api/view_application/${targetAppId}`,{
                    method:'POST',
                    headers:{
                        'Content-Type':'application/json',
                        'Authentication-Token':localStorage.getItem('token')
                    },
                    body:JSON.stringify({
                        status:'Shortlisted',
                        datetime: this.interview.datetime,
                        location: this.interview.location
                    })
                });
                if(res.ok){
                    this.showSchedule = false;
                    this.applicationDetailModal.hide();
                    this.fetchApplications();
                } else {
                    const error = await res.json();
                    alert(error.message || "Failed to schedule interview.");
                }
            } catch (err) {
                console.error(err);
                alert("An error occurred while scheduling the interview.");
            }
        },
        openRejectionModalDirect(app) {
            this.selectedApplicationForUpdate = app;
            this.rejectionData = { reason: '', note: '' };
            this.rejectionReasonModal.show();
        },
        openRejectionModalFromDetails() {
            if (!this.selectedApplication) return;
            this.selectedApplicationForUpdate = this.selectedApplication;
            this.rejectionData = { reason: '', note: '' };
            this.applicationDetailModal.hide();
            this.rejectionReasonModal.show();
        },
        async confirmRejectApplication() {
            if (!this.selectedApplicationForUpdate || !this.rejectionData.reason.trim()) {
                alert('A clear audit trail rejection reason is mandatory.');
                return;
            }
            const res = await fetch(`/api/view_application/${this.selectedApplicationForUpdate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    status: 'Rejected',
                    rejection_reason: this.rejectionData.reason,
                    note_for_student: this.rejectionData.note
                })
            });

            if (res.ok) {
                this.rejectionReasonModal.hide();
                this.fetchApplications(); 
            }
        },
        openSendOfferModal(app) {
            this.selectedApplicationForUpdate = app;
            this.offerData = { expiry_date: '', joining_date: '', message: '' };
            this.sendOfferModal.show();
        },
        async sendOffer() {
            if (!this.offerData.joining_date || !this.offerData.expiry_date) return;
            if (new Date(this.offerData.expiry_date) <= new Date()) {
                alert('Offer expiry date must be set to a future date.');
                return;
            }
            if (new Date(this.offerData.joining_date) <= new Date()) {
                alert('Joining date must be set to a future date.');
                return;
            }
            this.offerGenerationLoading = true;
            try {
                const res = await fetch(`/api/application/${this.selectedApplicationForUpdate.id}/send_offer`, {
                    method: 'POST',
                    headers: { 
                        'Authentication-Token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        offer_expiry_date: this.offerData.expiry_date,
                        joining_date: this.offerData.joining_date,
                        message: this.offerData.message
                    })
                });
                if (res.status === 202) {
                    const data = await res.json();
                    this.sendOfferModal.hide();
                    this.pollTaskStatus(data.task_id);
                } else {
                    this.offerGenerationLoading = false;
                }
            } catch (e) {
                this.offerGenerationLoading = false;
            }
        },
        pollTaskStatus(taskId) {
            const poll = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/task_status/${taskId}`, {
                        headers: { 'Authentication-Token': localStorage.getItem('token') }
                    });
                    if (!statusRes.ok) { clearInterval(poll); this.offerGenerationLoading = false; return; }
                    const statusData = await statusRes.json();
                    if (statusData.state === 'SUCCESS') {
                        clearInterval(poll); this.offerGenerationLoading = false; alert('Offer dispatched successfully!'); this.fetchApplications();
                    } else if (statusData.state === 'FAILURE') {
                        clearInterval(poll); this.offerGenerationLoading = false;
                    }
                } catch (error) { clearInterval(poll); this.offerGenerationLoading = false; }
            }, 3000); 
        },
        runStrictSelectAuditGuard(app) {
            if (app.interview_datetime === 'N/A' || !app.interview_datetime) {
                alert(`[CRITICAL SECURITY WARNING]: You are advancing a candidate profile who has not passed live interviewing round steps.`);
                return;
            }
            this.openSendOfferModal(app);
        },
        openRestoreAuditOverrideModal(app) {
            this.selectedApplicationForUpdate = app;
            this.restoreAuditReason = '';
            this.restoreAuditOverrideModal.show();
        },
        async confirmRestoreApplicationPipeline() {
            if (!this.restoreAuditReason.trim()) return;
            const res = await fetch(`/api/view_application/${this.selectedApplicationForUpdate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    rejection_reason: null,
                    note_for_student: `[RESTORED] Operational Audit: ${this.restoreAuditReason}`
                })
            });
            if (res.ok) {
                this.restoreAuditOverrideModal.hide();
                this.fetchApplications();
            }
        },
        manageInterviews(driveId, rollNo) {
            let query = { drive: driveId };
            if (rollNo) {
                query.q = rollNo;
            }
            this.$router.push({ path: '/company_interviews', query: query });
        },
        openExtendOfferModal(app) {
            this.selectedApplicationForOffer = app;
            this.extendOfferData = { new_expiry_date: '' };
            this.extendOfferModal.show();
        },
        getMinExtendExpiryDate() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        },
        async submitExtendOffer() {
            if (!this.extendOfferData.new_expiry_date) return;
            const chosenDate = new Date(this.extendOfferData.new_expiry_date);
            const today = new Date();
            today.setHours(0,0,0,0);
            chosenDate.setHours(0,0,0,0);
            
            if (chosenDate <= today) {
                alert('The extended expiry date must be in the future.');
                return;
            }
            
            this.extendOfferLoading = true;
            try {
                const res = await fetch(`/api/application/${this.selectedApplicationForOffer.id}/extend_offer`, {
                    method: 'PUT',
                    headers: {
                        'Authentication-Token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        new_expiry_date: this.extendOfferData.new_expiry_date
                    })
                });
                
                const data = await res.json();
                if (res.ok) {
                    alert(data.message || 'Offer expiry date extended successfully.');
                    this.extendOfferModal.hide();
                    this.fetchApplications();
                } else {
                    alert(data.message || 'Failed to extend offer expiry date.');
                }
            } catch (e) {
                console.error(e);
                alert('An error occurred while extending the offer deadline.');
            } finally {
                this.extendOfferLoading = false;
            }
        }
    },
    watch: {
        selectedType() { this.fetchApplications(); },
        minCGPA() { this.fetchApplications(); },
        filterAvailability() { this.fetchApplications(); }
    },
    mounted() {
        this.fetchPlacementDrivesDropdownList();
        if (this.$route.query.drive_id || this.$route.query.drive) {
            this.selectedDriveId = this.$route.query.drive_id || this.$route.query.drive;
            this.driveLocked = true;
        }
        if (this.$route.query.q) this.searchQuery = this.$route.query.q;
        if (this.$route.query.status) this.activeStatus = this.$route.query.status;
        
        this.fetchApplications();

        this.applicationDetailModal = new bootstrap.Modal(document.getElementById('applicationDetailModal'));
        this.rejectionReasonModal = new bootstrap.Modal(document.getElementById('rejectionReasonModal'));
        this.sendOfferModal = new bootstrap.Modal(document.getElementById('sendOfferModal'));
        this.restoreAuditOverrideModal = new bootstrap.Modal(document.getElementById('restoreAuditOverrideModal'));
        this.extendOfferModal = new bootstrap.Modal(document.getElementById('extendOfferModal'));

        document.getElementById('applicationDetailModal').addEventListener('hidden.bs.modal', () => {
            this.selectedApplication = null;
            this.showSchedule = false;
            this.interview = { datetime: '', location: '' };
        });

        document.getElementById('extendOfferModal').addEventListener('hidden.bs.modal', () => {
            this.selectedApplicationForOffer = null;
            this.extendOfferData = { new_expiry_date: '' };
        });
    }
}

export default GettedApplications;