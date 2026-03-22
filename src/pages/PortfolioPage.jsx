import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UPIPaymentModal from '../components/UPIPaymentModal';

export default function PortfolioPage() {
  const { portfolio, cartItems, removeFromCart, clearCart, placeOrder, refreshPortfolio, prices, user } = useApp();
  const [checkingOut,  setCheckingOut]  = useState(false);
  const [showPayment,  setShowPayment]  = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingAction, setPendingAction] = useState(null); // { symbol, quantity } for single buy

  useEffect(() => { refreshPortfolio(); }, []);

  // Enrich cart items with live prices
  const enrichedCart = cartItems.map(item => ({
    ...item,
    price: prices[item.symbol]?.price || item.price || 0,
  }));

  const cartTotal = enrichedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  /* ── "Proceed to Checkout" — snapshot ALL prices right now ── */
  const handleCheckoutClick = () => {
    if (!cartItems.length) return;
    // Freeze prices at this exact instant
    const frozen = cartItems.map(item => ({
      ...item,
      price: prices[item.symbol]?.price || item.price || 0,
    }));
    setPendingItems(frozen);
    setPendingAction('cart');
    setShowPayment(true);
  };

  /* ── Individual "Buy Now" — also snapshot at this instant ── */
  const handleSingleBuyNow = (item) => {
    const frozen = { ...item, price: prices[item.symbol]?.price || item.price || 0 };
    setPendingItems([frozen]);
    setPendingAction({ type: 'single', symbol: item.symbol, quantity: item.quantity });
    setShowPayment(true);
  };

  /* ── After payment confirmed → execute at the LOCKED prices ── */
  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setCheckingOut(true);

    if (pendingAction === 'cart') {
      for (const item of pendingItems) {
        // item.price was frozen at checkout-click time — use it
        try { await placeOrder(item.symbol, 'BUY', item.quantity, 'MARKET', item.price); } catch {}
      }
      clearCart();
    } else if (pendingAction?.type === 'single') {
      const item = pendingItems[0];
      try { await placeOrder(item.symbol, 'BUY', item.quantity, 'MARKET', item.price); } catch {}
      removeFromCart(item.symbol);
    }

    setCheckingOut(false);
    setPendingItems([]);
    setPendingAction(null);
    refreshPortfolio();
  };

  const positions   = portfolio?.positions   || [];
  const totalPnl    = portfolio?.total_pnl    || 0;
  const totalPnlPct = portfolio?.total_pnl_pct || 0;
  const netWorth    = portfolio?.net_worth    || 0;
  const cashBalance = portfolio?.cash_balance || user?.balance || 0;

  return (
    <div className="container" style={{ padding: '16px 12px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px' }}>Shopping Cart</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

        {/* ──── LEFT ──── */}
        <div>

          {/* CART ITEMS */}
          {enrichedCart.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                🛒 Cart Items ({enrichedCart.length})
              </h2>

              {enrichedCart.map(item => (
                <div key={item.symbol} style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                  <div style={{ fontSize: '48px' }}>{item.logo}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{item.name}</div>
                    <div style={{ color: '#007185', fontSize: '13px' }}>{item.symbol}</div>
                    <div style={{ color: '#B12704', fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>
                      ${item.price.toFixed(2)} × {item.quantity} ={' '}
                      <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                    <div style={{ color: '#007600', fontSize: '13px', marginTop: '2px' }}>✓ Available to trade</div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {/* Single buy now → UPI modal */}
                      <button
                        onClick={() => handleSingleBuyNow(item)}
                        style={{ background: 'var(--az-orange)', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        ⚡ Buy Now
                      </button>
                      <button
                        onClick={() => removeFromCart(item.symbol)}
                        style={{ background: 'none', border: 'none', color: '#B12704', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => removeFromCart(item.symbol)}
                        style={{ background: 'none', border: 'none', color: '#007185', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Save for later
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ paddingTop: '12px', textAlign: 'right', fontSize: '16px', fontWeight: '600' }}>
                Cart Subtotal ({enrichedCart.reduce((s, i) => s + i.quantity, 0)} shares):{' '}
                <span style={{ fontWeight: '700', color: '#B12704' }}>
                  ${cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {enrichedCart.length === 0 && (
            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '64px', marginBottom: '12px' }}>🛒</div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Your cart is empty</div>
              <div style={{ color: '#565959', marginBottom: '16px' }}>Browse our top 10 stocks and add some to your cart</div>
              <Link to="/" style={{ background: 'var(--az-yellow)', padding: '10px 24px', borderRadius: '20px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', color: '#131921' }}>
                Continue Shopping
              </Link>
            </div>
          )}

          {/* HOLDINGS TABLE */}
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>📦 Your Holdings</h2>
              <div style={{ fontSize: '14px', fontWeight: '600', color: totalPnl >= 0 ? '#067D62' : '#B12704' }}>
                Total P&L: {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
              </div>
            </div>

            {positions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#565959' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                <div>No holdings yet. Start trading!</div>
                <Link to="/" style={{ color: 'var(--az-link)', fontSize: '14px' }}>Browse stocks →</Link>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '8px', padding: '8px 0', borderBottom: '2px solid #eee', fontSize: '12px', fontWeight: '700', color: '#565959', textTransform: 'uppercase' }}>
                  <span>Stock</span>
                  <span style={{ textAlign: 'right' }}>Qty</span>
                  <span style={{ textAlign: 'right' }}>Avg Cost</span>
                  <span style={{ textAlign: 'right' }}>Price</span>
                  <span style={{ textAlign: 'right' }}>Value</span>
                  <span style={{ textAlign: 'right' }}>P&L</span>
                </div>
                {positions.map(pos => (
                  <div key={pos.symbol} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '8px', padding: '12px 0', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '28px' }}>{pos.logo}</span>
                      <div>
                        <div style={{ fontWeight: '700' }}>{pos.symbol}</div>
                        <div style={{ fontSize: '12px', color: '#565959' }}>{pos.name?.split(' ').slice(0, 2).join(' ')}</div>
                      </div>
                    </div>
                    <span style={{ textAlign: 'right', fontWeight: '500' }}>{pos.quantity}</span>
                    <span style={{ textAlign: 'right', color: '#565959' }}>${pos.avg_cost.toFixed(2)}</span>
                    <span style={{ textAlign: 'right', fontWeight: '600', color: '#B12704' }}>${pos.current_price.toFixed(2)}</span>
                    <span style={{ textAlign: 'right', fontWeight: '600' }}>${pos.market_value.toFixed(2)}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: pos.pnl >= 0 ? '#067D62' : '#B12704' }}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', color: pos.pnl_pct >= 0 ? '#067D62' : '#B12704' }}>
                        {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ──── RIGHT: Summary & Checkout ──── */}
        <div>
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', background: 'white', position: 'sticky', top: '80px' }}>

            {enrichedCart.length > 0 && (
              <>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                  Subtotal ({enrichedCart.reduce((s, i) => s + i.quantity, 0)} items):{' '}
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>

                {/* UPI badge */}
                <div style={{ background: '#f0faf9', border: '1px solid #26a69a', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>📱</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#26a69a' }}>UPI Payment</div>
                    <div style={{ fontSize: 11, color: '#888' }}>GPay · PhonePe · Paytm · BHIM</div>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutClick}
                  disabled={checkingOut}
                  style={{
                    width: '100%', padding: '11px',
                    background: checkingOut ? '#ccc' : 'var(--az-yellow)',
                    border: '1px solid #a88734', borderRadius: '20px',
                    fontWeight: '600', fontSize: '14px',
                    cursor: checkingOut ? 'not-allowed' : 'pointer',
                    marginBottom: '20px',
                  }}
                >
                  {checkingOut ? '⏳ Executing Trades…' : '📱 Proceed to Checkout'}
                </button>
              </>
            )}

            {/* Portfolio summary */}
            <div style={{ borderTop: enrichedCart.length > 0 ? '1px solid #eee' : 'none', paddingTop: enrichedCart.length > 0 ? '16px' : '0' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>📊 Portfolio Summary</div>
              {[
                ['Cash Balance', `$${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Invested',     `$${(portfolio?.total_market_value || 0).toFixed(2)}`],
                ['Total P&L',    `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`],
                ['Net Worth',    `$${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid #f0f0f0' : 'none', fontSize: i === 3 ? '15px' : '14px', fontWeight: i === 3 ? '700' : '400' }}>
                  <span style={{ color: '#565959' }}>{k}</span>
                  <span style={{ color: k === 'Total P&L' ? (totalPnl >= 0 ? '#067D62' : '#B12704') : k === 'Net Worth' ? '#B12704' : '#131921' }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <Link to="/" style={{ display: 'block', marginTop: '16px', textAlign: 'center', color: 'var(--az-link)', fontSize: '13px' }}>
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* ── UPI PAYMENT MODAL ── */}
      {showPayment && (
        <UPIPaymentModal
          amount={pendingItems.reduce((s, i) => s + i.price * i.quantity, 0)}
          items={pendingItems}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
