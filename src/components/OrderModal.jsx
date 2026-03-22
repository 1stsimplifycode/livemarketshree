import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function OrderModal({ stock, onClose, defaultType = 'BUY' }) {
  const { placeOrder, user, prices } = useApp();
  const [orderType, setOrderType] = useState(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const liveData = prices[stock.symbol] || {};
  const price = liveData.price || stock.price || 0;
  const execPrice = mode === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : price;
  const total = execPrice * quantity;
  const balance = user?.balance || 0;
  const canAfford = orderType === 'BUY' ? balance >= total : true;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await placeOrder(stock.symbol, orderType, quantity, mode, mode === 'LIMIT' ? execPrice : undefined);
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'white', borderRadius: '8px', padding: '24px', width: '400px',
          maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>
              {stock.logo} {stock.symbol}
            </div>
            <div style={{ fontSize: '13px', color: '#565959' }}>{stock.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#565959' }}>✕</button>
        </div>

        {/* Live Price */}
        <div style={{
          background: '#f8f9fa', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#565959', fontSize: '13px' }}>Current Price</span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#B12704' }}>
            ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Order Type Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['BUY', 'SELL'].map(t => (
            <button key={t} onClick={() => setOrderType(t)} style={{
              flex: 1, padding: '10px', borderRadius: '4px', fontWeight: '700', fontSize: '14px',
              border: '2px solid',
              borderColor: orderType === t ? (t === 'BUY' ? '#067D62' : '#B12704') : '#ddd',
              background: orderType === t ? (t === 'BUY' ? '#067D62' : '#B12704') : 'white',
              color: orderType === t ? 'white' : '#565959',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {t === 'BUY' ? '📈 BUY' : '📉 SELL'}
            </button>
          ))}
        </div>

        {/* Order Mode */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Order Mode</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['MARKET', 'LIMIT'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: '4px', fontSize: '13px', fontWeight: '600',
                border: `1px solid ${mode === m ? '#FF9900' : '#ddd'}`,
                background: mode === m ? '#FFF3CD' : 'white',
                cursor: 'pointer',
              }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price */}
        {mode === 'LIMIT' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Limit Price ($)</label>
            <input
              type="number" step="0.01" min="0" value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={price.toFixed(2)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }}
            />
          </div>
        )}

        {/* Quantity */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Quantity (shares)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setQuantity(q => Math.max(0.1, q - (q >= 1 ? 1 : 0.1)))}
              style={{ width: '36px', height: '36px', borderRadius: '4px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '18px', cursor: 'pointer' }}>−</button>
            <input type="number" min="0.01" step="0.01" value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, textAlign: 'center', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', fontWeight: '600' }} />
            <button onClick={() => setQuantity(q => q + 1)}
              style={{ width: '36px', height: '36px', borderRadius: '4px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '18px', cursor: 'pointer' }}>+</button>
          </div>
          {/* Quick quantity buttons */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {[1, 5, 10, 25, 100].map(q => (
              <button key={q} onClick={() => setQuantity(q)} style={{
                flex: 1, padding: '4px', fontSize: '11px', border: '1px solid #ddd',
                borderRadius: '3px', background: quantity === q ? '#FFF3CD' : 'white', cursor: 'pointer',
              }}>{q}</button>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div style={{
          background: '#f8f9fa', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Execution Price</span>
            <span>${execPrice.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Quantity</span>
            <span>{quantity} shares</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', borderTop: '1px solid #ddd', paddingTop: '6px' }}>
            <span>Estimated Total</span>
            <span style={{ color: '#B12704' }}>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {orderType === 'BUY' && (
            <div style={{ marginTop: '6px', color: canAfford ? '#067D62' : '#B12704', fontSize: '12px' }}>
              Available: ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {!canAfford && ' — Insufficient funds'}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !canAfford || quantity <= 0}
          style={{
            width: '100%', padding: '12px',
            background: loading || !canAfford ? '#ccc' : orderType === 'BUY' ? 'var(--az-orange)' : '#B12704',
            color: orderType === 'BUY' && !loading ? '#131921' : 'white',
            border: 'none', borderRadius: '20px', fontSize: '15px', fontWeight: '700',
            cursor: loading || !canAfford ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? '⏳ Processing...' : `${orderType === 'BUY' ? '📈 Place Buy Order' : '📉 Place Sell Order'}`}
        </button>
      </div>
    </div>
  );
}
