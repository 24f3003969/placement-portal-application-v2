import { formatDateTime } from "../utils/formatDateTime.js";

const StudentProfile = {
    props: {
        isAdminView: { type: Boolean, default: false },
        userId: { type: Number, default: null },
        profileData: { type: Object, default: null },
        applicationResume: { type: String, default: null },
    },
    template: `
     <div class="container mt-2">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h3 class="fw-bold mb-0">Student Profile</h3>
            <button v-if="!isAdminView" class="btn btn-outline-primary" @click="generateReport()" :disabled="reportLoading">
                <span v-if="reportLoading" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-file-earmark-spreadsheet-fill me-1"></i> Export History (CSV)
            </button>
        </div>

        <ul class="nav nav-tabs mb-2">
            <li class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'details' }" @click="currentTab = 'details'">Identity & Skills</button>
            </li>
            <li v-if="userRole === 'admin' || userRole === 'stud'" class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'placements' }" @click="currentTab = 'placements'">Placements (Hired)</button>
            </li>
            <li v-if="userRole === 'admin'" class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'history' }" @click="currentTab = 'history'">Status Logs (Suspension History)</button>
            </li>
        </ul>

        <div v-if="currentTab === 'details'">
            <div v-if="!isEditing" class="card shadow-sm border-0 rounded-4 overflow-hidden">
                <!-- Cover Banner -->
                <div class="bg-primary" style="height: 80px; background: linear-gradient(90deg, #004a99 0%, #0073e6 100%);"></div>
                
                <div class="card-body px-4 pb-4 pt-0">
                    <div class="row">
                        <!-- Left Column: Picture and Contact -->
                        <div class="col-md-4 col-lg-3 text-center" style="margin-top: -60px;">
                            <img :src="profile.profile_pic || '/static/images/default-avtar.png'" class="rounded-circle mb-3 shadow border border-4 border-white bg-white" style="width: 120px; height: 120px; object-fit: cover;">
                            
                            <h4 class="fw-bold mb-1">{{ profile.name }}</h4>
                            <p class="text-muted small mb-3">{{ profile.department }}</p>

                            <div v-if="userRole === 'admin' || userRole === 'stud'" class="mb-4">
                                <button @click="isEditing = true" class="btn btn-outline-primary btn-sm rounded-pill px-4"><i class="bi bi-pencil-square me-1"></i>Edit Profile</button>
                            </div>

                            <div class="text-start px-2" v-if="userRole !== 'comp'">
                                <h6 class="fw-bold text-uppercase small text-muted border-bottom pb-2 mb-3">Contact Info</h6>
                                <div class="mb-2 d-flex align-items-center"><i class="bi bi-envelope-fill text-muted me-2"></i><span class="small text-truncate" :title="profile.email">{{ profile.email }}</span></div>
                                <div class="mb-2 d-flex align-items-center"><i class="bi bi-telephone-fill text-muted me-2"></i><span class="small">{{ profile.phone }}</span></div>
                                <div class="mb-2 d-flex align-items-center"><i class="bi bi-calendar-check text-muted me-2"></i><span class="small">Joined: {{ formatDateTime(profile.registration_date, false) }}</span></div>
                            </div>
                            
                            <div class="text-start px-2 mt-4">
                                <h6 class="fw-bold text-uppercase small text-muted border-bottom pb-2 mb-3">Links & Documents</h6>
                                <div class="d-grid gap-2">
                                    <a v-if="applicationResume || profile.resume" :href="'/' + (applicationResume || profile.resume)" target="_blank" class="btn btn-sm btn-light border text-start"><i class="bi bi-file-earmark-pdf text-danger me-2"></i>Resume</a>
                                    <a v-if="profile.linkedin" :href="profile.linkedin" target="_blank" class="btn btn-sm btn-light border text-start"><i class="bi bi-linkedin text-primary me-2"></i>LinkedIn</a>
                                    <a v-if="profile.github" :href="profile.github" target="_blank" class="btn btn-sm btn-light border text-start"><i class="bi bi-github text-dark me-2"></i>GitHub</a>
                                    <a v-if="profile.certificates_link" :href="profile.certificates_link" target="_blank" class="btn btn-sm btn-light border text-start"><i class="bi bi-patch-check-fill text-success me-2"></i>Certificates</a>
                                </div>
                                <span v-if="!(applicationResume || profile.resume) && !profile.linkedin && !profile.github && !profile.certificates_link" class="text-muted small">No links available.</span>
                            </div>
                        </div>

                        <!-- Right Column: Details -->
                        <div class="col-md-8 col-lg-9 pt-3">
                            
                            <div class="row mb-3">
                                <div class="col-sm-6 col-md-4 mb-3">
                                    <div class="p-3 bg-light rounded-3 border">
                                        <small class="text-muted text-uppercase fw-bold">Roll Number</small>
                                        <div class="fs-5 fw-bold text-dark mt-1">{{ profile.roll_no }}</div>
                                    </div>
                                </div>
                                <div class="col-sm-6 col-md-4 mb-3">
                                    <div class="p-3 bg-light rounded-3 border">
                                        <small class="text-muted text-uppercase fw-bold">CGPA</small>
                                        <div class="fs-5 fw-bold text-primary mt-1">{{ profile.cgpa }}</div>
                                    </div>
                                </div>
                                <div class="col-sm-12 col-md-4 mb-3">
                                    <div class="p-3 bg-light rounded-3 border">
                                        <small class="text-muted text-uppercase fw-bold">Department</small>
                                        <div class="fs-6 fw-bold text-dark mt-1 text-truncate" :title="profile.department">{{ profile.department }}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-4">
                                <h6 class="fw-bold mb-3"><i class="bi bi-person-lines-fill text-muted me-2"></i>About Me</h6>
                                <div class="p-4 rounded-3 border bg-white shadow-sm">
                                    <p class="mb-0 text-secondary" style="white-space: pre-line; line-height: 1.6;">{{ profile.about_me || 'No summary provided.' }}</p>
                                </div>
                            </div>

                            <div class="mb-3">
                                <h6 class="fw-bold mb-3"><i class="bi bi-tools text-muted me-2"></i>Skills</h6>
                                <div class="p-4 rounded-3 border bg-white shadow-sm">
                                    <div v-if="profile.skills && profile.skills.length>0" class="d-flex flex-wrap gap-2">
                                        <span v-for="skill in profile.skills" :key="skill" class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2" style="font-size: 0.85rem;">{{ skill }}</span>
                                    </div>
                                    <div v-else class="text-muted small">No skills provided.</div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div v-if="isEditing" class="card shadow-sm mt-4 border-0 rounded-4">
                <div class="card-body p-4">
                    <h5 class="fw-bold mb-4"><i class="bi bi-pencil-square me-2 text-primary"></i>Edit Profile</h5>
                    <form @submit.prevent="updateProfile">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Full Name</label>
                                <input type="text" class="form-control" v-model="profile.name" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Phone</label>
                                <input type="text" class="form-control" v-model="profile.phone" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Roll Number</label>
                                <input type="text" class="form-control" v-model="profile.roll_no" :disabled="!isAdminView" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Department</label>
                                <input type="text" class="form-control" v-model="profile.department" :disabled="!isAdminView" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">CGPA</label>
                                <input type="number" step="0.01" class="form-control" v-model="profile.cgpa" required>
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold required-label">Skills</label>
                                <div class="d-flex flex-wrap gap-2 p-2 border rounded bg-light">
                                    <span v-for="(skill, i) in profile.skills" :key="i" class="badge bg-primary text-white d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.85rem;">
                                        {{ skill }} <i class="bi bi-x text-white" style="cursor: pointer; font-size: 1.1rem;" @click="profile.skills.splice(i, 1)"></i>
                                    </span>
                                    <input v-model="skillInput" @keydown.enter.prevent="addSkill" @blur="addSkill" class="border-0 bg-transparent flex-grow-1 p-1" placeholder="Type skill and press Enter..." style="outline:none; min-width: 150px;">
                                </div>
                                <small class="text-muted">Press Enter to add a skill.</small>
                            </div>
                            <div class="col-md-6"><label class="form-label small fw-bold">LinkedIn</label><input type="url" class="form-control" v-model="profile.linkedin" placeholder="https://linkedin.com/in/username"></div>
                            <div class="col-md-6"><label class="form-label small fw-bold">GitHub</label><input type="url" class="form-control" v-model="profile.github" placeholder="https://github.com/username"></div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Certificates Link</label>
                                <input type="url" class="form-control" v-model="profile.certificates_link" placeholder="Link to certificates (e.g. Google Drive)">
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold">About Me</label>
                                <textarea class="form-control" v-model="profile.about_me" rows="4" placeholder="Write a brief summary about yourself, your career goals, and what you're passionate about."></textarea>
                            </div>
                            <div class="col-md-6" v-if="!isAdminView">
                                <label class="form-label small fw-bold">Resume Upload (PDF)</label>
                                <input type="file" accept=".pdf,.doc,.docx" class="form-control" @change="changeResume">
                                <small v-if="profile.resume" class="text-success mt-1 d-block"><i class="bi bi-check-circle-fill me-1"></i> Resume currently uploaded</small>
                            </div>
                            <div class="col-md-6" v-if="!isAdminView">
                                <label class="form-label small fw-bold">Profile Picture</label>
                                <input type="file" accept="image/*" class="form-control" @change="changePicture">
                                <small v-if="profile.profile_pic && !profile.profile_pic.includes('default')" class="text-success mt-1 d-block"><i class="bi bi-check-circle-fill me-1"></i> Custom picture currently uploaded</small>
                            </div>
                        </div>
                        <hr class="my-4">
                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" @click="isEditing = false" class="btn btn-secondary rounded-pill px-4">Cancel</button>
                            <button type="submit" class="btn btn-success rounded-pill px-4" :disabled="!isFormValid">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'placements'">
            <div v-if="hiredApplications.length > 0">
                <div v-for="app in hiredApplications" :key="app.id" class="card shadow-sm mb-4 border-success border-2 rounded-4 overflow-hidden">
                    <div class="card-header bg-success bg-gradient text-white d-flex justify-content-between align-items-center py-3">
                        <h5 class="fw-bold mb-0"><i class="bi bi-check-circle-fill me-2"></i>Finalized Placement Offer</h5>
                        <span class="badge bg-white text-success fw-bold px-3 py-2 rounded-pill">Status: Hired</span>
                    </div>
                    <div class="card-body p-4">
                        <div class="row g-4">
                            <div class="col-md-8">
                                <h3 class="fw-bold text-dark mb-1">{{ app.drive.JobTitle }}</h3>
                                <p class="text-muted fs-5 mb-3">{{ app.drive.company_name }}</p>
                                
                                <div class="d-flex flex-wrap gap-2 mb-4">
                                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-briefcase-fill text-muted me-1"></i> {{ app.drive.Type }}</span>
                                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-geo-alt-fill text-muted me-1"></i> {{ app.drive.Location }}</span>
                                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-cash-stack text-muted me-1"></i> {{ app.drive.Salary }} {{ app.drive.Type === 'Job' ? 'LPA' : '/month' }}</span>
                                </div>

                                <div class="row g-3 pt-2 border-top">
                                    <div class="col-sm-6" v-if="app.offer_expiry_date">
                                        <small class="text-muted text-uppercase fw-bold d-block">Offer Accepting Deadline</small>
                                        <span class="fw-semibold text-danger"><i class="bi bi-clock-history me-1"></i>{{ formatDateTime(app.offer_expiry_date, false) }}</span>
                                    </div>
                                    <div class="col-sm-6" v-if="app.joining_date">
                                        <small class="text-muted text-uppercase fw-bold d-block">Joining Date</small>
                                        <span class="fw-semibold text-success"><i class="bi bi-calendar-event me-1"></i>{{ formatDateTime(app.joining_date, false) }}</span>
                                    </div>
                                </div>

                                <div v-if="app.offer_message" class="mt-4 p-3 bg-light rounded-3 border-start border-4 border-success">
                                    <small class="text-muted fw-bold d-block mb-1"><i class="bi bi-chat-quote-fill me-1"></i>Note from Employer</small>
                                    <p class="mb-0 text-secondary fst-italic">"{{ app.offer_message }}"</p>
                                </div>
                            </div>
                            
                            <div class="col-md-4 d-flex flex-column justify-content-center align-items-md-end">
                                <a v-if="app.offer_letter" :href="'/' + app.offer_letter" target="_blank" class="btn btn-success btn-lg px-4 py-2 shadow-sm rounded-pill fw-bold">
                                    <i class="bi bi-file-earmark-pdf-fill me-1"></i> View Offer Letter
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="alert alert-info text-center p-5 rounded-4 border-0 shadow-sm">
                <i class="bi bi-emoji-smile fs-1 d-block mb-3 text-primary"></i>
                <h5 class="fw-bold">No Finalized Placements Yet</h5>
                <p class="text-muted mb-0">Your journey is still active. Keep applying and preparing for your interviews!</p>
            </div>
        </div>

        <!-- Status History (Audit logs for Admins) -->
        <div v-if="currentTab === 'history' && userRole === 'admin'">
            <div class="card shadow-sm border-0 rounded-4 overflow-hidden">
                <div class="card-header bg-dark text-white fw-bold py-3">
                    <i class="bi bi-shield-lock-fill me-2"></i>Account Status Audit History
                </div>
                <div class="card-body">
                    <div v-if="profile.status_history && profile.status_history.length > 0" class="table-responsive">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Action</th>
                                    <th>Reason / Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="log in profile.status_history" :key="log.id">
                                    <td class="text-muted">{{ formatDateTime(log.timestamp) }}</td>
                                    <td>
                                        <span class="badge px-3 py-2 rounded-pill" :class="log.status === 'disabled' ? 'bg-danger-subtle text-danger-emphasis' : 'bg-success-subtle text-success-emphasis'">
                                            {{ log.status === 'disabled' ? 'Suspended / Disabled' : 'Reactivated / Enabled' }}
                                        </span>
                                    </td>
                                    <td class="text-secondary">{{ log.note }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-center text-muted p-5">
                        <i class="bi bi-info-circle fs-1 d-block mb-3 text-secondary"></i>
                        <h5>No Status History Recorded</h5>
                        <p class="mb-0">This student has never been suspended or disabled.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            currentTab: 'details',
            isEditing: false,
            profile: { name: '', email: '', roll_no: '', phone: '', cgpa: '', department:'', skills: [], linkedin: '', github:'', certificates_link: '', resume:'', profile_pic:'', registration_date: '', about_me: '', status_history: []},
            allApplications: [],
            newResumeFile: null,
            newPicture: null,
            reportLoading: false,
            skillInput: ''
        };
    },
    computed: {
        current_user() {
            return JSON.parse(localStorage.getItem('user'));
        },
        userRole() {
            return localStorage.getItem('role') || 'stud';
        },
        isFormValid() {
            const cgpa = parseFloat(this.profile.cgpa);
            return this.profile.name && cgpa >= 0 && cgpa <= 10 && this.profile.roll_no && this.profile.phone && this.profile.department;
        },
        hiredApplications() {
            return this.allApplications.filter(app => app.status === 'Hired');
        }
    },
    async created() {
        if (!this.userId && this.$route.query.studentId) {
            this.userId = parseInt(this.$route.query.studentId);
        }
        
        this.fetchProfile();
        if (this.userRole === 'admin' || this.userRole === 'stud') {
            this.fetchApplications();
        }
    },
    methods: {
        formatDateTime,
        addSkill() {
            const skill = this.skillInput.trim();
            if (skill && !this.profile.skills.includes(skill)) {
                this.profile.skills.push(skill);
            }
            this.skillInput = '';
        },
        async fetchProfile() {
            let currentProfile = { ...this.profile };
            
            // 1. Unpack properties provided by parent components safely
            if (this.profileData) {
                const initialData = { ...this.profileData };
                if (initialData.skills && typeof initialData.skills === 'string') {
                    initialData.skills = initialData.skills.split(',').map(s => s.trim()).filter(Boolean);
                }
                currentProfile = { ...currentProfile, ...initialData };
                this.profile = currentProfile;
            }

            // 2. Execute background validation query sync
            const fetchUrl = this.isAdminView && this.userId ? `/api/admin/student/${this.userId}` : '/api/student_profile';
            try {
                const res = await fetch(fetchUrl, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
                if (res.ok) {
                    const data = await res.json();
                    
                    // Defensively ensure skills are converted into clean arrays
                    if (data.skills && typeof data.skills === 'string') {
                        data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
                    }

                    const finalProfile = { ...this.profile };
                    for (const key in data) {
                        // If the background API returns valid content data, update our model reference
                        if (data[key] !== null && data[key] !== undefined) {
                            // Block empty tracking arrays from clearing active profile layers
                            if (Array.isArray(data[key]) && data[key].length === 0 && finalProfile[key] && finalProfile[key].length > 0) {
                                continue;
                            }
                            finalProfile[key] = data[key];
                        }
                    }
                    this.profile = finalProfile;
                }
            } catch (error) { 
                console.error('Error loading student metrics profile bundle:', error); 
            }
        },
        async fetchApplications() {
            const url = this.isAdminView && this.userId ? `/api/admin/student/${this.userId}/applications` : '/api/student_applications_api';
            try {
                const res = await fetch(url, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
                if (res.ok) this.allApplications = await res.json();
            } catch (error) { console.error("Error fetching applications:", error); }
        },
        async updateProfile() {
            if (!this.isFormValid) return;
            try {
                if (this.newPicture) await this.uploadProfilePicture();
                if (this.newResumeFile) await this.uploadNewResume();

                const payload = { ...this.profile };
                if (Array.isArray(payload.skills)) {
                    payload.skills = payload.skills.join(', ');
                }

                const res = await fetch('/api/student_profile', {
                    method: 'POST',
                    headers: { 'Authentication-Token': localStorage.getItem('token'), 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) { 
                    alert("Profile updated!"); 
                    this.isEditing = false;
                    if (typeof this.fetchProfile === 'function') {
                        this.fetchProfile();
                    } else if (typeof this.loadStudentProfileBundle === 'function') {
                        this.loadStudentProfileBundle();
                    }
                } else {
                    const err = await res.json();
                    alert(err.message || "Failed to update profile.");
                }
            } catch (error) { console.error(error); }
        },
        changeResume(event) {
            this.newResumeFile = event.target.files[0];
        },
        changePicture(event) {
            this.newPicture = event.target.files[0];
        },
        async uploadNewResume() {
            const formData = new FormData(); 
            formData.append('resume', this.newResumeFile);
            const res = await fetch('/api/student_resume', { method: 'POST', headers: { 'Authentication-Token': localStorage.getItem('token') }, body: formData });
            if (res.ok) { const data = await res.json(); this.profile.resume = data.path; this.newResumeFile = null; }
        },
        async uploadProfilePicture() {
            const formData = new FormData(); 
            formData.append('profile_pic', this.newPicture);
            const res = await fetch('/api/profile_pic', { method: 'POST', headers: { 'Authentication-Token': localStorage.getItem('token') }, body: formData });
            if (res.ok) { const data = await res.json(); this.profile.profile_pic = data.path; this.newPicture = null; }
        },
        async generateReport() {
            this.reportLoading = true;
            try {
                const res = await fetch(`/api/export`, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
                if (!res.ok) throw new Error('Failed to start task');
                const { id: task_id } = await res.json();

                const poll = setInterval(async () => {
                    const statusRes = await fetch(`/api/task_status/${task_id}`, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
                    const statusData = await statusRes.json();
                    if (statusData.state === 'SUCCESS') {
                        clearInterval(poll); this.reportLoading = false;
                        const a = document.createElement('a'); a.href = statusData.result.file_url;
                        a.download = statusData.result.file_url.split('/').pop();
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    } else if (statusData.state === 'FAILURE') {
                        clearInterval(poll); this.reportLoading = false; alert('Failed.');
                    }
                }, 3000);
            } catch (err) { this.reportLoading = false; alert(err.message); }
        }
    },
    mounted(){
        this.currentTab = this.$route.query.tab || 'details';
    }
};
export default StudentProfile;