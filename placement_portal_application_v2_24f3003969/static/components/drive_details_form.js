import DriveDetailView from './drive_details_view.js';
import { getMinDate, formatDateTime } from '../utils/formatDateTime.js';

const DriveDetailsForm = {
    props: {
        driveType: String,
        drive: Object,
        mode: {
            type: String,
            default: 'drive'
        }
    },
    template: `
<div v-if="!isPreview" class="container py-4">
    <div class="card shadow-sm border-0 rounded-4">
        <div class="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
            <h4 v-if="mode === 'template'" class="fw-bold text-primary mb-0"><i class="bi bi-file-earmark-plus me-2"></i>New Drive Template</h4>
            <h4 v-else class="fw-bold text-primary mb-0"><i class="bi bi-briefcase me-2"></i>New {{ driveType }} Details</h4>
            <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" @click="$emit('cancel')"><i class="bi bi-x-circle me-1"></i>Cancel & Exit</button>
        </div>
        
        <div class="card-body p-4">
            <form @submit.prevent="submitForm">
                
                <div v-if="mode !== 'template'" class="mb-4 p-3 bg-light rounded-3 border">
                    <label class="form-label small fw-bold text-muted text-uppercase">Quick Start</label>
                    <div class="d-flex align-items-center gap-3">
                        <i class="bi bi-magic text-warning fs-4"></i>
                        <select v-model="selectedTemplateId" class="form-select shadow-sm border-0">
                            <option :value="null">-- Start from scratch (Do not use a template) --</option>
                            <option v-for="template in availableTemplates" :key="template.id" :value="template.id">
                                {{ template.TemplateName }}
                            </option>
                        </select>
                    </div>
                </div>

                <div v-if="mode === 'template'" class="mb-4">
                    <label class="form-label fw-bold">Template Name</label>
                    <input v-model="form.TemplateName" type="text" class="form-control form-control-lg bg-light border-0" placeholder="e.g. Standard SDE-1 Role" required>
                </div>

                <div class="row g-4 mb-4">
                    <div class="col-md-7">
                        <div class="p-4 border rounded-4 h-100 bg-light shadow-sm">
                            <h6 class="fw-bold mb-4 text-secondary border-bottom pb-2">Basic Information</h6>
                            <div class="mb-4">
                                <label class="form-label small fw-bold">Job Title / Role</label>
                                <input v-model="form.JobTitle" type="text" class="form-control" placeholder="e.g. Full Stack Developer" required>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Vacancies</label>
                                    <input v-model="form.Vacancies" type="number" min="1" class="form-control" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Work Mode</label>
                                    <select v-model="form.WorkMode" class="form-select" required>
                                        <option value="" disabled>Select work mode</option>
                                        <option value="remote">Remote</option>
                                        <option value="onsite">On-site</option>
                                        <option value="hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div class="col-md-12" v-if="form.WorkMode === 'onsite' || form.WorkMode === 'hybrid'">
                                    <label class="form-label small fw-bold">Location</label>
                                    <input v-model="form.Location" type="text" class="form-control" placeholder="e.g. Bangalore, Mumbai, etc." required>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-5">
                        <div v-if="mode !== 'template'" class="p-4 border rounded-4 h-100 bg-light shadow-sm">
                            <h6 class="fw-bold mb-4 text-secondary border-bottom pb-2">Compensation & Timeline</h6>
                            <div class="mb-4">
                                <label class="form-label small fw-bold">Apply Deadline</label>
                                <input v-model="form.ApplyDeadline" type="date" :min="getMinDate()" class="form-control" required>
                            </div>
                            <div class="mb-4" v-if="driveType === 'Internship' && mode !== 'template'">
                                <label class="form-label small fw-bold">Duration (in months)</label>
                                <input v-model="form.Duration" type="number" min="1" class="form-control" placeholder="e.g. 6" required>
                            </div>
                            <div class="mb-4">
                                <label class="form-label small fw-bold">{{ driveType === 'Job' ? 'Annual CTC (LPA)' : 'Monthly Stipend' }}</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-secondary">₹</span>
                                    <input v-model="form.Salary" type="number" step="0.01" class="form-control border-start-0" :placeholder="driveType === 'Job' ? 'e.g. 12.5' : 'e.g. 10000'" required>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-4 mb-2">
                    <div class="col-md-12">
                        <div class="p-4 border rounded-4 bg-light shadow-sm">
                            <h4 class="fw-bold mb-3 text-secondary border-bottom pb-2 required-label">Job Description</h4>
                            <div class="bg-white">
                                <quill-editor 
                                    v-model="form.JobDescription" 
                                    :options="editorOptions">
                                </quill-editor>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-4 mb-4">
                    <div class="col-md-6">
                        <div class="p-4 border rounded-4 h-100 bg-light shadow-sm">
                            <h6 class="fw-bold mb-4 text-secondary border-bottom pb-2">Candidate Requirements</h6>
                            <div class="mb-4">
                                <label class="form-label small fw-bold">Minimum CGPA (Optional)</label>
                                <input v-model="form.min_cgpa" type="number" step="0.1" min="0" max="10" class="form-control" placeholder="e.g. 7.5">
                            </div>
                            <div class="mb-2">
                                <label class="form-label small fw-bold">Target Disciplines <span class="text-muted fw-normal">(Leave empty for all)</span></label>
                                <div class="border rounded p-3 bg-light" style="height: 160px; overflow-y: auto;">
                                    <div v-for="(dept, index) in availableDepartments" :key="index" class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" :id="'dept-' + index" :value="dept.department" v-model="form.Departments">
                                        <label class="form-check-label" :for="'dept-' + index">
                                            {{ dept.department }}
                                        </label>
                                    </div>
                                    <div v-if="availableDepartments.length === 0" class="text-muted small">No departments available.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="p-4 border rounded-4 h-100 d-flex flex-column bg-light shadow-sm">
                            <h6 class="fw-bold mb-4 text-secondary border-bottom pb-2">Required Skills</h6>
                            <label class="form-label small text-muted mb-3">Type a skill and press Enter to add. Candidates missing these will be filtered out.</label>
                            
                            <div class="d-flex flex-wrap gap-2 p-3 border rounded bg-light flex-grow-1 align-items-start align-content-start">
                                <span v-for="(skill, i) in form.RequiredSkills" :key="i" class="badge bg-primary text-white d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.85rem;">
                                    {{ skill }} <i class="bi bi-x text-white" style="cursor: pointer; font-size: 1.1rem;" @click="form.RequiredSkills.splice(i, 1)"></i>
                                </span>
                                <input v-model="skillInput" @keydown.enter.prevent="addSkill" class="border-0 bg-transparent flex-grow-1 p-2" placeholder="e.g. Python, React..." style="outline:none; min-width: 150px;">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-4 mb-4">
                    <div class="col-md-12">
                        <div class="p-4 border rounded-4 bg-light shadow-sm">
                            <h6 class="fw-bold mb-4 text-secondary border-bottom pb-2">Interview Process</h6>
                            <div class="row g-4 align-items-start">
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold">Number of Rounds</label>
                                    <select v-model.number="form.noRounds" class="form-select">
                                        <option value="1">1 Round</option>
                                        <option value="2">2 Rounds</option>
                                        <option value="3">3 Rounds</option>
                                        <option value="4">4 Rounds</option>
                                    </select>
                                </div>
                                <div class="col-md-9">
                                    <label class="form-label small fw-bold">Round Names (Comma-separated)</label>
                                    <input type="text" v-model.trim="form.InterviewRounds" class="form-control" placeholder="e.g. Online Assessment, Technical Interview, HR Round">
                                    <div class="form-text text-muted mt-2"><i class="bi bi-info-circle me-1"></i>Ensure the number of comma-separated names matches the selected number of rounds.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="mode !== 'template'" class="mb-4 p-4 bg-primary-subtle border border-primary-subtle rounded-4 shadow-sm">
                    <div class="form-check form-switch d-flex align-items-center gap-3">
                        <input class="form-check-input mt-0" type="checkbox" role="switch" v-model="saveAsTemplate" id="saveAsTemplateCheck" style="transform: scale(1.3); cursor: pointer;">
                        <label class="form-check-label fw-bold text-primary-emphasis mb-0" for="saveAsTemplateCheck" style="cursor: pointer;">
                            Save this drive configuration as a new template for future use
                        </label>
                    </div>
                    <div v-if="saveAsTemplate" class="mt-3 ps-5">
                        <label class="form-label small fw-bold text-primary-emphasis">New Template Name</label>
                        <input v-model="newTemplateName" type="text" class="form-control border-primary" placeholder="e.g. Standard Developer Role v2" :required="saveAsTemplate">
                    </div>
                </div>

                <div class="d-flex justify-content-end gap-3 mt-5 pt-4 border-top">
                    <button type="button" class="btn btn-light border px-4 py-2 fw-medium rounded-pill" @click="$emit('cancel')">Cancel</button>
                    <button type="submit" class="btn btn-primary px-5 py-2 fw-bold shadow-sm rounded-pill">{{ mode !== 'template' ? 'Review & Preview' : 'Save Template' }}<i class="bi bi-arrow-right ms-2"></i></button>
                </div>
            </form>
        </div>
    </div>
</div>
<div v-else class="container py-4">
    <div class="alert alert-info shadow-sm border-0 mb-4 d-flex align-items-center justify-content-between rounded-4 p-4">
        <div>
            <h5 class="fw-bold text-primary mb-1"><i class="bi bi-eye me-2"></i>Preview Mode</h5>
            <p class="mb-0 text-muted">Review how your drive will look to students before publishing.</p>
        </div>
        <span class="badge bg-warning text-dark px-4 py-2 rounded-pill shadow-sm fs-6">Not Published Yet</span>
    </div>
    
    <drive-details-view 
        :drive="previewDriveData" 
        mode="company" 
        @back="isPreview = false" 
    />
    
    <div class="card shadow-sm border-0 p-4 mt-4 rounded-4 bg-light">
        <div class="d-flex justify-content-between align-items-center">
            <button @click="isPreview = false" class="btn btn-outline-secondary px-4 py-2 fw-medium rounded-pill"><i class="bi bi-pencil me-2"></i>Continue Editing</button>
            <button @click="finalSubmit" class="btn btn-success px-5 py-2 fw-bold shadow-sm btn-lg rounded-pill" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ loading ? 'Submitting...' : 'Confirm & Publish Drive' }} <i class="bi bi-check-circle ms-2" v-if="!loading"></i>
            </button>
        </div>
    </div>
</div>
    `,
    // LOCAL REGISTRATION
    components: {
        'drive-details-view': DriveDetailView,
        'quill-editor': window.VueQuillEditor.quillEditor
    },
    data() {
        return {
            loading: false,
            isPreview: false,
            skillInput: '',
            availableDepartments: [],
            availableTemplates: [],
            selectedTemplateId: null,
            saveAsTemplate: false,
            newTemplateName: '',
            editorOptions: {
                placeholder: 'Provide comprehensive role definitions, responsibilities, and clear qualifications parameters...',
                modules: {
                    toolbar: [
                        [{ 'header': [4, 5, 6, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['clean']
                    ]
                }
            },
            form: {
                resumeType: 'profile',
                isAvailable: false,
                agreedToTerms: false,
                customResume: null,
                TemplateName: '', 
                JobTitle: '',
                Departments: [],
                Vacancies: 1,
                Location: '',
                Salary: null,
                ApplyDeadline: '',
                RequiredSkills: [], 
                Type: this.driveType, 
                JobDescription: '', 
                InterviewRounds: '',
                noRounds: 2,
                Status: this.mode !== 'template' ? 'Pending' : undefined,
                min_cgpa: null, 
            },
        }
    },
    computed: {
        previewDriveData() {
            const roundsList = (typeof this.form.InterviewRounds === 'string' && this.form.InterviewRounds.trim())
                ? this.form.InterviewRounds.split(',').map(r => r.trim()).filter(r => r)
                : [];
            
            let formattedDeadline = this.form.ApplyDeadline;
            if (this.form.ApplyDeadline) {
                try {
                    formattedDeadline = formatDateTime(this.form.ApplyDeadline, false);
                } catch(e) { }
            }

            const depts = (!this.form.Departments || this.form.Departments.length === 0)
                ? this.availableDepartments.map(d => d.department)
                : this.form.Departments;

            return {
                ...this.form,
                Departments: depts,
                ApplyDeadline: formattedDeadline,
                InterviewRounds: roundsList,
            };
        }
    },
    methods: {
        async getDepartments(){
            const url = window.location.origin;
            const res = await fetch(url + '/api/departments', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                }
            });
            if (res.ok) {
                this.availableDepartments = await res.json();
            }
        },
        async fetchTemplates() {
            const res = await fetch('/api/drive_templates', { headers: { 'Authentication-Token': localStorage.getItem('token') } });
            if (res.ok) this.availableTemplates = await res.json();
        },
        async loadTemplate(templateId) {
            if (!templateId) return;
            const res = await fetch(`/api/drive_templates/${templateId}`, { headers: { 'Authentication-Token': localStorage.getItem('token') } });
            if (res.ok) {
                const templateData = await res.json();
                const { id, TemplateName, Type, ...formData } = templateData;

                if (Array.isArray(formData.InterviewRounds)) {
                    formData.InterviewRounds = formData.InterviewRounds.join(', ');
                }

                // VueQuill updates automatically via direct html mapping on this assignment
                this.form = { ...this.form, ...formData };
            }
        },
        addSkill() {
            const skill = this.skillInput.trim();
            if (skill && !this.form.RequiredSkills.includes(skill)) {
                this.form.RequiredSkills.push(skill);
            }
            this.skillInput = '';
        },
        getMinDate,
        submitForm() {
            if (this.mode !== 'template' && this.form.ApplyDeadline) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const selectedDate = new Date(this.form.ApplyDeadline + 'T00:00:00');
                if (selectedDate < today) {
                    alert("Apply deadline must be today or in the future.");
                    return;
                }
            }
            const numRounds = parseInt(this.form.noRounds, 10) || 0;
            let roundsList = [];
            if (typeof this.form.InterviewRounds === 'string' && this.form.InterviewRounds.trim()) {
                roundsList = this.form.InterviewRounds.split(',').map(r => r.trim()).filter(r => r);
            }

            if (numRounds !== roundsList.length) {
                alert(`The number of rounds specified (${numRounds}) does not match the number of comma-separated interview rounds provided (${roundsList.length}). Please correct it.`);
                return;
            }
            
            const finalForm = { ...this.form, InterviewRounds: roundsList };
            if (!finalForm.Departments || finalForm.Departments.length === 0) {
                finalForm.Departments = this.availableDepartments.map(d => d.department);
            }

            if (this.mode === 'template') {
                this.$emit('save-template', finalForm);
            } else {
                this.isPreview = true;
            }
        },
        async finalSubmit() {
            if (this.mode !== 'template' && this.form.ApplyDeadline) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const selectedDate = new Date(this.form.ApplyDeadline + 'T00:00:00');
                if (selectedDate < today) {
                    alert("Apply deadline must be today or in the future.");
                    return;
                }
            }
            this.loading = true;
            const numRounds = parseInt(this.form.noRounds, 10) || 0;
            const roundsList = (typeof this.form.InterviewRounds === 'string' && this.form.InterviewRounds.trim())
                ? this.form.InterviewRounds.split(',').map(r => r.trim()).filter(r => r)
                : [];

            if (numRounds !== roundsList.length) {
                alert(`The number of rounds specified (${numRounds}) does not match the number of comma-separated interview rounds provided (${roundsList.length}). Please correct it.`);
                this.isPreview = false;
                this.loading = false;
                return;
            }

            const finalForm = { ...this.form, InterviewRounds: roundsList };
            if (!finalForm.Departments || finalForm.Departments.length === 0) {
                finalForm.Departments = this.availableDepartments.map(d => d.department);
            }

            if (this.saveAsTemplate && this.newTemplateName) {
                const templatePayload = { ...finalForm, TemplateName: this.newTemplateName };
                delete templatePayload.ApplyDeadline;
                delete templatePayload.Status;

                const templateRes = await fetch('/api/drive_templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': localStorage.getItem('token') },
                    body: JSON.stringify(templatePayload)
                });
                if (!templateRes.ok) {
                    const err = await templateRes.json();
                    alert(`Failed to save template: ${err.message}`);
                }
            }

            const res = await fetch('/api/placement_drives', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('token')
                },
                body: JSON.stringify(finalForm)
            });
            if (res.ok) {
                this.$emit('success');
            } else {
                const err = await res.json();
                alert(`Failed to create drive: ${err.message || 'Unknown error'}`);
            }
            this.loading = false;
        }
    },
    watch: {
        selectedTemplateId(newId) {
            if (newId) this.loadTemplate(newId);
        }
    },
    created(){
        if(this.drive && Object.keys(this.drive).length > 0){
            this.form = { ...this.form, ...this.drive };
            if (Array.isArray(this.form.InterviewRounds)) {
                this.form.InterviewRounds = this.form.InterviewRounds.join(', ');
            }
        } else if (this.mode !== 'template' && !this.form.ApplyDeadline) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            this.form.ApplyDeadline = `${year}-${month}-${day}`;
        }
        if(this.mode === 'student' || this.mode === 'admin'){
            this.isPreview = true;
        }
    },
    mounted(){
        this.getDepartments();
        if (this.mode !== 'template') {
            this.fetchTemplates();
        }
        
        // Add minimal height layout overrides to Quill container cleanly
        if (!document.getElementById('quill-custom-height-override')) {
            const style = document.createElement('style');
            style.id = 'quill-custom-height-override';
            style.innerHTML = '.ql-container { max-height: 350px; } .ql-editor { min-height: 200px; }';
            document.head.appendChild(style);
        }
    }
};

export default DriveDetailsForm;