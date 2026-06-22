import os
from datetime import datetime
from flask import Blueprint, jsonify, request, make_response
from flask_restful import Api, Resource, fields, reqparse, marshal_with, inputs, marshal
from flask_security import auth_required, current_user, roles_required, roles_accepted
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
import bleach
from sqlalchemy.orm import joinedload

from application.extensions import db, cache
from application.models import (
    Application, StudentProfile, PlacementDrives, Interview, Placement
)
from .shared import create_notification, format_date, get_ist_now, get_ist_date

student_bp = Blueprint('student_api', __name__)
student_api = Api(student_bp)

# --- Parsers and Fields ---

apply_parser = reqparse.RequestParser()
apply_parser.add_argument('resume', type=FileStorage, location='files', required=False)
apply_parser.add_argument('available_immediately', type=inputs.boolean, location='form', default=True)
apply_parser.add_argument('available_from', type=str, location='form', required=False)
apply_parser.add_argument('availability_remarks', type=str, location='form', required=False)

apply_drive_files = {
    'resume': fields.String,
    'status': fields.String,
    'available_immediately': fields.Boolean,
    'available_from': fields.String(attribute=lambda x: x.available_from.isoformat() if x.available_from else None),
    'availability_remarks': fields.String,
}

interview_round_fields = {
    'id': fields.Integer,
    'application_id': fields.Integer,
    'interview_type': fields.String,
    'date': fields.String,
    'time': fields.String,
    'location_or_link': fields.String,
    'status': fields.String
}

student_parser = reqparse.RequestParser()
student_parser.add_argument('resume', type=FileStorage, location='files', required=False)
student_parser.add_argument('name', type=str, location='form', required=True, help="name is required")
student_parser.add_argument('roll_no', type=str, location='form', required=True, help="roll_no is required")
student_parser.add_argument('phone', type=str, location='form', required=True, help="phone no is required")
student_parser.add_argument('skills', type=str, location='form', required=False, help="comma separated")
student_parser.add_argument('cgpa', type=str, location='form', required=True, help="you cgpa is required")
student_parser.add_argument('department', type=str, location='form', required=True, help="department is required")
student_parser.add_argument('linkedin', type=str, location='form', required=False)
student_parser.add_argument('github', type=str, location='form', required=False)
student_parser.add_argument('certificates_link', type=str, location='form', required=False)
student_parser.add_argument('about_me', type=str, location='form', required=False)

student_profile_files = {
    'resume': fields.String,
    'name': fields.String,
    'roll_no': fields.String,
    'phone': fields.String,
    'skills': fields.List(fields.String),
    'cgpa': fields.String,
    'department': fields.String,
    'linkedin': fields.String,
    'github': fields.String,
    'certificates_link': fields.String,
    'registration_date': fields.String,
    'about_me': fields.String,
}

student_app_fields = {
    'id': fields.Integer,
    'DriveID': fields.Integer,
    'student_id': fields.Integer,
    'resume': fields.String(attribute=lambda x: x.resume if getattr(x, 'resume', None) else getattr(x.student, 'resume', None)),
    'status': fields.String,
    'is_currently_eligible': fields.Boolean(attribute=lambda x: x.check_current_eligibility()[0]),
    'eligibility_issues': fields.Raw(attribute=lambda x: x.check_current_eligibility()[1]),
    'is_offer_expired': fields.Boolean(attribute=lambda x: (x.placement.offer_expiry_date < get_ist_date()) if (x.placement and x.placement.offer_expiry_date) else False),
    'application_date': fields.String(attribute=lambda x: x.application_datetime.isoformat() if getattr(x, 'application_datetime', None) else None),
    'application_datetime': fields.String(attribute=lambda x: x.application_datetime.isoformat() if x.application_datetime else None), # The full ISO timestamp
    'offer_letter': fields.String(attribute=lambda x: x.placement.offer_letter if x.placement else None),
    'offer_message': fields.String(attribute=lambda x: x.placement.message if x.placement else None),
    'offer_expiry_date': fields.String(attribute=lambda x: x.placement.offer_expiry_date.isoformat() if x.placement and x.placement.offer_expiry_date else None),
    'offer_sent_date': fields.String(attribute=lambda x: x.placement.offer_sent_date.isoformat() if x.placement and x.placement.offer_sent_date else None),
    'joining_date': fields.String(attribute=lambda x: x.placement.joining_date.isoformat() if x.placement and x.placement.joining_date else None),
    'available_immediately': fields.Boolean,
    'available_from': fields.String(attribute=lambda x: x.available_from.isoformat() if x.available_from else None),
    'availability_remarks': fields.String,
    'rejection_reason': fields.String(attribute=lambda x: (x.Remark if x.Remark else (x.internal_rejection_remark if x.internal_rejection_remark and any(sys_term in x.internal_rejection_remark for sys_term in ['Automatically', 'Offer rejected', 'Eligibility lost']) else None)) if x.status == 'Rejected' else None),
    'drive': fields.Nested({
        'DriveID': fields.Integer,
        'JobTitle': fields.String,
        'CompanyID': fields.Integer,
        'company_name': fields.String,
        'logo_image': fields.String,
        'ApplyDeadline': fields.String(attribute=lambda x: x.ApplyDeadline.isoformat() if x.ApplyDeadline else None),
        'Type': fields.String,
        'Location': fields.String,
        'Salary': fields.String,
        'RequiredSkills': fields.Raw,
        'InterviewRounds': fields.Raw,
        'JobDescription': fields.String,
        'WorkMode': fields.String,
        'min_cgpa': fields.Float,
        'Departments': fields.Raw,
        'Status': fields.String,
    })
}

student_interview_fields = {
    'interview_id': fields.Integer(attribute='id'),
    'application_id': fields.Integer,
    'round_no': fields.Integer,
    'round_name': fields.String,
    'datetime': fields.String(attribute=lambda x: x.datetime.isoformat() if x.datetime else None),
    'datetime_formatted': fields.String(attribute=lambda x: x.datetime.strftime('%d %b %Y, %I:%M %p') if x.datetime else 'Not Scheduled'),
    'location_or_link': fields.String,
    'status': fields.String,
    'remarks': fields.String,
    'student_facing_remarks': fields.String,
    'result': fields.String,
    'reschedule_count': fields.Integer,
    'is_currently_eligible': fields.Boolean(attribute=lambda x: x.application.check_current_eligibility()[0] if x.application else True),
    'eligibility_issues': fields.Raw(attribute=lambda x: x.application.check_current_eligibility()[1] if x.application else []),
    'drive': fields.Nested({
        'JobTitle': fields.String,
        'company_name': fields.String,
    }, attribute='application.drive')
}

# --- APIs ---

class ApplyForDrive(Resource):
    @auth_required()
    def get(self, drive_id):
        try:
            stud = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not stud:
                return {"message": "Student profile not found"}, 404
            application = Application.query.filter(Application.DriveID == drive_id,
                                                 Application.student_id == stud.id).first()
            if application:
                return marshal(application, apply_drive_files), 200
            return {"message": "No application found"}, 404
        except Exception as e:
            print(f"Error in ApplyForDrive.get: {e}")
            return {"error": str(e)}, 500
        
    @auth_required('session', 'token')
    def post(self, drive_id):
        try:
            args = apply_parser.parse_args()
            stud = StudentProfile.query.filter_by(user_id=current_user.id).first()

            if not stud:
                return {"message": "Please complete your profile first"}, 400

            # Check if student is already hired for a JOB
            is_hired_for_job = Application.query.join(PlacementDrives).filter(
                Application.student_id == stud.id,
                Application.status == 'Hired',
                PlacementDrives.Type == 'Job'
            ).first()

            if is_hired_for_job:
                return {"message": "You have already secured a job placement and cannot apply for new drives."}, 403

            drive = PlacementDrives.query.get(drive_id)
            if not drive:
                return {"message": "Drive not found"}, 404

            # Verify if the drive is closed or deadline has passed
            today_kolkata = get_ist_date()
            if drive.Status in ['Application Closed', 'Closed'] or (drive.ApplyDeadline and drive.ApplyDeadline < today_kolkata):
                if drive.Status not in ['Application Closed', 'Closed']:
                    drive.Status = 'Application Closed'
                    db.session.commit()
                    cache.clear()
                return {"message": "This placement drive has been closed and is no longer accepting applications."}, 400

            if drive.Status != 'Active':
                return {"message": "This placement drive is not open for applications. A student can only apply to a drive if its status is active."}, 400

            # --- Eligibility Validation ---
            # 1. Department Check
            if drive.Departments:
                allowed_depts = [d.get('department') if isinstance(d, dict) else str(d) for d in drive.Departments]
                if stud.department not in allowed_depts:
                    return {"message": f"This drive is not open for the {stud.department} department."}, 403
            
            # 2. CGPA Check
            if drive.min_cgpa and float(stud.cgpa) < drive.min_cgpa:
                return {"message": f"Your CGPA ({stud.cgpa}) does not meet the minimum requirement of {drive.min_cgpa} for this drive."}, 403

            # 3. Skills Check
            student_skills = set(s.strip().lower() for s in (stud.skills or "").split(',') if s.strip())
            drive_skills = set(s.strip().lower() for s in (drive.RequiredSkills or []) if s.strip())

            if drive_skills and not drive_skills.issubset(student_skills):
                missing_skills = ", ".join(drive_skills - student_skills)
                return {"message": f"You are missing the following required skills: {missing_skills}"}, 403

            existing_application = Application.query.filter_by(student_id=stud.id, DriveID=drive_id).first()
            if existing_application:
                return existing_application, 200

            file = args['resume']
            if file:
                filename = secure_filename(file.filename)
                file_path = os.path.join('static/uploads/resumes', filename).replace('\\', '/')
                file.save(file_path)
            else:
                if stud.resume:
                    file_path = stud.resume
                else:
                    return {"message": "You have no resume uploaded in your profile. Please upload a resume to apply."}, 400
            
            available_from_dt = None
            if not args.get('available_immediately'):
                if not args.get('available_from'):
                    return {"message": "Expected Availability Date is required when immediate availability is No."}, 400
                if not args.get('availability_remarks') or not args.get('availability_remarks').strip():
                    return {"message": "Commitment Clarification remarks are required when immediate availability is No."}, 400
                try:
                    available_from_dt = datetime.strptime(args['available_from'], '%Y-%m-%d').date()
                except ValueError:
                    return {"message": "Invalid date format for availability. Use YYYY-MM-DD"}, 400
                if available_from_dt < get_ist_date():
                    return {"message": "Availability date cannot be in the past."}, 400
            new_app = Application(
                DriveID=drive_id,
                student_id=stud.id,
                resume=file_path,
                status='Pending',
                application_datetime=get_ist_now(),
                available_immediately=args.get('available_immediately', True),
                available_from=available_from_dt,
                availability_remarks=args.get('availability_remarks')
            )
            db.session.add(new_app)
            create_notification(drive.company.user_id, f"New application received from '{stud.name}' for your drive '{drive.JobTitle}'.", "info")
            db.session.commit() 
            cache.clear()
            return {"message": "Application submitted successfully", "application_id": new_app.id}, 201
            
        except Exception as e:
            print(f"Error in apply endpoint: {e}")
            return {"message": "An error occurred while processing your application"}, 500

student_api.add_resource(ApplyForDrive, '/apply/<int:drive_id>')


class InterviewRounds(Resource):
    @auth_required()
    @marshal_with(interview_round_fields)
    def get(self, application_id):
        try:
            interview_rounds = Interview.query.filter_by(application_id=application_id).all()
            return interview_rounds, 200
        except Exception as e:
            print(e)
            return {"error": str(e)}, 500

student_api.add_resource(InterviewRounds, '/interview_rounds/<int:application_id>')


class StudentDetailsAPI(Resource):
    @auth_required()
    def get(self):
        try:
            stud_profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not stud_profile:
                return {"message": "Profile not found"}, 404
            stud = stud_profile.to_dict()
            return marshal(stud, student_profile_files), 200, {'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'}
        except Exception as e:
            print(f"Error in StudentDetailsAPI.get: {e}")
            return {"error": str(e)}, 500
        
    @auth_required('session', 'token')
    def post(self):
        args = student_parser.parse_args()
        profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            # First-time setup: Validate required fields (resume is optional at registration)
            if not all([args['roll_no'], args['phone'], args['cgpa'], args['name'], args['department']]):
                return {"message": "All required fields must be filled "}, 400
            else:
                resume_file = args['resume']
                save_path = None
                if resume_file:
                    filename = secure_filename(resume_file.filename)
                    full_path = os.path.join('static/uploads/resumes', filename)
                    save_path = full_path.replace('\\', '/')
                    resume_file.save(save_path)
            profile = StudentProfile(
                user_id=current_user.id,
                name=args['name'],
                roll_no=args['roll_no'],
                phone=args['phone'],
                cgpa=args['cgpa'],
                department=args['department'],
                skills=args['skills'],
                linkedin=args['linkedin'],
                github=args['github'],
                resume=save_path,
                certificates_link=args['certificates_link'],
                about_me=args['about_me']
            )
            db.session.add(profile)
        else:
            for key, value in args.items():
                if value is not None:
                    setattr(profile, key, value)
        
        db.session.commit()
        cache.clear()
        return {"message": "Profile saved successfully"}, 200

student_api.add_resource(StudentDetailsAPI, '/student_details')


class StudentProfileApi(Resource):
    @auth_required('session', 'token')
    def get(self):
        try:
            profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {"message": "Profile not found"}, 404
            response_data = {
                "user_id": profile.user_id,
                "name": profile.name, 
                "email": profile.user.email,
                "roll_no": profile.roll_no,
                "phone": profile.phone,
                "cgpa": profile.cgpa,
                "department": profile.department,
                "resume": profile.resume,
                "profile_pic": profile.profile_pic,
                "skills": profile.skills.split(',') if profile.skills else [],
                "linkedin": profile.linkedin,
                "github": profile.github,
                "certificates_link": profile.certificates_link,
                "about_me": profile.about_me,
                "registration_date": profile.registration_date.isoformat() if profile.registration_date else None
            }
            # Append headers to prevent caching issues completely
            return make_response(jsonify(response_data), 200, {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            })
        except Exception as e:
            print(f"Error in StudentProfileApi GET: {e}")
            return {"error": str(e)}, 500
    
    @auth_required('session', 'token')
    def post(self):
        try:
            data = request.get_json() or {}
            user_id_to_update = current_user.id
            is_admin = 'admin' in [role.name for role in current_user.roles]

            if is_admin and data.get('user_id'):
                user_id_to_update = data.get('user_id')

            profile = StudentProfile.query.filter_by(user_id=user_id_to_update).first()
            if not profile:
                return {'message': "Profile not found"}, 404

            def get_valid_value(field_name, current_value):
                return data.get(field_name, current_value) if data.get(field_name) is not None else current_value

            # Fields editable by student
            profile.name = get_valid_value('name', profile.name)
            profile.phone = get_valid_value('phone', profile.phone)
            profile.linkedin = data.get('linkedin', profile.linkedin)
            profile.github = data.get('github', profile.github)
            profile.about_me = get_valid_value('about_me', profile.about_me)
            profile.certificates_link = data.get('certificates_link', profile.certificates_link)
            if 'skills' in data:
                skills_data = data.get('skills')
                if isinstance(skills_data, list):
                    profile.skills = ','.join(skills_data)
                else:
                    profile.skills = skills_data
            
            cgpa_val = data.get('cgpa')
            if cgpa_val is not None:
                try:
                    cgpa_float = float(cgpa_val)
                    if 0 <= cgpa_float <= 10:
                        profile.cgpa = cgpa_float
                    else:
                        return {"message": "CGPA must be between 0 and 10"}, 400
                except ValueError:
                    return {"message": "CGPA must be a valid number"}, 400

            if is_admin:
                profile.roll_no = get_valid_value('roll_no', profile.roll_no)
                profile.department = get_valid_value('department', profile.department)

            db.session.commit()
            cache.clear()
            return {"message": "Profile updated successfully"}, 200
        except Exception as e:
            print(f"Error in StudentProfileApi POST: {e}")
            return {"error": str(e)}, 500

student_api.add_resource(StudentProfileApi, '/student_profile')


class StudentResumeAPI(Resource):
    @auth_required('session', 'token')
    def post(self):
        try:
            # 1. Grab the file from the multipart request
            resume_file = request.files.get('resume')
            print(f"File received :{resume_file if resume_file else 'None'}")
            if not resume_file:
                return {"message": "No file uploaded"}, 400

            profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {"message": "Profile not found"}, 404
            print(f"Updating profile for:{current_user.id}")
            if profile.resume:
                old_path = profile.resume.replace('/', os.sep)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                        print(f"successfully deleted: {old_path}")
                    except Exception as e:
                        print(f"Error deleting file: {e}")

            # 2. Process and Save
            filename = secure_filename(resume_file.filename)
            # Normalize to forward slashes for the web
            save_path = os.path.join('static/uploads/resumes', filename).replace('\\', '/')
            resume_file.save(save_path)

            # 3. Update the student's record
            profile.resume = save_path
            db.session.commit()
            print(f"new path: {profile.resume}")
            cache.clear()
            return {"message": "Resume updated successfully!", "path": save_path}, 200
        except Exception as e:
            print(f"Error in StudentResumeAPI POST: {e}")
            return {"message": "Error uploading resume"}, 500

    @auth_required('session', 'token')
    def delete(self):
        try:
            profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {"message": "Profile not found"}, 404
            if profile.resume:
                old_path = profile.resume.replace('/', os.sep)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                        print(f"successfully deleted resume file: {old_path}")
                    except Exception as e:
                        print(f"Error deleting file: {e}")
                profile.resume = None
                db.session.commit()
                cache.clear()
            return {"message": "Resume removed successfully!"}, 200
        except Exception as e:
            print(f"Error in StudentResumeAPI DELETE: {e}")
            return {"message": "Error removing resume"}, 500

student_api.add_resource(StudentResumeAPI, '/student_resume')


class ProfilePicAPI(Resource):
    @auth_required('session', 'token')
    def post(self):
        try:
            pic_file = request.files.get('profile_pic')
            print(f"Profile pic upload attempt - File: {pic_file}")
            if not pic_file:
                return {"message": "No file uploaded"}, 400

            profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
            print(f"Current user: {current_user.id}, Profile: {profile}")
            if not profile:
                return {"message": "Profile not found"}, 404
            
            # Cleanup: Delete old picture if it exists
            if profile.profile_pic and "default" not in profile.profile_pic:
                old_path = os.path.abspath(profile.profile_pic.replace('/', os.sep))
                if os.path.exists(old_path):
                    os.remove(old_path)

            # Save new picture
            filename = secure_filename(pic_file.filename)
            save_path = os.path.join('static/uploads/profiles', filename).replace('\\', '/')
            print(f"Saving to: {save_path}")
            pic_file.save(save_path)

            profile.profile_pic = save_path
            db.session.commit()
            cache.clear()
            print("Profile picture updated successfully")

            return {"message": "Picture updated", "path": save_path}, 200
        except Exception as e:
            print(f"Error in ProfilePicAPI POST: {e}")
            import traceback
            traceback.print_exc()
            return {"message": "Error uploading picture"}, 500

    @auth_required('session', 'token')
    def delete(self):
        try:
            profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {"message": "Profile not found"}, 404
            if profile.profile_pic and "default" not in profile.profile_pic:
                old_path = os.path.abspath(profile.profile_pic.replace('/', os.sep))
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                        print(f"successfully deleted profile pic file: {old_path}")
                    except Exception as e:
                        print(f"Error deleting profile pic file: {e}")
            profile.profile_pic = None
            db.session.commit()
            cache.clear()
            return {"message": "Profile picture removed successfully!"}, 200
        except Exception as e:
            print(f"Error in ProfilePicAPI DELETE: {e}")
            return {"message": "Error removing picture"}, 500

student_api.add_resource(ProfilePicAPI, '/profile_pic')


class StudentApplicationsAPI(Resource):
    @auth_required('session', 'token')
    @marshal_with(student_app_fields)
    def get(self):
        try:
            stud = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not stud:
                return {"message": "No student found"}, 404
            applications = Application.query.filter_by(student_id=stud.id).options(
                joinedload(Application.student),
                joinedload(Application.placement),
                joinedload(Application.drive).joinedload(PlacementDrives.company)
            ).all()
            return applications, 200, {'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'}
        except Exception as e:
            print(f"Error in StudentProfileApi GET: {e}")
            return {"error": str(e)}, 500

student_api.add_resource(StudentApplicationsAPI, '/student_applications_api')


class StudentApplicationCancelAPI(Resource):
    @auth_required('token')
    @roles_required('stud')
    def put(self, application_id):
        try:
            student = StudentProfile.query.filter_by(user_id=current_user.id).first()
            if not student:
                return {"message": "Student profile not found"}, 404

            application = Application.query.filter_by(id=application_id, student_id=student.id).first()
            if not application:
                return {"message": "Application not found or unauthorized"}, 404
            
            if application.status != 'Pending':
                return {"message": "Only pending applications can be cancelled."}, 400
            
            # delete application
            db.session.delete(application)
            db.session.commit()
            cache.clear() # Clear cache related to applications
            return {"message": "Application cancelled successfully"}, 200
        except Exception as e:
            print(f"Error cancelling application: {e}")
            return {"message": "An error occurred while cancelling the application"}, 500

student_api.add_resource(StudentApplicationCancelAPI, '/student_application_api/<int:application_id>/cancel')


class StudentOfferAcceptAPI(Resource):
    @auth_required('token')
    @roles_required('stud')
    def put(self, application_id):
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not student:
            return {"message": "Student profile not found"}, 404

        application = Application.query.filter_by(id=application_id, student_id=student.id).first()
        if not application:
            return {"message": "Application not found or unauthorized"}, 404
        
        if application.status != 'Selected':
            return {"message": "No active offer to respond to for this application."}, 400

        if application.placement and application.placement.offer_expiry_date:
            if application.placement.offer_expiry_date < get_ist_date():
                return {"message": "This offer has expired. Please contact support or the employer to request an extension."}, 400

        # --- START of new logic ---
        # Check if the accepted offer is for a 'Job'
        is_job_offer = application.drive.Type == 'Job'

        application.status = 'Hired'
        application.updated_time = get_ist_now() # Explicitly set hired date
        if application.placement:
            application.placement.offer_status = 'Accepted'
        
        create_notification(
            application.drive.company.user_id,
            f"Student {student.name} officially ACCEPTED your offer for '{application.drive.JobTitle}'.",
            "success"
        )

        try:
            from application.tasks import send_offer_response_email_task
            send_offer_response_email_task.delay(application_id, 'accepted')
        except Exception as e:
            print(f"Error triggering accepted offer email task: {e}")

        if is_job_offer:
            # Cancel all other pending/shortlisted applications and their scheduled interviews
            other_applications = Application.query.filter(
                Application.student_id == student.id,
                Application.id != application_id,
                Application.status.in_(['Pending', 'Shortlisted', 'Interviewing', 'Selected'])
            ).all()

            for app in other_applications:
                app.status = 'Cancelled'
                app.rejection_reason = 'Automatically cancelled as student accepted another job offer.'
                app.updated_time = get_ist_now()
                if app.placement:
                    app.placement.offer_status = 'Cancelled'

                # Also cancel any scheduled/suspended interviews for this application
                interviews_to_cancel = Interview.query.filter(
                    Interview.application_id == app.id,
                    Interview.status.in_(['scheduled', 'suspended'])
                ).all()
                for interview in interviews_to_cancel:
                    interview.status = 'canceled'
                    interview.remarks = 'Automatically cancelled due to job acceptance.'
        # --- END of new logic ---

        db.session.commit()
        cache.clear()
        return {"message": "Offer accepted successfully!"}, 200

student_api.add_resource(StudentOfferAcceptAPI, '/student_application/<int:application_id>/accept_offer')


class StudentOfferRejectAPI(Resource):
    @auth_required('token')
    @roles_required('stud')
    def put(self, application_id):
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not student:
            return {"message": "Student profile not found"}, 404

        application = Application.query.filter_by(id=application_id, student_id=student.id).first()
        if not application:
            return {"message": "Application not found or unauthorized"}, 404
        
        if application.status != 'Selected':
            return {"message": "No active offer to respond to for this application."}, 400

        if application.placement and application.placement.offer_expiry_date:
            if application.placement.offer_expiry_date < get_ist_date():
                return {"message": "This offer has expired. Please contact support or the employer to request an extension."}, 400

        if application.status != 'Rejected':
            application.previous_status = application.status
        application.status = 'Rejected'
        application.rejection_reason = 'Offer rejected by student.'
        application.updated_time = get_ist_now()
        if application.placement:
            application.placement.offer_status = 'Rejected'
            
        create_notification(
            application.drive.company.user_id,
            f"Student {student.name} officially DECLINED your offer for '{application.drive.JobTitle}'.",
            "warning"
        )

        try:
            from application.tasks import send_offer_response_email_task
            send_offer_response_email_task.delay(application_id, 'declined')
        except Exception as e:
            print(f"Error triggering declined offer email task: {e}")
        db.session.commit()
        cache.clear()
        return {"message": "Offer rejected."}, 200

student_api.add_resource(StudentOfferRejectAPI, '/student_application/<int:application_id>/reject_offer')


class StudentInterviewsAPI(Resource):
    @auth_required('token')
    @roles_required('stud')
    def get(self):
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not student:
            return {"message": "Student profile not found"}, 404

        # Eagerly load relationships to prevent N+1 query issues
        interviews = db.session.query(Interview).join(Application).filter(
            Application.student_id == student.id
        ).options(
            joinedload(Interview.application).joinedload(Application.drive).joinedload(PlacementDrives.company)
        ).order_by(Interview.datetime.desc()).all()

        return marshal(interviews, student_interview_fields), 200, {'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'}

student_api.add_resource(StudentInterviewsAPI, '/student_interviews')
