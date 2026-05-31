# models.py
# Database models for Coffee Social Hub
# Defines all tables: User, Post, Comment, Review, Follow, Notification, Bookmark

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

# ── FOLLOW MODEL ──────────────────────────────────────────────────────────────
# Stores follow relationships between users
# follower_id = the user who clicked follow
# followed_id = the user being followed
class Follow(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    followed_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    # One follow relationship per pair of users
    __table_args__ = (
        db.UniqueConstraint('follower_id', 'followed_id', name='unique_follow'),
    )

# ── NOTIFICATION MODEL ────────────────────────────────────────────────────────
# Stores all notifications for all users
# Types: like, comment, follow
class Notification(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    actor_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type        = db.Column(db.String(50), nullable=False)
    post_id     = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=True)
    is_read     = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships to get user and actor objects
    user        = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    actor       = db.relationship('User', foreign_keys=[actor_id])
    post        = db.relationship('Post', foreign_keys=[post_id])

# ── BOOKMARK MODEL ────────────────────────────────────────────────────────────
# Stores saved/bookmarked posts for each user
class Bookmark(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # One bookmark per user per post
    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='unique_bookmark'),
    )

# ── USER MODEL ────────────────────────────────────────────────────────────────
# Stores all registered users
class User(UserMixin, db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(80), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    avatar     = db.Column(db.String(255), nullable=True)
    bio        = db.Column(db.String(200), nullable=True)
    website    = db.Column(db.String(200), nullable=True)   # NEW
    location   = db.Column(db.String(100), nullable=True)   # NEW
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # NEW

    # Relationships
    posts      = db.relationship('Post', backref='author', cascade='all, delete-orphan')
    bookmarks  = db.relationship('Bookmark', backref='user', cascade='all, delete-orphan')

    # Follow relationships
    following  = db.relationship(
        'Follow',
        foreign_keys='Follow.follower_id',
        backref='follower',
        cascade='all, delete-orphan'
    )
    followers  = db.relationship(
        'Follow',
        foreign_keys='Follow.followed_id',
        backref='followed',
        cascade='all, delete-orphan'
    )

    # Helper methods
    def is_following(self, user):
        return Follow.query.filter_by(
            follower_id=self.id,
            followed_id=user.id
        ).first() is not None

    def follower_count(self):
        return Follow.query.filter_by(followed_id=self.id).count()

    def following_count(self):
        return Follow.query.filter_by(follower_id=self.id).count()

    def unread_notifications(self):
        return Notification.query.filter_by(
            user_id=self.id,
            is_read=False
        ).count()

# ── POST MODEL ────────────────────────────────────────────────────────────────
# Stores all posts created by users
class Post(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    text        = db.Column(db.Text, nullable=False)
    shop        = db.Column(db.String(120), nullable=True)
    image       = db.Column(db.String(255), nullable=True)
    likes       = db.Column(db.Integer, default=0)
    liked_by    = db.Column(db.Text, default="")
    view_count  = db.Column(db.Integer, default=0)    # NEW
    hashtags    = db.Column(db.String(500), default="")  # NEW
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    comments    = db.relationship('Comment', backref='post', cascade='all, delete-orphan')
    bookmarks   = db.relationship('Bookmark', backref='post', cascade='all, delete-orphan')

# ── COMMENT MODEL ─────────────────────────────────────────────────────────────
# Stores all comments on posts
class Comment(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'))
    username   = db.Column(db.String(100))
    text       = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ── REVIEW MODEL ─────────────────────────────────────────────────────────────
# Stores cafe reviews — one per user per cafe
class Review(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(100), nullable=False)
    shop       = db.Column(db.String(120), nullable=False)
    rating     = db.Column(db.Integer, nullable=False)
    text       = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)