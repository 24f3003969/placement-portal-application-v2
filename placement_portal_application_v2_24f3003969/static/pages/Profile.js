// Import the new component
import StudentApplicationsAndInterviews from './StudentApplicationsAndInterviews.js';
import StudentProfileComponent from '../components/student_profile.js'; // Renamed to avoid conflict
import CompanyProfileComponent from '../components/company_profile.js'; // Renamed to avoid conflict

const Profile={
    template:`
        <div>
            <div v-if="role === 'stud'">
                <ul class="nav nav-tabs mb-4">
                    <li class="nav-item">
                        <button class="nav-link" :class="{ active: currentStudentTab === 'profile' }" @click="currentStudentTab = 'profile'">My Profile</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" :class="{ active: currentStudentTab === 'applications_interviews' }" @click="currentStudentTab = 'applications_interviews'">My Applications & Interviews</button>
                    </li>
                </ul>
                <student-profile-component v-if="currentStudentTab === 'profile'" />
                <student-applications-and-interviews v-if="currentStudentTab === 'applications_interviews'" />
            </div>
            <div v-else-if="role === 'comp'">
                <company-profile-component />
            </div>
            <div v-else>Loading profile...</div>
        </div>
    `,
    data(){
        return {role: null, currentStudentTab: 'profile' };
    },
    async mounted(){
        try {
            const res = await fetch('/api/whoami', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                this.role = data.role;
                // Check for tab query parameter after role is determined
                const tabFromQuery = this.$route.query.tab;
                if (this.role === 'stud' && tabFromQuery) {
                    this.currentStudentTab = tabFromQuery;
                }
            } else {
                console.error('Failed to get user info:', res.status);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    },
    components: {
        StudentApplicationsAndInterviews,
        'student-profile-component': StudentProfileComponent, // Register with a new name
        'company-profile-component': CompanyProfileComponent, // Register with a new name
    }
};


export default Profile