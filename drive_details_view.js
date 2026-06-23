import { formatDateTime, getMinDate } from '../utils/formatDateTime.js';
const DriveDetailView = {
    props: ['drive', 'mode'],
    template:`
    <div class="card shadow-sm border-0 p-3 p-md-4 rounded-4 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <button @click="$emit('back')" class="btn btn-link text-decoration-none mb-2 px-0 fw-bold py-0"><i class="bi bi-arrow-left me-2"></i>Back</button>
        <div v-if="mode==='company'" class="alert alert-info py-1.5 small mb-3"><i class="bi bi-info-circle me-2"></i>Review how this will look to students and Admin.</div>
        
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start border-bottom pb-2 mb-3 gap-2">
            <div>
                <h4 class="fw-bold mb-1 text-dark">{{ drive.JobTitle }}</h4>
                <p class="text-muted mb-0 small"><i class="bi bi-geo-alt-fill text-danger me-1"></i>{{ drive.Location }} ({{ drive.WorkMode }}) <span class="mx-2 text-light">|</span> <i class="bi bi-briefcase-fill text-primary me-1"></i>{{ drive.Type }}</p>
            </div>
            <div class="text-md-end bg-light p-3 rounded-4 border">
                <h5 class="fw-bold text-success mb-1">₹{{ drive.Salary }} {{ drive.Type === 'Job' ? 'LPA' : '/month' }}</h5>
                <p class="small text-muted mb-0 fw-medium" style="font-size: 0.75rem;"><i class="bi bi-clock-history me-1"></i>Deadline: {{ formatDateTime(drive.ApplyDeadline, false) }}</p>
            </div>
        </div>
            
        <div class="row g-3">
            <div class="col-md-3">
                <h6 class="fw-bold mb-1.5 text-uppercase text-muted" style="font-size: 0.75rem;"><i class="bi bi-gear-fill me-1 text-primary"></i>Skills Needed</h6>
                <div class="d-flex flex-wrap gap-1" v-if="drive.RequiredSkills && drive.RequiredSkills.length > 0">
                    <span v-for="skill in drive.RequiredSkills" :key="skill" class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 shadow-xs" style="font-size: 0.7rem;">{{ skill }}</span>
                </div>
                <div v-else>
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 shadow-xs fw-medium" style="font-size: 0.7rem;">No specific skills required.</span>
                </div>
            </div>
            <div class="col-md-3">
                <h6 class="fw-bold mb-1.5 text-uppercase text-muted" style="font-size: 0.75rem;"><i class="bi bi-building-fill me-1 text-info"></i>Eligible Departments</h6>
                <div v-if="!isOpenToAll && formattedDepartments && formattedDepartments.length > 0" class="d-flex flex-wrap gap-1">
                    <span v-for="dept in formattedDepartments" :key="dept" class="badge bg-info-subtle text-info border border-info-subtle px-2 py-1 shadow-xs fw-medium" style="font-size: 0.7rem;">
                        {{ dept }}
                    </span>
                </div>
                <div v-else>
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 shadow-xs fw-medium" style="font-size: 0.7rem;">
                        Open to All Departments
                    </span>
                </div>
            </div>
            <div class="col-md-3">
                <h6 class="fw-bold mb-1.5 text-uppercase text-muted" style="font-size: 0.75rem;"><i class="bi bi-award-fill me-1 text-warning"></i>Required CGPA</h6>
                <div>
                    <span v-if="drive.min_cgpa" class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 shadow-xs fw-bold" style="font-size: 0.7rem;">
                        {{ drive.min_cgpa }} &amp; Above
                    </span>
                    <span v-else class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 shadow-xs fw-medium" style="font-size: 0.7rem;">
                        No Minimum Limit
                    </span>
                </div>
            </div>
            <div class="col-md-3">
                <h6 class="fw-bold mb-1.5 text-uppercase text-muted" style="font-size: 0.75rem;"><i class="bi bi-list-task me-1 text-secondary"></i>Interview Rounds</h6>
                <div v-if="drive.InterviewRounds && drive.InterviewRounds.length > 0" class="d-flex flex-wrap gap-1">
                    <span v-for="(round, index) in drive.InterviewRounds" :key="index" class="badge bg-light text-dark border border-secondary px-2 py-1 fw-medium shadow-xs" style="font-size: 0.7rem;">
                        <span class="text-primary me-0.5 fw-bold">R{{ index + 1 }}:</span> {{ round }}
                    </span>
                </div>
                <div v-else>
                    <p class="text-muted small mb-0" style="font-size: 0.75rem;">No rounds configured.</p>
                </div>
            </div>
        </div>
        <div class="mt-3 pt-3 border-top">
            <h3 class="fw-bold mb-2 text-dark">Job Description</h3>
            <div class="mb-3 text-secondary small" style="line-height: 1.5;" v-html="drive.JobDescription"></div>
        </div>

        <div class="mt-3 pt-3 border-top d-flex gap-3">
            <div v-if="mode === 'student'" class="w-100">
                <div v-if="application" class="alert alert-info w-100 mb-0 py-2.5 small">
                    <strong><i class="bi bi-info-circle-fill me-2"></i>You have already applied for this drive.</strong>
                    <span class="d-block mt-1.5">
                        Current Status: <span class="badge bg-primary ms-1" style="font-size: 0.7rem;">{{ application.status || 'Applied' }}</span>
                        <span v-if="application.available_immediately" class="badge bg-success ms-2" style="font-size: 0.7rem;">Immediate Joiner</span>
                        <span v-else class="badge bg-warning text-dark ms-2" style="font-size: 0.7rem;" :title="'Remarks: ' + application.availability_remarks">Delayed (from {{ application.available_from }})</span>
                    </span>
                </div>
                <div v-else-if="!eligibilityStatus.eligible" class="alert alert-danger p-3 text-center rounded-4 w-100 shadow-sm mb-0">
                    <h6 class="fw-bold mb-1.5"><i class="bi bi-x-octagon-fill me-2"></i>Not Eligible to Apply</h6>
                    <p class="mb-0 small">{{ eligibilityStatus.reason }}</p>
                </div>
                <div v-else-if="!application && drive.Status === 'Active'" class="w-100">
                    <div class="mb-2">
                        <label class="form-label small fw-bold mb-1">Resume Option</label>
                        <select class="form-select form-select-sm" v-model="form.resumeType">
                            <option value="profile">Use Default Resume (from Profile)</option>
                            <option value="custom">Upload New Resume for this Drive</option>
                        </select>
                    </div>

                    <div v-if="form.resumeType === 'custom'" class="mb-2">
                        <label class="form-label small fw-bold mb-1">Upload Resume (PDF)</label>
                        <input type="file" class="form-control form-control-sm" accept=".pdf" @change="handleResumeUpload">
                    </div>
                    <div class="card bg-light border-0 shadow-sm mb-3">
                        <div class="card-body p-2.5">
                            <label class="form-label small fw-bold text-dark mb-1.5"><i class="bi bi-calendar-check me-2"></i>Availability to Join</label>
                            <div class="form-check mb-1">
                                <input class="form-check-input" type="radio" id="availYes" :value="true" v-model="form.availableImmediately">
                                <label class="form-check-label small" for="availYes" style="font-size: 0.8rem;">
                                    Yes, I am available to join immediately upon selection.
                                </label>
                            </div>
                            <div class="form-check mb-0">
                                <input class="form-check-input" type="radio" id="availNo" :value="false" v-model="form.availableImmediately">
                                <label class="form-check-label small" for="availNo" style="font-size: 0.8rem;">
                                    No, I have a delayed availability.
                                </label>
                            </div>

                            <div v-if="!form.availableImmediately" class="p-2 border rounded bg-white mt-2 transition-all">
                                <div class="mb-2">
                                    <label class="form-label small fw-bold text-muted mb-1" style="font-size: 0.75rem;">Expected Availability Date</label>
                                    <input type="date" class="form-control form-control-sm" v-model="form.availableFrom" :min="getMinDate()" required>
                                </div>
                                <div>
                                    <label class="form-label small fw-bold text-muted mb-1" style="font-size: 0.75rem;">Commitment Clarification</label>
                                    <textarea class="form-control form-control-sm" v-model="form.availabilityRemarks" rows="2" placeholder="Briefly explain commitments..." required style="font-size: 0.8rem;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" v-model="form.isAvailable" id="availCheck">
                        <label class="form-check-label small" for="availCheck" style="font-size: 0.8rem;">I confirm my availability and agree to the terms.</label>
                    </div>
                    
                    <button :disabled="!form.isAvailable || loading" @click="submitApplication" class="btn btn-primary btn-sm px-4">
                        {{ loading ? 'Submitting...' : 'Confirm Application' }}
                    </button>
                </div>
                <div v-else-if="['Closed', 'Application Closed'].includes(drive.Status)" class="alert alert-warning w-100 mb-0 py-2.5 small">
                    <strong><i class="bi bi-exclamation-triangle-fill me-2"></i>Applications are closed for this drive.</strong>
                </div>
            </div>

            <div v-else-if="mode === 'admin'" class="p-3 bg-light rounded-4 border shadow-sm w-100">
                <h6 class="fw-bold mb-2">Admin Decision Portal</h6>
                
                <div v-if="drive.Status === 'Pending'">
                    <div class="mb-2">
                        <label class="form-label small fw-bold text-danger mb-1">Rejection Remarks (Required if rejecting)</label>
                        <textarea 
                            v-model="adminForm.remarks" 
                            class="form-control form-control-sm" 
                            rows="2" 
                            placeholder="Explain why this drive is being rejected...">
                        </textarea>
                    </div>

                    <div class="d-flex gap-2">
                        <button 
                            class="btn btn-outline-danger btn-sm px-3 fw-bold" 
                            @click="updateStatus('Rejected')"
                            :disabled="!adminForm.remarks || loading">
                            Reject Drive
                        </button>

                        <button 
                            class="btn btn-success btn-sm px-4 fw-bold" 
                            @click="updateStatus('Active')"
                            :disabled="loading">
                            Approve & Publish
                        </button>
                    </div>
                </div>

                <div v-else class="alert py-2 mb-0 small" :class="drive.Status === 'Active' ? 'alert-success' : 'alert-danger'">
                    <strong>Status: {{ drive.Status }}</strong>
                    <p v-if="drive.Remark" class="mb-0 mt-1.5 small">Note: {{ drive.Remark }}</p>
                </div>
            </div>
        </div>
    </div>`,
    data() {
        return {
            adminForm: { remarks: '' },
            form: { driveId: null, resumeType: 'profile', isAvailable: false, customResume: null, availableImmediately: true, availableFrom: '', availabilityRemarks:'' },
            loading: false,
            application: null,
            studentProfile: null,
            total_applicants: 0,
            shortlisted: 0,
            interviewRounds: [],
            availableDepartments: [],
        }
    },
    computed: {
        eligibilityStatus() {
            if (this.mode !== 'student' || !this.studentProfile || !this.drive) return { eligible: true, reason: '' };
            
            const studentCGPA = parseFloat(this.studentProfile.cgpa) || 0;
            const driveMinCGPA = parseFloat(this.drive.min_cgpa) || 0;
            if (driveMinCGPA > 0 && studentCGPA < driveMinCGPA) return { eligible: false, reason: `Requires CGPA >= ${this.drive.min_cgpa}. Yours is ${studentCGPA}.` };
            
            const driveDepts = Array.isArray(this.drive.Departments) ? this.drive.Departments.map(d => (typeof d === 'object' ? (d.department || '') : String(d)).toLowerCase().trim()) : [];
            const myDept = (this.studentProfile.department || '').toLowerCase().trim();
            if (driveDepts.length > 0 && !driveDepts.includes(myDept)) return { eligible: false, reason: `Not open for the ${this.studentProfile.department} department.` };
            
            const mySkills = Array.isArray(this.studentProfile.skills) ? this.studentProfile.skills.map(s => s.toLowerCase().trim()) : [];
            const requiredSkills = Array.isArray(this.drive.RequiredSkills) ? this.drive.RequiredSkills.map(s => s.toLowerCase().trim()) : [];
            if (requiredSkills.length > 0) {
                const hasAll = requiredSkills.every(req => mySkills.includes(req));
                const missingSkills = requiredSkills.filter(req => !mySkills.includes(req));
                if (!hasAll) return { eligible: false, reason: `You are missing some required skills: ${missingSkills.join(', ')}` };
            }

             if (this.drive.Status === 'Application Closed') {
                return { eligible: false, reason: 'This placement drive has been closed and is no longer accepting applications.' };
            }
            
            if (this.drive.ApplyDeadline) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const deadline = new Date(this.drive.ApplyDeadline + 'T00:00:00');
                if (deadline < today) {
                    return { eligible: false, reason: 'Application deadline has passed.' };
                }
            }

            return { eligible: true, reason: '' };
        },
        isFormValid(){
            if (!this.form.isAvailable) return false;
            if (!this.form.availableImmediately){
                if (!this.form.availableFrom || !this.form.availabilityRemarks) return false;
            }
        },
        formattedDepartments() {
            const depts = this.drive?.Departments || this.drive?.departments;
            if (!depts) return [];
            return depts.map(d => typeof d === 'object' ? (d.department || '') : String(d));
        },
        isOpenToAll() {
            const depts = this.drive?.Departments || this.drive?.departments || [];
            const deptList = depts.map(d => typeof d === 'object' ? (d.department || '') : String(d));
            if (deptList.length === 0) return true;
            if (this.availableDepartments && this.availableDepartments.length > 0 && deptList.length >= this.availableDepartments.length) {
                const availableNames = this.availableDepartments.map(d => d.department.toLowerCase().trim());
                const selectedNames = deptList.map(d => d.toLowerCase().trim());
                return availableNames.every(name => selectedNames.includes(name));
            }
            return false;
        }
    },
    methods: {
        formatDateTime,
        getMinDate,
        handleResumeUpload(event) {
            this.form.customResume = event.target.files[0];
        },
        async updateStatus(newStatus) {
            this.loading = true;
            if (newStatus === 'Rejected' && (!this.adminForm.remarks || !this.adminForm.remarks.trim())) {
                alert('Rejection remarks are required.');
                this.loading = false; return;
            }
            try {
                const resp = await fetch('/api/placement_drives', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify({ DriveID: this.drive.DriveID, Status: newStatus, remarks: this.adminForm.remarks })
                });
                if (resp.ok) {
                    alert(`Drive status updated to ${newStatus}`);
                    this.$emit('success');
                } else {
                    const error = await resp.json(); alert(`Failed: ${error.message}`);
                }
            } catch (e) {
                alert('An error occurred.'); console.error(e);
            } finally { this.loading = false; }
        },
        async submitApplication() {
            this.loading = true;
            try {
                const payload= new FormData();
                if (this.form.resumeType === 'custom' && this.form.customResume) {
                    payload.append('resume', this.form.customResume);
                }
                payload.append('available_immediately', this.form.availableImmediately);
                if (!this.form.availableImmediately) {
                    if (!this.form.availableFrom) {
                        alert("Expected Availability Date is required.");
                        this.loading = false;
                        return;
                    }
                    if (!this.form.availabilityRemarks || !this.form.availabilityRemarks.trim()) {
                        alert("Commitment Clarification remarks are required.");
                        this.loading = false;
                        return;
                    }
                    if (new Date(this.form.availableFrom) < new Date(new Date().setHours(0,0,0,0))) {
                        alert("Availability date cannot be in the past.");
                        this.loading = false;
                        return;
                    }
                    payload.append('available_from', this.form.availableFrom);
                    payload.append('availability_remarks', this.form.availabilityRemarks);
                }
                const res = await fetch('/api/apply/' + this.form.driveId, {
                    method: 'POST',
                    headers: { 'Authentication-Token': localStorage.getItem('token') },
                    body: payload
                });
                if (res.ok) {
                    this.$emit('success', this.form.driveId);
                } else {
                    const err = await res.json();
                    alert(`Failed to apply: ${err.message}`);
                }
            } catch(e) {
                console.error(e);
                alert("Error submitting application.");
            }
            this.loading = false;
        }
    },
    mounted() {
        this.form.driveId = this.drive.DriveID;
        const url = window.location.origin + '/api/apply/' + this.form.driveId;
        
        fetch('/api/departments', { headers: { 'Authentication-Token': localStorage.getItem('token') } })
        .then(res => res.ok ? res.json() : [])
        .then(data => { this.availableDepartments = data; })
        .catch(e => console.error("Error fetching departments", e));

        if (this.mode === 'student') {
            // Check if already applied
            fetch(url, { headers: { 'Authentication-Token': localStorage.getItem('token') } })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && !data.message) { 
                    this.application = data; 
                    this.form.isAvailable = false; 
                }
            }).catch(e => console.error("Not applied yet", e));

            // Fetch profile to verify eligibility dynamically
            fetch('/api/student_profile', { headers: { 'Authentication-Token': localStorage.getItem('token') } })
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) this.studentProfile = data; });
        }
    }
}
export default DriveDetailView;