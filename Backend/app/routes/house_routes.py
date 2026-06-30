import json

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.house import House
from app.models.apartment import Apartment
from app.models.income_record import IncomeRecord
from app.models.client_user import ClientUser
from app.models.booking_request import BookingRequest
from app.models.announcement import Announcement
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory


house_bp = Blueprint(
    "house_bp",
    __name__
)

# Ensure uploads directory exists
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
UPLOAD_DIR = os.path.join(ROOT_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


@house_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    # Serve uploaded files (development only)
    return send_from_directory(UPLOAD_DIR, filename)


@house_bp.route('/api/uploads', methods=['POST'])
@jwt_required()
def upload_files():
    # Only allow authenticated owners (or admins) to upload files.
    # Owner identity format is expected to be 'owner:<id>' (see current_owner_id()).
    identity = get_jwt_identity() or ""
    owner_id = None
    if isinstance(identity, str) and identity.startswith("owner:"):
        try:
            owner_id = int(identity.split(":", 1)[1])
        except Exception:
            owner_id = None

    # Reject overly large total payloads early
    if request.content_length and request.content_length > current_app.config.get('MAX_CONTENT_LENGTH', 0):
        return jsonify({"message": "Payload too large"}), 413

    files = request.files.getlist('files')
    saved_urls = []

    # Save files into an owner-specific subdirectory when owner_id is present
    target_dir = UPLOAD_DIR
    prefix = ""
    if owner_id:
        prefix = f"owner_{owner_id}"
        target_dir = os.path.join(UPLOAD_DIR, prefix)
        os.makedirs(target_dir, exist_ok=True)

    for f in files:
        if not f or f.filename == '':
            continue
        filename = secure_filename(f.filename)
        # avoid overwriting
        dest_path = os.path.join(target_dir, filename)
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(dest_path):
            filename = f"{base}-{counter}{ext}"
            dest_path = os.path.join(target_dir, filename)
            counter += 1
        f.save(dest_path)
        # Construct a URL for returned path (include owner prefix if present)
        rel_path = f"{prefix}/{filename}" if prefix else filename
        url = request.host_url.rstrip('/') + f"/uploads/{rel_path}"
        saved_urls.append(url)

    return jsonify({"urls": saved_urls})


def house_to_dict(house, include_owner_contact=False, include_private_details=False):
    owner = None

    if include_owner_contact and house.owner_id:
        owner = ClientUser.query.get(house.owner_id)

    images = []

    if house.images_json:

        try:

            images = json.loads(
                house.images_json
            )

        except json.JSONDecodeError:

            images = []


    cover_image = house.image

    # Use first uploaded image URL
    if not cover_image and images:

        first_image = images[0]
        cover_image = (
            first_image.get("url")
            if isinstance(first_image, dict)
            else first_image
        )


    data = {

        "id": house.id,

        "apartment_id": house.apartment_id,

        "title": house.title,

        "location": house.location,

        "price": house.price,

        "image": cover_image,

        "images": images,

        "beds": house.beds,

        "baths": house.baths,

        "apartment_name": house.apartment_name,

        "total_floors": house.total_floors,

        "total_houses": house.total_houses,

        "floor_number": house.floor_number,

        "unit_number": house.unit_number,

        "house_category": house.house_category,

        "status": house.status,

        "latitude": house.latitude,

        "longitude": house.longitude
    }

    if include_private_details or include_owner_contact:
        data["owner_id"] = house.owner_id

    if include_owner_contact:
        data.update({
            "owner_name":
            owner.name if owner else None,

            "owner_phone":
            owner.phone if owner else None,

            "owner_email":
            owner.email if owner else None
        })

    if include_private_details:
        data.update({
            "occupied_until":
            house.occupied_until,

            "customer_name":
            house.customer_name,

            "customer_phone":
            house.customer_phone,

            "customer_email":
            house.customer_email,

            "customer_payment_status":
            house.customer_payment_status,

            "customer_move_in_date":
            house.customer_move_in_date,

            "vacate_request":
            house.vacate_request,

            "condition_report":
            house.condition_report,

            "monthly_income":
            house.monthly_income
        })

    return data

def income_to_dict(record):
    return {
        "id": record.id,
        "owner_id": record.owner_id,
        "house_id": record.house_id,
        "customer_name": record.customer_name,
        "customer_phone": record.customer_phone,
        "amount": record.amount,
        "paid_for": record.paid_for,
        "paid_on": record.paid_on,
        "notes": record.notes,
        "payment_reference": record.payment_reference
    }


def booking_to_dict(record):
    house = House.query.get(record.house_id)

    return {
        "id": record.id,
        "owner_id": record.owner_id,
        "house_id": record.house_id,
        "house_title": house.title if house else "Apartment",
        "finder_id": record.finder_id,
        "finder_name": record.finder_name,
        "finder_phone": record.finder_phone,
        "finder_email": record.finder_email,
        "message": record.message,
        "status": record.status,
        "visit_requested": record.visit_requested,
        "condition_message": record.condition_message,
        "vacate_request": record.vacate_request,
        "rent_overdue_notice": record.rent_overdue_notice,
        "created_at": record.created_at
    }


def announcement_to_dict(record):
    return {
        "id": record.id,
        "owner_id": record.owner_id,
        "title": record.title,
        "message": record.message,
        "created_at": record.created_at
    }


def apartment_to_dict(apartment):
    units = House.query.filter_by(
        apartment_id=apartment.id,
        owner_id=apartment.owner_id
    ).all()

    return {
        "id": apartment.id,
        "owner_id": apartment.owner_id,
        "name": apartment.name,
        "location": apartment.location,
        "total_floors": apartment.total_floors,
        "notes": apartment.notes,
        "unit_mix": apartment.unit_mix(),
        "units_count": len(units),
        "occupied_units": len([unit for unit in units if unit.status == "occupied"])
    }


def current_owner_id():
    identity = get_jwt_identity() or ""

    if not identity.startswith("owner:"):
        return None

    return int(identity.split(":", 1)[1])


def owner_has_approved_listing(owner_id):
    return House.query.filter(
        House.owner_id == owner_id,
        House.status.in_(["active", "verified", "occupied"])
    ).first() is not None


def owner_can_submit_listing(owner_id):
    existing_count = House.query.filter_by(
        owner_id=owner_id
    ).count()

    return existing_count == 0 or owner_has_approved_listing(owner_id)


def apply_house_data(house, data):
    monthly_income = data.get(
        "monthly_income",
        house.monthly_income or 0
    )

    house.title = data.get("title", house.title)
    house.apartment_id = data.get("apartment_id", house.apartment_id)
    house.location = data.get("location", house.location)
    house.price = data.get("price", house.price)
    house.image = data.get("image", house.image)

    if "images" in data:
        house.images_json = json.dumps(data.get("images", []))
    house.beds = int(data.get("beds", house.beds or 0))
    house.baths = int(data.get("baths", house.baths or 0))
    house.apartment_name = data.get("apartment_name", house.apartment_name)
    house.total_floors = int(data.get("total_floors", house.total_floors or 0) or 0)
    house.total_houses = int(data.get("total_houses", house.total_houses or 0) or 0)
    house.floor_number = data.get("floor_number", house.floor_number)
    house.unit_number = data.get("unit_number", house.unit_number)
    house.house_category = data.get("house_category", house.house_category)
    house.status = data.get("status", house.status)
    house.latitude = data.get("latitude", house.latitude)
    house.longitude = data.get("longitude", house.longitude)
    house.occupied_until = data.get("occupied_until", house.occupied_until)
    house.customer_name = data.get("customer_name", house.customer_name)
    house.customer_phone = data.get("customer_phone", house.customer_phone)
    house.customer_email = data.get("customer_email", house.customer_email)
    house.customer_payment_status = data.get("customer_payment_status", house.customer_payment_status)
    house.customer_move_in_date = data.get("customer_move_in_date", house.customer_move_in_date)
    house.vacate_request = data.get("vacate_request", house.vacate_request)
    house.condition_report = data.get("condition_report", house.condition_report)
    house.monthly_income = float(monthly_income or 0)


@house_bp.route(
    "/api/houses",
    methods=["GET"]
)
def get_houses():

    houses = House.query.filter(
        House.status.in_(["active", "verified"])
    ).all()

    return jsonify([
        house_to_dict(house)
        for house in houses
    ])


@house_bp.route(
    "/api/owner/apartments",
    methods=["GET"]
)
@jwt_required()
def get_owner_apartments():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    apartments = Apartment.query.filter_by(
        owner_id=owner_id
    ).order_by(
        Apartment.id.desc()
    ).all()

    return jsonify([
        apartment_to_dict(apartment)
        for apartment in apartments
    ])


@house_bp.route(
    "/api/owner/apartments",
    methods=["POST"]
)
@jwt_required()
def add_owner_apartment():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    data = request.json or {}

    if not data.get("name"):
        return jsonify({
            "message": "Apartment name is required"
        }), 400

    apartment = Apartment(
        owner_id=owner_id,
        name=data.get("name"),
        location=data.get("location"),
        total_floors=int(data.get("total_floors", 0) or 0),
        notes=data.get("notes"),
        unit_mix_json=json.dumps(data.get("unit_mix", []))
    )

    db.session.add(apartment)
    db.session.commit()

    return jsonify({
        "message": "Apartment saved successfully",
        "apartment": apartment_to_dict(apartment)
    }), 201


@house_bp.route(
    "/api/owner/apartments/<int:apartment_id>",
    methods=["PUT"]
)
@jwt_required()
def update_owner_apartment(apartment_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    apartment = Apartment.query.filter_by(
        id=apartment_id,
        owner_id=owner_id
    ).first_or_404()
    data = request.json or {}

    apartment.name = data.get("name", apartment.name)
    apartment.location = data.get("location", apartment.location)
    apartment.total_floors = int(data.get("total_floors", apartment.total_floors or 0) or 0)
    apartment.notes = data.get("notes", apartment.notes)

    if "unit_mix" in data:
        apartment.unit_mix_json = json.dumps(data.get("unit_mix", []))

    db.session.commit()

    return jsonify({
        "message": "Apartment updated successfully",
        "apartment": apartment_to_dict(apartment)
    })


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
        house_to_dict(house, include_private_details=True)
        for house in houses
    ])


@house_bp.route(
    "/api/houses",
    methods=["POST"]
)
@jwt_required()
def add_house():
    # Protect against overly large requests early
    if request.content_length and request.content_length > current_app.config.get('MAX_CONTENT_LENGTH', 0):
        return jsonify({"message": "Payload too large"}), 413

    data = request.json or {}

    # Prepare images JSON and reject very large images data
    images = data.get("images", [])
    try:
        images_json = json.dumps(images)
    except Exception:
        images_json = '[]'

    # If any image entry contains a base64 data URL, reject it and point to the upload endpoint
    for img in images:
        if isinstance(img, dict):
            data_url = img.get("data_url") or img.get("url") or img.get("src")
            if isinstance(data_url, str) and data_url.startswith("data:"):
                return jsonify({
                    "message": "Inline base64 images are not accepted. Use the /api/uploads endpoint to upload files and provide image URLs instead." 
                }), 400

    if len(images_json) > 5_000_000:  # 5MB limit for images JSON
        return jsonify({"message": "Payload too large"}), 413

    new_house = House(
        title=data.get("title"),
        location=data.get("location"),
        price=data.get("price"),
        image=data.get("image"),
        images_json=images_json,
        beds=int(data.get("beds", 0) or 0),
        baths=int(data.get("baths", 0) or 0),
        status=data.get("status", "active")
    )

    db.session.add(new_house)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Return a clear error instead of letting SQLAlchemy raise lower-level OperationalError
        return jsonify({"message": "Database error: %s" % str(e)}), 500

    return jsonify({
        "message": "House added successfully",
        "house": house_to_dict(new_house, include_private_details=True)
    }), 201


@house_bp.route(
    "/api/houses/<int:house_id>",
    methods=["PUT"]
)
@jwt_required()
def update_house(house_id):

    house = House.query.get_or_404(house_id)
    data = request.json

    apply_house_data(house, data)

    db.session.commit()

    return jsonify({
        "message": "House updated successfully",
        "house": house_to_dict(house, include_private_details=True)
    })


@house_bp.route(
    "/api/houses/<int:house_id>/status",
    methods=["PATCH"]
)
@jwt_required()
def update_house_status(house_id):

    house = House.query.get_or_404(house_id)
    data = request.json

    if data.get("status") not in ["active", "verified", "rejected", "suspended", "occupied", "pending"]:
        return jsonify({
            "message": "Invalid status"
        }), 400

    house.status = data["status"]

    db.session.commit()

    return jsonify({
        "message": "House status updated successfully",
        "house": house_to_dict(house, include_private_details=True)
    })


@house_bp.route(
    "/api/bookings",
    methods=["GET"]
)
@jwt_required()
def get_all_bookings():

    records = BookingRequest.query.order_by(
        BookingRequest.id.desc()
    ).all()

    return jsonify([
        booking_to_dict(record)
        for record in records
    ])


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
















@house_bp.route(
    "/api/owner/houses",
    methods=["GET"]
)
@jwt_required()
def get_owner_houses():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    houses = House.query.filter_by(
        owner_id=owner_id
    ).order_by(
        House.id.desc()
    ).all()

    return jsonify([
        house_to_dict(house, include_private_details=True)
        for house in houses
    ])

@house_bp.route(
    "/api/owner/houses",
    methods=["POST"]
)
@jwt_required()
def add_owner_house():

    owner_id = current_owner_id()


    if not owner_id:

        return jsonify({
            "message":
            "Owner login required"
        }), 403


    if not owner_can_submit_listing(owner_id):

        return jsonify({
            "message":
            "Your first house is waiting for admin approval. You can post more houses after the admin approves it."
        }), 403


    # Protect against huge payloads
    if (
        request.content_length
        and
        request.content_length >
        current_app.config.get(
            "MAX_CONTENT_LENGTH",
            0
        )
    ):

        return jsonify({
            "message":
            "Payload too large"
        }), 413


    data = request.json or {}


    # Clean uploaded image URLs
    clean_images = []


    for img in data.get("images", []):

        if isinstance(img, str):

            if not img.startswith("data:"):

                clean_images.append(img)

        if isinstance(img, dict):

            url = img.get("url") or img.get("src")

            if isinstance(url, str) and not url.startswith("data:"):

                clean_images.append({
                    "category": img.get("category", "other"),
                    "url": url
                })


    try:

        house = House(

            owner_id=owner_id,

            apartment_id=data.get("apartment_id"),

            title=data.get("title"),

            location=data.get("location"),

            price=data.get("price"),

            image=(
                clean_images[0].get("url")
                if clean_images and isinstance(clean_images[0], dict)
                else clean_images[0]
                if clean_images
                else None
            ),

            images_json=json.dumps(
                clean_images
            ),

            beds=int(
                data.get("beds", 0)
            ),

            baths=int(
                data.get("baths", 0)
            ),

            apartment_name=data.get(
                "apartment_name"
            ),

            total_floors=int(
                data.get("total_floors", 0) or 0
            ),

            total_houses=int(
                data.get("total_houses", 0) or 0
            ),

            floor_number=data.get(
                "floor_number"
            ),

            unit_number=data.get(
                "unit_number"
            ),

            house_category=data.get(
                "house_category"
            ),

            status="pending",

            latitude=data.get(
                "latitude"
            ),

            longitude=data.get(
                "longitude"
            ),

            occupied_until=data.get(
                "occupied_until"
            ),

            customer_name=data.get(
                "customer_name"
            ),

            customer_phone=data.get(
                "customer_phone"
            ),

            customer_email=data.get(
                "customer_email"
            ),

            customer_payment_status=data.get(
                "customer_payment_status"
            ),

            customer_move_in_date=data.get(
                "customer_move_in_date"
            ),

            vacate_request=data.get(
                "vacate_request"
            ),

            condition_report=data.get(
                "condition_report"
            ),

            monthly_income=float(
                data.get(
                    "monthly_income",
                    0
                ) or 0
            )
        )


        db.session.add(house)

        db.session.commit()


        return jsonify({

            "message":
            "Apartment added successfully",

            "house":
            house_to_dict(house, include_private_details=True)

        }), 201


    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message":
            f"Database error: {str(e)}"
        }), 500
    # Protect against extremely large payloads for images_json (server-side)
    images_json = house.images_json or '[]'
    if len(images_json) > 5_000_000:  # 5MB limit for images JSON
        return jsonify({"message": "Payload too large"}), 413

    db.session.add(house)
    try:
        db.session.commit()
    except Exception as e:
        # Rollback and return an informative error
        db.session.rollback()
        return jsonify({"message": "Database error: %s" % str(e)}), 500

    return jsonify({
        "message": "Apartment added successfully",
        "house": house_to_dict(house, include_private_details=True)
    }), 201


@house_bp.route(
    "/api/owner/houses/<int:house_id>",
    methods=["PUT"]
)
@jwt_required()
def update_owner_house(house_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    house = House.query.filter_by(
        id=house_id,
        owner_id=owner_id
    ).first_or_404()

    previous_status = house.status

    apply_house_data(house, request.json or {})

    if previous_status in ["active", "verified", "occupied"]:
        house.status = previous_status
    else:
        house.status = "pending"

    db.session.commit()

    return jsonify({
        "message": "Apartment updated successfully",
        "house": house_to_dict(house, include_private_details=True)
    })


@house_bp.route(
    "/api/owner/houses/<int:house_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_owner_house(house_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    house = House.query.filter_by(
        id=house_id,
        owner_id=owner_id
    ).first_or_404()

    db.session.delete(house)
    db.session.commit()

    return jsonify({
        "message": "Apartment deleted successfully"
    })


@house_bp.route(
    "/api/owner/income",
    methods=["GET"]
)
@jwt_required()
def get_owner_income():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    records = IncomeRecord.query.filter_by(
        owner_id=owner_id
    ).order_by(
        IncomeRecord.id.desc()
    ).all()

    return jsonify([
        income_to_dict(record)
        for record in records
    ])




@house_bp.route(
    "/api/owner/bookings",
    methods=["GET"]
)
@jwt_required()
def get_owner_bookings():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    records = BookingRequest.query.filter_by(
        owner_id=owner_id
    ).order_by(
        BookingRequest.id.desc()
    ).all()

    return jsonify([
        booking_to_dict(record)
        for record in records
    ])


@house_bp.route(
    "/api/owner/tenants",
    methods=["GET"]
)
@jwt_required()
def get_owner_tenants():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    rented_bookings = BookingRequest.query.filter_by(
        owner_id=owner_id,
        status="rented"
    ).order_by(
        BookingRequest.id.desc()
    ).all()

    tenants = []

    for booking in rented_bookings:
        house = House.query.get(booking.house_id)
        payments = IncomeRecord.query.filter_by(
            owner_id=owner_id,
            house_id=booking.house_id
        ).order_by(
            IncomeRecord.id.desc()
        ).all()

        tenants.append({
            "booking": booking_to_dict(booking),
            "house": house_to_dict(house, include_private_details=True) if house else None,
            "payments": [income_to_dict(payment) for payment in payments],
            "rent_balance": calculate_rent_balance(house, payments),
            "rent_due": calculate_rent_balance(house, payments) > 0
        })

    return jsonify(tenants)


def calculate_rent_balance(house, payments):
    if not house:
        return 0

    expected_rent = float(house.monthly_income or house.price or 0)
    latest_payment = payments[0].amount if payments else 0

    return max(expected_rent - float(latest_payment or 0), 0)


@house_bp.route(
    "/api/owner/announcements",
    methods=["GET", "POST"]
)
@jwt_required()
def owner_announcements():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    if request.method == "POST":
        data = request.json or {}

        if not data.get("title") or not data.get("message"):
            return jsonify({
                "message": "Title and message are required"
            }), 400

        announcement = Announcement(
            owner_id=owner_id,
            title=data["title"],
            message=data["message"]
        )
        db.session.add(announcement)
        db.session.commit()

        return jsonify({
            "message": "Announcement sent to tenants",
            "announcement": announcement_to_dict(announcement)
        }), 201

    announcements = Announcement.query.filter_by(
        owner_id=owner_id
    ).order_by(
        Announcement.id.desc()
    ).all()

    return jsonify([
        announcement_to_dict(record)
        for record in announcements
    ])


@house_bp.route(
    "/api/owner/bookings/<int:booking_id>/status",
    methods=["PATCH"]
)
@jwt_required()
def update_owner_booking_status(booking_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    data = request.json or {}
    status = data.get("status")

    if status not in ["new", "contacted", "approved", "declined", "rented"]:
        return jsonify({
            "message": "Invalid booking status"
        }), 400

    record = BookingRequest.query.filter_by(
        id=booking_id,
        owner_id=owner_id
    ).first_or_404()

    record.status = status
    db.session.commit()

    return jsonify({
        "message": "Booking notification updated",
        "booking": booking_to_dict(record)
    })


@house_bp.route(
    "/api/owner/bookings/<int:booking_id>/move-in",
    methods=["PATCH"]
)
@jwt_required()
def mark_booking_as_occupied(booking_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    record = BookingRequest.query.filter_by(
        id=booking_id,
        owner_id=owner_id
    ).first_or_404()
    house = House.query.filter_by(
        id=record.house_id,
        owner_id=owner_id
    ).first_or_404()
    data = request.json or {}

    house.status = "occupied"
    house.customer_name = data.get("customer_name") or record.finder_name or house.customer_name
    house.customer_phone = data.get("customer_phone") or record.finder_phone or house.customer_phone
    house.customer_email = data.get("customer_email") or record.finder_email or house.customer_email
    house.customer_move_in_date = data.get("customer_move_in_date", house.customer_move_in_date)
    house.customer_payment_status = data.get("customer_payment_status", "active tenant")
    record.status = "rented"

    db.session.commit()

    return jsonify({
        "message": "Unit marked as occupied and client details saved",
        "booking": booking_to_dict(record),
        "house": house_to_dict(house, include_private_details=True)
    })


@house_bp.route(
    "/api/owner/bookings/<int:booking_id>/rent-overdue",
    methods=["PATCH"]
)
@jwt_required()
def send_rent_overdue_notice(booking_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    record = BookingRequest.query.filter_by(
        id=booking_id,
        owner_id=owner_id,
        status="rented"
    ).first_or_404()
    house = House.query.filter_by(
        id=record.house_id,
        owner_id=owner_id
    ).first_or_404()
    data = request.json or {}
    balance = data.get("balance")
    message = data.get("message")

    if not message:
        message = (
            f"Your rent for {house.title} is overdue."
            if balance in [None, ""]
            else f"Your rent for {house.title} is overdue. Balance: Ksh {balance}."
        )

    record.rent_overdue_notice = message
    house.customer_payment_status = "rent overdue"

    db.session.commit()

    return jsonify({
        "message": "Rent overdue notice sent",
        "booking": booking_to_dict(record),
        "house": house_to_dict(house, include_private_details=True)
    })


def current_finder_id():
    identity = get_jwt_identity() or ""

    if not identity.startswith("user:"):
        return None

    return int(identity.split(":", 1)[1])


@house_bp.route(
    "/api/finder/bookings",
    methods=["GET"]
)
@jwt_required()
def get_finder_bookings():

    finder_id = current_finder_id()

    if not finder_id:
        return jsonify({
            "message": "Home finder login required"
        }), 403

    records = BookingRequest.query.filter_by(
        finder_id=finder_id
    ).order_by(
        BookingRequest.id.desc()
    ).all()

    return jsonify([
        booking_to_dict(record)
        for record in records
    ])


@house_bp.route(
    "/api/finder/announcements",
    methods=["GET"]
)
@jwt_required()
def get_finder_announcements():

    finder_id = current_finder_id()

    if not finder_id:
        return jsonify({
            "message": "Home finder login required"
        }), 403

    owner_ids = [
        record.owner_id
        for record in BookingRequest.query.filter_by(
            finder_id=finder_id,
            status="rented"
        ).all()
    ]

    if not owner_ids:
        return jsonify([])

    announcements = Announcement.query.filter(
        Announcement.owner_id.in_(owner_ids)
    ).order_by(
        Announcement.id.desc()
    ).all()

    return jsonify([
        announcement_to_dict(record)
        for record in announcements
    ])


@house_bp.route(
    "/api/finder/bookings/<int:booking_id>/pay-rent",
    methods=["POST"]
)
@jwt_required()
def pay_finder_rent(booking_id):

    finder_id = current_finder_id()

    if not finder_id:
        return jsonify({
            "message": "Home finder login required"
        }), 403

    record = BookingRequest.query.filter_by(
        id=booking_id,
        finder_id=finder_id,
        status="rented"
    ).first_or_404()
    data = request.json or {}
    amount = float(data.get("amount", 0) or 0)
    payment_reference = (data.get("payment_reference") or "").strip()

    if amount <= 0:
        return jsonify({
            "message": "Payment amount is required"
        }), 400

    if not payment_reference:
        return jsonify({
            "message": "Payment reference code is required"
        }), 400

    existing_payment = IncomeRecord.query.filter_by(
        payment_reference=payment_reference
    ).first()

    if existing_payment:
        return jsonify({
            "message": "This payment reference has already been used. Please do not pay twice."
        }), 400

    payment = IncomeRecord(
        owner_id=record.owner_id,
        house_id=record.house_id,
        customer_name=record.finder_name or "Tenant",
        customer_phone=record.finder_phone,
        amount=amount,
        paid_for=data.get("paid_for", "Rent"),
        paid_on=data.get("paid_on"),
        notes=data.get("notes", "Tenant rent payment"),
        payment_reference=payment_reference
    )
    house = House.query.get(record.house_id)

    if house:
        house.customer_payment_status = f"Paid {data.get('paid_for', 'rent')}"

    record.rent_overdue_notice = None

    db.session.add(payment)
    db.session.commit()

    return jsonify({
        "message": "Rent payment recorded",
        "payment": income_to_dict(payment),
        "booking": booking_to_dict(record)
    }), 201


@house_bp.route(
    "/api/finder/bookings/<int:booking_id>/request",
    methods=["PATCH"]
)
@jwt_required()
def update_finder_booking_request(booking_id):

    finder_id = current_finder_id()

    if not finder_id:
        return jsonify({
            "message": "Home finder login required"
        }), 403

    record = BookingRequest.query.filter_by(
        id=booking_id,
        finder_id=finder_id
    ).first_or_404()
    data = request.json or {}
    request_type = data.get("type")
    message = data.get("message", "")

    if request_type == "visit":
        if record.status != "approved":
            return jsonify({
                "message": "The owner must approve the booking before a visit request"
            }), 400

        record.visit_requested = message or "I would like to visit and inspect the house."
    elif request_type == "condition":
        if record.status != "rented":
            return jsonify({
                "message": "Condition messages are available after the house is rented"
            }), 400

        record.condition_message = message
    elif request_type == "vacate":
        if record.status != "rented":
            return jsonify({
                "message": "Vacate requests are available after the house is rented"
            }), 400

        record.vacate_request = message
    else:
        return jsonify({
            "message": "Invalid request type"
        }), 400

    db.session.commit()

    return jsonify({
        "message": "Request sent to the home owner",
        "booking": booking_to_dict(record)
    })


# Single house fetch (public)
@house_bp.route(
    "/api/houses/<int:house_id>",
    methods=["GET"]
)
@jwt_required(optional=True)
def get_house(house_id):
    house = House.query.get_or_404(house_id)
    identity = get_jwt_identity() or ""

    return jsonify(house_to_dict(
        house,
        include_owner_contact=identity.startswith("user:")
    ))


# Simple booking endpoint - requires authentication to contact owner / book
@house_bp.route(
    "/api/houses/<int:house_id>/book",
    methods=["POST"]
)
@jwt_required()
def book_house(house_id):
    house = House.query.get_or_404(house_id)
    data = request.json or {}
    identity = get_jwt_identity() or ""
    finder = None
    finder_id = None

    if identity.startswith("user:"):
        finder_id = int(identity.split(":", 1)[1])
        finder = ClientUser.query.get(finder_id)

    if not house.owner_id:
        return jsonify({
            "message": "This apartment does not have an owner attached yet"
        }), 400

    booking = BookingRequest(
        owner_id=house.owner_id,
        house_id=house.id,
        finder_id=finder_id,
        finder_name=finder.name if finder else None,
        finder_phone=finder.phone if finder else None,
        finder_email=finder.email if finder else None,
        message=data.get("message", "I want to book or contact the owner about this home"),
        status="new"
    )

    db.session.add(booking)
    db.session.commit()

    return jsonify({
        "message": "Booking request sent to the home owner",
        "house": house_to_dict(house, include_owner_contact=True),
        "booking": booking_to_dict(booking),
        "payload": data
    })


@house_bp.route(
    "/api/owner/income",
    methods=["POST"]
)
@jwt_required()
def add_owner_income():

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    data = request.json or {}

    house = House.query.filter_by(
        id=data.get("house_id"),
        owner_id=owner_id
    ).first()

    if not house:
        return jsonify({
            "message": "Apartment not found"
        }), 404

    payment_reference = (data.get("payment_reference") or "").strip() or None

    if payment_reference and IncomeRecord.query.filter_by(payment_reference=payment_reference).first():
        return jsonify({
            "message": "This payment reference has already been used"
        }), 400

    record = IncomeRecord(
        owner_id=owner_id,
        house_id=house.id,
        customer_name=data["customer_name"],
        customer_phone=data.get("customer_phone"),
        amount=float(data["amount"]),
        paid_for=data.get("paid_for"),
        paid_on=data.get("paid_on"),
        notes=data.get("notes"),
        payment_reference=payment_reference
    )

    db.session.add(record)
    db.session.commit()

    return jsonify({
        "message": "Income recorded successfully",
        "income": income_to_dict(record)
    }), 201


@house_bp.route(
    "/api/owner/income/<int:record_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_owner_income(record_id):

    owner_id = current_owner_id()

    if not owner_id:
        return jsonify({
            "message": "Owner login required"
        }), 403

    record = IncomeRecord.query.filter_by(
        id=record_id,
        owner_id=owner_id
    ).first_or_404()

    db.session.delete(record)
    db.session.commit()

    return jsonify({
        "message": "Income record deleted successfully"
    })
