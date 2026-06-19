import random
from tempfile import template
from faker import Faker
from datetime import datetime, timedelta
from flask_security.utils import hash_password
from app import create_app
from application.extensions import db, user_datastore, cache
from application.models import (
    User, StudentProfile, CompanyProfile, PlacementDrives, 
    Application, Interview, Department, DriveTemplate, Placement, SupportQuery, Role, Notification, UserStatusHistory
)

# --- CONFIGURATION ---
NUM_STUDENTS = 30
NUM_COMPANIES = 8
NUM_DRIVES = 25
NUM_APPLICATIONS_PER_STUDENT = 3

DEPARTMENTS = ["Computer Science", "Data Science and AI", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering"]
SKILLS = ["Python", "Java", "C++", "JavaScript", "React", "Node.js", "SQL", "Machine Learning", "TensorFlow", "PyTorch", "Communication", "Teamwork", "Project Management"]
JOB_ROLES = ["Software Engineer", "Data Scientist", "Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer", "QA Engineer", "Machine Learning Engineer"]
INTERVIEW_ROUNDS = ["Online Assessment", "Technical Interview 1", "Technical Interview 2", "Managerial Round", "HR Round", "System Design"]

def generate_dummy_data(user_datastore):
    fake = Faker()
    print("--- STARTING DATABASE SEEDING ---")

    # --- 1. Clean up existing cache & data ---
    print("Clearing cache...")
    try:
        cache.clear()
    except Exception as e:
        print(f"Warning: Could not clear cache (Redis might be offline): {e}")
        
    print("Clearing existing data...")
    UserStatusHistory.query.delete()
    Placement.query.delete()
    Interview.query.delete()
    Application.query.delete()
    PlacementDrives.query.delete()
    DriveTemplate.query.delete()
    CompanyProfile.query.delete()
    StudentProfile.query.delete()
    Department.query.delete()
    SupportQuery.query.delete()
    Notification.query.delete()
    # Keep roles and admin user safe
    admin_user = User.query.filter_by(email='admin@iitm.ac.in').first()
    if admin_user:
        User.query.filter(User.id != admin_user.id).delete()
    else:
        User.query.delete()
    db.session.commit()

    now = datetime.now()
    tomorrow_12am = now.date() + timedelta(days=1)
    day_after_tomorrow_12am = now.date() + timedelta(days=2)
    
    # --- 2. Create Departments ---
    for dept_name in DEPARTMENTS:
        db.session.add(Department(department=dept_name))
    db.session.commit()

    # --- 3. Create Hero Users ---
    print("Creating Hero Users (stud@iitm.ac.in and comp@iitm.ac.in)...")
    
    # Create Company
    hero_comp_user = user_datastore.create_user(email="comp@iitm.ac.in", password=hash_password("comp143"), roles=['comp'], active=True)
    db.session.flush()
    hero_company = CompanyProfile(
        user_id=hero_comp_user.id, company_name="TechNova Global", address="123 Innovation Park, Tech City",
        contact="9876543210", website="https://technova.example.com", logo_image="static/images/default_company_logo.png",
        gstin="22AAAAA0000A1Z5", description="Leading AI and Data Science solutions provider.", is_approved=True
    )
    db.session.add(hero_company)

    # Create a Pending Company for Demo (admin approval showcase)
    hero_pending_user = user_datastore.create_user(email="comp_pending@iitm.ac.in", password=hash_password("comp143"), roles=['comp'], active=True)
    db.session.flush()
    hero_pending_company = CompanyProfile(
        user_id=hero_pending_user.id, company_name="EcoSystems Solutions", address="456 Green Boulevard, Eco Park",
        contact="9876501234", website="https://ecosystems.example.com", logo_image="static/images/default_company_logo.png",
        gstin="22BBBBB0000B1Z5", description="Next generation sustainability and eco-tech solutions.", is_approved=False
    )
    db.session.add(hero_pending_company)

    # Create Student (Aarav - Must NOT be hired yet)
    hero_stud_user = user_datastore.create_user(email="stud@iitm.ac.in", password=hash_password("stud143"), roles=['stud'], active=True)
    db.session.flush()
    hero_student = StudentProfile(
        user_id=hero_stud_user.id, name="Aarav Sharma", roll_no="22DS9999", phone="9123456789", cgpa=8.2,
        department="Data Science and AI", skills="Python,SQL,Machine Learning,React", resume="static/uploads/resumes/dummy_resume.pdf",
        linkedin="https://linkedin.com/in/aarav-sharma", github="https://github.com/aarav-sharma", profile_pic="static/images/default-avtar.png"
    )
    db.session.add(hero_student)
    db.session.commit()


    # --- 4. Create "Demo Universe" Drives for Hero Company ---
    print("Creating 5 Target Drives for Hero Demo...")
    
    demo_dept = ["Data Science and AI", "Computer Science"]
    demo_skills = ["Python", "Machine Learning", "SQL", "React"]

    #Template-drives
    template1= DriveTemplate(
        CompanyID=hero_company.id,TemplateName="DS Intern Template",JobTitle="Data Science Intern Template",
        JobDescription="<h3>About the Role</h3><p>This is a template for our Data Science Internship positions. The ideal candidate will have a strong foundation in machine learning concepts and practical experience with Python and SQL.</p>",
        Departments=demo_dept,RequiredSkills=demo_skills,WorkMode="onsite",Location="Bangalore",Vacancies=5,noRounds=2,
        InterviewRounds=["Technical", "HR"])
    template2= DriveTemplate(
        CompanyID=hero_company.id,TemplateName="Software Engineer Job Template",JobTitle="Software Engineer Job Template",
        JobDescription="<h3>About the Role</h3><p>This template is for full-time Software Engineer positions. We are looking for candidates with experience in building scalable backend systems and a passion for clean code.</p>",
        Departments=demo_dept,RequiredSkills=demo_skills,WorkMode="hybrid",Location="Hyderabad",Vacancies=10,noRounds=3,
        InterviewRounds=["Coding Test", "Technical", "HR"])
    db.session.add_all([template1, template2])
    db.session.commit()


    # Drive 1: Needs a Pending Application
    d1_pending = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Lead Data Scientist Intern", Type="Internship", JobDescription="Looking for strong ML skills.", 
        Departments=demo_dept, RequiredSkills=["Machine Learning", "Python"], Vacancies=2, WorkMode="onsite", ApplyDeadline=(now + timedelta(days=15)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=2)).date(), Location="Bangalore", Salary="40000", Duration="6", noRounds=2, 
        InterviewRounds=["Technical", "HR"], min_cgpa=7.5
    )

    # Drive 2: Needs an Offer (Selected but not responded)
    d2_offer = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="AI Engineer", Type="Job", JobDescription="Full-time AI role.", 
        Departments=demo_dept, RequiredSkills=["Python", "SQL"], Vacancies=3, WorkMode="hybrid", ApplyDeadline=(now + timedelta(days=10)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=20)).date(), Location="Hyderabad", Salary="18", noRounds=2, 
        InterviewRounds=["Technical", "Managerial"], min_cgpa=7.0
    )

    # Drive 3: Needs a Shortlisted application (awaiting schedule)
    d3_shortlist = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Machine Learning Intern", Type="Internship", JobDescription="Summer internship.", 
        Departments=demo_dept, RequiredSkills=["Python"], Vacancies=5, WorkMode="remote", ApplyDeadline=tomorrow_12am, 
        Status="Active", PostedDate=(now - timedelta(days=10)).date(), Location="Remote", Salary="40000", Duration="6", noRounds=2, 
        InterviewRounds=["Take-home Assignment", "System Design"], min_cgpa=7.5
    )

    # Drive 4: Needs an Interview Scheduled for YESTERDAY (For status update demo)
    d4_interview_past1 = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Data Analyst", Type="Job", JobDescription="Data crunching and reporting.", 
        Departments=demo_dept, RequiredSkills=["SQL"], Vacancies=4, WorkMode="onsite", ApplyDeadline=(now + timedelta(days=20)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=15)).date(), Location="Pune", Salary="12", noRounds=2, 
        InterviewRounds=["SQL Test", "Technical"], min_cgpa=6.0
    )

    # Drive 5: Needs a Round 2 Interview Scheduled for YESTERDAY (For status update demo)
    d5_interview_past2 = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Backend Developer", Type="Job", JobDescription="API development.", 
        Departments=demo_dept, RequiredSkills=["Python", "React"], Vacancies=1, WorkMode="hybrid", ApplyDeadline=(now + timedelta(days=12)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=25)).date(), Location="Chennai", Salary="15", noRounds=3, 
        InterviewRounds=["Coding Test", "System Design", "HR"], min_cgpa=7.0
    )

    # Drive 6: Deadline day after tomorrow at 12 AM
    d6_deadline_day_after = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Cloud Engineer", Type="Job", JobDescription="Cloud infrastructure management.", 
        Departments=demo_dept, RequiredSkills=demo_skills, Vacancies=3, WorkMode="remote", ApplyDeadline=day_after_tomorrow_12am, 
        Status="Active", PostedDate=(now - timedelta(days=3)).date(), Location="Remote", Salary="14", noRounds=2, 
        InterviewRounds=["Technical", "HR"], min_cgpa=6.5
    )

    # Drive 7: Pending Admin Approval
    d7_pending_approval = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Security Engineer", Type="Job", JobDescription="Manage application and cloud security.", 
        Departments=demo_dept, RequiredSkills=["Python", "OWASP"], Vacancies=2, WorkMode="onsite", ApplyDeadline=(now + timedelta(days=25)).date(), 
        Status="Pending", PostedDate=(now - timedelta(days=1)).date(), Location="Bangalore", Salary="18", noRounds=2, 
        InterviewRounds=["Security Test", "HR"], min_cgpa=7.5
    )

    # Drive 8: Eligible, not applied (For applying demo)
    d8_eligible = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="Frontend Developer", Type="Job", JobDescription="React development.", 
        Departments=demo_dept, RequiredSkills=["React", "JavaScript"], Vacancies=3, WorkMode="onsite", ApplyDeadline=(now + timedelta(days=15)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=2)).date(), Location="Bangalore", Salary="10", noRounds=2, 
        InterviewRounds=["Frontend Test", "HR"], min_cgpa=7.0
    )

    # Drive 9: Ineligible due to CGPA (For eligibility validation demo)
    d9_ineligible_cgpa = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="AI Research Lead", Type="Job", JobDescription="Core AI research.", 
        Departments=demo_dept, RequiredSkills=["Python", "Machine Learning"], Vacancies=1, WorkMode="remote", ApplyDeadline=(now + timedelta(days=15)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=1)).date(), Location="Remote", Salary="35", noRounds=3, 
        InterviewRounds=["Thesis Review", "Technical", "HR"], min_cgpa=9.0
    )

    # Drive 10: Ineligible due to skills (For eligibility validation demo)
    d10_ineligible_skills = PlacementDrives(
        CompanyID=hero_company.id, JobTitle="DevOps Specialist", Type="Job", JobDescription="Manage CI/CD pipeline.", 
        Departments=demo_dept, RequiredSkills=["Kubernetes", "Docker", "AWS"], Vacancies=2, WorkMode="hybrid", ApplyDeadline=(now + timedelta(days=20)).date(), 
        Status="Active", PostedDate=(now - timedelta(days=4)).date(), Location="Mumbai", Salary="16", noRounds=2, 
        InterviewRounds=["DevOps Challenge", "HR"], min_cgpa=7.0
    )

    db.session.add_all([
        d1_pending, d2_offer, d3_shortlist, d4_interview_past1, d5_interview_past2, 
        d6_deadline_day_after, d7_pending_approval, d8_eligible, d9_ineligible_cgpa, d10_ineligible_skills
    ])
    db.session.commit()


    # --- 5. Create the 5 Specific Applications for Aarav ---
    print("Wiring Aarav's 5 exact applications...")
    
    # App 1: Just applied, sits in "Pending"
    app1 = Application(DriveID=d1_pending.DriveID, student_id=hero_student.id, status="Pending", application_datetime=now - timedelta(hours=2))
    
    # App 2: Selected and received an offer (but has NOT accepted it)
    app2 = Application(DriveID=d2_offer.DriveID, student_id=hero_student.id, status="Selected", application_datetime=now - timedelta(days=18), selected_date=(now - timedelta(days=2)).date())
    
    # App 3: Shortlisted, waiting for company to schedule interview
    app3 = Application(DriveID=d3_shortlist.DriveID, student_id=hero_student.id, status="Shortlisted", application_datetime=now - timedelta(days=8))
    
    # App 4: Interviewing - Round 1 Scheduled for YESTERDAY
    app4 = Application(DriveID=d4_interview_past1.DriveID, student_id=hero_student.id, status="Shortlisted", application_datetime=now - timedelta(days=14))
    
    # App 5: Interviewing - Round 2 Scheduled for YESTERDAY
    app5 = Application(DriveID=d5_interview_past2.DriveID, student_id=hero_student.id, status="Shortlisted", application_datetime=now - timedelta(days=22))

    # App 6: Selected but offer letter not sent yet
    app6 = Application(DriveID=d6_deadline_day_after.DriveID, student_id=hero_student.id, status="Selected", application_datetime=now - timedelta(days=5), selected_date=(now - timedelta(days=1)).date())

    db.session.add_all([app1, app2, app3, app4, app5, app6])
    db.session.commit()

    # --- 6. Create the "Time-Bomb" Interviews & Offers for Aarav ---
    
    # Offer for App 2
    offer2 = Placement(
        application_id=app2.id, offer_sent=True, offer_sent_date=now - timedelta(days=1),
        offer_expiry_date=(now + timedelta(days=3)).date(), offer_letter="static/uploads/offers/dummy_offer.pdf",
        joining_date=(now + timedelta(days=60)).date(), offer_status="Sent", message="We'd love to have you on the team."
    )
    db.session.add(offer2)

    # Consistent completed interviews for App 2 (Selected)
    int2_r1 = Interview(
        application_id=app2.id, round_no=1, round_name=d2_offer.InterviewRounds[0],
        datetime=now - timedelta(days=15), status="completed", result="passed", remarks="Excellent problem solving skills."
    )
    int2_r2 = Interview(
        application_id=app2.id, round_no=2, round_name=d2_offer.InterviewRounds[1],
        datetime=now - timedelta(days=10), status="completed", result="passed", remarks="Great communication and cultural fit."
    )
    db.session.add_all([int2_r1, int2_r2])

    # Interview for App 4 (Round 1 - Scheduled for Today)
    int4_r1 = Interview(
        application_id=app4.id, round_no=1, round_name=d4_interview_past1.InterviewRounds[0], 
        datetime=now + timedelta(hours=4), # Upcoming today
        location_or_link="https://meet.google.com/abc-defg-hij", status="scheduled"
    )
    db.session.add(int4_r1)

    # Interviews for App 5 (Round 1 Passed, Round 2 - Scheduled for Tomorrow)
    int5_r1 = Interview(
        application_id=app5.id, round_no=1, round_name=d5_interview_past2.InterviewRounds[0], 
        datetime=now - timedelta(days=5), status="completed", result="passed", remarks="Good coding skills."
    )
    int5_r2 = Interview(
        application_id=app5.id, round_no=2, round_name=d5_interview_past2.InterviewRounds[1], 
        datetime=now + timedelta(days=1, hours=2), # Upcoming tomorrow
        location_or_link="https://meet.google.com/xyz-uvwx-lmn", status="scheduled"
    )
    db.session.add_all([int5_r1, int5_r2])
    db.session.commit()

    # --- 6.5. Create Support Queries ---
    print("Creating support queries for demo...")
    sq_stud = SupportQuery(
        user_id=hero_stud_user.id,
        message="Cannot upload PDF resume, keeps showing file size error.",
        created_at=now - timedelta(days=1),
        status="Open"
    )
    sq_comp = SupportQuery(
        user_id=hero_comp_user.id,
        message="How do we edit an active drive template?",
        created_at=now - timedelta(days=3),
        status="Closed",
        response="Templates can be edited from the Templates tab in your dashboard.",
        responded_at=now - timedelta(days=2)
    )
    db.session.add_all([sq_stud, sq_comp])
    db.session.commit()

    # --- 6.6. Create Notifications ---
    print("Creating notifications for demo...")
    notif1 = Notification(
        user_id=hero_stud_user.id,
        message="Your application for 'Lead Data Scientist Intern' has been submitted.",
        type="info",
        is_read=False,
        created_at=now - timedelta(hours=2)
    )
    notif2 = Notification(
        user_id=hero_stud_user.id,
        message="Interview scheduled for 'Data Analyst' on Google Meet.",
        type="success",
        is_read=False,
        created_at=now - timedelta(hours=1)
    )
    notif3 = Notification(
        user_id=hero_comp_user.id,
        message="Aarav Sharma has applied to 'Lead Data Scientist Intern'.",
        type="info",
        is_read=False,
        created_at=now - timedelta(hours=2)
    )
    db.session.add_all([notif1, notif2, notif3])
    db.session.commit()

    # --- 7. Create Random Companies & Students (Background Noise) ---
    print("Generating random background noise (Companies & Students)...")
    companies = [hero_company]
    for i in range(NUM_COMPANIES):
        user = user_datastore.create_user(email=f"comp{i}@iitm.ac.in", password=hash_password(f"comp{i}143"), roles=['comp'], active=True)
        db.session.flush()
        is_appr = random.choices([True, False], weights=[80, 20])[0]
        comp = CompanyProfile(user_id=user.id, company_name=fake.company(), address=fake.address(), contact=fake.phone_number()[:15], website=fake.url(), gstin=fake.bothify(text='##AAAAA####?#Z#').upper(), description=fake.paragraph(nb_sentences=3), is_approved=is_appr)
        db.session.add(comp)
        if is_appr:
            companies.append(comp)

    students = [hero_student]
    for i in range(NUM_STUDENTS):
        user = user_datastore.create_user(email=f"stud{i}@iitm.ac.in", password=hash_password(f"stud{i}143"), roles=['stud'], active=True)
        db.session.flush()
        is_sparse = random.random() < 0.1 
        stud = StudentProfile(user_id=user.id, name=fake.name(), roll_no=f"{random.choice(['CS', 'EE', 'ME', 'CE', 'DS'])}{random.randint(20, 23)}B{i:03d}", phone=fake.phone_number()[:15], cgpa=round(random.uniform(5.5, 9.8), 2), department=random.choice(DEPARTMENTS), skills="" if is_sparse else ','.join(random.sample(SKILLS, k=random.randint(2, 6))), resume=None if is_sparse else 'static/uploads/resumes/sample_resume.pdf')
        db.session.add(stud)
        students.append(stud)
    db.session.commit()

    # --- 8. Create Random Placement Drives ---
    print("Generating random drives...")
    drives = [d1_pending, d2_offer, d3_shortlist, d4_interview_past1, d5_interview_past2, d6_deadline_day_after, d7_pending_approval, d8_eligible, d9_ineligible_cgpa, d10_ineligible_skills]
    for i in range(NUM_DRIVES):
        company = random.choice(companies)
        drive_type = random.choice(["Job", "Internship"])
        num_rounds = random.randint(1, 4)
        status = random.choices(["Active", "Pending", "Application Closed", "Rejected"], weights=[60, 15, 20, 5])[0]
        
        posted_date = fake.date_between(start_date='-60d', end_date='today')
        deadline = posted_date + timedelta(days=random.randint(10, 30))

        drive = PlacementDrives(CompanyID=company.id, JobTitle=random.choice(JOB_ROLES), JobDescription=fake.paragraph(nb_sentences=5), Departments=random.sample(DEPARTMENTS, k=random.randint(1, len(DEPARTMENTS))), Vacancies=random.randint(1, 15), RequiredSkills=random.sample(SKILLS, k=random.randint(1, 4)), WorkMode=random.choice(["remote", "hybrid", "onsite"]), ApplyDeadline=deadline, Status=status, Type=drive_type, Location=fake.city(), Salary=str(random.randint(5, 35)) if drive_type == "Job" else str(random.randint(15000, 60000)), Duration=str(random.randint(3, 6)) if drive_type == "Internship" else None, noRounds=num_rounds, InterviewRounds=random.sample(INTERVIEW_ROUNDS, k=num_rounds), min_cgpa=random.choice([6.0, 7.0, 7.5, 8.0, 8.5, None]), PostedDate=posted_date)
        db.session.add(drive)
        drives.append(drive)
    db.session.commit()

    # --- 9. Process Random Workflows ---
    print("Processing random applications for background students...")
    active_drives = [d for d in drives if d.Status in ['Active', 'Application Closed']]
    applied_pairs = set()

    # Ensure Aarav is excluded from random applications
    random_students = [s for s in students if s.id != hero_student.id]

    for student in random_students:
        num_apps = random.randint(1, NUM_APPLICATIONS_PER_STUDENT)
        chosen_drives = random.sample(active_drives, min(num_apps, len(active_drives)))
        
        for drive in chosen_drives:
            if (student.id, drive.DriveID) in applied_pairs: continue
            applied_pairs.add((student.id, drive.DriveID))

            app_status = random.choices(['Pending', 'Shortlisted', 'Rejected', 'Selected', 'Hired'], weights=[30, 30, 20, 10, 10])[0]
            
            app = Application(DriveID=drive.DriveID, student_id=student.id, status=app_status, resume=student.resume, application_datetime=fake.date_time_between(start_date=drive.PostedDate, end_date=now))
            db.session.add(app)
            db.session.flush()

            total_rounds = drive.noRounds or 1
            if not drive.InterviewRounds:
                drive.InterviewRounds = [f"Round {r+1}" for r in range(total_rounds)]
                db.session.add(drive)

            if app_status == 'Pending':
                # No interviews
                pass

            elif app_status == 'Shortlisted':
                # Candidate is in progress. Some rounds completed & passed, last one might be scheduled.
                rounds_to_do = random.randint(1, total_rounds)
                for r in range(rounds_to_do):
                    is_last = (r == rounds_to_do - 1)
                    int_status = 'scheduled' if is_last else 'completed'
                    int_result = None if is_last else 'passed'
                    
                    round_name = drive.InterviewRounds[r] if r < len(drive.InterviewRounds) else f"Round {r+1}"
                    interview = Interview(
                        application_id=app.id, round_no=r+1, round_name=round_name, datetime=app.application_datetime + timedelta(days=r*3 + 2),
                        location_or_link=f"https://meet.google.com/{fake.lexify(text='???-????-???')}", status=int_status, result=int_result, remarks=fake.sentence() if not is_last else None
                    )
                    db.session.add(interview)

            elif app_status in ['Selected', 'Hired']:
                # All rounds completed and passed
                for r in range(total_rounds):
                    round_name = drive.InterviewRounds[r] if r < len(drive.InterviewRounds) else f"Round {r+1}"
                    interview = Interview(
                        application_id=app.id, round_no=r+1, round_name=round_name, datetime=app.application_datetime + timedelta(days=r*3 + 2),
                        location_or_link=f"https://meet.google.com/{fake.lexify(text='???-????-???')}", status='completed', result='passed', remarks=fake.sentence()
                    )
                    db.session.add(interview)

                offer_status = 'Sent' if app_status == 'Selected' else 'Accepted'
                placement = Placement(
                    application_id=app.id, offer_sent=True, offer_sent_date=now - timedelta(days=2),
                    offer_expiry_date=(now + timedelta(days=5)).date(), offer_letter=f'static/uploads/offers/dummy_offer.pdf',
                    joining_date=(now + timedelta(days=60)).date(), offer_status=offer_status, message="Congratulations on your selection!"
                )
                db.session.add(placement)

            elif app_status == 'Rejected':
                # Rejections are modeled consistently:
                # 50% chance: direct rejection (no interviews)
                # 35% chance: failed a specific round
                # 15% chance: declined the offer (passed all rounds, but placement declined)
                rejection_type = random.choices(['direct', 'failed_round', 'declined_offer'], weights=[50, 35, 15])[0]
                
                if rejection_type == 'direct':
                    app.rejection_reason = "Resume did not match requirements."
                elif rejection_type == 'failed_round':
                    failed_round = random.randint(1, total_rounds)
                    for r in range(failed_round):
                        is_fail_round = (r == failed_round - 1)
                        int_status = 'completed'
                        int_result = 'failed' if is_fail_round else 'passed'
                        
                        round_name = drive.InterviewRounds[r] if r < len(drive.InterviewRounds) else f"Round {r+1}"
                        interview = Interview(
                            application_id=app.id, round_no=r+1, round_name=round_name, datetime=app.application_datetime + timedelta(days=r*3 + 2),
                            location_or_link=f"https://meet.google.com/{fake.lexify(text='???-????-???')}", status=int_status, result=int_result, remarks="Failed to answer key technical questions." if is_fail_round else fake.sentence()
                        )
                        db.session.add(interview)
                    app.rejection_reason = f"Failed in {drive.InterviewRounds[failed_round-1] if failed_round-1 < len(drive.InterviewRounds) else f'Round {failed_round}'}."
                elif rejection_type == 'declined_offer':
                    for r in range(total_rounds):
                        round_name = drive.InterviewRounds[r] if r < len(drive.InterviewRounds) else f"Round {r+1}"
                        interview = Interview(
                            application_id=app.id, round_no=r+1, round_name=round_name, datetime=app.application_datetime + timedelta(days=r*3 + 2),
                            location_or_link=f"https://meet.google.com/{fake.lexify(text='???-????-???')}", status='completed', result='passed', remarks=fake.sentence()
                        )
                        db.session.add(interview)
                    placement = Placement(
                        application_id=app.id, offer_sent=True, offer_sent_date=now - timedelta(days=5),
                        offer_expiry_date=(now - timedelta(days=1)).date(), offer_letter=f'static/uploads/offers/dummy_offer.pdf',
                        joining_date=(now + timedelta(days=60)).date(), offer_status='Rejected', message="Congratulations on your selection!"
                    )
                    db.session.add(placement)
                    app.rejection_reason = "Offer rejected by student."
    
    db.session.commit()

    print("--- DUMMY DATA SEEDING COMPLETE ---")
    print("Login with:")
    print("Student: stud@iitm.ac.in | Password: stud143")
    print("Company (Approved): comp@iitm.ac.in | Password: comp143")
    print("Company (Pending): comp_pending@iitm.ac.in | Password: comp143")
    print("Admin: admin@iitm.ac.in | Password: admin143")


# --- Execute Script ---
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        # Using a higher threshold just in case Admin was the only user
        if User.query.count() <= 3:
            print("Existing user count is low, generating dummy data...")
            generate_dummy_data(app.user_datastore)
        else:
            print("Database already contains data, skipping dummy data generation.")