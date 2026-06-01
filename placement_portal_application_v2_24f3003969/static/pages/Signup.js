const SignUp={
    template: `
         <div class="d-flex justify-content-center align-items-center vh-100">
            <div class="card shadow p-4 border rounded-3 w-50">
                <h3 class="card-title text-center mb-4">Create Account</h3>
                
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
                        <label class="form-label">Email</label>
                        <input v-model="email" type="email" class="form-control" placeholder="Email/Official Email" required/>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Password</label>
                        <input v-model="password" type="password" class="form-control" placeholder="Password (min 6 characters)" required/>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Confirm Password</label>
                        <input v-model="confirmPassword" type="password" class="form-control" placeholder="Confirm Password" required/>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Select Role</label>
                        <select v-model="role" class="form-select" aria-label="Select role" required>
                            <option value="" disabled selected hidden>Choose your role...</option>
                            <option value="stud">Candidate (Student)</option>
                            <option value="comp">Employer (Company)</option>
                        </select>
                    </div>
                    <div class="form-group mb-3">
                        <input type="checkbox" id="terms" v-model="agreeTerms" required/>
                        <label for="terms" class="ms-2">I agree to the <a href="#" class="text-primary">Terms and Conitions</a></label>
                    </div>
                    <button type="submit" class="btn btn-primary w-100" :disabled="isLoading">
                        {{ isLoading ? 'Creating Account...' : 'Sign Up' }}
                    </button>
                </form>
                <div class="form-group mt-3 text-center">
                    Already have an account? <router-link to='/login'>Login</router-link>
                </div>
            </div>
        </div>
    `,
    data(){
        return{
            email: '',
            password: '',
            confirmPassword: '',
            role: '',
            agreeTerms: false,
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
            
            // Validate inputs
            if (!this.email || !this.password || !this.role) {
                this.errorMessage = 'Please fill in all required fields';
                return;
            }
            
            if (this.password.length < 6) {
                this.errorMessage = 'Password must be at least 6 characters long';
                return;
            }
            
            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match. Please check and try again';
                return;
            }
            
            if (!this.agreeTerms) {
                this.errorMessage = 'You must agree to the Terms and Conditions';
                return;
            }
            
            this.isLoading = true;
            
            try {
                const origin = window.location.origin;
                const url = `${origin}/signup`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password,
                        role: this.role
                    }),
                    credentials: 'same-origin'
                });

                const data = await res.json();
                
                if (res.ok) {
                    this.$store.commit('setLogin', data.token || '');
                    this.$store.commit('setRole', data.role);
                    this.$store.commit('setProfileStatus', false);
                    localStorage.setItem('token', data.token || '');
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('has_profile', false);
                    
                    this.successMessage = 'Account created successfully! Redirecting...';
                    
                    // Redirect immediately for a better user experience
                    if (data.role === 'stud') {
                        this.$router.push('/student_details');
                    } else if (data.role === 'comp') {
                        this.$router.push('/employer_details');
                    }
                } else {
                    this.errorMessage = data.message || 'Signup failed. Please try again.';
                }
            } catch (err) {
                console.error('Signup error:', err);
                this.errorMessage = 'An error occurred during signup. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
    }
}

export default SignUp;