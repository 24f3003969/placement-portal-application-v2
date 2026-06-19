import DriveDetailsForm from "../components/drive_details_form.js";
import { formatDateTime } from "../utils/formatDateTime.js";
const CompanyProfile = {
    props: {
        isAdminView: { type: Boolean, default: false },
        userId: { type: Number, default: null },
        userActive: { type: Boolean, default: true }
    },
    template: `
    <div class="container mt-4">
        <ul class="nav nav-tabs mb-4">
            <li class="nav-item">
                <button class="nav-link" :class="{ active: currentTab === 'profile' }" @click="currentTab = 'profile'">Profile</button>
            </li>
            <li class="nav-item" v-if="!isAdminView">
                <button class="nav-link" :class="{ active: currentTab === 'templates' }" @click="currentTab = 'templates'">Template Library</button>
            </li>
            <li class="nav-item" v-if="isAdminView || userRole === 'comp'">
                <button class="nav-link" :class="{ active: currentTab === 'history' }" @click="currentTab = 'history'">Status Logs</button>
            </li>
        </ul>

        <div v-if="currentTab === 'profile'">
            <!-- Display View -->
            <div v-if="!isEditing" class="card shadow-sm">
                <div class="card-body p-4">
                    <div class="row">
                        <div class="col-md-3 text-center">
                            <img :src="profile.logo_image || '/static/images/default-avtar.png'" alt="Company Logo" class="rounded-circle mb-3 shadow-sm" style="width: 150px; height: 150px; object-fit: cover; border: 3px solid #fff;">
                            <h4 class="fw-bold">{{ profile.company_name }}</h4>
                            <p class="text-muted mb-1">{{ profile.email }}</p>
                            <span class="badge bg-primary">Company Profile</span>
                        </div>
                        <div class="col-md-9">
                            <h5 class="fw-bold border-bottom pb-2 mb-3">Company Details</h5>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <strong class="text-muted d-block small">Registered on</strong>
                                    <span>{{ formatDateTime(profile.registration_date, false) }}</span>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <strong class="text-muted d-block small">Website</strong>
                                    <a :href="profile.website" target="_blank">{{ profile.website }}</a>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <strong class="text-muted d-block small">Contact</strong>
                                    <span>{{ profile.contact }}</span>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <strong class="text-muted d-block small">GSTIN</strong>
                                    <span>{{ profile.gstin }}</span>
                                </div>
                                <div class="col-12 mb-3">
                                    <strong class="text-muted d-block small">Address</strong>
                                    <span>{{ profile.address }}</span>
                                </div>
                                <div class="col-12 mb-3">
                                    <strong class="text-muted d-block small">Description</strong>
                                    <p class="mb-0">{{ profile.description }}</p>
                                </div>
                                <div v-if="profile.secondary_email" class="col-12 mb-3">
                                    <strong class="text-muted d-block small">Secondary Email</strong>
                                    <p class="mb-0">{{ profile.secondary_email }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-light text-end border-0">
                    <button v-if="profile.is_approved || isAdminView" @click="isEditing = true" class="btn btn-primary me-2">Edit Profile</button>
                    <div v-if="!profile.is_approved && isAdminView" class="d-inline-block">
                        <button @click="manageCompany(profile.id, 'approved')" class="btn btn-success me-2">Approve Profile</button>
                        <button v-if="userActive" @click="manageCompany(profile.id, 'rejected')" class="btn btn-danger">Reject Profile</button>
                    </div>
                    <button v-if="!profile.is_approved && !isAdminView" class="btn btn-secondary" disabled>Pending Approval</button>
                </div>
            </div>

            <!-- Edit View -->
            <div v-if="isEditing" class="card shadow-sm mt-4">
                <div class="card-body p-4">
                    <h5 class="fw-bold mb-4">Edit Profile</h5>
                    <form @submit.prevent="updateProfile">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Company Name</label>
                                <input type="text" v-model="profile.company_name" class="form-control" :disabled="!isAdminView">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label small fw-bold">Company Head Office Address</label>
                                <input type="text" v-model="profile.address" class="form-control" :disabled="!isAdminView"></input>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Contact Number</label>
                                <input type="text" v-model="profile.contact" class="form-control" :disabled="!isAdminView">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Website</label>
                                <input type="url" v-model="profile.website" class="form-control" :disabled="!isAdminView">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">GSTIN</label>
                                <input type="text" v-model="profile.gstin" class="form-control" :disabled="!isAdminView">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Secondary Email</label>
                                <input type="text" v-model="profile.secondary_email" class="form-control" placeholder="Enter secondary email (optional)">
                            </div>
                            <div class="col-12">
                                <label class="form-label small fw-bold">Company Description</label>
                                <textarea v-model="profile.description" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="col-12" v-if="!isAdminView">
                                <small class="text-muted">Some fields can only be changed by an admin. Please contact support for assistance.</small>
                            </div>
                            <div class="col-12" v-if="isAdminView">
                                <label class="form-label small fw-bold">Company Logo</label>
                                <input type="file" accept="image/*" class="form-control" @change="changelogo">
                            </div>
                        </div>
                        <hr class="my-4">
                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" @click="isEditing = false" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-success">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'templates'">
            <div v-if="templateView === 'list'">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="fw-bold">Template Library</h4>
                    <button @click="openTemplateForm()" class="btn btn-primary">Create New Template</button>
                </div>
                <div v-if="templates.length > 0" class="list-group">
                    <div v-for="template in templates" :key="template.id" class="list-group-item d-flex justify-content-between align-items-center">
                        <span class="fw-medium">{{ template.TemplateName }}</span>
                        <button @click="deleteTemplate(template.id)" class="btn btn-sm btn-outline-danger" title="Delete Template">
                            <i class="bi bi-trash3-fill"></i> Delete
                        </button>
                    </div>
                </div>
                <div v-else class="text-center p-5 bg-light rounded">
                    <p class="text-muted">You have no saved templates.</p>
                </div>
            </div>
            <div v-if="templateView === 'create'">
                <drive-details-form 
                    mode="template" 
                    drive-type="Template"
                    @cancel="templateView = 'list'"
                    @save-template="saveNewTemplate"
                />
            </div>
        </div>

        <!-- Status History (Audit logs for Admins & Company itself) -->
        <div v-if="currentTab === 'history' && (isAdminView || userRole === 'comp')">
            <div class="card shadow-sm border-0 rounded-4 overflow-hidden mt-4">
                <div class="card-header bg-dark text-white fw-bold py-3">
                    <i class="bi bi-shield-lock-fill me-2"></i>Company Status Audit History
                </div>
                <div class="card-body">
                    <div v-if="profile.status_history && profile.status_history.length > 0" class="table-responsive">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Action</th>
                                    <th>Reason / Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="log in profile.status_history" :key="log.id">
                                    <td class="text-muted">{{ formatDateTime(log.timestamp) }}</td>
                                    <td>
                                        <span class="badge px-3 py-2 rounded-pill" :class="log.status === 'disabled' ? 'bg-danger-subtle text-danger-emphasis' : 'bg-success-subtle text-success-emphasis'">
                                            {{ log.status === 'disabled' ? 'Suspended / Disabled' : 'Reactivated / Enabled' }}
                                        </span>
                                    </td>
                                    <td class="text-secondary">{{ log.note }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-center text-muted p-5">
                        <i class="bi bi-info-circle fs-1 d-block mb-3 text-secondary"></i>
                        <h5>No Status History Recorded</h5>
                        <p class="mb-0">This company has never been suspended or disabled.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    components: { DriveDetailsForm },
    computed: {
        userRole() {
            return localStorage.getItem('role') || 'comp';
        }
    },
    data() {
        return {
            isEditing: false,
            currentTab: 'profile',
            templateView: 'list', // 'list' or 'create'
            templates: [],
            profile: {
                company_name: '',
                email: '',
                address: '',
                contact: '',
                website: '', // Note: we send this as a string back to the backend
                description: '',
                secondary_email:'',
                gstin: '',
                logo_image:'',
                is_approved: false,
                id: null,
                status_history: [],
            },
            newPicture: null,
        };
    },
    async created() {
        const url = this.isAdminView && this.userId 
            ? `/api/company_details/${this.userId}` 
            : '/api/company_profile';
        this.fetchTemplates();

        try {
            const res = await fetch(url, {
                headers: {
                    'Authentication-Token': localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                }
            });
            
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Invalid content type:', contentType);
                console.error('Response status:', res.status);
                return;
            }
            
            if (res.ok) {
                const data = await res.json();
                this.profile = data;                
            } else if (res.status === 404) {
                console.warn('Profile not found - user may need to create one first');
            } else {
                console.error('Failed to load profile:', res.status);
                const errorData = await res.json();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },
    methods: {
        formatDateTime,
        async updateProfile() {
            try {
                if (this.newPicture) await this.uploadcompany_logo();

                let payload = {...this.profile};
                if (this.isAdminView) {
                    payload.user_id = this.userId;
                }

                const res = await fetch('/api/company_profile', {
                    method: 'POST',
                    headers: { 
                        'Authentication-Token': localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    alert("Profile updated successfully!");
                    this.isEditing = false;
                } else {
                    console.error('Failed to update profile:', res.status);
                    alert("Failed to update profile. Please try again.");
                }
            } catch (error) { console.error(error); }
        },
        async manageCompany(companyId, action) {
            if (!confirm(`Are you sure you want to ${action} this company?`)) return;
            const res = await fetch(`/api/admin/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                body: JSON.stringify({ status: action })
            });
            const data = await res.json();
            alert(data.message);
            if (res.ok) {
                location.reload();
            }
        },
        async fetchTemplates() {
            const res = await fetch('/api/drive_templates', {
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            if (res.ok) {
                this.templates = await res.json();
            }
        },
        openTemplateForm() {
            this.templateView = 'create';
        },
        async saveNewTemplate(templateData) {
            const res = await fetch('/api/drive_templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                },
                body: JSON.stringify(templateData)
            });
            const data = await res.json();
            if (res.ok) {
                alert('Template saved successfully!');
                this.templateView = 'list';
                this.fetchTemplates();
            } else {
                alert(`Error: ${data.message}`);
            }
        },
        changelogo(event){
            this.newPicture=event.target.files[0];
            console.log("File selected: ",this.newPicture)
        },
        async uploadcompany_logo() {
            const formData = new FormData();
            formData.append('logo_image', this.newPicture);
            if (this.isAdminView && this.userId) {
                formData.append('user_id', this.userId);
            }
            const res = await fetch('/api/company_logo', { method: 'POST', headers: { 'Authentication-Token': localStorage.getItem('token') }, body: formData });
            if (res.ok) {
                const data = await res.json();
                this.profile.logo_image = data.path;
                this.newPicture = null;
            }
        },
        async deleteTemplate(templateId) {
            // Confirmation prompt to prevent accidental deletions
            if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
                return;
            }

            try {
                const res = await fetch(`/api/drive_templates/${templateId}`, {
                    method: 'DELETE',
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });

                if (res.ok) {
                    // Instantly remove it from the UI for a snappy feel, then re-fetch to ensure sync
                    this.templates = this.templates.filter(t => t.id !== templateId);
                    alert('Template deleted successfully!');
                } else {
                    const data = await res.json();
                    alert(`Failed to delete template: ${data.message || 'Unknown error'}`);
                }
            } catch (err) {
                console.error("Error deleting template:", err);
                alert("An error occurred while deleting the template.");
            }
        },
    },
    mounted() {
        this.currentTab = this.$route.query.tab || 'profile';
    }
};

export default CompanyProfile;