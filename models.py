from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.String(200), nullable=True)
    posts = db.relationship('Post', backref='author', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.username}>'

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    shop = db.Column(db.String(120), nullable=True)
    image = db.Column(db.String(255), nullable=True)
    likes = db.Column(db.Integer, default=0)
    liked_by = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    comments = db.relationship('Comment', backref='post', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Post {self.id} by {self.user_id}>'

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'))
    username = db.Column(db.String(100))
    text = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)