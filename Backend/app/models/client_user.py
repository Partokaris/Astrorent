from app.extensions import db


class ClientUser(db.Model):

    __tablename__ = "client_user"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(120),
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    phone = db.Column(
        db.String(40),
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    account_type = db.Column(
        db.String(30),
        nullable=False
    )

    preferred_location = db.Column(
        db.String(120)
    )

    budget = db.Column(
        db.String(80)
    )

    property_location = db.Column(
        db.String(120)
    )

    property_type = db.Column(
        db.String(80)
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active"
    )

    identity_verified = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    profile_picture = db.Column(
        db.String(500)
    )
