import StudentResource from '../components/StudentResource.js';
import DriveDetailsView from '../components/drive_details_view.js';
import { formatDateTime } from '../utils/formatDateTime.js';

const StudentDashboard = {
    template: `
    <div class="container-fluid py-3">
        <h4 class="fw-bold mb-3">Dashboard</h4>

        <div class="row g-3 mb-3">
            <div class="col-md-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div>
                            <h6 class="text-muted mb-1 fw-bold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">Active Apps</h6>
                            <h4 class="mb-0 fw-bolder text-dark">{{ stats.appliedCount }}</h4>
                        </div>
                        <div class="bg-primary bg-opacity-10 rounded p-2 d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                            <i class="bi bi-briefcase-fill text-primary fs-5 lh-1"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div>
                            <h6 class="text-muted mb-1 fw-bold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">Interviews</h6>
                            <h4 class="mb-0 fw-bolder text-dark">{{ stats.upcomingInterviewsCount }}</h4>
                        </div>
                        <div class="bg-warning bg-opacity-10 rounded p-2 d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                            <i class="bi bi-calendar-event-fill text-warning fs-5 lh-1"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div>
                            <h6 class="text-muted mb-1 fw-bold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">Placements</h6>
                            <h4 class="mb-0 fw-bolder text-success">{{ stats.hiredCount }}</h4>
                        </div>
                        <div class="bg-success bg-opacity-10 rounded p-2 d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                            <i class="bi bi-trophy-fill text-success fs-5 lh-1"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body p-3 d-flex flex-column justify-content-center">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <h6 class="text-muted mb-0 fw-bold text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">Profile Strength</h6>
                            <h4 class="mb-0 fw-bolder" :class="{'text-danger': profileStrength.score < 50, 'text-warning': profileStrength.score >= 50 && profileStrength.score < 80, 'text-success': profileStrength.score >= 80}">{{ profileStrength.score }}%</h4>
                        </div>
                        <div v-if="profileStrength.score < 100">
                            <div class="progress bg-light border mb-2" style="height: 6px;">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                     :class="{'bg-danger': profileStrength.score < 50, 'bg-warning': profileStrength.score >= 50 && profileStrength.score < 80, 'bg-success': profileStrength.score >= 80}"
                                     role="progressbar" 
                                     :style="{ width: profileStrength.score + '%' }" 
                                     :aria-valuenow="profileStrength.score" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <div class="text-muted" style="font-size: 0.65rem; line-height: 1.2;">
                                <span class="fw-bold text-danger">Missing:</span> {{ profileStrength.missing.slice(0, 2).join(', ') }}<span v-if="profileStrength.missing.length > 2">...</span>
                                <router-link to="/student_profile" class="text-decoration-none ms-1 fw-bold">Update</router-link>
                            </div>
                        </div>
                        <div v-else class="text-success fw-bold d-flex align-items-center mt-1" style="font-size: 0.8rem;">
                            <i class="bi bi-check-circle-fill me-2 fs-5"></i> Completed
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-3">
            <div class="col-md-8">
                <div v-if="nextEvent" class="card shadow-sm border-0 mb-3 bg-gradient text-white" :class="nextEvent.status === 'suspended' ? 'bg-warning text-dark' : 'bg-primary'">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between gap-3">
                        <div>
                            <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-bell-fill me-2 fs-6" :class="nextEvent.status === 'suspended' ? 'text-danger' : 'text-warning'"></i>
                                <span class="text-uppercase fw-bold" :class="nextEvent.status === 'suspended' ? 'text-dark opacity-75' : 'text-white-50'" style="font-size: 0.7rem; letter-spacing: 1px;">
                                    {{ nextEvent.status === 'suspended' ? 'TEMPORARILY ON HOLD' : 'Up Next' }}
                                </span>
                            </div>
                            <h6 class="fw-bold mb-1 text-white" :class="nextEvent.status === 'suspended' ? 'text-dark' : 'text-white'">{{ nextEvent.drive.company_name }} <span class="fw-normal fs-6 opacity-75">| {{ nextEvent.drive.JobTitle }}</span></h6>
                            <p class="mb-2 small opacity-75" :class="nextEvent.status === 'suspended' ? 'text-dark' : 'text-white'"><strong>Round {{ nextEvent.round_no }}:</strong> {{ nextEvent.round_name }}</p>
                            <div v-if="nextEvent.status === 'suspended'">
                                <span class="small fw-bold text-danger"><i class="bi bi-pause-circle-fill me-1"></i>Interview Paused (Drive Suspended)</span>
                            </div>
                            <div v-else-if="nextEvent.location_or_link">
                                <span v-if="nextEvent.datetime" class="small">{{formatDateTime(nextEvent.datetime, true)}}</span>
                                <a v-if="isUrl(nextEvent.location_or_link)" :href="nextEvent.location_or_link" target="_blank" class="btn btn-sm btn-light fw-bold rounded-pill px-3 shadow-sm text-primary" style="font-size: 0.8rem;">
                                    Join Meeting <i class="bi bi-camera-video-fill ms-1"></i>
                                </a>
                                <span v-else class="small"><i class="bi bi-geo-alt-fill me-1 text-warning"></i>{{ nextEvent.location_or_link }}</span>
                            </div>
                        </div>
                        <div class="bg-white bg-opacity-10 rounded p-2 text-center shadow-sm" style="min-width: 80px;">
                            <h3 class="fw-bolder mb-0 lh-1">{{ countdown.time }}</h3>
                            <span class="small text-uppercase fw-semibold opacity-75" style="font-size: 0.7rem; letter-spacing: 1px;">{{ countdown.unit }}</span>
                        </div>
                    </div>
                </div>
                <div v-else class="alert alert-secondary border-0 shadow-sm mb-3 d-flex align-items-center text-muted p-2">
                    <i class="bi bi-calendar2-check fs-5 me-2 opacity-50"></i>
                    <div class="mb-0 small">No upcoming events scheduled right now. Keep an eye out!</div>
                </div>

                <div v-if="closingSoonDrives.length > 0" class="card shadow-sm border-0 border-start border-danger border-4 p-3 mb-3" style="background-color: #fff5f5;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold text-danger mb-0"><i class="bi bi-stopwatch-fill me-2"></i>Closing Soon</h6>
                        <span class="badge bg-danger rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ closingSoonDrives.length }} Drives</span>
                    </div>
                    <div class="d-flex flex-column gap-2" style="max-height: 200px; overflow-y: auto;">
                        <div v-for="drive in closingSoonDrives" :key="'cs'+drive.DriveID" 
                             class="d-flex align-items-center justify-content-between bg-white rounded-pill p-2 pe-3 border border-danger-subtle shadow-sm hover-shadow transition-all">
                            <div class="d-flex align-items-center">
                                <div class="bg-danger bg-gradient text-white rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold shadow-sm" style="width: 36px; height: 36px; font-size: 0.9rem;">
                                    {{ drive.company_name.charAt(0).toUpperCase() }}
                                </div>
                                <div>
                                    <h6 class="mb-0 fw-bold text-dark lh-1" style="font-size: 0.9rem;">{{ drive.JobTitle }}</h6>
                                    <small class="text-danger fw-medium" style="font-size: 0.75rem;">Closes: {{ formatDateTime(drive.ApplyDeadline, false) }}</small>
                                </div>
                            </div>
                            <button @click="handleApply(drive.DriveID)" class="btn btn-sm btn-danger rounded-pill px-3 shadow-sm fw-bold" style="font-size: 0.75rem;">
                                Apply <i class="bi bi-arrow-right-short"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold mb-0">New Matches For You</h6>
                        <router-link v-if="newMatches.length > 3" to="/placement_drives" class="btn btn-sm btn-link text-decoration-none py-0" style="font-size: 0.8rem;">View All</router-link>
                    </div>
                    
                    <div v-if="newMatches.length > 0">
                        <p class="text-muted mb-2" style="font-size: 0.8rem;"><i class="bi bi-stars text-warning me-1"></i> <strong>{{ newMatches.length }}</strong> new drives match your skills.</p>
                        
                        <div class="d-flex flex-column gap-2">
                            <div v-for="drive in newMatches.slice(0, 3)" :key="drive.DriveID" 
                                 class="d-flex align-items-center justify-content-between bg-light rounded-pill p-2 pe-3 border shadow-sm hover-shadow transition-all">
                                
                                <div class="d-flex align-items-center">
                                    <div class="bg-primary bg-gradient text-white rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold shadow-sm" style="width: 36px; height: 36px; font-size: 0.9rem;">
                                        {{ drive.company_name.charAt(0).toUpperCase() }}
                                    </div>
                                    <div>
                                        <h6 class="mb-0 fw-bold text-dark lh-1" style="font-size: 0.9rem;">{{ drive.JobTitle }}</h6>
                                        <small class="text-muted fw-medium" style="font-size: 0.75rem;">{{ drive.company_name }} • {{ drive.Type }}</small>
                                    </div>
                                </div>
                                
                                <button @click="handleApply(drive.DriveID)" class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm fw-bold" style="font-size: 0.75rem;">
                                    View <i class="bi bi-arrow-right-short"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center text-muted p-2 bg-light rounded-3">
                        <i class="bi bi-search fs-5 text-muted opacity-50 mb-1 d-block"></i>
                        <p class="mb-0" style="font-size: 0.8rem;">No new matches.</p>
                    </div>
                </div>

                <div class="card shadow-sm border-0 p-3 mt-3" v-if="skillGaps.length > 0">
                    <h6 class="fw-bold mb-2"><i class="bi bi-graph-up-arrow text-info me-2"></i>Skills in Demand</h6>
                    <p class="text-muted mb-2" style="font-size: 0.8rem;">Based on active drives you are eligible for, learning these missing skills could boost your employability.</p>
                    <div class="d-flex flex-wrap gap-2">
                        <div v-for="gap in skillGaps" :key="gap.skill" class="bg-info bg-opacity-10 border border-info border-opacity-25 rounded px-2 py-1 text-center flex-grow-1">
                            <span class="d-block fw-bold text-dark text-capitalize" style="font-size: 0.85rem;">{{ gap.skill }}</span>
                            <span class="text-muted" style="font-size: 0.7rem;">{{ gap.count }} drives require this</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm border-0 p-3">
                    <h6 class="fw-bold mb-2">Latest Activity</h6>
                    <hr class="m-0 mb-2">
                    <div v-if="latestActivity.length > 0" class="list-group list-group-flush" style="max-height: 350px; overflow-y: auto;">
                        <div v-for="activity in latestActivity" :key="activity.id" class="list-group-item d-flex justify-content-between align-items-center px-0 border-bottom-0 mb-1 py-1">
                            <div>
                                <p class="mb-0" style="font-size: 0.85rem;"><strong>{{ activity.drive.company_name }}</strong> marked your <strong>{{ activity.drive.JobTitle }}</strong> application as <span :class="statusBadge(activity.display_status)">{{ activity.display_status }}</span>.</p>
                                <small class="text-muted" style="font-size: 0.7rem;">{{ formatRelativeTime(activity.application_datetime) }}</small>
                            </div>
                            <div class="ms-2">
                                <button v-if="activity.display_status === 'Shortlisted'" @click="viewInterview" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-0" style="font-size: 0.75rem;">View</button>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center text-muted p-2" style="font-size: 0.85rem;">
                        No recent application activity.
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="applyDriveModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg" v-if="selectedDriveToApply">
                    <div class="modal-header bg-light border-bottom-0 pb-0">
                        <button type="button" class="btn-close" @click="closeDriveModal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0">
                        <drive-details-view 
                            @success="handleApplicationSuccess"
                            @cancel="closeDriveModal"
                            :drive="selectedDriveToApply" 
                            @back="closeDriveModal"
                            mode="student" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: {
        'student-resource': StudentResource,
        'drive-details-view': DriveDetailsView,
    },
    data() {
        return {
            applications: [],
            interviews: [],
            drives: [],
            profile: {},
            countdown: { time: '0', unit: 'days' },
            timer: null,
            selectedDriveToApply: null,
            applyModalInstance: null // Tracks the Bootstrap modal
        };
    },
    computed: {
        stats() {
            const activeApps = this.applications.filter(app => !app.rejection_reason && ['Pending', 'Shortlisted', 'Selected'].includes(app.status));
            const upcomingInterviews = this.interviews.filter(i => new Date(i.datetime) > new Date() && (i.status === 'scheduled' || i.status === 'suspended'));
            const hired = this.applications.filter(app => app.status === 'Hired');
            return {
                appliedCount: activeApps.length,
                upcomingInterviewsCount: upcomingInterviews.length,
                hiredCount: hired.length,
            };
        },
        nextEvent() {
            const upcoming = this.interviews
                .filter(i => new Date(i.datetime) > new Date() && (i.status === 'scheduled' || i.status === 'suspended'))
                .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            return upcoming.length > 0 ? upcoming[0] : null;
        },
        newMatches() {
            const myDept = (this.profile.department || '').toLowerCase().trim();
            const myCGPA = parseFloat(this.profile.cgpa) || 0;
            const mySkills = Array.isArray(this.profile.skills) ? this.profile.skills.map(s => s.toLowerCase().trim()) : [];
            const appliedDriveIds = this.applications.map(app => app.DriveID);

            return this.drives.filter(drive => {
                // 1. Only active drives
                if (drive.Status !== 'Active') return false;

                // 2. Has not applied yet
                if (appliedDriveIds.includes(drive.DriveID)) return false;

                // 3. Posted in the last 7 days
                if (!drive.PostedDate) return false;
                const todayStr = new Date().toISOString().slice(0, 10);
                const postedStr = new Date(drive.PostedDate).toISOString().slice(0, 10);
                const todayDate = new Date(todayStr);
                const postedDate = new Date(postedStr);
                const diffTime = todayDate - postedDate;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0 || diffDays > 7) return false;

                // 4. Eligible as per eligibility criteria
                // CGPA check
                const driveMinCGPA = parseFloat(drive.min_cgpa) || 0;
                if (driveMinCGPA > 0 && myCGPA < driveMinCGPA) return false;

                // Department check
                const driveDepts = Array.isArray(drive.Departments) ? drive.Departments.map(d => (typeof d === 'object' ? (d.department || '') : String(d)).toLowerCase().trim()) : [];
                if (driveDepts.length > 0 && !driveDepts.includes(myDept)) return false;

                // Skills check
                const requiredSkills = Array.isArray(drive.RequiredSkills) ? drive.RequiredSkills.map(s => s.toLowerCase().trim()) : [];
                if (requiredSkills.length > 0) {
                    const hasAllSkills = requiredSkills.every(reqSkill => mySkills.includes(reqSkill));
                    if (!hasAllSkills) return false;
                }

                // Deadline check
                if (drive.ApplyDeadline) {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const deadline = new Date(drive.ApplyDeadline + 'T00:00:00');
                    if (deadline < today) return false;
                }

                return true;
            });
        },
        latestActivity() {
            return [...this.applications]
                .map(app => ({...app, display_status: app.rejection_reason ? 'Rejected' : app.status}))
                .sort((a, b) => new Date(b.application_datetime) - new Date(a.application_datetime))
                .slice(0, 5);
        },
        profileStrength() {
            let score = 0;
            const missing = [];
            const p = this.profile;
            if (!p || Object.keys(p).length === 0) return { score: 0, missing: ['Profile data loading...'] };

            if (p.resume) score += 10; else missing.push('Resume');
            if (p.linkedin) score += 15; else missing.push('LinkedIn Profile');
            if (p.github) score += 15; else missing.push('GitHub Profile');
            if (p.certificates_link) score += 10; else missing.push('Certificates');
            if (p.profile_pic && !p.profile_pic.includes('default')) score += 10; else missing.push('Profile Picture');
            if (p.about_me) score += 10; else missing.push('About Me');
            const skills = Array.isArray(p.skills) ? p.skills : [];
            if (skills.length >= 3) score += 30;
            else if (skills.length > 0) { score += 15; missing.push('More Skills (add at least 3)'); }
            else missing.push('Skills');

            return { score, missing };
        },
        closingSoonDrives() {
            const now = new Date();
            const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            
            const myDept = (this.profile.department || '').toLowerCase().trim();
            const myCGPA = parseFloat(this.profile.cgpa) || 0;
            const appliedDriveIds = this.applications.map(app => app.DriveID);

            return this.drives.filter(drive => {
                if (appliedDriveIds.includes(drive.DriveID)) return false; 
                if (!drive.ApplyDeadline) return false;
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const deadline = new Date(drive.ApplyDeadline + 'T00:00:00');
                if (deadline < today || deadline > in48Hours) return false; 

                const driveMinCGPA = parseFloat(drive.min_cgpa) || 0;
                if (driveMinCGPA > 0 && myCGPA < driveMinCGPA) return false;

                const driveDepts = Array.isArray(drive.Departments) ? drive.Departments.map(d => (typeof d === 'object' ? (d.department || '') : String(d)).toLowerCase().trim()) : [];
                if (driveDepts.length > 0 && !driveDepts.includes(myDept)) return false;

                return true;
            }).sort((a, b) => new Date(a.ApplyDeadline) - new Date(b.ApplyDeadline));
        },
        skillGaps() {
            const myDept = (this.profile.department || '').toLowerCase().trim();
            const myCGPA = parseFloat(this.profile.cgpa) || 0;
            const mySkills = Array.isArray(this.profile.skills) ? this.profile.skills.map(s => s.toLowerCase().trim()) : [];
            const missingSkillsCount = {};

            this.drives.forEach(drive => {
                const driveMinCGPA = parseFloat(drive.min_cgpa) || 0;
                if (driveMinCGPA > 0 && myCGPA < driveMinCGPA) return;
                const driveDepts = Array.isArray(drive.Departments) ? drive.Departments.map(d => (typeof d === 'object' ? (d.department || '') : String(d)).toLowerCase().trim()) : [];
                if (driveDepts.length > 0 && !driveDepts.includes(myDept)) return;

                const requiredSkills = Array.isArray(drive.RequiredSkills) ? drive.RequiredSkills : (typeof drive.RequiredSkills === 'string' ? drive.RequiredSkills.split(',') : []);
                requiredSkills.forEach(reqSkill => {
                    const skillLower = reqSkill.toLowerCase().trim();
                    if (skillLower && !mySkills.includes(skillLower)) {
                        missingSkillsCount[reqSkill] = (missingSkillsCount[reqSkill] || 0) + 1;
                    }
                });
            });

            return Object.keys(missingSkillsCount)
                .map(skill => ({ skill, count: missingSkillsCount[skill] }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 4); 
        }
    },
    methods: {
        formatDateTime,
        async fetchAllData() {
            const token = localStorage.getItem('token');
            const headers = { 'Authentication-Token': token };

            try {
                const [appRes, interviewRes, driveRes, profileRes] = await Promise.all([
                    fetch('/api/student_applications_api', { headers }),
                    fetch('/api/student_interviews', { headers }),
                    fetch('/api/placement_drives', { headers }), // Fetching ALL, frontend filters them!
                    fetch('/api/student_profile', { headers })
                ]);

                if (appRes.ok) this.applications = await appRes.json();
                if (interviewRes.ok) this.interviews = await interviewRes.json();
                if (driveRes.ok) this.drives = await driveRes.json();
                if (profileRes.ok) this.profile = await profileRes.json();

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        },
        startCountdown() {
            if (this.timer) clearInterval(this.timer);
            if (!this.nextEvent) return;

            this.timer = setInterval(() => {
                const now = new Date();
                const eventTime = new Date(this.nextEvent.datetime);
                const diff = eventTime - now;

                if (diff <= 0) {
                    this.countdown = { time: 'Now', unit: '' };
                    clearInterval(this.timer);
                    return;
                }

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                
                if (days > 0) {
                    this.countdown = { time: days, unit: days > 1 ? 'Days' : 'Day' };
                } else if (hours > 0) {
                    this.countdown = { time: hours, unit: hours > 1 ? 'Hours' : 'Hour' };
                } else {
                    this.countdown = { time: minutes, unit: minutes > 1 ? 'Minutes' : 'Minute' };
                }
            }, 1000 * 60); 
        },
        isUrl(text) {
            return text && (text.startsWith('http://') || text.startsWith('https://'));
        },
        statusBadge(status) {
            switch (status) {
                case 'Pending': return 'badge bg-primary text-white';
                case 'Shortlisted': return 'badge bg-warning text-dark';
                case 'Selected': return 'badge bg-success text-white';
                case 'Rejected': return 'badge bg-danger text-white';
                case 'Hired': return 'badge bg-info text-white';
                default: return 'badge bg-secondary text-white';
            }
        },
        formatRelativeTime(isoString) {
            const date = new Date(isoString);
            const now = new Date();
            const diffSeconds = Math.round((now - date) / 1000);
            const diffMinutes = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMinutes / 60);
            const diffDays = Math.round(diffHours / 24);

            if (diffSeconds < 60) return 'just now';
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-IN');
        },
        viewInterview(){
            this.$router.push({ path: '/student_applications_and_interviews', query: { tab: 'interviews' } } ); 
        },
        
        // --- MODAL LOGIC FOR APPLYING ---
        handleApply(driveId) {
            this.selectedDriveToApply = this.drives.find(d => d.DriveID === driveId);
            // Tell Bootstrap to trigger the modal popup
            if(this.applyModalInstance) {
                this.applyModalInstance.show();
            }
        },
        closeDriveModal() {
            // Hide the modal, then clear the data so it doesn't vanish instantly while animating away
            if(this.applyModalInstance) {
                this.applyModalInstance.hide();
            }
            setTimeout(() => {
                this.selectedDriveToApply = null;
            }, 300);
        },
        handleApplicationSuccess() {
            this.closeDriveModal();
            alert('Application submitted successfully!');
            this.fetchAllData();
        }
        // --------------------------------
    },
    async mounted() {
        await this.fetchAllData();
        this.startCountdown();
        
        // Initialize the Bootstrap Modal once the DOM is ready
        this.$nextTick(() => {
            const modalEl = document.getElementById('applyDriveModal');
            if (modalEl) {
                this.applyModalInstance = new bootstrap.Modal(modalEl);
            }
        });
    },
    beforeDestroy() {
        if (this.timer) clearInterval(this.timer);
    },
    watch: {
        nextEvent(newEvent) {
            if (newEvent) {
                this.startCountdown();
            } else {
                if (this.timer) clearInterval(this.timer);
            }
        }
    }
};

export default StudentDashboard;