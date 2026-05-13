import pytest
from app import app, db
from models import User, Post, Comment, Review
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt(app)


@pytest.fixture
def client():
    """Set up test client with in-memory database."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()


def register_and_login(client, username="testuser", password="testpass123"):
    """Helper to register and login a user."""
    client.post('/signup', data={
        'username': username,
        'password': password,
        'confirm_password': password
    })
    client.post('/login', data={
        'username': username,
        'password': password
    })


# ── AUTH TESTS ─────────────────────────

def test_login_page_loads(client):
    """Login page returns 200."""
    response = client.get('/login')
    assert response.status_code == 200, \
        "Login page did not return 200"


def test_signup_page_loads(client):
    """Signup page returns 200."""
    response = client.get('/signup')
    assert response.status_code == 200, \
        "Signup page did not return 200"


def test_home_redirects_when_not_logged_in(client):
    """Home page redirects to login when not authenticated."""
    response = client.get('/home')
    assert response.status_code == 302, \
        "Home page did not redirect unauthenticated user"


def test_signup_creates_user(client):
    """Signup with valid credentials creates a user in the database."""
    response = client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass123',
        'confirm_password': 'testpass123'
    }, follow_redirects=True)
    assert response.status_code == 200, \
        "Signup did not complete successfully"
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        assert user is not None, \
            "User was not created in database after signup"


def test_login_valid_credentials(client):
    """Login with valid credentials redirects to home."""
    client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass123',
        'confirm_password': 'testpass123'
    })
    response = client.post('/login', data={
        'username': 'testuser',
        'password': 'testpass123'
    }, follow_redirects=False)
    assert response.status_code == 302, \
        "Valid login did not redirect (expected 302)"


def test_login_invalid_credentials(client):
    """Login with invalid credentials shows error message."""
    response = client.post('/login', data={
        'username': 'wronguser',
        'password': 'wrongpass'
    }, follow_redirects=True)
    assert b"Invalid username or password" in response.data, \
        "Error message not shown for invalid login credentials"


def test_duplicate_username_rejected(client):
    """Signing up with existing username shows error."""
    client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass123',
        'confirm_password': 'testpass123'
    })
    response = client.post('/signup', data={
        'username': 'testuser',
        'password': 'anotherpass',
        'confirm_password': 'anotherpass'
    }, follow_redirects=True)
    assert b"already exists" in response.data, \
        "Duplicate username was not rejected"


def test_logout_redirects_to_login(client):
    """Logout redirects to login page."""
    register_and_login(client)
    response = client.get('/logout', follow_redirects=False)
    assert response.status_code == 302, \
        "Logout did not redirect (expected 302)"


def test_password_mismatch_rejected(client):
    """Signup with mismatched passwords shows error."""
    response = client.post('/signup', data={
        'username': 'testuser',
        'password': 'pass1',
        'confirm_password': 'pass2'
    }, follow_redirects=True)
    assert b"do not match" in response.data, \
        "Password mismatch was not caught"


# ── API TESTS ─────────────────────────

def test_api_posts_requires_login(client):
    """GET /api/posts returns 401 when not logged in."""
    response = client.get('/api/posts')
    assert response.status_code == 401, \
        "/api/posts did not return 401 for unauthenticated request"


def test_api_avatar_requires_login(client):
    """GET /api/avatar returns 401 when not logged in."""
    response = client.get('/api/avatar')
    assert response.status_code == 401, \
        "/api/avatar did not return 401 for unauthenticated request"


def test_api_posts_returns_list_when_logged_in(client):
    """GET /api/posts returns a list when authenticated."""
    register_and_login(client)
    response = client.get('/api/posts')
    assert response.status_code == 200, \
        "/api/posts did not return 200 for authenticated user"
    data = response.get_json()
    assert isinstance(data, list), \
        "/api/posts did not return a list"


def test_api_create_post(client):
    """POST /api/posts creates a new post."""
    register_and_login(client)
    response = client.post('/api/posts', data={
        'text': 'Test coffee post',
        'shop': 'La Veen Coffee'
    })
    assert response.status_code == 201, \
        "Post creation did not return 201"
    data = response.get_json()
    assert data['text'] == 'Test coffee post', \
        "Created post text does not match"


def test_api_create_post_requires_text(client):
    """POST /api/posts without text returns 400."""
    register_and_login(client)
    response = client.post('/api/posts', data={
        'text': '',
        'shop': 'La Veen Coffee'
    })
    assert response.status_code == 400, \
        "Empty post text was not rejected with 400"


def test_api_submit_review(client):
    """POST /api/reviews creates a new review."""
    register_and_login(client)
    response = client.post('/api/reviews',
        json={
            'shop': 'Blacklist Coffee Roasters',
            'rating': 5,
            'text': 'Amazing coffee!'
        },
        content_type='application/json'
    )
    assert response.status_code == 201, \
        "Review submission did not return 201"


def test_api_duplicate_review_rejected(client):
    """POST /api/reviews rejects duplicate review for same cafe."""
    register_and_login(client)
    client.post('/api/reviews',
        json={'shop': 'Venn Coffee', 'rating': 4, 'text': 'Great!'},
        content_type='application/json'
    )
    response = client.post('/api/reviews',
        json={'shop': 'Venn Coffee', 'rating': 3, 'text': 'Again!'},
        content_type='application/json'
    )
    assert response.status_code == 400, \
        "Duplicate review was not rejected"


def test_api_get_user_reviews(client):
    """GET /api/reviews/<username> returns user reviews."""
    register_and_login(client)
    client.post('/api/reviews',
        json={'shop': 'Harvest Espresso', 'rating': 5, 'text': 'Loved it!'},
        content_type='application/json'
    )
    response = client.get('/api/reviews/testuser')
    assert response.status_code == 200, \
        "Get user reviews did not return 200"
    data = response.get_json()
    assert len(data) == 1, \
        "Expected 1 review but got different count"
    assert data[0]['shop'] == 'Harvest Espresso', \
        "Review shop name does not match"


# ── ROUTE PROTECTION TESTS ─────────────────────────

def test_profile_redirects_when_not_logged_in(client):
    """Profile page redirects to login when not authenticated."""
    response = client.get('/profile')
    assert response.status_code == 302, \
        "Profile page did not redirect unauthenticated user"


def test_social_redirects_when_not_logged_in(client):
    """Social page redirects to login when not authenticated."""
    response = client.get('/social')
    assert response.status_code == 302, \
        "Social page did not redirect unauthenticated user"


def test_brew_redirects_when_not_logged_in(client):
    """Brew page redirects to login when not authenticated."""
    response = client.get('/brew')
    assert response.status_code == 302, \
        "Brew page did not redirect unauthenticated user"


def test_shop_redirects_when_not_logged_in(client):
    """Shop page redirects to login when not authenticated."""
    response = client.get('/shop/blacklist')
    assert response.status_code == 302, \
        "Shop page did not redirect unauthenticated user"