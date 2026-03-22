# 📈 LiveMarketAI

> **Trade Stocks Like Shopping** — An Amazon-style stock trading platform

LiveMarketAI is a full-stack fintech + ecommerce hybrid built with FastAPI (backend) and React (frontend), featuring real-time simulated stock prices for the **Top 10 stocks only**.

---

## 🎯 Top 10 Stocks (The Only Products)

| Symbol | Company | Sector |
|--------|---------|--------|
| AAPL | Apple Inc. | Technology |
| MSFT | Microsoft | Technology |
| NVDA | NVIDIA | Technology |
| AMZN | Amazon | Consumer |
| GOOGL | Alphabet | Technology |
| META | Meta Platforms | Technology |
| TSLA | Tesla | Consumer |
| JPM | JPMorgan Chase | Financials |
| V | Visa | Financials |
| NFLX | Netflix | Communication |

---

## 🏗️ Architecture

```
livemarketai/
├── backend/
│   ├── main.py          # FastAPI app + WebSocket market engine
│   ├── models.py        # SQLAlchemy ORM models
│   ├── database.py      # DB connection (SQLite default / MySQL optional)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # API client
│   │   ├── context/AppContext.js # Global state
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── StockCard.jsx    # Amazon product card
│   │   │   ├── OrderModal.jsx   # Buy/Sell modal
│   │   │   ├── MarketTicker.jsx # Live price scrollbar
│   │   │   ├── StarRating.jsx
│   │   │   └── Toast.jsx
│   │   └── pages/
│   │       ├── HomePage.jsx     # Product catalog
│   │       ├── StockDetailPage.jsx # Product detail + chart
│   │       ├── PortfolioPage.jsx   # Cart + Holdings
│   │       ├── WatchlistPage.jsx   # Wishlist
│   │       ├── OrdersPage.jsx      # Order history
│   │       ├── DashboardPage.jsx   # Analytics
│   │       └── SearchPage.jsx      # Search
│   └── package.json
├── setup.bat / setup.sh
└── run.bat / run.sh
```

---

## 🚀 Quick Start

### Windows
```bat
setup.bat
run.bat
```

### Linux / Mac
```bash
chmod +x setup.sh run.sh
./setup.sh
./run.sh
```

### Manual
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate      # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm start
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws/market |

---

## ⚙️ Configuration

### Use MySQL instead of SQLite
Set environment variable before starting backend:
```bash
export DATABASE_URL="mysql+pymysql://user:password@localhost/livemarketai"
```

### Frontend API URL
Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws/market
```

---

## 💰 Financial Features

- **$100,000** paper trading account (auto-created)
- **Market Orders** — instant execution at current price
- **Limit Orders** — set your target price
- **Portfolio tracking** — real-time P&L per position
- **Order history** — full transaction ledger
- **Risk check** — insufficient funds / shares validation
- **Fund settlement** — immediate balance update on trade

---

## 📡 Mock Market Engine

The backend runs a **local random-walk price simulator**:
- Prices update every **2 seconds** via WebSocket
- Mean-reversion to keep prices realistic
- Per-stock volatility calibration (TSLA = high, V = low)
- Occasional spike events (2% probability)
- 90 days of historical candle data pre-generated

---

## 🎨 UI Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Amazon-style product catalog |
| Stock | `/stock/:symbol` | Product detail + chart + buy box |
| Portfolio | `/portfolio` | Cart + holdings table |
| Watchlist | `/watchlist` | Wishlist |
| Orders | `/orders` | Order history |
| Dashboard | `/dashboard` | Analytics + charts |
| Search | `/search?q=...` | Client-side filtered search |

---

## ⚠️ Disclaimer

This is a **paper trading simulation**. No real money is involved. All prices are locally generated. Not financial advice.
