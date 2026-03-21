# Coffee Social Hub Web Application

## Brief Description
This web application is a **location-based social hub for coffee lovers**, combining interactive map features with social networking. It helps users discover nearby coffee shops while connecting with others who share similar coffee interests.

---

## 1. Functionality Description

The application includes two main functions:
- **Information Visualisation**
- **Social Features**

### Main Function 1: Information Visualisation

Users can:
- View nearby coffee shops on a map, including:
  - Name  
  - Location  
  - Ratings  
  - Opening hours  

Clicking on a shop shows:
- Menu and prices  
- Available coffee beans  
- Dine-in options  
- Pet-friendly status  

Additional features:
- Rate **individual coffee types** (not just shops)
- Filter shops by coffee type (e.g., *Cold Brew*, *Pour-over*)
- Share and view discount codes  

---

### Main Function 2: Social Features

Users can:
- Share coffee-related content  
- Connect with like-minded users  
- Join or host coffee events  

Key features:
- Personal **coffee profile**
- Activity-based **level system**

Social interactions:
- Invite users to **Coffee Chat** (based on shared ratings + level)
- High-level users can host **Coffee Gatherings**

---

## 2. Functionality Design Challenges

The system handles three types of data:
- Geospatial (maps)
- Relational (users, shops, coffees)
- Event-based (gatherings)

### Key Challenges

- **Dynamic Map Interface**  
  Real-time filtering (e.g., *“Gesha within 5km”*)

- **Granular Rating Engine**  
  Rate specific coffees (e.g., *Ethiopia Yirgacheffe Pour-over*)

- **Gamification Engine**  
  Tracks activity → assigns levels → unlocks features  

- **Privacy-First Matchmaking**  
  Controlled chat access based on rules  

- **Community Board**  
  Hub for:
  - Discount codes  
  - Event hosting  

---

## 3. Main Pages list

### 1. Welcome Portal (Login / Signup)
- **Login:** Returning users ("Baristas") can quickly access their accounts  
- **Registration:** Multi-step onboarding process  
  - Select coffee preferences (e.g., *Light roast*, *Dark roast*)  
  - Personalise recommendations from the start  

---

### 2. Brew Map (Home)
- Primary landing page  
- Dynamic map displaying nearby coffee shops  
- Filters:
  - Pet-friendly  
  - Open now  
  - Coffee type 

---

### 3. Shop Detail Page
The **digital menu and information hub**

- **Specs:** Menu, prices, available beans  
- **Vibe:** Photos, pet-friendly status, Wi-Fi reliability  
- **Ratings:**  
  - Specific drink ratings  
  - Active discount codes  

---

### 4. Barista Profile
Personal user dashboard

- **Progress Bar:** Shows level and XP needed for next rank  
- **History:** Rated coffees and posted content  
- **Badges:** Earned through:
  - Social activity  
  - Visiting new locations  

---

### 5. Social Grounds (Community Feed)
The core social experience

- **Discovery:** Feed of coffee photos and reviews  
- **Events:** List of upcoming **Coffee Gatherings** (RSVP available)  

---

### 6. Matchmaking & Messaging

- **Invitations:**  
  - "Coffee Chat" requests  
  - Triggered by shared preferences + level requirements  

- **Private Chat:**  
  - Secure messaging system  
  - Used for organising meetups  

---

### 7. Shop Owner Dashboard *(Optional)*

- Business owners can:
  - Claim their shop  
  - Update bean offerings  
  - Post official discount codes  

- Goal:  
  - Improve accuracy of shop data  
  - Encourage business-community interaction  

---

## 4. User Stories

| ID  | As a...                | I want to...                                         | So that... |
|-----|------------------------|------------------------------------------------------|------------|
| 01  | New User              | View nearby shops with ratings and hours            | I can quickly find coffee |
| 02  | Connoisseur           | Filter shops by coffee type                         | I avoid unsuitable shops |
|     |                       | *(Cold Brew, Pour-over)*                            |            |
| 03  | Pet Owner             | Enable pet-friendly filter                          | I can bring my dog |
| 04  | Bargain Hunter        | View/share discount codes                           | I save money |
| 05  | Foodie                | View menus and prices                               | I choose based on budget |
| 06  | Active Contributor    | Earn points from reviews/photos                     | I unlock features |
| 07  | Social Butterfly      | Invite users to Coffee Chat                         | I meet similar people |
|     |                       | *(based on shared preferences)*                     |            |
| 08  | Community Leader      | Create Coffee Gathering events                      | I organise meetups |
| 09  | Refined Taster        | Rate specific coffee beans                          | I provide detailed insights |
|     |                       | *(not just shops)*                                  |            |
| 10  | Safety-Conscious User | Restrict chat invites to qualified users            | I feel secure |

---

## Summary
This platform goes beyond a simple directory by combining:
- Smart discovery (maps + filters)
- Deep coffee insights (granular ratings)
- Social interaction (chat + events)

Creating a **complete ecosystem for coffee enthusiasts**.
