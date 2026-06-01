const Login={
    template: `
        <div class="d-flex justify-content-center align-items-center vh-100">
            <div class="card shadow p-4 border rounded-3 ">
                <h3 class="card-title text-center mb-4">Login</h3>
                
                <!-- Error Alert -->
                <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
                    {{ errorMessage }}
                    <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
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
                        <label for="password" class="form-label">Password</label>
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
        </div>
    `,
    data(){
        return{
            email: '',
            password: '',
            errorMessage: '',
            successMessage: '',
            isLoading: false
        }
    },
    methods:{
        async submitInfo(){
            // Reset messages
            this.errorMessage = '';
            this.successMessage = '';
            
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