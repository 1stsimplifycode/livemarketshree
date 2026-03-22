/* ═══════════════════════════════════════════════════
   API CLIENT  —  local-only, no backend required
   Same interface as the HTTP version so all pages
   work without any changes.
   ═══════════════════════════════════════════════════ */
import { getStockInfo, getAllStocks, STOCKS_META } from '../engine/market';
import {
  getOrCreateUser, getBalance, deposit,
  placeOrderLocal, getPortfolio, getOrders,
  getWatchlist, addToWatchlist, removeFromWatchlist,
} from '../engine/store';

/* small async wrapper so call-sites can still await */
const ok = v => Promise.resolve(v);
const delay = (fn) => new Promise(resolve => setTimeout(() => resolve(fn()), 30));

export const api = {
  /* ── Stocks ── */
  getStocks: (prices) =>
    delay(() => getAllStocks(prices)),

  getStock: (symbol, prices) =>
    delay(() => getStockInfo(symbol?.toUpperCase(), prices?.[symbol?.toUpperCase()]?.price)),

  getCandles: (symbol) =>
    delay(() => ({ symbol, candles: getStockInfo(symbol).candles })),

  /* ── Users ── */
  createUser: (_username, _email) =>
    delay(() => { const u = getOrCreateUser(); return { ...u, balance: getBalance() }; }),

  getUser: (_id) =>
    delay(() => { const u = getOrCreateUser(); return { ...u, balance: getBalance() }; }),

  depositFunds: (_userId, amount) =>
    delay(() => { const b = deposit(amount); return { balance: b, deposited: amount }; }),

  /* ── Portfolio ── */
  getPortfolio: (_userId, prices) =>
    delay(() => getPortfolio(prices, STOCKS_META)),

  /* ── Orders ── */
  placeOrder: ({ symbol, order_type, quantity, price }) =>
    delay(() => placeOrderLocal({ symbol, order_type, quantity, price })),

  getOrders: (_userId) =>
    delay(() => getOrders().map(o => ({
      ...o,
      name:  STOCKS_META[o.symbol]?.name || o.symbol,
      logo:  STOCKS_META[o.symbol]?.logo || '📈',
    }))),

  /* ── Watchlist ── */
  getWatchlist: (_userId, prices) =>
    delay(() => getWatchlist().map(sym => ({
      symbol: sym,
      name:   STOCKS_META[sym]?.name  || sym,
      logo:   STOCKS_META[sym]?.logo  || '📈',
      badge:  STOCKS_META[sym]?.badge || '',
      rating: STOCKS_META[sym]?.rating || 4,
      price:       prices?.[sym]?.price      || STOCKS_META[sym]?.base || 0,
      change:      prices?.[sym]?.change     || 0,
      change_pct:  prices?.[sym]?.change_pct || 0,
    }))),

  addToWatchlist:    (_userId, symbol) => delay(() => { addToWatchlist(symbol); return { message: 'Added' }; }),
  removeFromWatchlist:(_userId, symbol) => delay(() => { removeFromWatchlist(symbol); return { message: 'Removed' }; }),

  /* ── Market ── */
  getMarketPrices: (prices) => ok(prices || {}),

  getMarketSummary: (prices) => {
    const vals = Object.values(prices || {});
    const sorted = [...vals].sort((a, b) => b.change_pct - a.change_pct);
    return ok({
      top_gainers: sorted.slice(0, 3),
      top_losers:  sorted.slice(-3).reverse(),
      market_sentiment: (vals.reduce((s, p) => s + p.change_pct, 0) / (vals.length || 1)) >= 0 ? 'bullish' : 'bearish',
      avg_change_pct: vals.length ? +(vals.reduce((s, p) => s + p.change_pct, 0) / vals.length).toFixed(2) : 0,
    });
  },

  /* ── Health (no-op) ── */
  health: () => ok({ status: 'ok (local)', stocks_count: 10 }),
};
