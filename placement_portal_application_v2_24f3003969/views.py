from flask import jsonify, render_template_string, render_template, request, send_from_directory
from flask_security import auth_required, current_user,login_user, verify_password, roles_required, roles_accepted, SQLAlchemyUserDatastore
from flask_security.utils import hash_password
from sqlalchemy import or_
from application.extensions import db
from application.models import CompanyProfile,StudentProfile, Department
from application.tasks import generate_student_report_task
from application.mail import send_email
from celery.result import AsyncResult

def create_view(app,user_datastore: SQLAlchemyUserDatastore):
    @app.after_request
    def add_header(response):
        # Disable caching for static files to ensure browser loads latest frontend changes
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    #homepage
    @app.route('/')
    def home():
        return render_template('index.html')
    
    @app.route('/login_form',methods=['POST'])
    def login_form():
        print("CUSTOM LOGIN ROUTE ENABLED")
        data=request.get_json()
        email=data.get('email')
        password=data.get('password')
        
        # Validate input
        if not email or not password:
            return jsonify({"message":"Email and password are required"}),400
        
        user=user_datastore.find_user(email=email)
        
        # Check if user exists
        if not user:
            return jsonify({"message":"No user with this email found"}),401
        
        # Verify password
        if not verify_password(password,user.password):
            return jsonify({"message":"Invalid password"}),401
        role=user.roles[0].name if user.roles else None
        # Check if user is active
        if not user.active:
            if role == 'comp':
                company = CompanyProfile.query.filter_by(user_id=user.id).first()
                if company and not company.is_approved:
                    return jsonify({
                        "message": "Your profile has been rejected. Email support if you want to correct any detail (provide corrected details with field name) or <a href='#/contact_support' class='alert-link'>contact support</a>.",
                        "is_rejected": True,
                        "profile": company.to_dict()
                    }), 401
            return jsonify({"message":"Your account has been deactivated. Please contact admin."}),401
        
        login_user(user)
        has_profile = False
        display_name = user.email # Default display name
        
        if role=='stud':
            student=StudentProfile.query.filter_by(user_id=user.id).first()
            if student:
                has_profile=True
                display_name=student.name
        elif role=='comp':
            company=CompanyProfile.query.filter_by(user_id=user.id).first()
            if company and not company.is_approved:
                return jsonify({"message":"Your company profile is pending approval. Please wait for admin approval."}),401
            elif company and company.is_approved:
                has_profile=True
                display_name=company.company_name
        elif role == 'admin':
            has_profile = True # Admins are considered to have a profile by default
            department_count = Department.query.count()
            response_data = {"message":"Login successful","token":user.get_auth_token(),"role":role,"has_profile":has_profile,"userName":display_name}
            if department_count == 0:
                response_data["needs_department_setup"] = True
            return jsonify(response_data), 200
        print(has_profile)
        return jsonify({"message":"Login successful","token":user.get_auth_token(),"role":role,"has_profile":has_profile,"userName":display_name}),200

    @app.route('/api/forgot_password', methods=['POST'])
    def forgot_password():
        import secrets
        from application.models import User, PasswordResetToken
        from api.shared import get_ist_now
        
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid request"}), 400
            
        email = data.get('email')
        if not email:
            return jsonify({"message": "Email is required"}), 400
            
        user = user_datastore.find_user(email=email)
        success_msg = "reset password link is sent to the provided email if it is a registered one"
        
        if user:
            # Generate a 5-minute one-time reset token
            token = secrets.token_urlsafe(32)
            reset_token = PasswordResetToken(
                token=token,
                user_id=user.id,
                created_at=get_ist_now(),
                used=False
            )
            db.session.add(reset_token)
            db.session.commit()
            
            # Construct link (using standard Vue hash routing)
            reset_link = f"{request.host_url}#/reset_password?token={token}"
            
            subject = "Password Reset Confirmation"
            message_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>We received a request to reset the password for your account. Please click the link below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p>Please note that this link is <strong>valid for 5 minutes only</strong> and <strong>can only be used once</strong>.</p>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">Placement Portal Application</p>
            </div>
            """
            send_email(to_address=user.email, subject=subject, message=message_html, content="html")
            
        return jsonify({"message": success_msg}), 200

    @app.route('/api/reset_password', methods=['POST'])
    def reset_password():
        from application.models import User, PasswordResetToken
        from api.shared import get_ist_now
        
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid request"}), 400
            
        token = data.get('token')
        password = data.get('password')
        
        if not token or not password:
            return jsonify({"message": "Token and password are required"}), 400
            
        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters long"}), 400
            
        token_record = PasswordResetToken.query.filter_by(token=token).first()
        if not token_record:
            return jsonify({"message": "Invalid or expired token."}), 400
            
        if token_record.used:
            return jsonify({"message": "Token has already been used."}), 400
            
        # Check if expired (5 minutes = 300 seconds)
        now = get_ist_now()
        elapsed_seconds = (now - token_record.created_at).total_seconds()
        if elapsed_seconds > 300:
            return jsonify({"message": "Token has expired."}), 400
            
        user = user_datastore.find_user(id=token_record.user_id)
        if not user:
            return jsonify({"message": "User not found."}), 404
            
        user.password = hash_password(password)
        token_record.used = True
        db.session.commit()
        
        return jsonify({"message": "Password has been successfully reset."}), 200
    
    @app.route('/api/logout', methods=['POST'])
    @auth_required('session','token')
    def logout_user():
        """Logout endpoint that properly clears session"""
        from flask_login import logout_user as flask_logout
        flask_logout()
        return jsonify({"message": "Logged out successfully"}), 200
    
    @app.route('/signup', methods=['GET', 'POST'])
    def signup():
        data=request.get_json()
        email=data.get('email')
        password=data.get('password')
        role=data.get('role')

        if not email or not password or role not in ['stud','comp']:
            return jsonify({'message':'Missing required fields'}),400
        
        if user_datastore.find_user(email=email):
            return jsonify({'message':'User already exists'}),400
        
        try:
            user=user_datastore.create_user(email=email,password=hash_password(password),active=True,roles=[role])
            db.session.commit()
            login_user(user)
            return jsonify({"message":"User created and Logged in","role":role,"token":user.get_auth_token()}),200
            
        except Exception as e:
            print(f"Error in creating user: {e}")
            db.session.rollback()
            return jsonify({'message':'Error in creating user'}),500

    
    #profile page
    @app.route('/profile')
    @auth_required('session','token')
    def profile():
        return render_template_string(
            """
                <h1>User Profile</h1>
                <p>Welcome, {{ current_user.email }}!</p>
                <a href="/logout">Logout</a>

            """
        )
    
    @app.route('/company_dashboard')
    @roles_required('comp')
    @roles_accepted('comp')
    @auth_required('session','token')
    def company_dashboard():
        has_profile=False
        if current_user.role=="comp":
            company=CompanyProfile.query.filter_by(user_id=current_user.id).first()
            if company and not company.is_approved:
                return jsonify({"message":"Your company profile is pending approval. Please wait for admin approval."}),401
            elif company and company.is_approved:
                has_profile=True
            return jsonify({"message":"Company Dashboard","has_profile":has_profile}),200
    
    @app.route('/student_dashboard')
    @roles_required('stud')
    @roles_accepted('stud')
    @auth_required('session','token')
    def student_dashboard():
        has_profile=False
        if current_user.role=="stud":
            student=StudentProfile.query.filter_by(user_id=current_user.id).first()
            if student:
                has_profile=True
            return jsonify({"message":"Student Dashboard","has_profile":has_profile}),200

    @app.route('/admin_dashboard')
    @roles_required('admin')
    @roles_accepted('admin')
    @auth_required('session','token')
    def admin_dashboard():
        return jsonify({"message":"Admin Dashboard"}),200
    
    @app.route('/api/export') #This manually trigers the job
    @auth_required()
    @roles_required('stud')
    @roles_accepted('stud')
    def export_csv():
        student=StudentProfile.query.filter_by(user_id=current_user.id).first()
        result=generate_student_report_task.delay(student.id) # Call the Celery task asynchronously
        return jsonify({
            "id": result.id,
            "result": result.result,
        })
    
    @app.route('/api/csv_result/<task_id>') #just create to test the status of result fetching of the task
    @auth_required()
    @roles_required('stud')
    @roles_accepted('stud')
    def get_csv_result(task_id):
        result = AsyncResult(task_id)
        return send_from_directory('static/reports', result.result['file_url'].split('/')[-1], as_attachment=True)
    
    
    