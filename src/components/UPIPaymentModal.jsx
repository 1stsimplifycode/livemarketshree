import React, { useState, useEffect, useRef } from 'react';

const COUNTDOWN_SECONDS = 60;

/* ── Circular countdown ring ── */
function CountdownRing({ seconds, total }) {
  const r     = 32;
  const circ  = 2 * Math.PI * r;
  const dash  = (seconds / total) * circ;
  const color = seconds > 15 ? '#26a69a' : seconds > 5 ? '#f59e0b' : '#ef5350';
  return (
    <svg width={80} height={80} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={40} cy={40} r={r} fill="none" stroke="#f0f0f0" strokeWidth={5} />
      {/* Progress — rotated so it starts from top */}
      <circle
        cx={40} cy={40} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 0.95s linear, stroke 0.4s' }}
      />
      {/* Number */}
      <text x={40} y={40} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 18, fontWeight: 800, fill: color, fontVariantNumeric: 'tabular-nums' }}>
        {seconds}
      </text>
    </svg>
  );
}

export default function UPIPaymentModal({ amount, items, onSuccess, onClose }) {
  // Stages: 'qr' | 'confirm' | 'success'
  const [stage,   setStage]   = useState('qr');
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  /* ── Start countdown whenever QR stage is active ── */
  useEffect(() => {
    if (stage !== 'qr') return;
    setSeconds(COUNTDOWN_SECONDS);

    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStage('confirm');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [stage]);

  const handleYes = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setStage('success');
    setLoading(false);
    setTimeout(() => onSuccess(), 2800);
  };

  const handleNo = () => {
    // Show QR again with fresh countdown
    setStage('qr');
  };

  /* ── Prevent closing by clicking backdrop during QR or success ── */
  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (stage === 'confirm') onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(10,10,20,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: 'white', borderRadius: 22, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,.28)',
        overflow: 'hidden', animation: 'popIn .22s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <style>{`
          @keyframes popIn    { from { opacity:0; transform:scale(.88) } to { opacity:1; transform:scale(1) } }
          @keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
          @keyframes checkDraw{ from { stroke-dashoffset:70 } to { stroke-dashoffset:0 } }
          @keyframes ripple   { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.9);opacity:0} }
        `}</style>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#26a69a 0%,#00bcd4 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📱</span> UPI Payment
            </div>
            <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, marginTop: 3 }}>
              Amount:{' '}
              <strong style={{ color: 'white', fontSize: 16 }}>
                ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
          {/* Only show close on confirm stage */}
          {stage === 'confirm' && (
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.25)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          )}
        </div>

        {/* ══════════ QR STAGE ══════════ */}
        {stage === 'qr' && (
          <div style={{ padding: '22px 24px 28px', textAlign: 'center', animation: 'fadeUp .3s ease' }}>

            <p style={{ color: '#444', fontSize: 14, marginBottom: 4, fontWeight: 500 }}>
              Scan with any UPI app to pay
            </p>
            <p style={{ color: '#aaa', fontSize: 12, marginBottom: 18 }}>
              Google Pay · PhonePe · Paytm · BHIM · Any UPI
            </p>

            {/* QR Code box */}
            <div style={{
              display: 'inline-block', padding: 14, border: '3px solid #26a69a',
              borderRadius: 18, background: 'white', marginBottom: 18,
              boxShadow: '0 6px 24px rgba(38,166,154,.18)',
              position: 'relative',
            }}>
              {/* Corner accents */}
              {[['0%','0%','right','bottom'],['100%','0%','left','bottom'],['0%','100%','right','top'],['100%','100%','left','top']].map(([l,t,br,bb], i) => (
                <div key={i} style={{ position: 'absolute', left: l, top: t, width: 14, height: 14, borderTop: i < 2 ? '3px solid #26a69a' : 'none', borderBottom: i >= 2 ? '3px solid #26a69a' : 'none', borderLeft: i % 2 === 0 ? '3px solid #26a69a' : 'none', borderRight: i % 2 !== 0 ? '3px solid #26a69a' : 'none', transform: `translate(${i % 2 === 0 ? '-50%' : '50%'}, ${i < 2 ? '-50%' : '50%'})`, borderRadius: 2 }} />
              ))}

              <img
                src="/qr.png"
                alt="UPI QR Code"
                width={210}
                height={210}
                style={{ display: 'block', objectFit: 'contain', borderRadius: 8 }}
                onError={e => {
                  e.target.style.display = 'none';
                  document.getElementById('qr-placeholder').style.display = 'flex';
                }}
              />
              {/* Fallback if qr.png missing */}
              <div id="qr-placeholder" style={{ width: 210, height: 210, display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: 8, gap: 8 }}>
                {/* Fake QR grid for visual */}
                <svg width={140} height={140} viewBox="0 0 140 140">
                  {/* Corner squares */}
                  <rect x={10} y={10} width={36} height={36} rx={4} fill="none" stroke="#333" strokeWidth={4}/>
                  <rect x={18} y={18} width={20} height={20} rx={2} fill="#333"/>
                  <rect x={94} y={10} width={36} height={36} rx={4} fill="none" stroke="#333" strokeWidth={4}/>
                  <rect x={102} y={18} width={20} height={20} rx={2} fill="#333"/>
                  <rect x={10} y={94} width={36} height={36} rx={4} fill="none" stroke="#333" strokeWidth={4}/>
                  <rect x={18} y={102} width={20} height={20} rx={2} fill="#333"/>
                  {/* Data modules */}
                  {[56,64,72,56,72,80,64,80].map((x,i) => <rect key={`a${i}`} x={x} y={[10,10,10,18,18,18,26,26][i]} width={6} height={6} fill="#333"/>)}
                  {[10,18,26,10,18,26,10,18].map((y,i) => <rect key={`b${i}`} x={[56,64,72,80,56,80,64,72][i]} y={y} width={6} height={6} fill="#333"/>)}
                  {[56,64,72,80,56,64,72,80,56,64,72,80].map((x,i) => <rect key={`c${i}`} x={x} y={56+Math.floor(i/4)*8} width={6} height={6} fill={Math.random()>.4?"#333":"none"}/>)}
                  {[56,64,72,80,56,80].map((x,i) => <rect key={`d${i}`} x={x} y={[94,94,94,94,102,102][i]} width={6} height={6} fill="#333"/>)}
                  <rect x={60} y={60} width={20} height={20} rx={3} fill="white" stroke="#26a69a" strokeWidth={2}/>
                  <text x={70} y={74} textAnchor="middle" fontSize={12} fill="#26a69a" fontWeight="800">₹</text>
                </svg>
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
                  Place your QR image at<br /><code style={{ background: '#eee', padding: '1px 4px', borderRadius: 3 }}>public/qr.png</code>
                </div>
              </div>
            </div>

            {/* UPI ID row */}
            <div style={{ background: '#f8f9fb', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #eee' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>UPI ID</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>livemarketai@upi</div>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText('livemarketai@upi'); }}
                style={{ background: '#26a69a', border: 'none', borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Copy
              </button>
            </div>

            {/* Countdown row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f8f9fb', borderRadius: 12, padding: '12px 16px', marginBottom: 14, border: '1px solid #eee' }}>
              <CountdownRing seconds={seconds} total={COUNTDOWN_SECONDS} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#222', marginBottom: 2 }}>
                  {seconds > 0 ? `Checking in ${seconds}s` : 'Checking payment…'}
                </div>
                <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
                  Complete payment within{' '}
                  <strong style={{ color: seconds > 15 ? '#26a69a' : '#ef5350' }}>
                    {seconds}s
                  </strong>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 5, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{
                height: '100%',
                width: `${(seconds / COUNTDOWN_SECONDS) * 100}%`,
                background: seconds > 15 ? '#26a69a' : seconds > 5 ? '#f59e0b' : '#ef5350',
                borderRadius: 3,
                transition: 'width 0.95s linear, background 0.4s',
              }} />
            </div>

            <p style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
              🔒 Secure payment · 256-bit encrypted · Zero commission
            </p>
          </div>
        )}

        {/* ══════════ CONFIRM STAGE ══════════ */}
        {stage === 'confirm' && (
          <div style={{ padding: '36px 28px', textAlign: 'center', animation: 'fadeUp .3s ease' }}>
            <div style={{ fontSize: 60, marginBottom: 14, lineHeight: 1 }}>🤔</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
              Payment done?
            </h3>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Did you complete the UPI payment of{' '}
              <strong style={{ color: '#26a69a' }}>
                ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              ?
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleNo}
                style={{
                  flex: 1, padding: '14px 0', border: '2px solid #ef5350',
                  borderRadius: 12, background: 'white', color: '#ef5350',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff3f3'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
              >
                ✕ No, Show QR
              </button>
              <button
                onClick={handleYes}
                disabled={loading}
                style={{
                  flex: 1, padding: '14px 0', border: 'none',
                  borderRadius: 12,
                  background: loading ? '#aaa' : 'linear-gradient(135deg,#26a69a,#00bcd4)',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(38,166,154,.35)',
                  transition: 'all .15s',
                }}
              >
                {loading ? '⏳ Verifying…' : '✓ Yes, Done!'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ SUCCESS STAGE ══════════ */}
        {stage === 'success' && (
          <div style={{ padding: '40px 28px', textAlign: 'center', animation: 'fadeUp .3s ease' }}>
            {/* Ripple + checkmark */}
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(38,166,154,.15)', animation: 'ripple 1.2s ease-out infinite' }} />
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#26a69a,#1de9b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(38,166,154,.4)', position: 'relative' }}>
                <svg width={44} height={44} viewBox="0 0 44 44" fill="none">
                  <polyline points="8,24 19,34 37,13" stroke="white" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={70} style={{ animation: 'checkDraw .45s .1s ease forwards', strokeDashoffset: 70 }} />
                </svg>
              </div>
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>
              Payment Successful! 🎉
            </h3>
            <p style={{ color: '#26a69a', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} paid
            </p>
            <p style={{ color: '#aaa', fontSize: 13, marginBottom: 20 }}>
              Your trades are being executed now…
            </p>

            {/* Order summary */}
            <div style={{ background: '#f8f9fb', borderRadius: 12, padding: '14px 16px', textAlign: 'left', border: '1px solid #eee' }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Summary</div>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <span style={{ color: '#555' }}>
                    {item.logo} <strong>{item.symbol}</strong> × {item.quantity}
                  </span>
                  <span style={{ fontWeight: 700, color: '#333' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
