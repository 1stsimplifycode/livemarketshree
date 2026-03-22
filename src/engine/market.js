/* ═══════════════════════════════════════════════════
   LOCAL MARKET ENGINE
   Runs entirely in the browser - no backend needed
   ═══════════════════════════════════════════════════ */

export const STOCKS_META = {
  AAPL: { name: 'Apple Inc.',            sector: 'Technology',            base: 189.50, vol: 0.008,  logo: '🍎', badge: 'Best Seller',           rating: 4.5, reviews: 142893, market_cap: '2.98T', pe: 31.2, div: 0.5,  analyst: 'Strong Buy', high52: 199.62, low52: 164.08, desc: 'Consumer electronics, software, and services. Maker of iPhone, Mac, iPad.' },
  MSFT: { name: 'Microsoft Corporation', sector: 'Technology',            base: 415.80, vol: 0.007,  logo: '🪟', badge: "LiveMarketAI's Choice",  rating: 4.7, reviews: 98234,  market_cap: '3.09T', pe: 37.1, div: 0.7,  analyst: 'Strong Buy', high52: 430.82, low52: 309.45, desc: 'Cloud computing and software. Azure and Office 365 market leader.' },
  NVDA: { name: 'NVIDIA Corporation',    sector: 'Technology',            base: 875.40, vol: 0.018,  logo: '🎮', badge: '#1 in AI Chips',         rating: 4.8, reviews: 67821,  market_cap: '2.16T', pe: 68.4, div: 0.0,  analyst: 'Strong Buy', high52: 974.00, low52: 373.38, desc: 'Graphics processing units and AI accelerator chips. Dominant in AI computing.' },
  AMZN: { name: 'Amazon.com Inc.',       sector: 'Consumer Discretionary',base: 182.30, vol: 0.010,  logo: '📦', badge: 'Prime Eligible',         rating: 4.6, reviews: 203451, market_cap: '1.89T', pe: 59.3, div: 0.0,  analyst: 'Buy',        high52: 191.70, low52: 120.21, desc: 'E-commerce, cloud computing (AWS), digital streaming and logistics.' },
  GOOGL: { name: 'Alphabet Inc.',        sector: 'Technology',            base: 163.70, vol: 0.009,  logo: '🔍', badge: 'Top Rated',              rating: 4.4, reviews: 87654,  market_cap: '2.04T', pe: 25.8, div: 0.0,  analyst: 'Buy',        high52: 175.65, low52: 120.21, desc: 'Search engine, YouTube, Google Cloud and autonomous vehicles.' },
  META: { name: 'Meta Platforms Inc.',   sector: 'Technology',            base: 524.90, vol: 0.012,  logo: '👾', badge: 'Trending',               rating: 4.3, reviews: 54321,  market_cap: '1.33T', pe: 29.4, div: 0.4,  analyst: 'Buy',        high52: 531.49, low52: 279.40, desc: 'Facebook, Instagram, WhatsApp and the metaverse ecosystem.' },
  TSLA: { name: 'Tesla Inc.',            sector: 'Consumer Discretionary',base: 248.50, vol: 0.022,  logo: '⚡', badge: 'Lightning Deal',         rating: 4.1, reviews: 134567, market_cap: '790B',  pe: 79.2, div: 0.0,  analyst: 'Hold',       high52: 299.29, low52: 138.80, desc: 'Electric vehicles, energy storage and solar products.' },
  JPM:  { name: 'JPMorgan Chase & Co.', sector: 'Financials',            base: 198.20, vol: 0.007,  logo: '🏦', badge: 'Reliable Pick',          rating: 4.2, reviews: 43210,  market_cap: '571B',  pe: 12.1, div: 2.3,  analyst: 'Buy',        high52: 220.82, low52: 140.00, desc: 'Investment banking, commercial banking and asset management.' },
  V:    { name: 'Visa Inc.',             sector: 'Financials',            base: 272.40, vol: 0.006,  logo: '💳', badge: 'Dividend Pick',          rating: 4.6, reviews: 38920,  market_cap: '553B',  pe: 31.0, div: 0.8,  analyst: 'Strong Buy', high52: 290.96, low52: 227.16, desc: 'Global payments technology. Facilitates digital payments in 200+ countries.' },
  NFLX: { name: 'Netflix Inc.',          sector: 'Communication Services',base: 628.70, vol: 0.014,  logo: '🎬', badge: 'New High',               rating: 4.2, reviews: 78901,  market_cap: '270B',  pe: 47.8, div: 0.0,  analyst: 'Buy',        high52: 691.69, low52: 344.73, desc: 'Subscription streaming with 260M+ global subscribers.' },
};

const SYMBOLS = Object.keys(STOCKS_META);

/* ── Seeded deterministic random walk (reproducible) ── */
let seed = Date.now();
function rand() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}
function randn() {
  // Box-Muller
  return Math.sqrt(-2 * Math.log(rand() + 1e-10)) * Math.cos(2 * Math.PI * rand());
}

/* ── Internal price state ── */
const state = {};
SYMBOLS.forEach(sym => {
  const meta = STOCKS_META[sym];
  state[sym] = {
    price:    meta.base,
    open:     meta.base,
    high:     meta.base,
    low:      meta.base,
    prevClose:meta.base,
  };
});

/* ── Generate 90 days of candle history ── */
function generateHistory(sym) {
  const meta    = STOCKS_META[sym];
  const candles = [];
  let   price   = meta.base * 0.85;
  const now     = Math.floor(Date.now() / 1000);

  for (let i = 90; i >= 0; i--) {
    const t      = now - i * 86400;
    const change = randn() * meta.vol + 0.0002;
    price        = Math.max(price * (1 + change), meta.base * 0.4);
    const spread = meta.vol * 0.4;
    const high   = price * (1 + Math.abs(randn() * spread));
    const low    = price * (1 - Math.abs(randn() * spread));
    const open   = price * (1 + randn() * spread * 0.5);
    candles.push({
      time:   t,
      open:   +open.toFixed(2),
      high:   +high.toFixed(2),
      low:    +low.toFixed(2),
      close:  +price.toFixed(2),
      volume: Math.floor(rand() * 70000000 + 10000000),
    });
  }
  return candles;
}

const candleHistory = {};
SYMBOLS.forEach(sym => { candleHistory[sym] = generateHistory(sym); });

/* ── Tick: update all prices ── */
export function tick() {
  const updates = {};
  SYMBOLS.forEach(sym => {
    const meta = STOCKS_META[sym];
    const s    = state[sym];

    // Mean-reverting random walk
    const reversion = 0.0008 * (meta.base - s.price) / meta.base;
    const change    = randn() * meta.vol + reversion + 0.00005;
    // Occasional spike
    const spike     = rand() < 0.02 ? randn() * meta.vol * 4 : 0;

    const newPrice  = Math.max(s.price * (1 + change + spike), meta.base * 0.45);
    s.price         = +newPrice.toFixed(2);
    s.high          = Math.max(s.high, s.price);
    s.low           = Math.min(s.low,  s.price);

    updates[sym] = {
      symbol:     sym,
      price:      s.price,
      change:     +(s.price - s.prevClose).toFixed(2),
      change_pct: +((s.price - s.prevClose) / s.prevClose * 100).toFixed(2),
      volume:     Math.floor(rand() * 60000000 + 10000000),
    };
  });
  return updates;
}

/* ── Get full stock info + live price ── */
export function getStockInfo(sym, livePrice) {
  const meta  = STOCKS_META[sym];
  const s     = state[sym];
  const price = livePrice || s.price;
  return {
    symbol:        sym,
    name:          meta.name,
    sector:        meta.sector,
    description:   meta.desc,
    market_cap:    meta.market_cap,
    pe_ratio:      meta.pe,
    dividend_yield:meta.div,
    rating:        meta.rating,
    review_count:  meta.reviews,
    badge:         meta.badge,
    logo:          meta.logo,
    analyst_rating:meta.analyst,
    high_52w:      meta.high52,
    low_52w:       meta.low52,
    price,
    change:        +(price - meta.base).toFixed(2),
    change_pct:    +((price - meta.base) / meta.base * 100).toFixed(2),
    candles:       candleHistory[sym],
  };
}

export function getAllStocks(prices = {}) {
  return SYMBOLS.map(sym => getStockInfo(sym, prices[sym]?.price));
}

export { candleHistory, SYMBOLS };
