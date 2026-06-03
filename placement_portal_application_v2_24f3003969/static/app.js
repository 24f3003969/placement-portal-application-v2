import router from "./utils/router.js"
import Navbar from "./components/Navbar.js";
import store from './utils/store.js';

new Vue({
    el: '#app',
    data(){
        return{
            roleLinks:{
                home:[
                    {label:'Home', path:'/'},
                    {label:'Login',path:'/login'},
                    {label:'Register',path:'/signup'}
                ],
                student: [
                    { label: 'Dashboard', path: '/student_dashboard' },
                    { label: 'Placement Drives', path: '/placement_drives' },
                    { label: 'My Applications', path: '/student_applications_and_interviews' },
                    { label: 'My Profile', path: '/student_profile' },
                ],
                admin: [
                    {label:'Dashboard',path:'/admin_dashboard'},
                    {label:'Manage Users',path:'/manage_users'},
                    {label:'Manage Drives',path:'/manage_drives'},
                    {label:'Reports',path:'/reports'}
                ],
                company:[
                    {label:'Dashboard',path:'/company_dashboard'},
                    {label:'Posted Drives',path:'/posted_drives'},
                    {label:'Applications',path:'/company_applications'},
                    {label:'Interviews',path:'/company_interviews'},
                    {label:'Company Workspace',path:'/company_profile'},
                ],    
            },
        }
    },
    computed: {
        currentNavLinks() {
            const isLoggedIn = !!this.$store.state.token; 
            let activeRole = this.$route.meta.role;
            if (!activeRole && isLoggedIn) {
                activeRole = this.$store.state.role || localStorage.getItem('role');
            }
            if (activeRole === 'stud') {
                return this.roleLinks.student;
            } 
            else if (activeRole === 'comp') {
                return this.roleLinks.company;
            } 
            else if (activeRole === 'admin') {
                return this.roleLinks.admin;
            } 
            else {
                return this.roleLinks.home; // Default public navbar
            }
        },
        userName(){
            return this.$store.state.userName;
        }
    },
    template: `
        <div>
            <Navbar :navLinks="currentNavLinks" :user-name="userName" />
            <router-view></router-view>
            <footer class="bg-dark text-white py-2">
                <div class="container text-center">
                    <p>&copy; 2026 Placement Portal. All Rights Reserved.</p>
                    <div class="d-flex justify-content-center gap-4">
                        <router-link to="/about_us" class="text-white">About Us</router-link>
                        <router-link to="/contact_support" class="text-white">Contact Support</router-link>
                        <router-link to="/privacy_policy" class="text-white">Privacy Policy</router-link>
                    </div>
                </div>
            </footer>
        </div>
    `,
    router,
    store,
    components:{
        Navbar
    },
});
