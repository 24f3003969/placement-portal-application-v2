const EmployerDetails={
    template: `
         <div class="container mt-3 py-5">
            <h3 class="card-title text-center mb-4">Company Profile</h3>
            <form @submit.prevent="submitInfo">
                <div class="card mb-4 p-4 shadow-sm dark">
                    <h5 class="mb-3">Contact Details</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="contact" type="text" class="form-control" placeholder="Official Contact Number" required/>
                                <label>Contact Number</label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="sec_email" type="text" class="form-control" placeholder="Secondary Email" />
                                <label>Secondary Email (if any)</label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="website" type="url" class="form-control" placeholder="Website url" required/>
                                <label>Website URL</label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="comp_name" type="text" class="form-control" placeholder="Company Name" required/>
                                <label>Company Name</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card mb-4 p-4 shadow-sm dark">
                    <h5 class="mb-3">File Upload</h5>
                    <div class="row bg-light text-dark">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Upload Logo Image (png, jpg, jpeg)</label>
                            <input type="file" class="form-control" accept=".png, .jpg, .jpeg, image/*"@change="handleFileUpload">
                        </div>
                    </div>
                </div>
                <div class="card mb-4 p-4 shadow-sm dark">
                    <h5 class="mb-3">About Company</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="gstin" type="number" class="form-control" placeholder="GSTIN" required/>
                                <label>GSTIN</label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="address" type="text" class="form-control" placeholder="Company Address" required/>
                                <label>Official Address</label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-floating mb-3">
                                <input v-model="desc" type="text" class="form-control" placeholder="Company Description" required/>
                                <label>Company Description</label>
                            </div>
                        </div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary w-100">Post For Free</button>
            </form>
            <div class="form-group mt-3 text-center">
                Already registered <router-link to='/login'>Login</router-link>
            </div>
        </div>
    `,
    data(){
        return{
            contact: '',
            website: '',
            logo_image: null,
            gstin: '',
            address: '',
            desc: '',
            comp_name:'',
            sec_email:'',
        }
    },
    methods:{
        handleFileUpload(event){
            const file=event.target.files[0]
            if(file){
                this.logo_image=file;
                console.log("File captured",this.logo_image.name)
            }
        },
        async submitInfo(){
            try{
                const url=window.location.origin;
                const formData = new FormData()
                formData.append('contact',this.contact);
                formData.append('website', this.website);
                formData.append('comp_name', this.comp_name);
                formData.append('secondary_email', this.sec_email);
                formData.append('gstin', this.gstin);
                formData.append('address', this.address);
                formData.append('desc', this.desc);
                if (this.logo_image) {
                    formData.append('logo_image', this.logo_image);
                }
                const res = await fetch(url + '/api/employer_details', {
                    method: 'POST',
                    credentials: 'include',
                    headers:{
                        'Authentication-Token': localStorage.getItem('token'),
                    },
                    body: formData,
                });
                if (res.ok){
                    alert('Your registration has been submitted and is under review. You will be notified soon.');
                    this.$store.commit('setProfileStatus',true);
                    this.$store.commit('clearAuth');
                    this.$router.push('/');
                } else{
                    const error=await res.json();
                    alert('Error'+error.message);
                }
            
            } catch(error){
                console.log("Upload Failed",error);
            }
        }
    }
}

export default EmployerDetails;