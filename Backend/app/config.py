import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Config:

    SQLALCHEMY_DATABASE_URI = (
        "mysql+pymysql://root:drbatman@localhost/astrorent"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "astrorent-secret-key")
    # Engine options: enable pre-ping to recycle connections that were closed by the server
    # and set a recycle timeout to avoid stale connections. Also set a small connect timeout.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "connect_args": {
            # pymysql connect args
            "connect_timeout": 10,
            "read_timeout": 60,
            "write_timeout": 60,
        },
    }
    # Max request size accepted by Flask (bytes). Protects against huge uploads.
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024
