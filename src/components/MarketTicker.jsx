import React from 'react';
import { useApp } from '../context/AppContext';

const SYMBOLS = ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','JPM','V','NFLX'];

export default function MarketTicker() {
  const { prices } = useApp();

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #ddd',
      overflow: 'hidden',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        gap: '24px',
        animation: 'tickerScroll 40s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {[...SYMBOLS, ...SYMBOLS].map((sym, i) => {
          const p = prices[sym] || {};
          const up = (p.change_pct || 0) >= 0;
          return (
            <span key={`${sym}-${i}`} style={{ fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <strong>{sym}</strong>
              <span>${(p.price || 0).toFixed(2)}</span>
              <span style={{ color: up ? '#067D62' : '#B12704', fontWeight: '600' }}>
                {up ? '▲' : '▼'}{Math.abs(p.change_pct || 0).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
