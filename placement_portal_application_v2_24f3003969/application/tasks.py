from celery import shared_task #If we want to use this task in other files then we can import it using this decorator
from flask import Flask, render_template, current_app
from .models import StudentProfile, Application, PlacementDrives, User, CompanyProfile, Placement, SupportQuery, Interview, Notification, UserStatusHistory
from api.shared import get_ist_now, get_ist_date
from .extensions import db, cache
from .mail import send_email
from datetime import datetime, timedelta
from sqlalchemy import and_, func
from jinja2 import Template
import csv
from collections import Counter
import os
import uuid, traceback
import requests
import json
# student report is manully triggered by student and admin report is automatically generated at the end of month 
# and sent to admin email and daily reminders are sent to students for upcoming deadlines of drives

def format_report(html_template, data):
    with open(html_template) as file:
        template=Template(file.read())
    return template.render(data=data)


def formatDateTime(date_val, include_time=True):
    if not date_val:
        return 'N/A'
    if isinstance(date_val, str):
        try:
            if date_val.strip().lower() in ['none', '']:
                return 'N/A'
            date_val = datetime.fromisoformat(date_val)
        except ValueError:
            for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d'):
                try:
                    date_val = datetime.strptime(date_val, fmt)
                    break
                except ValueError:
                    continue
            else:
                return date_val
                
    if include_time:
        return date_val.strftime('%d-%b-%Y, %I:%M %p')
    else:
        return date_val.strftime('%d-%b-%Y')


@shared_task(ignore_results=False, name="generate_student_report", bind=True)
def generate_student_report_task(self, student_id):
    """
    A Celery task to generate a student's activity report in the background.
    Now includes full interview histories, remarks, and rejection notes.
    """
    try:
        student = StudentProfile.query.get(student_id)
        if not student:
            self.update_state(state='FAILURE', meta={'exc_type': 'ValueError', 'exc_message': 'Student not found'})
            return {'error': 'Student not found'}

        now = get_ist_now()

        # Fetch applications with eager loading for drives, companies, and interviews
        applications = Application.query.filter(Application.student_id == student.id).options(
            db.joinedload(Application.drive).joinedload(PlacementDrives.company),
            db.joinedload(Application.interviews)
        ).order_by(Application.application_datetime.desc()).all()
        
        interviews_count = sum(len(app.interviews) for app in applications)

        # --- Insights Calculation ---
        status_counts = Counter('Rejected' if app.rejection_reason else app.status for app in applications)
        total_applications = len(applications)
        insights = {
            "Total Applications": total_applications,
            "Interviews Scheduled": interviews_count,
            "Offers Received": status_counts.get('Selected', 0) + status_counts.get('Hired', 0),
            "Application Statuses": f"{dict(status_counts)}"
        }
        
        unique_id = uuid.uuid4().hex[:6]
        file_name = f'student_{student.id}_report_{get_ist_now().strftime("%f")}_{unique_id}.csv'
        
        # Absolute path for Celery worker
        reports_dir = os.path.join(current_app.root_path, 'static', 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        csv_file_path = os.path.join(reports_dir, file_name)
        
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile, delimiter=',')

            # ==========================================
            # 1. HEADER & BASIC INFO
            # ==========================================
            writer.writerow(['STUDENT PLACEMENT REPORT'])
            writer.writerow([]) 
            writer.writerow(['Generated On', formatDateTime(now, include_time=True)])
            writer.writerow(['Student Roll No', student.roll_no])
            writer.writerow(['Student Name', student.name])
            writer.writerow(['Department', student.department])
            writer.writerow(['CGPA', student.cgpa])
            writer.writerow([]) 

            # ==========================================
            # 2. INSIGHTS
            # ==========================================
            writer.writerow(['--- REPORT INSIGHTS ---'])
            for key, value in insights.items():
                writer.writerow([f'{key}', value])
            writer.writerow([]) 
            writer.writerow([]) 

            # ==========================================
            # 3. APPLICATION HISTORY
            # ==========================================
            writer.writerow(['--- APPLICATION HISTORY ---'])
            app_header = [
                'Sr. No.', 'Company Name', 'Drive Job Title', 'Type', 'Applied On', 
                'Current Status', 'Compensation', 'Rejection Reason', 'Note for Student', 'Last Updated'
            ]
            writer.writerow(app_header)

            if not applications:
                writer.writerow(['No applications found.'])
            else:
                for i, app in enumerate(applications, 1):
                    compensation = 'N/A'
                    if app.drive.Salary:
                        if app.drive.Type == 'Job':
                            compensation = f"{app.drive.Salary} LPA"
                        elif app.drive.Type == 'Internship':
                            compensation = f"{app.drive.Salary}/month"

                    # Handle Null values gracefully
                    rejection_reason = app.rejection_reason if app.rejection_reason else 'N/A'
                    rejection_note = app.rejection_revoke_note if app.rejection_revoke_note else 'N/A'

                    row = [
                        i, app.drive.company_name, app.drive.JobTitle, app.drive.Type,
                        formatDateTime(app.application_datetime, include_time=False), 'Rejected' if app.rejection_reason else app.status,
                        compensation, rejection_reason, rejection_note, formatDateTime(app.updated_time, include_time=True)
                    ]
                    writer.writerow(row)
                    
            writer.writerow([])
            writer.writerow([])

            # ==========================================
            # 4. DETAILED INTERVIEW HISTORY
            # ==========================================
            writer.writerow(['--- DETAILED INTERVIEW HISTORY ---'])
            interview_header = [
                'Sr. No.', 'Company Name', 'Job Title', 'Round No.', 'Round Name', 
                'Date & Time', 'Location / Link', 'Status', 'Result', 
                'Internal Remarks', 'Feedback for Student'
            ]
            writer.writerow(interview_header)
            
            interview_rows = []
            int_counter = 1
            
            for app in applications:
                # Sort interviews by date so they appear chronologically for each application
                sorted_interviews = sorted(app.interviews, key=lambda x: x.datetime)
                for interview in sorted_interviews:
                    row = [
                        int_counter,
                        app.drive.company_name,
                        app.drive.JobTitle,
                        interview.round_no,
                        interview.round_name,
                        formatDateTime(interview.datetime, include_time=True),
                        interview.location_or_link or 'N/A',
                        interview.status,
                        interview.result or 'N/A',
                        interview.remarks or 'N/A',
                        interview.student_facing_remarks or 'N/A'
                    ]
                    interview_rows.append(row)
                    int_counter += 1
            
            if not interview_rows:
                writer.writerow(['No interviews scheduled yet.'])
            else:
                writer.writerows(interview_rows)

        # Return the web-accessible path
        file_url = f'/static/reports/{file_name}'
        return {'file_url': file_url, 'insights': insights}

    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise e


@shared_task(bind=True, name="generate_offer_letter")
def generate_offer_letter_task(self, application_id, offer_data):
    try:
        application = Application.query.get(application_id)
        if not application:
            raise ValueError("Application not found")
        if not offer_data:
            raise ValueError("Offer data is required to generate the offer letter")
        student = application.student
        drive = application.drive
        company = drive.company

        # Prepare data for the template
        template_data = {
            "student": student,
            "drive": drive,
            "company": company,
            "joining_date": formatDateTime(offer_data['joining_date'], include_time=False),
            "expiry_date": formatDateTime(offer_data['expiry_date'], include_time=False),
            "message": offer_data.get('message'),
            "generation_date": formatDateTime(get_ist_now(), include_time=False)
        }

        # Render the HTML offer letter
        template_path = os.path.join(current_app.root_path, 'templates', 'offer_letter_template.html')
        with open(template_path) as file:
            template = Template(file.read())
        html_content = template.render(template_data)

        # Save the generated HTML file
        filename = f"offer_{application.id}_{student.roll_no}_{uuid.uuid4().hex[:8]}.html"
        reports_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'offer_letters')
        os.makedirs(reports_dir, exist_ok=True)
        save_path = os.path.join(reports_dir, filename)
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        # Find or create a Placement record
        placement = Placement.query.filter_by(application_id=application.id).first()
        if not placement:
            placement = Placement(
                application_id=application.id,
            )
            db.session.add(placement)

        # Update the placement record with offer details
        web_accessible_path = os.path.join('static/uploads/offer_letters', filename).replace('\\', '/')
        placement.offer_letter = web_accessible_path
        placement.offer_expiry_date = datetime.strptime(offer_data['expiry_date'], '%Y-%m-%d').date()
        placement.joining_date = datetime.strptime(offer_data['joining_date'], '%Y-%m-%d').date()
        placement.message = offer_data.get('message')
        placement.offer_sent = True
        placement.offer_sent_date = get_ist_now()
        placement.offer_status = 'Sent'

        # Create a notification for the student
        from application.models import Notification
        msg = f"Congratulations! You have received an offer letter from '{company.company_name}' for '{drive.JobTitle}'."
        if Notification.should_notify(msg):
            new_notif = Notification(
                user_id=student.user_id,
                message=msg,
                type="success"
            )
            db.session.add(new_notif)

        db.session.commit()

        # Send the selection update & offer letter email with expiry date and attachment
        subject = f"Selected & Offer Letter for '{drive.JobTitle}'"
        expiry_date_str = formatDateTime(offer_data['expiry_date'], include_time=False)
        joining_date_str = formatDateTime(offer_data['joining_date'], include_time=False)
        
        html_message = f"""
        <html>
        <body>
            <p>Hi {student.name} ({student.roll_no}),</p>
            <p>Congratulations! We are pleased to inform you that you have been <strong>Selected</strong> for the <strong>{drive.JobTitle}</strong> position at <strong>{company.company_name}</strong>.</p>
            <p>Your official offer letter has been generated. Please review the details of the offer.</p>
            <p><strong>Key Offer Dates:</strong></p>
            <ul>
                <li><strong>Offer Expiration Date:</strong> {expiry_date_str}</li>
                <li><strong>Proposed Joining Date:</strong> {joining_date_str}</li>
            </ul>
            <p>Please log in to the placement portal to view and respond to the offer: <a href="http://127.0.0.1:5000/login">Login to Portal</a></p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        
        send_email(
            to_address=student.user.email,
            subject=subject,
            message=html_message,
            attachment_file=save_path
        )
        
        cache.clear()

        return {"message": "Offer letter generated and sent successfully.", "file_url": f'/{web_accessible_path}'}

    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise e

@shared_task(name="send_company_approval_email")
def send_company_approval_email_task(company_id):
    """
    Sends an email to a company when their registration is approved.
    """
    try:
        company = CompanyProfile.query.get(company_id)
        if not company or not company.user:
            print(f"Could not find company or user for company_id: {company_id}")
            return "Company or user not found."

        subject = "Your Placement Portal Registration is Approved!"
        
        html_message = f"""
        <html>
        <body>
            <p>Dear {company.company_name},</p>
            <p>We are pleased to inform you that your registration on the Placement Portal has been approved by the administration.</p>
            <p>You can now <a href="http://127.0.0.1:5000/login">login</a> to your dashboard to post placement drives, manage applications, and connect with our talented students.</p>
            <p>We look forward to a successful collaboration.</p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """

        if send_email(company.user.email, subject=subject, message=html_message):
            return f"Approval email sent to {company.user.email}."
        else:
            raise Exception(f"Failed to send approval email to {company.user.email}.")

    except Exception as e:
        print(f"Error in send_company_approval_email_task: {e}")
        raise e

@shared_task(name="send_company_rejection_email")
def send_company_rejection_email_task(company_id):
    try:
        company = CompanyProfile.query.get(company_id)
        if not company or not company.user:
            print(f"Could not find company or user for company_id: {company_id}")
            return "Company or user not found."

        subject = "Your Placement Portal Registration is Rejected"
        html_message = f"""
        <html>
        <body>
            <p>Dear {company.company_name},</p>
            <p>We regret to inform you that your registration on the Placement Portal has been rejected by the administration.</p>
            <p>If you believe this is a mistake or would like to reapply, please contact our support team for further assistance.</p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        if send_email(company.user.email, subject=subject, message=html_message):
            return f"Rejection email sent to {company.user.email}."
        else:
            raise Exception(f"Failed to send rejection email to {company.user.email}.")
    except Exception as e:
        print(f"Error in send_company_rejection_email_task: {e}")
        raise e


@shared_task(name="send_drive_status_update_email")
def send_drive_status_update_email_task(drive_id, status, remark=None):
    """
    Sends an email to the company regarding drive status updates:
    Approved, Rejected, Suspended, or Application Closed.
    """
    try:
        drive = PlacementDrives.query.get(drive_id)
        if not drive or not drive.company or not drive.company.user:
            print(f"Could not find drive, company, or user for drive_id: {drive_id}")
            return "Drive, company, or user not found."

        company = drive.company
        email = company.user.email
        job_title = drive.JobTitle
        company_name = company.company_name

        if status == 'Active':
            subject = f"Your Placement Drive '{job_title}' has been Approved!"
            status_text = "Active"
            body_content = f"<p>This is to inform you that your placement drive for the position of <strong>'{job_title}'</strong> has been reviewed and approved by the administration.</p><p>The drive is now active and visible to eligible students.</p>"
        elif status == 'Rejected':
            subject = f"Your Placement Drive '{job_title}' has been Rejected"
            status_text = "Rejected"
            reason_str = remark or drive.Remark or "No reason provided."
            body_content = f"<p>We regret to inform you that your placement drive for the position of <strong>'{job_title}'</strong> has been reviewed and rejected by the administration.</p><p><strong>Reason for rejection:</strong> <em>{reason_str}</em></p>"
        elif status == 'Suspended':
            subject = f"Your Placement Drive '{job_title}' has been Suspended"
            status_text = "Suspended"
            reason_str = remark or drive.Remark or "No reason provided."
            body_content = f"<p>We wish to inform you that your placement drive for the position of <strong>'{job_title}'</strong> has been temporarily <strong>suspended</strong> by the administration.</p><p><strong>Reason for suspension:</strong> <em>{reason_str}</em></p><p>While suspended, students will not be able to view or apply to this drive, and scheduled interviews have been put on hold.</p>"
        elif status == 'Application Closed':
            subject = f"Your Placement Drive '{job_title}' is now Closed"
            status_text = "Application Closed"
            reason_str = remark or drive.Remark or "No reason provided."
            body_content = f"<p>We wish to inform you that your placement drive for the position of <strong>'{job_title}'</strong> has been <strong>Closed</strong> by the administrator.</p><p><strong>Closing note/reason:</strong> <em>{reason_str}</em></p><p>No new applications will be accepted for this position.</p>"
        else:
            subject = f"Placement Drive '{job_title}' Status Updated"
            status_text = status
            body_content = f"<p>Your placement drive for the position of <strong>'{job_title}'</strong> has been updated to status: <strong>{status}</strong>.</p>"

        html_message = f"""
        <html>
        <body>
            <p>Dear {company_name},</p>
            {body_content}
            <p>You can check the details by logging into your company dashboard: <a href="http://127.0.0.1:5000/login">Login to Portal</a></p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """

        if send_email(email, subject=subject, message=html_message):
            return f"Drive status update email ({status_text}) sent to {email}."
        else:
            raise Exception(f"Failed to send email to {email}.")

    except Exception as e:
        print(f"Error in send_drive_status_update_email_task: {e}")
        raise e

@shared_task(name="send_drive_suspension_emails_to_students")
def send_drive_suspension_emails_to_students_task(drive_id):
    """
    Sends a drive suspension notification email to all students who applied to this drive.
    """
    try:
        drive = PlacementDrives.query.get(drive_id)
        if not drive or not drive.company:
            print(f"Could not find drive or company for drive_id: {drive_id}")
            return "Drive or company not found."

        company_name = drive.company.company_name
        job_title = drive.JobTitle
        
        # Get all applications for this drive
        applications = Application.query.filter_by(DriveID=drive_id).all()
        
        emails_sent = 0
        for app in applications:
            if not app.student or not app.student.user:
                continue
            
            student_email = app.student.user.email
            student_name = app.student.name
            
            subject = f"Temporary Pause: {company_name} Recruitment Drive ({job_title})"
            
            html_message = f"""
            <html>
            <body>
                <p>Dear {student_name},</p>
                <p>The placement cell has temporarily paused processing for the <strong>{company_name}</strong> recruitment drive to update administrative details.</p>
                <p>Your current application remains securely saved in our system, and no further action is required from your end at this moment. We will notify you immediately via email once the drive resumes or if any profile updates are necessary.</p>
                <br>
                <p>Best Regards,</p>
                <p>The Placement Portal Team</p>
            </body>
            </html>
            """
            
            if send_email(student_email, subject=subject, message=html_message):
                emails_sent += 1
                
        return f"Suspension notification emails sent to {emails_sent} students."
    except Exception as e:
        print(f"Error in send_drive_suspension_emails_to_students_task: {e}")
        return str(e)

@shared_task(name="send_application_rejection_revoke_email")
def send_application_rejection_revoke_email(application_id):
    application = Application.query.get(application_id)
    if not application or not application.student or not application.drive:
        print(f"Could not find application or related data for application_id: {application_id}")
        return "Application, student, or drive not found."

    student = application.student
    drive = application.drive
    
    subject = f"Application Rejection Revoked for '{drive.JobTitle}'"
    application_url = "http://127.0.0.1:5000/login"
    html_message = f"""
        <html>
        <body>
            <p>Hi {student.name} ({student.roll_no}),</p>
            <p>We wanted to inform you that the rejection of your application for the <strong>{drive.JobTitle}</strong> position at <strong>{drive.company_name}</strong> has been revoked.</p>
            <p> Reason: {application.rejection_revoke_note if application.rejection_revoke_note else 'No reason provided.'}</p>
            <p>Your application status has been updated accordingly. Please log in to the placement portal to view the details and next steps: <a href="{application_url}">Login</a></p>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
    if send_email(student.user.email, subject=subject, message=html_message):
        return f"Rejection email for application {application_id} sent to {student.user.email}."
    

@shared_task(name="send_application_status_update_email")
def send_application_status_update_email_task(application_id):
    try:
        application = Application.query.get(application_id)
        if not application or not application.student or not application.drive:
            print(f"Could not find application or related data for application_id: {application_id}")
            return "Application, student, or drive not found."

        student = application.student
        drive = application.drive
        
        subject = f"Application Status Update: {drive.JobTitle}"
        application_url = "http://127.0.0.1:5000/login"
        
        display_reason = application.rejection_reason
        if display_reason == "due to bulk rejection on closing the round":
            display_reason = "Position closed"

        html_message = f"""
        <html>
        <body>
            <p>Hi {student.name} ({student.roll_no}),</p>
            <p>Your application status for the position of <strong>{drive.JobTitle}</strong> at <strong>{drive.company_name}</strong> has been updated to <strong>{application.status}</strong>.</p>
            {"<p><strong>Reason / Remarks:</strong> " + display_reason + "</p>" if display_reason else ""}
            <p>Please log in to the placement portal to view your dashboard: <a href="{application_url}">Login</a></p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        if send_email(student.user.email, subject=subject, message=html_message):
            return f"Application status email for application {application_id} sent to {student.user.email}."
        else:
            raise Exception(f"Failed to send application status email to {student.user.email}.")
    except Exception as e:
        print(f"Error in send_application_status_update_email_task: {e}")
        raise e
    

@shared_task(ignore_results=False, name="generate_admin_monthly_report", bind=True)
def generate_admin_monthly_report_task(self):
        
        now = get_ist_now()
        # For end-of-month report, get data for the *previous* month
        first_day_of_current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day_of_previous_month = first_day_of_current_month - timedelta(days=1)
        first_day_of_previous_month = last_day_of_previous_month.replace(day=1)

        start_date = first_day_of_previous_month
        end_date = first_day_of_current_month
        
        new_drives = PlacementDrives.query.filter(
            PlacementDrives.PostedDate >= start_date.date(),
            PlacementDrives.PostedDate < end_date.date()
        ).options(
            db.joinedload(PlacementDrives.company),
            db.joinedload(PlacementDrives.application)
        ).order_by(PlacementDrives.PostedDate.desc()).all()

        drives_with_stats = []
        for drive in new_drives:
            apps = drive.application
            status_counts = Counter('Rejected' if app.rejection_reason else app.status for app in apps)
            drives_with_stats.append({
                'drive': drive,
                'stats': {
                    'applicants': len(apps),
                    'shortlisted': status_counts.get('Shortlisted', 0),
                    'selected': status_counts.get('Selected', 0),
                    'hired': status_counts.get('Hired', 0),
                }
            })

        placements_this_month = Application.query.filter(
            Application.status == 'Hired',
            Application.updated_time >= start_date,
            Application.updated_time < end_date
        ).options(
            db.joinedload(Application.student), 
            db.joinedload(Application.drive).joinedload(PlacementDrives.company)
        ).order_by(Application.updated_time.desc()).all()

        # --- Insights Calculation ---
        placements_by_dept = Counter(app.student.department for app in placements_this_month if app.student)
        top_hirers = Counter(app.drive.company_name for app in placements_this_month if app.drive).most_common(3)

        # Fetch disabled users this month
        disabled_users_this_month = UserStatusHistory.query.filter(
            UserStatusHistory.status == 'disabled',
            UserStatusHistory.timestamp >= start_date,
            UserStatusHistory.timestamp < end_date
        ).options(db.joinedload(UserStatusHistory.user)).all()

        disabled_students = []
        disabled_companies = []
        for history in disabled_users_this_month:
            user = history.user
            if not user:
                continue
            student_profile = StudentProfile.query.filter_by(user_id=user.id).first()
            if student_profile:
                disabled_students.append({
                    'name': student_profile.name,
                    'roll_no': student_profile.roll_no,
                    'email': user.email,
                    'reason': history.note or 'No reason provided',
                    'timestamp': history.timestamp.strftime('%Y-%m-%d %H:%M')
                })
            else:
                company_profile = CompanyProfile.query.filter_by(user_id=user.id).first()
                if company_profile:
                    disabled_companies.append({
                        'company_name': company_profile.company_name,
                        'email': user.email,
                        'reason': history.note or 'No reason provided',
                        'timestamp': history.timestamp.strftime('%Y-%m-%d %H:%M')
                    })

        # Salary & Stipend calculations
        highest_salary = 0.0
        total_salary_sum = 0.0
        job_placements_count = 0
        highest_stipend = 0.0
        total_stipend_sum = 0.0
        intern_placements_count = 0

        for app in placements_this_month:
            if app.drive and app.drive.Salary:
                try:
                    val = float(app.drive.Salary)
                    if app.drive.Type == 'Job':
                        job_placements_count += 1
                        total_salary_sum += val
                        if val > highest_salary:
                            highest_salary = val
                    elif app.drive.Type == 'Internship':
                        intern_placements_count += 1
                        total_stipend_sum += val
                        if val > highest_stipend:
                            highest_stipend = val
                except ValueError:
                    pass

        avg_salary = round(total_salary_sum / job_placements_count, 2) if job_placements_count > 0 else 0.0
        avg_stipend = round(total_stipend_sum / intern_placements_count, 2) if intern_placements_count > 0 else 0.0
        top_roles = Counter(app.drive.JobTitle for app in placements_this_month if app.drive).most_common(3)

        # Generate HTML Report
        report_month_str = start_date.strftime('%B %Y')
        template_path = os.path.join(current_app.root_path, 'templates', 'monthly_admin_report.html')
        data_for_template = {
            'report_month': report_month_str,
            'generated_at': get_ist_now().strftime('%Y-%m-%d %H:%M'),
            'new_drives_with_stats': drives_with_stats,
            'placements': placements_this_month,
            'placements_by_dept': dict(placements_by_dept),
            'top_hirers': top_hirers,
            'disabled_students': disabled_students,
            'disabled_companies': disabled_companies,
            'highest_salary': highest_salary,
            'avg_salary': avg_salary,
            'job_placements_count': job_placements_count,
            'highest_stipend': highest_stipend,
            'avg_stipend': avg_stipend,
            'intern_placements_count': intern_placements_count,
            'top_roles': top_roles
        }
        html_content = format_report(template_path, data_for_template)

        # --- Save the report locally ---
        unique_id = uuid.uuid4().hex[:8]
        filename = f"admin_monthly_report_{start_date.strftime('%Y_%m')}_{unique_id}.html"
        reports_dir = os.path.join(current_app.root_path, 'static', 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        save_path = os.path.join(reports_dir, filename)
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        web_accessible_path = f"/static/reports/{filename}"

        # --- Attempt to send email ---
        admin_user = User.query.filter(User.roles.any(name='admin')).first()
        if not admin_user:
            return {"message": "Monthly report generated. No admin email configured to send to.", "file_url": web_accessible_path}

        print(f"Attempting to email monthly report to {admin_user.email}")
        send_email(admin_user.email, subject=f'Monthly Placement Report for {report_month_str}', message=html_content)
        return  {"message": "Monthly report generated and emailed to admin successfully.", "file_url": web_accessible_path}
        
        
@shared_task(name="cleanup_old_files")
def cleanup_old_files_task():
    """
    Deletes old report files from the static/reports directory created more than 7 days ago.
    """
    try:
        reports_dir = os.path.join(current_app.root_path, 'static', 'reports')
        if not os.path.exists(reports_dir):
            print("Reports directory not found. Skipping cleanup.")
            return "Reports directory not found."

        cutoff = get_ist_now() - timedelta(days=7)
        files_deleted = 0
        
        for filename in os.listdir(reports_dir):
            file_path = os.path.join(reports_dir, filename)
            
            if os.path.isfile(file_path):
                try:
                    file_mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if file_mod_time < cutoff:
                        os.remove(file_path)
                        files_deleted += 1
                        print(f"Deleted old report: {file_path}")
                except (FileNotFoundError, PermissionError) as e:
                    print(f"Could not delete {file_path}: {e}")
                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")

        return f"Cleanup complete. Deleted {files_deleted} old files."
    except Exception as e:
        print(f"An error occurred during the file cleanup task: {e}")
        raise e


@shared_task(ignore_results=False, name="generate_daily_reminder", bind=True)
def generate_daily_reminders_task(self):
    
        tomorrow = get_ist_date() + timedelta(days=1)
        next_day = tomorrow + timedelta(days=1)
        
        # Find drives with deadlines of tomorrow or the day after
        drives_with_upcoming_deadlines = PlacementDrives.query.filter(
            func.date(PlacementDrives.ApplyDeadline).in_([str(tomorrow), str(next_day)]),
            PlacementDrives.Status == 'Active'
        ).all()

        reminders_sent = 0
        for drive in drives_with_upcoming_deadlines:
            # Determine how much time is left
            deadline_date = drive.ApplyDeadline.date() if hasattr(drive.ApplyDeadline, 'date') else drive.ApplyDeadline
            
            if deadline_date == tomorrow:
                time_left_message = "tomorrow"
            elif deadline_date == next_day:
                time_left_message = "in less than 48 hours"
            else:
                time_left_message = "soon"

            deadline_formatted = formatDateTime(drive.ApplyDeadline, include_time=False)
            departments_str = ", ".join(drive.Departments) if drive.Departments else "All Departments"
            skills_str = ", ".join(drive.RequiredSkills) if drive.RequiredSkills else "None specified"
            min_cgpa_str = f"{drive.min_cgpa:.2f}" if drive.min_cgpa else "No minimum"

            # Construct general broadcast message for the drive
            message = (
                f"📢 *Upcoming Placement Drive Deadline Reminder!*\n\n"
                f"*Position:* {drive.JobTitle}\n"
                f"*Company:* {drive.company_name}\n"
                f"*Type:* {drive.Type} ({drive.WorkMode})\n"
                f"*Deadline:* {time_left_message.capitalize()} ({deadline_formatted})\n\n"
                f"*Eligibility Criteria:*\n"
                f"- *Departments:* {departments_str}\n"
                f"- *Minimum CGPA:* {min_cgpa_str}\n"
                f"- *Required Skills:* {skills_str}\n\n"
                f"👉 Eligible students, please login to the portal and submit your application: http://127.0.0.1:5000"
            )

            response = requests.post(
                "https://chat.googleapis.com/v1/spaces/AAQABXcCK60/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=zGpFHYlxNFsazf1EZKWz-0mWFMJrPHFK1ZWk9_4t_Fw",
                headers={"Content-Type": "application/json"},
                json={"text": message}
            )
            if response.ok:
                reminders_sent += 1
                
        return {'status': 'SUCCESS', 'message': f'Sent {reminders_sent} general reminders for {len(drives_with_upcoming_deadlines)} drives.'}

@shared_task(name="close_specific_drive")
def close_specific_drive_task(drive_id):
    drive = PlacementDrives.query.get(drive_id)
    if drive and drive.Status == 'Active':
        drive.Status = 'Application Closed'
        
        from application.tasks import send_drive_status_update_email_task
        send_drive_status_update_email_task.delay(drive.DriveID, 'Application Closed', 'Application deadline reached.')
        
        msg = f"Your placement drive '{drive.JobTitle}' has been closed because the application deadline was reached."
        if Notification.should_notify(msg):
            new_notif = Notification(
                user_id=drive.company.user_id,
                message=msg,
                type="warning"
            )
            db.session.add(new_notif)
            
        db.session.commit()
        cache.clear()
        return f"Drive ID {drive_id} has been marked as Application Closed."
    else:
        return f"Drive ID {drive_id} not found or not active."
        
@shared_task(name="sweep_expired_drives")
def sweep_expired_drives_task():
    from zoneinfo import ZoneInfo
    today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
    
    # Find all drives that are still marked Active or Pending but have passed their deadline
    expired_drives = PlacementDrives.query.filter(
        PlacementDrives.Status.in_(['Active', 'Pending']),
        PlacementDrives.ApplyDeadline != None,
        PlacementDrives.ApplyDeadline < today
    ).all()
    
    if not expired_drives:
        return "No expired drives to close."
        
    count = 0
    from application.tasks import send_drive_status_update_email_task
    for drive in expired_drives:
        orig_status = drive.Status
        drive.Status = 'Application Closed'
        count += 1
        
        remark = 'Application deadline reached.' if orig_status == 'Active' else 'Application deadline passed before approval.'
        send_drive_status_update_email_task.delay(drive.DriveID, 'Application Closed', remark)
        
        msg = f"Your placement drive '{drive.JobTitle}' has been closed because the application deadline was reached."
        if Notification.should_notify(msg):
            new_notif = Notification(
                user_id=drive.company.user_id,
                message=msg,
                type="warning"
            )
            db.session.add(new_notif)
        
    db.session.commit()
    cache.clear()
    
    return f"Successfully swept and set {count} expired drives to Application Closed."
        
@shared_task(name="send_support_query_response_email")
def send_support_query_response_email_task(query_id):   
    try:
        query = SupportQuery.query.get(query_id)
        user_name="User"
        if not query or not query.user:
            print(f"Could not find support query or user for query_id: {query_id}")
            return "Support query or user not found."
        if query.user.roles in ['stud']:
            st=StudentProfile.query.filter(StudentProfile.user_id==query.user_id).first()
            user_name=st.name if st else "User"
        elif query.user.roles in ['comp']:
            cp=CompanyProfile.query.filter(CompanyProfile.user_id==query.user_id).first()
            user_name=cp.company_name if cp else "User"
        subject = f"Response to Your Support Query (dated: {formatDateTime(query.created_at, include_time=False)})"
        html_message = f"""
        <html>
        <body>
            <p>Hi {user_name},</p>
            <p>Your support query submitted on {formatDateTime(query.created_at, include_time=True)} has been responded to by our support team.</p>
            <p><strong>Query:</strong> {query.message}</p>
            <p><strong>Status:</strong> {query.status}</p>
            <p><strong>Response:</strong> {query.response}</p>
            <br>
            <p>If you have any further questions or need additional assistance, please don't hesitate to reach out to us again.</p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Support Team</p>
        </body>
        </html>
        """
        if send_email(query.user.email, subject=subject, message=html_message):
            return f"Support query response email sent to {query.user.email}."
        else:
            raise Exception(f"Failed to send support query response email to {query.user.email}.")
    except Exception as e:
        print(f"Error in send_support_query_response_email_task: {e}")
        raise e

@shared_task(name="send_interview_update_email")
def send_interview_update_email_task(interview_id, action, reason, role):
    """
    Sends an email notification when an interview is cancelled or rescheduled.
    - If admin cancels (role == 'admin'): sends email to both student and company.
    - If company cancels or reschedules (role == 'company'): sends email to student only.
    """
    try:
        interview = Interview.query.get(interview_id)
        if not interview:
            print(f"Could not find interview for interview_id: {interview_id}")
            return "Interview not found."
            
        application = interview.application
        if not application or not application.student or not application.drive:
            print(f"Could not find application/student/drive for interview: {interview_id}")
            return "Related application data not found."
            
        student = application.student
        drive = application.drive
        company = drive.company
        
        student_email = student.user.email if student.user else None
        company_email = company.user.email if company.user else None
        
        job_title = drive.JobTitle
        company_name = company.company_name
        student_name = student.name
        roll_no = student.roll_no
        
        if role == 'admin':
            # Admin can only cancel. Send cancellation email to both student and company.
            if action == 'cancel':
                # Email to Student
                if student_email:
                    subject_student = f"Cancelled: Interview for '{job_title}' at {company_name}"
                    html_student = f"""
                    <html>
                    <body>
                        <p>Hi {student_name} ({roll_no}),</p>
                        <p>We regret to inform you that your interview (Round {interview.round_no}: {interview.round_name}) for the position of <strong>{job_title}</strong> at <strong>{company_name}</strong> has been cancelled by the system Administrator.</p>
                        <p><strong>Reason for Cancellation:</strong> {reason}</p>
                        <p>Please log in to the placement portal to view your application status: <a href="http://127.0.0.1:5000/login">Login</a></p>
                        <br>
                        <p>Best Regards,</p>
                        <p>The Placement Portal Team</p>
                    </body>
                    </html>
                    """
                    send_email(student_email, subject=subject_student, message=html_student)
                
                # Email to Company
                if company_email:
                    subject_company = f"Cancelled: Interview with {student_name} for '{job_title}'"
                    html_company = f"""
                    <html>
                    <body>
                        <p>Dear {company_name},</p>
                        <p>We wish to inform you that the scheduled interview for student <strong>{student_name}</strong> (Roll No: {roll_no}) for the position of <strong>{job_title}</strong> has been cancelled by the system Administrator.</p>
                        <p><strong>Reason for Cancellation:</strong> {reason}</p>
                        <p>Please log in to the placement portal to view the details: <a href="http://127.0.0.1:5000/login">Login</a></p>
                        <br>
                        <p>Best Regards,</p>
                        <p>The Placement Portal Team</p>
                    </body>
                    </html>
                    """
                    send_email(company_email, subject=subject_company, message=html_company)
                return "Admin cancellation emails sent."
        
        elif role == 'company':
            # Company cancels or reschedules. Send email to student only.
            if action == 'cancel':
                if student_email:
                    subject = f"Cancelled: Interview for '{job_title}' at {company_name}"
                    html_message = f"""
                    <html>
                    <body>
                        <p>Hi {student_name} ({roll_no}),</p>
                        <p>We regret to inform you that your interview (Round {interview.round_no}: {interview.round_name}) for the position of <strong>{job_title}</strong> at <strong>{company_name}</strong> has been cancelled by the company.</p>
                        <p><strong>Reason for Cancellation:</strong> {reason}</p>
                        <p>Please log in to the placement portal to check for other matches or updates: <a href="http://127.0.0.1:5000/login">Login</a></p>
                        <br>
                        <p>Best Regards,</p>
                        <p>The Placement Portal Team</p>
                    </body>
                    </html>
                    """
                    send_email(student_email, subject=subject, message=html_message)
                return "Company cancellation email sent to student."
                
            elif action == 'reschedule':
                if student_email:
                    new_datetime_str = formatDateTime(interview.datetime, include_time=True)
                    subject = f"Rescheduled: Interview for '{job_title}' at {company_name}"
                    html_message = f"""
                    <html>
                    <body>
                        <p>Hi {student_name} ({roll_no}),</p>
                        <p>Your interview (Round {interview.round_no}: {interview.round_name}) for the position of <strong>{job_title}</strong> at <strong>{company_name}</strong> has been rescheduled by the company.</p>
                        <p><strong>New Interview Date & Time:</strong> {new_datetime_str}</p>
                        <p><strong>Reason for Rescheduling:</strong> {reason}</p>
                        <p>Please log in to the placement portal to view the details: <a href="http://127.0.0.1:5000/login">Login</a></p>
                        <br>
                        <p>Best Regards,</p>
                        <p>The Placement Portal Team</p>
                    </body>
                    </html>
                    """
                    send_email(student_email, subject=subject, message=html_message)
                return "Company rescheduling email sent to student."

            elif action == 'schedule':
                if student_email:
                    datetime_str = formatDateTime(interview.datetime, include_time=True)
                    subject = f"Scheduled: Interview for '{job_title}' at {company_name}"
                    html_message = f"""
                    <html>
                    <body>
                        <p>Hi {student_name} ({roll_no}),</p>
                        <p>A new interview (Round {interview.round_no}: {interview.round_name}) for the position of <strong>{job_title}</strong> at <strong>{company_name}</strong> has been scheduled.</p>
                        <p><strong>Interview Date & Time:</strong> {datetime_str}</p>
                        <p>Please log in to the placement portal to view the details and next steps: <a href="http://127.0.0.1:5000/login">Login</a></p>
                        <br>
                        <p>Best Regards,</p>
                        <p>The Placement Portal Team</p>
                    </body>
                    </html>
                    """
                    send_email(student_email, subject=subject, message=html_message)
                return "Company scheduling email sent to student."
                
        return "No action taken."
    except Exception as e:
        print(f"Error in send_interview_update_email_task: {e}")
        traceback.print_exc()
        raise e

@shared_task(name="send_offer_extension_email")
def send_offer_extension_email_task(application_id, new_expiry_date_str):
    try:
        application = Application.query.get(application_id)
        if not application or not application.student:
            print(f"Could not find application or student for ID: {application_id}")
            return "Application or student not found."
            
        student = application.student
        drive = application.drive
        company = drive.company
        
        student_email = student.user.email if student.user else None
        if not student_email:
            print("Student has no email address.")
            return "Student email not found."
            
        formatted_date = formatDateTime(new_expiry_date_str, include_time=False)
        subject = f"Deadline Extended: Placement Offer from {company.company_name}"
        html_message = f"""
        <html>
        <body>
            <p>Hi {student.name} ({student.roll_no}),</p>
            <p>We are pleased to inform you that <strong>{company.company_name}</strong> has extended the deadline to respond to your placement offer for the position of <strong>{drive.JobTitle}</strong>.</p>
            <p><strong>New Offer Expiry Date:</strong> {formatted_date}</p>
            <p>Please log in to the placement portal to review the offer and submit your response: <a href="http://127.0.0.1:5000/login">Login</a></p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        
        if send_email(student_email, subject=subject, message=html_message):
            return f"Offer extension email sent to {student_email}."
        else:
            raise Exception("Failed to send offer extension email.")
    except Exception as e:
        print(f"Error in send_offer_extension_email_task: {e}")
        traceback.print_exc()
        raise e
    

@shared_task(name="cleanup_old_notifications")
def cleanup_old_notifications_task():
    """
    Deletes all read and unread notifications that are older than 30 days 
    to prevent database bloat.
    """
    try:
        # Define the cutoff date (30 days ago)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        deleted_count = db.session.query(Notification).filter(
            Notification.created_at < cutoff_date
        ).delete()
        
        db.session.commit()
            
        return f"Notification sweep complete. Deleted {deleted_count} old notifications."
        
    except Exception as e:
        print(f"Error during notification cleanup: {e}")
        db.session.rollback()
        raise e



@shared_task(name="send_student_reactivation_email")
def send_student_reactivation_email_task(user_id, note=None):
    try:
        user = User.query.get(user_id)
        if not user or not user.email:
            print(f"Could not find user or email for user_id: {user_id}")
            return "User or email not found."
        
        subject = "Account Reactivated - University Placement Portal"
        note_section = ""
        if note:
            note_section = f"""
            <p><strong>Reactivation Note:</strong></p>
            <blockquote style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 10px; margin: 10px 0;">
                {note}
            </blockquote>
            """
        html_message = f"""
        <html>
        <body>
            <p>Hi,</p>
            <p>We are pleased to inform you that your placement account has been <strong>reactivated</strong> by the administrator.</p>
            {note_section}
            <p>Your access has been fully restored. You can now log in, review your applications, and participate in placement drives.</p>
            <p>Click here to log in: <a href="http://127.0.0.1:5000/login">Placement Portal Login</a></p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        if send_email(user.email, subject=subject, message=html_message):
            return f"Reactivation email sent to {user.email}."
        else:
            raise Exception(f"Failed to send email to {user.email}")
    except Exception as e:
        print(f"Error in send_student_reactivation_email_task: {e}")
        traceback.print_exc()
        raise e


@shared_task(name="send_student_disabled_email")
def send_student_disabled_email_task(user_id, note):
    try:
        user = User.query.get(user_id)
        if not user or not user.email:
            print(f"Could not find user or email for user_id: {user_id}")
            return "User or email not found."
        
        student = StudentProfile.query.filter_by(user_id=user.id).first()
        student_name = student.name if student else "Student"
        
        subject = "Account Disabled - University Placement Portal"
        html_message = f"""
        <html>
        <body>
            <p>Dear {student_name},</p>
            <p>We regret to inform you that your student placement account has been <strong>disabled</strong> by the administrator.</p>
            <p><strong>Reason for disablement (Disable Note):</strong></p>
            <blockquote style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0;">
                {note if note else 'No reason provided.'}
            </blockquote>
            <p>While your account is disabled, you will not be able to access the placement portal or participate in any placement drives. Any current applications and scheduled interviews have been suspended.</p>
            <p>If you have any questions or wish to appeal this decision, please contact the Placement Cell.</p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        if send_email(user.email, subject=subject, message=html_message):
            return f"Disable email sent to student {user.email}."
        else:
            raise Exception(f"Failed to send disable email to student {user.email}")
    except Exception as e:
        print(f"Error in send_student_disabled_email_task: {e}")
        traceback.print_exc()
        raise e


@shared_task(name="send_company_disabled_email")
def send_company_disabled_email_task(company_id, note):
    try:
        company = CompanyProfile.query.get(company_id)
        if not company or not company.user or not company.user.email:
            print(f"Could not find company or email for company_id: {company_id}")
            return "Company or email not found."
        
        subject = "Company Account Disabled - Placement Portal"
        html_message = f"""
        <html>
        <body>
            <p>Dear {company.company_name},</p>
            <p>We regret to inform you that your company account on the Placement Portal has been <strong>disabled</strong> by the administrator.</p>
            <p><strong>Reason for disablement (Disable Note):</strong></p>
            <blockquote style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0;">
                {note if note else 'No reason provided.'}
            </blockquote>
            <p>Consequently, your access to the company dashboard has been revoked, and your active placement drives and scheduled interviews have been suspended.</p>
            <p>If you believe this is an error or would like to discuss this further, please contact the placement administration team.</p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        if send_email(company.user.email, subject=subject, message=html_message):
            return f"Disable email sent to company {company.user.email}."
        else:
            raise Exception(f"Failed to send disable email to company {company.user.email}")
    except Exception as e:
        print(f"Error in send_company_disabled_email_task: {e}")
        traceback.print_exc()
        raise e

@shared_task(name="send_company_reactivated_email")
def send_company_reactivated_email_task(company_id, note):
    try:
        company = CompanyProfile.query.get(company_id)
        if not company or not company.user or not company.user.email:
            print(f"Could not find company or email for company_id: {company_id}")
            return "Company or email not found."
        
        subject = "Company Account Reactivated - Placement Portal"
        html_message = f"""
        <html>
        <body>
            <p>Dear {company.company_name},</p>
            <p>We are pleased to inform you that your company account on the Placement Portal has been <strong>reactivated</strong> by the administrator.</p>
            <p><strong>Reactivation Note:</strong></p>
            <blockquote style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 10px; margin: 10px 0;">
                {note if note else 'Your account has been enabled.'}
            </blockquote>
            <p>You can now log in to your dashboard and manage your placement drives as usual.</p>
            <p>You can access the portal here: <a href="http://127.0.0.1:5000/login">Login to Portal</a></p>
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        if send_email(company.user.email, subject=subject, message=html_message):
            return f"Reactivation email sent to company {company.user.email}."
        else:
            raise Exception(f"Failed to send reactivation email to company {company.user.email}")
    except Exception as e:
        print(f"Error in send_company_reactivated_email_task: {e}")
        traceback.print_exc()
        raise e

@shared_task(name="send_offer_response_email")
def send_offer_response_email_task(application_id, response_type):
    try:
        app = Application.query.get(application_id)
        if not app or not app.drive or not app.drive.company or not app.drive.company.user or not app.drive.company.user.email:
            print(f"Could not find application or company email for application_id: {application_id}")
            return "Application or company email not found."
        
        company_email = app.drive.company.user.email
        student_name = app.student.name
        job_title = app.drive.JobTitle
        company_name = app.drive.company.company_name
        
        subject = f"Offer {response_type.capitalize()}: {student_name} - {job_title}"
        
        if response_type == 'accepted':
            message_body = f"""
            <p>Dear {company_name},</p>
            <p>We are excited to inform you that candidate <strong>{student_name}</strong> has officially <strong>ACCEPTED</strong> your placement offer for the position of <strong>{job_title}</strong>.</p>
            <p>You can now view this candidate under the 'Hired Board' tab on your applications dashboard to proceed with onboarding steps.</p>
            """
        else: # declined
            message_body = f"""
            <p>Dear {company_name},</p>
            <p>We wish to inform you that candidate <strong>{student_name}</strong> has officially <strong>DECLINED</strong> your placement offer for the position of <strong>{job_title}</strong>.</p>
            <p>Their application status has been updated to 'Rejected' (Reason: Offer rejected by student) and they are no longer active in this drive's pipeline. You may proceed to review other candidates.</p>
            """
            
        html_message = f"""
        <html>
        <body>
            {message_body}
            <br>
            <p>Best Regards,</p>
            <p>The Placement Portal Team</p>
        </body>
        </html>
        """
        
        if send_email(company_email, subject=subject, message=html_message):
            return f"Offer response email ({response_type}) sent to company {company_email}."
        else:
            raise Exception(f"Failed to send email to company {company_email}")
    except Exception as e:
        print(f"Error in send_offer_response_email_task: {e}")
        traceback.print_exc()
        raise e
    