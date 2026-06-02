const NotificationBell = {
    template: `
    <div class="dropdown me-3">
        <button class="btn btn-sm btn-light position-relative" type="button" data-bs-toggle="dropdown" @click="markAsRead">
            <i class="bi bi-bell fs-5"></i>
            <span v-if="unreadCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {{ unreadCount }}
            </span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow" style="width: 320px; max-height: 400px; overflow-y: auto;">
            <li><h6 class="dropdown-header fw-bold">Notifications</h6></li>
            <div v-if="notifications.length === 0" class="text-center text-muted p-3 small">
                No recent notifications
            </div>
            <li v-for="n in notifications" :key="n.id" class="border-bottom px-3 py-2">
                <i :class="getIconClass(n.type)" class="me-2"></i>
                <span class="small" :class="{'fw-bold text-dark': !n.is_read, 'text-muted': n.is_read}">
                    {{ n.message }}
                </span>
                <div class="text-muted" style="font-size: 0.65rem;">{{ n.created_at }}</div>
            </li>
        </ul>
    </div>
    `,
    data() {
        return {
            notifications: [],
            pollingInterval: null
        };
    },
    computed: {
        unreadCount() {
            return this.notifications.filter(n => !n.is_read).length;
        }
    },
    methods: {
        getIconClass(type) {
            if (type === 'success') return 'bi bi-check-circle-fill text-success';
            if (type === 'warning') return 'bi bi-exclamation-triangle-fill text-warning';
            return 'bi bi-info-circle-fill text-primary';
        },
        async fetchNotifications() {
            try {
                const res = await fetch('/api/notifications', {
                    headers: { 'Authentication-Token': localStorage.getItem('token') }
                });
                if (res.ok) this.notifications = await res.json();
            } catch (e) { console.error(e); }
        },
        async markAsRead() {
            if (this.unreadCount === 0) return;
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Authentication-Token': localStorage.getItem('token') }
            });
            this.notifications.forEach(n => n.is_read = true);
        }
    },
    mounted() {
        this.fetchNotifications();
        // Optional: Poll every 60 seconds
        this.pollingInterval = setInterval(this.fetchNotifications, 60000); 
    },
    beforeDestroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
};
export default NotificationBell;