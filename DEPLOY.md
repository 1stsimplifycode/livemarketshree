# 🚀 Deploy LiveMarketAI to Vercel

## One-Click Deploy (Recommended)

### Option A — Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel --prod
```
When prompted:
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `build`

### Option B — Vercel Dashboard (No CLI)
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo (push this folder first)
3. Set **Root Directory** → `frontend`
4. Framework preset → **Create React App**
5. Click **Deploy** ✅

---

## Add Your UPI QR Code
Place your QR image at:
```
frontend/public/qr.png
```
It will be served at `https://your-app.vercel.app/qr.png` automatically.

---

## No Backend Needed ✅
Everything runs in the browser:
- 📈 Live prices — local random-walk engine (`setInterval` every 2s)
- 💾 Portfolio, orders, watchlist — `localStorage` (persists across sessions)
- 🔌 No WebSocket, no FastAPI, no database required

---

## Local Development
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

## Project Structure (Frontend Only)
```
frontend/
├── public/
│   ├── index.html
│   └── qr.png          ← place your UPI QR here
├── src/
│   ├── engine/
│   │   ├── market.js   ← local price simulator
│   │   └── store.js    ← localStorage persistence
│   ├── api/client.js   ← wraps engine (no HTTP)
│   ├── components/
│   │   ├── UPIPaymentModal.jsx
│   │   ├── StockCard.jsx
│   │   └── ...
│   └── pages/
│       ├── HomePage.jsx
│       ├── StockDetailPage.jsx  ← live candles + UPI
│       ├── PortfolioPage.jsx    ← cart + UPI checkout
│       └── ...
└── vercel.json         ← SPA routing config
```
