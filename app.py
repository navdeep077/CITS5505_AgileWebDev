#  Imports ─
import os
from uuid import uuid4
from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_login import LoginManager, login_user, logout_user, login_required
from werkzeug.utils import secure_filename
from models import db, User, Post, Comment, Review, Follow, Notification, Bookmark
from config import Config

#  Application Factory
app = Flask(__name__)
app.config.from_object(Config)
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

#  Extensions
db.init_app(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


#  Helper Functions

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
        "id": post.id,
        "username": post.author.username,
        "owner": post.author.username,
        "avatar": post.author.avatar or "",
        "text": post.text,
        "shop": post.shop or "",
        "image": post.image or "",
        "likes": post.likes or 0,
        "liked_by": post.liked_by.split(",") if post.liked_by else [],
        "comments": [
            {
                "id": c.id,
                "username": c.username,
                "text": c.text,
                "time": c.created_at.isoformat()
            }
            for c in post.comments
        ],
        "created_at": post.created_at.isoformat(),
        "time": f"post-{post.id}"
    }


#  Cafe Data
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
    trending_cafes = sorted(CAFES, key=lambda c: float(c["rating"]), reverse=True)[:3]
    return {"cafes": CAFES, "trending_cafes": trending_cafes}


#  Auth Routes

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if not username or not password:
            return redirect(url_for("login", error="Please fill all fields"))
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            session["user"] = username
            return redirect(url_for("home"))
        else:
            return redirect(url_for("login", error="Invalid username or password"))
    error = request.args.get("error")
    message = request.args.get("message")
    return render_template("login.html", error=error, message=message)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        if not username or not password or not confirm_password:
            return redirect(url_for("signup", error="Please fill all fields"))
        if password != confirm_password:
            return redirect(url_for("signup", error="Passwords do not match"))
        if User.query.filter_by(username=username).first():
            return redirect(url_for("signup", error="Username already exists"))
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for("login", message="Account created. Please log in."))
    error = request.args.get("error")
    return render_template("signup.html", error=error)


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
    posts = Post.query.filter_by(user_id=profile_user.id)\
        .order_by(Post.created_at.desc()).all()
    total_likes = sum(post.likes for post in posts)
    return render_template(
        "user-profile.html",
        profile_user=profile_user,
        posts=posts,
        total_likes=total_likes
    )


@app.route("/logout")
def logout():
    logout_user()
    session.pop("user", None)
    return redirect(url_for("login"))


#  Main Routes

@app.route("/landing")
def landing():
    return render_template("index.html")


@app.route("/brew")
@login_required
def brew():
    return render_template("brew.html")


@app.route("/profile")
@login_required
def profile():
    return render_template("profile.html")


@app.route("/social")
@login_required
def social():
    return render_template("social.html")


@app.route("/home")
@login_required
def home():
    return render_template("home.html")


#  Shop Routes

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


#  API Routes

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
        old_avatar = user.avatar
        user.avatar = save_uploaded_image(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    db.session.commit()
    delete_uploaded_image(old_avatar)
    return jsonify({"avatar": user.avatar})


@csrf.exempt
@app.route("/api/posts", methods=["GET", "POST"])
def api_posts():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    if request.method == "GET":
        posts = Post.query.order_by(Post.created_at.desc()).all()
        return jsonify([serialize_post(post) for post in posts])
    text = request.form.get("text", "").strip()
    shop = request.form.get("shop", "").strip()
    image_file = request.files.get("image")
    if not text:
        return jsonify({"error": "Post text is required"}), 400
    try:
        image_path = save_uploaded_image(image_file) if image_file else None
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    post = Post(text=text, shop=shop, image=image_path, author=user)
    db.session.add(post)
    db.session.commit()
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
    post = Post.query.get_or_404(post_id)
    current = User.query.filter_by(username=current_username).first()
    liked_users = post.liked_by.split(",") if post.liked_by else []
    liked_users = [u for u in liked_users if u]
    if current_username in liked_users:
        liked_users.remove(current_username)
        post.likes = max(post.likes - 1, 0)
        liked = False
    else:
        liked_users.append(current_username)
        post.likes += 1
        liked = True
        if current and post.user_id != current.id:
            notif = Notification(
                user_id=post.user_id,
                actor_id=current.id,
                type='like',
                post_id=post.id
            )
            db.session.add(notif)
    post.liked_by = ",".join(filter(None, liked_users))
    db.session.commit()
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
    new_comment = Comment(
        post_id=post_id,
        username=current_username,
        text=text
    )
    db.session.add(new_comment)
    post = Post.query.get_or_404(post_id)
    comment_author = User.query.filter_by(username=current_username).first()
    if comment_author and comment_author.id != post.user_id:
        notif = Notification(
            user_id=post.user_id,
            actor_id=comment_author.id,
            type='comment',
            post_id=post.id
        )
        db.session.add(notif)
    db.session.commit()
    return jsonify({"message": "Comment added", "comment_id": new_comment.id})


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
    data = request.get_json()
    comment.text = data.get("text")
    db.session.commit()
    return jsonify({"message": "Updated"})


@csrf.exempt
@app.route("/api/reviews", methods=["POST"])
def submit_review():
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    shop = data.get("shop")
    rating = data.get("rating")
    text = data.get("text")
    if not shop or not rating or not text:
        return jsonify({"error": "Missing fields"}), 400
    existing = Review.query.filter_by(username=current_user, shop=shop).first()
    if existing:
        return jsonify({"error": "You have already reviewed this cafe"}), 400
    review = Review(username=current_user, shop=shop, rating=rating, text=text)
    db.session.add(review)
    db.session.commit()
    return jsonify({"message": "Review submitted"}), 201


@csrf.exempt
@app.route("/api/reviews/shop/<shop_name>", methods=["GET"])
def get_shop_reviews(shop_name):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401
    reviews = Review.query.filter_by(shop=shop_name).order_by(Review.created_at.desc()).all()
    return jsonify([{
        "id": r.id,
        "shop": r.shop,
        "rating": r.rating,
        "text": r.text,
        "username": r.username,
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
        "id": r.id,
        "shop": r.shop,
        "rating": r.rating,
        "text": r.text,
        "username": r.username,
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


# ── FOLLOW API ────────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/follow/<username>", methods=["POST"])
def follow_user(username):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    target = User.query.filter_by(username=username).first_or_404()
    if current.id == target.id:
        return jsonify({"error": "Cannot follow yourself"}), 400
    existing = Follow.query.filter_by(
        follower_id=current.id,
        followed_id=target.id
    ).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        Notification.query.filter_by(
            user_id=target.id,
            actor_id=current.id,
            type='follow'
        ).delete()
        db.session.commit()
        return jsonify({"following": False, "followers": target.follower_count()})
    else:
        follow = Follow(follower_id=current.id, followed_id=target.id)
        db.session.add(follow)
        notif = Notification(
            user_id=target.id,
            actor_id=current.id,
            type='follow'
        )
        db.session.add(notif)
        db.session.commit()
        return jsonify({"following": True, "followers": target.follower_count()})


@app.route("/api/followers/<username>", methods=["GET"])
def get_followers(username):
    user = User.query.filter_by(username=username).first_or_404()
    followers = Follow.query.filter_by(followed_id=user.id).all()
    return jsonify([{
        "username": f.follower.username,
        "avatar": f.follower.avatar
    } for f in followers])


@app.route("/api/following/<username>", methods=["GET"])
def get_following(username):
    user = User.query.filter_by(username=username).first_or_404()
    following = Follow.query.filter_by(follower_id=user.id).all()
    return jsonify([{
        "username": f.followed.username,
        "avatar": f.followed.avatar
    } for f in following])


# ── NOTIFICATIONS API ─────────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    notifs = Notification.query.filter_by(
        user_id=current.id
    ).order_by(
        Notification.created_at.desc()
    ).limit(20).all()
    result = []
    for n in notifs:
        result.append({
            "id": n.id,
            "type": n.type,
            "actor": n.actor.username,
            "actor_avatar": n.actor.avatar,
            "post_id": n.post_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat()
        })
    Notification.query.filter_by(
        user_id=current.id,
        is_read=False
    ).update({"is_read": True})
    db.session.commit()
    return jsonify(result)


@app.route("/api/notifications/count", methods=["GET"])
def notification_count():
    current = get_current_user()
    if not current:
        return jsonify({"count": 0})
    return jsonify({"count": current.unread_notifications()})


# ── BOOKMARKS API ─────────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/bookmarks/<int:post_id>", methods=["POST"])
def toggle_bookmark(post_id):
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    existing = Bookmark.query.filter_by(
        user_id=current.id,
        post_id=post_id
    ).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"bookmarked": False})
    else:
        bookmark = Bookmark(user_id=current.id, post_id=post_id)
        db.session.add(bookmark)
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


# ── SEARCH API ────────────────────────────────────────────────────────────────

@app.route("/api/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"users": [], "cafes": []})
    users = User.query.filter(
        User.username.ilike(f"%{query}%")
    ).limit(10).all()
    user_results = [{
        "username": u.username,
        "avatar": u.avatar,
        "bio": u.bio,
        "followers": u.follower_count()
    } for u in users]
    cafe_results = [
        c for c in CAFES
        if query.lower() in c["name"].lower()
    ]
    return jsonify({"users": user_results, "cafes": cafe_results})


# ── ACTIVITY FEED API ─────────────────────────────────────────────────────────

@app.route("/api/feed/following", methods=["GET"])
def following_feed():
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    following_ids = [
        f.followed_id for f in
        Follow.query.filter_by(follower_id=current.id).all()
    ]
    following_ids.append(current.id)
    posts = Post.query.filter(
        Post.user_id.in_(following_ids)
    ).order_by(Post.created_at.desc()).limit(20).all()
    return jsonify([serialize_post(p) for p in posts])


# ── SUGGESTED USERS API ───────────────────────────────────────────────────────

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
    suggested = User.query.filter(
        ~User.id.in_(following_ids)
    ).order_by(db.func.random()).limit(5).all()
    return jsonify([{
        "username": u.username,
        "avatar": u.avatar,
        "bio": u.bio,
        "followers": u.follower_count()
    } for u in suggested])
# ── WEEK 2 PAGE ROUTES ────────────────────────────────────────────────────────

@app.route("/explore")
@login_required
def explore():
    """Explore page — shows posts from all users"""
    return render_template("explore.html")


@app.route("/bookmarks")
@login_required
def bookmarks():
    """Bookmarks page — shows saved posts"""
    return render_template("bookmarks.html")


@app.route("/notifications")
@login_required
def notifications():
    """Notifications page"""
    return render_template("notifications.html")


# ── EDIT PROFILE API ──────────────────────────────────────────────────────────

@csrf.exempt
@app.route("/api/profile/edit", methods=["POST"])
def edit_profile():
    """Update bio, website and location for current user"""
    current = get_current_user()
    if not current:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    current.bio      = data.get("bio", current.bio)
    current.website  = data.get("website", current.website)
    current.location = data.get("location", current.location)
    db.session.commit()

    return jsonify({
        "bio": current.bio,
        "website": current.website,
        "location": current.location
    })

#  Application Entry Point
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)