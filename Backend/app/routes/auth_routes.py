from flask import Blueprint, request, jsonify

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request
)

from app.extensions import db

from app.models.admin import Admin


auth_bp = Blueprint(
    "auth_bp",
    __name__
)


def admin_to_dict(admin):
    return {
        "id": admin.id,
        "name": admin.name,
        "email": admin.email,
        "role": admin.role,
        "status": admin.status
    }


# Register admin
@auth_bp.route(
    "/api/admin/register",
    methods=["GET", "POST"]
)
def register_admin():

    data = request.json

    if Admin.query.count() > 0:
        verify_jwt_in_request()

    existing_admin = Admin.query.filter_by(
        email=data["email"]
    ).first()

    if existing_admin:
        return jsonify({
            "message": "Admin already exists"
        }), 400


    hashed_password = generate_password_hash(
        data["password"]
    )


    admin = Admin(
        name=data.get("name", "Admin"),
        email=data["email"],
        role=data.get("role", "admin"),
        status=data.get("status", "active"),
        password=hashed_password
    )


    db.session.add(admin)

    db.session.commit()


    return jsonify({
        "message": "Admin created successfully",
        "admin": admin_to_dict(admin)
    }), 201


# Login admin
@auth_bp.route(
    "/api/admin/login",
    methods=["POST"]
)
def login_admin():

    data = request.json

    admin = Admin.query.filter_by(
        email=data["email"]
    ).first()


    if not admin:
        return jsonify({
            "message": "Admin not found"
        }), 401


    if not check_password_hash(
        admin.password,
        data["password"]
    ):
        return jsonify({
            "message": "Wrong password"
        }), 401

    if admin.status != "active":
        return jsonify({
            "message": "Admin account is suspended"
        }), 403


    token = create_access_token(
        identity=str(admin.id)
    )


    return jsonify({
        "token": token,
        "admin": admin_to_dict(admin)
    })


@auth_bp.route(
    "/api/admin/me",
    methods=["GET"]
)
@jwt_required()
def get_current_admin():

    admin = Admin.query.get_or_404(
        int(get_jwt_identity())
    )

    return jsonify(
        admin_to_dict(admin)
    )


@auth_bp.route(
    "/api/admins",
    methods=["GET"]
)
@jwt_required()
def get_admins():

    admins = Admin.query.order_by(
        Admin.id.desc()
    ).all()

    return jsonify([
        admin_to_dict(admin)
        for admin in admins
    ])


@auth_bp.route(
    "/api/admins/<int:admin_id>",
    methods=["PUT"]
)
@jwt_required()
def update_admin(admin_id):

    admin = Admin.query.get_or_404(admin_id)
    data = request.json

    admin.name = data.get("name", admin.name)
    admin.email = data.get("email", admin.email)
    admin.role = data.get("role", admin.role)
    admin.status = data.get("status", admin.status)

    if data.get("password"):
        admin.password = generate_password_hash(
            data["password"]
        )

    db.session.commit()

    return jsonify({
        "message": "Admin updated successfully",
        "admin": admin_to_dict(admin)
    })


@auth_bp.route(
    "/api/admins/<int:admin_id>/status",
    methods=["PATCH"]
)
@jwt_required()
def update_admin_status(admin_id):

    admin = Admin.query.get_or_404(admin_id)
    data = request.json

    if data.get("status") not in ["active", "suspended"]:
        return jsonify({
            "message": "Invalid status"
        }), 400

    admin.status = data["status"]

    db.session.commit()

    return jsonify({
        "message": "Admin status updated successfully",
        "admin": admin_to_dict(admin)
    })


@auth_bp.route(
    "/api/admins/<int:admin_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_admin(admin_id):

    current_admin_id = int(get_jwt_identity())

    if admin_id == current_admin_id:
        return jsonify({
            "message": "You cannot delete your own account"
        }), 400

    admin = Admin.query.get_or_404(admin_id)

    db.session.delete(admin)
    db.session.commit()

    return jsonify({
        "message": "Admin deleted successfully"
    })
