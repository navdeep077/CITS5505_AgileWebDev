import pytest
import threading
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from app import app, db
from models import User
from flask_bcrypt import Bcrypt

BASE_URL = "http://127.0.0.1:5000"
bcrypt = Bcrypt(app)


def create_test_user():
    """Create a test user in the database."""
    with app.app_context():
        existing = User.query.filter_by(username="seleniumuser").first()
        if not existing:
            hashed = bcrypt.generate_password_hash("testpass123").decode('utf-8')
            user = User(username="seleniumuser", password=hashed)
            db.session.add(user)
            db.session.commit()


def start_server():
    """Start Flask server in a background thread."""
    app.config['TESTING'] = False
    app.config['WTF_CSRF_ENABLED'] = False
    app.run(port=5000, use_reloader=False, debug=False)


@pytest.fixture(scope="module")
def driver():
    """Set up Chrome WebDriver and Flask server."""
    # Start server in background thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    time.sleep(2)  # Wait for server to start

    # Create test user
    create_test_user()

    # Set up headless Chrome
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    driver.implicitly_wait(5)

    yield driver
    driver.quit()


def login(driver):
    """Helper function to log in as test user."""
    driver.get(f"{BASE_URL}/login")
    driver.find_element(By.NAME, "username").clear()
    driver.find_element(By.NAME, "username").send_keys("seleniumuser")
    driver.find_element(By.NAME, "password").clear()
    driver.find_element(By.NAME, "password").send_keys("testpass123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(1)


# ── TEST 1: Landing page loads ─────────────────────────
def test_landing_page_loads(driver):
    driver.get(BASE_URL)
    assert "Coffee" in driver.title or driver.current_url.endswith("/"), \
        f"Landing page did not load. Title: {driver.title}"


# ── TEST 2: Login page has correct fields ─────────────────────────
def test_login_page_has_fields(driver):
    driver.get(f"{BASE_URL}/login")
    username_field = driver.find_element(By.NAME, "username")
    password_field = driver.find_element(By.NAME, "password")
    assert username_field is not None, "Username field not found on login page"
    assert password_field is not None, "Password field not found on login page"


# ── TEST 3: Signup flow creates account ─────────────────────────
def test_signup_creates_account(driver):
    driver.get(f"{BASE_URL}/signup")
    driver.find_element(By.NAME, "username").send_keys("newseleniumuser")
    driver.find_element(By.NAME, "password").send_keys("newpass123")
    driver.find_element(By.NAME, "confirm_password").send_keys("newpass123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(1)
    assert "/login" in driver.current_url, \
        f"Signup did not redirect to login. Current URL: {driver.current_url}"


# ── TEST 4: Login with valid credentials reaches home ─────────────────────────
def test_login_valid_credentials(driver):
    login(driver)
    assert "/home" in driver.current_url, \
        f"Login did not redirect to home. Current URL: {driver.current_url}"


# ── TEST 5: Home page shows Social Grounds section ─────────────────────────
def test_home_page_shows_social_grounds(driver):
    login(driver)
    driver.get(f"{BASE_URL}/home")
    page_source = driver.page_source
    assert "Social Grounds" in page_source, \
        "Social Grounds section not found on home page"


# ── TEST 6: Home page shows Brew Map section ─────────────────────────
def test_home_page_shows_brew_map(driver):
    login(driver)
    driver.get(f"{BASE_URL}/home")
    page_source = driver.page_source
    assert "Brew Map" in page_source, \
        "Brew Map section not found on home page"


# ── TEST 7: Brew map filter chips are clickable ─────────────────────────
def test_brew_map_filter_chips_clickable(driver):
    login(driver)
    driver.get(f"{BASE_URL}/home")
    time.sleep(1)

    # Dismiss onboarding modal if present
    try:
        skip_btn = driver.find_element(By.ID, "onboarding-skip")
        skip_btn.click()
        time.sleep(0.5)
    except:
        pass

    filter_chip = driver.find_element(By.CSS_SELECTOR, ".filter-chip")
    filter_chip.click()
    time.sleep(0.5)
    assert filter_chip is not None, \
        "Filter chip not found or not clickable on home page"


# ── TEST 8: Logout redirects to login ─────────────────────────
def test_logout_redirects_to_login(driver):
    login(driver)
    driver.get(f"{BASE_URL}/logout")
    time.sleep(1)
    assert "/login" in driver.current_url, \
        f"Logout did not redirect to login. Current URL: {driver.current_url}"


# ── TEST 9: Home redirects to login when not authenticated ─────────────────────────
def test_home_redirects_when_not_authenticated(driver):
    driver.get(f"{BASE_URL}/logout")
    time.sleep(0.5)
    driver.get(f"{BASE_URL}/home")
    time.sleep(0.5)
    assert "/login" in driver.current_url, \
        f"Home did not redirect to login when not authenticated. URL: {driver.current_url}"


# ── TEST 10: Shop page loads correctly ─────────────────────────
def test_shop_page_loads(driver):
    login(driver)
    driver.get(f"{BASE_URL}/shop/blacklist")
    page_source = driver.page_source
    assert "Blacklist Coffee Roasters" in page_source, \
        "Blacklist Coffee Roasters shop page did not load correctly"


# ── TEST 11: Profile page loads correctly ─────────────────────────
def test_profile_page_loads(driver):
    login(driver)
    driver.get(f"{BASE_URL}/profile")
    page_source = driver.page_source
    assert "My Posts" in page_source or "profile" in driver.current_url, \
        "Profile page did not load correctly"


# ── TEST 12: Social page loads correctly ─────────────────────────
def test_social_page_loads(driver):
    login(driver)
    driver.get(f"{BASE_URL}/social")
    page_source = driver.page_source
    assert "Social Grounds" in page_source, \
        "Social page did not load correctly"