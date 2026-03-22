import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StarRating from './StarRating';
import UPIPaymentModal from './UPIPaymentModal';

const BADGE_STYLES = {
  'Best Seller':           { background: '#CC0C39', color: 'white' },
  "LiveMarketAI's Choice": { background: '#007185', color: 'white' },
  '#1 in AI Chips':        { background: '#CC0C39', color: 'white' },
  'Prime Eligible':        { background: '#00A8E1', color: 'white' },
  'Top Rated':             { background: '#067D62', color: 'white' },
  'Trending':              { background: '#e07b39', color: 'white' },
  'Lightning Deal':        { background: '#CC0C39', color: 'white' },
  'Reliable Pick':         { background: '#565959', color: 'white' },
  'Dividend Pick':         { background: '#067D62', color: 'white' },
  'New High':              { background: '#CC0C39', color: 'white' },
};

export default function StockCard({ stock }) {
  const { prices, addToCart, toggleWatchlist, watchlist, placeOrder } = useApp();
  const [hovered,    setHovered]    = useState(false);
  const [priceAnim,  setPriceAnim]  = useState('');
  const [showUPI,    setShowUPI]    = useState(false);
  const [lockedPrice,setLockedPrice]= useState(0);
  const prevPrice = useRef(null);

  const liveData  = prices[stock.symbol] || {};
  const price     = liveData.price || stock.price || stock.base_price;
  const changePct = liveData.change_pct ?? stock.change_pct ?? 0;
  const change    = liveData.change    ?? stock.change    ?? 0;
  const isUp      = changePct >= 0;
  const inWatchlist = watchlist?.some(w => w.symbol === stock.symbol);

  useEffect(() => {
    if (prevPrice.current !== null && prevPrice.current !== price) {
      setPriceAnim(price > prevPrice.current ? 'price-up' : 'price-down');
      const t = setTimeout(() => setPriceAnim(''), 1000);
      return () => clearTimeout(t);
    }
    prevPrice.current = price;
  }, [price]);

  const badgeStyle = BADGE_STYLES[stock.badge] || { background: '#565959', color: 'white' };

  const handleAddToCart = (e) => {
    e.preventDefault(); e.stopPropagation();
    addToCart(stock, 1);
  };

  /* "Buy Now" on card → freeze current price → show UPI modal */
  const handleBuyNow = (e) => {
    e.preventDefault(); e.stopPropagation();
    setLockedPrice(price); // freeze NOW
    setShowUPI(true);
  };

  const handlePaymentSuccess = async () => {
    setShowUPI(false);
    try { await placeOrder(stock.symbol, 'BUY', 1, 'MARKET', lockedPrice); } catch {}
  };

  const handleWatchlist = (e) => {
    e.preventDefault(); e.stopPropagation();
    toggleWatchlist(stock);
  };

  return (
    <>
      <Link to={`/stock/${stock.symbol}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: 'white',
            border: hovered ? '1px solid var(--az-orange)' : '1px solid var(--az-border)',
            borderRadius: '8px', overflow: 'hidden',
            boxShadow: hovered ? 'var(--az-card-shadow-hover)' : 'var(--az-card-shadow)',
            transition: 'all 0.2s ease',
            display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%',
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '20px', textAlign: 'center', position: 'relative', minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={handleWatchlist} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', opacity: inWatchlist ? 1 : 0.4, transition: 'opacity 0.2s, transform 0.2s', transform: inWatchlist ? 'scale(1.1)' : 'scale(1)' }}
              title={inWatchlist ? 'Remove from Wishlist' : 'Add to Wishlist'}>
              {inWatchlist ? '❤️' : '🤍'}
            </button>

            {stock.badge && (
              <div style={{ position: 'absolute', top: '8px', left: '8px', ...badgeStyle, fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stock.badge}
              </div>
            )}

            <div style={{ fontSize: '64px', lineHeight: '1', marginBottom: '8px' }}>{stock.logo}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#131921', letterSpacing: '1px' }}>{stock.symbol}</div>
            <div style={{ fontSize: '12px', color: '#565959', marginTop: '2px' }}>{stock.sector}</div>
          </div>

          {/* Body */}
          <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#007185', lineHeight: '1.4' }}>{stock.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <StarRating rating={stock.rating} />
              <span style={{ color: '#007185', fontSize: '12px' }}>{(stock.review_count || 0).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#565959' }}>
              Analyst: <span style={{ fontWeight: '600', color: stock.analyst_rating === 'Strong Buy' ? '#067D62' : '#007185' }}>{stock.analyst_rating}</span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <div className={priceAnim} style={{ fontSize: '22px', fontWeight: '700', color: '#B12704', padding: '2px 4px', borderRadius: '3px', display: 'inline-block' }}>
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '13px', color: isUp ? '#067D62' : '#B12704', fontWeight: '600', marginTop: '2px' }}>
                {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                <span style={{ color: '#565959', fontWeight: '400', marginLeft: '4px' }}>({isUp ? '+' : ''}{change.toFixed(2)})</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#565959' }}>
              Mkt Cap: <span style={{ fontWeight: '500' }}>{stock.market_cap}</span>
              <span style={{ marginLeft: '8px' }}>P/E: <span style={{ fontWeight: '500' }}>{stock.pe_ratio}</span></span>
            </div>
            {stock.dividend_yield > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--az-prime)', fontWeight: '500' }}>
                💰 Dividend: {stock.dividend_yield}% yield
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleAddToCart} style={{ background: 'var(--az-yellow)', border: '1px solid #a88734', borderRadius: '20px', padding: '8px 12px', fontSize: '13px', fontWeight: '600', width: '100%', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.target.style.background = 'var(--az-yellow-hover)'}
              onMouseLeave={e => e.target.style.background = 'var(--az-yellow)'}>
              🛒 Add to Cart
            </button>
            <button onClick={handleBuyNow} style={{ background: 'var(--az-orange)', border: '1px solid #c45500', borderRadius: '20px', padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: 'white', width: '100%', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.target.style.background = 'var(--az-orange-hover)'}
              onMouseLeave={e => e.target.style.background = 'var(--az-orange)'}>
              ⚡ Buy Now
            </button>
          </div>
        </div>
      </Link>

      {/* UPI Modal for this card's Buy Now */}
      {showUPI && (
        <UPIPaymentModal
          amount={lockedPrice * 1}
          items={[{ ...stock, price: lockedPrice, quantity: 1 }]}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowUPI(false)}
        />
      )}
    </>
  );
}
