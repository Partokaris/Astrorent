from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt
from app.routes import house_bp, auth_bp

import app.models
from sqlalchemy import inspect, text


def ensure_dashboard_columns():

    inspector = inspect(db.engine)

    if inspector.has_table("house"):
        house_columns = {
            column["name"]
            for column in inspector.get_columns("house")
        }

        if "status" not in house_columns:
            db.session.execute(
                text(
                    "ALTER TABLE house "
                    "ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'"
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

    db.session.commit()


def create_app():

    app = Flask(__name__)


    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)

    jwt.init_app(app)

    app.register_blueprint(house_bp)
    app.register_blueprint(auth_bp)

    with app.app_context():
        db.create_all()
        ensure_dashboard_columns()

    return app
