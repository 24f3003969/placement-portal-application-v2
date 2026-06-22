import { formatDateTime } from "../utils/formatDateTime.js";
const StudentResource = {
    template: `
        <div class="card h-100 shadow-sm border-0 rounded-4 p-1" style="background-color: #dbc9d5;">
            <div class="card-body d-flex flex-column">
                <div class="d-flex align-items-center mb-2">
                    <div class="company-logo-wrapper me-3 mt-1">
                        <div class="bg-light rounded d-flex align-items-center justify-content-center" 
                             style="width: 48px; height: 48px; font-weight: bold; color: #30078f; border: 1px solid #eee;">
                            <div v-if="drive.logo_image">
                                <img :src="drive.logo_image" width="50" height="50" alt="company logo">
                            </div>
                            <div v-else-if="drive.company_name">
                                {{ (drive.company_name || 'C').charAt(0) }}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-1 text-dark font-weight-bold">#{{ drive.DriveID }} {{ drive.JobTitle }}</h6>
                        <small class="text-muted d-block mb-1 fw-medium">{{ drive.company_name }}</small>
                        <small class="text-primary d-block mb-1 fw-medium">Posted on: {{ formatDateTime(drive.PostedDate,false) }}</small>
                    </div>
                    <span v-if="currentUserRole === 'comp' || currentUserRole === 'admin'" class="badge" :class="statusBadgeClass(drive.Status)">
                        {{ drive.Status }}
                    </span>
                </div>
                <div class="d-flex flex-wrap text-muted mb-3 gap-1" style="font-size: 0.8rem;">
                    <span v-show="(currentUserRole === 'stud' || drive.Status === 'Pending') && drive.Location" class="badge bg-light text-success border fw-normal"><i class="bi bi-geo-alt-fill me-1 text-success"></i> {{ drive.Location }}</span>
                    <span v-show="(currentUserRole === 'stud' || drive.Status === 'Pending')&& drive.WorkMode" class="badge bg-light border fw-normal text-dark"><i class="bi bi-laptop me-1"></i> {{ drive.WorkMode }}</span>
                    <span v-if="(currentUserRole === 'stud' || drive.Status === 'Pending')&& drive.Salary && drive.Type === 'Job'" class="badge bg-light border fw-normal" style="color: #016d88;"><i class="bi bi-cash-stack me-1"></i> {{ drive.Salary }} LPA</span>
                    <span v-else-if="(currentUserRole === 'stud' || drive.Status === 'Pending')&& drive.Salary && drive.Type === 'Internship'" class="badge bg-light border" style="color: #016d88"><i class="bi bi-cash-stack me-1"></i>{{ drive.Salary }} /month</span>
                    <span v-show="(currentUserRole === 'stud' || drive.Status === 'Pending')&& drive.Duration" class="badge bg-light border fw-normal text-info"><i class="bi bi-clock-history me-1"></i> {{ drive.Duration }} months</span>
                    <span v-show="(currentUserRole === 'stud' && drive.Type) || drive.Status === 'Pending'" class="badge bg-light text-dark border">{{drive.Type}}</span>
                    <span v-show="(currentUserRole==='comp' || currentUserRole=='admin') && drive.Status==='Active'" class="badge bg-primary me-2">Total: {{driveStats.total_applicants}}</span>
                    <span v-show="(currentUserRole==='comp' || currentUserRole=='admin') && drive.Status==='Active'" class="badge bg-warning text-dark me-2">Shortlisted: {{driveStats.shortlisted}}</span>
                    <span v-show="(currentUserRole==='comp' || currentUserRole=='admin') && drive.Status==='Active'" class="badge bg-success">Hired: {{driveStats.hired}}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                    <small v-if="(currentUserRole ==='comp' || currentUserRole ==='admin') && drive.Status==='Active' && driveStats.new_count>0" class="text-success d-block my-1">
                        ⬆️ {{driveStats.new_count}} since yesterday
                    </small>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                    <div class="text-start">
                        <small v-if="currentUserRole === 'stud'" class="text-muted d-block" style="font-size: 0.75rem; color: red;">Apply by</small>
                        <small v-else-if="drive.Status === 'Rejected'" class="text-muted d-block" style="font-size: 0.75rem;">Rejection Date</small>
                        <small v-else class="text-muted d-block" style="font-size: 0.75rem;">Application Deadline</small>
                        <small v-if="drive.Status === 'Rejected'" class="font-weight-bold">{{ formatDateTime(drive.RejectionDate, false) }}</small>
                        <small v-else class="font-weight-bold">{{ formatDateTime(drive.ApplyDeadline, false) }}</small>
                    </div>

                    <div v-if="currentUserRole === 'stud' && drive.Status !== 'Rejected'" class="d-flex align-items-center gap-2">
                        <span v-if="['Application Closed', 'Closed'].includes(drive.Status) || isDeadlinePassed(drive.ApplyDeadline)" class="badge bg-danger">Application Closed</span>
                        <span v-else-if="!eligibilityStatus.eligible" class="badge bg-danger" :title="eligibilityStatus.reason">Not Eligible</span>
                        
                        <button v-if="hasApplied" class="btn btn-warning btn-sm px-3 rounded-pill" disabled>
                            Applied
                        </button>
                        <button v-else-if="eligibilityStatus.eligible && !['Application Closed', 'Closed'].includes(drive.Status) && !isDeadlinePassed(drive.ApplyDeadline)" @click="$emit('apply', drive.DriveID)" class="btn btn-primary btn-sm px-3 rounded-pill" style="background-color: #003366; border: none;">
                            Apply Now
                        </button>
                        <button v-else @click="$emit('apply', drive.DriveID)" class="btn btn-outline-secondary btn-sm px-3 rounded-pill bg-white">
                            View
                        </button>
                        <button v-if="hasApplied" @click="$emit('apply', drive.DriveID)" class="btn btn-outline-info btn-sm ms-2">View Drive</button>
                    </div>

                    <div v-if="currentUserRole === 'comp' && drive.Status === 'Rejected'">
                        <button @click="$emit('viewNote', drive)" class="btn btn-outline-warning btn-sm">View Note</button>
                        <button @click="$emit('view', drive)" class="btn btn-outline-info btn-sm ms-2">View</button>
                    </div>
                    <div v-else-if="currentUserRole === 'comp'">
                        <button @click="$emit('view', drive)" class="btn btn-outline-primary btn-sm">View</button>
                        <span v-if="drive.Status === 'Active'">
                            <button @click="$emit('close-applications', drive.DriveID)" class="btn btn-outline-warning btn-sm ms-2">Close Applications</button>
                            <button @click="$emit('close-drive', drive.DriveID)" class="btn btn-outline-danger btn-sm ms-2">Close Drive</button>
                        </span>
                        <span v-else-if="drive.Status === 'Application Closed'">
                            <button @click="$emit('close-drive', drive.DriveID)" class="btn btn-outline-danger btn-sm ms-2">Close Drive</button>
                        </span>
                    </div>

                    <div v-if="currentUserRole === 'admin'">
                        <button @click="$emit('view', drive)" class="btn btn-outline-info btn-sm">View Insights</button>
                        <button @click="$emit('interviews', drive)" class="btn btn-outline-secondary btn-sm ms-2">Interviews</button>
                        <button v-if="drive.Remark" @click="$emit('viewNote', drive)" class="btn btn-outline-warning btn-sm ms-2">
                            {{ drive.Status === 'Rejected' ? 'View Remark' : 'View Reason' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        drive: { type: Object, required: true, default: () => ({ company_name: 'Loading...', role: 'Please wait', deadline: '', logo: '' }) },
        isDetailview: { type: Boolean, required: true, default: false },
        currentUserRole: { type: String, required: true },
        studentProfile: { type: Object, default: () => ({}) },
        hasApplied: { type: Boolean, default: false }
    },
    data() {
        return {
            driveStats: { total_applicants: 0, shortlisted: 0, hired: 0, new_count: 0 },
        };
    },
    computed: {
        eligibilityStatus() {
            if (this.currentUserRole !== 'stud' || !this.studentProfile || !this.drive) {
                return { eligible: true, reason: '' };
            }
            
            // 1. Check CGPA
            const studentCGPA = parseFloat(this.studentProfile.cgpa) || 0;
            const driveMinCGPA = parseFloat(this.drive.min_cgpa) || 0;
            if (driveMinCGPA > 0 && studentCGPA < driveMinCGPA) {
                return { eligible: false, reason: `Requires CGPA >= ${this.drive.min_cgpa}. Yours is ${studentCGPA}.` };
            }
            
            // 2. Check Department
            const driveDepts = Array.isArray(this.drive.Departments) ? this.drive.Departments.map(d => (typeof d === 'object' ? (d.department || '') : String(d)).toLowerCase().trim()) : [];
            const myDept = (this.studentProfile.department || '').toLowerCase().trim();
            if (driveDepts.length > 0 && !driveDepts.includes(myDept)) {
                return { eligible: false, reason: `Not open for the ${this.studentProfile.department} department.` };
            }

            // 3. Check Skills
            const mySkills = Array.isArray(this.studentProfile.skills) ? this.studentProfile.skills.map(s => s.toLowerCase().trim()) : [];
            const requiredSkills = Array.isArray(this.drive.RequiredSkills) ? this.drive.RequiredSkills.map(s => s.toLowerCase().trim()) : [];
            if (requiredSkills.length > 0) {
                const hasAllSkills = requiredSkills.every(reqSkill => mySkills.includes(reqSkill));
                if (!hasAllSkills) return { eligible: false, reason: `You are missing required skills.` };
            }

            // 4. Check Deadline
            if (this.drive.ApplyDeadline) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const deadline = new Date(this.drive.ApplyDeadline + 'T00:00:00');
                if (deadline < today) {
                    return { eligible: false, reason: 'Application deadline has passed.' };
                }
            }

            return { eligible: true, reason: 'Eligible to apply.' };
        },
    },
    methods: {
        formatDateTime,
        statusBadgeClass(status) {
             switch (status) {
                case 'Active': return 'bg-success';
                case 'Pending': return 'bg-info text-dark';
                case 'Suspended': return 'bg-warning text-dark';
                case 'Rejected':
                case 'Application Closed': return 'bg-danger';
                case 'Closed': return 'bg-dark';
                default: return 'bg-secondary';
            }
        },
        isDeadlinePassed(deadlineStr) {
            if (!deadlineStr) return false;
            const today = new Date();
            today.setHours(0,0,0,0);
            const deadline = new Date(deadlineStr + 'T00:00:00');
            return deadline < today;
        },
        async fetchDriveStats() {
            if (!this.drive.DriveID || (this.currentUserRole !== 'comp' && this.currentUserRole !== 'admin')) return;
            try {
                const response = await fetch(`/api/posted_drive_stats/${this.drive.DriveID}`, {
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                });
                if (response.ok) this.driveStats = await response.json();
                else this.driveStats = { total_applicants: 0, shortlisted: 0, hired: 0, new_count: 0 };
            } catch (error) {
                console.error('Error fetching stats:', error);
                this.driveStats = { total_applicants: 0, shortlisted: 0, hired: 0, new_count: 0 };
            }
        }
    },
    watch: {
        'drive.DriveID': { immediate: true, handler() { this.fetchDriveStats(); } }
    },
}
export default StudentResource;