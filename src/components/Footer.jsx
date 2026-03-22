import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      {/* Back to top */}
      <div
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          background: '#37475A', color: 'white', textAlign: 'center',
          padding: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#485769'}
        onMouseLeave={e => e.currentTarget.style.background = '#37475A'}
      >
        Back to top
      </div>

      {/* Main Footer */}
      <div style={{ background: 'var(--az-navy)', color: 'white', padding: '40px 20px' }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px',
        }}>
          <div>
            <div style={{ fontWeight: '700', marginBottom: '12px' }}>Get to Know LiveMarketAI</div>
            {['About Us', 'Careers', 'Press Releases', 'Blog'].map(l => (
              <div key={l} style={{ fontSize: '13px', color: '#ddd', marginBottom: '6px', cursor: 'pointer' }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: '700', marginBottom: '12px' }}>Trade With LiveMarketAI</div>
            {['Open Account', 'Paper Trading', 'API Access', 'Institutional'].map(l => (
              <div key={l} style={{ fontSize: '13px', color: '#ddd', marginBottom: '6px', cursor: 'pointer' }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: '700', marginBottom: '12px' }}>Let Us Help You</div>
            <Link to="/portfolio" style={{ display: 'block', color: '#ddd', fontSize: '13px', marginBottom: '6px' }}>Your Portfolio</Link>
            <Link to="/orders" style={{ display: 'block', color: '#ddd', fontSize: '13px', marginBottom: '6px' }}>Order History</Link>
            <Link to="/watchlist" style={{ display: 'block', color: '#ddd', fontSize: '13px', marginBottom: '6px' }}>Your Watchlist</Link>
            <Link to="/dashboard" style={{ display: 'block', color: '#ddd', fontSize: '13px', marginBottom: '6px' }}>Dashboard</Link>
          </div>
          <div>
            <div style={{ fontWeight: '700', marginBottom: '12px' }}>Top Sectors</div>
            {['Technology', 'Financials', 'Consumer', 'Communication'].map(l => (
              <div key={l} style={{ fontSize: '13px', color: '#ddd', marginBottom: '6px', cursor: 'pointer' }}>{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ background: '#131A22', color: '#ddd', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
          📈 LiveMarket<span style={{ color: 'var(--az-orange)' }}>AI</span>.com
        </div>
        <div>© 2024 LiveMarketAI, Inc. or its affiliates. All rights reserved.</div>
        <div style={{ marginTop: '8px', color: '#888' }}>
          ⚠️ Simulated trading platform. Not financial advice. Paper trading only.
        </div>
      </div>
    </footer>
  );
}
