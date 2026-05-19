from app.extensions import db


class House(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(100)
    )

    location = db.Column(
        db.String(100)
    )

    price = db.Column(
        db.String(50)
    )

    image = db.Column(
        db.String(500)
    )

    beds = db.Column(
        db.Integer
    )

    baths = db.Column(
        db.Integer
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active"
    )
