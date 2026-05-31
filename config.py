# config.py
# Centralised configuration — loads all settings from .env file

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask secret key — used for sessions and CSRF tokens
    SECRET_KEY = os.environ.get("SECRET_KEY") or "fallback-dev-key"

    # Database — use PostgreSQL in production, SQLite locally
    DATABASE_URL = os.environ.get("DATABASE_URL") or "sqlite:///coffee_hub.db"

    # Fix for Render/Heroku PostgreSQL URL format
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File uploads
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8MB

    # CSRF protection
    WTF_CSRF_ENABLED = True

    # Email configuration (Gmail)
    MAIL_SERVER   = 'smtp.gmail.com'
    MAIL_PORT     = 587
    MAIL_USE_TLS  = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

    # Cloudinary configuration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY    = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')