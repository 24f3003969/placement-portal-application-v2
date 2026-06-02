const ContactSupport = {
    template: `
    <div class="container my-5 py-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow-sm border-0">
                    <div class="card-body p-5">
                        <h2 class="fw-bold text-center mb-3">Contact Support</h2>
                        <p class="text-muted text-center mb-4">Have a question or facing an issue? Let us know.</p>
                        
                        <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
                        <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
                        
                        <form @submit.prevent="submitQuery" v-if="!successMessage">
                            <div class="mb-3">
                                <label for="queryText" class="form-label">Your Message</label>
                                <textarea v-model="message" class="form-control" id="queryText" rows="6" required :disabled="loading" placeholder="Please describe your issue or question in detail..."></textarea>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
                                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    {{ loading ? ' Submitting...' : 'Submit Query' }}
                                </button>
                            </div>
                        </form>
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
    },
    created() {
        if (!localStorage.getItem('token')) {
            this.$router.push({ path: '/login', query: { next: '/contact' } });
        }
    }
};
export default ContactSupport;