import NotificationBell from './notification.js';

const Navbar={
    template:`
        <nav class="navbar navbar-expand-lg sticky-top shadow-sm m-0" style="background-color: #004a99; padding: 0.8rem 2rem;">
            <div class="container-fluid">
                <router-link to="/" class="navbar-brand text-white fw-bold d-flex align-items-center">
                    <i class="bi bi-shield-check me-2"></i><div class="lh-1 fs-6">UNIVERSITY <br>PLACEMENT CELL</div>
                </router-link>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="mainNavbar">
                    <div class="navbar-nav flex-grow-1 justify-content-evenly">
                        <router-link 
                            v-for="link in navLinks" 
                            :key="link.path" 
                            :to="link.path"
                            class="nav-link mx-3 text-white-50 fw-semibold custom-nav-link"
                            active-class="active-link"
                        >
                            {{ link.label }}
                        </router-link>
                    </div>

                    <div class="d-flex align-items-center ms-auto">
                        <notification-bell v-if="isLoggedIn"></notification-bell>
                        <div v-if="isLoggedIn" class="d-flex align-items-center bg-white bg-opacity-10 px-3 py-1 rounded-pill ms-2">
                            <img src="/static/images/person.png" class="rounded-circle me-2 border border-white" width="30" height="30">
                            <span class="text-white small fw-medium me-2">Welcome, {{ userName }}</span>
                            <button class="btn btn-outline-danger btn-sm" @click="logout" style='color:white;'>Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `,
    components: {
        NotificationBell
    },
    props: {
        navLinks:{
            type: Array,
            required:true
        }
    },
    data(){
        return{
            url: window.location.origin + '/logout',
        }
    },
    created() {
        // Verify backend session/token when the navbar is created
        if (this.$store && this.$store.dispatch) {
            this.$store.dispatch('verifyAuth');
        }
    },
    methods:{
        async logout(){
            await fetch(window.location.origin + '/logout',{
                method:'GET',
                headers:{'Authentication-Token':this.$store.state.token}
            });
            this.$store.commit('clearAuth');
            this.$router.push('/');
            alert("Logged out successfully");
        }
    },
    computed:{
        userName(){
            return this.$store.state.userName;
        },
        isLoggedIn() {
            return !!this.$store.state.token;
        }
    }
}
export default Navbar;