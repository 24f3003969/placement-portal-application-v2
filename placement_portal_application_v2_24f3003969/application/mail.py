import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

SMTP_SERVER_HOST = "localhost"
SMTP_SERVER_PORT = 2525
SENDER_ADDRESS = "noreply@placementportal.com"
SENDER_PASSWORD = "" # Keep empty for local testing

def send_email(to_address, subject, message, content="html", attachment_file=None):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_ADDRESS
        msg['To'] = to_address
        msg['Subject'] = subject

        if content == "html":
            msg.attach(MIMEText(message, 'html'))
        else:
            msg.attach(MIMEText(message, 'plain'))

        if attachment_file:
            import os
            with open(attachment_file, 'rb') as file:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(file.read())
                
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename={os.path.basename(attachment_file)}')
            msg.attach(part)

        s = smtplib.SMTP(host=SMTP_SERVER_HOST, port=SMTP_SERVER_PORT, timeout=10)
        
        # THE FIX: Only login if we are NOT using local Port 1025
        if SMTP_SERVER_PORT != 2525 and SENDER_PASSWORD:
            s.login(SENDER_ADDRESS, SENDER_PASSWORD)
            
        s.send_message(msg)
        s.quit()

        print(f"Email sent successfully to {to_address}")
        return True
        
    except Exception as e:
        print(f"CRITICAL EMAIL ERROR: {e}") 
        return False