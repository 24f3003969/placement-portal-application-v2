from flask import Blueprint
from flask_restful import Api, Resource, reqparse
from flask_security import auth_required, current_user
from application.extensions import db, cache
from application.models import StudentProfile, CompanyProfile, Notification, SupportQuery, User
from celery.result import AsyncResult
from .shared import create_notification

common_bp = Blueprint('common_api', __name__)
common_api = Api(common_bp)

class WhoAmI(Resource):
    @auth_required('token')
    def get(self):
        try:
            role = current_user.roles[0].name if current_user.roles else None
            has_profile = False
            display_name = current_user.email
            
            if role == 'stud':
                student = StudentProfile.query.filter_by(user_id=current_user.id).first()
                if student:
                    has_profile = True
                    display_name = student.name
            elif role == 'comp':
                company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
                if company:
                    has_profile = True
                    display_name = company.company_name
            
            return {
                "email": current_user.email,
                "role": role,
                "has_profile": has_profile,
                "userName": display_name
            }, 200
        except Exception as e:
            print(e)
            return {"error": str(e)}, 500

common_api.add_resource(WhoAmI, '/whoami')


class PublicStatsAPI(Resource):
    def get(self):
        @cache.cached(timeout=3600, key_prefix="public_stats_data")
        def compute_metrics():
            from sqlalchemy import func
            # 1. Real-Time Impact Ribbon stats
            total_students = StudentProfile.query.join(StudentProfile.user).filter(StudentProfile.user.has(active=True)).count()
            partnered_companies = CompanyProfile.query.join(CompanyProfile.user).filter(CompanyProfile.user.has(active=True), CompanyProfile.is_approved == True).count()
            from application.models import Application, PlacementDrives
            offers_released = db.session.query(func.count(func.distinct(Application.student_id))).filter(
                Application.status.in_(['Hired', 'Selected'])
            ).scalar() or 0

            # 2. Optimized Database Scalar Calculation for Salary Max
            highest_package_scalar = db.session.query(
                func.max(func.cast(PlacementDrives.Salary, db.Float))
            ).join(
                Application, PlacementDrives.DriveID == Application.DriveID
            ).filter(
                Application.status.in_(['Hired', 'Selected']),
                PlacementDrives.Type == 'Job',
                PlacementDrives.Salary.isnot(None),
                PlacementDrives.Salary != ''
            ).scalar()

            highest_package = round(float(highest_package_scalar), 2) if highest_package_scalar else 0.0

            # 3. Placement Spotlight statistics
            placements_by_dept_raw = db.session.query(
                StudentProfile.department, 
                func.count(func.distinct(Application.student_id))
            ).join(
                Application, StudentProfile.id == Application.student_id
            ).filter(
                Application.status.in_(['Hired', 'Selected'])
            ).group_by(
                StudentProfile.department
            ).order_by(
                func.count(func.distinct(Application.student_id)).desc()
            ).all()

            # CRITICAL FIX: Extract values explicitly via index tracking 
            # to destroy the SQLAlchemy Row wrapper entirely before caching hits.
            placements_by_department = []
            for row in placements_by_dept_raw:
                placements_by_department.append({
                    "department": str(row[0]),
                    "count": int(row[1])
                })

            # Return a completely clean, native Python dictionary
            return {
                "impact_stats": {
                    "total_students": int(total_students),
                    "partnered_companies": int(partnered_companies),
                    "offers_released": int(offers_released),
                    "highest_package": float(highest_package)
                },
                "placement_spotlight": placements_by_department
            }

        try:
            # Fetch the clean dictionary data from the cache helper
            cached_data = compute_metrics()
            # Return using Flask-RESTful's direct payload structure
            return cached_data, 200
        except Exception as e:
            print(f"Exception encountered in PublicStatsAPI pipeline: {e}")
            return {"message": "An error occurred while generating statistics.", "error": str(e)}, 500

common_api.add_resource(PublicStatsAPI, '/public_stats')


class TaskStatusAPI(Resource):
    @auth_required('token')
    def get(self, task_id):
        task = AsyncResult(task_id)
        response = {'state': task.state, 'status': 'pending'}

        if task.state == 'PENDING':
            response['status'] = 'Task is pending...'
        elif task.state == 'SUCCESS':
            response['status'] = 'Complete'
            response['result'] = task.info
        elif task.state != 'FAILURE':
            response['status'] = 'In progress...'
        else: # Something went wrong
            response['status'] = str(task.info)
            response['error'] = True
        return response

common_api.add_resource(TaskStatusAPI, '/task_status/<string:task_id>')


class NotificationAPI(Resource):
    @auth_required('token')
    def get(self):
        # Fetch top 100 notifications for the logged-in user and filter them
        notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(100).all()
        filtered_notifs = [n for n in notifs if Notification.should_notify(n.message)]
        top_filtered = filtered_notifs[:20]
        from zoneinfo import ZoneInfo
        return [{
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.replace(tzinfo=ZoneInfo('UTC')).astimezone(ZoneInfo('Asia/Kolkata')).strftime('%d %b, %H:%M')
        } for n in top_filtered], 200

    @auth_required('token')
    def put(self):
        unread_notifs = Notification.query.filter_by(user_id=current_user.id, is_read=False).all()
        for n in unread_notifs:
            if Notification.should_notify(n.message):
                n.is_read = True
        db.session.commit()
        return {"message": "Notifications marked as read"}, 200

common_api.add_resource(NotificationAPI, '/notifications')


class SupportQueryAPI(Resource):
    @auth_required('token')
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('message', type=str, required=True, help="Message is required")
        args = parser.parse_args()

        new_query = SupportQuery(
            user_id=current_user.id,
            message=args['message']
        )
        db.session.add(new_query)
        admins = User.query.filter(User.roles.any(name='admin')).all()
        for admin in admins:
            create_notification(admin.id, f"New Support Query raised by a user: '{current_user.email}' has submitted a query.", "warning")
        db.session.commit()
        return {"message": "Your query has been submitted successfully. We will get back to you shortly."}, 201

common_api.add_resource(SupportQueryAPI, '/support_query')

