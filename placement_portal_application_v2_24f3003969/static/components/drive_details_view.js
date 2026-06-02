import { formatDateTime } from '../utils/formatDateTime.js';
const DriveDetailView = {
    props: ['drive', 'mode'],
    template:`
    <div class="card shadow-sm border-0 p-4 p-md-5 rounded-4 transition-all" style="transition: transform 0.2s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <button @click="$emit('back')" class="btn btn-link text-decoration-none mb-3 px-0 fw-bold"><i class="bi bi-arrow-left me-2"></i>Back</button>
        <div v-if="mode==='company'" class="alert alert-info py-2 small mb-4"><i class="bi bi-info-circle me-2"></i>Review how this will look to students and Admin.</div>
        
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start border-bottom pb-3 mb-4 gap-3">
            <div>
                <h2 class="fw-bold mb-1">{{ drive.JobTitle }}</h2>
                <p class="text-muted mb-0"><i class="bi bi-geo-alt-fill text-danger me-1"></i>{{ drive.Location }} ({{ drive.WorkMode }}) <span class="mx-2 text-light">|</span> <i class="bi bi-briefcase-fill text-primary me-1"></i>{{ drive.Type }}</p>
            </div>
            <div class="text-md-end bg-light p-3 rounded-3 border">
                <h4 class="fw-bold text-success">₹{{ drive.Salary }} {{ drive.Type === 'Job' ? 'LPA' : '/month' }}</h4>
                <p class="small text-muted mb-0 fw-medium"><i class="bi bi-clock-history me-1"></i>Deadline: {{ formatDateTime(drive.ApplyDeadline) }}</p>
            </div>
        </div>
            
        <div class="row">
            <div class="col-md-6">
                <h6 class="fw-bold mb-2 text-uppercase small text-muted">Skills Needed</h6>
                <div class="d-flex flex-wrap gap-2">
                    <span v-for="skill in drive.RequiredSkills" class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 shadow-sm transition-all" style="transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">{{ skill }}</span>
                </div>
            </div>
            <div class="col-md-6 mt-3 mt-md-0">
                <h6 class="fw-bold mb-2 text-uppercase small text-muted">Interview Rounds</h6>
                <div v-if="drive.InterviewRounds && drive.InterviewRounds.length > 0" class="d-flex flex-wrap gap-2">
                    <span v-for="(round, index) in drive.InterviewRounds" :key="index" class="badge bg-light text-dark border border-secondary px-3 py-2 fw-medium shadow-sm transition-all" style="font-size: 0.85rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <span class="text-primary me-1 fw-bold">R{{ index + 1 }}:</span> {{ round }}
                    </span>
                </div>
                <div v-else>
                    <p class="text-muted small mb-0">Details about interview rounds have not been provided.</p>
                </div>
            </div>
        </div>
        <div class="mt-4 pt-4 border-top">
            <h5 class="fw-bold mb-3 text-dark">Job Description</h5>
            <div class="mb-4 text-secondary" style="line-height: 1.6;" v-html="drive.JobDescription"></div>
        </div>

        <div class="mt-4 pt-4 border-top d-flex gap-3">
            <div v-if="mode === 'drive_stats_view'" class="w-100">
                <h5 class="fw-bold mb-3">Drive Statistics</h5>
                <div class="row g-3">
                    <div class="col-sm-6 col-md-3">
                        <div class="p-3 bg-light rounded border text-center shadow-sm" style="transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <h6 class="small text-muted mb-1 text-uppercase fw-bold">Drive Status</h6>
                            <p class="fs-4 fw-bold text-primary mb-0">{{ drive.Status }}</p>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="p-3 bg-light rounded border text-center shadow-sm" style="transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <h6 class="small text-muted mb-1 text-uppercase fw-bold">Total Applicants</h6>
                            <p class="fs-4 fw-bold text-dark mb-0">{{ total_applicants }}</p>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="p-3 bg-light rounded border text-center shadow-sm" style="transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <h6 class="small text-muted mb-1 text-uppercase fw-bold">Shortlisted</h6>
                            <p class="fs-4 fw-bold text-success mb-0">{{ shortlisted }}</p>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <div class="p-3 bg-light rounded border text-center shadow-sm" style="transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <h6 class="small text-muted mb-1 text-uppercase fw-bold">Interview Rounds</h6>
                            <p class="fs-4 fw-bold text-info mb-0">{{ drive.InterviewRounds ? drive.InterviewRounds.length : 0 }}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-else-if="mode === 'student'" class="w-100">
                <div v-if="!eligibilityStatus.eligible" class="alert alert-danger p-4 text-center rounded-4 w-100 shadow-sm">
                    <h5 class="fw-bold mb-2"><i class="bi bi-x-octagon-fill me-2"></i>Not Eligible to Apply</h5>
                    <p class="mb-0">{{ eligibilityStatus.reason }}</p>
                </div>
                
                <div v-else-if="!application">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Resume Option</label>
                        <select class="form-select" v-model="form.resumeType">
                            <option value="profile">Use Default Resume (from Profile)</option>
                            <option value="custom">Upload New Resume for this Drive</option>
                        </select>
                    </div>

                    <div v-if="form.resumeType === 'custom'" class="mb-3">
                        <label class="form-label small fw-bold">Upload Resume (PDF)</label>
                        <input type="file" class="form-control" accept=".pdf" @change="handleResumeUpload">
                    </div>
                    <div class="card bg-light border-0 shadow-sm mb-4">
                        <div class="card-body">
                            <label class="form-label small fw-bold text-dark"><i class="bi bi-calendar-check me-2"></i>Availability to Join</label>
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="radio" id="availYes" :value="true" v-model="form.availableImmediately">
                                <label class="form-check-label small" for="availYes">
                                    Yes, I am available to join immediately upon selection.
                                </label>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="radio" id="availNo" :value="false" v-model="form.availableImmediately">
                                <label class="form-check-label small" for="availNo">
                                    No, I have a delayed availability.
                                </label>
                            </div>

                            <div v-if="!form.availableImmediately" class="p-3 border rounded bg-white mt-2 transition-all">
                                <div class="mb-2">
                                    <label class="form-label small fw-bold text-muted">Expected Availability Date</label>
                                    <input type="date" class="form-control form-control-sm" v-model="form.availableFrom" required>
                                </div>
                                <div>
                                    <label class="form-label small fw-bold text-muted">Commitment Clarification</label>
                                    <textarea class="form-control form-control-sm" v-model="form.availabilityRemarks" rows="2" placeholder="Briefly explain your current commitments (e.g., Final exams ending June 10th)..." required></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" v-model="form.isAvailable" id="availCheck">
                        <label class="form-check-label" for="availCheck">I confirm my availability and agree to the terms.</label>
                    </div>
                    
                    <button :disabled="!form.isAvailable || loading" @click="submitApplication" class="btn btn-primary px-5">
                        {{ loading ? 'Submitting...' : 'Confirm Application' }}
                    </button>
                </div>
                <div v-else class="alert alert-info w-100">
                    <strong><i class="bi bi-info-circle-fill me-2"></i>You have already applied for this drive.</strong>
                    <span class="d-block mt-2">Current Status: <span class="badge bg-primary ms-1">{{ application.status || 'Applied' }}</span></span>
                </div>
            </div>

            <div v-else-if="mode === 'admin'" class="p-4 bg-light rounded-4 border shadow-sm w-100">
                <h5 class="fw-bold mb-4">Admin Decision Portal</h5>
                
                <div v-if="drive.Status === 'Pending'">
                    <div class="mb-4">
                        <label class="form-label small fw-bold text-danger">Rejection Remarks (Required if rejecting)</label>
                        <textarea 
                            v-model="adminForm.remarks" 
                            class="form-control" 
                            rows="3" 
                            placeholder="Explain why this drive is being rejected (e.g., 'Salary too low', 'Missing skills')">
                        </textarea>
                    </div>

                    <div class="d-flex gap-3">
                        <button 
                            class="btn btn-outline-danger px-4 fw-bold" 
                            @click="updateStatus('Rejected')"
                            :disabled="!adminForm.remarks || loading">
                            Reject Drive
                        </button>

                        <button 
                            class="btn btn-success px-5 fw-bold" 
                            @click="updateStatus('Approved')"
                            :disabled="loading">
                            Approve & Publish
                        </button>
                    </div>
                </div>

                <div v-else class="alert" :class="drive.Status === 'Approved' ? 'alert-success' : 'alert-danger'">
                    <strong>Status: {{ drive.Status }}</strong>
                    <p v-if="drive.Remark" class="mb-0 mt-2 small">Note: {{ drive.Remark }}</p>
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

            if (this.drive.Status === 'Closed') {
                return { eligible: false, reason: 'This placement drive has been closed and is no longer accepting applications.' };
            }
            
            if (this.drive.ApplyDeadline) {
                const deadline = new Date(this.drive.ApplyDeadline);
                if (deadline < new Date()) {
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
        }
    },
    methods: {
        formatDateTime,
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
                    payload.append('available_from', this.form.availableFrom);
                    payload.append('availability_remarks', this.form.availabilityRemarks);
                }
                const res = await fetch('/api/apply/' + this.form.driveId, {
                    method: 'POST',
                    headers: { 'Authentication-Token': localStorage.getItem('token') },
                    body: payload
                });
                if (res.ok) {
                    alert("Application submitted successfully!");
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
        
        if (this.mode === 'drive_stats_view') {
            fetch(url, { headers: { 'Authentication-Token': localStorage.getItem('token') } })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data)) {
                    this.total_applicants = data.length;
                    this.shortlisted = data.filter(app => app.status === 'Shortlisted').length;
                    
                    // Fixed: Safely loop inside the async block
                    data.forEach(app => {
                        fetch(window.location.origin + '/api/interview_rounds/' + app.ApplicationID, {
                            headers: { 'Authentication-Token': localStorage.getItem('token') }
                        }).then(res => res.ok ? res.json() : null)
                          .then(roundsData => {
                              if (roundsData) this.interviewRounds.push(...roundsData);
                          });
                    });
                }
            }).catch(e => console.error("Error fetching stats", e));
        }
    }
}
export default DriveDetailView;