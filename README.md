# ZenTrade - AI Powered Virtual Stock Trading Platform

ZenTrade is a state-of-the-art virtual stock trading application inspired by platforms like Zerodha Kite, Groww, and TradingView. It features a complete Flask-based backend, a keyless hybrid market data service, and a beautiful React front-end utilizing custom glassmorphic styling, Bootstrap 5 components, and Chart.js animations.

---

## 🌟 Key Features

1. **User Authentication**: Secure Login, Registration, JWT Sessions, and Profile configuration.
2. **Dashboard**: High-level portfolio net value summaries, dynamic green/red P&L alerts, indices tick lists, and market movers.
3. **Stock Detail Desk**: Key financial metrics, candlestick/line chart controls, analyst consensus percentages, and company outlines.
4. **Virtual Trading Module**: BUY/SELL orders, transaction history logs, average buy calculations, and cash margin adjustments.
5. **Watchlist Manager**: Maintain multiple watchlists, add/remove stock tickers, and view real-time prices.
6. **Market Hub**: Comprehensive index grids, upcoming IPO details, and stock side-by-side comparison tables.
7. **News Broadcasts**: Live financial news stories, search capabilities, and article bookmarks.
8. **Financial Calculators**: Tabbed panel supporting SIP Wealth estimators, Brokerage / GST / STT breakdowns, and Goal Progress checklists.
9. **Admin Panel**: Statistics panel tracking volume and user registrations, alongside privilege audits.

---

## 🛠️ Tech Stack & Directory Structure

```text
stock-trading-platform/
├── backend/
│   ├── app/
│   │   ├── blueprints/    # Modular Flask API endpoints
│   │   │   ├── admin.py
│   │   │   ├── alerts.py
│   │   │   ├── auth.py
│   │   │   ├── calculators.py
│   │   │   ├── insights.py
│   │   │   ├── news.py
│   │   │   ├── stocks.py
│   │   │   └── trading.py
│   │   ├── services/      # Live Yahoo Finance / Mock simulators
│   │   │   └── market_feed.py
│   │   ├── models.py      # SQLAlchemy DB schema definitions
│   │   └── __init__.py    # App factory setup & CORS/JWT binders
│   ├── tests/             # Pyunit test suites
│   ├── config.py          # App settings
│   ├── requirements.txt   # Python dependency list
│   └── run.py             # Entrypoint script
└── frontend/
    ├── index.html         # Container for React CDN imports
    ├── index.css          # Premium glassmorphic styling stylesheet
    └── app.jsx            # Dynamic single-page React app code
```

---

## 🚀 Getting Started

### 1. Prerequisite Installations
- **Python (3.9+)** must be installed on your system.

### 2. Backend Setup
1. Open terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Launch the Flask API server:
   ```bash
   python run.py
   ```
   *The backend server starts on `http://localhost:5000` and initializes a local SQLite file (`zentrade.db`).*

### 3. Frontend Setup
1. ZenTrade utilizes a standalone React setup loading modules directly inside the browser.
2. Navigate to the `frontend/` directory and spin up a lightweight static local server (via Python):
   ```bash
   cd ../frontend
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` on your web browser to access the landing screen.

---

## 🔐 Default Admin Account
For administrative dashboards review, log in using the following seeded credentials:
- **Email/Username**: `admin@zentrade.com` or `admin`
- **Password**: `admin123`
