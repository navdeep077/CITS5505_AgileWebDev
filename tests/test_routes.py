import pytest
from app import app, db
from models import User

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()


def test_login_page_loads(client):
    response = client.get('/login')
    assert response.status_code == 200

def test_home_redirects_when_not_logged_in(client):
    response = client.get('/home')
    assert response.status_code == 302

def test_signup_creates_user(client):
    response = client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass',
        'confirm_password': 'testpass'
    }, follow_redirects=True)

    assert response.status_code == 200

def test_login_valid_credentials(client):

    client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass',
        'confirm_password': 'testpass'
    })

    response = client.post('/login', data={
        'username': 'testuser',
        'password': 'testpass'
    }, follow_redirects=False)

    assert response.status_code == 302

def test_login_invalid_credentials(client):

    response = client.post('/login', data={
        'username': 'wronguser',
        'password': 'wrongpass'
    }, follow_redirects=True)

    assert b"Invalid username or password" in response.data

def test_logout_redirects_to_login(client):

    client.post('/signup', data={
        'username': 'testuser',
        'password': 'testpass',
        'confirm_password': 'testpass'
    })

    client.post('/login', data={
        'username': 'testuser',
        'password': 'testpass'
    })

    response = client.get('/logout', follow_redirects=False)

    assert response.status_code == 302

def test_api_posts_requires_login(client):

    response = client.get('/api/posts')

    assert response.status_code == 401

def test_api_avatar_requires_login(client):

    response = client.post('/api/avatar')

    assert response.status_code == 401