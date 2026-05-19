from app.extensions import db


class Admin(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(120),
        nullable=False,
        default="Admin"
    )

    role = db.Column(
        db.String(50),
        nullable=False,
        default="admin"
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active"
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )
