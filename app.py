import os
import sys
from uuid import uuid4
from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_login import LoginManager, login_user, logout_user, login_required
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from models import db, User, Post, Comment, Review, Follow, Notification, Bookmark, Report, Block, PostView, JournalEntry, Message
from config import Config
import cloudinary
import cloudinary.uploader
from itsdangerous import URLSafeTimedSerializer
from datetime import datetime, timedelta
import re
import pytz

# ── Application Factory ───────────────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ── Extensions ────────────────────────────────────────────────────────────────
db.init_app(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)
csrf = CSRFProtect(app)
mail = Mail(app)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

if app.config.get('CLOUDINARY_CLOUD_NAME'):
    cloudinary.config(
        cloud_name = app.config['CLOUDINARY_CLOUD_NAME'],
        api_key    = app.config['CLOUDINARY_API_KEY'],
        api_secret = app.config['CLOUDINARY_API_SECRET']
    )

serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
login_manager = LoginManager(app)
login_manager.login_view = 'login'


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ── Helper Functions ──────────────────────────────────────────────────────────

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def get_current_user():
    username = session.get("user")
    if not username:
        return None
    return User.query.filter_by(username=username).first()


def save_uploaded_image(file):
    if not file or file.filename == "":
        return None
    if not allowed_image(file.filename):
        raise ValueError("Only png, jpg, jpeg, gif and webp images are allowed")
    original_name = secure_filename(file.filename)
    extension = original_name.rsplit('.', 1)[1].lower()
    filename = f"{uuid4().hex}.{extension}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return url_for('static', filename=f'uploads/{filename}')


def save_image_cloudinary(file):
    if not file or file.filename == "":
        return None
    if not allowed_image(file.filename):
        raise ValueError("Only png, jpg, jpeg, gif and webp images are allowed")
    if app.config.get('CLOUDINARY_CLOUD_NAME'):
        result = cloudinary.uploader.upload(
            file,
            folder="coffee_social_hub",
            transformation=[
                {'width': 1080, 'height': 1080, 'crop': 'limit'},
                {'quality': 'auto'},
                {'fetch_format': 'auto'}
            ]
        )
        return result['secure_url']
    else:
        return save_uploaded_image(file)


def delete_uploaded_image(image_path):
    if not image_path or not image_path.startswith('/static/uploads/'):
        return
    filename = os.path.basename(image_path)
    if not filename:
        return
    upload_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
    target_path = os.path.abspath(os.path.join(upload_dir, filename))
    if os.path.commonpath([upload_dir, target_path]) != upload_dir:
        return
    if os.path.exists(target_path):
        os.remove(target_path)


def serialize_post(post):
    return {
        "id":         post.id,
        "username":   post.author.username,
        "owner":      post.author.username,
        "avatar":     post.author.avatar or "",
        "text":       post.text,
        "shop":       post.shop or "",
        "image":      post.image or "",
        "likes":      post.likes or 0,
        "liked_by":   post.liked_by.split(",") if post.liked_by else [],
        "view_count": post.view_count or 0,
        "hashtags":   post.hashtags.split(",") if post.hashtags else [],
        "comments": [
            {
                "id":       c.id,
                "username": c.username,
                "text":     c.text,
                "time":     c.created_at.isoformat()
            }
            for c in post.comments
        ],
        "created_at": post.created_at.isoformat(),
        "time":       f"post-{post.id}"
    }


# ── XP System ─────────────────────────────────────────────────────────────────

XP_VALUES = {
    'post':          10,
    'review':        15,
    'like_given':     2,
    'like_received':  5,
    'comment':        3,
    'follower':       8,
}


def award_xp(user, action):
    points = XP_VALUES.get(action, 0)
    if points == 0:
        return
    user.xp = (user.xp or 0) + points
    user.check_and_award_badges()
    db.session.commit()


# ── Email Helpers ─────────────────────────────────────────────────────────────

def send_verification_email(user):
    token = serializer.dumps(user.email, salt='email-verify')
    verify_url = url_for('verify_email', token=token, _external=True)
    msg = Message(
        subject='Verify your Coffee Social Hub account',
        recipients=[user.email],
        html=f'''
        <h2>Welcome to Coffee Social Hub!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="{verify_url}" style="
            background:#c47a2b;color:white;padding:12px 24px;
            border-radius:8px;text-decoration:none;font-weight:bold;">
            Verify Email
        </a>
        <p>This link expires in 1 hour.</p>
        '''
    )
    mail.send(msg)


def send_password_reset_email(user):
    token = serializer.dumps(user.email, salt='password-reset')
    reset_url = url_for('reset_password', token=token, _external=True)
    msg = Message(
        subject='Reset your Coffee Social Hub password',
        recipients=[user.email],
        html=f'''
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_url}" style="
            background:#c47a2b;color:white;padding:12px 24px;
            border-radius:8px;text-decoration:none;font-weight:bold;">
            Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        '''
    )
    mail.send(msg)


# ── Cafe Data ─────────────────────────────────────────────────────────────────

CAFE_HOURS = {
    'Blacklist Coffee Roasters': {'open': 7.0,  'close': 15.0, 'days': [0,1,2,3,4]},
    'La Veen Coffee':            {'open': 6.5,  'close': 14.5, 'days': [0,1,2,3,4,5]},
    'Venn Coffee':               {'open': 7.0,  'close': 16.0, 'days': [0,1,2,3,4,5]},
    'Harvest Espresso':          {'open': 6.5,  'close': 14.0, 'days': [0,1,2,3,4,5,6]},
    'Telegram Cafe':             {'open': 7.0,  'close': 14.5, 'days': [0,1,2,3,4,5]},
    'Satchmo':                   {'open': 7.0,  'close': 15.0, 'days': [0,1,2,3,4,5,6]},
    'Mary Street Bakery':        {'open': 7.0,  'close': 15.0, 'days': [0,1,2,3,4,5,6]},
}

CAFES = [
    {
        "name": "Blacklist Coffee Roasters",
        "location": "Welshpool",
        "rating": "4.8",
        "hours": "7:00 AM - 3:00 PM",
        "open": True,
        "pet": False,
        "cold_brew": True,
        "pour_over": False,
        "tags": ["Cold Brew"],
        "route": "shop_blacklist"
    },
    {
        "name": "La Veen Coffee",
        "location": "Perth CBD",
        "rating": "4.6",
        "hours": "6:30 AM - 2:30 PM",
        "open": True,
        "pet": False,
        "cold_brew": False,
        "pour_over": True,
        "tags": ["Pour Over"],
        "route": "shop_laveen"
    },
    {
        "name": "Venn Coffee",
        "location": "Subiaco",
        "rating": "4.7",
        "hours": "7:00 AM - 4:00 PM",
        "open": True,
        "pet": True,
        "cold_brew": False,
        "pour_over": False,
        "tags": ["Pet Friendly"],
        "route": "shop_venn"
    },
    {
        "name": "Harvest Espresso",
        "location": "Leederville",
        "rating": "4.7",
        "hours": "6:30 AM - 2:00 PM",
        "open": True,
        "pet": False,
        "cold_brew": True,
        "pour_over": True,
        "tags": ["Cold Brew", "Pour Over"],
        "route": "shop_harvest"
    },
    {
        "name": "Telegram Cafe",
        "location": "Northbridge",
        "rating": "4.5",
        "hours": "7:00 AM - 2:30 PM",
        "open": True,
        "pet": False,
        "cold_brew": False,
        "pour_over": True,
        "tags": ["Pour Over"],
        "route": "shop_telegram"
    },
    {
        "name": "Satchmo",
        "location": "Mount Lawley",
        "rating": "4.6",
        "hours": "7:00 AM - 3:00 PM",
        "open": True,
        "pet": True,
        "cold_brew": False,
        "pour_over": False,
        "tags": ["Pet Friendly"],
        "route": "shop_satchmo"
    },
    {
        "name": "Mary Street Bakery",
        "location": "Perth CBD",
        "rating": "4.4",
        "hours": "7:00 AM - 3:00 PM",
        "open": True,
        "pet": False,
        "cold_brew": True,
        "pour_over": False,
        "tags": ["Cold Brew"],
        "route": "shop_marystreet"
    }
]


@app.context_processor
def inject_cafes():
    import pytz
    perth = pytz.timezone('Australia/Perth')
    now   = datetime.now(perth)
    hour  = now.hour
    day   = now.weekday()

    cafes_with_status = []
    for cafe in CAFES:
        hours = CAFE_HOURS.get(cafe['name'])
        if hours:
            is_open = day in hours['days'] and hours['open'] <= hour < hours['close']
        else:
            is_open = cafe.get('open', False)
        c = dict(cafe)
        c['open'] = is_open
        cafes_with_status.append(c)

    trending_cafes = sorted(cafes_with_status, key=lambda c: float(c["rating"]), reverse=True)[:3]
    return {"cafes": cafes_with_status, "trending_cafes": trending_cafes}


# ── Auth Routes ───────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
@limiter.limit("10 per minute", methods=["POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password")

        if not username or not password:
            return redirect(url_for("login", error="Please fill all fields"))

        user = User.query.filter_by(username=username).first()

        if user and bcrypt.check_password_hash(user.password, password):
            if not user.is_verified:
                return redirect(url_for("login", error="Please verify your email before signing in"))
            login_user(user)
            session["user"] = username
            return redirect(url_for("home"))
        else:
            return redirect(url_for("login", error="Invalid username or password"))

    error   = request.args.get("error")
    message = request.args.get("message")
    return render_template("login.html", error=error, message=message)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username         = request.form.get("username", "").strip()
        email            = request.form.get("email", "").strip().lower()
        password         = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        if not username or not email or not password or not confirm_password:
            return redirect(url_for("signup", error="Please fill all fields"))
        if password != confirm_password:
            return redirect(url_for("signup", error="Passwords do not match"))
        if User.query.filter(db.func.lower(User.username) == username.lower()).first():
            return redirect(url_for("signup", error="Username already exists"))
        if User.query.filter(db.func.lower(User.email) == email).first():
            return redirect(url_for("signup", error="Email already registered"))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            username=username,
            password=hashed_password,
            email=email,
            is_verified=False
        )
        db.session.add(new_user)
        db.session.commit()

        try:
            send_verification_email(new_user)
            return redirect(url_for(
                "login",
                message="Account created. Please check your email to verify before signing in."
            ))
        except Exception as e:
            print(f"Verification email error: {e}")
            return redirect(url_for(
                "login",
                error="Account created, but verification email could not be sent. Please contact admin."
            ))

    error = request.args.get("error")
    return render_template("signup.html", error=error)


@app.route("/logout")
def logout():
    logout_user()
    session.pop("user", None)
    return redirect(url_for("login"))


@app.route("/user/<username>")
def public_profile(username):
    current_username = session.get("user")
    if not current_username:
        return redirect(url_for("login"))
    if current_username == username:
        return redirect(url_for("profile"))

    profile_user = User.query.filter_by(username=username).first()
    if not profile_user:
        return "User not found", 404

    current = get_current_user()
    # Check if current user blocked this person
    # Current user blocked this person
    is_blocked = Block.query.filter_by(
        blocker_id=current.id,
        blocked_id=profile_user.id
    ).first()
    if is_blocked:
        return render_template("blocked.html",
            username=username, i_blocked=True)

    # This person blocked current user
    they_blocked_me = Block.query.filter_by(
        blocker_id=profile_user.id,
        blocked_id=current.id
    ).first()
    if they_blocked_me:
        return render_template("blocked.html",
            username=username, i_blocked=False)

    posts       = Post.query.filter_by(user_id=profile_user.id)\
        .order_by(Post.created_at.desc()).all()
    total_likes = sum(post.likes for post in posts)
    return render_template(
        "user-profile.html",
        profile_user=profile_user,
        posts=posts,
        total_likes=total_likes
    )


# ── Main Page Routes ──────────────────────────────────────────────────────────

@app.route("/landing")
def landing():
    return render_template("index.html")


@app.route("/home")
@login_required
def home():
    try:
        now = datetime.utcnow()
        due = Post.query.filter(
            Post.is_published == False,
            Post.scheduled_at.isnot(None),
            Post.scheduled_at <= now
        ).all()
        for p in due:
            p.is_published = True
        if due:
            db.session.commit()
            print(f"Auto-published {len(due)} scheduled posts")
    except Exception as e:
        print(f"Schedule publish error: {e}")
    return render_template("home.html")


@app.route("/profile")
@login_required
def profile():
    return render_template("profile.html")


@app.route("/social")
@login_required
def social():
    return render_template("social.html")


@app.route("/brew")
@login_required
def brew():
    return render_template("brew.html")


@app.route("/map")
@login_required
def cafe_map():
    return render_template("map.html")


@app.route("/explore")
@login_required
def explore():
    return render_template("explore.html")


@app.route("/bookmarks")
@login_required
def bookmarks():
    return render_template("bookmarks.html")


@app.route("/notifications")
@login_required
def notifications():
    return render_template("notifications.html")


@app.route("/leaderboard")
@login_required
def leaderboard_page():
    return render_template("leaderboard.html")


@app.route("/journal")
@login_required
def journal_page():
    return render_template("journal.html")


@app.route("/quiz")
@login_required
def quiz_page():
    return render_template("quiz.html")


@app.route("/search")
@login_required
def search_page():
    query = request.args.get("q", "").strip()
    return render_template("search.html", query=query)


@app.route("/hashtag/<tag>")
@login_required
def hashtag_page(tag):
    return render_template("hashtag.html", tag=tag)


@app.route("/post/<int:post_id>")
@login_required
def post_detail(post_id):
    post = Post.query.get_or_404(post_id)
    return render_template("post-detail.html", post=post)


@app.route("/offline")
def offline():
    return render_template("offline.html")


# ── Shop Routes ───────────────────────────────────────────────────────────────

@app.route("/shop/blacklist")
@login_required
def shop_blacklist():
    return render_template("shop-blacklist.html")


@app.route("/shop/laveen")
@login_required
def shop_laveen():
    return render_template("shop-laveen.html")


@app.route("/shop/venn")
@login_required
def shop_venn():
    return render_template("shop-venn.html")


@app.route("/shop/harvest")
@login_required
def shop_harvest():
    return render_template("shop-harvest.html")


@app.route("/shop/telegram")
@login_required
def shop_telegram():
    return render_template("shop-telegram.html")


@app.route("/shop/satchmo")
@login_required
def shop_satchmo():
    return render_template("shop-satchmo.html")


@app.route("/shop/marystreet")
@login_required
def shop_marystreet():
    return render_template("shop-marystreet.html")


@app.route("/cafe/<cafe_name>")
@login_required
def cafe_feed(cafe_name):
    cafe = next((c for c in CAFES if c["name"] == cafe_name), None)
    if not cafe:
        return redirect(url_for("home"))
    return render_template("cafe-feed.html", cafe=cafe)


# ── Admin Routes ──────────────────────────────────────────────────────────────

@app.route("/admin")
@login_required
def admin_dashboard():
    current = User.query.filter_by(username=session.get("user")).first()
    if not current or not current.is_admin:
        return redirect(url_for("home"))
    reports = Report.query.order_by(Report.created_at.desc()).all()
    report_data = []
    for r in reports:
        post = Post.query.get(r.post_id)
        report_data.append({
            "report":   r,
            "post":     post,
            "reporter": r.reporter
        })
    users = User.query.order_by(User.created_at.desc()).all()
    return render_template("admin.html",
        reports=report_data,
        users=users,
        total_posts=Post.query.count(),
        total_users=User.query.count(),
        total_reports=Report.query.count()
    )


# ── PWA ───────────────────────────────────────────────────────────────────────

@app.route("/manifest.json")
def manifest():
    return jsonify({
        "name": "Coffee Social Hub",
        "short_name": "CoffeeHub",
        "description": "Perth's coffee community",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#1a0e00",
        "theme_color": "#c47a2b",
        "orientation": "portrait",
        "icons": [
            {"src": "/static/images/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/static/images/icon-512.png",  "sizes": "512x512",  "type": "image/png"}
        ]
    })


# ── Email Verification / Password Reset ───────────────────────────────────────

@app.route("/verify/<token>")
def verify_email(token):
    try:
        email = serializer.loads(token, salt='email-verify', max_age=3600)
    except:
        return render_template("verify.html", status='invalid')
    user = User.query.filter_by(email=email).first()
    if user:
        user.is_verified = True
        db.session.commit()
        return render_template("verify.html", status='success')
    return render_template("verify.html", status='invalid')


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        user  = User.query.filter_by(email=email).first()
        if user:
            try:
                send_password_reset_email(user)
            except Exception as e:
                print(f"Email error: {e}")
        return render_template("forgot-password.html", sent=True)
    return render_template("forgot-password.html", sent=False)


@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    try:
        email = serializer.loads(token, salt='password-reset', max_age=3600)
    except:
        return render_template("reset-password.html", status='invalid')
    if request.method == "POST":
        password = request.form.get("password", "")
        confirm  = request.form.get("confirm_password", "")
        if password != confirm:
            return render_template("reset-password.html",
                status='form', token=token, error="Passwords do not match")
        user = User.query.filter_by(email=email).first()
        if user:
            user.password = bcrypt.generate_password_hash(password).decode('utf-8')
            db.session.commit()
            return render_template("reset-password.html", status='success')
    return render_template("reset-password.html", status='form', token=token)


# ── Avatar API ────────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/avatar", methods=["GET", "POST", "DELETE"])
def api_avatar():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    if request.method == "GET":
        return jsonify({"avatar": user.avatar or ""})
    if request.method == "DELETE":
        delete_uploaded_image(user.avatar)
        user.avatar = None
        db.session.commit()
        return jsonify({"avatar": ""})
    file = request.files.get("avatar")
    if not file:
        return jsonify({"error": "No avatar file uploaded"}), 400
    try:
        old_avatar  = user.avatar
        user.avatar = save_image_cloudinary(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    db.session.commit()
    delete_uploaded_image(old_avatar)
    return jsonify({"avatar": user.avatar})


# ── Posts API ─────────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/posts", methods=["GET", "POST"])
def api_posts():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401

    if request.method == "GET":
        blocked_ids = [b.blocked_id for b in Block.query.filter_by(blocker_id=user.id).all()]
        query = Post.query.filter(
            (Post.is_published == True) | (Post.is_published == None)
        )
        if blocked_ids:
            query = query.filter(~Post.user_id.in_(blocked_ids))
        posts = query.order_by(Post.created_at.desc()).all()
        return jsonify([serialize_post(post) for post in posts])

    text       = request.form.get("text", "").strip()
    shop       = request.form.get("shop", "").strip()
    image_file = request.files.get("image")
    if not text:
        return jsonify({"error": "Post text is required"}), 400
    try:
        image_path = save_image_cloudinary(image_file) if image_file else None
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    tags = re.findall(r'#(\w+)', text)
    post = Post(text=text, shop=shop, image=image_path, author=user, hashtags=",".join(tags))
    db.session.add(post)
    db.session.commit()

    mentions = re.findall(r'@(\w+)', text)
    for mentioned_username in set(mentions):
        if mentioned_username == user.username:
            continue
        mentioned_user = User.query.filter_by(username=mentioned_username).first()
        if mentioned_user:
            db.session.add(Notification(
                user_id=mentioned_user.id,
                actor_id=user.id,
                type='comment',
                post_id=post.id
            ))
    db.session.commit()

    award_xp(user, 'post')
    return jsonify(serialize_post(post)), 201


@csrf.exempt
@app.route("/api/posts/cafe/<cafe_name>", methods=["GET"])
def api_cafe_posts(cafe_name):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    posts = Post.query.filter_by(shop=cafe_name).order_by(Post.created_at.desc()).all()
    return jsonify([serialize_post(post) for post in posts])


@csrf.exempt
@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def api_delete_post(post_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    post = Post.query.get_or_404(post_id)
    if post.author != user:
        return jsonify({"error": "You can only delete your own posts"}), 403
    image_path = post.image
    db.session.delete(post)
    db.session.commit()
    delete_uploaded_image(image_path)
    return jsonify({"deleted": True})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/like", methods=["POST"])
def like_post(post_id):
    current_username = session.get("user")
    if not current_username:
        return jsonify({"error": "Unauthorized"}), 401
    post        = Post.query.get_or_404(post_id)
    current     = User.query.filter_by(username=current_username).first()
    liked_users = [u for u in post.liked_by.split(",") if u] if post.liked_by else []
    if current_username in liked_users:
        liked_users.remove(current_username)
        post.likes = max(post.likes - 1, 0)
        liked = False
    else:
        liked_users.append(current_username)
        post.likes += 1
        liked = True
        if current and post.user_id != current.id:
            db.session.add(Notification(
                user_id=post.user_id, actor_id=current.id,
                type='like', post_id=post.id
            ))
    post.liked_by = ",".join(filter(None, liked_users))
    db.session.commit()
    if liked:
        liker = get_current_user()
        if liker:
            award_xp(liker, 'like_given')
        post_author = User.query.get(post.user_id)
        if post_author:
            award_xp(post_author, 'like_received')
    return jsonify({"likes": post.likes, "liked": liked})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/comment", methods=["POST"])
def add_comment(post_id):
    current_username = session.get("user")
    if not current_username:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Comment cannot be empty"}), 400
    new_comment = Comment(post_id=post_id, username=current_username, text=text)
    db.session.add(new_comment)
    post           = Post.query.get_or_404(post_id)
    comment_author = User.query.filter_by(username=current_username).first()

    # Notify post owner
    if comment_author and comment_author.id != post.user_id:
        db.session.add(Notification(
            user_id=post.user_id, actor_id=comment_author.id,
            type='comment', post_id=post.id
        ))

    # Notify mentioned users
    import re as _re
    mentions = _re.findall(r'@(\w+)', text)
    for mentioned_username in set(mentions):
        if mentioned_username == current_username:
            continue
        mentioned_user = User.query.filter_by(
            username=mentioned_username
        ).first()
        if mentioned_user and mentioned_user.id != post.user_id:
            db.session.add(Notification(
                user_id=mentioned_user.id,
                actor_id=comment_author.id,
                type='comment',
                post_id=post.id
            ))

    db.session.commit()
    if comment_author:
        award_xp(comment_author, 'comment')
    return jsonify({"message": "Comment added", "comment_id": new_comment.id})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/edit", methods=["PUT"])
def edit_post(post_id):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    post = Post.query.get_or_404(post_id)
    if post.author.username != current.username:
        return jsonify({"error": "You can only edit your own posts"}), 403
    data     = request.get_json()
    new_text = data.get("text", "").strip()
    if not new_text:
        return jsonify({"error": "Caption cannot be empty"}), 400
    old_text      = post.text or ""
    post.text     = new_text
    post.hashtags = ",".join(re.findall(r'#(\w+)', new_text))
    db.session.commit()

    # Notify newly mentioned users (not already mentioned in old text)
    old_mentions = set(re.findall(r'@(\w+)', old_text))
    new_mentions = set(re.findall(r'@(\w+)', new_text))
    added_mentions = new_mentions - old_mentions

    for mentioned_username in added_mentions:
        if mentioned_username == current.username:
            continue
        mentioned_user = User.query.filter_by(
            username=mentioned_username
        ).first()
        if mentioned_user:
            db.session.add(Notification(
                user_id=mentioned_user.id,
                actor_id=current.id,
                type='mention',
                post_id=post.id
            ))
    db.session.commit()

    return jsonify({"text": post.text, "hashtags": post.hashtags})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/view", methods=["POST"])
def increment_view(post_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    post          = Post.query.get_or_404(post_id)
    existing_view = PostView.query.filter_by(post_id=post.id, user_id=user.id).first()
    if not existing_view:
        db.session.add(PostView(post_id=post.id, user_id=user.id))
        post.view_count = (post.view_count or 0) + 1
        db.session.commit()
    return jsonify({"view_count": post.view_count or 0})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/report", methods=["POST"])
def report_post(post_id):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    data   = request.get_json()
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "Reason required"}), 400
    if Report.query.filter_by(post_id=post_id, reporter=current.username).first():
        return jsonify({"error": "Already reported"}), 400
    db.session.add(Report(post_id=post_id, reporter=current.username, reason=reason))
    db.session.commit()
    return jsonify({"message": "Post reported"})


@app.route("/api/posts/trending", methods=["GET"])
def trending_posts():
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    posts = Post.query.filter(
        Post.created_at >= one_week_ago
    ).order_by(Post.likes.desc()).limit(10).all()
    return jsonify([serialize_post(p) for p in posts])


@app.route("/api/posts/hashtag/<tag>", methods=["GET"])
def posts_by_hashtag(tag):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    posts = Post.query.filter(
        Post.hashtags.contains(tag)
    ).order_by(Post.created_at.desc()).all()
    return jsonify([serialize_post(p) for p in posts])


# ── Comments API ──────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/comments/<int:comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "Not found"}), 404
    if comment.username != current_user and comment.post.author.username != current_user:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(comment)
    db.session.commit()
    return jsonify({"message": "Deleted"})


@csrf.exempt
@app.route("/api/comments/<int:comment_id>", methods=["PUT"])
def edit_comment(comment_id):
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "Not found"}), 404
    if comment.username != current_user:
        return jsonify({"error": "Unauthorized"}), 403
    data         = request.get_json()
    comment.text = data.get("text")
    db.session.commit()
    return jsonify({"message": "Updated"})


# ── Reviews API ───────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/reviews", methods=["POST"])
def submit_review():
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    data   = request.json
    shop   = data.get("shop")
    rating = data.get("rating")
    text   = data.get("text")
    if not shop or not rating or not text:
        return jsonify({"error": "Missing fields"}), 400
    if Review.query.filter_by(username=current_user, shop=shop).first():
        return jsonify({"error": "You have already reviewed this cafe"}), 400
    db.session.add(Review(username=current_user, shop=shop, rating=rating, text=text))
    db.session.commit()
    current_user_obj = get_current_user()
    if current_user_obj:
        award_xp(current_user_obj, 'review')
    return jsonify({"message": "Review submitted"}), 201


@csrf.exempt
@app.route("/api/reviews/shop/<shop_name>", methods=["GET"])
def get_shop_reviews(shop_name):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    reviews = Review.query.filter_by(shop=shop_name).order_by(Review.created_at.desc()).all()
    return jsonify([{
        "id":         r.id,
        "shop":       r.shop,
        "rating":     r.rating,
        "text":       r.text,
        "username":   r.username,
        "created_at": r.created_at.isoformat()
    } for r in reviews])


@csrf.exempt
@app.route("/api/reviews/<username>", methods=["GET"])
def get_user_reviews(username):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    reviews = Review.query.filter_by(username=username).order_by(Review.created_at.desc()).all()
    return jsonify([{
        "id":         r.id,
        "shop":       r.shop,
        "rating":     r.rating,
        "text":       r.text,
        "username":   r.username,
        "created_at": r.created_at.isoformat()
    } for r in reviews])


@csrf.exempt
@app.route("/api/reviews/<int:review_id>", methods=["DELETE"])
def delete_review(review_id):
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    review = Review.query.get(review_id)
    if not review:
        return jsonify({"error": "Not found"}), 404
    if review.username != current_user:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(review)
    db.session.commit()
    return jsonify({"message": "Deleted"})


# ── Follow API ────────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/follow/<username>", methods=["POST"])
def follow_user(username):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    target = User.query.filter_by(username=username).first_or_404()
    if current.id == target.id:
        return jsonify({"error": "Cannot follow yourself"}), 400
    existing = Follow.query.filter_by(follower_id=current.id, followed_id=target.id).first()
    if existing:
        db.session.delete(existing)
        Notification.query.filter_by(
            user_id=target.id, actor_id=current.id, type='follow'
        ).delete()
        db.session.commit()
        return jsonify({"following": False, "followers": target.follower_count()})
    else:
        db.session.add(Follow(follower_id=current.id, followed_id=target.id))
        db.session.add(Notification(user_id=target.id, actor_id=current.id, type='follow'))
        db.session.commit()
        award_xp(target, 'follower')
        return jsonify({"following": True, "followers": target.follower_count()})


@app.route("/api/followers/<username>", methods=["GET"])
def get_followers(username):
    user      = User.query.filter_by(username=username).first_or_404()
    followers = Follow.query.filter_by(followed_id=user.id).all()
    return jsonify([{"username": f.follower.username, "avatar": f.follower.avatar} for f in followers])


@app.route("/api/following/<username>", methods=["GET"])
def get_following(username):
    user      = User.query.filter_by(username=username).first_or_404()
    following = Follow.query.filter_by(follower_id=user.id).all()
    return jsonify([{"username": f.followed.username, "avatar": f.followed.avatar} for f in following])


# ── Block API ─────────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/block/<username>", methods=["POST"])
def block_user(username):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    target = User.query.filter_by(username=username).first_or_404()
    if current.id == target.id:
        return jsonify({"error": "Cannot block yourself"}), 400
    existing = Block.query.filter_by(blocker_id=current.id, blocked_id=target.id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"blocked": False})
    db.session.add(Block(blocker_id=current.id, blocked_id=target.id))
    follow = Follow.query.filter_by(follower_id=current.id, followed_id=target.id).first()
    if follow:
        db.session.delete(follow)
    db.session.commit()
    return jsonify({"blocked": True})


@app.route("/api/blocked-users", methods=["GET"])
def get_blocked_users():
    current = get_current_user()
    if not current:
        return jsonify([])
    blocks = Block.query.filter_by(blocker_id=current.id).all()
    return jsonify([
        {"username": User.query.get(b.blocked_id).username}
        for b in blocks if User.query.get(b.blocked_id)
    ])


# ── Notifications API ─────────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    notifs = Notification.query.filter_by(
        user_id=current.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    result = [{
        "id":           n.id,
        "type":         n.type,
        "actor":        n.actor.username,
        "actor_avatar": n.actor.avatar,
        "post_id":      n.post_id,
        "is_read":      n.is_read,
        "created_at":   n.created_at.isoformat()
    } for n in notifs]
    Notification.query.filter_by(user_id=current.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify(result)


@app.route("/api/notifications/count", methods=["GET"])
@limiter.limit("200 per hour")
def notification_count():
    current = get_current_user()
    if not current:
        return jsonify({"count": 0})
    return jsonify({"count": current.unread_notifications()})


# ── Bookmarks API ─────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/bookmarks/<int:post_id>", methods=["POST"])
def toggle_bookmark(post_id):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    existing = Bookmark.query.filter_by(user_id=current.id, post_id=post_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"bookmarked": False})
    db.session.add(Bookmark(user_id=current.id, post_id=post_id))
    db.session.commit()
    return jsonify({"bookmarked": True})


@app.route("/api/bookmarks", methods=["GET"])
def get_bookmarks():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    bookmarks = Bookmark.query.filter_by(
        user_id=current.id
    ).order_by(Bookmark.created_at.desc()).all()
    posts = []
    for b in bookmarks:
        post = Post.query.get(b.post_id)
        if post:
            posts.append(serialize_post(post))
    return jsonify(posts)


# ── Search API ────────────────────────────────────────────────────────────────

@app.route("/api/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"users": [], "cafes": []})
    users = User.query.filter(User.username.ilike(f"%{query}%")).limit(10).all()
    return jsonify({
        "users": [{
            "username":  u.username,
            "avatar":    u.avatar,
            "bio":       u.bio,
            "followers": u.follower_count()
        } for u in users],
        "cafes": [c for c in CAFES if query.lower() in c["name"].lower()]
    })


# ── Feed & Suggestions API ────────────────────────────────────────────────────

@app.route("/api/feed/following", methods=["GET"])
def following_feed():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    following_ids = [f.followed_id for f in Follow.query.filter_by(follower_id=current.id).all()]
    following_ids.append(current.id)
    posts = Post.query.filter(
        Post.user_id.in_(following_ids)
    ).order_by(Post.created_at.desc()).limit(20).all()
    return jsonify([serialize_post(p) for p in posts])


@app.route("/api/suggested-users", methods=["GET"])
def suggested_users():
    current = get_current_user()
    if not current:
        return jsonify([])

    following_ids = [
        f.followed_id for f in
        Follow.query.filter_by(follower_id=current.id).all()
    ]
    following_ids.append(current.id)

    blocked_by_me = [
        b.blocked_id for b in
        Block.query.filter_by(blocker_id=current.id).all()
    ]

    blocked_me = [
        b.blocker_id for b in
        Block.query.filter_by(blocked_id=current.id).all()
    ]

    exclude_ids = list(set(following_ids + blocked_by_me + blocked_me))

    suggested = User.query.filter(
        ~User.id.in_(exclude_ids)
    ).order_by(db.func.random()).limit(5).all()

    return jsonify([{
        "username":  u.username,
        "avatar":    u.avatar,
        "bio":       u.bio,
        "followers": u.follower_count()
    } for u in suggested])


@app.route("/api/suggested-users/sidebar", methods=["GET"])
def suggested_users_sidebar():
    current = get_current_user()
    if not current:
        return jsonify([])

    following_ids = [
        f.followed_id for f in
        Follow.query.filter_by(follower_id=current.id).all()
    ]
    following_ids.append(current.id)

    # Users current user blocked
    blocked_by_me = [
        b.blocked_id for b in
        Block.query.filter_by(blocker_id=current.id).all()
    ]

    # Users who blocked current user
    blocked_me = [
        b.blocker_id for b in
        Block.query.filter_by(blocked_id=current.id).all()
    ]

    exclude_ids = list(set(following_ids + blocked_by_me + blocked_me))

    suggested = User.query.filter(
        ~User.id.in_(exclude_ids)
    ).order_by(db.func.random()).limit(5).all()

    return jsonify([{
        "username":  u.username,
        "avatar":    u.avatar or "",
        "bio":       u.bio or "",
        "followers": u.follower_count(),
        "level":     u.get_level()["title"]
    } for u in suggested])

# ── Hashtags API ──────────────────────────────────────────────────────────────

@app.route("/api/hashtags/trending", methods=["GET"])
def trending_hashtags():
    from collections import Counter
    posts    = Post.query.filter(Post.hashtags != "", Post.hashtags != None).all()
    all_tags = []
    for post in posts:
        if post.hashtags:
            all_tags.extend(post.hashtags.split(","))
    tag_counts = Counter(all_tags).most_common(10)
    return jsonify([{"tag": tag, "count": count} for tag, count in tag_counts if tag])


# ── Profile API ───────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/profile/edit", methods=["POST"])
def edit_profile():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    data     = request.get_json()
    email    = (data.get("email") or "").strip().lower()
    bio      = data.get("bio", current.bio)
    website  = data.get("website", current.website)
    location = data.get("location", current.location)

    # Update non-email fields immediately
    current.bio      = bio
    current.website  = website
    current.location = location

    message = "Profile updated ✓"

    # Only process email if it changed
    if email and email != (current.email or "").lower():
        existing = User.query.filter(
            db.func.lower(User.email) == email,
            User.id != current.id
        ).first()
        if existing:
            db.session.commit()
            return jsonify({"error": "Email already registered"}), 400

        # Store new email in a pending field — do NOT update current.email yet
        # Send verification to new email
        try:
            token = serializer.dumps(
                f"{current.id}:{email}",
                salt='new-email-verify'
)
            verify_url = url_for('verify_new_email', token=token, _external=True)
            msg = Message(
                subject='Verify your new email — Coffee Social Hub',
                recipients=[email],
                html=f'''
                <h2>Email Change Request</h2>
                <p>Click below to verify your new email address:</p>
                <a href="{verify_url}" style="
                    background:#c47a2b;color:white;padding:12px 24px;
                    border-radius:8px;text-decoration:none;font-weight:bold;">
                    Verify New Email
                </a>
                <p>Your old email remains active until you verify this one.</p>
                <p>This link expires in 1 hour.</p>
                '''
            )
            mail.send(msg)
            message = "Profile updated. Verification email sent to new address — your email will update once verified."
        except Exception as e:
            print(f"Email error: {e}")
            message = "Profile updated. Could not send verification email — email unchanged."

    db.session.commit()
    return jsonify({
        "bio":      current.bio,
        "website":  current.website,
        "location": current.location,
        "email":    current.email,
        "message":  message
    })


@app.route("/api/profile/xp", methods=["GET"])
def get_profile_xp():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    level_info = current.get_level()
    return jsonify({
        "xp":     current.xp or 0,
        "level":  level_info["level"],
        "title":  level_info["title"],
        "next":   level_info["next"],
        "badges": current.get_badges()
    })


@app.route("/api/profile/completion", methods=["GET"])
def profile_completion():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    fields = {
        "Avatar":   bool(current.avatar),
        "Bio":      bool(current.bio),
        "Website":  bool(current.website),
        "Location": bool(current.location),
        "Email":    bool(current.email),
        "Post":     len(current.posts) > 0,
        "Review":   Review.query.filter_by(username=current.username).count() > 0,
        "Follow":   current.following_count() > 0,
    }
    completed = sum(1 for v in fields.values() if v)
    total     = len(fields)
    percent   = round((completed / total) * 100)
    return jsonify({
        "percent":   percent,
        "completed": completed,
        "total":     total,
        "missing":   [k for k, v in fields.items() if not v]
    })


@app.route("/api/profile/analytics", methods=["GET"])
def profile_analytics():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    posts          = current.posts
    total_likes    = sum(p.likes for p in posts)
    total_views    = sum(p.view_count or 0 for p in posts)
    total_comments = sum(len(p.comments) for p in posts)
    best_post      = max(posts, key=lambda p: p.likes, default=None)
    cafe_counts    = {}
    for post in posts:
        if post.shop:
            cafe_counts[post.shop] = cafe_counts.get(post.shop, 0) + 1
    return jsonify({
        "total_posts":    len(posts),
        "total_likes":    total_likes,
        "total_views":    total_views,
        "total_comments": total_comments,
        "avg_likes":      round(total_likes / len(posts), 1) if posts else 0,
        "avg_views":      round(total_views / len(posts), 1) if posts else 0,
        "best_post":      serialize_post(best_post) if best_post else None,
        "cafe_breakdown": cafe_counts
    })


@app.route("/api/profile/activity", methods=["GET"])
def profile_activity():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    from datetime import date, timedelta
    today    = date.today()
    start    = today - timedelta(weeks=52)
    posts    = Post.query.filter(Post.user_id == current.id, Post.created_at >= start).all()
    activity = {}
    for post in posts:
        day = post.created_at.strftime('%Y-%m-%d')
        activity[day] = activity.get(day, 0) + 1
    return jsonify(activity)


# ── Leaderboard API ───────────────────────────────────────────────────────────

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    users  = User.query.order_by((User.xp or 0).desc()).limit(20).all()
    result = []
    for i, u in enumerate(users):
        level_info = u.get_level()
        result.append({
            "rank":        i + 1,
            "username":    u.username,
            "avatar":      u.avatar or "",
            "xp":          u.xp or 0,
            "xp_percent":  level_info.get("percent", 0),
            "level":       level_info["level"],
            "title":       level_info["title"],
            "badges":      u.get_badges(),
            "post_count":  len(u.posts),
        })
    return jsonify(result)


# ── Journal API ───────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/journal", methods=["GET", "POST"])
def journal():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    if request.method == "GET":
        entries = JournalEntry.query.filter_by(
            user_id=current.id
        ).order_by(JournalEntry.created_at.desc()).all()
        return jsonify([{
            "id":         e.id,
            "cafe":       e.cafe,
            "visit_date": e.visit_date,
            "brew_type":  e.brew_type,
            "mood":       e.mood,
            "rating":     e.rating,
            "notes":      e.notes,
            "created_at": e.created_at.isoformat()
        } for e in entries])
    data  = request.get_json()
    entry = JournalEntry(
        user_id    = current.id,
        cafe       = data.get("cafe", ""),
        visit_date = data.get("visit_date", ""),
        brew_type  = data.get("brew_type", ""),
        mood       = data.get("mood", ""),
        rating     = data.get("rating"),
        notes      = data.get("notes", "")
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Entry saved", "id": entry.id}), 201


@csrf.exempt
@app.route("/api/journal/<int:entry_id>", methods=["DELETE"])
def delete_journal_entry(entry_id):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    entry = JournalEntry.query.get_or_404(entry_id)
    if entry.user_id != current.id:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"deleted": True})


# ── Cafe Stats & Ratings API ──────────────────────────────────────────────────

@app.route("/api/cafe-stats/<cafe_name>", methods=["GET"])
def cafe_stats(cafe_name):
    reviews = Review.query.filter_by(shop=cafe_name).all()
    if not reviews:
        return jsonify({"average": 0, "count": 0, "breakdown": {}})
    avg       = sum(r.rating for r in reviews) / len(reviews)
    breakdown = {str(i): sum(1 for r in reviews if r.rating == i) for i in range(1, 6)}
    return jsonify({"average": round(avg, 1), "count": len(reviews), "breakdown": breakdown})


@app.route("/api/cafe-ratings", methods=["GET"])
def cafe_ratings():
    result = {}
    for cafe in CAFES:
        reviews = Review.query.filter_by(shop=cafe["name"]).all()
        if reviews:
            avg = sum(r.rating for r in reviews) / len(reviews)
            result[cafe["name"]] = {"average": round(avg, 1), "count": len(reviews)}
        else:
            result[cafe["name"]] = {"average": 0, "count": 0}
    return jsonify(result)


@app.route("/api/cafes/rated", methods=["GET"])
def rated_cafes():
    result = []
    for cafe in CAFES:
        reviews = Review.query.filter_by(shop=cafe["name"]).all()
        if reviews:
            avg = round(sum(r.rating for r in reviews) / len(reviews), 1)
            result.append({
                "name":     cafe["name"],
                "location": cafe["location"],
                "rating":   avg,
                "count":    len(reviews),
                "route":    cafe["route"]
            })
    result.sort(key=lambda x: x["rating"], reverse=True)
    return jsonify(result)


# ── Admin API ─────────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/admin/delete-post/<int:post_id>", methods=["DELETE"])
def admin_delete_post(post_id):
    current = get_current_user()
    if not current or not current.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    post = Post.query.get_or_404(post_id)
    Report.query.filter_by(post_id=post_id).delete()
    image_path = post.image
    db.session.delete(post)
    db.session.commit()
    delete_uploaded_image(image_path)
    return jsonify({"deleted": True})


@csrf.exempt
@app.route("/api/admin/dismiss-report/<int:report_id>", methods=["DELETE"])
def dismiss_report(report_id):
    current = get_current_user()
    if not current or not current.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    report = Report.query.get_or_404(report_id)
    db.session.delete(report)
    db.session.commit()
    return jsonify({"dismissed": True})


@csrf.exempt
@app.route("/api/admin/make-admin/<username>", methods=["POST"])
def make_admin(username):
    current = get_current_user()
    if not current or not current.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    user = User.query.filter_by(username=username).first_or_404()
    user.is_admin = True
    db.session.commit()
    return jsonify({"message": f"{username} is now admin"})

@app.route("/verify-new-email/<token>")
def verify_new_email(token):
    try:
        # Token contains "user_id:new_email"
        payload = serializer.loads(token, salt='new-email-verify', max_age=3600)
        user_id, new_email = payload.split(":", 1)
    except:
        return render_template("verify.html", status='invalid')

    user = User.query.get(int(user_id))
    if not user:
        return render_template("verify.html", status='invalid')

    # Check email not taken by someone else
    existing = User.query.filter(
        db.func.lower(User.email) == new_email.lower(),
        User.id != user.id
    ).first()
    if existing:
        return render_template("verify.html", status='invalid')

    user.email       = new_email
    user.is_verified = True
    db.session.commit()
    return render_template("verify.html", status='success')


    # ── WEEK 8 ROUTES ─────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/checkin/<cafe_name>", methods=["POST"])
def cafe_checkin(cafe_name):
    """Toggle check-in at a cafe"""
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401

    # Store checkins in a simple comma-separated field on User
    # We reuse the badges field pattern — store as "checkin:CafeName"
    checkins = [c for c in (current.badges or "").split(",") if c.startswith("checkin:")]
    checkin_key = f"checkin:{cafe_name}"

    badges_list = [b for b in (current.badges or "").split(",") if b]

    if checkin_key in badges_list:
        badges_list.remove(checkin_key)
        checked_in = False
    else:
        badges_list.append(checkin_key)
        checked_in = True

    current.badges = ",".join(badges_list)
    db.session.commit()

    # Count total checkins for this cafe
    total = User.query.filter(
        User.badges.contains(checkin_key)
    ).count()

    return jsonify({"checked_in": checked_in, "total": total})


@app.route("/api/checkin/<cafe_name>", methods=["GET"])
def get_checkin(cafe_name):
    """Get check-in status and count for a cafe"""
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401

    checkin_key = f"checkin:{cafe_name}"
    badges_list = [b for b in (current.badges or "").split(",") if b]
    checked_in  = checkin_key in badges_list

    total = User.query.filter(
        User.badges.contains(checkin_key)
    ).count()

    return jsonify({"checked_in": checked_in, "total": total})


@app.route('/api/cafe-status')
def cafe_status():
    perth = pytz.timezone('Australia/Perth')
    now   = datetime.now(perth)
    hour  = now.hour
    day   = now.weekday()  # 0=Monday 6=Sunday

    result = {}
    for cafe, hours in CAFE_HOURS.items():
        now_decimal = hour + now.minute / 60
        is_open = (
            day in hours['days'] and
            hours['open'] <= now_decimal < hours['close']
        )
        closes_in = None
        opens_in  = None

        if is_open:
            mins_left = int((hours['close'] - now_decimal) * 60)
            if mins_left <= 60:
                closes_in = mins_left
        else:
            if day in hours['days'] and now_decimal < hours['open']:
                opens_in = int((hours['open'] - now_decimal) * 60)

        def fmt_mins(m):
            if m is None: return None
            if m < 60: return f"{m}m"
            h = m // 60
            rem = m % 60
            return f"{h}h {rem}m" if rem else f"{h}h"

        def fmt_time(h):
            hour = int(h)
            mins = ':30' if h % 1 else ':00'
            period = 'PM' if hour >= 12 else 'AM'
            display = hour - 12 if hour > 12 else hour
            return f"{display}{mins} {period}"

        open_h  = hours['open']
        close_h = hours['close']
        result[cafe] = {
            'is_open':   is_open,
            'opens':     fmt_time(open_h),
            'closes':    fmt_time(close_h),
            'closes_in': fmt_mins(closes_in),
            'opens_in':  fmt_mins(opens_in),
        }

    return jsonify(result)

@csrf.exempt
@app.route('/api/posts/schedule', methods=['POST'])
def schedule_post():
    current = get_current_user()
    if not current:
        return jsonify({'error': 'Unauthorized'}), 401

    text         = request.form.get('text', '').strip()
    shop         = request.form.get('shop', '')
    scheduled_at = request.form.get('scheduled_at', '')
    image_file   = request.files.get('image')

    if not text:
        return jsonify({'error': 'Text required'}), 400

    try:
        sched_time = datetime.fromisoformat(scheduled_at.replace('T', ' '))
    except:
        return jsonify({'error': 'Invalid time'}), 400

    from datetime import timedelta as td
    perth_offset = td(hours=8)
    sched_time   = sched_time - perth_offset

    try:
        image_path = save_image_cloudinary(image_file) if image_file else None
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    tags = re.findall(r'#(\w+)', text)
    post = Post(
        user_id      = current.id,
        text         = text,
        shop         = shop or None,
        image        = image_path,
        scheduled_at = sched_time,
        is_published = False,
        hashtags     = ','.join(tags)
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({'message': 'Post scheduled', 'id': post.id})

@app.route('/api/posts/publish-scheduled')
def publish_scheduled():
    now = datetime.utcnow()
    due = Post.query.filter(
        Post.is_published == False,
        Post.scheduled_at <= now
    ).all()
    for post in due:
        post.is_published = True
    db.session.commit()
    return jsonify({'published': len(due)})

@csrf.exempt
@app.route("/api/admin/ban-user/<username>", methods=["POST"])
def ban_user(username):
    current = get_current_user()
    if not current or not current.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    user = User.query.filter_by(username=username).first_or_404()
    if user.is_admin:
        return jsonify({"error": "Cannot ban admin"}), 400
    user.is_verified = False
    db.session.commit()
    return jsonify({"message": f"{username} banned"})

# ── Messages API ──────────────────────────────────────────────────────────────

@app.route('/messages')
@login_required
def messages_page():
    return render_template('messages.html')


@app.route('/messages/<username>')
@login_required
def message_thread(username):
    other = User.query.filter_by(username=username).first_or_404()
    return render_template('messages.html', other_user=other.username)


@csrf.exempt
@app.route('/api/messages/<username>', methods=['GET'])
def get_messages(username):
    current = get_current_user()
    if not current:
        return jsonify({'error': 'Unauthorized'}), 401
    other = User.query.filter_by(username=username).first_or_404()

    messages = Message.query.filter(
        db.or_(
            db.and_(Message.sender_id == current.id,
                    Message.receiver_id == other.id),
            db.and_(Message.sender_id == other.id,
                    Message.receiver_id == current.id)
        )
    ).order_by(Message.created_at.asc()).all()

    # Mark received messages as read
    Message.query.filter_by(
        sender_id=other.id,
        receiver_id=current.id,
        is_read=False
    ).update({'is_read': True})
    db.session.commit()

    return jsonify([{
        'id':         m.id,
        'sender':     m.sender.username,
        'receiver':   m.receiver.username,
        'text':       m.text,
        'is_read':    m.is_read,
        'created_at': m.created_at.isoformat(),
        'is_mine':    m.sender_id == current.id
    } for m in messages])


@csrf.exempt
@app.route('/api/messages/<username>', methods=['POST'])
def send_message(username):
    current = get_current_user()
    if not current:
        return jsonify({'error': 'Unauthorized'}), 401
    other = User.query.filter_by(username=username).first_or_404()
    data  = request.get_json()
    text  = (data.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'Message cannot be empty'}), 400

    msg = Message(
        sender_id   = current.id,
        receiver_id = other.id,
        text        = text
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify({
        'id':         msg.id,
        'sender':     current.username,
        'receiver':   other.username,
        'text':       msg.text,
        'is_read':    False,
        'created_at': msg.created_at.isoformat(),
        'is_mine':    True
    }), 201


@app.route('/api/messages/conversations', methods=['GET'])
def get_conversations():
    current = get_current_user()
    if not current:
        return jsonify({'error': 'Unauthorized'}), 401

    # Get all users current user has messaged or received messages from
    sent = db.session.query(Message.receiver_id).filter_by(
        sender_id=current.id
    ).distinct()
    received = db.session.query(Message.sender_id).filter_by(
        receiver_id=current.id
    ).distinct()

    user_ids = set()
    for row in sent:
        user_ids.add(row[0])
    for row in received:
        user_ids.add(row[0])

    conversations = []
    for uid in user_ids:
        other = User.query.get(uid)
        if not other:
            continue
        last_msg = Message.query.filter(
            db.or_(
                db.and_(Message.sender_id == current.id,
                        Message.receiver_id == uid),
                db.and_(Message.sender_id == uid,
                        Message.receiver_id == current.id)
            )
        ).order_by(Message.created_at.desc()).first()

        unread = Message.query.filter_by(
            sender_id=uid,
            receiver_id=current.id,
            is_read=False
        ).count()

        conversations.append({
            'username':   other.username,
            'avatar':     other.avatar or '',
            'last_msg':   last_msg.text if last_msg else '',
            'last_time':  last_msg.created_at.isoformat() if last_msg else '',
            'unread':     unread
        })

    conversations.sort(key=lambda x: x['last_time'], reverse=True)
    return jsonify(conversations)


@app.route('/api/messages/unread-count', methods=['GET'])
def unread_message_count():
    current = get_current_user()
    if not current:
        return jsonify({'count': 0})
    count = Message.query.filter_by(
        receiver_id=current.id,
        is_read=False
    ).count()
    return jsonify({'count': count})


# ── Application Entry Point ───────────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)