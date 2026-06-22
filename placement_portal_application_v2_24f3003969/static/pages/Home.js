const Home={
    template: `
    <div>
        <!-- 1. Hero Section -->
        <section class="landing-page hero-section container-fluid py-5">
            <div class="container">
                <div class="row align-items-center justify-content-start">
                    <div class="col-md-7 hero-content-box">
                        <h1 class="display-4 fw-bolder">Bridging the Gap Between Talent and Opportunity.</h1>
                        <p class="lead py-4">
                            Our intelligent platform streamlines the entire placement process, connecting top-tier students with leading companies seamlessly and efficiently.
                        </p>
                        <div class="d-flex gap-3">
                            <router-link to="/login" class="btn btn-primary btn-lg px-4">Get Started / Login</router-link>
                            <a href="#impact-ribbon" class="btn btn-secondary btn-lg px-4">View Live Statistics</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 2. Real-Time Impact Ribbon -->
        <section id="impact-ribbon" class="impact-ribbon bg-primary text-white py-4">
            <div class="container">
                <div class="row text-center">
                    <div class="col-md-3 col-6">
                        <h3 class="fw-bold">{{ stats.impact_stats.total_students || '...' }}</h3>
                        <p class="mb-0">Registered Students</p>
                    </div>
                    <div class="col-md-3 col-6">
                        <h3 class="fw-bold">{{ stats.impact_stats.partnered_companies || '...' }}</h3>
                        <p class="mb-0">Partnered Companies</p>
                    </div>
                    <div class="col-md-3 col-6 mt-3 mt-md-0">
                        <h3 class="fw-bold">{{ stats.impact_stats.offers_released || '...' }}</h3>
                        <p class="mb-0">Offers Released</p>
                    </div>
                    <div class="col-md-3 col-6 mt-3 mt-md-0">
                        <h3 class="fw-bold">{{ stats.impact_stats.highest_package != 0 ? stats.impact_stats.highest_package : '...' }} LPA</h3>
                        <p class="mb-0">Highest Package</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 3. Three Pillars Section -->
        <section class="pillars-section container py-5">
            <div class="text-center mb-5">
                <h2 class="fw-bold">A Unified Platform for Everyone</h2>
                <p class="text-muted">Tailored experiences for every role in the placement ecosystem.</p>
            </div>
            <div class="row">
                <div class="col-md-4 text-center mb-4">
                    <div class="card h-100 border-0 shadow-sm p-4">
                        <i class="bi bi-mortarboard-fill fs-1 text-primary mb-3"></i>
                        <h4 class="fw-bold">For Students</h4>
                        <p>Track your journey from application to offer with real-time interview timelines and automated feedback.</p>
                    </div>
                </div>
                <div class="col-md-4 text-center mb-4">
                    <div class="card h-100 border-0 shadow-sm p-4">
                        <i class="bi bi-building-fill-gear fs-1 text-primary mb-3"></i>
                        <h4 class="fw-bold">For Companies</h4>
                        <p>Scale your hiring with Master Templates, dynamic interview scheduling, and deep talent analytics.</p>
                    </div>
                </div>
                <div class="col-md-4 text-center mb-4">
                    <div class="card h-100 border-0 shadow-sm p-4">
                        <i class="bi bi-shield-fill-check fs-1 text-primary mb-3"></i>
                        <h4 class="fw-bold">For Admins</h4>
                        <p>Full transparency and auditability with automated monthly reports and verification queues.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 4. Hiring Partners Carousel -->
        <section class="partners-section bg-light py-5">
            <div class="container">
                <h2 class="text-center fw-bold mb-4">Empowering Diverse Industries</h2>
                <div class="d-flex justify-content-around align-items-center flex-wrap gap-4 text-muted">
                    <span class="d-flex align-items-center gap-2"><i class="bi bi-credit-card-2-front fs-3"></i> Fintech</span>
                    <span class="d-flex align-items-center gap-2"><i class="bi bi-cpu fs-3"></i> AI & Machine Learning</span>
                    <span class="d-flex align-items-center gap-2"><i class="bi bi-heart-pulse fs-3"></i> Healthcare</span>
                    <span class="d-flex align-items-center gap-2"><i class="bi bi-cart fs-3"></i> E-commerce</span>
                    <span class="d-flex align-items-center gap-2"><i class="bi bi-book fs-3"></i> Education</span>
                </div>
            </div>
        </section>

        <!-- 5. Placement Spotlight -->
        <section class="spotlight-section container py-5">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h2 class="fw-bold">Placement Spotlight</h2>
                    <p class="text-muted">Our data-driven approach ensures a diverse and successful placement season. The platform provides deep insights into hiring trends, proving a rich talent pool across all engineering disciplines.</p>
                </div>
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm p-3">
                        <h5 class="fw-bold text-center">Branch-wise Success</h5>
                        <canvas id="placementSpotlightChart"></canvas>
                    </div>
                </div>
            </div>
        </section>

        <!-- 6. How it Works Timeline -->
        <section class="timeline-section bg-light py-5">
            <div class="container">
                <h2 class="text-center fw-bold mb-5">A Simple, 4-Step Process</h2>
                <div class="row">
                    <div class="col-md-3 text-center">
                        <div class="p-3">
                            <div class="timeline-step mx-auto mb-3">1</div>
                            <h5 class="fw-bold">Register</h5>
                            <p class="small text-muted">Quick verification for students and companies.</p>
                        </div>
                    </div>
                    <div class="col-md-3 text-center">
                        <div class="p-3">
                            <div class="timeline-step mx-auto mb-3">2</div>
                            <h5 class="fw-bold">Apply / Post</h5>
                            <p class="small text-muted">Students browse drives; HRs post requirements.</p>
                        </div>
                    </div>
                    <div class="col-md-3 text-center">
                        <div class="p-3">
                            <div class="timeline-step mx-auto mb-3">3</div>
                            <h5 class="fw-bold">Interview</h5>
                            <p class="small text-muted">Live tracking of rounds and feedback loops.</p>
                        </div>
                    </div>
                    <div class="col-md-3 text-center">
                        <div class="p-3">
                            <div class="timeline-step mx-auto mb-3">4</div>
                            <h5 class="fw-bold">Get Hired</h5>
                            <p class="small text-muted">Automated selection and offer letter generation.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
    `,
    data() {
        return {
            stats: {
                impact_stats: {},
                placement_spotlight: []
            },
            spotlightChart: null,
        }
    },
    methods: {
        async fetchPublicStats() {
            try {
                const res = await fetch('/api/public_stats');
                if (res.ok) {
                    this.stats = await res.json();
                    this.$nextTick(() => {
                        this.renderSpotlightChart();
                    });
                }
            } catch (error) {
                console.error("Failed to fetch public stats:", error);
            }
        },
        renderSpotlightChart() {
            if (this.spotlightChart) {
                this.spotlightChart.destroy();
            }
            const data = this.stats.placement_spotlight;
            if (!data || data.length === 0) return;

            const ctx = document.getElementById('placementSpotlightChart').getContext('2d');
            this.spotlightChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.department),
                    datasets: [{
                        label: 'Students Placed',
                        data: data.map(d => d.count),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Placed Students'
                            }
                        }
                    }
                }
            });
        }
    },
    mounted() {
        this.fetchPublicStats();
    },
    beforeDestroy() {
        if (this.spotlightChart) {
            this.spotlightChart.destroy();
        }
    }
}

export default Home;