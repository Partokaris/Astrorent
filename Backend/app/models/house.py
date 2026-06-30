from app.extensions import db


class House(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    owner_id = db.Column(
        db.Integer
    )

    apartment_id = db.Column(
        db.Integer,
        db.ForeignKey("apartment.id")
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

    images_json = db.Column(
        db.Text(
            length=4294967295
        )
    )

    beds = db.Column(
        db.Integer
    )

    baths = db.Column(
        db.Integer
    )

    apartment_name = db.Column(
        db.String(120)
    )

    total_floors = db.Column(
        db.Integer
    )

    total_houses = db.Column(
        db.Integer
    )

    floor_number = db.Column(
        db.String(40)
    )

    unit_number = db.Column(
        db.String(40)
    )

    house_category = db.Column(
        db.String(80)
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active"
    )

    latitude = db.Column(
        db.String(80)
    )

    longitude = db.Column(
        db.String(80)
    )

    occupied_until = db.Column(
        db.String(40)
    )

    customer_name = db.Column(
        db.String(120)
    )

    customer_phone = db.Column(
        db.String(40)
    )

    customer_email = db.Column(
        db.String(120)
    )

    customer_payment_status = db.Column(
        db.String(80)
    )

    customer_move_in_date = db.Column(
        db.String(40)
    )

    vacate_request = db.Column(
        db.String(255)
    )

    condition_report = db.Column(
        db.String(255)
    )

    monthly_income = db.Column(
        db.Float,
        nullable=False,
        default=0
    )
