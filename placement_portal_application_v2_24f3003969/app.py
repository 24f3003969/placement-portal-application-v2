from flask import Flask
from flask_security.utils import hash_password
import views, os
from application.extensions import db, security, user_datastore
import api
from application.worker import celery_init_app
from celery.schedules import crontab
from application.tasks import generate_admin_monthly_report_task, generate_daily_reminders_task, cleanup_old_files_task
app=None

def initial_data(user_datastore):
    if not user_datastore.find_role('admin'):
        user_datastore.find_or_create_role(name='admin',description="Administrator")
    if not user_datastore.find_role('comp'):
        user_datastore.find_or_create_role(name='comp',description="Company")
    if not user_datastore.find_role('stud'):
        user_datastore.find_or_create_role(name='stud',description="Student")
    db.session.commit()

    #create user data
    if not user_datastore.find_user(email="admin@iitm.ac.in"):
        user_datastore.create_user(email="admin@iitm.ac.in", password=hash_password("admin143"),roles=['admin'])
    db.session.commit()

def create_app():
    app=Flask(__name__)
    app.url_map.strict_slashes = False
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///placement_portal.sqlite3"
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'my_very_effective_mot-098i79@#*&her_ram%^&navmi_just_sa2343@#%_to_123@#$_to_serve_us')
    app.config['SECURITY_PASSWORD_SALT'] = os.environ.get('SECURITY_PASSWORD_SALT', 'my_precious_salt_is_very_precious')

    # Security & Mail Configurations
    app.config['SECURITY_AUTHENTICATION_MECHANISMS'] = ['token', 'session']
    app.config['SECURITY_TOKEN_AUTHENTICATION_HEADER'] = 'Authentication-Token'
    app.config['SECURITY_RECOVERABLE']=True
    app.config['SECURITY_RESET_PASSWORD_WITHIN']='2 hours'
    app.config['SECURITY_EMAIL_SENDER']="noreply@placementportal.com"

    # Custom SMTP server settings for smtplib (used in mail.py for local development)
    app.config['SMTP_SERVER_HOST'] = os.environ.get('SMTP_SERVER_HOST', 'localhost')
    app.config['SMTP_SERVER_PORT'] = int(os.environ.get('SMTP_SERVER_PORT', 1025))
    app.config['SMTP_SERVER_PASSWORD'] = os.environ.get('SMTP_SERVER_PASSWORD', 'password')

    # Production Mail settings (example for services like SendGrid/Gmail)
    app.config['MAIL_SERVER'] = 'smtp.google.com'
    app.config['MAIL_PORT'] = 465
    app.config['MAIL_USE_TLS'] = False
    app.config['MAIL_USE_SSL'] = True
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')


    db.init_app(app)
    celery = celery_init_app(app)

    # Caching Configuration
    from application.extensions import cache
    app.config["CACHE_TYPE"] = "RedisCache"
    app.config["CACHE_REDIS_URL"] = "redis://localhost:6379/1"
    app.config["CACHE_DEFAULT_TIMEOUT"] = 300 # 5 minutes
    cache.init_app(app)

    with app.app_context():
        from application.models import User, Role
        from flask_security import SQLAlchemyUserDatastore

        user_datastore=SQLAlchemyUserDatastore(db,User,Role)
        app.user_datastore=user_datastore
        security.init_app(app,user_datastore)

        db.create_all()
        initial_data(user_datastore)
    

    app.config["WTF_CSRF_CHECK_DEFAULT"]=False
    app.config["SECURITY_CSRF_PROTECT_MECHANISMS"]=[]
    app.config['SECURITY_CSRF_IGNORE_UNAUTH_ENDPOINTS']=True

    views.create_view(app,user_datastore)

    #connect flask to modularized blueprints
    api.init_api(app)

    return app

app = create_app()
celery = app.extensions['celery']
celery.autodiscover_tasks()

if __name__=="__main__":
    app.run(debug=True)