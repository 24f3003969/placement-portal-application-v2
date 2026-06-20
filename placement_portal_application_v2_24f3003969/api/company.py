import os
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app, make_response
from flask_restful import Api, Resource, fields, reqparse, marshal_with, inputs, marshal
from flask_security import auth_required, current_user, roles_required, roles_accepted
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
import bleach
from sqlalchemy import or_, func, and_
from sqlalchemy.orm import joinedload
from collections import Counter

from application.extensions import db, cache
from application.models import (
    Application, CompanyProfile, PlacementDrives, StudentProfile,
    Interview, User, DriveTemplate, Placement
)
from .shared import create_notification, format_date, placement_drive_fields, get_drive_insights, get_ist_now, get_ist_date

company_bp = Blueprint('company_api', __name__)
company_api = Api(company_bp)

# --- Parsers and Fields ---

drive_parser = reqparse.RequestParser()
drive_parser.add_argument('JobTitle', type=str, required=True, help="jobtitile is required")
drive_parser.add_argument('JobDescription', type=str, required=True, help="role description is required")
drive_parser.add_argument('Departments', type=list, location='json', required=False, help="check your targetted departments")
drive_parser.add_argument('Vacancies', type=int)
drive_parser.add_argument('RequiredSkills', type=list, location='json', required=False, help="comma separated skills")
drive_parser.add_argument('WorkMode', type=str, required=True, help="working mode is required")
drive_parser.add_argument('noRounds', type=int, required=False, help="number of rounds is required")
drive_parser.add_argument('InterviewRounds', type=list, location='json', required=False, help="interview rounds")
drive_parser.add_argument('ApplyDeadline', type=str, required=True, help="date string is required")
drive_parser.add_argument('Status', type=str, required=True, default="Pending")
drive_parser.add_argument('Type', type=str, required=True, help="Drive type  is required")
drive_parser.add_argument('Location', type=str, required=True, help="address is required")
drive_parser.add_argument('Salary', type=str, required=True, help="salary/stipend is required")
drive_parser.add_argument('Duration', type=str)
drive_parser.add_argument('min_cgpa', type=float, required=False)

template_parser = reqparse.RequestParser()
template_parser.add_argument('TemplateName', type=str, required=True, help="Template name is required")
template_parser.add_argument('JobTitle', type=str, required=True)
template_parser.add_argument('JobDescription', type=str, required=True)
template_parser.add_argument('Departments', type=list, location='json')
template_parser.add_argument('RequiredSkills', type=list, location='json')
template_parser.add_argument('WorkMode', type=str, required=True)
template_parser.add_argument('Location', type=str, required=True)
template_parser.add_argument('Vacancies', type=int)
template_parser.add_argument('noRounds', type=int, required=False)
template_parser.add_argument('InterviewRounds', type=list, location='json', required=False)
template_parser.add_argument('min_cgpa', type=float, required=False)

template_fields = {
    'TemplateName': fields.String,
    'JobTitle': fields.String,
    'JobDescription': fields.String,
    'Departments': fields.Raw,
    'RequiredSkills': fields.Raw,
    'WorkMode': fields.String,
    'Location': fields.String,
    'Vacancies': fields.Integer,
    'noRounds': fields.Integer,
    'InterviewRounds': fields.Raw,
    'min_cgpa': fields.Float,
}

employer_parser = reqparse.RequestParser()
employer_parser.add_argument('contact', type=str, location='form', required=True)
employer_parser.add_argument('website', type=str, location='form')
employer_parser.add_argument('comp_name', type=str, location='form', required=True)
employer_parser.add_argument('secondary_email', type=str, location='form')
employer_parser.add_argument('gstin', type=str, location='form', required=True)
employer_parser.add_argument('address', type=str, location='form', required=True)
employer_parser.add_argument('desc', type=str, location='form', required=True)
employer_parser.add_argument('logo_image', type=FileStorage, location='files', required=False)

employer_fields = {
    'contact': fields.String,
    'website': fields.String,
    'company_name': fields.String,
    'secondary_email': fields.String,
    'gstin': fields.String,
    'address': fields.String,
    'description': fields.String,
    'logo_image': fields.String
}

update_application_parser = reqparse.RequestParser()
update_application_parser.add_argument('status', type=str, required=False)
update_application_parser.add_argument('rejection_reason', type=str)
update_application_parser.add_argument('note_for_student', type=str)
update_application_parser.add_argument('remarks', type=str)
update_application_parser.add_argument('student_facing_remarks', type=str)

schedule_interview_parser = reqparse.RequestParser()
schedule_interview_parser.add_argument('status', type=str, required=True)
schedule_interview_parser.add_argument('datetime', type=inputs.datetime_from_iso8601, required=True, help="Datetime is required for scheduling.")
schedule_interview_parser.add_argument('location', type=str, required=True)
schedule_interview_parser.add_argument('remarks', type=str) # Note for me
schedule_interview_parser.add_argument('student_facing_remarks', type=str) # Note for student

send_offer_parser = reqparse.RequestParser()
send_offer_parser.add_argument('offer_expiry_date', type=str, location='json', required=True, help="Offer expiry date is required.")
send_offer_parser.add_argument('joining_date', type=str, location='json', required=True, help="Joining date is required.")
send_offer_parser.add_argument('message', type=str, location='json')

extend_offer_parser = reqparse.RequestParser()
extend_offer_parser.add_argument('new_expiry_date', type=str, location='json', required=True, help="New expiry date is required.")

# --- API Resources ---

class PlacementDriveAPI(Resource):
    @auth_required()
    def get(self):
         try:
            from .shared import run_expired_drives_sweep
            run_expired_drives_sweep()

            is_student = current_user.has_role('stud')
            is_company = current_user.has_role('comp')

            query = PlacementDrives.query

            if is_student:
                query = query.filter(PlacementDrives.Status.in_(['Active', 'Application Closed']))
            elif is_company:
                company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
                if not company:
                    return {"message": "Company profile not found"}, 404
                query = query.filter(PlacementDrives.CompanyID == company.id)

            all_drives = query.all()

            result = marshal(all_drives, placement_drive_fields)
            for item in result:
                if item.get('PostedDate') and hasattr(item['PostedDate'], 'isoformat'):
                    item['PostedDate'] = item['PostedDate'].isoformat()
                if item.get('ApplyDeadline') and hasattr(item['ApplyDeadline'], 'isoformat'):
                    item['ApplyDeadline'] = item['ApplyDeadline'].isoformat()
                if item.get('RejectionDate') and hasattr(item['RejectionDate'], 'isoformat'):
                    item['RejectionDate'] = item['RejectionDate'].isoformat()
            return result, 200
         except Exception as e:
             print(f"Error in AllPlacementDrives.get: {e}")
             return {"error": str(e)}, 500
    
    @auth_required()
    def post(self):
        args = drive_parser.parse_args()
        print(args)
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404
        
        from datetime import date
        try:
            apply_deadline_date = date.fromisoformat(args['ApplyDeadline'])
        except (ValueError, TypeError):
            return {"message": "Invalid format for ApplyDeadline. Use YYYY-MM-DD"}, 400
        from zoneinfo import ZoneInfo
        today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
        if apply_deadline_date < today:
            return {"message": "Apply deadline must be today or in the future."}, 400
        # sanitization
        allowed_tags = ['p', 'b', 'i', 'u', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'a']
        allowed_attrs = {'a': ['href', 'title']}
        clean_html = bleach.clean(args['JobDescription'], tags=allowed_tags, attributes=allowed_attrs, strip=True)
        args['JobDescription'] = clean_html

        drive_resource = PlacementDrives(
            CompanyID=company.id,
            Vacancies=args['Vacancies'],
            JobTitle=args['JobTitle'],
            JobDescription=args['JobDescription'],
            Type=args['Type'],
            RequiredSkills=args['RequiredSkills'],
            Departments=args['Departments'],
            ApplyDeadline=apply_deadline_date,
            Status=args['Status'],
            noRounds=args['noRounds'],
            InterviewRounds=args['InterviewRounds'],
            WorkMode=args['WorkMode'], Location=args['Location'], Salary=args['Salary'], Duration=args.get('Duration'),
            min_cgpa=args.get('min_cgpa'))
        db.session.add(drive_resource)
        admins = User.query.filter(User.roles.any(name='admin')).all()
        for admin in admins:
            create_notification(admin.id, f"New placement drive '{drive_resource.JobTitle}' has been posted by '{company.company_name}' and is pending approval.", "info")
        db.session.commit()
        db.session.refresh(drive_resource)
        cache.clear()
        
        # Manually serialize and format dates (same as GET method)
        result = marshal([drive_resource], placement_drive_fields)[0]
        if result.get('PostedDate') and hasattr(drive_resource.PostedDate, 'isoformat'):
            result['PostedDate'] = drive_resource.PostedDate.isoformat()
        if result.get('ApplyDeadline') and hasattr(drive_resource.ApplyDeadline, 'isoformat'):
            result['ApplyDeadline'] = drive_resource.ApplyDeadline.isoformat()
        
        return result, 201

    status_parser = reqparse.RequestParser()
    status_parser.add_argument('Status', type=str, required=True, help="status is required")
    status_parser.add_argument('DriveID', type=int, required=True, help="drive id is required")
    status_parser.add_argument('remarks', type=str, required=False)
    @auth_required()
    def put(self):
        arguments = self.status_parser.parse_args()
        drive = PlacementDrives.query.filter_by(DriveID=arguments['DriveID']).first()
        if not drive:
            return {"message": "Drive not found"}, 404
        if drive.Status == 'Application Closed':
            return {"message": "Closed drives are permanently locked and cannot be modified"}, 400
        status = arguments['Status']
        if status in ['Approved', 'Active']:
            drive.Status = 'Active'
        elif status == 'Closed':
            drive.Status = 'Application Closed'
        else:
            drive.Status = status
        drive.Remark = arguments.get('remarks')
        drive.RejectionDate = None
        if arguments['Status'] == 'Rejected':
            drive.RejectionDate = get_ist_date()
        db.session.commit()
        db.session.refresh(drive)
        
        from application.tasks import send_drive_status_update_email_task
        if arguments['Status'] in ['Approved', 'Active', 'Rejected']:
            mapped_status = 'Active' if arguments['Status'] in ['Approved', 'Active'] else arguments['Status']
            send_drive_status_update_email_task.apply_async(args=[drive.DriveID, mapped_status, drive.Remark], countdown=10)
        cache.clear()
        return {"message": "Drive status updated successfully"}, 200

company_api.add_resource(PlacementDriveAPI, '/placement_drives')


class DriveTemplateAPI(Resource):
    @auth_required()
    @roles_required('comp')
    def get(self, template_id=None):
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404

        if template_id:
            template = DriveTemplate.query.filter_by(id=template_id, CompanyID=company.id).first()
            if not template:
                return {"message": "Template not found"}, 404
            return marshal(template, template_fields), 200
        else:
            templates = DriveTemplate.query.filter_by(CompanyID=company.id).order_by(DriveTemplate.TemplateName).all()
            return marshal(templates, {'id': fields.Integer, 'TemplateName': fields.String}), 200

    @auth_required('token')
    @roles_required('comp')
    def post(self):
        args = template_parser.parse_args()
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404

        # Sanitize JobDescription HTML
        allowed_tags = ['p', 'b', 'i', 'u', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'a']
        allowed_attrs = {'a': ['href', 'title']}
        if 'JobDescription' in args and args['JobDescription']:
            clean_html = bleach.clean(args['JobDescription'], tags=allowed_tags, attributes=allowed_attrs, strip=True)
            args['JobDescription'] = clean_html

        existing = DriveTemplate.query.filter_by(CompanyID=company.id, TemplateName=args['TemplateName']).first()
        if existing:
            return {"message": f"A template with the name '{args['TemplateName']}' already exists."}, 409

        new_template = DriveTemplate(CompanyID=company.id, **args)
        db.session.add(new_template)
        db.session.commit()
        return {"message": "Template created successfully", "id": new_template.id}, 201
    
    @auth_required('token')
    @roles_required('comp')
    def delete(self, template_id):
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404

        template = DriveTemplate.query.filter_by(id=template_id, CompanyID=company.id).first()
        if not template:
            return {"message": "Template not found or unauthorized"}, 404

        db.session.delete(template)
        db.session.commit()
        return {"message": "Template deleted successfully"}, 200

company_api.add_resource(DriveTemplateAPI, '/drive_templates', '/drive_templates/<int:template_id>')


class DriveApplication(Resource):
    def put(self, drive_id):
        try:
            drive = PlacementDrives.query.get(drive_id)
            if drive:
                if drive.Status == 'Active':
                    drive.Status = 'Application Closed'
                    
                    # Get all applications for this drive that are not in 'Selected' or 'Hired' state
                    unhired_apps = Application.query.filter(
                        Application.DriveID == drive_id,
                        Application.status.notin_(['Selected', 'Hired'])
                    ).all()
                    
                    from application.tasks import send_application_status_update_email_task
                    
                    for app in unhired_apps:
                        if app.status != 'Rejected':
                            if not app.previous_status:
                                app.previous_status = app.status
                        app.status = 'Rejected'
                        app.rejection_reason = 'Drive closed by recruiter'
                        
                        # Create dynamic in-app notification
                        create_notification(
                            app.student.user_id,
                            f"Application status changed to Rejected for '{drive.JobTitle}'. Reason: Drive closed by recruiter",
                            "warning"
                        )
                        # Dispatch email notification in background
                        send_application_status_update_email_task.delay(app.id)
                    
                    # Cancel all upcoming scheduled/pending/suspended interviews for this drive
                    app_ids = [app.id for app in unhired_apps]
                    if app_ids:
                        upcoming_interviews = Interview.query.filter(
                            Interview.application_id.in_(app_ids),
                            Interview.status.in_(['scheduled', 'pending', 'suspended'])
                        ).all()
                        for interview in upcoming_interviews:
                            interview.status = 'canceled'
                            interview.remarks = 'Drive closed by recruiter'
                            create_notification(
                                interview.application.student.user_id,
                                f"Your interview for '{drive.JobTitle}' has been canceled because the drive has closed.",
                                "warning"
                            )
                        
                    db.session.commit()
                    cache.clear()
                    return {"message": "Drive Closed successfully"}, 200
                else:
                    return {"message": "Drive is not active or approved, or is already closed."}, 400
            else:
                return {"message": f"No drive with id: {drive_id} exist"}, 404
        except Exception as e:
            print(f"Error in changing status: {e}")
            return {"message": "An error occured while changing status"}, 500

company_api.add_resource(DriveApplication, '/drive_application/<int:drive_id>')


class EmployerDetailsAPI(Resource):
    @auth_required('token')
    def get(self):
        try:
            details = CompanyProfile.query.filter_by(user_id=current_user.id).first()
            if not details:
                return {"message": "No emloyer found"}, 404
            return details.to_dict(), 200, {'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'}
        except Exception as e:
            print(f"Error in EmployerDetailsAPI.get: {e}")
            return {"error": str(e)}, 500
        
    @auth_required('token', 'session')
    def post(self):
        try:
            # 1. Enforce active authentication gate
            if not current_user or current_user.is_anonymous:
                return {"message": "Authentication token missing or invalid"}, 401

            args = employer_parser.parse_args()
            logo_file = args.get('logo_image')
            logo_path = None
            
            # 2. Lookup existing profile against verified user ID
            emp_profile = CompanyProfile.query.filter_by(user_id=current_user.id).first()
            
            if emp_profile:
                # Manually map inputs safely to update the record properties
                if args['contact'] is not None: emp_profile.contact = args['contact']
                if args['website'] is not None: emp_profile.website = args['website']
                if args['comp_name'] is not None: emp_profile.company_name = args['comp_name']
                if args['secondary_email'] is not None: emp_profile.secondary_email = args['secondary_email']
                if args['gstin'] is not None: emp_profile.gstin = args['gstin']
                if args['address'] is not None: emp_profile.address = args['address']
                if args['desc'] is not None: emp_profile.description = args['desc']
                
                if logo_file:
                    filename = secure_filename(logo_file.filename)
                    logo_path = os.path.join('static/uploads/logos', filename)
                    logo_file.save(logo_path)
                    emp_profile.logo_image = logo_path
            else:
                # 3. Enforce validation check for field creation
                if not all([args['gstin'], args['comp_name'], args['desc'], args['contact'], args['website'], args['address']]):
                    return {"message": "All required fields must be filled"}, 400
                
                if logo_file:
                    filename = secure_filename(logo_file.filename)
                    logo_path = os.path.join('static/uploads/logos', filename)
                    logo_file.save(logo_path)

                # Explicitly map incoming parameters directly to table columns
                comp_profile = CompanyProfile(
                    user_id=current_user.id,
                    contact=args['contact'],
                    website=args['website'],
                    company_name=args['comp_name'],  # Fixed mapping
                    address=args['address'],
                    secondary_email=args['secondary_email'],
                    gstin=args['gstin'],
                    description=args['desc'],       # Fixed mapping
                    logo_image=logo_path
                )
                db.session.add(comp_profile)
                
                admins = User.query.filter(User.roles.any(name='admin')).all()
                for admin in admins:
                    create_notification(admin.id, f"New Company registered (approval pending): '{comp_profile.company_name}' has registered.", "warning")
                
            db.session.commit()
            cache.clear()
            return {"message": "Profile saved successfully"}, 200

        except Exception as e:
            db.session.rollback() # Protect state isolation integrity
            print(f"Error in API execution block: {e}")
            return {"message": f"Server encountered processing exception: {str(e)}"}, 500

company_api.add_resource(EmployerDetailsAPI, '/employer_details')


class CompanyProfileApi(Resource):
    @auth_required('session', 'token')
    def get(self):
        try:
            profile = CompanyProfile.query.filter_by(user_id=current_user.id).first()
            print(f"Fetched profile for user {current_user.id}: {profile}")
            if not profile:
                return {"message": "Profile not found"}, 404
            return profile.to_dict(), 200, {'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'}
        except Exception as e:
            print(f"Error in CompanyProfileApi GET: {e}")
            return {"error": str(e)}, 500
    
    @auth_required('session', 'token')
    def post(self):
        try:
            data = request.get_json()
            user_id_to_update = current_user.id
            is_admin = 'admin' in [role.name for role in current_user.roles]

            if is_admin and data.get('user_id'):
                user_id_to_update = data.get('user_id')

            profile = CompanyProfile.query.filter_by(user_id=user_id_to_update).first()
            if not profile:
                return {'message': "Profile not found"}, 404

            def get_valid_value(field_name, current_value):
                return data.get(field_name, current_value) if data.get(field_name) is not None else current_value

            # Fields editable by company
            profile.description = get_valid_value('description', profile.description)
            profile.secondary_email = get_valid_value('secondary_email', profile.secondary_email)

            # Fields editable only by admin
            if is_admin:
                profile.company_name = get_valid_value('company_name', profile.company_name)
                profile.address = get_valid_value('address', profile.address)
                profile.contact = get_valid_value('contact', profile.contact)
                profile.website = get_valid_value('website', profile.website)
                profile.gstin = get_valid_value('gstin', profile.gstin)

            db.session.commit()
            cache.clear()
            return {"message": "Company profile updated successfully"}, 200
        except Exception as e:
            print(f"Error in CompanyProfileApi POST: {e}")
            return {"error": str(e)}, 500

company_api.add_resource(CompanyProfileApi, '/company_profile')


class CompanyLogoAPI(Resource):
    @auth_required('session', 'token')
    def post(self):
        try:
            logo_file = request.files.get('logo_image')
            if not logo_file:
                return {"message": "No file uploaded"}, 400

            is_admin = 'admin' in [role.name for role in current_user.roles]
            if not is_admin:
                return {"message": "Forbidden. Only admins can upload company logos."}, 403

            user_id_to_update = request.form.get('user_id')
            if not user_id_to_update:
                return {"message": "Missing user_id parameter"}, 400

            profile = CompanyProfile.query.filter_by(user_id=int(user_id_to_update)).first()
            if not profile:
                return {"message": "Company profile not found"}, 404
            
            if profile.logo_image and "default" not in profile.logo_image:
                old_path = profile.logo_image.replace('/', os.sep)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception as e:
                        print(f"Error deleting old logo: {e}")

            filename = secure_filename(logo_file.filename)
            save_path = os.path.join('static/uploads/logos', filename).replace('\\', '/')
            logo_file.save(save_path)

            profile.logo_image = save_path
            db.session.commit()
            cache.clear()

            return {"message": "Logo updated", "path": save_path}, 200
        except Exception as e:
            print(f"Error in CompanyLogoAPI POST: {e}")
            return {"message": "Error uploading logo"}, 500

company_api.add_resource(CompanyLogoAPI, '/company_logo')


class CompanyApplicationsAPI(Resource):
    company_applications_parser = reqparse.RequestParser()
    company_applications_parser.add_argument('type', type=str, location='args', help='Filter by drive type (Job/Internship)')
    company_applications_parser.add_argument('cgpa', type=float, location='args', help='Filter by minimum CGPA')
    company_applications_parser.add_argument('q', type=str, location='args', help='Search query for student name, roll no, job title')

    company_application_detail_fields = {
        'id': fields.Integer,
        'student_is_hired': fields.Boolean(attribute=lambda x: db.session.query(Application).filter(Application.student_id == x.student_id, Application.status == 'Hired').first() is not None),
        'status': fields.String,
        'is_offer_expired': fields.Boolean(attribute=lambda x: (x.placement.offer_expiry_date < get_ist_date()) if (x.placement and x.placement.offer_expiry_date) else False),
        'is_currently_eligible': fields.Boolean(attribute=lambda x: x.check_current_eligibility()[0]),
        'eligibility_issues': fields.Raw(attribute=lambda x: x.check_current_eligibility()[1]),
        'application_date': fields.String(attribute=lambda x: x.application_datetime.isoformat() if getattr(x, 'application_datetime', None) else None),
        'application_datetime': fields.String(attribute=lambda x: x.application_datetime.isoformat() if x.application_datetime else None),
        'available_immediately': fields.Boolean,
        'available_from': fields.String(attribute=lambda x: x.available_from.isoformat() if x.available_from else None),
        'availability_remarks': fields.String,
        'hire_date': fields.String(attribute=lambda x: x.placement.offer_sent_date.isoformat() if x.placement and x.placement.offer_sent_date else None),
        'selected_date': fields.String(attribute=lambda x: x.selected_date.isoformat() if x.selected_date else None),
        'joining_date': fields.String(attribute=lambda x: x.placement.joining_date.isoformat() if x.placement and x.placement.joining_date else None),
        'offer_sent': fields.Boolean(attribute=lambda x: x.placement.offer_sent if x.placement else False),
        'offer_sent_date': fields.String(attribute=lambda x: x.placement.offer_sent_date.isoformat() if x.placement and x.placement.offer_sent_date else None),
        'offer_expiry_date': fields.String(attribute=lambda x: x.placement.offer_expiry_date.isoformat() if x.placement and x.placement.offer_expiry_date else None),
        'offer_status': fields.String(attribute=lambda x: x.placement.offer_status if x.placement else None),
        'offer_letter': fields.String(attribute=lambda x: x.placement.offer_letter if x.placement else None),
        'offer_message': fields.String(attribute=lambda x: x.placement.message if x.placement else None),
        'offer_letter_status': fields.String, # Manually populated
        'rejection_reason': fields.String,
        'rejection_revoke_note': fields.String,
        'previous_status': fields.String,
        'resume': fields.String(attribute=lambda x: x.resume if getattr(x, 'resume', None) else getattr(x.student, 'resume', None)),
        'student': fields.Nested({
            'user_id': fields.Integer,
            'id': fields.Integer,
            'name': fields.String,
            'roll_no': fields.String,
            'cgpa': fields.String,
            'department': fields.String,
            'skills': fields.Raw, # StudentProfile.to_dict() returns list, Raw handles it
            'linkedin': fields.String,
            'github': fields.String,
            'certificates_link': fields.String,
            'profile_pic': fields.String,
            'about_me': fields.String,
        }),
        'drive': fields.Nested({
            'DriveID': fields.Integer,
            'JobTitle': fields.String,
            'Type': fields.String,
            'company_name': fields.String, # Uses @property in PlacementDrives
            'logo_image': fields.String,   # Uses @property in PlacementDrives
            'noRounds': fields.Integer,
            'InterviewRounds': fields.Raw,
        }),
        # Fields for the latest interview, populated manually below
        'interview_datetime': fields.String,
        'interview_location': fields.String,
        'round_no': fields.Integer,
        'round_name': fields.String,
        'latest_interview_status': fields.String,
        'latest_interview_result': fields.String,
        'previous_round_no': fields.Integer,
        'previous_round_remarks': fields.String,
        'previous_round_student_remarks': fields.String,
    }

    @auth_required('token')
    @roles_required('comp')
    def get(self):
        args = self.company_applications_parser.parse_args()
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404

        # Get all drive IDs for the current company
        company_drive_ids = [d.DriveID for d in PlacementDrives.query.filter_by(CompanyID=company.id).all()]
        if not company_drive_ids:
            return {"applications": [], "stats": {
                "total_applications": 0, "pending_applications": 0, "shortlisted": 0,
                "selected": 0, "hired": 0, "rejected": 0, "scheduled_interviews": 0
            }}, 200

        # Base query for applications related to the company's drives
        query = db.session.query(Application).filter(
            Application.DriveID.in_(company_drive_ids)
        )

        # Join with related tables for filtering and searching
        query = query.join(Application.student).join(Application.drive)

        # Apply filters
        if args['type']:
            query = query.filter(PlacementDrives.Type == args['type'])
        if args['cgpa']:
            query = query.filter(func.cast(StudentProfile.cgpa, db.Float) >= args['cgpa'])
        if args['q']:
            search_term = f"%{args['q'].lower().strip()}%"
            query = query.filter(or_(
                func.lower(StudentProfile.name).like(search_term),
                func.lower(StudentProfile.roll_no).like(search_term),
                func.lower(PlacementDrives.JobTitle).like(search_term)
            ))

        all_applications = query.options(
            joinedload(Application.student), joinedload(Application.drive), joinedload(Application.placement)
        ).all()

        processed_applications = []
        today = get_ist_date()
        scheduled_interviews_count = 0

        for app in all_applications:
            app_data = marshal(app, self.company_application_detail_fields)

            # Manually create the offer_letter_status field
            if app.status == 'Selected':
                if app.placement and app.placement.offer_sent:
                    app_data['offer_letter_status'] = f"Sent on {app.placement.offer_sent_date.strftime('%d %b %Y')}"
                    app_data['offer_sent_date'] = app.placement.offer_sent_date.isoformat() if app.placement.offer_sent_date else None
                else:
                    app_data['offer_letter_status'] = "Not Sent"
            else:
                app_data['offer_letter_status'] = 'N/A'

            # Initialize interview fields to avoid key errors on frontend
            app_data['interview_datetime'] = 'N/A'
            app_data['interview_location'] = 'N/A'
            app_data['round_no'] = None
            app_data['round_name'] = 'N/A'
            app_data['latest_interview_status'] = 'N/A'
            app_data['latest_interview_result'] = 'N/A'
            app_data['previous_round_no'] = None
            app_data['previous_round_remarks'] = None
            app_data['previous_round_student_remarks'] = None

            # Fetch latest interview details if application is shortlisted or has interviews
            if app.status == 'Interviewing' or app.status == 'Shortlisted' or app.interviews:
                # Get the interview for the highest round number
                latest_interview = Interview.query.filter_by(application_id=app.id).order_by(Interview.round_no.desc()).first()
                if latest_interview:
                    if latest_interview.status == 'completed' and latest_interview.result == 'passed':
                        # Awaiting next round scheduling
                        next_round = latest_interview.round_no + 1
                        app_data['interview_datetime'] = 'Not Scheduled'
                        app_data['interview_location'] = 'N/A'
                        app_data['round_no'] = next_round
                        drive = app.drive
                        if drive and drive.InterviewRounds and next_round <= len(drive.InterviewRounds):
                            app_data['round_name'] = drive.InterviewRounds[next_round - 1]
                        else:
                            app_data['round_name'] = f"Round {next_round}"
                        app_data['latest_interview_status'] = 'Awaiting Scheduling'
                        app_data['latest_interview_result'] = 'N/A'
                    else:
                        app_data['interview_datetime'] = latest_interview.datetime.isoformat() if latest_interview.datetime else 'Not Scheduled'
                        app_data['interview_location'] = latest_interview.location_or_link
                        app_data['round_no'] = latest_interview.round_no
                        app_data['round_name'] = latest_interview.round_name
                        app_data['latest_interview_status'] = latest_interview.status
                        app_data['latest_interview_result'] = latest_interview.result if latest_interview.result else 'N/A'
                        if latest_interview.datetime and latest_interview.datetime.date() >= today: # Count upcoming/today's interviews
                            scheduled_interviews_count += 1

            # Fetch previous completed round details if any
            previous_completed_interview = Interview.query.filter_by(
                application_id=app.id,
                status='completed'
            ).order_by(Interview.round_no.desc()).first()
            if previous_completed_interview:
                app_data['previous_round_no'] = previous_completed_interview.round_no
                app_data['previous_round_remarks'] = previous_completed_interview.remarks
                app_data['previous_round_student_remarks'] = previous_completed_interview.student_facing_remarks

            processed_applications.append(app_data)

        # Calculate statistics
        total_applications = len(processed_applications)
        rejected = sum(1 for app in processed_applications if app.get('rejection_reason') or app['status'] == 'Rejected')
        pending_applications = sum(1 for app in processed_applications if app['status'] == 'Pending' and not app.get('rejection_reason'))
        shortlisted = sum(1 for app in processed_applications if app['status'] == 'Shortlisted' and not app.get('rejection_reason'))
        selected = sum(1 for app in processed_applications if app['status'] == 'Selected' and not app.get('rejection_reason'))
        hired = sum(1 for app in processed_applications if app['status'] == 'Hired' and not app.get('rejection_reason'))

        stats = {
            "total_applications": total_applications,
            "pending_applications": pending_applications,
            "shortlisted": shortlisted,
            "selected": selected,
            "hired": hired,
            "rejected": rejected,
            "scheduled_interviews": scheduled_interviews_count
        }

        return {"applications": processed_applications, "stats": stats}, 200
    
    @auth_required('token')
    @roles_required('comp')
    def put(self, application_id):
        parser = reqparse.RequestParser()
        parser.add_argument('status', type=str, required=True, help='Status is required')
        parser.add_argument('rejection_reason', type=str)
        args = parser.parse_args()

        application = Application.query.filter_by(id=application_id).first()
        if not application:
            return {"message": "Application not found"}, 404

        # Removed check for Application Closed drive status to allow recruiters to process existing applications after the deadline passes.

        # Validate status transition
        valid_statuses = ['Pending', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected', 'Hired']
        if args['status'] not in valid_statuses:
            return {"message": f"Invalid status. Valid options are: {', '.join(valid_statuses)}"}, 400

        old_status = application.status
        new_status = args['status']

        if new_status == 'Rejected' and old_status != 'Rejected':
            application.previous_status = old_status
        application.status = new_status
        if new_status == 'Rejected':
            application.rejection_reason = args.get('rejection_reason') or 'No reason provided.'
            
            # Cancel scheduled/suspended interviews on rejection
            upcoming_interviews = Interview.query.filter(
                Interview.application_id == application.id,
                Interview.status.in_(['scheduled', 'suspended'])
            ).all()
            for interview in upcoming_interviews:
                interview.status = 'canceled'
                interview.remarks = f"Application rejected by company recruiter. Reason: {application.rejection_reason}"
                create_notification(
                    application.student.user_id,
                    f"Your interview for '{application.drive.JobTitle}' has been canceled because your application was rejected.",
                    "warning"
                )
        elif new_status == 'Selected':
            application.selected_date = get_ist_date()
            latest_interview = Interview.query.filter_by(application_id=application.id).order_by(Interview.round_no.desc()).first()
            if latest_interview and latest_interview.status == 'scheduled':
                latest_interview.status = 'completed'
                latest_interview.result = 'passed'

        if old_status != new_status:
            from application.tasks import send_application_status_update_email_task
            send_application_status_update_email_task.delay(application.id)
            if new_status == 'Shortlisted':
                create_notification(application.student.user_id, f"Application status changed to Shortlisted for '{application.drive.JobTitle}'.", "info")
            elif new_status == 'Rejected':
                create_notification(application.student.user_id, f"Application status changed to Rejected for '{application.drive.JobTitle}'. Reason: {application.rejection_reason}", "warning")
            else:
                create_notification(application.student.user_id, f"Your application status for '{application.drive.JobTitle}' has been updated to '{new_status}'.", "success" if new_status == "Selected" else "info")

        db.session.commit()
        cache.clear()
        return {"message": "Application status updated successfully"}, 200

company_api.add_resource(CompanyApplicationsAPI, '/company_applications', '/company_applications/<int:application_id>')


class CompanyDetailsAPI(Resource):
    @auth_required('session', 'token')
    def get(self, id):
        try:
            comp = CompanyProfile.query.filter_by(user_id=id).first()
            if not comp:
                return {"message": "No emloyer found"}, 404
            return comp.to_dict(), 200
        except Exception as e:
            print(f"Error in CompanyDetailsAPI.get: {e}")
            return {"error": str(e)}, 500
            
company_api.add_resource(CompanyDetailsAPI, '/company_details/<int:id>')


class CompanyDashboardSummaryAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    @cache.cached(timeout=120, key_prefix=lambda: f"comp_dash_{current_user.id}")
    def get(self):
        comp = CompanyProfile.query.filter(CompanyProfile.user_id == current_user.id, CompanyProfile.is_approved == True).first()
        if not comp:
            return {"message": "Company profile not found"}, 404

        today = get_ist_date()
        drive_ids = [dr.DriveID for dr in PlacementDrives.query.filter_by(CompanyID=comp.id).all()]

        if not drive_ids:
            return {
                "kpis": {"active_drives": 0, "total_applicants": 0, "interviews_today": 0, "hired_students": 0},
                "funnel": {"applied": 0, "shortlisted": 0, "interviewed": 0, "hired": 0},
                "action_center": {"pending_screenings": 0, "feedback_due": 0, "unscheduled": 0},
                "recent_hires": [],
                "notifications": [],
                "insights": {"time_to_hire_days": 0, "application_velocity": [], "skill_cloud": []}
            }, 200

        # --- Queries ---
        all_applications = Application.query.filter(Application.DriveID.in_(drive_ids)).options(joinedload(Application.student), joinedload(Application.drive), joinedload(Application.placement)).all()
        all_interviews = Interview.query.join(Application).filter(Application.DriveID.in_(drive_ids)).all()

        # --- KPI Calculations ---
        active_drives_count = PlacementDrives.query.filter(PlacementDrives.CompanyID == comp.id, PlacementDrives.Status == "Active").count()
        total_applicants_count = len(all_applications)
        interviews_today_count = sum(1 for i in all_interviews if i.datetime and i.datetime.date() == today)
        hired_students_count = sum(1 for a in all_applications if a.status == 'Hired')

        kpis = {
            "active_drives": active_drives_count,
            "total_applicants": total_applicants_count,
            "interviews_today": interviews_today_count,
            "hired_students": hired_students_count
        }

        # --- Funnel Calculations ---
        application_ids_with_interviews = {i.application_id for i in all_interviews}
        applied_count = total_applicants_count
        shortlisted_count = sum(1 for a in all_applications if a.status in ['Shortlisted', 'Selected', 'Hired'] or a.id in application_ids_with_interviews)
        interviewed_count = len(application_ids_with_interviews)
        hired_count = hired_students_count

        funnel = {
            "applied": applied_count,
            "shortlisted": shortlisted_count,
            "interviewed": interviewed_count,
            "hired": hired_count
        }

        # --- Action Center Calculations (Fixed to match execution states) ---
        now_dt = get_ist_now()
        # 1. Pending Screenings: Count applications waiting in 'Pending' state
        pending_screenings_count = sum(1 for a in all_applications if a.status == 'Pending' and not a.rejection_reason)
        
        # 2. Feedback Due: Scheduled interview slot time has passed, but no result has been logged yet
        feedback_due_count = sum(
            1 for i in all_interviews 
            if i.status == 'scheduled' and i.datetime and i.datetime < now_dt and i.result is None
        )
        
        # 3. Unscheduled: Shortlisted application IDs that do not exist at all in the Interview tracking log
        shortlisted_app_ids = {a.id for a in all_applications if a.status in ['Shortlisted', 'Interviewing', 'Interview'] and not a.rejection_reason}
        app_ids_with_any_interviews = {i.application_id for i in all_interviews}
        unscheduled_count = len(shortlisted_app_ids - app_ids_with_any_interviews)

        action_center = {
            "pending_screenings": pending_screenings_count,
            "feedback_due": feedback_due_count,
            "unscheduled": unscheduled_count
        }

        # --- Recent Hires ---
        recent_hires_query = sorted([app for app in all_applications if app.status == 'Hired'], key=lambda x: x.updated_time or x.application_datetime or datetime.min, reverse=True)[:5]
        recent_hire_fields = {
            'student_name': fields.String(attribute='student.name'),
            'job_title': fields.String(attribute='drive.JobTitle'),
            'hire_date': fields.String(attribute=lambda x: x.placement.joining_date.isoformat() if x.placement and x.placement.joining_date else None),
            'student_user_id': fields.Integer(attribute='student.user_id'),
            'offer_letter': fields.String(attribute=lambda x: x.placement.offer_letter if x.placement else None),
            'application_id': fields.Integer(attribute='id')
        }
        recent_hires_data = marshal(recent_hires_query, recent_hire_fields)

        # --- New Insights Calculations ---
        # 1. Time to Hire
        hired_or_selected_apps = [app for app in all_applications if app.status in ['Selected', 'Hired'] and app.selected_date]
        total_days = 0
        if hired_or_selected_apps:
            for app in hired_or_selected_apps:
                # Fallback to today if application_datetime is missing for some old manual records
                app_date = app.application_datetime.date() if app.application_datetime else get_ist_date()
                days = (app.selected_date - app_date).days
                total_days += days if days >= 0 else 0
            avg_time_to_hire = round(total_days / len(hired_or_selected_apps))
        else:
            avg_time_to_hire = 0

        # 2. Application Velocity
        seven_days_ago = today - timedelta(days=6)
        velocity_data = { (today - timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(6, -1, -1) }
        for app in all_applications:
            if app.application_datetime:
                app_date = app.application_datetime.date()
                if app_date >= seven_days_ago:
                    date_str = app_date.strftime('%Y-%m-%d')
                    if date_str in velocity_data:
                        velocity_data[date_str] += 1
        velocity_list = [{"date": k, "count": v} for k, v in velocity_data.items()]

        # 3. Skill Cloud
        all_skills = []
        for app in all_applications:
            if app.student and app.student.skills:
                skills = [s.strip().lower() for s in app.student.skills.split(',') if s.strip()]
                all_skills.extend(skills)
        skill_counts = Counter(all_skills).most_common(15)
        skill_cloud = [{"skill": s[0], "count": s[1]} for s in skill_counts]
        
        insights = { "time_to_hire_days": avg_time_to_hire, "application_velocity": velocity_list, "skill_cloud": skill_cloud }

        # --- Notifications (Enhanced) ---
        recent_apps = sorted([app for app in all_applications if app.status == 'Pending' and not app.rejection_reason], key=lambda x: x.application_datetime or datetime.min, reverse=True)[:5]
        notifications = [{"id": app.id, "student_name": app.student.name, "job_title": app.drive.JobTitle, "timestamp": app.application_datetime.isoformat() if app.application_datetime else get_ist_now().isoformat(), "type": "new_application", "student_id": app.student.user_id} for app in recent_apps]

        return {
            "kpis": kpis,
            "funnel": funnel,
            "action_center": action_center,
            "recent_hires": recent_hires_data,
            "notifications": notifications,
            "insights": insights
        }, 200

company_api.add_resource(CompanyDashboardSummaryAPI, '/company_dashboard_summary')


class CompanyDriveStatsAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    @cache.cached(timeout=300, key_prefix=lambda: f"comp_drive_stats_{current_user.id}")
    def get(self):
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404

        drives = PlacementDrives.query.filter_by(CompanyID=company.id).options(
            db.joinedload(PlacementDrives.application)
        ).all()

        drive_stats = []
        for drive in drives:
            drive_stats.append({
                'DriveID': drive.DriveID,
                'JobTitle': drive.JobTitle,
                'applicant_count': len(drive.application)
            })

        # Sort by applicant count and take top 5
        top_drives = sorted(drive_stats, key=lambda x: x['applicant_count'], reverse=True)[:5]
        
        return top_drives, 200

company_api.add_resource(CompanyDriveStatsAPI, '/company_drive_stats')


interview_fields_for_company = {
    'interview_id': fields.Integer(attribute='id'),
    'application_id': fields.Integer,
    'round_no': fields.Integer,
    'round_name': fields.String,
    'datetime': fields.String(attribute=lambda x: x.datetime.isoformat() if x.datetime else None),
    'location_or_link': fields.String,
    'status': fields.String,
    'result': fields.String,
    'remarks': fields.String,
    'reschedule_count': fields.Integer,
    'student_facing_remarks': fields.String,
    'student': fields.Nested({
        'name': fields.String,
        'roll_no': fields.String,
        'user_id': fields.Integer,
    }, attribute='application.student')
}

drive_with_interviews_fields = {
    'DriveID': fields.Integer,
    'JobTitle': fields.String,
    'noRounds': fields.Integer,
    'InterviewRounds': fields.Raw(attribute='InterviewRounds'),
    'interviews': fields.List(fields.Nested(interview_fields_for_company)),
    'awaiting_scheduling': fields.Raw
}

class CompanyInterviewsAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    @marshal_with(drive_with_interviews_fields)
    def get(self):
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if not company:
            return {"message": "Company profile not found"}, 404

        # Get all drives for the company
        drives_with_interviews = PlacementDrives.query.filter_by(CompanyID=company.id).all()

        # For each of these drives, load all their interviews and calculate awaiting_scheduling list
        for drive in drives_with_interviews:
            drive.interviews = Interview.query.join(Application).filter(
                Application.DriveID == drive.DriveID
            ).options(
                db.joinedload(Interview.application).joinedload(Application.student)
            ).order_by(Interview.datetime.desc()).all()

            awaiting_list = []
            active_apps = Application.query.filter(
                Application.DriveID == drive.DriveID,
                Application.status.in_(['Shortlisted', 'Interviewing', 'Interview'])
            ).options(db.joinedload(Application.student)).all()

            for app in active_apps:
                latest_int = Interview.query.filter_by(application_id=app.id).order_by(Interview.round_no.desc()).first()
                next_round_no = 0
                if not latest_int:
                    next_round_no = 1
                elif latest_int.status == 'completed' and latest_int.result == 'passed':
                    next_round_no = latest_int.round_no + 1

                if next_round_no > 0 and drive.noRounds and next_round_no <= drive.noRounds:
                    round_name = drive.InterviewRounds[next_round_no - 1] if drive.InterviewRounds and next_round_no <= len(drive.InterviewRounds) else f"Round {next_round_no}"
                    awaiting_list.append({
                        'application_id': app.id,
                        'student_id': app.student.id,
                        'student': {
                            'name': app.student.name,
                            'roll_no': app.student.roll_no,
                            'user_id': app.student.user_id
                        },
                        'round_no': next_round_no,
                        'round_name': round_name
                    })

            drive.awaiting_scheduling = awaiting_list

        return drives_with_interviews, 200

company_api.add_resource(CompanyInterviewsAPI, '/company_interviews')


company_interview_update_parser = reqparse.RequestParser()
company_interview_update_parser.add_argument('action', type=str, required=True, choices=('reschedule', 'cancel'))
company_interview_update_parser.add_argument('datetime', type=inputs.datetime_from_iso8601)
company_interview_update_parser.add_argument('reason', type=str, required=True)
company_interview_update_parser.add_argument('location', type=str)

class CompanyInterviewUpdateAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    def put(self, interview_id):
        args = company_interview_update_parser.parse_args()
        interview = Interview.query.get(interview_id)
        if not interview:
            return {"message": "Interview not found"}, 404
        
        # Verify the company owns this interview application
        if interview.application.drive.company.user_id != current_user.id:
            return {"message": "Unauthorized access to this interview"}, 403
            
        if interview.status != 'scheduled':
            return {"message": "Only scheduled interviews can be updated"}, 400

        action = args['action']
        interview.reschedule_count = (interview.reschedule_count or 0) + 1
        
        if action == 'reschedule':
            if not args['datetime']:
                return {"message": "Datetime is required for rescheduling"}, 400
            if not args.get('location') or not args['location'].strip():
                return {"message": "Location or meeting link is required for rescheduling."}, 400
            new_dt = args['datetime']
            now = datetime.now(new_dt.tzinfo) if new_dt.tzinfo else get_ist_now()
            if new_dt <= now:
                return {"message": "Rescheduled interview time must be in the future."}, 400
            interview.datetime = new_dt
            interview.location_or_link = args['location']
            interview.remarks = f"Rescheduled: {args['reason']}"
            create_notification(interview.application.student.user_id, f"Interview Rescheduled: Your interview for '{interview.application.drive.JobTitle}' has been rescheduled to {interview.datetime}.", "success")
        elif action == 'cancel':
            interview.status = 'canceled'
            interview.remarks = f"Canceled: {args['reason']}"
            create_notification(interview.application.student.user_id, f"Interview Cancelled: Your interview for '{interview.application.drive.JobTitle}' has been canceled by the company.", "warning")
        
        db.session.commit()
        cache.clear()
        
        from application.tasks import send_interview_update_email_task
        send_interview_update_email_task.delay(interview.id, action, args['reason'], 'company')
        return {"message": f"Interview {action}d successfully"}, 200

company_api.add_resource(CompanyInterviewUpdateAPI, '/company_interviews/<int:interview_id>')


class DriveViewing(Resource):
    @auth_required('token')
    @roles_accepted('comp', 'admin')
    @cache.cached(timeout=300)
    def get(self, drive_id):
        applications = db.session.query(Application).join(StudentProfile, 
                        Application.student_id == StudentProfile.id).filter(Application.DriveID == drive_id).options(
                            joinedload(Application.placement),
                            joinedload(Application.drive)).all()
        total_applicants = len(applications)

        hired_students_data = []
        
        for app in applications:
            if app.status == 'Hired' and app.placement:
                hired_students_data.append({
                    "name": app.student.name,
                    "roll_no": app.student.roll_no,
                    "joining_date": app.placement.joining_date.isoformat() if app.placement.joining_date else None,
                    "salary": app.drive.Salary,
                    "type": app.drive.Type,
                    "offer_letter": app.placement.offer_letter,
                    "user_id": app.student.user_id,
                    "resume": app.resume,
                    "profile_pic": app.student.profile_pic
                })

        if total_applicants == 0:
            return {
                "pass_rate": 0,
                "avg_cgpa_all": 0,
                "avg_cgpa_shortlisted": 0,
                "top_skills": [],
                "least_common_skill": None,
                "department_distribution": [],
                "hired_students": []
            }

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
            "department_distribution": department_distribution,           # NEW: Sending all applicants to the frontend
            "hired_students": hired_students_data
        }, 200

company_api.add_resource(DriveViewing, '/drive_viewing/<int:drive_id>')


class ViewApplication(Resource):
    @auth_required('token')
    def get(self, application_id):
        application = Application.query.get(application_id)
        if not application:
            return {"message": "Application not found"}, 404

        stud = StudentProfile.query.filter_by(id=application.student_id).first()
        drive = PlacementDrives.query.filter_by(DriveID=application.DriveID).first()
        return {
            "application_id": application.id,
            "drive_title": drive.JobTitle,
            "stud_name": stud.name,
            "stud_skills": stud.skills,
            "linkedin": stud.linkedin,
            "github": stud.github,
            "resume": application.resume,
            "department": stud.department,
            "cgpa": stud.cgpa,
            "phone": stud.phone,
            'certificates_link': stud.certificates_link,
            'profile_pic': stud.profile_pic,
            'about_me': stud.about_me,
            'status': application.status,
            'offer_letter': application.placement.offer_letter if application.placement else None,
            'offer_expiry_date': application.placement.offer_expiry_date.isoformat() if application.placement and application.placement.offer_expiry_date else None,
            'joining_date': application.placement.joining_date.isoformat() if application.placement and application.placement.joining_date else None,
            'offer_message': application.placement.message if application.placement else None,
            'offer_sent_date': application.placement.offer_sent_date.isoformat() if application.placement and application.placement.offer_sent_date else None,
            'offer_status': application.placement.offer_status if application.placement else None,
            'is_offer_expired': (application.placement.offer_expiry_date < get_ist_date()) if (application.placement and application.placement.offer_expiry_date) else False,
            'drive': {
                'company_name': drive.company_name,
                'JobTitle': drive.JobTitle
            }
        }
    def put(self, application_id):
        data = request.json or {}
        application = Application.query.get(application_id)
        if not application:
            return {"message": "Application not found"}, 404

        # Removed check for Application Closed drive status to allow recruiters to process existing interviews/offers after the deadline passes.

        if data.get('action') == 'complete_interview':
            # Complete the current active/scheduled interview
            latest_interview = Interview.query.filter_by(application_id=application_id).order_by(Interview.round_no.desc()).first()
            if not latest_interview:
                return {"message": "No interview found to complete."}, 400
            
            result = data.get('interview_result') # 'passed' or 'failed'
            if result not in ['passed', 'failed']:
                return {"message": "Invalid interview result. Must be 'passed' or 'failed'."}, 400
            
            latest_interview.status = 'completed'
            latest_interview.result = result
            latest_interview.remarks = data.get('remarks')
            latest_interview.student_facing_remarks = data.get('student_facing_remarks')
            
            if result == 'failed':
                if application.status != 'Rejected':
                    application.previous_status = application.status
                application.status = 'Rejected'
                application.rejection_reason = data.get('remarks') or "Interview round failed."
                application.rejection_revoke_note = data.get('student_facing_remarks')
                
                # Send rejection notification/email
                create_notification(application.student.user_id, f"Your application for '{application.drive.JobTitle}' has been rejected.", "warning")
                
                try:
                    from application.tasks import send_application_status_update_email_task
                    send_application_status_update_email_task.delay(application.id)
                except Exception as e:
                    print(f"Error triggering email task: {e}")
            else: # result == 'passed'
                drive = application.drive
                if drive.noRounds and latest_interview.round_no == drive.noRounds:
                    application.status = 'Selected'
                    application.selected_date = get_ist_date()
                    create_notification(application.student.user_id, f"Congratulations! You passed the final interview round for '{drive.JobTitle}'. Your offer is pending.", "success")
                else:
                    application.status = 'Interviewing'
                    create_notification(application.student.user_id, f"Congratulations! You passed Round {latest_interview.round_no} for '{drive.JobTitle}'. Awaiting next round scheduling.", "success")
            
            db.session.commit()
            cache.clear()
            return {"message": "Interview marked completed successfully."}, 200

        args = update_application_parser.parse_args()
        old_status = application.status
        new_status = args.get('status')
    
        # Case 1: Rejection. `status` is 'Rejected'. Set status and reason.
        if new_status == 'Rejected':
            if application.status != 'Rejected':
                application.previous_status = application.status
            application.status = 'Rejected'
            application.rejection_reason = args.get('rejection_reason') or 'No reason provided.'
            application.updated_time = get_ist_now()
            
            latest_interview = Interview.query.filter_by(application_id=application_id).order_by(Interview.round_no.desc()).first()
            if latest_interview and latest_interview.status == 'scheduled':
                latest_interview.status = 'completed'
                latest_interview.result = 'failed'
                latest_interview.remarks = application.rejection_reason
                latest_interview.student_facing_remarks = args.get('note_for_student')
            create_notification(application.student.user_id, f"Application status changed to Rejected for '{application.drive.JobTitle}'. Reason: {application.rejection_reason}", "warning")
            
            try:
                from application.tasks import send_application_status_update_email_task
                send_application_status_update_email_task.delay(application.id)
            except Exception as e:
                print(f"Error triggering email task in ViewApplication: {e}")
        
        # Case 2: Restoration. `status` is not sent, `rejection_reason` is null.
        elif new_status is None and 'rejection_reason' in request.json and args.get('rejection_reason') is None:
            # Check if the student is already hired in another drive
            hired_elsewhere = Application.query.filter(
                Application.student_id == application.student_id,
                Application.status == 'Hired',
                Application.id != application.id
            ).first()
            if hired_elsewhere:
                return {"message": "Cannot restore application: This student has already been hired for another job."}, 400

            # Check if student's user account is deactivated/suspended
            if not application.student.user.active:
                return {"message": "Cannot restore application: The student's account is currently suspended or deactivated."}, 400

            # Check if the rejection was due to student declining the offer
            if (application.rejection_reason == 'Offer rejected by student.' or 
                (application.placement and application.placement.offer_status == 'Rejected')):
                return {"message": "Cannot restore application: The offer was officially declined by the student."}, 400

            application.rejection_reason = None
            application.rejection_revoke_note = args.get('note_for_student')
            
            if application.previous_status:
                application.status = application.previous_status
                application.previous_status = None
            else:
                latest_interview = Interview.query.filter_by(application_id=application_id).order_by(Interview.round_no.desc()).first()
                if latest_interview:
                    application.status = 'Shortlisted'
                else:
                    application.status = 'Pending'
            
            # Revert the latest interview back to scheduled if it was failed during rejection
            latest_interview = Interview.query.filter_by(application_id=application_id).order_by(Interview.round_no.desc()).first()
            if latest_interview and latest_interview.status == 'completed' and latest_interview.result == 'failed':
                latest_interview.status = 'scheduled'
                latest_interview.result = None
                latest_interview.remarks = None
                latest_interview.student_facing_remarks = None

            from application.tasks import send_application_rejection_revoke_email
            send_application_rejection_revoke_email.delay(application.id)
            create_notification(application.student.user_id, f"Rejection revoked by Company for '{application.drive.JobTitle}'.", "success")
    
        # Case 3: Normal status update.
        elif new_status and old_status != new_status:
            application.status = new_status
            application.updated_time = get_ist_now()
    
            latest_interview = Interview.query.filter_by(application_id=application_id).order_by(Interview.round_no.desc()).first()
            if new_status == 'Selected':
                application.selected_date = get_ist_date()
                if latest_interview and latest_interview.status == 'scheduled':
                    latest_interview.status = 'completed'
                    latest_interview.result = 'passed'
                    latest_interview.remarks = args.get('remarks')
                    latest_interview.student_facing_remarks = args.get('student_facing_remarks')
            
            from application.tasks import send_application_status_update_email_task
            send_application_status_update_email_task.delay(application.id)
            if new_status == 'Shortlisted':
                msg = f"Application status changed to Shortlisted for '{application.drive.JobTitle}'."
                notif_type = "info"
            elif new_status == 'Rejected':
                msg = f"Application status changed to Rejected for '{application.drive.JobTitle}'. Reason: {application.rejection_reason or 'No reason provided.'}"
                notif_type = "warning"
            else:
                msg = f"Your application status for '{application.drive.JobTitle}' has been updated to '{new_status}'."
                notif_type = "success" if new_status == "Selected" else "info"
            create_notification(application.student.user_id, msg, notif_type)
        
        elif new_status and old_status == new_status:
            return {"message": f"Application status is already '{new_status}'."}, 200
    
        db.session.commit()
        cache.clear()  # Clear cache to reflect status changes immediately
        return {"message": "Application updated successfully"}, 200

    def post(self, application_id):
        args = schedule_interview_parser.parse_args()
        application = Application.query.get(application_id)
        if not application:
            return {"message": "Application not found"}, 404
        
        standard_dt = args.get('datetime')
        if standard_dt:
            now = datetime.now(standard_dt.tzinfo) if standard_dt.tzinfo else get_ist_now()
            if standard_dt <= now:
                return {"message": "Interviews can only be scheduled for a future time."}, 400

        application.status = args.get('status')
        drive = application.drive

        student_clash = db.session.query(Interview).join(Application).filter(
            Application.student_id == application.student_id,
            Interview.datetime == standard_dt,
            Interview.status == 'scheduled' 
        ).first()

        if student_clash:
            return {
                "message": "Scheduling Collision: This candidate already has another active interview scheduled at this exact time slot across the system."
            }, 422 

        force_proceed = request.json.get('force_proceed', False)
        if not force_proceed:
            company_clash = db.session.query(Interview).join(Application).join(PlacementDrives).filter(
                PlacementDrives.CompanyID == drive.CompanyID,
                Interview.datetime == standard_dt,
                Interview.status == 'scheduled'
            ).first()

            if company_clash:
                return {
                    "message": "Company Panel Warning",
                    "requires_confirmation": True,
                    "warning_text": "An interview for another candidate is already scheduled for your firm at this exact time. Do you have an additional panel available to run parallel sessions?"
                }, 409

        # --- Round Architecture Log ---
        latest_interview = Interview.query.filter_by(application_id=application_id).order_by(Interview.round_no.desc()).first()
        next_round_no = (latest_interview.round_no + 1) if latest_interview else 1

        # If a previous interview row exists and is 'scheduled', mark it completed and save remarks inside IT!
        if latest_interview and latest_interview.status == 'scheduled':
            latest_interview.status = 'completed'
            latest_interview.result = 'passed'
            
            # === FIXED: Save the remarks directly to the round that JUST ENDED ===
            latest_interview.remarks = args.get('remarks')
            latest_interview.student_facing_remarks = args.get('student_facing_remarks')

        if not drive.noRounds or next_round_no > drive.noRounds or not drive.InterviewRounds or len(drive.InterviewRounds) < next_round_no:
            return {"message": f"Round {next_round_no} is not correctly configured for this drive."}, 400
            
        round_name = drive.InterviewRounds[next_round_no - 1]

        # Create a new interview record for the UPCOMING round.
        # Leave remarks as None so it starts completely fresh!
        new_interview = Interview(
            application_id=application_id,
            round_no=next_round_no,
            round_name=round_name,
            datetime=standard_dt,
            location_or_link=args.get('location'),
            status='scheduled',
            remarks=None,                 # Clean slate for the new round
            student_facing_remarks=None    # Clean slate for the new round
        )
        db.session.add(new_interview)
        create_notification(application.student.user_id, f"Interview Scheduled: A new interview '{round_name}' for '{application.drive.JobTitle}' has been scheduled on {new_interview.datetime}.", "success")
        db.session.commit()
        
        # Trigger Celery task to send scheduling email
        from application.tasks import send_interview_update_email_task
        send_interview_update_email_task.delay(new_interview.id, 'schedule', 'Initial Schedule', 'company')

        cache.clear()
        return {"message": "Interview scheduled successfully"}, 200
        
company_api.add_resource(ViewApplication, '/view_application/<int:application_id>')


class SendOfferAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    def post(self, application_id):
        args = send_offer_parser.parse_args()
        application = Application.query.get(application_id)

        if not application or application.drive.company.user_id != current_user.id:
            return {"message": "Application not found or unauthorized"}, 404
        if application.status != 'Selected':
            return {"message": "Application is not in 'Selected' status"}, 400
        
        try:
            try:
                offer_expiry = datetime.strptime(args['offer_expiry_date'], '%Y-%m-%d').date()
                joining_date = datetime.strptime(args['joining_date'], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                return {"message": "Invalid date format. Use YYYY-MM-DD"}, 400
            
            today = get_ist_date()
            if offer_expiry <= today:
                return {"message": "Offer expiry date must be in the future."}, 400
            if joining_date <= today:
                return {"message": "Joining date must be in the future."}, 400

            # Prepare data for the task
            offer_data = {
                'expiry_date': args['offer_expiry_date'],
                'joining_date': args['joining_date'],
                'message': args.get('message', '')
            }
            # Trigger the background task
            from application.tasks import generate_offer_letter_task
            task = generate_offer_letter_task.delay(application_id, offer_data)
            cache.clear() # Clear cache immediately on task dispatch
            return {"message": "Offer letter generation has started.", "task_id": task.id}, 202
        except Exception as e:
            print(f"Error dispatching offer letter task: {e}")
            return {"message": "An error occurred while starting the offer letter generation."}, 500

company_api.add_resource(SendOfferAPI, '/application/<int:application_id>/send_offer')


class PostedDriveStats(Resource):
    @auth_required('token')
    @cache.cached(timeout=300)
    def get(self, drive_id):
        drive = PlacementDrives.query.get(drive_id)
        if not drive:
            return {"message": "Drive not found"}, 404
        applications = Application.query.filter_by(DriveID=drive_id).all()
        if not applications:
            return {
                "total_applicants": 0,
                "shortlisted": 0,
                "hired": 0,
                "new_count": 0
            }
        total_applicants = len(applications)
        shortlisted = len([app for app in applications if app.status == 'Shortlisted'])
        hired = len([app for app in applications if app.status == 'Hired'])
        new_count = len([app for app in applications if app.application_datetime and app.application_datetime.date() == (get_ist_now() - timedelta(days=1)).date()])
        return {
            "total_applicants": total_applicants,
            "shortlisted": shortlisted,
            "hired": hired,
            "new_count": new_count,
            }, 200
    
company_api.add_resource(PostedDriveStats, '/posted_drive_stats/<int:drive_id>')


class CompanyOfferExtendAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    def put(self, application_id):
        args = extend_offer_parser.parse_args()
        application = Application.query.get(application_id)
        if not application or application.drive.company.user_id != current_user.id:
            return {"message": "Application not found or unauthorized"}, 404
        
        if application.status != 'Selected':
            return {"message": "Application must be in 'Selected' status to extend the offer."}, 400
            
        placement = Placement.query.filter_by(application_id=application_id).first()
        if not placement or not placement.offer_sent:
            return {"message": "No offer has been sent for this application yet."}, 400
            
        if placement.offer_status not in ['Sent']:
            return {"message": f"Offer has already been {placement.offer_status}."}, 400
            
        try:
            new_expiry = datetime.strptime(args['new_expiry_date'], '%Y-%m-%d').date()
        except ValueError:
            return {"message": "Invalid date format. Use YYYY-MM-DD"}, 400
            
        if new_expiry <= get_ist_date():
            return {"message": "The extended expiry date must be in the future."}, 400
            
        if placement.offer_expiry_date and new_expiry <= placement.offer_expiry_date:
            return {"message": "The extended expiry date must be after the current expiry date."}, 400
            
        placement.offer_expiry_date = new_expiry
        create_notification(application.student.user_id, f"Your offer letter expiry date for '{application.drive.JobTitle}' has been extended to {args['new_expiry_date']}.", "info")
        db.session.commit()
        cache.clear()
        
        from application.tasks import send_offer_extension_email_task
        send_offer_extension_email_task.delay(application.id, args['new_expiry_date'])
        
        return {"message": "Offer expiry date extended successfully."}, 200

company_api.add_resource(CompanyOfferExtendAPI, '/application/<int:application_id>/extend_offer')


class CloseRoundAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    def post(self, drive_id, round_no):
        drive = PlacementDrives.query.get(drive_id)
        if not drive:
            return {"message": "Drive not found"}, 404
        
        if drive.company.user_id != current_user.id:
            return {"message": "Unauthorized access to this drive"}, 403
        
        remarks = "due to bulk rejection on closing the round"
        student_facing_remarks = "Position closed"
        
        # 1. Reject all scheduled interviews for this round
        scheduled_interviews = Interview.query.join(Application).filter(
            Application.DriveID == drive_id,
            Interview.round_no == round_no,
            Interview.status == 'scheduled'
        ).all()
        
        count = 0
        from application.tasks import send_application_status_update_email_task
        for interview in scheduled_interviews:
            interview.status = 'completed'
            interview.result = 'failed'
            interview.remarks = remarks
            interview.student_facing_remarks = student_facing_remarks
            
            app = interview.application
            if app.status != 'Rejected':
                app.previous_status = app.status
            app.status = 'Rejected'
            app.rejection_reason = remarks
            app.rejection_revoke_note = student_facing_remarks
            app.updated_time = get_ist_now()
            
            create_notification(app.student.user_id, f"Your application for '{drive.JobTitle}' has been rejected because the position was closed.", "warning")
            count += 1
            
            try:
                send_application_status_update_email_task.delay(app.id)
            except Exception as e:
                print(f"Error sending bulk rejection email: {e}")
            
        # 2. Reject all other applications in pipeline that are currently in/awaiting this round
        pipeline_apps = Application.query.filter(
            Application.DriveID == drive_id,
            Application.status.in_(['Shortlisted', 'Interviewing', 'Interview']),
            Application.rejection_reason.is_(None)
        ).all()
        
        for app in pipeline_apps:
            latest_int = Interview.query.filter_by(application_id=app.id).order_by(Interview.round_no.desc()).first()
            is_target_round = False
            if not latest_int and round_no == 1:
                is_target_round = True
            elif latest_int and latest_int.status == 'completed' and latest_int.result == 'passed' and latest_int.round_no == round_no - 1:
                is_target_round = True
            
            if is_target_round:
                if app.status != 'Rejected':
                    app.previous_status = app.status
                app.status = 'Rejected'
                app.rejection_reason = remarks
                app.rejection_revoke_note = student_facing_remarks
                app.updated_time = get_ist_now()
                create_notification(app.student.user_id, f"Your application for '{drive.JobTitle}' has been rejected because the position was closed.", "warning")
                count += 1
                
                try:
                    send_application_status_update_email_task.delay(app.id)
                except Exception as e:
                    print(f"Error sending bulk rejection email: {e}")
                
        db.session.commit()
        cache.clear()
        return {"message": f"Successfully closed Round {round_no}. {count} candidates rejected."}, 200

company_api.add_resource(CloseRoundAPI, '/close_round/<int:drive_id>/<int:round_no>')


class RejectIneligibleApplicationsAPI(Resource):
    @auth_required('token')
    @roles_required('comp')
    def post(self, drive_id):
        drive = PlacementDrives.query.get(drive_id)
        if not drive:
            return {"message": "Drive not found"}, 404
        
        if drive.company.user_id != current_user.id:
            return {"message": "Unauthorized access to this drive"}, 403
            
        active_apps = Application.query.filter(
            Application.DriveID == drive_id,
            Application.status.in_(['Pending', 'Shortlisted', 'Interviewing', 'Interview']),
            Application.rejection_reason.is_(None)
        ).all()
        
        count = 0
        from application.tasks import send_application_status_update_email_task
        for app in active_apps:
            is_eligible, issues = app.check_current_eligibility()
            if not is_eligible:
                if app.status != 'Rejected':
                    app.previous_status = app.status
                app.status = 'Rejected'
                app.rejection_reason = f"Eligibility lost due to profile update (Mismatch: {', '.join(issues)})"
                app.updated_time = get_ist_now()
                
                create_notification(
                    app.student.user_id,
                    f"Your application for '{drive.JobTitle}' has been rejected because your updated profile no longer meets eligibility criteria.",
                    "warning"
                )
                
                # Cancel scheduled/suspended interviews
                upcoming_interviews = Interview.query.filter(
                    Interview.application_id == app.id,
                    Interview.status.in_(['scheduled', 'suspended'])
                ).all()
                for interview in upcoming_interviews:
                    interview.status = 'canceled'
                    interview.remarks = f"Application rejected automatically. Reason: {app.rejection_reason}"
                
                try:
                    send_application_status_update_email_task.delay(app.id)
                except Exception as e:
                    print(f"Error sending bulk eligibility rejection email: {e}")
                
                count += 1
                
        if count > 0:
            db.session.commit()
            cache.clear()
            
        return {"message": f"Successfully rejected {count} ineligible candidates."}, 200

company_api.add_resource(RejectIneligibleApplicationsAPI, '/reject_ineligible_applications/<int:drive_id>')
