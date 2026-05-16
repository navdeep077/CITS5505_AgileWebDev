# Coffee Social Hub - Project Brief

## Application Description

Coffee Social Hub is a **location-based social web application** for
coffee lovers in Perth, WA. It combines cafe discovery with community
social features, allowing users to find cafes, rate them, share posts
and connect with other coffee enthusiasts.

---

## 1. Core Functionality

### Information Visualisation
Users can:
- Browse 7 Perth cafes with name, location, rating and hours
- Filter cafes by: Pet Friendly, Open Now, Cold Brew, Pour Over
- View individual shop pages with full menus and pricing
- See community star ratings and written reviews for each cafe
- View reviews on the cafe feed page and user profiles

### Social Features
Users can:
- Create posts with photos tagged to a specific cafe
- Like and comment on posts from other users
- View a community social feed
- Visit public profiles of other users
- See another user's posts and reviews on their profile

---

## 2. Technical Implementation

### Backend
- Flask (Python) web framework
- SQLAlchemy ORM with SQLite database
- Flask-Login for session-based authentication
- Flask-Bcrypt for password hashing
- Flask-WTF for CSRF protection
- Flask-Migrate for database schema migrations
- python-dotenv for secret key management

### Frontend
- Bootstrap 5 for responsive layout
- Custom CSS with design tokens (espresso, caramel, cream palette)
- Vanilla JavaScript with fetch() API for AJAX requests
- No React, Angular or other JS frameworks used

### Security
- Passwords stored as bcrypt salted hashes
- CSRF tokens on all forms
- SECRET_KEY stored in .env (never committed)
- @login_required on all protected routes
- File uploads validated and stored with UUID filenames

### Testing
- 21 unit tests using pytest and Flask test client
- 12 Selenium end-to-end tests using Chrome WebDriver
- Tests use in-memory SQLite database

---

## 3. Database Models

| Model | Key Fields |
|-------|-----------|
| User | id, username (unique), password (bcrypt hash), avatar, bio |
| Post | id, text, shop, image, likes, liked_by, created_at, user_id |
| Comment | id, post_id, username, text, created_at |
| Review | id, username, shop, rating (1-5), text, created_at |

### Migrations
1. `57a153149524` - Create User, Post and Comment tables
2. `8dda85e6e385` - Add bio field to User

---

## 4. Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Public entry point with hero and features |
| Login | `/login` | Login form with CSRF token |
| Signup | `/signup` | Registration form with CSRF token |
| Home | `/home` | Split view: social feed + brew map |
| Social | `/social` | Standalone social feed with trending cafes |
| Brew Map | `/brew` | Filterable cafe discovery grid |
| Shop Detail | `/shop/<name>` | 7 individual cafe pages |
| Cafe Feed | `/cafe/<name>` | Community posts for one cafe |
| Profile | `/profile` | Private user profile with avatar and reviews |
| Public Profile | `/user/<username>` | Other users' profiles |

---

## 5. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| 01 | New User | Browse Perth cafes with ratings | I can find coffee quickly |
| 02 | Coffee Lover | Filter cafes by Cold Brew or Pour Over | I find my preferred brew style |
| 03 | Pet Owner | Filter cafes by Pet Friendly | I can bring my dog |
| 04 | Foodie | View menus and prices | I choose based on budget |
| 05 | User | Rate and review a cafe | I share my experience |
| 06 | Social User | Create and share posts with photos | I express my coffee moments |
| 07 | Community Member | View posts from other users | I discover new cafes |
| 08 | Reviewer | Tag a cafe in my post | I connect content to locations |
| 09 | Regular User | View my profile and reviews | I track my activity |
| 10 | Curious User | Visit another user's public profile | I see their posts and reviews |
| 11 | New User | See an onboarding tour | I understand the app quickly |
| 12 | User | Like and comment on posts | I engage with the community |

---

## 6. Design Principles

**Engaging** - Warm coffee-inspired colour palette (espresso, caramel,
cream), serif headings, floating mock cards on landing page, onboarding
tour for new users.

**Effective** - Full CRUD for posts and reviews, persistent data across
sessions, public profiles so users can view each other's content.

**Intuitive** - Clickable cafe names on posts link to cafe feed,
clickable usernames link to public profiles, sticky review sidebar on
cafe pages, responsive on all screen sizes.