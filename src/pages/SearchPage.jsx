import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import StockCard from '../components/StockCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const { prices } = useApp();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localQ, setLocalQ] = useState(q);

  useEffect(() => {
    api.getStocks(prices).then(data => { setStocks(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { setLocalQ(q); }, [q]);

  const results = useMemo(() => {
    const query = localQ.toLowerCase().trim();
    if (!query) return stocks;
    return stocks.filter(s =>
      s.symbol.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      s.sector.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.analyst_rating.toLowerCase().includes(query)
    );
  }, [stocks, localQ]);

  const enriched = results.map(s => ({
    ...s,
    price: prices[s.symbol]?.price || s.price,
    change_pct: prices[s.symbol]?.change_pct ?? s.change_pct,
    change: prices[s.symbol]?.change ?? s.change,
  }));

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: localQ });
  };

  return (
    <div className="container" style={{ padding: '20px 12px' }}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px', maxWidth: '600px' }}>
        <input
          value={localQ}
          onChange={e => setLocalQ(e.target.value)}
          placeholder="Search stocks by name, symbol, or sector..."
          style={{
            flex: 1, padding: '10px 14px', border: '2px solid var(--az-orange)',
            borderRadius: '4px', fontSize: '14px', outline: 'none',
          }}
          autoFocus
        />
        <button type="submit" style={{
          background: 'var(--az-orange)', border: 'none', borderRadius: '4px',
          padding: '10px 20px', fontSize: '15px', cursor: 'pointer',
        }}>
          🔍
        </button>
      </form>

      {/* Results header */}
      <div style={{ marginBottom: '16px' }}>
        {localQ ? (
          <div style={{ fontSize: '15px' }}>
            {loading ? 'Searching...' : (
              <span>
                <strong>{enriched.length}</strong> result{enriched.length !== 1 ? 's' : ''} for{' '}
                <strong>"{localQ}"</strong>
              </span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '15px', color: '#565959' }}>
            Showing all {stocks.length} stocks. Enter a search term above.
          </div>
        )}
      </div>

      {/* Tag suggestions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {['tech', 'finance', 'NVDA', 'buy', 'dividend', 'Tesla', 'Apple'].map(tag => (
          <button key={tag}
            onClick={() => { setLocalQ(tag); setSearchParams({ q: tag }); }}
            style={{
              padding: '4px 12px', border: '1px solid var(--az-link)',
              borderRadius: '20px', background: 'white', color: 'var(--az-link)',
              fontSize: '13px', cursor: 'pointer',
            }}>
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : enriched.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🔍</div>
          <h2>No results for "{localQ}"</h2>
          <p style={{ color: '#565959', marginTop: '8px' }}>
            Only top 10 stocks are available: AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, JPM, V, NFLX
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {enriched.map(stock => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
}
