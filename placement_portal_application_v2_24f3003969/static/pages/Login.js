const Login={
    template: `
        <div class="d-flex justify-content-center align-items-center vh-100">
            <div class="card shadow p-4 border rounded-3 ">
                <h3 class="card-title text-center mb-4">Login</h3>
                
                <!-- Error Alert -->
                <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
                    <span v-html="errorMessage"></span>
                    <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
                    <div v-if="showRejectedProfileBtn" class="mt-2 text-end">
                        <button type="button" class="btn btn-sm btn-outline-danger" @click="showRejectedProfileModal = true">
                            View Submitted Profile
                        </button>
                    </div>
                </div>
                
                <!-- Success Alert -->
                <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
                    {{ successMessage }}
                    <button type="button" class="btn-close" @click="successMessage = ''" aria-label="Close"></button>
                </div>
                
                <form @submit.prevent="submitInfo">
                    <div class="form-group mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input v-model="email" type="email" class="form-control" placeholder="hello@example.com" required/>
                    </div>
                    <div class="form-group mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label for="password" class="form-label mb-0">Password</label>
                            <a href="#" @click.prevent="forgotPassword" class="text-decoration-none small">Forgot Password?</a>
                        </div>
                        <input v-model="password" type="password" class="form-control" placeholder="Must be atleast 6 characters" required/>
                    </div>
                    <button class="btn btn-primary w-100" type="submit" :disabled="isLoading">
                        {{ isLoading ? 'Logging in...' : 'Submit' }}
                    </button>
                </form>
                <br><br>
                <div class="text-center">
                    Don't have an account? <router-link to='/signup'>Register</router-link>
                </div>
            </div>

            <!-- Rejected Profile Modal -->
            <div v-if="showRejectedProfileModal" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5); z-index: 1050;">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title"><i class="bi bi-building me-2"></i>Submitted Profile: {{ rejectedProfileData?.company_name }}</h5>
                            <button type="button" class="btn-close btn-close-white" @click="showRejectedProfileModal = false"></button>
                        </div>
                        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                            <div class="row g-3 text-start">
                                <div class="col-md-6">
                                    <strong class="text-muted d-block small">Company Name</strong>
                                    <span class="fs-6 fw-semibold text-dark">{{ rejectedProfileData?.company_name }}</span>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-muted d-block small">Primary Email</strong>
                                    <span class="fs-6 text-dark">{{ rejectedProfileData?.email }}</span>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-muted d-block small">Website</strong>
                                    <a :href="rejectedProfileData?.website" target="_blank">{{ rejectedProfileData?.website }}</a>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-muted d-block small">Contact Number</strong>
                                    <span class="fs-6 text-dark">{{ rejectedProfileData?.contact }}</span>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-muted d-block small">GSTIN</strong>
                                    <span class="fs-6 text-dark">{{ rejectedProfileData?.gstin }}</span>
                                </div>
                                <div class="col-md-6" v-if="rejectedProfileData?.secondary_email">
                                    <strong class="text-muted d-block small">Secondary Email</strong>
                                    <span class="fs-6 text-dark">{{ rejectedProfileData?.secondary_email }}</span>
                                </div>
                                <div class="col-12">
                                    <strong class="text-muted d-block small">Office Address</strong>
                                    <span class="fs-6 text-dark">{{ rejectedProfileData?.address }}</span>
                                </div>
                                <div class="col-12" v-if="rejectedProfileData?.description">
                                    <strong class="text-muted d-block small">Description</strong>
                                    <p class="mb-0 bg-light p-3 rounded text-dark" style="white-space: pre-wrap;">{{ rejectedProfileData?.description }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="showRejectedProfileModal = false">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data(){
        return{
            email: '',
            password: '',
            errorMessage: '',
            successMessage: '',
            isLoading: false,
            showRejectedProfileBtn: false,
            showRejectedProfileModal: false,
            rejectedProfileData: null
        }
    },
    methods:{
        async forgotPassword() {
            this.errorMessage = '';
            this.successMessage = '';
            
            if (!this.email) {
                this.errorMessage = 'Please enter your email address in the Email field first.';
                return;
            }
            
            const confirmed = window.confirm(`Are you sure you want to reset the password for ${this.email}?`);
            if (!confirmed) {
                return;
            }
            
            this.isLoading = true;
            try {
                const url = window.location.origin;
                const res = await fetch(url + '/api/forgot_password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: this.email }),
                });
                
                const data = await res.json();
                if (res.ok) {
                    this.successMessage = data.message;
                } else {
                    this.errorMessage = data.message || 'Failed to send password reset request.';
                }
            } catch (error) {
                console.error('Forgot password error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
        async submitInfo(){
            // Reset messages
            this.errorMessage = '';
            this.successMessage = '';
            this.showRejectedProfileBtn = false;
            
            // Validate input
            if (!this.email || !this.password) {
                this.errorMessage = 'Email and password are required';
                return;
            }
            this.isLoading = true;
            try {
                const url = window.location.origin;
                const res = await fetch(url + '/login_form', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({email: this.email, password: this.password}),
                });
                
                const data = await res.json();
                
                if(res.ok){
                    // Login successful
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('has_profile', data.has_profile);
                    this.$store.commit('setLogin', data.token || '');
                    this.$store.commit('setRole', data.role);
                    this.$store.commit('setUserName', data.userName);
                    this.$store.commit('setProfileStatus', data.has_profile);
                    
                    this.successMessage = 'Login Successful! Redirecting...';
                    
                    // Redirect based on role and profile status
                    // setTimeout(() => {
                        if(data.role === 'stud' && data.has_profile){
                            this.$router.push('/student_dashboard');
                        }
                        else if(data.role === 'stud'){
                            this.$router.push('/student_details');
                        }
                        else if(data.role === 'comp' && data.has_profile){
                            this.$router.push('/company_dashboard');
                        }
                        else if(data.role === 'comp'){
                            this.$router.push('/employer_details');
                        }
                        else if(data.role === 'admin'){
                            if (data.needs_department_setup) {
                                this.$router.push({ path: '/admin_dashboard', query: { setup: 'department' } });
                            } else {
                                this.$router.push('/admin_dashboard');
                            }
                        }
                        else {
                            this.$router.push('/');
                        }
                    // }, 1000);
                } else {
                    // Login failed
                    this.errorMessage = data.message || 'Login failed. Please try again.';
                    if (data.is_rejected) {
                        this.showRejectedProfileBtn = true;
                        this.rejectedProfileData = data.profile;
                    }
                }
            } catch(error) {
                console.error('Login error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
    }
}

export default Login;