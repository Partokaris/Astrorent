import logging
import os
import uuid
from urllib.parse import urlparse

import cloudinary.uploader
from werkzeug.utils import secure_filename


ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
CLOUDINARY_FOLDERS = {
    "projects": "projects",
    "profile_pictures": "profile_pictures",
    "comments": "comments"
}

logger = logging.getLogger(__name__)


class UploadValidationError(ValueError):
    pass


class UploadConfigurationError(RuntimeError):
    pass


def ensure_cloudinary_configured():
    missing = [
        name
        for name in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
        if not os.getenv(name)
    ]

    if missing:
        raise UploadConfigurationError(
            f"Cloudinary is not configured. Missing: {', '.join(missing)}"
        )


def validate_image(file):
    if not file or not file.filename:
        raise UploadValidationError("No image selected")

    filename = secure_filename(file.filename)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise UploadValidationError("Only JPG, JPEG, PNG, GIF, and WEBP images are allowed")

    if file.mimetype and not file.mimetype.startswith("image/"):
        raise UploadValidationError("Only image uploads are allowed")

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)

    if size == 0:
        raise UploadValidationError("Uploaded image is empty")

    return filename, extension


def upload_image(file, folder="projects"):
    ensure_cloudinary_configured()
    filename, extension = validate_image(file)
    folder_name = CLOUDINARY_FOLDERS.get(folder, CLOUDINARY_FOLDERS["projects"])
    basename = os.path.splitext(filename)[0] or "image"
    public_id = f"{secure_filename(basename)}-{uuid.uuid4().hex}"

    try:
        result = cloudinary.uploader.upload(
            file,
            folder=folder_name,
            public_id=public_id,
            resource_type="image",
            format=extension,
            overwrite=False,
            unique_filename=False,
            use_filename=False,
            transformation=[
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
    except Exception:
        logger.exception("Cloudinary upload failed for %s", filename)
        raise

    secure_url = result.get("secure_url")
    public_id = result.get("public_id")

    if not secure_url or not public_id:
        logger.error("Cloudinary upload response missing secure_url or public_id: %s", result)
        raise RuntimeError("Image upload failed")

    return {
        "url": secure_url,
        "secure_url": secure_url,
        "public_id": public_id
    }


def delete_image(public_id_or_url):
    public_id = extract_public_id(public_id_or_url)

    if not public_id:
        return False

    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        return result.get("result") in {"ok", "not found"}
    except Exception:
        logger.exception("Cloudinary delete failed for %s", public_id)
        return False


def extract_public_id(value):
    if not value or not isinstance(value, str):
        return None

    if not value.startswith("http"):
        return value

    parsed = urlparse(value)

    if "res.cloudinary.com" not in parsed.netloc:
        return None

    parts = [part for part in parsed.path.split("/") if part]

    if "upload" not in parts:
        return None

    upload_index = parts.index("upload")
    public_parts = parts[upload_index + 1:]

    if public_parts and public_parts[0].startswith("v") and public_parts[0][1:].isdigit():
        public_parts = public_parts[1:]

    if not public_parts:
        return None

    public_path = "/".join(public_parts)

    return os.path.splitext(public_path)[0]


def collect_image_references(house):
    references = []

    if house.image:
        references.append(house.image)

    if house.images_json:
        try:
            import json

            images = json.loads(house.images_json)
        except (TypeError, ValueError):
            images = []

        for image in images:
            if isinstance(image, str):
                references.append(image)
            elif isinstance(image, dict):
                references.extend(
                    value
                    for value in (image.get("public_id"), image.get("url"), image.get("src"))
                    if value
                )

    return list(dict.fromkeys(references))


def delete_house_images(house):
    for reference in collect_image_references(house):
        delete_image(reference)
