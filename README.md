# Coffee Social Hub - CITS5505 Agile Web Development

A location-based social web application for coffee lovers in Perth, WA.
Users can discover nearby coffee shops, view menus and ratings, share
coffee experiences, and connect with the community.

---

## Purpose

Coffee Social Hub combines **shop discovery** with **social features**
to create a community-driven platform for coffee enthusiasts in Perth.

---

## Group Members

| UWA ID   | Name                    | GitHub Username    |
|----------|-------------------------|--------------------|
| 24496192 | Navdeep Singh           | navdeep077         |
| 24366018 | Evan Zhao               | itsEvanZHAO        |
| 24765784 | Nimit Sureshbhai Gelani | Fighterdx          |
| 24681985 | Jaswanth Vericherla     | jaswanth-kumar24   |

---

## Key Features

- Browse and filter 7 Perth coffee shops (Cold Brew, Pour Over, Pet Friendly)
- View shop detail pages with menus, pricing, hours and community reviews
- Rate coffee shops 1–5 stars (one review per cafe per user)
- Create posts with photos and tag a cafe
- Like and comment on posts from other users
- Cafe feed page showing all community posts for one cafe
- Personal profile with avatar, post history and reviews
- Public user profiles viewable by other users
- First-time onboarding tour

---

## Technologies Used

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | HTML, CSS, JavaScript, Bootstrap 5              |
| Backend   | Python, Flask, Flask-Login, Flask-WTF           |
| Database  | SQLite via SQLAlchemy, Flask-Migrate            |
| Security  | Flask-Bcrypt, CSRFProtect, python-dotenv        |
| Testing   | pytest, Selenium WebDriver                      |

---

## Project Structure

```text
CITS5505_AgileWebDev/
├── app.py                  
├── models.py               
├── config.py               
├── requirements.txt        
├── .gitignore
├── README.md
├── migrations/             
│   └── versions/
├── templates/              
│   ├── base.html
│   ├── index.html
│   ├── home.html
│   ├── login.html
│   ├── signup.html
│   ├── profile.html
│   ├── social.html
│   ├── brew.html
│   ├── cafe-feed.html
│   ├── user-profile.html
│   └── shop-*.html (7 cafe pages)
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── tests/
    ├── __init__.py
    ├── test_routes.py      
    └── test_selenium.py    
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/navdeep077/CITS5505_AgileWebDev.git
cd CITS5505_AgileWebDev
```

### 2. Create and activate virtual environment

```bash
# Create
python -m venv venv

# Activate - Windows
venv\Scripts\activate

# Activate - Mac/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up the database

```bash
python -m flask db upgrade
```

### 5. Run the application

```bash
python app.py
```

### 6. Open in browser

http://127.0.0.1:5000
---

## How to Run Tests

### Unit Tests
No server required. Uses in-memory SQLite database.

```bash
pip install pytest
python -m pytest tests/test_routes.py -v
```

Expected: **21 passed**

### Selenium Tests
Requires the Flask server running in a separate terminal.

```bash
pip install selenium webdriver-manager

# Terminal 1 - start server
python app.py

# Terminal 2 - run Selenium tests
python -m pytest tests/test_selenium.py -v
```

Expected: **12 passed**

### Run All Tests

```bash
python -m pytest tests/ -v
```

---

## Database Models

| Model   | Description                              |
|---------|------------------------------------------|
| User    | Registered users with bcrypt passwords   |
| Post    | Social posts with images, likes, shop tag|
| Comment | Comments on posts                        |
| Review  | Star-rated cafe reviews (1 per cafe)     |

---

## Security

- Passwords hashed with **bcrypt** (never stored plain text)
- **CSRF tokens** on all forms via Flask-WTF
- **SECRET_KEY** stored in `.env` (never committed to GitHub)
- All protected routes use **@login_required**
- File uploads validated by extension and stored with UUID filenames

---

## Git Workflow

- Never commit directly to `main`
- Create a feature branch:

```bash
git checkout -b feat/your-feature-name
```

- Commit with conventional messages:

```bash
git commit -m "feat: add review API endpoint"
```

- Open a Pull Request and get at least 1 approval before merging

---

## Project Rules

- Minimum 1 approving review required before merging to main
- Use commit conventions: `feat`, `fix`, `docs`, `test`, `refactor`
- Never commit `.env`, `venv/`, `*.db` or `__pycache__/`
- All new features must be added via Pull Request