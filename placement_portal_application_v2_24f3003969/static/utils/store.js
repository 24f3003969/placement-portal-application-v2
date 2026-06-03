const store=new Vuex.Store({
    state:{
        loggedIn: !!localStorage.getItem('token'),
        role:localStorage.getItem('role') || null,
        token: localStorage.getItem('token') || null,
        userName: localStorage.getItem('userName') || '',
        has_profile:localStorage.getItem('has_profile') === 'true'
    },
    actions: {
        async verifyAuth({ commit }) {
            try {
                const token = localStorage.getItem('token') || null;
                const res = await fetch('/api/whoami', {
                    credentials: 'include',
                    headers: { 'Authentication-Token': token || '' }
                });
                if (res.ok) {
                    const data = await res.json();
                    // mark logged in (keep token if present)
                    commit('setLogin', token);
                    commit('setRole', data.role);
                    commit('setUserName', data.userName);
                    commit('setProfileStatus', data.has_profile);
                    return true;
                } else {
                    commit('clearAuth');
                    return false;
                }
            } catch (err) {
                commit('clearAuth');
                return false;
            }
        }
    },
    mutations:{
        setLogin(state,token){
            state.loggedIn=true;
            state.token=token;
            localStorage.setItem('token',token);
        },
        setRole(state,role){
            state.role=role;
            localStorage.setItem('role',role)
        },
        setProfileStatus(state,status){
            state.has_profile=status;
            localStorage.setItem('has_profile',status)
        },
        clearAuth(state){
            state.token=null;
            state.role=null;
            state.has_profile=false;
            state.userName='';
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('has_profile');
            localStorage.removeItem('userName');
        },
        setUserName(state,name){
            state.userName=name,
            localStorage.setItem('userName', name)
        }
    },
});

export default store;