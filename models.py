# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

# ── FOLLOW MODEL ──────────────────────────────────────────────────────────────
class Follow(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    followed_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('follower_id', 'followed_id', name='unique_follow'),
    )

# ── NOTIFICATION MODEL ────────────────────────────────────────────────────────
class Notification(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    actor_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type       = db.Column(db.String(50), nullable=False)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=True)
    is_read    = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user       = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    actor      = db.relationship('User', foreign_keys=[actor_id])
    post       = db.relationship('Post', foreign_keys=[post_id])

# ── BOOKMARK MODEL ────────────────────────────────────────────────────────────
class Bookmark(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='unique_bookmark'),
    )

# ── REPORT MODEL ──────────────────────────────────────────────────────────────
# Stores post reports submitted by users
class Report(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    reporter   = db.Column(db.String(100), nullable=False)
    reason     = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ── BLOCK MODEL ───────────────────────────────────────────────────────────────
# Stores blocked user relationships
class Block(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('blocker_id', 'blocked_id', name='unique_block'),
    )

# ── USER MODEL ────────────────────────────────────────────────────────────────
class User(UserMixin, db.Model):
    id             = db.Column(db.Integer, primary_key=True)
    username       = db.Column(db.String(80), unique=True, nullable=False)
    password       = db.Column(db.String(200), nullable=False)
    avatar         = db.Column(db.String(500), nullable=True)
    bio            = db.Column(db.String(200), nullable=True)
    website        = db.Column(db.String(200), nullable=True)
    location       = db.Column(db.String(100), nullable=True)
    email          = db.Column(db.String(200), nullable=True)
    is_verified    = db.Column(db.Boolean, default=False)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    posts      = db.relationship('Post', backref='author', cascade='all, delete-orphan')
    bookmarks  = db.relationship('Bookmark', backref='user', cascade='all, delete-orphan')
    following  = db.relationship('Follow', foreign_keys='Follow.follower_id', backref='follower', cascade='all, delete-orphan')
    followers  = db.relationship('Follow', foreign_keys='Follow.followed_id', backref='followed', cascade='all, delete-orphan')

    def is_following(self, user):
        return Follow.query.filter_by(follower_id=self.id, followed_id=user.id).first() is not None

    def follower_count(self):
        return Follow.query.filter_by(followed_id=self.id).count()

    def following_count(self):
        return Follow.query.filter_by(follower_id=self.id).count()

    def unread_notifications(self):
        return Notification.query.filter_by(user_id=self.id, is_read=False).count()

    def is_blocked_by(self, user):
        return Block.query.filter_by(blocker_id=user.id, blocked_id=self.id).first() is not None

# ── POST MODEL ────────────────────────────────────────────────────────────────
class Post(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    text       = db.Column(db.Text, nullable=False)
    shop       = db.Column(db.String(120), nullable=True)
    image      = db.Column(db.String(500), nullable=True)
    likes      = db.Column(db.Integer, default=0)
    liked_by   = db.Column(db.Text, default="")
    view_count = db.Column(db.Integer, default=0)
    hashtags   = db.Column(db.String(500), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    comments   = db.relationship('Comment', backref='post', cascade='all, delete-orphan')
    bookmarks  = db.relationship('Bookmark', backref='post', cascade='all, delete-orphan')

# ── COMMENT MODEL ─────────────────────────────────────────────────────────────
class Comment(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'))
    username   = db.Column(db.String(100))
    text       = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ── REVIEW MODEL ──────────────────────────────────────────────────────────────
class Review(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(100), nullable=False)
    shop       = db.Column(db.String(120), nullable=False)
    rating     = db.Column(db.Integer, nullable=False)
    text       = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)