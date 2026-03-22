/* ═══════════════════════════════════════════════════
   LOCAL STORE  —  replaces SQLite / backend APIs
   All data persisted in localStorage
   ═══════════════════════════════════════════════════ */

const KEY = {
  USER:      'lmai_user',
  PORTFOLIO: 'lmai_portfolio',   // { [symbol]: { quantity, avg_cost } }
  ORDERS:    'lmai_orders',      // []
  WATCHLIST: 'lmai_watchlist',   // [symbol, ...]
  BALANCE:   'lmai_balance',
};

const STARTING_BALANCE = 100000;

/* ── helpers ── */
const get  = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const set  = (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid  = ()       => Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ══════════════ USER ══════════════ */
export function getOrCreateUser() {
  let user = get(KEY.USER, null);
  if (!user) {
    user = { id: uid(), username: 'demo_trader', email: 'demo@livemarketai.com', created: Date.now() };
    set(KEY.USER, user);
  }
  return user;
}

/* ══════════════ BALANCE ══════════════ */
export function getBalance()         { return get(KEY.BALANCE, STARTING_BALANCE); }
export function setBalance(amt)      { set(KEY.BALANCE, +amt.toFixed(2)); }
export function deposit(amount)      { setBalance(getBalance() + amount); return getBalance(); }

/* ══════════════ ORDERS ══════════════ */
export function getOrders()          { return get(KEY.ORDERS, []); }

function addOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  set(KEY.ORDERS, orders.slice(0, 500)); // keep last 500
}

/* ══════════════ PORTFOLIO ══════════════ */
export function getPositionsRaw()    { return get(KEY.PORTFOLIO, {}); }

export function placeOrderLocal({ symbol, order_type, quantity, price }) {
  const balance    = getBalance();
  const total      = price * quantity;
  const positions  = getPositionsRaw();

  if (order_type === 'BUY') {
    if (balance < total) throw new Error(`Insufficient funds. Need $${total.toFixed(2)}, have $${balance.toFixed(2)}`);
    setBalance(balance - total);

    if (positions[symbol]) {
      const pos      = positions[symbol];
      const newQty   = pos.quantity + quantity;
      const newCost  = (pos.avg_cost * pos.quantity + price * quantity) / newQty;
      positions[symbol] = { quantity: +newQty.toFixed(4), avg_cost: +newCost.toFixed(4) };
    } else {
      positions[symbol] = { quantity: +quantity.toFixed(4), avg_cost: +price.toFixed(4) };
    }
  } else {
    const pos = positions[symbol];
    if (!pos || pos.quantity < quantity) throw new Error(`Insufficient shares`);
    setBalance(balance + total);
    const newQty = pos.quantity - quantity;
    if (newQty <= 0.001) delete positions[symbol];
    else positions[symbol] = { ...pos, quantity: +newQty.toFixed(4) };
  }

  set(KEY.PORTFOLIO, positions);

  const order = {
    id:          uid(),
    symbol,
    order_type,
    quantity,
    price:       +price.toFixed(2),
    total_value: +total.toFixed(2),
    status:      'EXECUTED',
    timestamp:   new Date().toISOString(),
  };
  addOrder(order);
  return { ...order, new_balance: getBalance() };
}

export function getPortfolio(livePrices = {}, stocksMeta = {}) {
  const raw      = getPositionsRaw();
  const positions = [];
  let totalValue = 0, totalCost = 0;

  Object.entries(raw).forEach(([sym, pos]) => {
    if (pos.quantity <= 0) return;
    const currentPrice = livePrices[sym]?.price || pos.avg_cost;
    const marketValue  = pos.quantity * currentPrice;
    const costBasis    = pos.quantity * pos.avg_cost;
    const pnl          = marketValue - costBasis;
    const meta         = stocksMeta[sym] || {};

    positions.push({
      symbol:        sym,
      name:          meta.name   || sym,
      logo:          meta.logo   || '📈',
      quantity:      pos.quantity,
      avg_cost:      +pos.avg_cost.toFixed(2),
      current_price: +currentPrice.toFixed(2),
      market_value:  +marketValue.toFixed(2),
      cost_basis:    +costBasis.toFixed(2),
      pnl:           +pnl.toFixed(2),
      pnl_pct:       costBasis > 0 ? +(pnl / costBasis * 100).toFixed(2) : 0,
      change_pct:    livePrices[sym]?.change_pct || 0,
    });
    totalValue += marketValue;
    totalCost  += costBasis;
  });

  const cash = getBalance();
  return {
    positions,
    total_market_value: +totalValue.toFixed(2),
    total_cost_basis:   +totalCost.toFixed(2),
    total_pnl:          +(totalValue - totalCost).toFixed(2),
    total_pnl_pct:      totalCost > 0 ? +((totalValue - totalCost) / totalCost * 100).toFixed(2) : 0,
    cash_balance:       +cash.toFixed(2),
    net_worth:          +(totalValue + cash).toFixed(2),
  };
}

/* ══════════════ WATCHLIST ══════════════ */
export function getWatchlist()       { return get(KEY.WATCHLIST, []); }
export function addToWatchlist(sym)  { const w = getWatchlist(); if (!w.includes(sym)) { w.push(sym); set(KEY.WATCHLIST, w); } }
export function removeFromWatchlist(sym) { set(KEY.WATCHLIST, getWatchlist().filter(s => s !== sym)); }
