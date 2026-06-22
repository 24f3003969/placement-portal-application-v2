const RejectionModal = {
    template: `
        <div class="modal fade" id="rejectionReasonModal" tabindex="-1" ref="modalElement">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-danger text-white border-0">
                        <h5 class="modal-title fw-bold"><i class="bi bi-slash-circle me-2"></i>{{ title }}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 text-start">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">Rejection Reason Category (Optional)</label>
                            <select v-model="rejectionCategory" class="form-select mb-2">
                                <option value="">Select standard category...</option>
                                <template v-if="type === 'candidate'">
                                    <option value="Lacks required technical skills">Lacks required technical skills</option>
                                    <option value="Does not meet CGPA criteria">Does not meet CGPA criteria</option>
                                    <option value="Resume mismatch / Incomplete application">Resume mismatch / Incomplete application</option>
                                    <option value="Failed live interviewing round steps">Failed live interviewing round steps</option>
                                    <option value="Candidate was unresponsive or no-show">Candidate was unresponsive or no-show</option>
                                    <option value="Position closed">Position closed</option>
                                </template>
                                <template v-else-if="type === 'drive'">
                                    <option value="Incomplete/invalid company details">Incomplete/invalid company details</option>
                                    <option value="Salary/stipend below threshold">Salary/stipend below threshold</option>
                                    <option value="Duplicate drive posting">Duplicate drive posting</option>
                                    <option value="Terms of service violation">Terms of service violation</option>
                                </template>
                                <option value="Other">Other (custom reason)</option>
                            </select>
                        </div>
                        
                        <div class="mb-3" v-if="rejectionCategory === 'Other' || !rejectionCategory">
                            <label class="form-label fw-bold small text-muted">Custom Rejection Reason</label>
                            <textarea v-model="customReason" class="form-control font-monospace" rows="3" placeholder="Enter custom reason details..." required></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">{{ noteLabel }}</label>
                            <textarea v-model="noteForStudent" class="form-control" rows="2" :placeholder="notePlaceholder"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger btn-sm px-3 fw-bold" @click="submit" :disabled="isSubmitDisabled">Confirm Rejection</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        type: {
            type: String,
            default: 'candidate'
        }
    },
    data() {
        return {
            rejectionCategory: '',
            customReason: '',
            noteForStudent: '',
            bsModal: null
        };
    },
    computed: {
        title() {
            return this.type === 'drive' ? 'Reject Placement Drive' : 'Reject Candidate';
        },
        noteLabel() {
            return this.type === 'drive' ? 'Note for Employer (Optional)' : 'Note for Student (Optional)';
        },
        notePlaceholder() {
            return this.type === 'drive'
                ? 'Enter advice/remarks visible to the employer...'
                : 'Enter advice/remarks visible to the student...';
        },
        isSubmitDisabled() {
            if (!this.rejectionCategory) {
                return !this.customReason.trim();
            }
            if (this.rejectionCategory === 'Other') {
                return !this.customReason.trim();
            }
            return false;
        }
    },
    methods: {
        show() {
            this.rejectionCategory = '';
            this.customReason = '';
            this.noteForStudent = '';
            if (!this.bsModal) {
                this.bsModal = new bootstrap.Modal(this.$refs.modalElement);
            }
            this.bsModal.show();
        },
        hide() {
            if (this.bsModal) {
                this.bsModal.hide();
            }
        },
        submit() {
            const finalReason = this.rejectionCategory === 'Other' || !this.rejectionCategory
                ? this.customReason
                : this.rejectionCategory;
            
            this.$emit('confirm', {
                rejection_reason: finalReason || 'No reason provided.',
                note_for_student: this.noteForStudent
            });
        }
    },
    mounted() {
        this.bsModal = new bootstrap.Modal(this.$refs.modalElement);
    }
};

export default RejectionModal;
