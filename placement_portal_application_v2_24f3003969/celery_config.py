from celery.schedules import crontab

broker_url='redis://localhost:6379/0'
result_backend='redis://localhost:6379/1'
timezone='Asia/Kolkata'
broker_connection_retry_on_startup = True

beat_schedule = {
    'generate-and-send-admin-monthly-report': {
        'task': 'generate_admin_monthly_report',
        'schedule': crontab(hour=0, minute=5, day_of_month='1'), # Every month on the 1st day at 12:05 AM
    },
    'sweep-expired-drives': {
        'task': 'sweep_expired_drives',
        'schedule': crontab(hour=0, minute=0),  # Every day at 12:00 AM
        #'schedule': crontab(minute='*'),
    },
    'send-daily-deadline-reminders': {
        'task': 'generate_daily_reminder',
        'schedule': crontab(hour=8, minute=0),  # Every day at 8:00 AM
        #'schedule': crontab(minute='*'),
    },
    'cleanup-old-files': {
        'task': 'cleanup_old_files',
        'schedule': crontab(hour=2, minute=0),  # Every month on the 1st day at 2:00 AM
    },
    'cleanup-old-notifications': {
        'task': 'cleanup_old_notifications',
        'schedule': crontab(hour=0, minute=0),  # Every day at 12:00 AM
    }
}