from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.client_user import ClientUser
from app.models.house import House
from app.utils.cloudinary_uploads import UploadConfigurationError, UploadValidationError, delete_image, upload_image


user_bp = Blueprint(
    "user_bp",
    __name__
)


def client_user_to_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "account_type": user.account_type,
        "preferred_location": user.preferred_location,
        "budget": user.budget,
        "property_location": user.property_location,
        "property_type": user.property_type,
        "status": user.status,
        "identity_verified": user.identity_verified,
        "profile_picture": user.profile_picture,
        "property_count": House.query.filter_by(owner_id=user.id).count()
        if user.account_type == "home_owner"
        else 0
    }


def current_client_user():
    identity = get_jwt_identity() or ""

    if not isinstance(identity, str) or ":" not in identity:
        return None

    prefix, user_id = identity.split(":", 1)

    if prefix not in {"owner", "user"}:
        return None

    try:
        return ClientUser.query.get(int(user_id))
    except (TypeError, ValueError):
        return None


@user_bp.route(
    "/api/users/signup",
    methods=["POST"]
)
def signup_user():

    data = request.json or {}

    required_fields = [
        "name",
        "email",
        "phone",
        "password",
        "account_type"
    ]

    missing_fields = [
        field
        for field in required_fields
        if not data.get(field)
    ]

    if missing_fields:
        return jsonify({
            "message": "Please fill all required fields"
        }), 400

    if data["account_type"] not in ["home_finder", "home_owner"]:
        return jsonify({
            "message": "Invalid account type"
        }), 400

    existing_user = ClientUser.query.filter_by(
        email=data["email"]
    ).first()

    if existing_user:
        return jsonify({
            "message": "An account with this email already exists"
        }), 400

    user = ClientUser(
        name=data["name"],
        email=data["email"],
        phone=data["phone"],
        password=generate_password_hash(data["password"]),
        account_type=data["account_type"],
        preferred_location=data.get("preferred_location"),
        budget=data.get("budget"),
        property_location=data.get("property_location"),
        property_type=data.get("property_type")
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Account created successfully",
        "user": client_user_to_dict(user)
    }), 201


@user_bp.route(
    "/api/users/login",
    methods=["POST"]
)
def login_user():

    data = request.json or {}

    if not data.get("email") or not data.get("password"):
        return jsonify({
            "message": "Email and password are required"
        }), 400

    user = ClientUser.query.filter_by(
        email=data["email"]
    ).first()

    if not user:
        return jsonify({
            "message": "User not found"
        }), 401

    if not check_password_hash(
        user.password,
        data["password"]
    ):
        return jsonify({
            "message": "Wrong password"
        }), 401

    if user.account_type != "home_finder":
        return jsonify({
            "message": "This login is only for home finders"
        }), 403

    token = create_access_token(
        identity=f"user:{user.id}"
    )

    return jsonify({
        "token": token,
        "user": client_user_to_dict(user)
    })


@user_bp.route(
    "/api/owners",
    methods=["GET"]
)
@jwt_required()
def get_owners():

    owners = ClientUser.query.filter_by(
        account_type="home_owner"
    ).order_by(
        ClientUser.id.desc()
    ).all()

    return jsonify([
        client_user_to_dict(owner)
        for owner in owners
    ])


@user_bp.route(
    "/api/owners/<int:owner_id>/status",
    methods=["PATCH"]
)
@jwt_required()
def update_owner_status(owner_id):

    owner = ClientUser.query.filter_by(
        id=owner_id,
        account_type="home_owner"
    ).first_or_404()
    data = request.json or {}

    if data.get("status") not in ["active", "suspended"]:
        return jsonify({
            "message": "Invalid owner status"
        }), 400

    owner.status = data["status"]
    db.session.commit()

    return jsonify({
        "message": "Owner status updated",
        "owner": client_user_to_dict(owner)
    })


@user_bp.route(
    "/api/owners/<int:owner_id>/verify",
    methods=["PATCH"]
)
@jwt_required()
def verify_owner_identity(owner_id):

    owner = ClientUser.query.filter_by(
        id=owner_id,
        account_type="home_owner"
    ).first_or_404()
    data = request.json or {}

    owner.identity_verified = bool(data.get("identity_verified", True))
    db.session.commit()

    return jsonify({
        "message": "Owner identity verification updated",
        "owner": client_user_to_dict(owner)
    })


@user_bp.route(
    "/api/owners/login",
    methods=["POST"]
)
def login_owner():

    data = request.json or {}

    if not data.get("email") or not data.get("password"):
        return jsonify({
            "message": "Email and password are required"
        }), 400

    user = ClientUser.query.filter_by(
        email=data["email"]
    ).first()

    if not user:
        return jsonify({
            "message": "Owner not found"
        }), 401

    if not check_password_hash(
        user.password,
        data["password"]
    ):
        return jsonify({
            "message": "Wrong password"
        }), 401

    if user.account_type != "home_owner":
        return jsonify({
            "message": "This login is only for home owners"
        }), 403

    token = create_access_token(
        identity=f"owner:{user.id}"
    )

    return jsonify({
        "token": token,
        "user": client_user_to_dict(user)
    })


@user_bp.route(
    "/api/users/profile-picture",
    methods=["POST"]
)
@jwt_required()
def upload_profile_picture():
    if request.content_length and request.content_length > current_app.config.get("MAX_CONTENT_LENGTH", 0):
        return jsonify({"message": "Payload too large"}), 413

    user = current_client_user()

    if not user:
        return jsonify({"message": "User login required"}), 403

    file = request.files.get("file") or (request.files.getlist("files") or [None])[0]

    try:
        uploaded = upload_image(file, folder="profile_pictures")
    except UploadConfigurationError as err:
        current_app.logger.error(str(err))
        return jsonify({"message": str(err)}), 503
    except UploadValidationError as err:
        return jsonify({"message": str(err)}), 400
    except Exception:
        current_app.logger.exception("Profile picture upload failed")
        return jsonify({"message": "Profile picture upload failed. Please try again."}), 500

    old_picture = user.profile_picture
    user.profile_picture = uploaded["url"]
    db.session.commit()

    if old_picture:
        delete_image(old_picture)

    return jsonify({
        "message": "Profile picture updated",
        "profile_picture": user.profile_picture,
        "public_id": uploaded["public_id"],
        "user": client_user_to_dict(user)
    })
