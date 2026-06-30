from datetime import datetime

from app.extensions import db


class BookingRequest(db.Model):

    __tablename__ = "booking_request"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    owner_id = db.Column(
        db.Integer,
        nullable=False
    )

    house_id = db.Column(
        db.Integer,
        db.ForeignKey("house.id"),
        nullable=False
    )

    finder_id = db.Column(
        db.Integer
    )

    finder_name = db.Column(
        db.String(120)
    )

    finder_phone = db.Column(
        db.String(40)
    )

    finder_email = db.Column(
        db.String(120)
    )

    message = db.Column(
        db.String(255)
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="new"
    )

    visit_requested = db.Column(
        db.String(255)
    )

    condition_message = db.Column(
        db.String(255)
    )

    vacate_request = db.Column(
        db.String(255)
    )

    rent_overdue_notice = db.Column(
        db.String(255)
    )

    created_at = db.Column(
        db.String(40),
        nullable=False,
        default=lambda: datetime.utcnow().isoformat()
    )
