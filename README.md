# 🎓 University Placement Portal

An enterprise-grade, full-stack web application built to digitize, streamline, and automate the campus recruitment lifecycle. This platform serves as a centralized hub connecting students, corporate recruiters, and university administration through customized, reactive dashboards and automated background workflows.

---

## 🌟 Project Overview
The traditional campus placement process is often plagued by manual data entry, email-chain scheduling, and fragmented communication. This portal solves these inefficiencies by providing a unified ecosystem where:
* **Students** can discover eligible job drives, track their application status, and accept offers.
* **Companies** can post customized job requirements, filter candidates, schedule multi-round interviews, and generate automated offer letters.
* **Administrators** possess a bird's-eye view of the entire system via real-time analytics, user management controls, and automated monthly performance reports.

---

## 🚀 Core Features by Role

### 👨‍🎓 For Students
* **Smart Dashboard:** Features a dynamic "Up Next" banner for upcoming interviews and a "New Matches" section that instantly cross-references posted drives against the student's skills, CGPA, and department.
* **Application Lifecycle Tracking:** Visual pipelines showing the progression from *Pending* ➔ *Shortlisted* ➔ *Interviewing* ➔ *Selected* ➔ *Hired*.
* **Profile Management:** Upload resumes, maintain portfolio links (GitHub, LinkedIn), and define technical skill sets.
* **Offer Management:** Accept or reject placement offers with a single click. (System strictly enforces a "One Student, One Job" policy by auto-canceling other pending applications upon job acceptance).

### 🏢 For Companies (Recruiters)
* **Drive Creation & Templates:** Create detailed job/internship postings with strict eligibility criteria. Save frequently used postings as templates.
* **Applicant Tracking System (ATS):** Filter applicants by CGPA or specific skills. Move candidates through customized interview rounds.
* **Interview Scheduling Engine:** Schedule interviews with automated clash detection to prevent double-booking.
* **Automated Offer Letters:** Fill in joining dates and expiry deadlines to automatically generate and dispatch personalized HTML offer letters via Celery background tasks.
* **Analytics Dashboard:** Monitor placement funnels, drive engagement, and action-center alerts for pending tasks.

### 🛡️ For Administrators
* **System Analytics:** Monitor critical KPIs including branch health, average CGPAs, and system-wide placement rates.
* **Approval Workflows:** Review and approve/reject new company registrations and placement drives.
* **User Management:** Enable, disable, or investigate student and company accounts. 
* **Automated Reporting:** Scheduled background tasks compile and distribute end-of-month HTML reports summarizing platform activity.

---

## 🛠️ Technology & Architecture Stack

* **Frontend (Client-Side):** Vue.js (via CDN) for a reactive, Single-Page Application (SPA) architecture, styled with Bootstrap 5, Bootstrap Icons, and custom CSS for sleek dark/glassmorphic elements.
* **Backend (Server-Side):** Python / Flask with a structured Flask-RESTful routing layer.
* **Authentication:** Flask-Security-Too utilizing Session and Token-based auth for robust Role-Based Access Control (RBAC).
* **Database & ORM:** SQLite database managed using SQLAlchemy ORM.
* **Task Queue:** Celery for asynchronous background processes (email distribution, PDF reports, monthly status rollups).
* **Caching & Brokerage:** Redis serving as both the Celery message broker and the cache backend (using Flask-Caching) for resource-heavy analytical endpoints.

---

## 📂 Project Structure

```text
├── api/                             # Modular Flask-RESTful API resources
│   ├── __init__.py                  # Registers modular Blueprints
│   ├── admin.py                     # Administrative dashboards and reports APIs
│   ├── common.py                    # Auth utilities, notifications, and task status APIs
│   ├── company.py                   # Recruitment, ATS, and scheduling APIs
│   └── student.py                   # Profile, application, and resume upload APIs
├── application/                     # Backend core configuration and tasks
│   ├── extensions.py                # Database, Flask-Security, and Caching instances
│   ├── mail.py                      # SMTP mail server helper functions
│   ├── models.py                    # Database schema/models (Student, Drive, Interview, etc.)
│   ├── tasks.py                     # Asynchronous Celery background tasks
│   └── worker.py                    # Celery application initialization wrapper
├── static/                          # Static assets and frontend source files
│   ├── components/                  # Reusable Vue components (Navbar, profiles, form/view dialogs, etc.)
│   ├── images/                      # Default avatars, logos, and page illustrations
│   ├── pages/                       # Vue SPA views(Dashboards, login, signup, details, applications,etc.)
│   ├── reports/                     # Storage directory for generated PDF/HTML reports
│   ├── uploads/                     # Storage directory for user uploads
│   │   ├── logos/                   # Uploaded company logos
│   │   ├── offer_letters/           # Generated/sent offer letters
│   │   ├── profiles/                # Uploaded profile pictures
│   │   └── resumes/                 # Uploaded student resumes
│   ├── utils/                       # Frontend routing, store management, and helper scripts
│   ├── app.js                       # Vue app configuration and root instance initialization
│   └── styles.css                   # Custom global CSS (styling & glassmorphism theme)
├── templates/                       # HTML templates for views, monthly reports, and offer letters
├── app.py                           # Application entry point and initialization
├── celery_config.py                 # Celery scheduler configurations (beat timings)
├── requirements.txt                 # Project dependencies
└── seed.py                          # Mock database seeding script
```

---

## ⚙️ Setup & Installation Guide

Follow these steps to run the application in a local development environment.

### 1. Set Up Virtual Environment & Dependencies
```bash
# Create the virtual environment
python3 -m venv .env

# Activate the virtual environment
source .env/bin/activate

# Install all required Python packages
pip install -r requirements.txt
```

### 2. Configure and Start Redis Server
Celery requires Redis to act as the broker. Make sure Redis is installed and running on port `6379`.

```bash
# Start Redis server locally
redis-server
```

> [!TIP]
> **Troubleshooting Port 6379 Conflicts:**
> If you encounter an error saying the port is already in use:
> ```bash
> # Stop system-level redis service if it is running in background
> sudo systemctl stop redis
>
> # Alternatively, locate and kill the process blocking port 6379
> sudo lsof -i :6379
> sudo kill -9 <PID>
>
> # Re-start the Redis server
> redis-server
> ```

### 3. Start Local SMTP Server (MailHog)
For tracking sent emails (reminders, weekly updates, and offer letters), MailHog should be running locally:
```bash
# Navigate to MailHog bin directory (example installation path on WSL/Ubuntu)
cd /usr/local/bin
mailhog
# If port already in use try sudo lsof -i :port and sudo kill -9 <PID>
# If the port is in use by a critical system service, you can run SMTP on a different, free port eg 2525.
> mailhog -smtp-bind-addr="0.0.0.0:<new port>"
#Change port in mail.py also
```
Once started, you can access the Web GUI at `http://localhost:8025/` to view outgoing platform emails.

### 4. Initialize & Start the Celery Services
Open two new terminals, activate the virtual environment in both, and start:

* **Celery Worker (Executes tasks asynchronously):**
  ```bash
  source .env/bin/activate
  celery -A app.celery worker --loglevel INFO
  ```

* **Celery Beat (Triggers periodic/scheduled tasks):**
  ```bash
  source .env/bin/activate
  celery -A app.celery beat --loglevel INFO
  ```

### 5. Start the Web Application
Finally, run the Flask server in debug mode:
```bash
source .env/bin/activate
python3 app.py
```
Visit `http://127.0.0.1:5000` in your web browser. Use the admin email `admin@iitm.ac.in` and password `admin143` to log in as admin, or seed/register a custom profile to explore student/company accounts.