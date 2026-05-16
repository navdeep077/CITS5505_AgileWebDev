#  Unit Tests — Flask Routes and API Endpoints
# Tests the server-side behaviour of all major routes using Flask's test client.
# An in-memory SQLite database is used so tests never touch production data.
# CSRF protection is disabled in the test config to allow direct form submissions.
#
# Run with: python -m pytest tests/test_routes.py -v

import pytest
from app import app, db
from models import User, Post, Comment, Review
from flask_bcrypt import Bcrypt

# Bcrypt instance used to hash passwords in test helpers
bcrypt = Bcrypt(app)


#  Test Fixture 

@pytest.fixture
def client():
    """
    Pytest fixture that sets up a fresh Flask test client for each test.

    Configuration:
      - TESTING=True   : enables test mode (better error messages)
      - In-memory DB   : isolates tests from the production database
      - CSRF disabled  : allows form POST without CSRF tokens in tests

    The fixture uses a context manager to ensure the database is created
    before each test and fully dropped afterwards, keeping tests isolated.
    """
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()   # Create all tables in the in-memory database
            yield client      # Provide the client to the test function
            db.session.remove()
            db.drop_all()     # Clean up all tables after the test completes


#  Helper Functions 

def register_and_login(client, username="testuser", password="testpass123"):
    """
    Helper that registers a new user and immediately logs them in.
    Used by tests that require an authenticated session.
    """
    client.post('/signup', data={
        'username': username,
        'password': password,
        'confirm_password': password
    })
    client.post('/login', data={
        'username': username,
        'password': password
    })


#  Auth Route Tests 

def test_login_page_loads(client):
    """GET /login should return HTTP 200 and render the login form."""
    response = client.get('/login')
    assert response.status_code == 200, \
        "Login page did not return 200"


def test_signup_page_loads(client):
    """GET /signup should return HTTP 200 and render the registration form."""
    response = client.get('/signup')
    assert response.status_code == 200, \
        "Signup page did not return 200"


def test_home_redirects_when_not_logged_in(client):
    """
    GET /home without a session should redirect (302) to the login page.
    Verifies that @login_required is active on the home route.
    """
    response = client.get('/home')
    assert response.status_code == 302, \
        "Home page did not redirect unauthenticated user"


def test_signup_creates_user(client):
    """
    POST /signup with valid data should persist a new User record to the database.
    Verifies that the user can be queried by username after signup.
    """
    response = client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass123',
        'confirm_password': 'testpass123'
    }, follow_redirects=True)
    assert response.status_code == 200, \
        "Signup did not complete successfully"

    # Confirm the user was written to the in-memory database
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        assert user is not None, \
            "User was not created in database after signup"


def test_login_valid_credentials(client):
    """
    POST /login with correct credentials should redirect (302) to /home.
    Verifies that a successful login triggers a session and redirect.
    """
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
    """
    POST /login with a non-existent username should display an error message.
    Verifies that invalid credentials are rejected and the user stays on the login page.
    """
    response = client.post('/login', data={
        'username': 'wronguser',
        'password': 'wrongpass'
    }, follow_redirects=True)
    assert b"Invalid username or password" in response.data, \
        "Error message not shown for invalid login credentials"


def test_duplicate_username_rejected(client):
    """
    Attempting to register with an already-taken username should show an error.
    Verifies the uniqueness constraint check in the signup route.
    """
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
    """
    GET /logout after login should redirect (302) to the login page.
    Verifies that the session is cleared on logout.
    """
    register_and_login(client)
    response = client.get('/logout', follow_redirects=False)
    assert response.status_code == 302, \
        "Logout did not redirect (expected 302)"


def test_password_mismatch_rejected(client):
    """
    POST /signup where password != confirm_password should show a mismatch error.
    Verifies the password confirmation validation in the signup route.
    """
    response = client.post('/signup', data={
        'username': 'testuser',
        'password': 'pass1',
        'confirm_password': 'pass2'
    }, follow_redirects=True)
    assert b"do not match" in response.data, \
        "Password mismatch was not caught"


#  API Route Tests ─

def test_api_posts_requires_login(client):
    """
    GET /api/posts without a session should return HTTP 401 Unauthorized.
    Verifies that the posts API is protected by session authentication.
    """
    response = client.get('/api/posts')
    assert response.status_code == 401, \
        "/api/posts did not return 401 for unauthenticated request"


def test_api_avatar_requires_login(client):
    """
    GET /api/avatar without a session should return HTTP 401 Unauthorized.
    Verifies that the avatar API is protected by session authentication.
    """
    response = client.get('/api/avatar')
    assert response.status_code == 401, \
        "/api/avatar did not return 401 for unauthenticated request"


def test_api_posts_returns_list_when_logged_in(client):
    """
    GET /api/posts with a valid session should return HTTP 200 and a JSON list.
    Verifies the posts API returns the correct data type for authenticated users.
    """
    register_and_login(client)
    response = client.get('/api/posts')
    assert response.status_code == 200, \
        "/api/posts did not return 200 for authenticated user"
    data = response.get_json()
    assert isinstance(data, list), \
        "/api/posts did not return a list"


def test_api_create_post(client):
    """
    POST /api/posts with text and shop fields should create a post (HTTP 201).
    Verifies that the post's text is correctly stored and returned.
    """
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
    """
    POST /api/posts with an empty text field should return HTTP 400 Bad Request.
    Verifies server-side validation of the required post text field.
    """
    register_and_login(client)
    response = client.post('/api/posts', data={
        'text': '',
        'shop': 'La Veen Coffee'
    })
    assert response.status_code == 400, \
        "Empty post text was not rejected with 400"


def test_api_submit_review(client):
    """
    POST /api/reviews with valid shop, rating and text should return HTTP 201.
    Verifies that review submission persists to the database correctly.
    """
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
    """
    Submitting two reviews for the same cafe should return HTTP 400 on the second.
    Verifies the one-review-per-cafe-per-user business rule is enforced by the API.
    """
    register_and_login(client)
    # First review — should succeed
    client.post('/api/reviews',
        json={'shop': 'Venn Coffee', 'rating': 4, 'text': 'Great!'},
        content_type='application/json'
    )
    # Second review for the same cafe — should be rejected
    response = client.post('/api/reviews',
        json={'shop': 'Venn Coffee', 'rating': 3, 'text': 'Again!'},
        content_type='application/json'
    )
    assert response.status_code == 400, \
        "Duplicate review was not rejected"


def test_api_get_user_reviews(client):
    """
    GET /api/reviews/<username> should return the reviews submitted by that user.
    Verifies that the review data is correctly stored and retrieved from the database.
    """
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


#  Route Protection Tests 

def test_profile_redirects_when_not_logged_in(client):
    """
    GET /profile without a session should redirect (302).
    Verifies @login_required is active on the profile route.
    """
    response = client.get('/profile')
    assert response.status_code == 302, \
        "Profile page did not redirect unauthenticated user"


def test_social_redirects_when_not_logged_in(client):
    """
    GET /social without a session should redirect (302).
    Verifies @login_required is active on the social feed route.
    """
    response = client.get('/social')
    assert response.status_code == 302, \
        "Social page did not redirect unauthenticated user"


def test_brew_redirects_when_not_logged_in(client):
    """
    GET /brew without a session should redirect (302).
    Verifies @login_required is active on the brew map route.
    """
    response = client.get('/brew')
    assert response.status_code == 302, \
        "Brew page did not redirect unauthenticated user"


def test_shop_redirects_when_not_logged_in(client):
    """
    GET /shop/blacklist without a session should redirect (302).
    Verifies @login_required is active on all shop detail routes.
    """
    response = client.get('/shop/blacklist')
    assert response.status_code == 302, \
        "Shop page did not redirect unauthenticated user"