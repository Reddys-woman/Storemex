# STOREMEX

### Your pantry, maintaining itself.

Storemex is an AI-powered smart pantry that turns your physical kitchen inventory into a digital, intelligent pantry.

Instead of manually entering every grocery item, Storemex uses camera scanning, computer vision, OCR, barcode recognition, and AI to identify products, extract useful information, and keep your pantry updated.

From knowing what you have to figuring out what you can cook and what needs restocking, Storemex brings your entire pantry into one place.

---

## ✨ What Storemex Does

### 📷 Smart Grocery Scanning

Scan a grocery item using your camera.

Storemex can identify:

- Product name
- Brand
- Quantity
- Barcode
- Expiry date
- Product category

Barcode recognition can quickly identify known products, while AI/OCR helps extract information such as expiry dates from packaging.

---

### 🥫 Digital Pantry

All scanned products are stored in your digital pantry.

You can see:

- What you currently have
- Quantities
- Expiry information
- Product categories
- Items running low

The pantry is continuously updated as items are consumed or added.

---

### 🍳 AI Recipe Suggestions

Storemex looks at the ingredients currently available in your pantry and recommends recipes you can make.

Recipes can also prioritize ingredients that are approaching their expiry date.

For example:

> Tomatoes expire soon → Storemex prioritizes recipes using tomatoes.

This helps reduce food waste while making meal planning easier.

---

### 📉 Consumption Tracking

When you cook a recipe, Storemex can automatically update your inventory.

For example:

```text
Before cooking

Eggs     → 8
Maggi    → 4
Tomatoes → 3

After cooking:

Eggs     → 6
Maggi    → 3
Tomatoes → 2

Your pantry stays synchronized with what you actually have.

⚠️ Expiry Alerts

Storemex monitors expiry dates and highlights products that need attention.

Examples:

⚠ Milk expires tomorrow
⚠ Cheese expires in 3 days
🛒 Smart Restocking

Set minimum quantities for products.

When stock drops below the desired level:

🛒 Eggs are running low.

Storemex can add them to the shopping list.

🎙️ Alexa Integration

Storemex can also interact with your pantry through Alexa.

Example commands:

"Alexa, ask Storemex what's in my pantry."

"Alexa, ask Storemex what's expiring."

"Alexa, ask Storemex what I can cook."

"Alexa, ask Storemex how many eggs I have."

Alexa communicates with the Storemex backend, which retrieves the relevant pantry information.

🧠 How It Works
              📷 Scan Grocery
                    │
                    ▼
          Barcode / Computer Vision
                    │
                    ▼
              AI + OCR
                    │
                    ▼
           Structured Product
                 Data
                    │
                    ▼
              🗄️ Supabase
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Pantry    Expiry     Quantity
          │         │         │
          └─────────┼─────────┘
                    ▼
              🤖 AI Engine
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
       Recipes   Alerts    Restocking
                    │
                    ▼
                 Alexa
🏗️ Architecture
                    STOREMEX
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    Frontend        Backend       AI Services
        │              │              │
        │              ├──────────────┤
        │              │              │
        ▼              ▼              ▼
     Vercel         Node.js       Vision / OCR
                    Express       Barcode API
                       │          Gemini AI
                       │
                       ▼
                    Supabase
                       │
                       ▼
                  Pantry Data
                       │
                       ▼
                  Alexa Skill

🛠️ Tech Stack
Frontend
HTML / CSS / JavaScript
Responsive web interface
Camera integration
Backend
Node.js
Express.js
REST APIs
Database
Supabase
PostgreSQL
Authentication
AI & Computer Vision
Google Gemini
OCR
Barcode recognition
Product identification
AI recipe generation
Voice
Amazon Alexa Skills
Deployment
Vercel — Frontend
Cloud-hosted backend
Supabase — Database

🚀 Local Setup
1. Clone the repository
git clone https://github.com/Reddys-woman/NYC-Codequest-R3.git
cd NYC-Codequest-R3/storemex
⚙️ Backend Setup

Go to the backend:

cd backend

Install dependencies:

npm install

Create a .env file:

SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

GEMINI_API_KEY=your_gemini_api_key

# Add other API keys required by the project

Never commit .env or API keys to GitHub.

Add this to .gitignore:

node_modules/
.env

Start the backend:

node server.js

The backend should start on the port configured in server.js.

💻 Frontend Setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Open the local URL shown in your terminal.

🔐 Environment Variables

Storemex uses environment variables for API keys and private configuration.

Typical variables include:

Variable	Purpose
SUPABASE_URL	Supabase project URL
SUPABASE_KEY	Supabase API key
GEMINI_API_KEY	Gemini AI access
PORT	Backend server port

Additional variables may be required depending on the enabled integrations.

🗄️ Supabase Setup

Create a Supabase project and configure the required database tables.

The pantry system should store information such as:

User
 └── Pantry Items
       ├── Product
       ├── Brand
       ├── Category
       ├── Quantity
       ├── Unit
       ├── Expiry Date
       └── Minimum Stock

A separate shopping-list system stores items that need to be restocked.

🎙️ Alexa Setup

Storemex uses an Alexa Skill to communicate with the backend.

The general flow is:

User
  ↓
Alexa
  ↓
Storemex Alexa Skill
  ↓
Storemex Backend API
  ↓
Supabase
  ↓
Response
  ↓
Alexa
  ↓
User

Example:

User:
"Alexa, ask Storemex what's expiring."

        ↓

Alexa Skill

        ↓

Backend

        ↓

Supabase

        ↓

"Milk expires tomorrow."

        ↓

Alexa speaks the response.

Alexa integration requires its own skill configuration and endpoint setup.

🌱 Development Workflow

Storemex is developed by a team using separate Git branches.

Recommended workflow:

git pull

Create or switch to your feature branch:

git switch your-branch

After making changes:

git add .
git commit -m "Describe your changes"
git push

Avoid committing:

node_modules/
.env
API keys
private credentials
🧪 MVP

The hackathon MVP focuses on the core experience:

Must Have
📷 Grocery scanning
🤖 Product + brand identification
🔍 Expiry extraction
🥫 Digital pantry
📊 Quantity tracking
⚠️ Expiry tracking
🍳 Recipe recommendations
🚀 Deployed website
Should Have
🎙️ Alexa — What's in my pantry?
🎙️ Alexa — What's expiring?
🛒 Restock reminders
🛍️ Shopping list
📉 Consumption tracking
If Time Allows
🎙️ Alexa — What can I cook?
🎙️ Alexa — Do I need X?
🎙️ Alexa — Add X to shopping list
📱 Advanced mobile experience
✨ UI animations and polish
🧠 More advanced recipe prioritization
🔮 Future Improvements

Storemex can eventually evolve beyond a digital pantry.

Potential future features include:

Continuous pantry monitoring
Smarter consumption prediction
Automatic shopping-list generation
Personalized recipe recommendations
Household-wide pantry synchronization
Voice-controlled pantry management
Grocery price comparison
Food-waste analytics
Nutrition-aware recipes
Predictive restocking
Integration with smart refrigerators and IoT devices

The long-term goal is simple:

A pantry that maintains itself.

👥 Team

Built for NYC CodeQuest R3.

Storemex

AI + Computer Vision + Alexa
Backend + Supabase
Frontend + UI/UX

💡 The Idea

Traditional pantry applications require users to constantly enter, update, and remove products.

Storemex changes that.

Instead of:

Type → Add → Update → Remember → Repeat

Storemex aims for:

📷 Scan
   ↓
🤖 Identify
   ↓
🥫 Store
   ↓
🍳 Cook
   ↓
📉 Update
   ↓
⚠️ Alert
   ↓
🛒 Restock
Scan → Identify → Store → Cook → Update → Alert → Restock

Storemex — Your pantry, maintaining itself.
