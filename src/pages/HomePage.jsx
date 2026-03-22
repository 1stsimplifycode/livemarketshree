import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import StockCard from '../components/StockCard';
import MarketTicker from '../components/MarketTicker';

const HERO_BANNERS = [
  { bg: 'linear-gradient(135deg,#131921 0%,#1a2535 100%)', emoji: '📈', title: 'Trade Stocks Like Shopping', sub: 'Top 10 stocks. Real-time prices. Zero friction.', cta: 'Shop Stocks Now' },
  { bg: 'linear-gradient(135deg,#0d3349 0%,#1a5276 100%)', emoji: '🔥', title: 'Today\'s Lightning Deals', sub: 'NVDA up 3.2% • TSLA volatile • META new highs', cta: 'View Deals' },
  { bg: 'linear-gradient(135deg,#4a235a 0%,#7d3c98 100%)', emoji: '💰', title: 'Prime Trading Benefits', sub: 'Zero commission • Instant execution • Live charts', cta: 'Start Trading' },
];

export default function HomePage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { prices } = useApp();
  const [searchParams] = useSearchParams();
  const [activeBanner, setActiveBanner] = useState(0);
  const [sortBy, setSortBy] = useState('');
  const [filterSector, setFilterSector] = useState('');

  const sector = searchParams.get('sector') || '';
  const badge = searchParams.get('badge') || '';
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    api.getStocks(prices).then(data => { setStocks(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveBanner(b => (b + 1) % HERO_BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sector) setFilterSector(sector);
    if (sort) setSortBy(sort);
  }, [sector, sort, badge]);

  const enrichedStocks = useMemo(() => stocks.map(s => ({
    ...s,
    price: prices[s.symbol]?.price || s.price,
    change_pct: prices[s.symbol]?.change_pct ?? s.change_pct,
    change: prices[s.symbol]?.change ?? s.change,
  })), [stocks, prices]);

  const filteredStocks = useMemo(() => {
    let list = [...enrichedStocks];
    if (filterSector) list = list.filter(s => s.sector === filterSector);
    if (badge) list = list.filter(s => s.badge === badge);
    if (sortBy === 'gainers') list.sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0));
    else if (sortBy === 'losers') list.sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0));
    else if (sortBy === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [enrichedStocks, filterSector, badge, sortBy]);

  const topGainers = [...enrichedStocks].sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0)).slice(0, 3);
  const topLosers = [...enrichedStocks].sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0)).slice(0, 3);
  const banner = HERO_BANNERS[activeBanner];

  return (
    <div>
      <MarketTicker />

      {/* Hero Banner */}
      <div style={{
        background: banner.bg,
        color: 'white',
        padding: '48px 24px',
        textAlign: 'center',
        transition: 'background 1s ease',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ fontSize: '56px', marginBottom: '12px' }}>{banner.emoji}</div>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>{banner.title}</h1>
        <p style={{ fontSize: '16px', color: '#ccc', marginBottom: '20px' }}>{banner.sub}</p>
        <button style={{
          background: 'var(--az-orange)', color: '#131921', border: 'none',
          padding: '12px 32px', borderRadius: '24px', fontSize: '15px', fontWeight: '700',
          cursor: 'pointer',
        }}>{banner.cta}</button>
        {/* Banner dots */}
        <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
          {HERO_BANNERS.map((_, i) => (
            <div key={i} onClick={() => setActiveBanner(i)} style={{
              width: i === activeBanner ? '20px' : '8px', height: '8px',
              borderRadius: '4px', background: i === activeBanner ? 'var(--az-orange)' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Market Summary Strip */}
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto', display: 'flex', gap: '24px', overflowX: 'auto', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#565959', whiteSpace: 'nowrap' }}>Market Movers:</span>
          {[...topGainers.map(s => ({ ...s, _type: 'gainer' })), ...topLosers.map(s => ({ ...s, _type: 'loser' }))].map(s => (
            <div key={`${s.symbol}-${s._type}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <span>{s.logo}</span>
              <span style={{ fontWeight: '600', fontSize: '13px' }}>{s.symbol}</span>
              <span style={{ color: s._type === 'gainer' ? '#067D62' : '#B12704', fontSize: '13px', fontWeight: '600' }}>
                {s._type === 'gainer' ? '▲' : '▼'}{Math.abs(s.change_pct || 0).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ padding: '20px 12px' }}>

        {/* Filter & Sort Bar */}
        <div style={{
          background: '#f0f2f2', borderRadius: '8px', padding: '12px 16px',
          marginBottom: '20px', display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#565959' }}>Filter & Sort:</span>

          {/* Sector Filter */}
          <select
            value={filterSector}
            onChange={e => setFilterSector(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer' }}
          >
            <option value="">All Sectors</option>
            <option value="Technology">Technology</option>
            <option value="Financials">Financials</option>
            <option value="Consumer Discretionary">Consumer</option>
            <option value="Communication Services">Communication</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer' }}
          >
            <option value="">Sort By</option>
            <option value="gainers">Top Gainers</option>
            <option value="losers">Top Losers</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Rating</option>
          </select>

          {/* Active filters */}
          {filterSector && (
            <span style={{ background: '#007185', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => setFilterSector('')}>
              {filterSector} ✕
            </span>
          )}
          {sortBy && (
            <span style={{ background: '#565959', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => setSortBy('')}>
              {sortBy} ✕
            </span>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#565959' }}>
            {filteredStocks.length} results
          </span>
        </div>

        {/* Section Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
            {filterSector || badge || sortBy ? `Filtered Stocks` : 'Top Stocks — Featured Products'}
          </h2>
          <span style={{ color: '#007185', fontSize: '13px', cursor: 'pointer' }}>See all results</span>
        </div>

        {/* Stock Grid */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px',
          }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: '380px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {filteredStocks.map(stock => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}

        {/* "Customers also bought" row */}
        {!loading && filteredStocks.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid var(--az-orange)', paddingBottom: '8px', display: 'inline-block' }}>
              🔥 Today's Biggest Movers
            </h2>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {[...enrichedStocks]
                .sort((a, b) => Math.abs(b.change_pct || 0) - Math.abs(a.change_pct || 0))
                .slice(0, 5)
                .map(s => {
                  const up = (s.change_pct || 0) >= 0;
                  return (
                    <div key={s.symbol} style={{
                      background: 'white', border: '1px solid #eee', borderRadius: '8px',
                      padding: '16px', minWidth: '140px', textAlign: 'center',
                      boxShadow: 'var(--az-card-shadow)',
                    }}>
                      <div style={{ fontSize: '36px' }}>{s.logo}</div>
                      <div style={{ fontWeight: '700', fontSize: '15px', marginTop: '4px' }}>{s.symbol}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#B12704' }}>${(s.price || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '13px', color: up ? '#067D62' : '#B12704', fontWeight: '600' }}>
                        {up ? '▲' : '▼'}{Math.abs(s.change_pct || 0).toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div style={{
          marginTop: '40px', background: 'white', border: '1px solid #ddd',
          borderRadius: '8px', padding: '24px', display: 'flex', gap: '32px',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { icon: '⚡', title: 'Instant Execution', desc: 'Market orders execute in real-time' },
            { icon: '🎯', title: 'Zero Commission', desc: 'No fees on any trade' },
            { icon: '📊', title: 'Live Charts', desc: 'Real-time price visualization' },
            { icon: '💰', title: '$100K Paper Account', desc: 'Start with simulated capital' },
          ].map(f => (
            <div key={f.title} style={{ textAlign: 'center', minWidth: '140px' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>{f.icon}</div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>{f.title}</div>
              <div style={{ color: '#565959', fontSize: '12px' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
