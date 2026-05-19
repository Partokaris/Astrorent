class Config:

    SQLALCHEMY_DATABASE_URI = (
        "mysql+pymysql://root:drbatman@localhost/astrorent"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = "astrorent-secret-key"