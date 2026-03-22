import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StarRating from '../components/StarRating';

export default function WatchlistPage() {
  const { watchlist, toggleWatchlist, addToCart, prices, refreshWatchlist } = useApp();

  useEffect(() => { refreshWatchlist(); }, []);

  const enriched = watchlist.map(w => ({
    ...w,
    price: prices[w.symbol]?.price || w.price || 0,
    change_pct: prices[w.symbol]?.change_pct ?? w.change_pct ?? 0,
    change: prices[w.symbol]?.change ?? w.change ?? 0,
  }));

  return (
    <div className="container" style={{ padding: '20px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>
          ❤️ Your Wish List
        </h1>
        <span style={{ color: '#565959', fontSize: '14px' }}>{enriched.length} item{enriched.length !== 1 ? 's' : ''}</span>
      </div>

      {enriched.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>🤍</div>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>Your Wish List is empty</h2>
          <p style={{ color: '#565959', marginBottom: '20px' }}>Save stocks you're interested in and track them here.</p>
          <Link to="/" style={{
            background: 'var(--az-yellow)', padding: '10px 24px',
            borderRadius: '20px', fontWeight: '600', color: '#131921', textDecoration: 'none',
          }}>
            Discover Stocks
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1px', background: '#eee', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 200px',
            gap: '12px', padding: '12px 16px', background: '#f0f2f2',
            fontSize: '13px', fontWeight: '700', color: '#565959',
          }}>
            <span></span>
            <span>Stock</span>
            <span style={{ textAlign: 'right' }}>Price</span>
            <span style={{ textAlign: 'right' }}>Today</span>
            <span style={{ textAlign: 'right' }}>Rating</span>
            <span style={{ textAlign: 'center' }}>Actions</span>
          </div>

          {enriched.map(item => {
            const isUp = item.change_pct >= 0;
            return (
              <div key={item.symbol} style={{
                display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 200px',
                gap: '12px', padding: '16px', background: 'white', alignItems: 'center',
              }}>
                <span style={{ fontSize: '36px', textAlign: 'center' }}>{item.logo}</span>

                <div>
                  <Link to={`/stock/${item.symbol}`} style={{ color: 'var(--az-link)', fontWeight: '700', fontSize: '16px' }}>
                    {item.symbol}
                  </Link>
                  <div style={{ fontSize: '13px', color: '#565959' }}>{item.name}</div>
                  {item.badge && (
                    <span style={{
                      display: 'inline-block', marginTop: '4px',
                      background: '#CC0C39', color: 'white',
                      padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '700',
                    }}>{item.badge}</span>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#B12704' }}>
                    ${(item.price || 0).toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: isUp ? '#067D62' : '#B12704' }}>
                    {isUp ? '▲' : '▼'}{Math.abs(item.change_pct).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#565959' }}>
                    {isUp ? '+' : ''}${(item.change || 0).toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <StarRating rating={item.rating || 4} size={13} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => addToCart(item, 1)}
                    style={{
                      width: '100%', padding: '7px 10px', background: 'var(--az-yellow)',
                      border: '1px solid #a88734', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    🛒 Add to Cart
                  </button>
                  <button
                    onClick={() => toggleWatchlist(item)}
                    style={{
                      background: 'none', border: 'none', color: '#B12704',
                      fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
