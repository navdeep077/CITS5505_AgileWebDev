# Coffee Social Hub - Process Flow

## Overview
This document outlines the complete user flow of the Coffee Social Hub
application, covering all pages, routes and feature interactions.

---

## Application Flow

### 1. Landing Page (`/`)
- Public entry point - no login required
- Introduces the platform with hero section, features and how-it-works
- Navigation options:
  - Join as a Barista - `/signup`
  - See the Brew Map - `/home` (if logged in) or `/login`

---

### 2. Login / Signup (`/login`, `/signup`)
- Login: validates credentials against bcrypt-hashed passwords
- Signup: creates new User record with hashed password
- CSRF token on both forms for security
- On success - redirect to `/home`

---

### 3. Home Page (`/home`)
**Split layout: Social Grounds (left) + Brew Map (right)**

**Social Grounds (left):**
- Loads all posts via `GET /api/posts`
- Users can create posts via the + FAB button (with image upload)
- Posts show likes, comments, cafe tag link, username link
- Clicking a cafe name - `/cafe/<cafe_name>`
- Clicking a username - `/user/<username>`

**Brew Map (right):**
- Displays 7 Perth cafes as filter-able cards
- Filter chips: All, Open Now, Pet Friendly, Cold Brew, Pour Over
- View Details button - individual shop pages

**Onboarding Tour:**
- First-time users see a 3-step modal
- Completion tracked per username in localStorage

---

### 4. Shop Detail Pages (`/shop/<name>`)
7 individual cafe pages: Blacklist, La Veen, Venn, Harvest,
Telegram, Satchmo, Mary Street

Each page includes:
- Hero section with cafe name, tags and rating pill
- Info strip: hours, wifi, parking
- Menu sections with item names, descriptions and prices
- Community reviews loaded from `GET /api/reviews/shop/<name>`
- Review submission form - `POST /api/reviews`
- Star picker for rating (1–5)
- Quick facts sidebar
- User's own reviews linkable back to profile

---

### 5. Cafe Feed Page (`/cafe/<cafe_name>`)
- Shows all community posts tagged with this cafe
- Posts loaded via `GET /api/posts/cafe/<cafe_name>`
- Reviews loaded via `GET /api/reviews/shop/<cafe_name>`
- Right sidebar shows cafe info, tags and recent reviews
- Link to full shop detail page

---

### 6. Social Page (`/social`)
- Standalone social feed page
- Trending cafes sidebar (top 3 by rating)
- Same post feed as home page
- Create post via FAB button

---

### 7. Profile Page (`/profile`)
**Private profile for the logged-in user**

- Avatar upload and removal via `POST/DELETE /api/avatar`
- Post composer with image, cafe tag and aspect ratio selector
- Own posts feed filtered from `GET /api/posts`
- Own reviews list from `GET /api/reviews/<username>`
- Clickable link to each cafe page for review deletion

---

### 8. Public User Profile (`/user/<username>`)
**Viewable by other logged-in users**

- Shows target user's avatar, username, post count and total likes
- Two-column layout: post grid (left) + reviews (right)
- Posts rendered as Instagram-style grid
- Reviews loaded via `GET /api/reviews/<username>`
- Clicking a post opens a detail modal

---

### 9. Brew Map Page (`/brew`)
- Standalone Brew Map page
- Same filter chips and cafe grid as home page right column
- Filters: All, Open Now, Pet Friendly, Cold Brew, Pour Over

---

### 10. Logout (`/logout`)
- Clears Flask-Login session and Flask session
- Redirects to `/login`

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/DELETE | `/api/avatar` | Manage user avatar |
| GET/POST | `/api/posts` | Get all posts / create post |
| GET | `/api/posts/cafe/<name>` | Posts filtered by cafe |
| DELETE | `/api/posts/<id>` | Delete own post |
| POST | `/api/posts/<id>/like` | Toggle like on post |
| POST | `/api/posts/<id>/comment` | Add comment |
| DELETE/PUT | `/api/comments/<id>` | Delete/edit comment |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/reviews/shop/<name>` | Reviews for a cafe |
| GET | `/api/reviews/<username>` | Reviews by a user |
| DELETE | `/api/reviews/<id>` | Delete own review |

---

## Security Architecture

| Feature | Implementation |
|---------|---------------|
| Authentication | Flask-Login with @login_required |
| Passwords | bcrypt salted hashes |
| CSRF | Flask-WTF CSRFProtect on all forms |
| Secret Key | Loaded from .env via python-dotenv |
| File uploads | UUID filenames, extension whitelist |
| XSS protection | SQLAlchemy parameterised queries |

---

## Database Schema

```text
User        id, username (unique), password (bcrypt), avatar, bio
Post        id, text, shop, image, likes, liked_by, created_at, user_id (FK)
Comment     id, post_id (FK), username, text, created_at
Review      id, username, shop, rating, text, created_at
```

---

## Flow Summary

```
Landing - Login/Signup - Home
                           ├── Shop Page - Review submission
                           ├── Cafe Feed Page
                           ├── Social Page
                           ├── Profile Page
                           └── Public User Profile
```