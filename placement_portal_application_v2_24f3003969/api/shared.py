from flask_restful import fields
from application.extensions import db
from application.models import Notification, Application, StudentProfile
from collections import Counter

def format_date(date_obj):
    return date_obj.isoformat() if date_obj else None

def create_notification(user_id, message, notif_type='info'):
    """Call this inside your routes right next to your Celery .delay() calls"""
    if not Notification.should_notify(message):
        return None
    new_notif = Notification(user_id=user_id, message=message, type=notif_type)
    db.session.add(new_notif)
    # We commit in the main route, so no need to commit here if part of a larger transaction
    return new_notif

placement_drive_fields = {
    'DriveID': fields.Integer,
    'CompanyID': fields.Integer,
    'JobTitle': fields.String,
    'Departments': fields.Raw,
    'JobDescription': fields.String,
    'Vacancies': fields.Integer,
    'RequiredSkills': fields.Raw,
    'InterviewRounds': fields.Raw,
    'Duration': fields.String,
    'Status': fields.String,
    'Type': fields.String,
    'Location': fields.String,
    'Salary': fields.String,
    'company_name': fields.String,
    'logo_image': fields.String,
    'Remark': fields.String,
    'min_cgpa': fields.Float,
    'WorkMode': fields.String,
    'noRounds': fields.Integer,

    'PostedDate': fields.String(attribute=lambda x: x.PostedDate.isoformat() if x.PostedDate else None),
    'ApplyDeadline': fields.String(attribute=lambda x: x.ApplyDeadline.isoformat() if x.ApplyDeadline else None),
    'RejectionDate': fields.String(attribute=lambda x: x.RejectionDate.isoformat() if x.RejectionDate else None),
}

def get_drive_insights(drive_id):
    # Get all applications for the drive, joining with student profiles
    applications = db.session.query(Application).join(StudentProfile, Application.student_id == StudentProfile.id).filter(Application.DriveID == drive_id).all()

    total_applicants = len(applications)

    if total_applicants == 0:
        return {
            "pass_rate": 0,
            "avg_cgpa_all": 0,
            "avg_cgpa_shortlisted": 0,
            "top_skills": [],
            "least_common_skill": None,
            "department_distribution": []
        }

    # 1. Pass Rate (percentage of students who passed initial screening)
    successful_screenings = sum(1 for app in applications if app.status in ['Shortlisted', 'Selected', 'Hired'])
    pass_rate = round((successful_screenings / total_applicants) * 100, 2) if total_applicants > 0 else 0

    # 2. Average CGPA (All)
    total_cgpa_all = sum(float(app.student.cgpa) for app in applications if app.student.cgpa is not None)
    avg_cgpa_all = round(total_cgpa_all / total_applicants, 2) if total_applicants > 0 else 0

    # 3. Average CGPA (Shortlisted)
    shortlisted_apps = [app for app in applications if app.status == 'Shortlisted']
    if shortlisted_apps:
        total_cgpa_shortlisted = sum(float(app.student.cgpa) for app in shortlisted_apps if app.student.cgpa is not None)
        avg_cgpa_shortlisted = round(total_cgpa_shortlisted / len(shortlisted_apps), 2)
    else:
        avg_cgpa_shortlisted = 0

    # 4. Skills Analysis
    all_skills_flat = []
    for app in applications:
        if app.student and app.student.skills:
            all_skills_flat.extend([skill.strip().lower() for skill in app.student.skills.split(',') if skill.strip()])
    
    top_skills_data = []
    least_common_skill = None
    if all_skills_flat:
        skill_counts = Counter(all_skills_flat)
        most_common = skill_counts.most_common()
        
        top_3_skill_names = [item[0] for item in most_common[:3]]
        for skill_name in top_3_skill_names:
            students_with_skill = sum(1 for app in applications if app.student.skills and skill_name in [s.strip().lower() for s in app.student.skills.split(',')])
            percentage = round((students_with_skill / total_applicants) * 100, 2)
            top_skills_data.append({"skill": skill_name.title(), "percentage": percentage})

        if most_common:
            least_common_skill = most_common[-1][0].title()

    # 5. Department Distribution for Bar Chart
    department_counts = Counter(app.student.department for app in applications if app.student and app.student.department)
    department_distribution = []
    for dept, count in department_counts.items():
        percentage = round((count / total_applicants) * 100, 2)
        department_distribution.append({"department": dept, "percentage": percentage})

    return {
        "pass_rate": pass_rate,
        "avg_cgpa_all": avg_cgpa_all,
        "avg_cgpa_shortlisted": avg_cgpa_shortlisted,
        "top_skills": top_skills_data,
        "least_common_skill": least_common_skill,
        "department_distribution": department_distribution
    }

def run_expired_drives_sweep():
    from application.models import PlacementDrives
    from application.extensions import db
    from zoneinfo import ZoneInfo
    from datetime import datetime
    from application.tasks import send_drive_status_update_email_task
    
    today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
    
    # 1. Active expired drives
    expired_active = PlacementDrives.query.filter(
        PlacementDrives.Status == 'Active',
        PlacementDrives.ApplyDeadline != None,
        PlacementDrives.ApplyDeadline < today
    ).all()
    
    # 2. Pending expired drives
    expired_pending = PlacementDrives.query.filter(
        PlacementDrives.Status == 'Pending',
        PlacementDrives.ApplyDeadline != None,
        PlacementDrives.ApplyDeadline < today
    ).all()
    
    modified = False
    for drive in expired_active:
        drive.Status = 'Application Closed'
        modified = True
        send_drive_status_update_email_task.delay(drive.DriveID, 'Application Closed', 'Application deadline reached.')
        msg = f"Your placement drive '{drive.JobTitle}' has been closed because the application deadline was reached."
        create_notification(drive.company.user_id, msg, notif_type='warning')
        
    for drive in expired_pending:
        drive.Status = 'Application Closed'
        modified = True
        send_drive_status_update_email_task.delay(drive.DriveID, 'Application Closed', 'Application deadline passed before approval.')
        msg = f"Your placement drive '{drive.JobTitle}' was not approved before its application deadline passed and is now closed."
        create_notification(drive.company.user_id, msg, notif_type='warning')
        
    if modified:
        db.session.commit()
