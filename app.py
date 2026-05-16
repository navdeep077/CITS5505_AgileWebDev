#  Imports ─
# Standard library imports for file handling and unique filename generation
import os
from uuid import uuid4

# Flask core imports for routing, templates, requests, sessions and responses
from flask import Flask, render_template, request, redirect, session, url_for, jsonify

# Flask extension imports
from flask_bcrypt import Bcrypt           # Password hashing with bcrypt algorithm
from flask_migrate import Migrate         # Database migration management via Alembic
from flask_wtf.csrf import CSRFProtect    # Cross-Site Request Forgery protection
from flask_login import LoginManager, login_user, logout_user, login_required  # Session auth

# Secure filename sanitisation for uploaded files
from werkzeug.utils import secure_filename

# Application database models and SQLAlchemy instance
from models import db, User, Post, Comment, Review

# Centralised configuration class (loads from .env)
from config import Config

#  Application Factory 
# Create and configure the Flask application instance
app = Flask(__name__)

# Load all config from Config class (SECRET_KEY, DATABASE_URI, WTF_CSRF_ENABLED etc.)
app.config.from_object(Config)

# Configure server-side upload folder and file size limit (8 MB)
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024  # 8 MB max upload size

# Allowed image extensions for avatar and post image uploads
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Ensure the uploads directory exists on startup
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

#  Extension Initialisation 
db.init_app(app)           # Bind SQLAlchemy to this Flask app
bcrypt = Bcrypt(app)       # Initialise bcrypt for password hashing
migrate = Migrate(app, db) # Set up Flask-Migrate for schema migrations
csrf = CSRFProtect(app)    # Enable CSRF protection on all forms

#  Flask-Login Setup 
# LoginManager manages user session state across requests
login_manager = LoginManager(app)

# Redirect unauthenticated users to the login page automatically
login_manager.login_view = 'login'


@login_manager.user_loader
def load_user(user_id):
    """
    Flask-Login callback to reload the User object from the database.
    Called on every request to restore the current user from their session cookie.
    """
    return User.query.get(int(user_id))


#  Helper Functions ─

def allowed_image(filename):
    """
    Check whether a filename has an allowed image extension.
    Returns True only if the extension is in ALLOWED_IMAGE_EXTENSIONS.
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def get_current_user():
    """
    Retrieve the currently logged-in User object from the database.
    Uses the username stored in the Flask session.
    Returns None if the user is not authenticated.
    """
    username = session.get("user")
    if not username:
        return None
    return User.query.filter_by(username=username).first()


def save_uploaded_image(file):
    """
    Save an uploaded image file to the server's uploads folder.

    - Validates that a file was provided and has an allowed extension.
    - Generates a UUID-based filename to prevent conflicts and path traversal.
    - Returns the URL path (e.g. /static/uploads/abc123.jpg) for DB storage.
    - Raises ValueError if the file type is not permitted.
    """
    if not file or file.filename == "":
        return None  # No file provided — skip silently

    if not allowed_image(file.filename):
        raise ValueError("Only png, jpg, jpeg, gif and webp images are allowed")

    # Sanitise the original filename then extract its extension
    original_name = secure_filename(file.filename)
    extension = original_name.rsplit('.', 1)[1].lower()

    # Generate a random hex filename to avoid collisions and enumeration attacks
    filename = f"{uuid4().hex}.{extension}"

    # Write the file to disk
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    # Return a Flask static URL path suitable for storing in the database
    return url_for('static', filename=f'uploads/{filename}')


def delete_uploaded_image(image_path):
    """
    Safely delete an uploaded image file from the server filesystem.

    - Only removes files inside the configured UPLOAD_FOLDER.
    - Uses os.path.commonpath to prevent directory traversal attacks.
    - Silently ignores missing files or invalid paths.
    """
    if not image_path or not image_path.startswith('/static/uploads/'):
        return  # Not a managed upload — do nothing

    filename = os.path.basename(image_path)
    if not filename:
        return

    # Resolve absolute paths and verify the target is inside the upload directory
    upload_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
    target_path = os.path.abspath(os.path.join(upload_dir, filename))

    # Security check: abort if the resolved path escapes the upload directory
    if os.path.commonpath([upload_dir, target_path]) != upload_dir:
        return

    # Delete the file if it exists
    if os.path.exists(target_path):
        os.remove(target_path)


def serialize_post(post):
    """
    Convert a Post SQLAlchemy object into a JSON-serialisable dictionary.

    Includes the author's username, avatar, post content, like data,
    comments (with IDs for edit/delete), and timestamps.
    Used by all API endpoints that return post data to the frontend.
    """
    return {
        "id": post.id,
        "username": post.author.username,
        "owner": post.author.username,          # Alias used by frontend ownership checks
        "avatar": post.author.avatar or "",
        "text": post.text,
        "shop": post.shop or "",
        "image": post.image or "",
        "likes": post.likes or 0,
        # Split comma-separated liked_by string into a list for the frontend
        "liked_by": post.liked_by.split(",") if post.liked_by else [],
        "comments": [
            {
                "id": c.id,
                "username": c.username,
                "text": c.text,
                "time": c.created_at.isoformat()  # ISO 8601 for JS Date parsing
            }
            for c in post.comments
        ],
        "created_at": post.created_at.isoformat(),
        "time": f"post-{post.id}"  # Legacy key used by some frontend delete handlers
    }


#  Cafe Data 
# Static list of Perth cafes served to every page via the context processor.
# Each entry contains display data and filter flags used by the brew map.
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
        "route": "shop_blacklist"  # Flask endpoint name for this cafe's detail page
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
    """
    Inject cafe data into every Jinja template context automatically.
    Provides both the full cafes list and a top-3 trending list sorted by rating.
    """
    trending_cafes = sorted(CAFES, key=lambda c: float(c["rating"]), reverse=True)[:3]
    return {"cafes": CAFES, "trending_cafes": trending_cafes}


#  Auth Routes 

@app.route("/")
def index():
    """Render the public landing page (no login required)."""
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    """
    Handle user login.

    GET  — render the login form.
    POST — validate credentials; on success call Flask-Login's login_user()
           and redirect to the home feed. On failure redirect back with an error.
    """
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if not username or not password:
            return redirect(url_for("login", error="Please fill all fields"))

        # Query the database for the submitted username
        user = User.query.filter_by(username=username).first()

        if user and bcrypt.check_password_hash(user.password, password):
            # Establish Flask-Login session and store username in Flask session
            login_user(user)
            session["user"] = username
            return redirect(url_for("home"))
        else:
            return redirect(url_for("login", error="Invalid username or password"))

    # GET: pass any flash messages from query string to the template
    error = request.args.get("error")
    message = request.args.get("message")
    return render_template("login.html", error=error, message=message)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    """
    Handle new user registration.

    GET  — render the signup form.
    POST — validate inputs, hash the password with bcrypt, persist the new
           User record to the database, then redirect to login.
    """
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        # Validate all fields are present
        if not username or not password or not confirm_password:
            return redirect(url_for("signup", error="Please fill all fields"))

        # Ensure passwords match before hashing
        if password != confirm_password:
            return redirect(url_for("signup", error="Passwords do not match"))

        # Prevent duplicate usernames
        if User.query.filter_by(username=username).first():
            return redirect(url_for("signup", error="Username already exists"))

        # Hash the password using bcrypt (automatically salted)
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Persist the new user to the database
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for("login", message="Account created. Please log in."))

    error = request.args.get("error")
    return render_template("signup.html", error=error)


@app.route("/user/<username>")
def public_profile(username):
    """
    Render the public profile page for any registered user.

    - Redirects unauthenticated visitors to login.
    - Redirects the logged-in user to their own profile page if they visit themselves.
    - Passes the target user's posts and total likes to the template.
    """
    current_username = session.get("user")

    if not current_username:
        return redirect(url_for("login"))

    # If viewing own profile, redirect to the richer private profile page
    if current_username == username:
        return redirect(url_for("profile"))

    profile_user = User.query.filter_by(username=username).first()

    if not profile_user:
        return "User not found", 404

    # Fetch all posts by this user ordered newest first
    posts = Post.query.filter_by(user_id=profile_user.id)\
        .order_by(Post.created_at.desc())\
        .all()

    # Aggregate total likes received across all posts for the stats display
    total_likes = sum(post.likes for post in posts)

    return render_template(
        "user-profile.html",
        profile_user=profile_user,
        posts=posts,
        total_likes=total_likes
    )


@app.route("/logout")
def logout():
    """
    Log the user out by clearing both Flask-Login's session and the Flask session.
    Redirects to the login page.
    """
    logout_user()
    session.pop("user", None)
    return redirect(url_for("login"))


#  Main Routes 

@app.route("/landing")
def landing():
    """Alias for the landing/index page (used by JS logout redirect)."""
    return render_template("index.html")


@app.route("/brew")
@login_required
def brew():
    """Render the standalone Brew Map page (login required)."""
    return render_template("brew.html")


@app.route("/profile")
@login_required
def profile():
    """Render the logged-in user's private profile page (login required)."""
    return render_template("profile.html")


@app.route("/social")
@login_required
def social():
    """Render the Social Grounds feed page (login required)."""
    return render_template("social.html")


#  API Routes ─
# All API routes are exempt from CSRF since they are protected by session auth
# and consumed by fetch() calls from the same origin.

@csrf.exempt
@app.route("/api/avatar", methods=["GET", "POST", "DELETE"])
def api_avatar():
    """
    Manage the current user's profile avatar.

    GET    — return the avatar URL stored in the database.
    POST   — upload a new avatar image; delete the old file if one exists.
    DELETE — remove the avatar and delete the file from the server.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401

    if request.method == "GET":
        return jsonify({"avatar": user.avatar or ""})

    if request.method == "DELETE":
        # Remove the old file from disk then clear the DB field
        delete_uploaded_image(user.avatar)
        user.avatar = None
        db.session.commit()
        return jsonify({"avatar": ""})

    # POST: save the new file and update the database
    file = request.files.get("avatar")
    if not file:
        return jsonify({"error": "No avatar file uploaded"}), 400

    try:
        old_avatar = user.avatar        # Cache the old path for cleanup
        user.avatar = save_uploaded_image(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db.session.commit()
    delete_uploaded_image(old_avatar)   # Delete old file after successful DB write
    return jsonify({"avatar": user.avatar})


@csrf.exempt
@app.route("/api/posts", methods=["GET", "POST"])
def api_posts():
    """
    Manage the social feed posts.

    GET  — return all posts ordered newest first, serialised as JSON.
    POST — create a new post (with optional image); associates it with the
           current user via foreign key.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401

    if request.method == "GET":
        posts = Post.query.order_by(Post.created_at.desc()).all()
        return jsonify([serialize_post(post) for post in posts])

    # POST: extract form fields (multipart since an image may be included)
    text = request.form.get("text", "").strip()
    shop = request.form.get("shop", "").strip()
    image_file = request.files.get("image")

    if not text:
        return jsonify({"error": "Post text is required"}), 400

    # Save the image to disk if provided; store only the URL path in the DB
    try:
        image_path = save_uploaded_image(image_file) if image_file else None
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    # Create the Post record linked to the current user
    post = Post(text=text, shop=shop, image=image_path, author=user)
    db.session.add(post)
    db.session.commit()
    return jsonify(serialize_post(post)), 201


@csrf.exempt
@app.route("/api/posts/cafe/<cafe_name>", methods=["GET"])
def api_cafe_posts(cafe_name):
    """
    Return all posts tagged with a specific cafe name.
    Used by the cafe feed page to show community content for one location.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401

    posts = Post.query.filter_by(shop=cafe_name).order_by(Post.created_at.desc()).all()
    return jsonify([serialize_post(post) for post in posts])


@csrf.exempt
@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def api_delete_post(post_id):
    """
    Delete a post by ID.
    Only the post's author may delete their own post (returns 403 otherwise).
    Also removes the associated image file from the server filesystem.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Login required"}), 401

    post = Post.query.get_or_404(post_id)

    if post.author != user:
        return jsonify({"error": "You can only delete your own posts"}), 403

    image_path = post.image    # Cache before deletion
    db.session.delete(post)
    db.session.commit()
    delete_uploaded_image(image_path)  # Clean up file after DB removal
    return jsonify({"deleted": True})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/like", methods=["POST"])
def like_post(post_id):
    """
    Toggle a like on a post for the current user.

    - If the user has already liked the post, the like is removed (unlike).
    - If not, a like is added.
    - The liked_by field stores a comma-separated list of usernames.
    """
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    post = Post.query.get_or_404(post_id)

    # Parse the comma-separated liked_by string into a list
    liked_users = post.liked_by.split(",") if post.liked_by else []

    if current_user in liked_users:
        # Unlike: remove the user and decrement the count (floor at 0)
        liked_users.remove(current_user)
        post.likes = max(post.likes - 1, 0)
    else:
        # Like: add the user and increment the count
        liked_users.append(current_user)
        post.likes += 1

    # Serialise back to comma-separated string, filtering empty strings
    post.liked_by = ",".join(filter(None, liked_users))
    db.session.commit()
    return jsonify({"likes": post.likes, "liked": current_user in liked_users})


@csrf.exempt
@app.route("/api/posts/<int:post_id>/comment", methods=["POST"])
def add_comment(post_id):
    """
    Add a comment to a post.
    The comment's username is taken from the server-side session (not client input)
    to prevent spoofing.
    """
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    new_comment = Comment(
        post_id=post_id,
        username=current_user,   # Always use the authenticated session username
        text=data.get("text")
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify({
        "message": "Comment added",
        "comment_id": new_comment.id  # Return the ID for frontend delete/edit wiring
    })


@csrf.exempt
@app.route("/api/comments/<int:comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    """
    Delete a comment by ID.
    Permitted for the comment's author OR the post's author (owner can moderate).
    Returns 403 if neither condition is met.
    """
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "Not found"}), 404

    # Allow deletion by comment owner or post author (moderation)
    if comment.username != current_user and comment.post.author.username != current_user:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(comment)
    db.session.commit()
    return jsonify({"message": "Deleted"})


@csrf.exempt
@app.route("/api/comments/<int:comment_id>", methods=["PUT"])
def edit_comment(comment_id):
    """
    Edit the text of a comment by ID.
    Only the comment's original author may edit it.
    """
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
    """
    Submit a new cafe review.
    Each user is limited to one review per cafe (enforced by a DB query).
    Returns 400 if a duplicate review is detected.
    """
    current_user = session.get("user")
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    shop = data.get("shop")
    rating = data.get("rating")
    text = data.get("text")

    if not shop or not rating or not text:
        return jsonify({"error": "Missing fields"}), 400

    # Enforce one review per user per cafe
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
    """
    Return all reviews for a specific cafe ordered newest first.
    Used by the shop detail pages to display community reviews.
    Note: this route must be defined BEFORE /api/reviews/<username>
    to prevent Flask matching 'shop' as a username.
    """
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
    """
    Return all reviews submitted by a specific user ordered newest first.
    Used by both the private profile page and public user profile pages.
    """
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
    """
    Delete a review by ID.
    Only the review's author may delete their own review.
    """
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


#  Shop Routes 
# Each route renders the detail page for one of the seven Perth cafes.
# All routes require login via the @login_required decorator.

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
    """
    Render the cafe-specific feed page showing all community posts for one cafe.
    Looks up the cafe by name from the CAFES list; redirects home if not found.
    """
    cafe = next((c for c in CAFES if c["name"] == cafe_name), None)
    if not cafe:
        return redirect(url_for("home"))
    return render_template("cafe-feed.html", cafe=cafe)


@app.route("/home")
@login_required
def home():
    """
    Render the main home page (split view: social feed + brew map).
    Protected by @login_required — unauthenticated users are redirected to login.
    """
    return render_template("home.html")


#  Application Entry Point ─
if __name__ == "__main__":
    with app.app_context():
        # Create any tables not yet present in the database
        # (Migrations handle schema changes; create_all handles fresh installs)
        db.create_all()
    app.run(debug=True)