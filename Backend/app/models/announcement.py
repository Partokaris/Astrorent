from datetime import datetime

from app.extensions import db


class Announcement(db.Model):

    __tablename__ = "announcement"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    owner_id = db.Column(
        db.Integer,
        nullable=False
    )

    title = db.Column(
        db.String(120),
        nullable=False
    )

    message = db.Column(
        db.String(500),
        nullable=False
    )

    created_at = db.Column(
        db.String(40),
        nullable=False,
        default=lambda: datetime.utcnow().isoformat()
    )
