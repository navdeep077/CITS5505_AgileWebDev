# Coffee Social Hub – Process Flow

## Overview
This document outlines the user flow of the Coffee Social Hub application to ensure consistency in navigation and feature integration across all pages.

---

## Application Flow

### 1. Landing Page (landing.html)
- Acts as the entry point of the application
- Introduces the platform and its purpose
- Provides navigation options:
  - Log In
  - Sign Up
  - Explore Brew Map

➡️ User proceeds to:
- Login/Signup page OR
- Directly to Brew Map (if no authentication is enforced)

---

### 2. Login / Signup (login.html / signup.html)
- Allows users to create or access their account
- After successful login/signup:

➡️ Redirect to:
- Brew Map (Home Page)

---

### 3. Coffee Hub / Home Page (brew.html)
- Main functional page of the application
- Displays a list of coffee shops (from JSON data)
- Features:
  - View shop name, location, ratings, opening hours
  - Apply filters (pet-friendly, price range)
  - Navigate to shop details

➡️ User can:
- Click on a shop → Shop Detail Page
- Navigate to Social Feed or Profile

---

### 4. Shop Detail Page (shop.html)
- Displays detailed information about a selected coffee shop
- Includes:
  - Menu and pricing
  - Dine-in and pet-friendly status
  - Ratings and reviews
  - Discount codes

➡️ User can:
- Rate the shop
- Return to Brew Map

---

### 5. Social Feed (feed.html)
- Displays posts from users
- Users can:
  - Create posts
  - Upload images (optional)
  - Tag coffee shops

---

### 6. User Profile (profile.html)
- Displays user information
- Shows:
  - User posts
  - Ratings given

---

## Summary
The application flow follows a structured path:

Landing Page → Login/Signup → Brew Map → Shop Detail → Social/Profile

This ensures a clear separation between:
- Entry experience (Landing Page)
- Core functionality (Brew Map)
- Extended features (Social & Profile)