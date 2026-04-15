# Coffee Social Hub Web Application

## Brief Description
This web application is a **location-based social hub for coffee lovers**. It helps users discover nearby coffee shops while connecting with others who share similar coffee interests.

---

## 1. Functionality Description

The application includes two main functions:
- **Information Visualisation**
- **Social Features**

---

### Main Function 1: Information Visualisation

Users can:
- View nearby coffee shops as a **list**, including:
  - Name  
  - Location  
  - Ratings  
  - Opening hours  

Clicking on a shop shows:
- Menu and prices  
- Dine-in options  
- Pet-friendly status  

Additional features:
- Rate **coffee shops** (1–5 stars)
- Filter shops by:
  - Pet-friendly  
  - Price range  
- View available discount codes  

---

### Main Function 2: Social Features

Users can:
- Share coffee-related content (posts/photos)  
- Tag coffee shops in posts  
- View a community feed  

Key features:
- Personal **user profile**

Social interactions:
- View posts from other users  
- Engage with shared coffee experiences  

---

## 2. Functionality Design Challenges

The system handles three types of data:

- **Structured data:** Coffee shops (stored in JSON)
- **User-generated data:** Posts and ratings (stored locally)
- **UI state management:** Rendering lists, filters, and interactions dynamically

---

## 3. Main Pages List

### 1. Welcome Portal (Login / Signup)
- **Login:** Users can access the application  
- **Registration:** Simple onboarding process  
  - Enter basic details  
  - Select coffee preferences (optional)

---

### 2. Coffee Hub (Home Page)
- Primary landing page  
- Displays a list of **10–15 nearby coffee shops** (from JSON data)  

Filters:
- Pet-friendly  
- Price range  

---

### 3. Shop Detail Page
The **information hub for each coffee shop**

- **Details:** Menu, price range  
- **Features:** Pet-friendly, dine-in  
- **Ratings:**  
  - Users can rate the shop  
  - View average ratings  
- **Discounts:** Display available offers  

---

### 4. User Profile
Personal user dashboard

- View user information  
- View previously created posts  
- View ratings given  

---

### 5. Social Feed (Community Page)
The core social experience

- View posts from users  
- Users can:
  - Create posts  
  - Upload images (optional)  
  - Tag a coffee shop  

---

## 4. User Stories

| ID  | As a...             | I want to...                                  | So that... |
|-----|---------------------|-----------------------------------------------|------------|
| 01  | New User            | View nearby shops with ratings and hours      | I can quickly find coffee |
| 02  | Coffee Lover        | Filter shops by pet-friendly or price         | I find suitable places |
| 03  | Pet Owner           | Enable pet-friendly filter                    | I can bring my dog |
| 04  | Bargain Hunter      | View discount codes                           | I save money |
| 05  | Foodie              | View menus and prices                         | I choose based on budget |
| 06  | User                | Rate coffee shops                             | I share my experience |
| 07  | Social User         | Create and share posts                        | I express my coffee experiences |
| 08  | Community Member    | View posts from others                        | I discover new places |
| 09  | Reviewer            | Tag shops in posts                            | I connect content to locations |
| 10  | Regular User        | View my profile and history                   | I track my activity |

---

## Summary

This platform focuses on delivering a **simple and functional experience** by combining:

- Smart discovery (list + filters)  
- Useful insights (shop ratings & details)  
- Social interaction (posts & community feed)  

Creating a **practical and user-friendly ecosystem for coffee enthusiasts**.
