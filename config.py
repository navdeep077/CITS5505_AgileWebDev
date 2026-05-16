#  Application Configuration
# Centralises all Flask configuration settings in one class.
# Values are loaded from environment variables (set in .env) so that
# sensitive data is never hardcoded in source code or committed to GitHub.

import os
from dotenv import load_dotenv

# Load variables from the .env file into the process environment.
# The .env file is gitignored and must be created locally by each developer.
load_dotenv()


class Config:
    """
    Base configuration class used by the Flask application factory.

    All settings are read from environment variables with safe fallbacks
    for local development. In production, always set these via environment
    variables — never rely on the fallback values.
    """

    # SECRET_KEY is used by Flask to sign session cookies and CSRF tokens.
    # If an attacker obtains this key they can forge session data, so it
    # must be a long random string stored in .env and never committed to Git.
    SECRET_KEY = os.environ.get("SECRET_KEY") or "fallback-dev-key-do-not-use-in-production"

    # SQLALCHEMY_DATABASE_URI tells SQLAlchemy where to find the database.
    # Defaults to a local SQLite file (coffee_hub.db) in the instance folder.
    # Can be overridden with a DATABASE_URL env var pointing to a remote DB.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "sqlite:///coffee_hub.db"

    # Disable the SQLAlchemy event system's modification tracking overlay
    # to reduce memory overhead (recommended by Flask-SQLAlchemy docs).
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Enable WTForms CSRF protection globally.
    # Set to False in test configurations to allow form submissions without tokens.
    WTF_CSRF_ENABLED = True