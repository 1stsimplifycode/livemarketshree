import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppContext } from './context/AppContext';
import { ToastContainer, useToast } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import StockDetailPage from './pages/StockDetailPage';
import PortfolioPage from './pages/PortfolioPage';
import WatchlistPage from './pages/WatchlistPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import { api } from './api/client';
import { tick, STOCKS_META as META } from './engine/market';
import { getOrCreateUser, getBalance, getPortfolio, getWatchlist } from './engine/store';

function AppInner() {
  const [user,      setUser]      = useState(null);
  const [prices,    setPrices]    = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState({ positions: [], net_worth: 0, cash_balance: 100000 });
  const [cartItems, setCartItems] = useState([]);
  const { toasts, addToast, removeToast } = useToast();

  /* ── Init user from localStorage ── */
  useEffect(() => {
    const u = getOrCreateUser();
    setUser({ ...u, balance: getBalance() });
    refreshPortfolio();
    refreshWatchlist();
  }, []);

  /* ── Local market engine — ticks every 2s (replaces WebSocket) ── */
  useEffect(() => {
    // First tick immediately
    const initial = tick();
    setPrices(initial);

    const interval = setInterval(() => {
      const updates = tick();
      setPrices(prev => ({ ...prev, ...updates }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  /* ── User balance syncs on explicit trade actions only (not every tick) ── */

  const refreshPortfolio = useCallback(() => {
    const p = getPortfolio(prices, META);
    setPortfolio(p);
    setUser(prev => prev ? { ...prev, balance: getBalance() } : prev);
  }, [prices]);

  /* portfolio recalc is triggered by explicit trade actions only */

  const refreshWatchlist = useCallback(() => {
    const symbols = getWatchlist();
    const items = symbols.map(sym => ({
      symbol: sym,
      name:   META[sym]?.name  || sym,
      logo:   META[sym]?.logo  || '📈',
      badge:  META[sym]?.badge || '',
      rating: META[sym]?.rating || 4,
      price:       prices[sym]?.price      || META[sym]?.base || 0,
      change:      prices[sym]?.change     || 0,
      change_pct:  prices[sym]?.change_pct || 0,
    }));
    setWatchlist(items);
  }, [prices]);

  /* watchlist prices are read live from the prices ref in context — no refresh needed */

  /* ── Cart ── */
  const addToCart = useCallback((stock, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.symbol === stock.symbol);
      if (existing) return prev.map(i => i.symbol === stock.symbol ? { ...i, quantity: i.quantity + quantity } : i);
      return [...prev, { ...stock, quantity }];
    });
    addToast(`${stock.symbol} added to cart`, 'success');
  }, [addToast]);

  const removeFromCart = useCallback((symbol) => setCartItems(prev => prev.filter(i => i.symbol !== symbol)), []);
  const clearCart      = useCallback(() => setCartItems([]), []);

  /* ── Place order (local) ── */
  const placeOrder = useCallback(async (symbol, orderType, quantity, _mode, price) => {
    const currentPrice = price || prices[symbol]?.price || META[symbol]?.base || 0;
    try {
      const result = await api.placeOrder({ symbol, order_type: orderType, quantity, price: currentPrice });
      addToast(`${orderType} ${quantity} ${symbol} @ $${result.price.toFixed(2)}`, 'success');
      setUser(prev => prev ? { ...prev, balance: result.new_balance } : prev);
      refreshPortfolio();
      return result;
    } catch (e) {
      addToast(e.message || 'Order failed', 'error');
      throw e;
    }
  }, [prices, addToast, refreshPortfolio]);

  /* ── Watchlist ── */
  const toggleWatchlist = useCallback(async (stock) => {
    const inWatchlist = watchlist.some(w => w.symbol === stock.symbol);
    if (inWatchlist) {
      await api.removeFromWatchlist(user?.id, stock.symbol);
      addToast(`${stock.symbol} removed from wishlist`, 'info');
    } else {
      await api.addToWatchlist(user?.id, stock.symbol);
      addToast(`${stock.symbol} added to wishlist ❤️`, 'success');
    }
    refreshWatchlist();
  }, [watchlist, user, addToast, refreshWatchlist]);

  const ctx = {
    user, setUser, prices, watchlist, setWatchlist, portfolio,
    refreshPortfolio, cartItems, addToCart, removeFromCart,
    clearCart, placeOrder, toggleWatchlist, addToast, refreshWatchlist,
  };

  return (
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', background: 'var(--az-light-bg)' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/"               element={<HomePage />} />
              <Route path="/stock/:symbol"  element={<StockDetailPage />} />
              <Route path="/portfolio"      element={<PortfolioPage />} />
              <Route path="/watchlist"      element={<WatchlistPage />} />
              <Route path="/orders"         element={<OrdersPage />} />
              <Route path="/dashboard"      element={<DashboardPage />} />
              <Route path="/search"         element={<SearchPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default function App() { return <AppInner />; }
