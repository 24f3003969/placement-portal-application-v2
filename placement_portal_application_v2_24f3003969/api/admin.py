import os
import glob
from datetime import datetime, timedelta
from flask import Blueprint, request, current_app
from flask_restful import Api, Resource, fields, reqparse, marshal_with, marshal
from flask_security import auth_required, current_user, roles_required, roles_accepted
from sqlalchemy import or_, func
from sqlalchemy.orm import joinedload
from collections import Counter

from application.extensions import db, cache
from application.models import (
    Application, CompanyProfile, PlacementDrives, StudentProfile,
    Interview, User, Department, SupportQuery, Placement, UserStatusHistory
)
from .shared import create_notification, placement_drive_fields
from .student import student_app_fields

admin_bp = Blueprint('admin_api', __name__)
admin_api = Api(admin_bp)

# --- Fields and Parsers ---

company_summary_fields = {
    'id': fields.Integer,
    'user_id': fields.Integer,
    'company_name': fields.String,
    'industry': fields.String,
    'is_approved': fields.Boolean
}

drive_summary_fields = {
    'DriveID': fields.Integer,
    'JobTitle': fields.String,
    'company_name': fields.String,
    'PostedDate': fields.String,
    'Type': fields.String,
    'ApplyDeadline': fields.String,
}

employer_get_fields = {
    'id': fields.Integer,
    'user_id': fields.Integer,
    'contact': fields.String,
    'website': fields.String,
    'company_name': fields.String,
    'gstin': fields.String,
    'address': fields.String,
    'description': fields.String,
    'logo_image': fields.String,
    'is_approved': fields.Boolean,
    'user_active': fields.Boolean(attribute=lambda p: p.user.active if p.user else False),
    'has_response_delay': fields.Boolean,
    'approved_drives_count': fields.Integer,
    'rejected_drives_count': fields.Integer,
    'highest_posted_department': fields.String,
    'email': fields.String(attribute='user.email'),
    'drive_departments': fields.Raw(attribute=lambda x: [d.Departments for d in x.drives if d.Departments]),
    'registration_date': fields.String(attribute=lambda p: p.registration_date.isoformat() if p.registration_date else None)
}

department_parser = reqparse.RequestParser()
department_parser.add_argument('name', type=str, required=True, help="Department is required")

dept_field = {
    'id': fields.Integer,
    'department': fields.String
}

interview_admin_fields = {
    'id': fields.Integer,
    'application_id': fields.Integer,
    'round_no': fields.Integer,
    'round_name': fields.String,
    'datetime': fields.String(attribute=lambda x: x.datetime.isoformat() if x.datetime else None),
    'datetime_formatted': fields.String(attribute=lambda x: x.datetime.strftime('%d %b %Y, %I:%M %p') if x.datetime else 'Not Scheduled'),
    'location_or_link': fields.String,
    'status': fields.String,
    'remarks': fields.String,
    'student_facing_remarks': fields.String,
    'reschedule_count': fields.Integer,
    'result': fields.String,
    'student_name': fields.String(attribute='application.student.name'),
    'student_roll_no': fields.String(attribute='application.student.roll_no'),
    'application_status': fields.String(attribute='application.status')
}

student_list_fields = { 
    'user_id': fields.Integer,
    'name': fields.String,
    'roll_no': fields.String,
    'department': fields.String,
    'email': fields.String(attribute='user.email'), 
    'cgpa': fields.String,
    'drives_applied_count': fields.Integer,
    'is_active': fields.Boolean(attribute='user.active'),
    'disable_note': fields.String,
    'registration_date': fields.String(attribute=lambda p: p.registration_date.isoformat() if p.registration_date else None),
    'skills': fields.String,
    'linkedin': fields.String,
    'github': fields.String,
    'certificates_link': fields.String,
    'resume': fields.String,
    'profile_pic': fields.String
}

student_application_admin_view_fields = {
    'drive_title': fields.String(attribute='drive.JobTitle'),
    'company_name': fields.String(attribute='drive.company.company_name'),
    'status': fields.String,
    'resume': fields.String,
    'application_datetime': fields.String
}

# --- API Resources ---

class AdminDashboardAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @cache.cached(timeout=300, key_prefix="admin_dashboard")
    def get(self):
        # 1. Real-Time Pulse (Header Stats)
        active_students_count = StudentProfile.query.join(User).filter(User.active == True).count()
        active_companies_count = CompanyProfile.query.join(User).filter(User.active == True, CompanyProfile.is_approved == True).count()
        active_drives_count = PlacementDrives.query.filter(PlacementDrives.Status.in_(['Active', 'Approved'])).count()
        # A pending company is one that is not yet approved but whose user account is active.
        pending_companies_count = CompanyProfile.query.join(User).filter(
            CompanyProfile.is_approved == False, User.active == True
        ).count()
        pending_drives_count = PlacementDrives.query.filter_by(Status='Pending').count()
        total_placed_count = db.session.query(func.count(func.distinct(Application.student_id))).filter(Application.status.in_(['Hired', 'Selected']), Application.rejection_reason == None).scalar() or 0

        pulse_stats = {
            "active_students": active_students_count,
            "active_companies": active_companies_count,
            "active_drives": active_drives_count,
            "pending_approvals": pending_companies_count + pending_drives_count,
            "total_placed": total_placed_count
        }

        # 2. Talent Metrics (Left Sidebar)
        avg_cgpa = db.session.query(func.avg(func.cast(StudentProfile.cgpa, db.Float))).scalar() or 0.0
        
        total_students = StudentProfile.query.count() or 1 # Avoid division by zero
        branch_health_raw = db.session.query(StudentProfile.department, func.count(StudentProfile.id).label('count')).group_by(StudentProfile.department).order_by(func.count(StudentProfile.id).desc()).all()
        branch_health = [{"department": dept, "percentage": round((count / total_students) * 100, 1)} for dept, count in branch_health_raw]

        all_skills_raw = db.session.query(StudentProfile.skills).filter(StudentProfile.skills.isnot(None)).all()
        all_skills_flat = [skill.strip().lower() for record in all_skills_raw for skill in record.skills.split(',') if skill.strip()]
        skills_heatmap = [{"skill": item[0], "count": item[1]} for item in Counter(all_skills_flat).most_common(5)]

        eligible_students_count = StudentProfile.query.filter(func.cast(StudentProfile.cgpa, db.Float) >= avg_cgpa).count()
        eligibility_ratio = round((eligible_students_count / total_students) * 100, 1) if total_students > 0 else 0

        talent_metrics = {
            "average_cgpa": round(avg_cgpa, 2),
            "branch_health": branch_health,
            "skills_heatmap": skills_heatmap,
            "eligibility_ratio": eligibility_ratio
        }

        # 3. Activity Hub (Center Column)
        funnel_applied = Application.query.count()
        funnel_shortlisted = Application.query.filter(Application.status.in_(['Shortlisted', 'Selected', 'Hired']), Application.rejection_reason == None).count()
        funnel_interviewing = db.session.query(Interview.application_id).distinct().count()
        funnel_hired = Application.query.filter_by(status='Hired').count()
        
        placement_funnel = {
            "applied": funnel_applied,
            "shortlisted": funnel_shortlisted,
            "interviewing": funnel_interviewing,
            "hired": funnel_hired
        }

        latest_pending_companies = CompanyProfile.query.join(User).filter(
            CompanyProfile.is_approved == False, User.active == True
        ).order_by(CompanyProfile.id.desc()).limit(5).all()

        work_mode_data = db.session.query(
            PlacementDrives.WorkMode, 
            func.count(PlacementDrives.DriveID)
        ).filter(PlacementDrives.Status.in_(['Active', 'Approved'])).group_by(PlacementDrives.WorkMode).all()

        # Aggregate Drive Types (Job vs Internship)
        type_data = db.session.query(
            PlacementDrives.Type, 
            func.count(PlacementDrives.DriveID)
        ).filter(PlacementDrives.Status.in_(['Active', 'Approved'])).group_by(PlacementDrives.Type).all()

        activity_hub = {
            "placement_funnel": placement_funnel,
            "latest_pending_companies": marshal(latest_pending_companies, company_summary_fields),
            "market_mix": {
                "work_modes": [{"label": str(row[0]), "value": int(row[1])} for row in work_mode_data],
                "drive_types": [{"label": str(row[0]), "value": int(row[1])} for row in type_data]
            }
        }

        # 4. Urgent Queue (Right Column)
        all_urgent_drive_approvals_query = PlacementDrives.query.filter(
            PlacementDrives.Status == 'Pending', 
            PlacementDrives.ApplyDeadline != None, 
            PlacementDrives.ApplyDeadline > datetime.now()
        ).order_by(PlacementDrives.ApplyDeadline.asc())

        all_urgent_drive_approvals = all_urgent_drive_approvals_query.all()
        urgent_drive_approvals_total = len(all_urgent_drive_approvals)
        top_3_urgent_drive_approvals = all_urgent_drive_approvals[:3]
        
        drives_with_zero_applicants = db.session.query(PlacementDrives).outerjoin(Application).filter(
            PlacementDrives.Status == 'Active', Application.id == None
        ).limit(5).all()
        system_alerts = [{"id": d.DriveID, "message": f"Drive '{d.JobTitle}' has 0 applicants."} for d in drives_with_zero_applicants]

        # Add new offer alerts to system_alerts
        seven_days_ago = datetime.now().date() - timedelta(days=7)
        delayed_offers_query = db.session.query(
            Application.DriveID,
            func.count(Application.id).label('student_count')
        ).outerjoin(Placement).filter(
            Application.status == 'Selected',
            Placement.placement_id.is_(None),
            Application.selected_date != None,
            Application.selected_date <= seven_days_ago
        ).group_by(Application.DriveID).all()

        for drive_id, student_count in delayed_offers_query:
            system_alerts.append({
                "id": drive_id,
                "message": f"Drive #{drive_id} - {student_count} students selected but offer letter not sent for >7 days.",
                "type": "danger"
            })

        # --- New Placement Insights Calculations ---
        placement_insights = []

        # Insight 1: Eligibility Gap
        top_upcoming_drives = PlacementDrives.query.options(joinedload(PlacementDrives.company)).filter(
            PlacementDrives.Status.in_(['Active', 'Pending']),
            PlacementDrives.ApplyDeadline != None, 
            PlacementDrives.ApplyDeadline > datetime.now()
        ).order_by(PlacementDrives.ApplyDeadline.asc()).limit(3).all()

        total_active_students = StudentProfile.query.join(User).filter(User.active == True).count()
        if total_active_students > 0:
            for drive in top_upcoming_drives:
                if drive.min_cgpa:
                    eligible_students_for_drive = StudentProfile.query.join(User).filter(
                        User.active == True,
                        func.cast(StudentProfile.cgpa, db.Float) >= drive.min_cgpa
                    ).count()
                    eligibility_percentage = round((eligible_students_for_drive / total_active_students) * 100, 1)
                    if eligibility_percentage < 50:
                        placement_insights.append({
                            "type": "warning",
                            "message": f"Low Eligibility Alert: {drive.company.company_name} requires {drive.min_cgpa} CGPA for '{drive.JobTitle}'. Only {eligibility_percentage}% of students qualify. Consider manual outreach to similar profiles.",
                            "drive_id": drive.DriveID
                        })

        # Insight 2: Engagement
        now = datetime.now()
        forty_eight_hours_later = now + timedelta(hours=48)
        drives_closing_soon = PlacementDrives.query.filter(
            PlacementDrives.Status == 'Active',
            PlacementDrives.ApplyDeadline != None, 
            PlacementDrives.ApplyDeadline > now,
            PlacementDrives.ApplyDeadline <= forty_eight_hours_later
        ).all()

        for drive in drives_closing_soon:
            application_count = Application.query.filter_by(DriveID=drive.DriveID).count()
            if application_count < 10:
                placement_insights.append({
                    "type": "info",
                    "message": f"Low Engagement: '{drive.JobTitle}' is closing soon with only {application_count} applicants. Suggesting a push notification to eligible students.",
                    "drive_id": drive.DriveID
                })

        # Insight 3: Skill Match
        required_skills_set = {skill.strip().lower() for drive in top_upcoming_drives if drive.RequiredSkills and isinstance(drive.RequiredSkills, list) for skill in drive.RequiredSkills if skill.strip()}
        top_10_student_skills = {item['skill'] for item in talent_metrics['skills_heatmap'][:10]}

        missing_or_low_skills = []
        for req_skill in sorted(list(required_skills_set)):
            if req_skill not in top_10_student_skills:
                students_with_skill_count = StudentProfile.query.filter(
                    StudentProfile.skills.ilike(f"%{req_skill}%") 
                ).count()
                if students_with_skill_count < 20: 
                    missing_or_low_skills.append(req_skill.title())
        
        if missing_or_low_skills:
            critical_skills_str = ", ".join(missing_or_low_skills[:5])
            placement_insights.append({
                "type": "warning",
                "message": f"Skill Gap Detected: Upcoming drives require skills like {critical_skills_str}, but these are missing or low in the student body. Recommend a workshop or resource share."
            })

        # Insight 4: Velocity
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        applied_this_month = Application.query.filter(
            Application.application_datetime >= current_month_start
        ).count()

        shortlisted_this_month = Application.query.filter(
            Application.application_datetime >= current_month_start,
            Application.status.in_(['Shortlisted', 'Selected', 'Hired', 'Interview']),
            Application.rejection_reason == None
        ).count()

        shortlist_rate = 0
        if applied_this_month > 0:
            shortlist_rate = round((shortlisted_this_month / applied_this_month) * 100, 1)
        
        if shortlist_rate < 20: 
            placement_insights.append({
                "type": "danger",
                "message": f"Efficiency Alert: Current 'Applied to Shortlisted' rate is {shortlist_rate}%. Reviewing the screening criteria for active drives is recommended to improve placement velocity."
            })

        urgent_queue = {
            "urgent_drive_approvals": marshal(top_3_urgent_drive_approvals, drive_summary_fields),
            "urgent_drive_approvals_total": urgent_drive_approvals_total,
            "system_alerts": system_alerts,
            "placement_insights": placement_insights
        }

        return {
            "pulse_stats": pulse_stats,
            "talent_metrics": talent_metrics,
            "activity_hub": activity_hub,
            "urgent_queue": urgent_queue
        }, 200

admin_api.add_resource(AdminDashboardAPI, '/admin_dashboard')


class DepartmentAPI(Resource):
    @auth_required('token')
    @roles_accepted('admin', 'comp', 'stud')
    @cache.cached(timeout=43200) # Cache for 12 hours
    def get(self):
        departments = Department.query.all()
        if departments:
            return marshal(departments, dept_field)
        else:
            return [], 200

    @auth_required('token')
    @roles_required('admin')
    def post(self):
        args = department_parser.parse_args()
        dept_name = args['name'].strip()
        if not dept_name:
            return {"message": "Department name cannot be empty"}, 400
        
        existing = Department.query.filter(func.lower(Department.department) == func.lower(dept_name)).first()
        if existing:
            return {"message": f"Department '{dept_name}' already exists"}, 409
        
        new_dept = Department(department=dept_name)
        db.session.add(new_dept)
        db.session.commit()
        cache.clear()
        return {"message": "Department added successfully", "department": marshal(new_dept, {'id': fields.Integer, 'department': fields.String})}, 201
    
    @auth_required('token')
    @roles_required('admin')
    def delete(self, id):
        dept = Department.query.get(id)
        if not dept:
            return {"message": "Department not found"}, 404
        db.session.delete(dept)
        db.session.commit()
        cache.clear()
        return {"message": "Department deleted successfully"}, 200

admin_api.add_resource(DepartmentAPI, '/departments/<int:id>', '/departments')


class AdminCompanyManagementAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @marshal_with(employer_get_fields)
    @cache.cached(timeout=300)
    def get(self):
        query = CompanyProfile.query.join(User, CompanyProfile.user_id == User.id).options(
            joinedload(CompanyProfile.user), 
            joinedload(CompanyProfile.drives)
        )
        
        companies = query.order_by(CompanyProfile.id.desc()).all()

        delay_threshold_date = datetime.now() - timedelta(days=14)
        DELAY_SENSITIVITY_COUNT = 5

        for company in companies:
            drive_ids = [d.DriveID for d in company.drives]
            if drive_ids:
                delayed_apps_count = db.session.query(func.count(Application.id)).filter(
                    Application.DriveID.in_(drive_ids),
                    Application.status == 'Pending',
                    Application.application_datetime < delay_threshold_date
                ).scalar()
                company.has_response_delay = delayed_apps_count > DELAY_SENSITIVITY_COUNT
            else:
                company.has_response_delay = False

            company.approved_drives_count = sum(1 for d in company.drives if d.Status in ['Approved', 'Active', 'Closed'])
            company.rejected_drives_count = sum(1 for d in company.drives if d.Status == 'Rejected')

            all_departments = [dept for drive in company.drives if drive.Departments for dept in drive.Departments]
            clean_departments = [d.get('department') if isinstance(d, dict) else str(d) for d in all_departments]
            if clean_departments:
                company.highest_posted_department = Counter(clean_departments).most_common(1)[0][0]
            else:
                company.highest_posted_department = 'N/A'
        
        return companies, 200

    @auth_required('token')
    @roles_required('admin')
    def put(self, company_id):
        data = request.get_json()
        new_status = data.get('status')
        note = data.get('note', '')
        
        company = CompanyProfile.query.get(company_id)
        if not company:
            return {"message": "Company not found"}, 404
        
        user = company.user
        if not user:
             return {"message": "Associated user account not found"}, 404

        admin_id = current_user.id if current_user and hasattr(current_user, 'id') else None
        message = ""
        from application.tasks import send_company_approval_email_task, send_company_rejection_email_task
        if new_status == 'approved':
            company.is_approved = True
            user.active = True
            send_company_approval_email_task.delay(company.id)
            message = f"{company.company_name} has been approved."
            create_notification(company.user_id, f"Your company profile '{company.company_name}' has been approved.", "success")
        elif new_status == 'rejected':
            company.is_approved = False
            user.active = False
            send_company_rejection_email_task.delay(company.id)
            message = f"{company.company_name} has been rejected and its account deactivated."
            create_notification(company.user_id, f"Your company profile '{company.company_name}' has been rejected and deactivated.", "warning")
        elif new_status == 'disabled':
            user.active = False
            user.disable_note = note
            db.session.add(UserStatusHistory(user_id=user.id, status='disabled', changed_by_id=admin_id, note=note))
            message = f"{company.company_name} has been disabled."
            create_notification(company.user_id, f"Your company account has been disabled. Reason: {note or 'No reason provided.'}", "warning")
        elif new_status == 'enabled':
            user.active = True
            user.disable_note = None
            db.session.add(UserStatusHistory(user_id=user.id, status='enabled', changed_by_id=admin_id, note=note))
            message = f"{company.company_name} has been enabled."
            create_notification(company.user_id, f"Your company account has been re-enabled. Reason: {note or 'No reason provided.'}", "success")
        elif new_status == "re-evaluate":
            user.active = True
            company.is_approved = False
            message = f"{company.company_name} has been put for re-evaluation"
        else:
            return {"message": "Invalid status provided"}, 400
        
        db.session.commit()
        cache.clear()
        return {"message": message}, 200

admin_api.add_resource(AdminCompanyManagementAPI, '/admin/companies', '/admin/company/<int:company_id>')


class AdminDriveInterviewsAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    def get(self, drive_id):
        drive = PlacementDrives.query.get(drive_id)
        if not drive:
            return {"message": "Drive not found"}, 404

        interviews = Interview.query.join(Application).join(StudentProfile).filter(
            Application.DriveID == drive_id
        ).options(
            joinedload(Interview.application).joinedload(Application.student)
        ).order_by(Interview.datetime.asc()).all()

        return marshal(interviews, interview_admin_fields), 200

    @auth_required('token')
    @roles_required('admin')
    def put(self, drive_id, interview_id):
        parser = reqparse.RequestParser()
        parser.add_argument('status', type=str, required=True, choices=('canceled',))
        parser.add_argument('remarks', type=str)
        args = parser.parse_args()

        interview = Interview.query.get(interview_id)
        if not interview:
            return {"message": "Interview not found"}, 404
        if interview.application.DriveID != drive_id:
            return {"message": "Interview does not belong to this drive"}, 403

        if not args['remarks'] or not args['remarks'].strip():
            return {"message": "Reason (remarks) is mandatory when cancelling an interview"}, 400

        interview.status = 'canceled'
        interview.remarks = args['remarks']
        interview.reschedule_count = (interview.reschedule_count or 0) + 1
        
        student_user_id = interview.application.student.user_id
        company_user_id = interview.application.drive.company.user_id
        create_notification(student_user_id, f"Interview Cancelled: Your interview for '{interview.application.drive.JobTitle}' has been canceled by the administrator.", "warning")
        create_notification(company_user_id, f"The interview for '{interview.application.student.name}' ('{interview.application.drive.JobTitle}') has been canceled by the administrator.", "warning")
            
        db.session.commit()
        cache.clear()
        
        from application.tasks import send_interview_update_email_task
        send_interview_update_email_task.delay(interview.id, 'cancel', args['remarks'], 'admin')
            
        return {"message": "Interview updated successfully"}, 200

admin_api.add_resource(AdminDriveInterviewsAPI, '/admin/drives/<int:drive_id>/interviews', '/admin/drives/<int:drive_id>/interviews/<int:interview_id>')


class AdminPlacementRatesAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @cache.cached(timeout=300)
    def get(self):
        # Fetch all departments
        departments = Department.query.all()
        placement_data = []

        for dept in departments:
            students_in_dept = StudentProfile.query.filter_by(department=dept.department).all()
            total_students_in_dept = len(students_in_dept)

            if total_students_in_dept == 0:
                placement_data.append({
                    "department": dept.department,
                    "placement_rate": 0,
                    "placed_students_count": 0,
                    "total_students_count": 0
                })
                continue

            student_ids_in_dept = [s.id for s in students_in_dept]

            placed_students_count = db.session.query(func.count(func.distinct(Application.student_id))).filter(
                Application.student_id.in_(student_ids_in_dept),
                or_(Application.status == 'Selected', Application.status == 'Hired')
            ).scalar()

            placement_rate = round((placed_students_count / total_students_in_dept) * 100, 2) if total_students_in_dept > 0 else 0

            placement_data.append({
                "department": dept.department,
                "placement_rate": placement_rate,
                "placed_students_count": placed_students_count,
                "total_students_count": total_students_in_dept
            })
        return placement_data, 200

admin_api.add_resource(AdminPlacementRatesAPI, '/admin/reports/placement_rates')


class AdminUnplacedStudentsAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @cache.cached(timeout=300)
    def get(self):
        unplaced_students = []
        students_with_applications = db.session.query(StudentProfile).join(Application).group_by(StudentProfile.id).all()

        for student in students_with_applications:
            applications = Application.query.filter_by(student_id=student.id).all()
            if applications and all(app.status == 'Rejected' or app.rejection_reason is not None for app in applications):
                unplaced_students.append({
                    "user_id": student.user_id,
                    "name": student.name,
                    "roll_no": student.roll_no,
                    "email": student.user.email,
                    "department": student.department
                })
        return unplaced_students, 200

admin_api.add_resource(AdminUnplacedStudentsAPI, '/admin/reports/unplaced_students')


class AdminHiredInsightsAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @cache.cached(timeout=300)
    def get(self):
        highest_package_scalar = db.session.query(
                func.max(func.cast(PlacementDrives.Salary, db.Float))
            ).join(
                Application, PlacementDrives.DriveID == Application.DriveID
            ).filter(
                Application.status.in_(['Hired', 'Selected']),
                PlacementDrives.Type == 'Job',
                PlacementDrives.Salary.isnot(None),
                PlacementDrives.Salary != '',
                Application.selected_date >= (datetime.now() - timedelta(days=365))
            ).scalar()
        highest_package = round(float(highest_package_scalar), 2) if highest_package_scalar else 0.0
        average_package_scalar = db.session.query(
                func.avg(func.cast(PlacementDrives.Salary, db.Float))
            ).join(
                Application, PlacementDrives.DriveID == Application.DriveID
            ).filter(
                Application.status.in_(['Hired', 'Selected']),
                PlacementDrives.Type == 'Job',
                PlacementDrives.Salary.isnot(None),
                PlacementDrives.Salary != '',
                Application.selected_date >= (datetime.now() - timedelta(days=365))
            ).scalar()
        average_package = round(float(average_package_scalar), 2) if average_package_scalar else 0.0

        year_wise_data_raw = db.session.query(
            func.strftime('%Y', Application.application_datetime), 
            func.max(func.cast(PlacementDrives.Salary, db.Float)), 
            func.avg(func.cast(PlacementDrives.Salary, db.Float))
        ).join(
            PlacementDrives, Application.DriveID == PlacementDrives.DriveID
        ).group_by(func.strftime('%Y', Application.application_datetime)).all()
        year_wise_data = []
        for year, max_package, avg_package in year_wise_data_raw:
            year_wise_data.append({
                "year": year,
                "max_package": max_package,
                "avg_package": avg_package
            })
        return {
            "year_wise": year_wise_data,
            "highest_package": highest_package,
            "average_package": average_package
        }, 200

admin_api.add_resource(AdminHiredInsightsAPI, '/admin/reports/hired_insights')


class AdminMultipleOfferHoldersAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @cache.cached(timeout=300)
    def get(self):
        multiple_offer_holders = []
        
        students_with_multiple_offers = db.session.query(
            StudentProfile
        ).join(Application).filter(
            or_(Application.status == 'Selected', Application.status == 'Hired')
        ).group_by(StudentProfile.id).having(func.count(Application.id) > 1).all()

        for student in students_with_multiple_offers:
            offers = []
            
            offer_apps = Application.query.filter(
                Application.student_id == student.id,
                or_(
                    Application.status.in_(['Selected', 'Hired']),
                    Application.rejection_reason != None
                )
            ).all()

            for app in offer_apps:
                if (app.status == 'Rejected' or app.rejection_reason) and not app.placement:
                    continue

                if app.status == 'Rejected' or app.rejection_reason:
                    decision = "Rejected"
                elif app.status == 'Selected':
                    decision = "Not Responded Yet"
                elif app.status == 'Hired':
                    decision = "Accepted"

                compensation = 'N/A'
                if app.drive.Salary:
                    compensation = f"{app.drive.Salary} LPA" if app.drive.Type == 'Job' else f"₹{app.drive.Salary}/mo"

                offers.append({
                    "company_name": app.drive.company_name,
                    "job_title": app.drive.JobTitle,
                    "type": app.drive.Type,
                    "salary": compensation,
                    "decision": decision,
                    "app_status": app.status
                })

            multiple_offer_holders.append({
                "user_id": student.user_id,
                "name": student.name,
                "roll_no": student.roll_no,
                "offer_count": len([o for o in offers if o['app_status'] in ['Selected', 'Hired']]),
                "offers": offers
            })
            
        return multiple_offer_holders, 200

admin_api.add_resource(AdminMultipleOfferHoldersAPI, '/admin/reports/multiple_offers')


class AdminStudentManagementAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @cache.cached(timeout=300)
    def get(self):
        query = db.session.query(
            StudentProfile,
            func.count(Application.id).label('drives_applied_count')
        ).outerjoin(Application, StudentProfile.id == Application.student_id).join(User, StudentProfile.user_id == User.id).group_by(StudentProfile.id, User.id, User.email)

        results = query.order_by(StudentProfile.name).all()

        students_data = []
        for student, count in results:
            student_dict = marshal(student, student_list_fields)
            student_dict['drives_applied_count'] = count
            students_data.append(student_dict)

        return students_data, 200

    @auth_required('token')
    @roles_required('admin')
    def post(self, user_id):
        parser = reqparse.RequestParser()
        parser.add_argument('action', type=str, required=True, choices=('disable', 'enable'))
        parser.add_argument('note', type=str)
        args = parser.parse_args()

        user = User.query.get(user_id)
        if not user:
            return {"message": "User account not found"}, 404

        admin_id = current_user.id if current_user and hasattr(current_user, 'id') else None

        if args['action'] == 'disable':
            user.active = False
            user.disable_note = args['note']
            message = "Student suspended successfully."

            # Log status history
            history_entry = UserStatusHistory(
                user_id=user.id,
                status='disabled',
                changed_by_id=admin_id,
                note=args['note']
            )
            db.session.add(history_entry)

            # Soft suspension of applications
            profile = StudentProfile.query.filter_by(user_id=user.id).first()
            if profile:
                applications = Application.query.filter_by(student_id=profile.id).all()
                for app in applications:
                    if app.status != 'Suspended':
                        app.previous_status = app.status
                        app.status = 'Suspended'
                        # Notify company about application suspension
                        create_notification(
                            app.drive.company.user_id,
                            f"Application for student '{profile.name}' on drive '{app.drive.JobTitle}' has been suspended temporarily.",
                            "warning"
                        )
                
                # Soft suspension of upcoming scheduled interviews
                upcoming_interviews = Interview.query.join(Application).filter(
                    Application.student_id == profile.id,
                    Interview.datetime > datetime.now(),
                    Interview.status == 'scheduled'
                ).all()
                for interview in upcoming_interviews:
                    interview.previous_status = interview.status
                    interview.status = 'suspended'
                    # Notify recruiter
                    create_notification(
                        interview.application.drive.company.user_id,
                        f"Interview with '{profile.name}' for round '{interview.round_name}' on '{interview.datetime}' has been suspended due to candidate account suspension.",
                        "warning"
                    )

            # Notify the student
            create_notification(
                user.id,
                f"Your account has been suspended by the admin. Reason: {args['note'] or 'No reason provided.'}",
                "warning"
            )
            # Send suspension email via Celery
            from application.tasks import send_student_suspension_email_task
            send_student_suspension_email_task.delay(user.id, args['note'])
            
        else: # enable
            user.active = True
            user.disable_note = None
            message = "Student reactivated successfully."

            # Log status history
            history_entry = UserStatusHistory(
                user_id=user.id,
                status='enabled',
                changed_by_id=admin_id,
                note='Re-enabled by admin'
            )
            db.session.add(history_entry)

            profile = StudentProfile.query.filter_by(user_id=user.id).first()
            if profile:
                # Restore applications
                suspended_apps = Application.query.filter_by(student_id=profile.id, status='Suspended').all()
                for app in suspended_apps:
                    if app.previous_status:
                        app.status = app.previous_status
                        app.previous_status = None
                    else:
                        app.status = 'Applied' # fallback
                    # Notify company
                    create_notification(
                        app.drive.company.user_id,
                        f"Suspended application for student '{profile.name}' on drive '{app.drive.JobTitle}' has been restored.",
                        "success"
                    )
                
                # Restore interviews
                suspended_interviews = Interview.query.join(Application).filter(
                    Application.student_id == profile.id,
                    Interview.status == 'suspended'
                ).all()
                for interview in suspended_interviews:
                    if interview.previous_status:
                        interview.status = interview.previous_status
                        interview.previous_status = None
                    else:
                        interview.status = 'scheduled' # fallback
                    # Notify recruiter
                    create_notification(
                        interview.application.drive.company.user_id,
                        f"Interview with '{profile.name}' for round '{interview.round_name}' has been restored.",
                        "success"
                    )

            # Notify the student
            create_notification(
                user.id,
                "Your account has been reactivated. You can now login, access your applications, and participate in placement drives.",
                "success"
            )
            # Send reactivation email via Celery
            from application.tasks import send_student_reactivation_email_task
            send_student_reactivation_email_task.delay(user.id)
        
        db.session.commit()
        cache.clear()
        return {"message": message}, 200

admin_api.add_resource(AdminStudentManagementAPI, '/admin/students', '/admin/student/<int:user_id>/manage')


class AdminViewStudentApplicationsAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    @marshal_with(student_app_fields)
    def get(self, user_id):
        student = StudentProfile.query.filter_by(user_id=user_id).first()
        if not student:
            return {"message": "Student not found"}, 404
        
        applications = Application.query.filter_by(student_id=student.id).options(
            joinedload(Application.student),
            joinedload(Application.drive).joinedload(PlacementDrives.company),
            joinedload(Application.placement)
        ).order_by(Application.application_datetime.desc()).all()

        return applications, 200

admin_api.add_resource(AdminViewStudentApplicationsAPI, '/admin/student/<int:user_id>/applications')


class AdminViewStudentProfileAPI(Resource):
    @auth_required('token')
    @roles_accepted('admin', 'comp')
    def get(self, user_id):
        profile = StudentProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            return {"message": "Student profile not found"}, 404
        
        # Authorization check for company
        if current_user.has_role('comp'):
            company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
            if not company:
                return {"message": "Company profile not found"}, 404
            
            company_drive_ids = [d.DriveID for d in company.drives]
            if not company_drive_ids:
                return {"message": "Unauthorized to view profile. Your company has no drives."}, 403

            has_applied = Application.query.filter(
                Application.student_id == profile.id,
                Application.DriveID.in_(company_drive_ids)
            ).first()

            if not has_applied:
                return {"message": "Unauthorized: Student has not applied to any of your drives."}, 403

        status_history = []
        if current_user.has_role('admin'):
            history_entries = UserStatusHistory.query.filter_by(user_id=user_id).order_by(UserStatusHistory.timestamp.desc()).all()
            for h in history_entries:
                status_history.append({
                    "id": h.id,
                    "status": h.status,
                    "changed_by": h.changed_by.email if h.changed_by else "System",
                    "note": h.note or "No note provided.",
                    "timestamp": h.timestamp.isoformat()
                })

        return {
            "user_id": profile.user_id,
            "name": profile.name, 
            "email": profile.user.email,
            "roll_no": profile.roll_no,
            "phone": profile.phone,
            "cgpa": profile.cgpa,
            "department": profile.department,
            "resume": profile.resume,
            "profile_pic": profile.profile_pic,
            "skills": profile.skills,
            "linkedin": profile.linkedin,
            "github": profile.github,
            "certificates_link": profile.certificates_link,
            "about_me": profile.about_me,
            "registration_date": profile.registration_date.isoformat() if profile.registration_date else None,
            "status_history": status_history
        }, 200

admin_api.add_resource(AdminViewStudentProfileAPI, '/admin/student/<int:user_id>')


class AdminManageDrivesAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    def get(self):
        query = PlacementDrives.query.options(joinedload(PlacementDrives.company))
        drives = query.order_by(PlacementDrives.PostedDate.desc()).all()
        return marshal(drives, placement_drive_fields), 200

    @auth_required('token')
    @roles_required('admin')
    def put(self, drive_id):
        parser = reqparse.RequestParser()
        parser.add_argument('status', type=str, required=True)
        parser.add_argument('remarks', type=str)
        args = parser.parse_args()

        drive = PlacementDrives.query.get(drive_id)
        if not drive:
            return {"message": "Drive not found"}, 404
        
        status = args['status']
        if status == 'Approved':
            drive.Status = 'Active'
        else:
            drive.Status = status
        drive.RejectionDate = None
        from application.tasks import send_drive_rejection_email_task, send_drive_approval_email_task, close_specific_drive_task
        if args['status'] == 'Rejected':
            drive.Remark = args['remarks']
            drive.RejectionDate = datetime.now().date()
            send_drive_rejection_email_task.delay(drive.DriveID)
            create_notification(drive.company.user_id, f"Your placement drive '{drive.JobTitle}' has been rejected by the administrator. Remark: {drive.Remark}", "warning")
        elif args['status'] == 'Approved':
            send_drive_approval_email_task.delay(drive.DriveID)
            deadline_datetime = drive.ApplyDeadline
            close_specific_drive_task.apply_async((drive.DriveID,), eta=deadline_datetime)
            create_notification(drive.company.user_id, f"Your placement drive '{drive.JobTitle}' has been approved by the administrator.", "success")

        db.session.commit()
        return {"message": f"Drive status updated to {args['status']}"}, 200

admin_api.add_resource(AdminManageDrivesAPI, '/admin/drives', '/admin/drives/<int:drive_id>')


class AdminMonthlyReportAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    def get(self):
        reports_dir = os.path.join(current_app.root_path, 'static', 'reports')
        list_of_files = glob.glob(os.path.join(reports_dir, 'admin_monthly_report_*.html'))
        if not list_of_files:
            return {"message": "No monthly report found. Please wait for the scheduled generation."}, 404
        
        latest_file = max(list_of_files, key=os.path.getctime)
        relative_path = os.path.relpath(latest_file, current_app.root_path)
        return {"file_url": f'/{relative_path.replace(os.sep, "/")}'}, 200

    @auth_required('token')
    @roles_required('admin')
    def post(self):
        try:
            from application.tasks import generate_admin_monthly_report_task
            task = generate_admin_monthly_report_task.delay()
            return {"message": "Your admin monthly report is being generated.", "task_id": task.id}, 202
        except Exception as e:
            print(f"Error dispatching admin report task: {e}")
            return {"message": "An error occurred while starting the report generation."}, 500

admin_api.add_resource(AdminMonthlyReportAPI, '/admin/monthly_report')


class AdminSupportQueriesAPI(Resource):
    @auth_required('token')
    @roles_required('admin')
    def get(self):
        queries = SupportQuery.query.options(
            joinedload(SupportQuery.user).joinedload(User.profile),
            joinedload(SupportQuery.user).joinedload(User.company_profile)
        ).order_by(SupportQuery.created_at.desc()).all()
        
        result = []
        for query in queries:
            user = query.user
            identifier = f"User ID: {user.id}"
            role = user.roles[0].name if user.roles else 'Unknown'
            
            if role == 'stud' and user.profile:
                identifier = f"{user.profile.roll_no}"
            elif role == 'comp' and user.company_profile:
                identifier = f"{user.company_profile.company_name}"

            result.append({
                'id': query.id,
                'identifier': identifier,
                'message': query.message,
                'created_at': query.created_at.isoformat(),
                'status': query.status,
                'response': query.response
            })
        return result, 200
    
    @auth_required('token')
    @roles_required('admin')
    def put(self, query_id):
        parser = reqparse.RequestParser()
        parser.add_argument('response', type=str, required=True)
        parser.add_argument('status', type=str, required=True)
        args = parser.parse_args()

        query = SupportQuery.query.get(query_id)
        if not query:
            return {"message": "Query not found"}, 404
        
        query.response = args['response']
        query.status = args['status']
        query.responded_at = datetime.now()
        create_notification(query.user_id, f"Support query answered: Your support query has been resolved by the administrator. Status: {query.status}.", "success")
        db.session.commit()
        from application.tasks import send_support_query_response_email_task
        send_support_query_response_email_task.delay(query.id)
        cache.clear()
        return {"message": "Response sent successfully."}, 200

admin_api.add_resource(AdminSupportQueriesAPI, '/admin/support_queries', '/admin/support_queries/<int:query_id>')
