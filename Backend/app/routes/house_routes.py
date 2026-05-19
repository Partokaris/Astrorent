from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.house import House


house_bp = Blueprint(
    "house_bp",
    __name__
)


def house_to_dict(house):
    return {
        "id": house.id,
        "title": house.title,
        "location": house.location,
        "price": house.price,
        "image": house.image,
        "beds": house.beds,
        "baths": house.baths,
        "status": house.status
    }


@house_bp.route(
    "/api/houses",
    methods=["GET"]
)
def get_houses():

    houses = House.query.filter_by(
        status="active"
    ).all()

    return jsonify([
        house_to_dict(house)
        for house in houses
    ])


@house_bp.route(
    "/api/admin/houses",
    methods=["GET"]
)
@jwt_required()
def get_admin_houses():

    houses = House.query.order_by(
        House.id.desc()
    ).all()

    return jsonify([
        house_to_dict(house)
        for house in houses
    ])


@house_bp.route(
    "/api/houses",
    methods=["POST"]
)
@jwt_required()
def add_house():

    data = request.json

    new_house = House(
        title=data["title"],
        location=data["location"],
        price=data["price"],
        image=data["image"],
        beds=int(data["beds"]),
        baths=int(data["baths"]),
        status=data.get("status", "active")
    )

    db.session.add(new_house)

    db.session.commit()

    return jsonify({
        "message": "House added successfully",
        "house": house_to_dict(new_house)
    }), 201


@house_bp.route(
    "/api/houses/<int:house_id>",
    methods=["PUT"]
)
@jwt_required()
def update_house(house_id):

    house = House.query.get_or_404(house_id)
    data = request.json

    house.title = data.get("title", house.title)
    house.location = data.get("location", house.location)
    house.price = data.get("price", house.price)
    house.image = data.get("image", house.image)
    house.beds = int(data.get("beds", house.beds))
    house.baths = int(data.get("baths", house.baths))
    house.status = data.get("status", house.status)

    db.session.commit()

    return jsonify({
        "message": "House updated successfully",
        "house": house_to_dict(house)
    })


@house_bp.route(
    "/api/houses/<int:house_id>/status",
    methods=["PATCH"]
)
@jwt_required()
def update_house_status(house_id):

    house = House.query.get_or_404(house_id)
    data = request.json

    if data.get("status") not in ["active", "suspended"]:
        return jsonify({
            "message": "Invalid status"
        }), 400

    house.status = data["status"]

    db.session.commit()

    return jsonify({
        "message": "House status updated successfully",
        "house": house_to_dict(house)
    })


@house_bp.route(
    "/api/houses/<int:house_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_house(house_id):

    house = House.query.get_or_404(house_id)

    db.session.delete(house)
    db.session.commit()

    return jsonify({
        "message": "House deleted successfully"
    })
