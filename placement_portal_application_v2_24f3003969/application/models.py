
from application.extensions import db, security
from flask_security import UserMixin, RoleMixin
from flask_security.models import fsqla_v3 as fsql
from datetime import datetime
from api.shared import get_ist_now, get_ist_date

fsql.FsModels.set_db_info(db)

#auto filtered by skills mean already added the skills provided in profile in the skill filter

class User(db.Model, UserMixin):
    __tablename__='user'
    id = db.Column(db.Integer, primary_key=True)
    password = db.Column(db.String(300), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    roles = db.relationship('Role', secondary='user_roles')  # e.g., 'Admin', 'Student', 'Company'
    active = db.Column(db.Boolean)
    note=db.Column(db.Text,nullable=True)
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)

    @property
    def role(self):
        return self.roles[0].name if self.roles else None

class Role(db.Model, RoleMixin):
    __tablename__='role'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # e.g., 'Admin', 'Student', 'Company'
    description = db.Column(db.String())

class UserRoles(db.Model):
    __tablename__='user_roles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    role_id = db.Column(db.Integer, db.ForeignKey('role.id', ondelete='CASCADE'))

class Department(db.Model):
    __tablename__='department'
    id=db.Column(db.Integer,primary_key=True)
    department=db.Column(db.String,nullable=False)

class StudentProfile(db.Model):
    __tablename__='student_profile'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    roll_no = db.Column(db.String, nullable=False)
    phone = db.Column(db.String(255), nullable=False)
    cgpa = db.Column(db.Float, nullable=False)
    department=db.Column(db.String, db.ForeignKey('department.department'),nullable=False)
    skills = db.Column(db.Text, nullable=True)
    resume=db.Column(db.Text,default=None)
    linkedin=db.Column(db.String, nullable=True)
    github=db.Column(db.String, nullable=True)
    certificates_link=db.Column(db.String,nullable=True)
    profile_pic=db.Column(db.String,nullable=True)
    registration_date = db.Column(db.Date, default=get_ist_date, nullable=True)
    about_me = db.Column(db.Text, nullable=True)
    user=db.relationship('User', backref=db.backref('profile', uselist=False), lazy=True)
    def to_dict(self):
            return {
                "id": self.id,
                "user_id": self.user_id,
                "name":self.name,
                "roll_no": self.roll_no,
                "phone": self.phone,
                "cgpa": self.cgpa,
                "department":self.department,
                "skills": self.skills.split(',') if self.skills else [],
                "linkedin": self.linkedin,
                "github":self.github,
                "certificates_link": self.certificates_link,
                "resume": self.resume,
                "email":self.user.email,
                "about_me": self.about_me,
                "registration_date": self.registration_date.isoformat() if self.registration_date else None
            }
class CompanyProfile(db.Model):
    __tablename__='company_profile'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    company_name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    contact=db.Column(db.String(20), nullable=False)
    website = db.Column(db.String(255), nullable=False)
    logo_image = db.Column(db.String(255), default=None)  # Could be a file path or URL
    gstin = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    secondary_email=db.Column(db.String(),nullable=True)
    is_approved = db.Column(db.Boolean, default=False, nullable=False)
    registration_date = db.Column(db.Date, default=get_ist_date, nullable=False)
    user=db.relationship('User', backref=db.backref('company_profile', uselist=False), lazy=True)

    @property
    def email(self):
        return self.user.email if self.user else "Unknown Email"
    def to_dict(self):
        history_entries = UserStatusHistory.query.filter_by(user_id=self.user_id).order_by(UserStatusHistory.timestamp.desc()).all()
        history_data = []
        for h in history_entries:
            history_data.append({
                "id": h.id,
                "status": h.status,
                "note": h.note or "No note provided.",
                "timestamp": h.timestamp.isoformat()
            })
        return {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'address': self.address,
            'contact': self.contact,
            'website': self.website,
            'logo_image': self.logo_image,
            'gstin': self.gstin,
            'description': self.description,
            'secondary_email': self.secondary_email,
            'is_approved': self.is_approved,
            'email': self.email,
            'registration_date': self.registration_date.isoformat() if self.registration_date else None,
            'status_history': history_data
        }

class DriveTemplate(db.Model):
    __tablename__='drive_template'
    id=db.Column(db.Integer,primary_key=True)
    CreatedDate=db.Column(db.Date,default=get_ist_date,nullable=False)
    TemplateName=db.Column(db.String,nullable=False)
    JobTitle=db.Column(db.String,nullable=False)
    JobDescription=db.Column(db.Text,nullable=False)
    Departments=db.Column(db.JSON,default=[])
    Vacancies=db.Column(db.Integer,nullable=False)
    RequiredSkills=db.Column(db.JSON,default=[])
    WorkMode=db.Column(db.String,nullable=False) #remote, hybrid, onsite
    Location=db.Column(db.String,nullable=False)
    noRounds=db.Column(db.Integer,default=None)
    InterviewRounds=db.Column(db.JSON,default=[])
    min_cgpa = db.Column(db.Float, default=None)
    CompanyID=db.Column(db.Integer,db.ForeignKey('company_profile.id'),nullable=False)
    company=db.relationship('CompanyProfile',backref='templates',lazy=True)

class PlacementDrives(db.Model):
    __tablename__='placement_drives'
    DriveID=db.Column(db.Integer,primary_key=True)
    CompanyID=db.Column(db.Integer,db.ForeignKey('company_profile.id'), nullable=False)
    Departments=db.Column(db.JSON,default=[])
    Vacancies=db.Column(db.Integer)
    JobTitle=db.Column(db.String(255))
    JobDescription=db.Column(db.Text)
    RequiredSkills=db.Column(db.JSON, default=[])
    InterviewRounds=db.Column(db.JSON,default=[])
    noRounds=db.Column(db.Integer,default=None)
    WorkMode=db.Column(db.String,nullable=False) #remote, hybrid, onsite
    ApplyDeadline=db.Column(db.Date,nullable=False)    
    Duration=db.Column(db.String,default=None)
    Status=db.Column(db.String,default="Pending") #Approved,Pending,Rjected,closed
    Type=db.Column(db.String,nullable=False) #Job, Internship
    PostedDate=db.Column(db.Date,default=get_ist_date,nullable=False)
    Location=db.Column(db.String)
    Salary=db.Column(db.String,nullable=False)
    Remark = db.Column(db.Text, default=None)
    RejectionDate = db.Column(db.Date, nullable=True)
    min_cgpa = db.Column(db.Float, default=None) # New field
    company=db.relationship('CompanyProfile',backref='drives',lazy=True)

    @property
    def company_name(self):
        return self.company.company_name if self.company else "Unknown Company"

    @property
    def logo_image(self):
        return self.company.logo_image if self.company else None
    
class Application(db.Model):
    __tablename__='application'
    id = db.Column(db.Integer, primary_key=True)
    DriveID = db.Column(db.Integer, db.ForeignKey('placement_drives.DriveID'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profile.id'), nullable=False)
    application_datetime = db.Column(db.DateTime, default=get_ist_now, nullable=False)
    status = db.Column(db.String(50), nullable=False,default=None)  
    selected_date = db.Column(db.Date, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    rejection_revoke_note = db.Column(db.Text, nullable=True)
    resume = db.Column(db.Text, nullable=True)  
    updated_time=db.Column(db.DateTime,default=get_ist_now,nullable=False)
    available_immediately = db.Column(db.Boolean, default=True, nullable=False)
    available_from = db.Column(db.Date, nullable=True)
    availability_remarks = db.Column(db.Text, nullable=True)
    previous_status = db.Column(db.String(50), nullable=True)

    student=db.relationship('StudentProfile',backref='applications',lazy=True)
    drive=db.relationship('PlacementDrives',backref='application',lazy=True)
    
    __table_args__=(
        db.UniqueConstraint("student_id","DriveID",name="unique_student_drive"),
    )

    def check_current_eligibility(self):
        stud = self.student
        drive = self.drive
        if not stud or not drive:
            return True, []

        issues = []
        
        # 1. Department Check
        if drive.Departments:
            allowed_depts = [d.get('department') if isinstance(d, dict) else str(d) for d in drive.Departments]
            if stud.department not in allowed_depts:
                issues.append(f"Department mismatch (Drive requires: {', '.join(allowed_depts)}, Candidate is in: {stud.department})")

        # 2. CGPA Check
        if drive.min_cgpa and float(stud.cgpa) < drive.min_cgpa:
            issues.append(f"CGPA below requirement (Drive requires: {drive.min_cgpa}, Candidate has: {stud.cgpa})")

        # 3. Skills Check
        student_skills = set(s.strip().lower() for s in (stud.skills or "").split(',') if s.strip())
        drive_skills = set(s.strip().lower() for s in (drive.RequiredSkills or []) if s.strip())

        if drive_skills and not drive_skills.issubset(student_skills):
            missing_skills = sorted(list(drive_skills - student_skills))
            issues.append(f"Missing required skills: {', '.join(missing_skills)}")

        is_eligible = len(issues) == 0
        return is_eligible, issues

class Interview(db.Model):
    __tablename__='interview'
    id=db.Column(db.Integer, primary_key=True)
    application_id=db.Column(db.Integer, db.ForeignKey('application.id'),nullable=False)
    round_no=db.Column(db.Integer,default=1)
    round_name=db.Column(db.String,nullable=False)
    datetime=db.Column(db.DateTime,nullable=False)
    location_or_link=db.Column(db.Text)
    status=db.Column(db.String) #scheduled, completed, canceled'
    remarks=db.Column(db.Text)
    student_facing_remarks = db.Column(db.Text, nullable=True)
    reschedule_count=db.Column(db.Integer, default=0)
    result=db.Column(db.String) #passed/failed
    previous_status = db.Column(db.String(50), nullable=True)
    application = db.relationship('Application', backref=db.backref('interviews', lazy=True))

class Placement(db.Model):
    __tablename__='placement'
    placement_id=db.Column(db.Integer,primary_key=True)
    application_id=db.Column(db.Integer,db.ForeignKey('application.id'), unique=True, nullable=False)
    offer_sent = db.Column(db.Boolean, default=False, nullable=False)
    offer_sent_date = db.Column(db.DateTime, nullable=True)
    offer_expiry_date = db.Column(db.Date, nullable=True)
    offer_letter = db.Column(db.String(255), nullable=True)
    message = db.Column(db.Text, nullable=True)
    joining_date = db.Column(db.Date, nullable=True)
    offer_status = db.Column(db.String, nullable=True)
    application=db.relationship('Application',backref=db.backref('placement', uselist=False),lazy=True)

class SupportQuery(db.Model):
    __tablename__ = 'support_query'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=get_ist_now, nullable=False)
    status = db.Column(db.String(50), default='Open', nullable=False) # Open, In Progress, Closed
    response = db.Column(db.Text, nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)
    user = db.relationship('User', backref='support_queries', lazy=True)

class UserStatusHistory(db.Model):
    __tablename__ = 'user_status_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False) # 'disabled', 'enabled'
    changed_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Admin ID who changed it
    note = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=get_ist_now, nullable=False)

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('status_history', lazy='dynamic'))
    changed_by = db.relationship('User', foreign_keys=[changed_by_id])

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(50), default='info') # e.g., 'success', 'warning', 'info'
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', backref=db.backref('notifications', lazy='dynamic'))

    @staticmethod
    def should_notify(message):
        return True