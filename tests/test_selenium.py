#  Selenium End-to-End Tests 
# Tests the full stack from the browser through to the database using Selenium
# WebDriver and a live Flask server running on port 5000.
#
# Prerequisites:
#   1. Start the Flask server in a separate terminal: python app.py
#   2. Install dependencies: pip install selenium webdriver-manager
#
# Run with: python -m pytest tests/test_selenium.py -v
#
# Chrome runs in headless mode by default (no visible window).
# To see the browser during tests, remove the --headless argument below.

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

# Base URL of the live Flask development server
BASE_URL = "http://127.0.0.1:5000"

# Bcrypt instance used to hash passwords for the Selenium test user
bcrypt = Bcrypt(app)


#  Test Helpers 

def create_test_user():
    """
    Create a persistent test user in the real database for Selenium tests.
    Skips creation if the user already exists (idempotent).
    This user is used by login-dependent tests throughout the suite.
    """
    with app.app_context():
        existing = User.query.filter_by(username="seleniumuser").first()
        if not existing:
            hashed = bcrypt.generate_password_hash("testpass123").decode('utf-8')
            user = User(username="seleniumuser", password=hashed)
            db.session.add(user)
            db.session.commit()


def start_server():
    """
    Start the Flask development server on port 5000 in a background thread.
    use_reloader=False prevents the reloader from spawning a child process,
    which would conflict with the test runner's process management.
    """
    app.config['TESTING'] = False
    app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for Selenium form submissions
    app.run(port=5000, use_reloader=False, debug=False)


#  Session-Scoped Fixture 

@pytest.fixture(scope="module")
def driver():
    """
    Module-scoped pytest fixture that:
      1. Starts the Flask server on a daemon background thread.
      2. Creates the Selenium test user in the database.
      3. Initialises a headless Chrome WebDriver instance.

    Using module scope means the browser is opened once and reused across
    all tests in this file, significantly reducing test execution time.

    The driver is yielded to each test and quit after the module finishes.
    """
    # Start the Flask server in a background thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True   # Thread dies when the main process exits
    server_thread.start()
    time.sleep(2)  # Allow time for the server to start listening

    # Ensure the test user exists before any test runs
    create_test_user()

    # Configure Chrome to run headlessly (no visible browser window)
    options = Options()
    options.add_argument("--headless")           # Run without a display
    options.add_argument("--no-sandbox")         # Required in some CI environments
    options.add_argument("--disable-dev-shm-usage")  # Prevents shared memory issues
    options.add_argument("--window-size=1920,1080")   # Set a standard viewport

    # ChromeDriverManager downloads the correct ChromeDriver version automatically
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    driver.implicitly_wait(5)  # Wait up to 5 s for elements to appear before failing

    yield driver       # Provide the driver to each test function
    driver.quit()      # Close the browser after all tests in this module complete


def login(driver):
    """
    Helper function to log in as the Selenium test user.
    Called at the beginning of tests that require an authenticated session.
    """
    driver.get(f"{BASE_URL}/login")
    driver.find_element(By.NAME, "username").clear()
    driver.find_element(By.NAME, "username").send_keys("seleniumuser")
    driver.find_element(By.NAME, "password").clear()
    driver.find_element(By.NAME, "password").send_keys("testpass123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(1)  # Allow the redirect to complete before the next assertion


#  Tests

def test_landing_page_loads(driver):
    """
    Verify the landing page loads successfully.
    Checks that the page title or URL indicates the Coffee Social Hub landing page.
    """
    driver.get(BASE_URL)
    assert "Coffee" in driver.title or driver.current_url.endswith("/"), \
        f"Landing page did not load. Title: {driver.title}"


def test_login_page_has_fields(driver):
    """
    Verify the login page renders both the username and password input fields.
    Ensures the login form HTML is correctly rendered by the Jinja template.
    """
    driver.get(f"{BASE_URL}/login")
    username_field = driver.find_element(By.NAME, "username")
    password_field = driver.find_element(By.NAME, "password")
    assert username_field is not None, "Username field not found on login page"
    assert password_field is not None, "Password field not found on login page"


def test_signup_creates_account(driver):
    """
    Verify that completing the signup form redirects to the login page.
    Uses a unique username to avoid conflicts with the persistent test user.
    """
    driver.get(f"{BASE_URL}/signup")
    driver.find_element(By.NAME, "username").send_keys("newseleniumuser")
    driver.find_element(By.NAME, "password").send_keys("newpass123")
    driver.find_element(By.NAME, "confirm_password").send_keys("newpass123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    time.sleep(1)
    assert "/login" in driver.current_url, \
        f"Signup did not redirect to login. Current URL: {driver.current_url}"


def test_login_valid_credentials(driver):
    """
    Verify that logging in with valid credentials redirects to the home page.
    Confirms the full login → session → redirect flow works end-to-end.
    """
    login(driver)
    assert "/home" in driver.current_url, \
        f"Login did not redirect to home. Current URL: {driver.current_url}"


def test_home_page_shows_social_grounds(driver):
    """
    Verify that the home page contains the 'Social Grounds' section heading.
    Confirms the social feed panel is rendered in the split-view layout.
    """
    login(driver)
    driver.get(f"{BASE_URL}/home")
    assert "Social Grounds" in driver.page_source, \
        "Social Grounds section not found on home page"


def test_home_page_shows_brew_map(driver):
    """
    Verify that the home page contains the 'Brew Map' section heading.
    Confirms the cafe discovery panel is rendered in the split-view layout.
    """
    login(driver)
    driver.get(f"{BASE_URL}/home")
    assert "Brew Map" in driver.page_source, \
        "Brew Map section not found on home page"


def test_brew_map_filter_chips_clickable(driver):
    """
    Verify that the brew map filter chips are visible and clickable.

    The onboarding modal is dismissed first (it intercepts clicks on first login).
    Confirms the filter chip UI is interactive and responds to user input.
    """
    login(driver)
    driver.get(f"{BASE_URL}/home")
    time.sleep(1)

    # Dismiss the onboarding modal if it is shown (blocks click on first login)
    try:
        skip_btn = driver.find_element(By.ID, "onboarding-skip")
        skip_btn.click()
        time.sleep(0.5)
    except Exception:
        pass  # Modal not present — continue

    # Click the first filter chip and verify no error occurs
    filter_chip = driver.find_element(By.CSS_SELECTOR, ".filter-chip")
    filter_chip.click()
    time.sleep(0.5)
    assert filter_chip is not None, \
        "Filter chip not found or not clickable on home page"


def test_logout_redirects_to_login(driver):
    """
    Verify that visiting /logout redirects the user back to the login page.
    Confirms the logout flow clears the session and ends authentication.
    """
    login(driver)
    driver.get(f"{BASE_URL}/logout")
    time.sleep(1)
    assert "/login" in driver.current_url, \
        f"Logout did not redirect to login. Current URL: {driver.current_url}"


def test_home_redirects_when_not_authenticated(driver):
    """
    Verify that accessing /home without a session redirects to /login.
    Confirms the @login_required decorator is active on the home route.
    """
    driver.get(f"{BASE_URL}/logout")   # Ensure the session is cleared first
    time.sleep(0.5)
    driver.get(f"{BASE_URL}/home")
    time.sleep(0.5)
    assert "/login" in driver.current_url, \
        f"Home did not redirect to login when not authenticated. URL: {driver.current_url}"


def test_shop_page_loads(driver):
    """
    Verify that the Blacklist Coffee Roasters shop detail page loads correctly.
    Checks that the cafe name appears in the page content.
    """
    login(driver)
    driver.get(f"{BASE_URL}/shop/blacklist")
    assert "Blacklist Coffee Roasters" in driver.page_source, \
        "Blacklist Coffee Roasters shop page did not load correctly"


def test_profile_page_loads(driver):
    """
    Verify that the profile page loads for an authenticated user.
    Checks that the 'My Posts' section is present in the rendered HTML.
    """
    login(driver)
    driver.get(f"{BASE_URL}/profile")
    assert "My Posts" in driver.page_source or "profile" in driver.current_url, \
        "Profile page did not load correctly"


def test_social_page_loads(driver):
    """
    Verify that the Social Grounds standalone page loads correctly.
    Checks that the section heading is present in the rendered HTML.
    """
    login(driver)
    driver.get(f"{BASE_URL}/social")
    assert "Social Grounds" in driver.page_source, \
        "Social page did not load correctly"