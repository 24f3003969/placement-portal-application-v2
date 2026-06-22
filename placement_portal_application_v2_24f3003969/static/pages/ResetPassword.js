const ResetPassword = {
    template: `
        <div class="d-flex justify-content-center align-items-center vh-100">
            <div class="card shadow p-4 border rounded-3 " style="width: 100%; max-width: 400px;">
                <h3 class="card-title text-center mb-4">Reset Password</h3>
                
                <!-- Error Alert -->
                <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
                    <span>{{ errorMessage }}</span>
                    <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
                </div>
                
                <!-- Success Alert -->
                <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
                    {{ successMessage }}
                    <button type="button" class="btn-close" @click="successMessage = ''" aria-label="Close"></button>
                </div>
                
                <form v-if="hasToken" @submit.prevent="submitReset">
                    <div class="form-group mb-3">
                        <label for="password" class="form-label">New Password</label>
                        <input v-model="password" type="password" class="form-control" placeholder="Must be atleast 6 characters" required/>
                    </div>
                    <div class="form-group mb-4">
                        <label for="confirmPassword" class="form-label">Confirm New Password</label>
                        <input v-model="confirmPassword" type="password" class="form-control" placeholder="Confirm your new password" required/>
                    </div>
                    <button class="btn btn-primary w-100" type="submit" :disabled="isLoading">
                        {{ isLoading ? 'Resetting...' : 'Change Password' }}
                    </button>
                </form>
                
                <div v-else class="text-center text-danger">
                    <p><i class="bi bi-exclamation-triangle-fill fs-2"></i></p>
                    <p>Invalid, missing, or expired password reset link.</p>
                    <router-link to="/login" class="btn btn-outline-primary mt-2">Go to Login</router-link>
                </div>
                
                <br>
                <div class="text-center">
                    Back to <router-link to='/login'>Login</router-link>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            password: '',
            confirmPassword: '',
            errorMessage: '',
            successMessage: '',
            isLoading: false,
            token: '',
            hasToken: false
        }
    },
    created() {
        // Read token from query params
        this.token = this.$route.query.token;
        if (this.token) {
            this.hasToken = true;
        } else {
            this.errorMessage = 'Password reset token is missing. Please check your email link.';
        }
    },
    methods: {
        async submitReset() {
            this.errorMessage = '';
            this.successMessage = '';
            
            if (!this.password || !this.confirmPassword) {
                this.errorMessage = 'All fields are required.';
                return;
            }
            
            if (this.password.length < 6) {
                this.errorMessage = 'Password must be at least 6 characters long.';
                return;
            }
            
            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match.';
                return;
            }
            
            this.isLoading = true;
            try {
                const url = window.location.origin;
                const res = await fetch(url + '/api/reset_password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: this.token,
                        password: this.password
                    }),
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    this.successMessage = 'Your password has been successfully reset! Redirecting to login...';
                    setTimeout(() => {
                        this.$router.push('/login');
                    }, 2000);
                } else {
                    this.errorMessage = data.message || 'Failed to reset password. The link may have expired.';
                }
            } catch (error) {
                console.error('Reset password error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
    }
}

export default ResetPassword;
