import os
from pathlib import Path

import cloudinary
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def configure_cloudinary():
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
