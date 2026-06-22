import StudentResource from '../components/StudentResource.js';
import DriveDetailsView from '../components/drive_details_view.js';

const PlacementDrives = {
    template: `
    <div v-if="!selectedDrive.DriveID" class="container-fluid pt-3 pb-1" style="height: calc(100vh - 70px); overflow: hidden;">
        <div class="row h-100">
            <div class="col-md-4 col-lg-3 h-100">
                <div class="card border-0 shadow-sm p-2 rounded-4 bg-light h-100 d-flex flex-column">
                    
                    <div class="text-center mb-2 mt-1">
                        <img :src="profile.profile_pic || 'static/images/default-avtar.png'" 
                             class="rounded-circle border border-3 border-white shadow-sm mb-1" 
                             width="90" style="object-fit: cover; height: 90px;">
                        <div>
                            <p class="text-muted small text-uppercase mb-0 fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">Welcome back</p>
                            <h6 class="fw-bold mb-0 text-dark">{{profile.name}}</h6>
                        </div>
                    </div>
                    
                    <hr class="my-2 opacity-25">
                    
                    <div class="d-flex justify-content-between text-center my-2 px-2">
                        <div>
                            <h4 class="fw-bold mb-0 lh-1">{{ applicationStats.total }}</h4>
                            <small class="text-muted" style="font-size: 0.75rem;">Applied</small>
                        </div>
                        <div>
                            <h4 class="fw-bold mb-0 lh-1">{{ applicationStats.shortlisted }}</h4>
                            <small class="text-muted" style="font-size: 0.75rem;">Shortlisted</small>
                        </div>
                        <div>
                            <h4 class="fw-bold mb-0 lh-1 text-success">{{ applicationStats.offers }}</h4>
                            <small class="text-muted" style="font-size: 0.75rem;">Offers</small>
                        </div>
                    </div>
                    <router-link to="/student_applications_and_interviews" class="btn btn-outline-primary btn-sm w-100 mt-2 mb-2 rounded-pill fw-medium py-2">View Applications</router-link>
                    
                    <hr class="my-2 opacity-25">
                    
                    <div class="filter-section flex-grow-1 d-flex flex-column justify-content-around pb-2">
                        <div>
                            <p class="text-uppercase fw-bold text-secondary mb-1 mt-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Controls</p>
                            
                            <div class="form-check form-switch mb-3 bg-white p-2 rounded-3 shadow-sm d-flex align-items-center border">
                                <input class="form-check-input ms-0 me-2 mt-0" type="checkbox" role="switch" id="skillsMatch" v-model="isEligible">
                                <label class="form-check-label fw-semibold mb-0" for="skillsMatch" style="font-size: 0.85rem;">
                                    <i class="bi bi-stars text-primary me-1"></i>Match My Skills
                                </label>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-muted mb-1" style="font-size: 0.8rem;">Placement Type</label>
                                <select class="form-select form-select-sm border-0 shadow-sm rounded-3 py-2" v-model="selectedType">
                                    <option value="">All Type</option>
                                    <option value="Job">Job</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-muted mb-1" style="font-size: 0.8rem;">Sort By</label>
                                <select class="form-select form-select-sm border-0 shadow-sm rounded-3 py-2" v-model="selectedSort">
                                    <option value="relevance">Relevance (Default)</option>
                                    <option value="package_desc">Package / Stipend (High to Low)</option>
                                    <option value="package_asc">Package / Stipend (Low to High)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mb-1 mt-auto">
                            <label class="form-label fw-semibold text-muted d-block mb-2" style="font-size: 0.8rem;">Drive Status</label>
                            <div class="btn-group w-100 shadow-sm rounded-3" role="group">
                                <input type="radio" class="btn-check" name="driveStatus" id="btnActive" value="Active" v-model="currentStatus" @change="fetchDrives">
                                <label class="btn btn-outline-primary btn-sm fw-medium py-2" for="btnActive">Active</label>

                                <input type="radio" class="btn-check" name="driveStatus" id="btnClosed" value="Application Closed" v-model="currentStatus" @change="fetchDrives">
                                <label class="btn btn-outline-primary btn-sm fw-medium py-2" for="btnClosed">Past Drives</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        
            <div class="col-md-8 col-lg-9 h-100 d-flex flex-column">
                <div v-if="isHiredForJob" class="alert alert-success text-center p-4 shadow-sm border-0 rounded-4">
                    <h4 class="alert-heading fw-bold"><i class="bi bi-check-circle-fill me-2"></i>Congratulations on Your Placement!</h4>
                    <p class="mb-0">You have accepted a job offer and are no longer eligible to apply for new drives. All your other pending applications have been cancelled.</p>
                </div>
                <div v-else class="d-flex flex-column h-100">
                    
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h4 class="fw-bold mb-0">Placement Drives</h4>
                        <span class="badge bg-primary bg-gradient rounded-pill px-3 py-2 shadow-sm">{{ filteredResources.length }} Available</span>
                    </div>
                    
                    <div class="mb-3">
                        <div class="input-group shadow-sm rounded-pill overflow-hidden border">
                            <span class="input-group-text bg-white border-0 ps-3 pe-1"><i class="bi bi-search text-muted"></i></span>
                            <input 
                                type="text" 
                                class="form-control border-0 shadow-none bg-white" 
                                placeholder="Search Company, Role, Location..." 
                                v-model="searchQuery"
                                @keyup.enter="handleSearch"
                            >
                            <button class="btn btn-primary px-4 fw-bold" @click="handleSearch" style="background-color: #003366;">Search</button>
                        </div>
                    </div>

                    <div class="row g-3 drive-scrollable flex-grow-1" style="overflow-y: auto; overflow-x: hidden; padding-right: 5px; padding-bottom: 20px;">
                        <div v-for="drive in filteredResources" :key="drive.DriveID" class="col-12 col-lg-6">
                            <student-resource 
                                :drive="drive"
                                :isDetailview="false"  
                                @apply="handleApply"
                                :current-user-role="userRole"
                                :student-profile="profile"
                                :has-applied="hasStudentApplied(drive.DriveID)" />
                        </div>
                        <div v-if="filteredResources.length === 0" class="col-12 text-center text-muted mt-5">
                            <div class="bg-light rounded-4 p-5">
                                <i class="bi bi-funnel fs-1 opacity-25 mb-3 d-block"></i>
                                <h6 class="fw-bold">No drives found</h6>
                                <p class="small mb-0">Try adjusting your filters or search query.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div v-else>
        <drive-details-view 
            v-if="selectedDrive && selectedDrive.DriveID"
            @success="handleApplicationSuccess"
            @cancel="selectedDrive = {}"
            :drive="selectedDrive" 
            @back="selectedDrive = {}"
            mode="student" />
    </div>
    `,
    data() {
        return {
            allResources: [],
            myApplications: [],
            isEligible: false, // This powers the "Match My Skills" toggle
            selectedType: '',
            selectedSort: 'relevance',
            currentStatus: '',
            searchQuery: '',
            selectedDrive: {},
            profile: {
                name: '',
                profile_pic: '',
                department: '',
                cgpa: 0,
                skills: []
            },
        }
    },
    components: { StudentResource, DriveDetailsView },
    computed: {
        userRole() {
            return this.$store.state.role;
        },
        isHiredForJob() {
            return this.myApplications.some(app => app.status === 'Hired' && app.drive.Type === 'Job');
        },
        applicationStats() {
            if (!this.myApplications) return { total: 0, shortlisted: 0, offers: 0 };
            const total = this.myApplications.length;
            const shortlisted = this.myApplications.filter(a => ['Shortlisted', 'Selected', 'Hired'].includes(a.status)).length;
            const offers = this.myApplications.filter(a => ['Selected', 'Hired'].includes(a.status)).length;
            return { total, shortlisted, offers };
        },
        filteredResources() {
            if (this.isHiredForJob) return [];
            
            let results = this.allResources || [];
            
            // --- 1. ABSOLUTE BASE FILTER: Department ---
            // A student NEVER sees a drive if their department is excluded
            const myDept = (this.profile.department || '').toLowerCase().trim();
            results = results.filter(drive => {
                const allowedDepts = Array.isArray(drive.Departments) ? drive.Departments.map(d => (typeof d === 'object' ? (d.department || '') : String(d)).toLowerCase().trim()) : [];
                if (allowedDepts.length === 0) return true; // If company left it empty, assume open to all
                return allowedDepts.includes(myDept);
            });

            // --- 2. TOGGLE FILTER: Skill Matching ---
            // If toggled ON, student must match all required skills (strict alignment with eligibility check)
            if (this.isEligible) {
                const mySkills = Array.isArray(this.profile.skills) ? this.profile.skills.map(s => s.toLowerCase().trim()) : [];
                results = results.filter(drive => {
                    const requiredSkills = Array.isArray(drive.RequiredSkills) ? drive.RequiredSkills.map(s => s.toLowerCase().trim()) : [];
                    if (requiredSkills.length === 0) return true; // Drive has no specific skill requirements
                    return requiredSkills.every(reqSkill => mySkills.includes(reqSkill));
                });
            }

            // --- 3. DROPDOWN FILTER: Type ---
            if (this.selectedType) {
                results = results.filter(drive => drive.Type === this.selectedType);
            }
            // --- 3.5. RADIO BUTTON FILTER: Status ---
            if (this.currentStatus) {
                if (this.currentStatus === 'Application Closed') {
                    results = results.filter(drive => ['Application Closed', 'Closed'].includes(drive.Status));
                } else {
                    results = results.filter(drive => drive.Status === this.currentStatus);
                }
            }

            // --- 4. SEARCH FILTER ---
            const query = (this.searchQuery || '').toString().toLowerCase().trim();
            if (query) {
                results = results.filter(drive => {
                    const company = (drive.company_name || '').toString().toLowerCase();
                    const type = (drive.Type || '').toString().toLowerCase();
                    const jobtitle = (drive.JobTitle || '').toString().toLowerCase();
                    const location = (drive.Location || '').toString().toLowerCase();
                    
                    return company.includes(query) || type.includes(query) || jobtitle.includes(query) || location.includes(query);
                });
            }

            // --- 5. SORTING ENGINE ---
            const checkStrictEligibility = (drive) => {
                const myCgpa = parseFloat(this.profile.cgpa) || 0;
                const requiredCgpa = parseFloat(drive.min_cgpa) || 0;
                if (requiredCgpa > 0 && myCgpa < requiredCgpa) return false;

                const mySkills = Array.isArray(this.profile.skills) ? this.profile.skills.map(s => s.toLowerCase().trim()) : [];
                const requiredSkills = Array.isArray(drive.RequiredSkills) ? drive.RequiredSkills.map(s => s.toLowerCase().trim()) : [];
                if (requiredSkills.length > 0) {
                    const hasAllSkills = requiredSkills.every(reqSkill => mySkills.includes(reqSkill));
                    if (!hasAllSkills) return false;
                }
                return true;
            };

            results.sort((a, b) => {
                const getNormalizedSalary = (d) => {
                    const rawVal = parseFloat(d.Salary) || 0;
                    return d.Type === 'Job' ? rawVal * 100000 : rawVal * 12;
                };
                if (this.selectedSort === 'package_desc') {
                    const valA = getNormalizedSalary(a);
                    const valB = getNormalizedSalary(b);
                    return valB - valA;
                } else if (this.selectedSort === 'package_asc') {
                    const valA = getNormalizedSalary(a);
                    const valB = getNormalizedSalary(b);
                    return valA - valB;
                } else {
                    const isAEligible = checkStrictEligibility(a);
                    const isBEligible = checkStrictEligibility(b);
                    if (isAEligible && !isBEligible) return -1; // A to top
                    if (!isAEligible && isBEligible) return 1;  // B to top
                    return 0; 
                }
            });

            return results;
        },
    },
    methods: {
        handleSearch() {
            this.searchQuery = this.searchQuery.trim();
        },
        async handleApply(drive_id) {
            const drive = this.allResources.find(d => d.DriveID === drive_id);
            if (drive) this.selectedDrive = drive;
        },
        handleApplicationSuccess(driveId) {
            this.selectedDrive = {};
            alert("Application submitted successfully!");
            this.fetchDrives();
            this.fetchMyApplications();
        },
        hasStudentApplied(driveId) {
            return this.myApplications.some(app => app.DriveID === driveId);
        },
        async fetchDrives() {
            try {
                const res = await fetch('/api/placement_drives', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) this.allResources = await res.json();
                else this.allResources = [];
            } catch (err) { console.error('Fetch error:', err); this.allResources = []; }
        },
        async fetchMyApplications() {
            const appres = await fetch('/api/student_applications_api', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (appres.ok) this.myApplications = await appres.json();
        }
    },
    async created() {
        const profRes = await fetch('/api/student_profile', {
            headers: { 'Authentication-Token': localStorage.getItem('token') }
        });
        if (profRes.ok) this.profile = await profRes.json();
        
        this.fetchMyApplications();
        this.fetchDrives();
    }
};

export default PlacementDrives;