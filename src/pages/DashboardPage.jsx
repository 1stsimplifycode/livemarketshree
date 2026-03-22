import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

const COLORS = ['#007185', '#FF9900', '#067D62', '#B12704', '#565959', '#6c3483', '#1a5276', '#117a65', '#784212', '#2c3e50'];

export default function DashboardPage() {
  const { user, portfolio, prices, refreshPortfolio } = useApp();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [netWorthHistory] = useState(() => {
    const base = 100000;
    return Array.from({ length: 30 }, (_, i) => ({
      day: `Day ${i + 1}`,
      value: base + (Math.random() - 0.45) * 2000 * (i + 1) / 5,
    }));
  });

  useEffect(() => {
    refreshPortfolio();
    if (user?.id) {
      api.getOrders(user.id).then(setOrders).catch(() => {});
    }
    api.getMarketSummary(prices).then(setSummary).catch(() => {});
  }, [user]);

  const positions = portfolio?.positions || [];
  const totalPnl = portfolio?.total_pnl || 0;
  const totalPnlPct = portfolio?.total_pnl_pct || 0;
  const netWorth = portfolio?.net_worth || 0;
  const cashBalance = portfolio?.cash_balance || user?.balance || 0;
  const investedValue = portfolio?.total_market_value || 0;

  // Sector allocation
  const sectorMap = {
    AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology',
    AMZN: 'Consumer', GOOGL: 'Technology', META: 'Technology',
    TSLA: 'Consumer', JPM: 'Financials', V: 'Financials', NFLX: 'Communication',
  };
  const sectorData = positions.reduce((acc, pos) => {
    const sector = sectorMap[pos.symbol] || 'Other';
    const existing = acc.find(a => a.name === sector);
    if (existing) existing.value += pos.market_value;
    else acc.push({ name: sector, value: pos.market_value });
    return acc;
  }, []);

  // PnL by stock
  const pnlData = positions.map(p => ({
    symbol: p.symbol,
    pnl: p.pnl,
    pct: p.pnl_pct,
  })).sort((a, b) => b.pnl - a.pnl);

  // Monthly volume (from orders)
  const volumeData = (() => {
    const months = {};
    orders.forEach(o => {
      const m = new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short' });
      if (!months[m]) months[m] = { month: m, buy: 0, sell: 0 };
      if (o.order_type === 'BUY') months[m].buy += o.total_value;
      else months[m].sell += o.total_value;
    });
    return Object.values(months).slice(-6);
  })();

  const allPrices = Object.values(prices);
  const marketUp = allPrices.length
    ? allPrices.reduce((s, p) => s + (p.change_pct || 0), 0) / allPrices.length >= 0
    : true;

  return (
    <div className="container" style={{ padding: '20px 12px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '20px' }}>
        📊 Trading Dashboard
      </h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Net Worth', value: `$${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: '💎', color: '#B12704', sub: 'Total portfolio value' },
          { label: 'Cash Balance', value: `$${cashBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: '💵', color: '#007185', sub: 'Available to trade' },
          { label: 'Invested', value: `$${investedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: '📈', color: '#067D62', sub: 'Current market value' },
          { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`, icon: totalPnl >= 0 ? '🟢' : '🔴', color: totalPnl >= 0 ? '#067D62' : '#B12704', sub: `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}% return` },
          { label: 'Total Trades', value: orders.length, icon: '📋', color: '#565959', sub: `${orders.filter(o => o.order_type === 'BUY').length} buys, ${orders.filter(o => o.order_type === 'SELL').length} sells` },
          { label: 'Holdings', value: positions.length, icon: '🏦', color: '#6c3483', sub: 'Unique stocks' },
        ].map(c => (
          <div key={c.label} style={{
            background: 'white', border: '1px solid #eee', borderRadius: '8px',
            padding: '16px', boxShadow: 'var(--az-card-shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#565959', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{c.sub}</div>
              </div>
              <span style={{ fontSize: '28px' }}>{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Market Status Banner */}
      <div style={{
        background: marketUp ? 'linear-gradient(135deg,#067D62,#0a9e7a)' : 'linear-gradient(135deg,#B12704,#d4320a)',
        color: 'white', borderRadius: '8px', padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>
            {marketUp ? '📈 Market is Bullish Today' : '📉 Market is Bearish Today'}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {summary?.top_gainers?.[0]?.symbol} leading {marketUp ? 'gains' : ''} — {allPrices.length} stocks tracked
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Top Gainer</div>
            <div style={{ fontWeight: '700' }}>
              {summary?.top_gainers?.[0]?.symbol} +{Math.abs(summary?.top_gainers?.[0]?.change_pct || 0).toFixed(2)}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Top Loser</div>
            <div style={{ fontWeight: '700' }}>
              {summary?.top_losers?.[0]?.symbol} -{Math.abs(summary?.top_losers?.[0]?.change_pct || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Net Worth Chart */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '20px', boxShadow: 'var(--az-card-shadow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>📈 Net Worth History (Simulated)</h3>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => [`$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'Net Worth']} />
                <Line type="monotone" dataKey="value" stroke="#FF9900" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Allocation */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '20px', boxShadow: 'var(--az-card-shadow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>🥧 Sector Allocation</h3>
          {sectorData.length > 0 ? (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Value']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#565959', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '40px' }}>📭</div>
              <div>No holdings to display</div>
              <Link to="/" style={{ color: 'var(--az-link)', fontSize: '13px' }}>Buy stocks →</Link>
            </div>
          )}
        </div>
      </div>

      {/* P&L by Stock + Trading Volume */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* P&L Bar Chart */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '20px', boxShadow: 'var(--az-card-shadow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>💹 P&L by Stock</h3>
          {pnlData.length > 0 ? (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <YAxis dataKey="symbol" type="category" tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'P&L']} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {pnlData.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? '#067D62' : '#B12704'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#565959' }}>No positions yet</div>
          )}
        </div>

        {/* Trade Volume */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '20px', boxShadow: 'var(--az-card-shadow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>📊 Trade Volume</h3>
          {volumeData.length > 0 ? (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={v => [`$${v.toFixed(2)}`]} />
                  <Legend />
                  <Bar dataKey="buy" fill="#067D62" name="Buy" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sell" fill="#B12704" name="Sell" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#565959' }}>No trade history</div>
          )}
        </div>
      </div>

      {/* Live Market Prices Table */}
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '20px', boxShadow: 'var(--az-card-shadow)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>📡 Live Market Prices</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f0f2f2' }}>
                {['Symbol', 'Name', 'Price', 'Change', '% Change', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Symbol' || h === 'Name' ? 'left' : 'right', fontWeight: '700', fontSize: '12px', color: '#565959', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(prices).map((p, i) => {
                const up = (p.change_pct || 0) >= 0;
                const stockNames = {
                  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', AMZN: 'Amazon',
                  GOOGL: 'Alphabet', META: 'Meta', TSLA: 'Tesla', JPM: 'JPMorgan',
                  V: 'Visa', NFLX: 'Netflix',
                };
                const logos = { AAPL: '🍎', MSFT: '🪟', NVDA: '🎮', AMZN: '📦', GOOGL: '🔍', META: '👾', TSLA: '⚡', JPM: '🏦', V: '💳', NFLX: '🎬' };
                return (
                  <tr key={p.symbol} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '700' }}>
                      <span style={{ marginRight: '6px' }}>{logos[p.symbol]}</span>
                      <Link to={`/stock/${p.symbol}`} style={{ color: 'var(--az-link)' }}>{p.symbol}</Link>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#565959' }}>{stockNames[p.symbol]}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#B12704' }}>
                      ${(p.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: up ? '#067D62' : '#B12704', fontWeight: '600' }}>
                      {up ? '+' : ''}${(p.change || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                      <span style={{
                        background: up ? '#e6f4f1' : '#fde8e8', color: up ? '#067D62' : '#B12704',
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px',
                      }}>
                        {up ? '▲' : '▼'} {Math.abs(p.change_pct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Link to={`/stock/${p.symbol}`} style={{
                        background: 'var(--az-yellow)', padding: '4px 12px',
                        borderRadius: '4px', fontSize: '12px', fontWeight: '600', textDecoration: 'none', color: '#131921',
                      }}>
                        Trade
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
