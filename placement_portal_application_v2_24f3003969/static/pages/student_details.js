const StudentDetails = {
    template: `
    <div class="container mt-3 py-5">
        <h2>Complete Profile Page</h2>
        <form @submit.prevent="submitProfile">
            <div class="card mb-4 p-4 shadow-sm dark">
                <h5 class="mb-3">Personal Details</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="text" class="form-control" v-model="profile.name" placeholder="Full Name" required>
                            <label>Full Name</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="String" class="form-control" v-model="profile.roll_no" placeholder="Roll Number" required>
                            <label>Roll Number/ Student ID</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="number" class="form-control" v-model="profile.phone" placeholder="Phone Number" required>
                            <label>Phone Number</label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card mb-4 p-4 shadow-sm dark">
                <h5 class="mb-3">Academic</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="number" step="0.01" min="0" max="10" class="form-control" v-model="profile.cgpa" placeholder="CGPA" required>
                            <label>CGPA (0-10)</label>
                        </div>
                        <small v-if="(profile.cgpa<0 || profile.cgpa>10)" class="text-danger">
                            CGPA must be between 0 and 10
                        </small>
                    </div>
                    <div class="col-md-6">
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <select class="form-select" v-model="profile.department" required>
                                    <option value="" disabled>Select Department</option>
                                    <option v-for="department in availableDepartments" :value="department.department">{{ department.department }}</option>
                                </select>
                                <label>Department</label>
                            </div>
                        </div>
                    </div>
                    <div class="md-6">
                        <div class="form-floating mb-3">
                            <input type="text" v-model="profile.skills" class="form-control" placeholder="Python, Flask, strong communication skills" required>
                            <label>Skills (Comma separated)</label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card mb-4 p-4 shadow-sm dark">
                <h5 class="mb-3">Profesional Links</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="url" v-model="profile.github" class="form-control" placeholder="https://github.com/yourprofile">
                            <label>Github Link</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="url" v-model="profile.linkedin" class="form-control" placeholder="https://www.linkedin.com/in/yourprofile">
                            <label>LinkedIn Link</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-floating mb-3">
                            <input type="url" v-model="profile.certificates_link" class="form-control"
                            placeholder="https://drive.google.co/drive/folders/...">
                            <small class="text-muted"> Ensure link is set to "Anyone with the link can view."</small>
                            <label>Certificates Folder (Google Drive Link)</label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card mb-4 p-4 shadow-sm dark">
                <h5 class="mb-3">About Me</h5>
                <div class="mb-3">
                    <textarea class="form-control" v-model="profile.about_me" placeholder="Write a brief summary about yourself, your career goals, and what you're passionate about. This section helps recruiters understand your motivation and drive." style="height: 120px; resize: none;"></textarea>
                </div>
            </div>
            <div class="card mb-4 p-4 shadow-sm dark">
                <h5 class="mb-3">File Upload</h5>
                <div class="row bg-light text-dark">
                    <div class="col-md-6">
                        <div class="dropzone" @click="triggerFile">
                            <label class="form-label small fw-bold">Upload Resume</label>
                            <input type="file" ref="file" accept=".pdf,.doc,.docx" hidden @change="handleResumeUpload">
                            <small class="text-muted d-block mt-1">Accepted formats: PDF, DOC, DOCX (Max 5MB)</small>
                        </div>
                        <div v-if="profile.resume">
                            <button class="mt-2">File: {{profile.resume.name}} ({{(profile.resume.size/1024).toFixed(5) }} KB)</button>
                            <p v-if="fileTooLarge" class="text-danger">File too large! Max 5MB </p>
                        </div>
                    </div>
                </div>
            </div>
            <button type="submit" class="btn btn-success rounded-pill px-4" :disabled="!isFormValid">Register</button>
        </form>
    </div>
    `,
    data() {
        return {
            availableDepartments: [],
            profile: {
                name:'',
                roll_no: '',
                phone: '',
                cgpa: '',
                department:'',
                skills: '',
                github:'',
                linkedin:'',
                certificates_link:'',
                resume:'',
                about_me: '',
            }
        };
    },
    computed: {
        isFormValid(){
            return this.profile.name && this.profile.cgpa>=0 && this.profile.cgpa<=10 && !this.fileTooLarge && 
            this.profile.resume && this.profile.roll_no && this.profile.phone && this.profile.department;
        },
        fileTooLarge(){
            return this.profile.resume && this.profile.resume.size>5*1024*1024;
        }
    },
    methods: {
        triggerFile(){
            this.$refs.file.click()
        },
        handleResumeUpload(event) {
            this.profile.resume = event.target.files[0];
        },
        async submitProfile() {
            try{
                const formData=new FormData();
                for (let key in this.profile){
                    formData.append(key,this.profile[key]);
                }
                const res = await fetch(window.location.origin + '/api/student_details', {
                    method: 'POST',
                    credentials: 'include',
                    headers:{
                        'Authentication-Token': localStorage.getItem('token'),
                    },
                    body: formData
                });
                if (res.ok) {
                    alert("Profile saved successfully!");
                    this.$store.commit('setProfileStatus',true);
                    this.$store.commit('setUserName',this.profile.name);
                    this.$router.push('/student_dashboard');
                }
            } catch(error){
                console.log("Upload Failed",error);
            }
        }
    },
    async mounted() {
        const res = await fetch(window.location.origin + '/api/departments', {
            headers: {
                'Authentication-Token': localStorage.getItem('token')
            }
        });
        if (res.ok) {
            this.availableDepartments = await res.json();
        } else {
            console.error('Failed to load departments:', res.status);
        }
    }
}

export default StudentDetails