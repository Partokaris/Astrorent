from app.extensions import db


class IncomeRecord(db.Model):

    __tablename__ = "income_record"

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

    customer_name = db.Column(
        db.String(120),
        nullable=False
    )

    customer_phone = db.Column(
        db.String(40)
    )

    amount = db.Column(
        db.Float,
        nullable=False,
        default=0
    )

    paid_for = db.Column(
        db.String(80)
    )

    paid_on = db.Column(
        db.String(40)
    )

    notes = db.Column(
        db.String(255)
    )

    payment_reference = db.Column(
        db.String(120),
        unique=True
    )
