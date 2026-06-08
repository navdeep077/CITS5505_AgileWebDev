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
class Report(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    reporter   = db.Column(db.String(100), nullable=False)
    reason     = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ── BLOCK MODEL ───────────────────────────────────────────────────────────────
class Block(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('blocker_id', 'blocked_id', name='unique_block'),
    )

# ── COFFEE JOURNAL MODEL ──────────────────────────────────────────────────────
class JournalEntry(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cafe       = db.Column(db.String(120), nullable=False)
    visit_date = db.Column(db.String(20), nullable=True)
    brew_type  = db.Column(db.String(80), nullable=True)
    mood       = db.Column(db.String(50), nullable=True)
    rating     = db.Column(db.Integer, nullable=True)
    notes      = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user       = db.relationship('User', backref='journal_entries')

# ── USER MODEL ────────────────────────────────────────────────────────────────
class User(UserMixin, db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    username    = db.Column(db.String(80), unique=True, nullable=False)
    password    = db.Column(db.String(200), nullable=False)
    avatar      = db.Column(db.String(500), nullable=True)
    bio         = db.Column(db.String(200), nullable=True)
    website     = db.Column(db.String(200), nullable=True)
    location    = db.Column(db.String(100), nullable=True)
    email       = db.Column(db.String(200), unique=True, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_admin    = db.Column(db.Boolean, default=False)
    xp          = db.Column(db.Integer, default=0)
    badges      = db.Column(db.String(500), default="")
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

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

    def get_level(self):
        """Returns level title based on XP"""
        xp = self.xp or 0
        if xp < 50:    return {"level": 1, "title": "Newcomer",          "next": 50}
        if xp < 150:   return {"level": 2, "title": "Coffee Curious",    "next": 150}
        if xp < 300:   return {"level": 3, "title": "Latte Learner",     "next": 300}
        if xp < 500:   return {"level": 4, "title": "Barista Apprentice","next": 500}
        if xp < 750:   return {"level": 5, "title": "Brew Expert",       "next": 750}
        if xp < 1000:  return {"level": 6, "title": "Cafe Connoisseur",  "next": 1000}
        if xp < 1500:  return {"level": 7, "title": "Coffee Artisan",    "next": 1500}
        if xp < 2000:  return {"level": 8, "title": "Master Roaster",    "next": 2000}
        if xp < 3000:  return {"level": 9, "title": "Head Barista",      "next": 3000}
        return {"level": 10, "title": "Grand Master Barista", "next": None}

    def get_badges(self):
        """Returns list of earned badge names"""
        return [b for b in (self.badges or "").split(",") if b]

    def award_badge(self, badge_name):
        """Awards a badge if not already earned"""
        current = self.get_badges()
        if badge_name not in current:
            current.append(badge_name)
            self.badges = ",".join(current)
            return True
        return False

    def check_and_award_badges(self):
        """Checks all badge conditions and awards any earned"""
        post_count   = len(self.posts)
        review_count = Review.query.filter_by(username=self.username).count()
        total_likes  = sum(p.likes for p in self.posts)
        follower_count = self.follower_count()

        if post_count >= 1:
            self.award_badge("First Post")
        if post_count >= 10:
            self.award_badge("Regular Poster")
        if post_count >= 50:
            self.award_badge("Prolific Poster")
        if review_count >= 1:
            self.award_badge("First Review")
        if review_count >= 5:
            self.award_badge("Cafe Explorer")
        if review_count >= 7:
            self.award_badge("Top Reviewer")
        if total_likes >= 10:
            self.award_badge("Popular Post")
        if follower_count >= 5:
            self.award_badge("Social Butterfly")
        if follower_count >= 20:
            self.award_badge("Community Star")

        # Days since joining
        if self.created_at:
            days = (datetime.utcnow() - self.created_at).days
            if days >= 30:
                self.award_badge("Loyal Member")


# ── POST MODEL ────────────────────────────────────────────────────────────────
class Post(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    text         = db.Column(db.Text, nullable=False)
    shop         = db.Column(db.String(120), nullable=True)
    image        = db.Column(db.String(500), nullable=True)
    likes        = db.Column(db.Integer, default=0)
    liked_by     = db.Column(db.Text, default="")
    view_count   = db.Column(db.Integer, default=0)
    hashtags     = db.Column(db.String(500), default="")
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    scheduled_at = db.Column(db.DateTime, nullable=True)
    is_published = db.Column(db.Boolean, default=True)
    comments     = db.relationship('Comment', backref='post', cascade='all, delete-orphan')
    bookmarks    = db.relationship('Bookmark', backref='post', cascade='all, delete-orphan')


# ── PROFILE VIEW MODEL ────────────────────────────────────────────────────────
class ProfileView(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    profile_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    viewer_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

# ── POST VIEW MODEL ────────────────────────────────────────────────────────────
class PostView(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='unique_post_view'),
    )

# ── COMMENT MODEL ─────────────────────────────────────────────────────────────
class Comment(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('post.id'))
    username   = db.Column(db.String(100))
    text       = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── DIRECT MESSAGE MODEL ──────────────────────────────────────────────────────
class Message(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    sender_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    text        = db.Column(db.Text, nullable=False)
    is_read     = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    sender      = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver    = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')

# ── REVIEW MODEL ──────────────────────────────────────────────────────────────
class Review(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(100), nullable=False)
    shop       = db.Column(db.String(120), nullable=False)
    rating     = db.Column(db.Integer, nullable=False)
    text       = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)