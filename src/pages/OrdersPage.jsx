import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

export default function OrdersPage() {
  const { user } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!user?.id) return;
    api.getOrders(user.id).then(data => { setOrders(data); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.order_type === filter);

  const totalBought = orders.filter(o => o.order_type === 'BUY').reduce((s, o) => s + o.total_value, 0);
  const totalSold = orders.filter(o => o.order_type === 'SELL').reduce((s, o) => s + o.total_value, 0);

  return (
    <div className="container" style={{ padding: '20px 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Your Orders</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'BUY', 'SELL'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: '4px', fontSize: '13px', fontWeight: '600',
              border: `1px solid ${filter === f ? '#FF9900' : '#ddd'}`,
              background: filter === f ? '#FFF3CD' : 'white', cursor: 'pointer',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Orders', value: orders.length, icon: '📋' },
          { label: 'Buy Orders', value: orders.filter(o => o.order_type === 'BUY').length, icon: '📈' },
          { label: 'Sell Orders', value: orders.filter(o => o.order_type === 'SELL').length, icon: '📉' },
          { label: 'Total Traded', value: `$${(totalBought + totalSold).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: '💰' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '16px', textAlign: 'center', boxShadow: 'var(--az-card-shadow)' }}>
            <div style={{ fontSize: '28px' }}>{c.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#B12704' }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#565959' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>📭</div>
          <h2>No orders yet</h2>
          <p style={{ color: '#565959', marginBottom: '16px' }}>You haven't placed any trades yet.</p>
          <Link to="/" style={{ background: 'var(--az-yellow)', padding: '10px 24px', borderRadius: '20px', fontWeight: '600', color: '#131921', textDecoration: 'none' }}>
            Start Trading
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(order => (
            <div key={order.id} style={{
              background: 'white', border: '1px solid #ddd', borderRadius: '8px',
              overflow: 'hidden', boxShadow: 'var(--az-card-shadow)',
            }}>
              {/* Order Header */}
              <div style={{
                background: '#f0f2f2', padding: '10px 16px',
                display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                borderBottom: '1px solid #ddd', fontSize: '13px',
              }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <div style={{ color: '#565959', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>Order Placed</div>
                    <div>{new Date(order.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <div style={{ color: '#565959', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>Total</div>
                    <div style={{ fontWeight: '700' }}>${order.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ color: '#565959', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>Type</div>
                    <div style={{ fontWeight: '700', color: order.order_type === 'BUY' ? '#067D62' : '#B12704' }}>
                      {order.order_type === 'BUY' ? '📈 BUY' : '📉 SELL'}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#565959', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>Order #{order.id.slice(0, 8).toUpperCase()}</div>
                  <span style={{
                    background: '#067D62', color: 'white',
                    padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                  }}>
                    ✓ EXECUTED
                  </span>
                </div>
              </div>

              {/* Order Body */}
              <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ fontSize: '48px' }}>{order.logo}</div>
                <div style={{ flex: 1 }}>
                  <Link to={`/stock/${order.symbol}`} style={{ color: 'var(--az-link)', fontSize: '16px', fontWeight: '600' }}>
                    {order.name}
                  </Link>
                  <div style={{ color: '#565959', fontSize: '13px', marginTop: '2px' }}>
                    {order.quantity} shares @ ${order.price.toFixed(2)} per share
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px', color: '#565959' }}>
                    Time: {new Date(order.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#131921' }}>
                    ${order.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <Link to={`/stock/${order.symbol}`} style={{
                    display: 'inline-block', marginTop: '8px',
                    border: '1px solid var(--az-orange)', color: '#131921',
                    padding: '5px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                    textDecoration: 'none',
                  }}>
                    View Stock
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
