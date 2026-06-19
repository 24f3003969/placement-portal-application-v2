const ContactSupport = {
    template: `
    <div class="container my-5 py-4">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow-sm border-0 rounded-4">
                    <div class="card-body p-4 p-md-5">
                        <h2 class="fw-bold text-center mb-3">Contact Support</h2>
                        
                        <!-- Authenticated User Ticketing Flow -->
                        <div v-if="isAuthenticated">
                            <p class="text-muted text-center mb-4">Have a question or facing an issue? Let us know directly below.</p>
                            
                            <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
                            <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
                            
                            <form @submit.prevent="submitQuery" v-if="!successMessage">
                                <div class="mb-3">
                                    <label for="queryText" class="form-label fw-semibold">Your Message</label>
                                    <textarea v-model="message" class="form-control" id="queryText" rows="5" required :disabled="loading" placeholder="Please describe your issue or question in detail..."></textarea>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary btn-lg fw-bold shadow-sm" :disabled="loading">
                                        <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        {{ loading ? ' Submitting...' : 'Submit Query' }}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Guest / Deactivated / Rejected Users Support Info Flow -->
                        <div v-else class="text-center">
                            <p class="text-muted mb-4">You are currently logged out or your account is undergoing review. You can reach our support desk directly via email or phone.</p>
                            
                            <div class="p-3 bg-light rounded-3 border mb-4 text-start">
                                <div class="d-flex align-items-start gap-3 mb-3">
                                    <i class="bi bi-envelope-open-fill text-primary fs-4 mt-0.5"></i>
                                    <div>
                                        <h6 class="fw-bold mb-0">Email Support</h6>
                                        <a href="mailto:support@placementportal.com" class="text-decoration-none fw-semibold">support@placementportal.com</a>
                                        <small class="d-block text-muted">Use this email to request corrections, details updates, or login assistance.</small>
                                    </div>
                                </div>
                                <hr class="my-2.5 opacity-25">
                                <div class="d-flex align-items-start gap-3">
                                    <i class="bi bi-clock-fill text-secondary fs-4 mt-0.5"></i>
                                    <div>
                                        <h6 class="fw-bold mb-0">IDesk Operations Hours</h6>
                                        <span class="small text-muted d-block">Monday to Friday: 9:00 AM - 6:00 PM (IST)</span>
                                        <span class="small text-muted d-block">Response Time: Typically under 24 hours.</span>
                                    </div>
                                </div>
                            </div>
                            
                            <router-link to="/login" class="btn btn-outline-primary fw-bold px-4 rounded-pill">
                                Back to Sign In
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            message: '',
            loading: false,
            successMessage: '',
            errorMessage: ''
        }
    },
    computed: {
        isAuthenticated() {
            return !!localStorage.getItem('token');
        }
    },
    methods: {
        async submitQuery() {
            if (!this.message.trim()) {
                this.errorMessage = "Message cannot be empty.";
                return;
            }
            this.loading = true;
            this.successMessage = '';
            this.errorMessage = '';
            try {
                const res = await fetch('/api/support_query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': localStorage.getItem('token')
                    },
                    body: JSON.stringify({ message: this.message })
                });
                const data = await res.json();
                if (res.ok) {
                    this.successMessage = data.message;
                    this.message = '';
                } else {
                    this.errorMessage = data.message || 'Failed to submit query.';
                }
            } catch (error) {
                this.errorMessage = 'An error occurred while submitting your query.';
                console.error("Support query submission error:", error);
            } finally {
                this.loading = false;
            }
        }
    }
};
export default ContactSupport;