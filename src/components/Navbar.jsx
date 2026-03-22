import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const navStyles = {
  topBar: {
    background: 'var(--az-navy)',
    color: 'white',
    width: '100%',
    zIndex: 1000,
    position: 'sticky',
    top: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,.4)',
  },
  mainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    maxWidth: '1500px',
    margin: '0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '22px',
    fontWeight: '700',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '3px',
    border: '1px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '40px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
    color: '#333',
  },
  searchBtn: {
    background: 'var(--az-orange)',
    border: 'none',
    padding: '0 16px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    color: '#333',
    transition: 'background 0.15s',
  },
  navLink: {
    color: 'white',
    fontSize: '13px',
    padding: '4px 8px',
    borderRadius: '3px',
    border: '1px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    flexDirection: 'column',
    textDecoration: 'none',
    lineHeight: '1.3',
  },
  navLinkSmall: { fontSize: '11px', color: '#ccc' },
  navLinkBig: { fontSize: '14px', fontWeight: '700' },
  cartBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'white',
    padding: '4px 8px',
    border: '1px solid transparent',
    borderRadius: '3px',
    cursor: 'pointer',
    background: 'none',
    fontSize: '14px',
    textDecoration: 'none',
  },
  cartCount: {
    color: 'var(--az-orange)',
    fontSize: '18px',
    fontWeight: '700',
  },
  subNav: {
    background: 'var(--az-nav)',
    color: 'white',
    fontSize: '13px',
  },
  subNavInner: {
    display: 'flex',
    gap: '4px',
    padding: '4px 12px',
    maxWidth: '1500px',
    margin: '0 auto',
    overflowX: 'auto',
  },
  subNavLink: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '3px',
    border: '1px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    fontSize: '13px',
  },
};

function HoverLink({ style, children, to, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to || '#'}
      onClick={onClick}
      style={{ ...style, border: hovered ? '1px solid white' : '1px solid transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, cartItems, portfolio, prices } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const balance = user?.balance ?? portfolio?.cash_balance ?? 100000;
  const cartCount = cartItems?.length ?? 0;

  // Market trend indicator
  const priceVals = Object.values(prices || {});
  const avgChange = priceVals.length
    ? priceVals.reduce((a, b) => a + (b.change_pct || 0), 0) / priceVals.length
    : 0;
  const marketUp = avgChange >= 0;

  return (
    <nav style={navStyles.topBar}>
      {/* Main Row */}
      <div style={navStyles.mainRow}>
        {/* Logo */}
        <Link to="/" style={navStyles.logo}>
          <span style={{ fontSize: '28px' }}>📈</span>
          <span>
            LiveMarket<span style={{ color: 'var(--az-orange)' }}>AI</span>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--az-orange)', fontWeight: '400', marginTop: '10px' }}>.com</span>
        </Link>

        {/* Deliver to */}
        <div style={{ ...navStyles.navLink, minWidth: '90px' }} className="hide-mobile">
          <span style={navStyles.navLinkSmall}>📍 Market Status</span>
          <span style={{ ...navStyles.navLinkBig, color: marketUp ? '#67e8a9' : '#f87171', fontSize: '13px' }}>
            {marketUp ? '▲ Bullish' : '▼ Bearish'}
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={navStyles.searchBar}>
          <select style={{ background: '#f3f3f3', border: 'none', padding: '0 8px', fontSize: '12px', color: '#555', borderRight: '1px solid #ccc', cursor: 'pointer', minWidth: '80px' }}>
            <option>All Stocks</option>
            <option>Tech</option>
            <option>Finance</option>
            <option>Trending</option>
          </select>
          <input
            style={navStyles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stocks..."
          />
          <button type="submit" style={navStyles.searchBtn}>🔍</button>
        </form>

        {/* Account & Balance */}
        <div style={{ ...navStyles.navLink, minWidth: '110px' }} className="hide-mobile">
          <span style={navStyles.navLinkSmall}>Hello, {user?.username || 'Trader'}</span>
          <span style={navStyles.navLinkBig}>
            <span style={{ color: 'var(--az-orange)', fontSize: '12px' }}>
              ${(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        </div>

        {/* Returns & Orders */}
        <HoverLink to="/orders" style={navStyles.navLink}>
          <span style={navStyles.navLinkSmall}>Returns &</span>
          <span style={navStyles.navLinkBig}>Orders</span>
        </HoverLink>

        {/* Watchlist */}
        <HoverLink to="/watchlist" style={navStyles.navLink}>
          <span style={navStyles.navLinkSmall}>❤️ Wish</span>
          <span style={navStyles.navLinkBig}>list</span>
        </HoverLink>

        {/* Cart (Portfolio) */}
        <Link to="/portfolio" style={navStyles.cartBtn}>
          <span style={{ fontSize: '24px' }}>🛒</span>
          <span style={navStyles.cartCount}>{cartCount}</span>
          <span style={{ fontWeight: '700' }}>Cart</span>
        </Link>
      </div>

      {/* Sub Navigation */}
      <div style={navStyles.subNav}>
        <div style={navStyles.subNavInner}>
          <Link to="/" style={{ ...navStyles.subNavLink, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ☰ All Stocks
          </Link>
          <Link to="/dashboard" style={navStyles.subNavLink}>📊 Dashboard</Link>
          <Link to="/?sector=Technology" style={navStyles.subNavLink}>💻 Technology</Link>
          <Link to="/?sector=Financials" style={navStyles.subNavLink}>🏦 Financials</Link>
          <Link to="/?badge=Best+Seller" style={navStyles.subNavLink}>🔥 Best Sellers</Link>
          <Link to="/?sort=gainers" style={navStyles.subNavLink}>📈 Top Gainers</Link>
          <Link to="/?sort=losers" style={navStyles.subNavLink}>📉 Top Losers</Link>
          <Link to="/watchlist" style={navStyles.subNavLink}>❤️ Your Wishlist</Link>
          <span style={{ ...navStyles.subNavLink, color: '#ff6b6b', fontWeight: '600' }}>
            ⚡ Lightning Deals
          </span>
        </div>
      </div>
    </nav>
  );
}
