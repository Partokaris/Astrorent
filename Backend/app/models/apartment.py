import json

from app.extensions import db


class Apartment(db.Model):

    __tablename__ = "apartment"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    owner_id = db.Column(
        db.Integer,
        nullable=False
    )

    name = db.Column(
        db.String(120),
        nullable=False
    )

    location = db.Column(
        db.String(120)
    )

    total_floors = db.Column(
        db.Integer,
        default=0
    )

    notes = db.Column(
        db.String(255)
    )

    unit_mix_json = db.Column(
        db.Text
    )

    def unit_mix(self):
        if not self.unit_mix_json:
            return []

        try:
            return json.loads(self.unit_mix_json)
        except json.JSONDecodeError:
            return []
