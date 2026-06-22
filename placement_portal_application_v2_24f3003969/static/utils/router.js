import Home from "../pages/Home.js";
import Login from "../pages/Login.js";
import SignUp from "../pages/Signup.js";
import EmployerDetails from "../pages/Employer_Details.js";
import StudentDashboard from '../pages/StudentDashboard.js';
import DriveDetailView from "../components/drive_details_view.js";
import Profile from "../pages/Profile.js";
import store from './store.js';
import StudentProfile from "../components/student_profile.js";
import StudentDetails from "../pages/student_details.js";
import CompDashboard from "../pages/CompDashboard.js";
import CompanyProfile from "../components/company_profile.js"; 
import PostedDrives from "../pages/posted_drives.js"; 
import GettedApplications from "../pages/company_applications.js"; 
import AdminDashboard from "../pages/AdminDashboard.js";
import AdminManageUsers from '../pages/AdminManageUsers.js';
import AdminManageDrives from '../pages/AdminManageDrives.js';
import AdminReports from '../pages/AdminReports.js';
import CompanyInterviews from "../pages/company_interviews.js";
import StudentApplicationsAndInterviews from "../pages/StudentApplicationsAndInterviews.js";
import PlacementDrives from "../pages/placement_drives.js";
import ViewDrive from "../components/view_drive.js";
import AboutUs from "../pages/AboutUs.js";
import ContactSupport from "../pages/ContactSupport.js";
import PrivacyPolicy from "../pages/PrivacyPolicy.js";
import ResetPassword from "../pages/ResetPassword.js";



const routes= [
    {path: '/', component: Home},
    {path: '/about_us', component: AboutUs},
    {path: '/contact_support', component: ContactSupport},
    {path: '/privacy_policy', component: PrivacyPolicy},
    {path: '/login', component: Login},
    {path: '/signup', component: SignUp},
    {path: '/reset_password', component: ResetPassword},
    {path: '/employer_details', component: EmployerDetails, meta: {requiresAuth: true, role: 'comp'}},
    {path: '/student_dashboard', component: StudentDashboard, meta: {requiresAuth: true, requiresProfile: true, role:'stud'}},
    {path:'/drive_detail_view', component:DriveDetailView, meta: {requiresAuth: true, role: 'stud' || 'comp' || 'admin'}},
    {path:'/profile', component:Profile, meta: {requiresAuth: true}},
    {path:'/company_profile', component:CompanyProfile, meta: {requiresAuth: true, role: 'comp' || 'admin'}},
    {path:'/student_profile', component:StudentProfile, meta: {requiresAuth: true, role: 'stud' || 'admin'}},
    {path:'/student_details', component:StudentDetails, meta: {requiresAuth: true, role: 'stud'}},
    {path:'/placement_drives', component:PlacementDrives, meta: {requiresAuth: true, role: 'stud'}},
    {path:'/student_applications_and_interviews', component:StudentApplicationsAndInterviews, meta: {requiresAuth: true, role: 'stud'}},
    {path:'/company_dashboard', component:CompDashboard, meta: {requiresAuth: true, requiresProfile: true, role:'comp'}},
    {path:'/posted_drives', component:PostedDrives, meta: {requiresAuth: true, role: 'comp'}},
    {path:'/company_applications', component:GettedApplications, meta: {requiresAuth: true, role: 'comp'}},
    {path:'/admin_dashboard', component:AdminDashboard, meta: {requiresAuth: true, role: 'admin'}},
    {path:'/company_interviews', component:CompanyInterviews, meta: {requiresAuth: true, role: 'comp'}},
    {path:'/manage_users', component:AdminManageUsers, meta: {requiresAuth: true, role: 'admin'}},
    {path:'/manage_drives', component:AdminManageDrives, meta: {requiresAuth: true, role: 'admin'}},
    {path:'/reports', component:AdminReports, meta: {requiresAuth: true, role: 'admin'}},
    {path:'/view_drive', component:ViewDrive, meta: {requiresAuth: true, role: 'comp' || 'stud' || 'admin'}}
];

const router = new VueRouter({
    mode: 'hash',
    routes,
});

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const hasProfile = localStorage.getItem('has_profile') === 'true';
    
    console.log(`Navigating to:${to.path} | Token: ${!!token} | Role: ${userRole} | HasProfile: ${hasProfile}`);

    const authPages = ['/', '/login', '/signup'];
    if (token && authPages.includes(to.path)) {
        if (userRole === 'admin') return next('/admin_dashboard');
        if (userRole === 'comp') return next('/company_dashboard');
        return next('/student_dashboard');
    }
    // -----------------------------------------------------------------------

    const publicPages = ['/', '/login', '/signup', '/about_us', '/contact_support', '/privacy_policy', '/reset_password'];
    if (publicPages.includes(to.path)) {
        return next();
    }
    
    if (!token) {
        return next('/login');
    }
    
    const details = to.path === '/student_details' || to.path === '/employer_details';
    if (!hasProfile && !details){
        if(userRole === 'stud'){
            console.log("Redirecting to profile completion");
            return next('/student_details');
        } else if(userRole === 'comp'){
            console.log("Redirecting to profile completion");
            return next('/employer_details');
        } 
    } 
    

    if(to.meta.role && to.meta.role !== userRole){
        return next(userRole === 'admin' ? '/admin_dashboard' : userRole === 'comp' ? '/company_dashboard' : '/student_dashboard')
    }
    
    next();
});

export default router;