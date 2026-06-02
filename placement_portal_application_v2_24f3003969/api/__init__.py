from flask import Flask

def init_api(app: Flask):
    from .common import common_bp
    from .student import student_bp
    from .company import company_bp
    from .admin import admin_bp

    app.register_blueprint(common_bp, url_prefix='/api')
    app.register_blueprint(student_bp, url_prefix='/api')
    app.register_blueprint(company_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
