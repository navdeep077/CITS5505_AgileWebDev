#  Database Models 
# Defines the SQLAlchemy ORM models that map Python classes to SQLite tables.
# Flask-Migrate tracks changes to these models and generates migration scripts.

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin   # Provides default implementations for Flask-Login
from datetime import datetime

# Shared SQLAlchemy instance — initialised in app.py via db.init_app(app)
db = SQLAlchemy()


class User(UserMixin, db.Model):
    """
    Represents a registered user of the Coffee Social Hub.

    Inherits from UserMixin to satisfy Flask-Login's required interface:
      - is_authenticated, is_active, is_anonymous, get_id()

    Relationships:
      - posts: one-to-many (a user can have many posts)
    """

    # Primary key — auto-incremented integer
    id = db.Column(db.Integer, primary_key=True)

    # Username must be unique and is used as the login identifier
    username = db.Column(db.String(80), unique=True, nullable=False)

    # Password stored as a bcrypt hash — never plain text
    password = db.Column(db.String(200), nullable=False)

    # Optional URL path to the user's profile picture stored on the server
    avatar = db.Column(db.String(255), nullable=True)

    # Optional short biography displayed on the profile page
    bio = db.Column(db.String(200), nullable=True)

    # Back-reference: user.posts returns all Post objects belonging to this user.
    # cascade='all, delete-orphan' ensures posts are deleted when the user is deleted.
    posts = db.relationship('Post', backref='author', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.username}>'


class Post(db.Model):
    """
    Represents a social post (coffee moment) shared by a user.

    Each post belongs to one user (via user_id foreign key) and can have
    many comments. Likes are tracked as a count and a comma-separated list
    of usernames who have liked the post.
    """

    # Primary key — auto-incremented integer
    id = db.Column(db.Integer, primary_key=True)

    # The main text body of the post (required)
    text = db.Column(db.Text, nullable=False)

    # Optional cafe name tag selected from the dropdown
    shop = db.Column(db.String(120), nullable=True)

    # Optional URL path to the post's image stored on the server
    image = db.Column(db.String(255), nullable=True)

    # Total number of likes this post has received
    likes = db.Column(db.Integer, default=0)

    # Comma-separated usernames of users who have liked this post
    # (e.g. "navdeep,evan,jaswanth") — used for toggle-like logic
    liked_by = db.Column(db.Text, default="")

    # Timestamp of when the post was created — set automatically on insert
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Foreign key linking this post to its author in the User table
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Back-reference: post.comments returns all Comment objects for this post.
    # cascade ensures comments are deleted when the parent post is deleted.
    comments = db.relationship('Comment', backref='post', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Post {self.id} by {self.user_id}>'


class Comment(db.Model):
    """
    Represents a comment left on a social post.

    Comments are owned by a username (not a foreign key to User) to allow
    display even if the commenter's account is later deleted.
    """

    # Primary key — auto-incremented integer
    id = db.Column(db.Integer, primary_key=True)

    # Foreign key to the parent Post — comment is deleted if post is deleted
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'))

    # Username of the commenter (stored as a string, not a FK)
    username = db.Column(db.String(100))

    # The comment body text
    text = db.Column(db.Text)

    # Timestamp of when the comment was created — used by the timeAgo() JS helper
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Review(db.Model):
    """
    Represents a star-rated review of a cafe submitted by a user.

    Business rule: each user may submit at most one review per cafe.
    This is enforced in the API route, not at the database level.
    Reviews are stored in the database so they appear on public profile pages
    and persist across browsers and devices.
    """

    # Primary key — auto-incremented integer
    id = db.Column(db.Integer, primary_key=True)

    # Username of the reviewer (stored as a string for simplicity)
    username = db.Column(db.String(100), nullable=False)

    # Name of the cafe being reviewed (must match CAFES list in app.py)
    shop = db.Column(db.String(120), nullable=False)

    # Star rating from 1 to 5 (validated client-side by the star picker)
    rating = db.Column(db.Integer, nullable=False)

    # Written review body text
    text = db.Column(db.Text, nullable=False)

    # Timestamp of when the review was submitted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)