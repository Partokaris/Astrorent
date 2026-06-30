from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt
from app.routes import house_bp, auth_bp, user_bp

import app.models
from sqlalchemy import inspect, text


def ensure_dashboard_columns():

    inspector = inspect(db.engine)

    if inspector.has_table("house"):
        house_columns = {
            column["name"]
            for column in inspector.get_columns("house")
        }

        missing_house_columns = {
            "owner_id": "INTEGER",
            "apartment_id": "INTEGER",
            "images_json": "LONGTEXT",
            "status": "VARCHAR(20) NOT NULL DEFAULT 'active'",
            "latitude": "VARCHAR(80)",
            "longitude": "VARCHAR(80)",
            "occupied_until": "VARCHAR(40)",
            "customer_name": "VARCHAR(120)",
            "customer_phone": "VARCHAR(40)",
            "customer_email": "VARCHAR(120)",
            "customer_payment_status": "VARCHAR(80)",
            "customer_move_in_date": "VARCHAR(40)",
            "vacate_request": "VARCHAR(255)",
            "condition_report": "VARCHAR(255)",
            "apartment_name": "VARCHAR(120)",
            "total_floors": "INTEGER",
            "total_houses": "INTEGER",
            "floor_number": "VARCHAR(40)",
            "unit_number": "VARCHAR(40)",
            "house_category": "VARCHAR(80)",
            "monthly_income": "FLOAT NOT NULL DEFAULT 0"
        }

        for column_name, column_definition in missing_house_columns.items():
            if column_name not in house_columns:
                db.session.execute(
                    text(
                        f"ALTER TABLE house "
                        f"ADD COLUMN {column_name} {column_definition}"
                    )
                )

    if inspector.has_table("booking_request"):
        booking_columns = {
            column["name"]
            for column in inspector.get_columns("booking_request")
        }

        missing_booking_columns = {
            "visit_requested": "VARCHAR(255)",
            "condition_message": "VARCHAR(255)",
            "vacate_request": "VARCHAR(255)",
            "rent_overdue_notice": "VARCHAR(255)"
        }

        for column_name, column_definition in missing_booking_columns.items():
            if column_name not in booking_columns:
                db.session.execute(
                    text(
                        f"ALTER TABLE booking_request "
                        f"ADD COLUMN {column_name} {column_definition}"
                    )
                )

    if inspector.has_table("admin"):
        admin_columns = {
            column["name"]
            for column in inspector.get_columns("admin")
        }

        missing_admin_columns = {
            "name": "VARCHAR(120) NOT NULL DEFAULT 'Admin'",
            "role": "VARCHAR(50) NOT NULL DEFAULT 'admin'",
            "status": "VARCHAR(20) NOT NULL DEFAULT 'active'"
        }

        for column_name, column_definition in missing_admin_columns.items():
            if column_name not in admin_columns:
                db.session.execute(
                    text(
                        f"ALTER TABLE admin "
                        f"ADD COLUMN {column_name} {column_definition}"
                    )
                )

    if inspector.has_table("client_user"):
        client_user_columns = {
            column["name"]
            for column in inspector.get_columns("client_user")
        }

        missing_client_user_columns = {
            "status": "VARCHAR(20) NOT NULL DEFAULT 'active'",
            "identity_verified": "BOOLEAN NOT NULL DEFAULT 0"
        }

        for column_name, column_definition in missing_client_user_columns.items():
            if column_name not in client_user_columns:
                db.session.execute(
                    text(
                        f"ALTER TABLE client_user "
                        f"ADD COLUMN {column_name} {column_definition}"
                    )
                )

    if inspector.has_table("income_record"):
        income_columns = {
            column["name"]
            for column in inspector.get_columns("income_record")
        }

        if "payment_reference" not in income_columns:
            db.session.execute(
                text(
                    "ALTER TABLE income_record "
                    "ADD COLUMN payment_reference VARCHAR(120)"
                )
            )

    db.session.commit()


def create_app():

    app = Flask(__name__)


    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)

    jwt.init_app(app)

    app.register_blueprint(house_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)

    with app.app_context():
        db.create_all()
        ensure_dashboard_columns()

    return app
