import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import UPIPaymentModal from '../components/UPIPaymentModal';

/* ─────────────────────────────────────────────
   CLOCK — isolated component so 1s ticks never
   re-render the trading panel or chart
───────────────────────────────────────────── */
const LiveClock = React.memo(function LiveClock({ marketOpen }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#222', fontVariantNumeric: 'tabular-nums' }}>{timeStr}</div>
        <div style={{ fontSize: 11, color: '#aaa' }}>{dateStr}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: marketOpen ? '#e6f7f5' : '#fff3f3', border: `1px solid ${marketOpen ? '#26a69a' : '#ef5350'}`, borderRadius: 20, padding: '4px 10px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: marketOpen ? '#26a69a' : '#ef5350', display: 'inline-block', animation: marketOpen ? 'blink 1.2s ease-in-out infinite' : 'none' }} />
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        <span style={{ fontSize: 12, fontWeight: 700, color: marketOpen ? '#26a69a' : '#ef5350' }}>{marketOpen ? 'LIVE' : 'CLOSED'}</span>
      </div>
    </div>
  );
});

/* Small isolated time display used in chart footer & OHLCV bar */
const TimeStamp = React.memo(function TimeStamp({ style }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return <span style={style}>📅 {dateStr} &nbsp;|&nbsp; 🕐 {timeStr}</span>;
});

/* ─────────────────────────────────────────────
   ML ENGINE  (ported from app.py)
   ─── All Python sklearn logic in pure JS ───
───────────────────────────────────────────── */
const sigmoid = z => 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));

function computeEMA(prices, period) {
  const k = 2 / (period + 1);
  const out = new Array(prices.length).fill(null);
  if (prices.length < period) return out;
  out[period - 1] = prices.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < prices.length; i++) out[i] = prices[i] * k + out[i - 1] * (1 - k);
  return out;
}

function computeRSIFull(prices, period = 14) {
  const out = new Array(prices.length).fill(null);
  if (prices.length <= period) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) { const d = prices[i] - prices[i-1]; if (d > 0) avgGain += d; else avgLoss -= d; }
  avgGain /= period; avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i-1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function buildFeatureMatrix(candles, selectedFeatures) {
  const n = candles.length;
  const closes  = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume || 0);

  const retArr    = closes.map((c, i) => i === 0 ? null : (c - closes[i-1]) / closes[i-1]);
  const ma10      = closes.map((_, i) => i < 9  ? null : closes.slice(i-9,  i+1).reduce((s,v)=>s+v,0)/10);
  const ma20      = closes.map((_, i) => i < 19 ? null : closes.slice(i-19, i+1).reduce((s,v)=>s+v,0)/20);
  const rsiArr    = computeRSIFull(closes, 14);
  const ema12     = computeEMA(closes, 12);
  const ema26     = computeEMA(closes, 26);
  const macdArr   = closes.map((_, i) => ema12[i] !== null && ema26[i] !== null ? ema12[i] - ema26[i] : null);
  const volChange = volumes.map((v, i) => i === 0 || volumes[i-1] === 0 ? null : (v - volumes[i-1]) / volumes[i-1]);

  const featureMap = { Return: retArr, MA10: ma10, MA20: ma20, RSI: rsiArr, MACD: macdArr, VolumeChange: volChange };
  const targets    = closes.map((c, i) => i >= n-1 ? null : closes[i+1] > c ? 1 : 0);

  const rows = [];
  for (let i = 0; i < n - 1; i++) {
    const fVals = selectedFeatures.map(f => featureMap[f]?.[i] ?? null);
    if (fVals.some(v => v === null || isNaN(v) || !isFinite(v))) continue;
    if (retArr[i] === null || targets[i] === null) continue;
    rows.push({ features: fVals, target: targets[i], ret: retArr[i] ?? 0 });
  }
  return rows;
}

function fitScaler(X) {
  const m = X.length, n = X[0].length;
  const means = new Array(n).fill(0), stds = new Array(n).fill(0);
  X.forEach(row => row.forEach((v, j) => { means[j] += v / m; }));
  X.forEach(row => row.forEach((v, j) => { stds[j]  += (v - means[j]) ** 2 / m; }));
  stds.forEach((_, j) => { stds[j] = Math.sqrt(stds[j]) || 1; });
  return { means, stds };
}

function applyScaler(X, means, stds) {
  return X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
}

function trainLogisticRegression(X, y, lr = 0.1, epochs = 400) {
  const m = X.length, n = X[0].length;
  let w = new Array(n).fill(0), b = 0;
  for (let ep = 0; ep < epochs; ep++) {
    let dw = new Array(n).fill(0), db = 0;
    for (let i = 0; i < m; i++) {
      const z = X[i].reduce((s, x, j) => s + x * w[j], b);
      const err = sigmoid(z) - y[i];
      X[i].forEach((x, j) => { dw[j] += err * x; });
      db += err;
    }
    w = w.map((v, j) => v - lr * dw[j] / m);
    b -= lr * db / m;
  }
  return { w, b };
}

function predictLR(X, w, b) {
  return X.map(row => { const z = row.reduce((s, x, j) => s + x * w[j], b); return sigmoid(z) >= 0.5 ? 1 : 0; });
}

function runMLBacktest(candles, selectedFeatures) {
  if (!candles || candles.length < 35) return { error: 'Need at least 35 candles for ML backtest' };
  if (!selectedFeatures || selectedFeatures.length === 0) return { error: 'Select at least one feature' };

  const rows = buildFeatureMatrix(candles, selectedFeatures);
  if (rows.length < 20) return { error: `Only ${rows.length} valid samples — need at least 20` };

  const split   = Math.floor(rows.length * 0.8);
  const train   = rows.slice(0, split);
  const test    = rows.slice(split);
  const X_train = train.map(r => r.features);
  const y_train = train.map(r => r.target);
  const X_test  = test.map(r => r.features);
  const y_test  = test.map(r => r.target);

  const { means, stds }  = fitScaler(X_train);
  const X_train_s        = applyScaler(X_train, means, stds);
  const X_test_s         = applyScaler(X_test, means, stds);

  const { w, b }         = trainLogisticRegression(X_train_s, y_train, 0.1, 400);
  const preds            = predictLR(X_test_s, w, b);

  const accuracy         = preds.reduce((s, p, i) => s + (p === y_test[i] ? 1 : 0), 0) / preds.length;
  const stratRets        = preds.map((p, i) => p === 1 ? test[i].ret : 0);
  const mktRets          = test.map(r => r.ret);

  const chartData = [];
  let stratCum = 1, mktCum = 1;
  for (let i = 0; i < stratRets.length; i++) {
    stratCum *= (1 + stratRets[i]);
    mktCum   *= (1 + mktRets[i]);
    chartData.push({
      idx:      i + 1,
      strategy: +(stratCum - 1).toFixed(4),
      market:   +(mktCum   - 1).toFixed(4),
    });
  }

  // Feature importance: abs(weight) normalised to 0–100
  const absW    = w.map(Math.abs);
  const sumAbsW = absW.reduce((s, v) => s + v, 0) || 1;
  const featureWeights = selectedFeatures.map((name, i) => ({
    name,
    weight:     +w[i].toFixed(4),
    importance: +(absW[i] / sumAbsW * 100).toFixed(1),
    direction:  w[i] >= 0 ? 'bullish' : 'bearish',
  })).sort((a, b) => b.importance - a.importance);

  return {
    accuracy:         +accuracy.toFixed(4),
    strategy_return:  +(stratCum - 1).toFixed(4),
    market_return:    +(mktCum   - 1).toFixed(4),
    trades:           preds.reduce((s, p) => s + p, 0),
    n_samples:        rows.length,
    n_train:          split,
    n_test:           test.length,
    bias:             +b.toFixed(4),
    featureWeights,
    chartData,
  };
}

/* ─────────────────────────────────────────────
   LOGISTIC REGRESSION FORECAST
───────────────────────────────────────────── */
function logisticRegressionForecast(closePrices, forecastDays = 30) {
  const n = closePrices.length;
  if (n < 10) return { forecast: [], confidence: [] };
  const maxP = Math.max(...closePrices), minP = Math.min(...closePrices);
  const range = maxP - minP || 1;
  const norm  = closePrices.map(p => (p - minP) / range);
  let b0 = 0, b1 = 0.05;
  const lr = 0.05;
  for (let ep = 0; ep < 800; ep++) {
    let gb0 = 0, gb1 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), z = b0 + b1 * t;
      const pred = sigmoid(z), err = pred - norm[i];
      gb0 += err * pred * (1 - pred);
      gb1 += err * pred * (1 - pred) * t;
    }
    b0 -= (lr * gb0) / n; b1 -= (lr * gb1) / n;
  }
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), z = b0 + b1 * t;
    const pred = sigmoid(z) * range + minP;
    ssRes += (pred - closePrices[i]) ** 2;
  }
  const stdErr = Math.sqrt(ssRes / n);
  const forecast = [], confidence = [];
  for (let i = 1; i <= forecastDays; i++) {
    const t = (n - 1 + i) / (n - 1), z = b0 + b1 * t;
    const p = +(sigmoid(z) * range + minP).toFixed(2);
    const grow = 1 + (i / forecastDays) * 0.15;
    forecast.push(p);
    confidence.push({ upper: +(p + stdErr * grow * 1.5).toFixed(2), lower: +(Math.max(0, p - stdErr * grow * 1.5)).toFixed(2) });
  }
  return { forecast, confidence };
}

/* ─────────────────────────────────────────────
   CANDLESTICK CHART  (SVG, with forecast overlay)
───────────────────────────────────────────── */
function CandlestickChart({ data, width, height, livePrice, forecastData, confidenceData, showForecast, backtestTrades }) {
  const [tooltip, setTooltip] = useState(null);
  const [crosshairX, setCrosshairX] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length === 0)
    return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Waiting for market data…</div>;

  const PAD = { top: 24, right: 80, bottom: 30, left: 8 };
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const fArr  = showForecast && forecastData    ? forecastData    : [];
  const cArr  = showForecast && confidenceData  ? confidenceData  : [];
  const yMin  = Math.min(...data.map(c => c.low),  ...cArr.map(c => c.lower), ...fArr) * 0.998;
  const yMax  = Math.max(...data.map(c => c.high), ...cArr.map(c => c.upper), ...fArr) * 1.002;
  const yRange  = yMax - yMin || 1;
  const total   = data.length + (showForecast ? fArr.length : 0);
  const toY     = v => PAD.top + chartH - ((v - yMin) / yRange) * chartH;
  const toX     = i => PAD.left + (i + 0.5) * (chartW / total);
  const totalW  = chartW / total;
  const bodyW   = Math.max(Math.min(totalW * 0.68, 14), 1.5);
  const tickCnt = 6;
  const yTicks  = Array.from({ length: tickCnt }, (_, i) => yMin + (yRange * i) / (tickCnt - 1));
  const xStep   = Math.max(1, Math.floor(data.length / 8));
  const xTicks  = data.map((c, i) => ({ i, label: new Date(c.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })).filter((_, i) => i % xStep === 0 || i === data.length - 1);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const idx  = Math.max(0, Math.min(data.length - 1, Math.floor((e.clientX - rect.left - PAD.left) / totalW)));
    setCrosshairX(toX(idx)); setTooltip({ idx, candle: data[idx] });
  }, [data, totalW]);

  const last    = data[data.length - 1] || {};
  const lastClose = livePrice || last.close || 0;
  const lastIsUp  = lastClose >= (last.open || 0);

  const confPath = showForecast && cArr.length > 0 ? (() => {
    const fs = data.length;
    const up = cArr.map((c, i) => `${i === 0 ? 'M' : 'L'}${toX(fs + i)},${toY(c.upper)}`).join(' ');
    const dn = [...cArr].reverse().map((c, i, a) => `L${toX(fs + a.length - 1 - i)},${toY(c.lower)}`).join(' ');
    return up + ' ' + dn + ' Z';
  })() : '';

  const fLinePath = showForecast && fArr.length > 0
    ? `M${toX(data.length - 1)},${toY(lastClose)} ` + fArr.map((p, i) => `L${toX(data.length + i)},${toY(p)}`).join(' ')
    : '';

  const btMarkers = backtestTrades
    ? backtestTrades.map(t => { const idx = data.findIndex(c => c.time === t.time); return idx < 0 ? null : { ...t, x: toX(idx), y: toY(t.price) }; }).filter(Boolean)
    : [];

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg ref={svgRef} width={width} height={height} onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(null); setCrosshairX(null); }}
        style={{ display: 'block', cursor: 'crosshair' }}>
        {yTicks.map((v, i) => <line key={i} x1={PAD.left} y1={toY(v)} x2={PAD.left + chartW} y2={toY(v)} stroke="#f2f2f2" strokeWidth={1} />)}
        {crosshairX != null && <line x1={crosshairX} y1={PAD.top} x2={crosshairX} y2={PAD.top + chartH} stroke="#bbb" strokeWidth={1} strokeDasharray="4 3" />}
        {showForecast && confPath && <path d={confPath} fill="#8b5cf6" opacity={0.08} />}
        {showForecast && fArr.length > 0 && <>
          <line x1={toX(data.length - 1) + totalW / 2} y1={PAD.top} x2={toX(data.length - 1) + totalW / 2} y2={PAD.top + chartH} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
          <rect x={toX(data.length - 1) + totalW / 2 + 4} y={PAD.top + 4} width={72} height={17} fill="#8b5cf6" rx={3} opacity={0.9} />
          <text x={toX(data.length - 1) + totalW / 2 + 40} y={PAD.top + 15} fontSize={9.5} fill="white" textAnchor="middle" fontWeight="700">🔮 FORECAST</text>
        </>}
        {data.map((c, i) => {
          const isUp = c.close >= c.open, color = isUp ? '#26a69a' : '#ef5350';
          const cx = toX(i), bodyTop = toY(Math.max(c.open, c.close)), bodyBot = toY(Math.min(c.open, c.close));
          return <g key={i}>
            <line x1={cx} y1={toY(c.high)} x2={cx} y2={toY(c.low)} stroke={color} strokeWidth={1.2} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={Math.max(bodyBot - bodyTop, 1.5)} fill={color} rx={0.5}>
              {i === data.length - 1 && <animate attributeName="opacity" values="0.65;1;0.65" dur="1.4s" repeatCount="indefinite" />}
            </rect>
          </g>;
        })}
        {showForecast && fLinePath && <path d={fLinePath} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" opacity={0.9} />}
        {showForecast && fArr.length > 0 && (() => {
          const ep = fArr[fArr.length - 1], py = toY(ep);
          return <g><rect x={PAD.left + chartW + 2} y={py - 9} width={74} height={18} fill="#8b5cf6" rx={3} opacity={0.9} /><text x={PAD.left + chartW + 39} y={py + 4} fontSize={9.5} fill="white" textAnchor="middle" fontWeight="700">{ep > lastClose ? '▲' : '▼'} {ep.toFixed(2)}</text></g>;
        })()}
        {lastClose > 0 && <line x1={PAD.left} y1={toY(lastClose)} x2={PAD.left + chartW} y2={toY(lastClose)} stroke={lastIsUp ? '#26a69a' : '#ef5350'} strokeWidth={1} strokeDasharray="6 3" opacity={0.55} />}
        {yTicks.map((v, i) => <text key={i} x={PAD.left + chartW + 6} y={toY(v) + 4} fontSize={10} fill="#bbb" textAnchor="start">{v.toFixed(2)}</text>)}
        {lastClose > 0 && (() => {
          const py = toY(lastClose);
          return <g><rect x={PAD.left + chartW + 2} y={py - 9} width={66} height={18} fill={lastIsUp ? '#26a69a' : '#ef5350'} rx={3}><animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" /></rect><text x={PAD.left + chartW + 35} y={py + 4} fontSize={10} fill="white" textAnchor="middle" fontWeight="700">{lastClose.toFixed(2)}</text></g>;
        })()}
        {xTicks.map(({ i, label }) => <text key={i} x={toX(i)} y={PAD.top + chartH + 18} fontSize={10} fill="#bbb" textAnchor="middle">{label}</text>)}
        {showForecast && fArr.length > 0 && (() => {
          const fs = data.length, lt = data[data.length - 1]?.time || Date.now() / 1000;
          const fxStep = Math.max(1, Math.floor(fArr.length / 3));
          return fArr.map((_, i) => ({ i, label: new Date((lt + (i + 1) * 86400) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))
            .filter((_, i) => i % fxStep === 0 || i === fArr.length - 1)
            .map(({ i, label }) => <text key={`f${i}`} x={toX(fs + i)} y={PAD.top + chartH + 18} fontSize={9.5} fill="#a78bfa" textAnchor="middle" opacity={0.8}>{label}</text>);
        })()}
        {tooltip && <g><rect x={toX(tooltip.idx) - 32} y={PAD.top + chartH + 4} width={64} height={16} fill="#444" rx={3} /><text x={toX(tooltip.idx)} y={PAD.top + chartH + 15} fontSize={10} fill="white" textAnchor="middle">{new Date(tooltip.candle.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text></g>}
        {btMarkers.map((m, i) => <g key={i}><circle cx={m.x} cy={m.y} r={7} fill={m.type === 'BUY' ? '#26a69a' : '#ef5350'} opacity={0.9} /><text x={m.x} y={m.y + 4} fontSize={9} fill="white" textAnchor="middle" fontWeight="800">{m.type === 'BUY' ? 'B' : 'S'}</text></g>)}
      </svg>
      {tooltip && (() => {
        const c = tooltip.candle, isUp = c.close >= c.open;
        const cx = toX(tooltip.idx), tipX = cx > width * 0.6 ? cx - 148 : cx + 14;
        return <div style={{ position: 'absolute', left: tipX, top: 20, background: 'white', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,.10)', pointerEvents: 'none', zIndex: 10, minWidth: 140 }}>
          <div style={{ fontWeight: 700, color: '#222', marginBottom: 6 }}>{new Date(c.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          {[['O', c.open, '#555'], ['H', c.high, '#26a69a'], ['L', c.low, '#ef5350'], ['C', c.close, isUp ? '#26a69a' : '#ef5350']].map(([k, v, col]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, lineHeight: 1.8 }}><span style={{ color: '#aaa' }}>{k}</span><span style={{ fontWeight: 700, color: col }}>{v?.toFixed(2)}</span></div>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', color: '#aaa', lineHeight: 1.8 }}><span>Vol</span><span style={{ fontWeight: 600 }}>{((c.volume || 0) / 1000).toFixed(1)}K</span></div>
        </div>;
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ML BACKTESTER PANEL
   Integrates the full index.html + app.py design
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   MODEL EXPLANATION GENERATOR
───────────────────────────────────────────── */
function generateExplanation(result, sym) {
  if (!result || !result.featureWeights) return [];

  const { featureWeights, accuracy, strategy_return, market_return, trades, n_test, bias } = result;
  const top    = featureWeights[0];
  const second = featureWeights[1];
  const acc    = (accuracy * 100).toFixed(1);
  const stratR = (strategy_return * 100).toFixed(1);
  const mktR   = (market_return   * 100).toFixed(1);
  const bullishFeatures = featureWeights.filter(f => f.direction === 'bullish');
  const bearishFeatures = featureWeights.filter(f => f.direction === 'bearish');
  const tradePct = n_test > 0 ? ((trades / n_test) * 100).toFixed(0) : '—';
  const outperforms = strategy_return > market_return;
  const biasLabel = bias > 0.3 ? 'bullish' : bias < -0.3 ? 'bearish' : 'neutral';

  const FEATURE_PLAIN = {
    Return:       'daily price momentum (how much the price moved that day)',
    MA10:         '10-day moving average (short-term trend direction)',
    MA20:         '20-day moving average (medium-term trend direction)',
    RSI:          'RSI — Relative Strength Index (whether the stock is overbought or oversold)',
    MACD:         'MACD — momentum difference between 12-day and 26-day exponential averages',
    VolumeChange: 'volume change (whether trading activity spiked or dropped)',
  };

  const DIRECTION_PLAIN = {
    bullish: 'pushes the model toward predicting a price increase (BUY signal)',
    bearish: 'pushes the model toward predicting a price decrease (HOLD signal)',
  };

  const sections = [];

  // ── Section 1: Overall verdict ──
  let verdict = '';
  if (accuracy >= 0.58) verdict = `The model is performing well above random chance with ${acc}% accuracy on unseen test data — statistically meaningful for a two-class directional prediction problem (random would be ~50%).`;
  else if (accuracy >= 0.53) verdict = `The model achieved ${acc}% accuracy on the test set, modestly above the 50% random baseline. In financial prediction even small edges can be exploitable when applied consistently.`;
  else verdict = `The model reached only ${acc}% accuracy on the test set, which is near-random. This suggests the selected features do not contain strong predictive signal for ${sym} over this period — try adding RSI or MACD.`;
  sections.push({ title: 'Overall Model Performance', icon: '🎯', body: verdict });

  // ── Section 2: What drove decisions ──
  let driverText = `The most influential input was **${top.name}** (${FEATURE_PLAIN[top.name] || top.name}), accounting for ${top.importance}% of the total decision weight. `;
  driverText += `It ${DIRECTION_PLAIN[top.direction]}. `;
  if (second) {
    driverText += `The second-strongest signal was **${second.name}** (${FEATURE_PLAIN[second.name] || second.name}) at ${second.importance}% weight, `;
    driverText += second.direction === top.direction
      ? `reinforcing the same directional bias.`
      : `pulling in the opposite direction and creating some internal tension in the model.`;
  }
  sections.push({ title: 'What Drove the Decisions', icon: '🧠', body: driverText });

  // ── Section 3: Bullish vs Bearish signals ──
  let signalText = '';
  if (bullishFeatures.length > 0 && bearishFeatures.length > 0) {
    signalText = `The model learned a **mixed signal** from your feature set. `;
    signalText += `Features driving BUY predictions: ${bullishFeatures.map(f => f.name).join(', ')} (combined weight: ${bullishFeatures.reduce((s,f) => s + parseFloat(f.importance), 0).toFixed(1)}%). `;
    signalText += `Features driving HOLD/SKIP: ${bearishFeatures.map(f => f.name).join(', ')} (combined weight: ${bearishFeatures.reduce((s,f) => s + parseFloat(f.importance), 0).toFixed(1)}%). `;
    signalText += `This internal disagreement means the model only buys when bullish signals clearly dominate on a given day.`;
  } else if (bullishFeatures.length === featureWeights.length) {
    signalText = `All ${featureWeights.length} selected features point in the **same bullish direction** — the model interprets increases in all of them as reasons to buy. This alignment can mean high confidence on clear trending days, but may miss reversals.`;
  } else {
    signalText = `All selected features are aligned **bearishly** — the model treats rises in these indicators as caution signals. This is an unusual configuration; consider adding momentum features like Return or MACD.`;
  }
  sections.push({ title: 'Bullish vs Bearish Signal Balance', icon: '⚖️', body: signalText });

  // ── Section 4: Bias intercept ──
  let biasText = `The model's **intercept (bias) is ${result.bias > 0 ? '+' : ''}${result.bias}**, indicating a ${biasLabel} baseline. `;
  if (biasLabel === 'bullish') biasText += `Even with no feature signal, the model leans toward predicting an up day — reflecting the general upward drift of equities over time that it absorbed from training data.`;
  else if (biasLabel === 'bearish') biasText += `The model's default instinct (ignoring all features) is to skip trading — it requires convincing bullish evidence from features before issuing a buy signal.`;
  else biasText += `The model has no strong prior lean; its decisions are driven almost entirely by the feature values on each day.`;
  sections.push({ title: 'Model Bias (Baseline Tendency)', icon: '⚙️', body: biasText });

  // ── Section 5: Trading behaviour ──
  let tradeText = `Out of ${n_test} test-period days, the model issued **${trades} buy signals (${tradePct}% of days)**. `;
  if (trades / n_test > 0.7) tradeText += `This is a high trade frequency — the model is broadly bullish and rarely sits out. A quieter market or bearish features might reduce this.`;
  else if (trades / n_test > 0.4) tradeText += `This is a moderate trade frequency, balancing participation with selectivity.`;
  else tradeText += `The model is quite selective, only entering on its highest-confidence signals. This reduces exposure but may miss sustained uptrends.`;
  sections.push({ title: 'Trading Behaviour', icon: '📋', body: tradeText });

  // ── Section 6: vs Buy & Hold ──
  let compareText = outperforms
    ? `The strategy returned **+${stratR}%** versus the market's **+${mktR}%** over the test period — an **outperformance of ${(strategy_return - market_return) * 100 > 0 ? '+' : ''}${((strategy_return - market_return) * 100).toFixed(1)}pp**. This suggests the logistic model successfully identified some non-random structure in ${sym}'s price movement during this period.`
    : `The strategy returned **${stratR}%** while simply holding ${sym} returned **${mktR}%**. The model underperformed buy-and-hold by ${((market_return - strategy_return) * 100).toFixed(1)}pp. This may mean the model's "sit out" days were actually up-days it missed — common when a stock trends strongly upward.`;
  compareText += ` Note: this simulation does not account for transaction costs, slippage, or taxes, which would reduce real-world returns.`;
  sections.push({ title: 'Strategy vs Buy & Hold', icon: '📊', body: compareText });

  // ── Section 7: Suggested improvements ──
  const suggestions = [];
  if (!result.featureWeights.find(f => f.name === 'RSI'))  suggestions.push('Add **RSI** — it often captures overbought/oversold reversals that moving averages miss.');
  if (!result.featureWeights.find(f => f.name === 'MACD')) suggestions.push('Add **MACD** — momentum crossover signal frequently improves directional accuracy.');
  if (featureWeights.length < 3) suggestions.push('Use **more features** — with only one or two inputs the model is underfitted.');
  if (accuracy < 0.53) suggestions.push('Consider a **longer date range** — more training data helps the model generalise.');
  if (suggestions.length === 0) suggestions.push('Try toggling individual features off to see which ones hurt accuracy when removed.');
  sections.push({ title: 'How to Improve the Model', icon: '💡', body: suggestions.join(' ') });

  return sections;
}

const ALL_FEATURES = [
  { id: 'Return',        label: 'Return',    desc: 'Daily % change' },
  { id: 'MA10',          label: 'MA10',       desc: '10-day moving avg' },
  { id: 'MA20',          label: 'MA20',       desc: '20-day moving avg' },
  { id: 'RSI',           label: 'RSI',        desc: '14-period RSI' },
  { id: 'MACD',          label: 'MACD',       desc: '12/26 EMA diff' },
  { id: 'VolumeChange',  label: 'Volume Δ',  desc: 'Volume % change' },
];

function MLBacktesterPanel({ candles, sym, onClose }) {
  const MONO = "'IBM Plex Mono', 'Courier New', monospace";
  const [selectedFeatures, setSelectedFeatures] = useState(['Return', 'MA10', 'MA20']);
  const [result,     setResult]     = useState(null);
  const [running,    setRunning]    = useState(false);
  const [activeTab,  setActiveTab]  = useState('results');
  const [logs,       setLogs]       = useState([{ msg: '$ ready — configure features and click Run Backtest', type: 'ok' }]);

  const addLog = (msg, type = '') => setLogs(prev => [...prev, { msg, type }]);
  const logRef = useRef(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const toggleFeature = id => setSelectedFeatures(prev =>
    prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
  );

  const handleRun = useCallback(() => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setActiveTab('results');
    setLogs([]);
    addLog(`$ running ML backtest for ${sym}`, 'info');
    addLog(`$ features: [${selectedFeatures.join(', ')}]`, 'info');
    addLog(`$ candles loaded — ${candles.length} samples`, 'info');
    addLog(`$ building feature matrix...`, 'info');
    setTimeout(() => {
      const r = runMLBacktest(candles, selectedFeatures);
      if (r.error) { addLog(`✗ ${r.error}`, 'err'); setRunning(false); return; }
      addLog(`$ train/test split: ${r.n_train} train / ${r.n_test} test`, 'info');
      addLog(`$ fitting StandardScaler...`, 'info');
      addLog(`$ training LogisticRegression (400 epochs, lr=0.1)...`, 'info');
      addLog(`✓ model trained`, 'ok');
      addLog(`✓ accuracy:         ${(r.accuracy * 100).toFixed(1)}%`, 'ok');
      addLog(`✓ strategy return:  ${r.strategy_return >= 0 ? '+' : ''}${(r.strategy_return * 100).toFixed(1)}%`, 'ok');
      addLog(`✓ market return:    ${r.market_return  >= 0 ? '+' : ''}${(r.market_return  * 100).toFixed(1)}%`, 'ok');
      addLog(`✓ trades made:      ${r.trades} / ${r.n_test}`, 'ok');
      addLog(`$ explanation ready — click the Explain tab`, 'info');
      setResult(r);
      setRunning(false);
    }, 300);
  }, [candles, selectedFeatures, sym, running]);

  const stratUp   = result ? result.strategy_return >= 0 : true;
  const mktUp     = result ? result.market_return   >= 0 : true;
  const chartFmt  = v => `${(v * 100).toFixed(1)}%`;
  const sections  = result ? generateExplanation(result, sym) : [];

  const TABS = [
    { id: 'results', label: 'Results' },
    { id: 'explain', label: 'Explain', badge: result ? '✦' : null },
  ];

  return (
    <div style={{ background: '#f5f4f0', borderTop: '2px solid #1a4fd6', padding: '0', flexShrink: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'white', borderBottom: '1px solid #e2e0d8' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', letterSpacing: '-0.3px' }}>
            <span style={{ color: '#1a4fd6', fontWeight: 300 }}>{sym}</span> <strong>ML Backtester</strong>
          </div>
          <div style={{ fontSize: 11, color: '#7a7870', fontFamily: MONO, marginTop: 1 }}>logistic regression · directional prediction</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 24, background: '#f5f4f0', borderRadius: 8, padding: 3, border: '1px solid #e2e0d8' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: '5px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: MONO, fontWeight: activeTab === t.id ? 600 : 400,
                background: activeTab === t.id ? 'white' : 'transparent',
                color: activeTab === t.id ? '#1a1a18' : '#7a7870',
                boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.label}
              {t.badge && <span style={{ fontSize: 9, background: '#1a4fd6', color: 'white', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, background: '#eef2fd', color: '#1a4fd6', padding: '2px 8px', borderRadius: 10, fontFamily: MONO, fontWeight: 500 }}>SIMULATION</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e0d8', borderRadius: 6, padding: '3px 12px', cursor: 'pointer', fontSize: 12, color: '#7a7870', fontFamily: MONO }}>✕ Close</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Config card — always visible */}
        <div style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 10, padding: '18px 20px', flex: '1 1 260px', minWidth: 240 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a7870', fontFamily: MONO, marginBottom: 14 }}>Configuration</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#7a7870', marginBottom: 8, fontFamily: MONO }}>Features</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {ALL_FEATURES.map(f => {
                const on = selectedFeatures.includes(f.id);
                return <button key={f.id} onClick={() => toggleFeature(f.id)} title={f.desc}
                  style={{ padding: '5px 12px', border: `1px solid ${on ? '#1a4fd6' : '#e2e0d8'}`, borderRadius: 6,
                    background: on ? '#eef2fd' : '#f5f4f0', color: on ? '#1a4fd6' : '#1a1a18',
                    fontFamily: MONO, fontSize: 12, cursor: 'pointer', transition: 'all .12s', fontWeight: on ? 500 : 400 }}>
                  {f.label}
                </button>;
              })}
            </div>
          </div>
          <div style={{ background: '#f5f4f0', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, fontFamily: MONO, color: '#7a7870' }}>
            <span style={{ color: '#1a1a18', fontWeight: 500 }}>{sym}</span> · {candles.length} candles · 80/20 split
          </div>
          <button onClick={handleRun} disabled={running || selectedFeatures.length === 0}
            style={{ width: '100%', height: 44, background: running ? '#555' : '#1a1a18', color: 'white', border: 'none', borderRadius: 8,
              fontSize: 13, fontFamily: MONO, cursor: running ? 'not-allowed' : 'pointer', letterSpacing: '0.03em',
              opacity: selectedFeatures.length === 0 ? 0.4 : 1, transition: 'opacity .15s' }}>
            {running ? '⟳  Running…' : 'Run Backtest'}
          </button>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div style={{ flex: '2 1 400px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ─── RESULTS TAB ─── */}
          {activeTab === 'results' && <>

            {result && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Strategy Return', value: `${result.strategy_return >= 0 ? '+' : ''}${(result.strategy_return * 100).toFixed(1)}%`, cls: stratUp ? 'up' : 'down' },
                  { label: 'Market Return',   value: `${result.market_return   >= 0 ? '+' : ''}${(result.market_return   * 100).toFixed(1)}%`, cls: mktUp   ? '' : 'down'  },
                  { label: 'Accuracy',        value: `${(result.accuracy * 100).toFixed(1)}%`, cls: result.accuracy >= 0.55 ? 'up' : '' },
                  { label: 'Trades Made',     value: result.trades, cls: '' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#7a7870', fontFamily: MONO, marginBottom: 5 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 500, fontFamily: MONO, color: m.cls === 'up' ? '#1e7a45' : m.cls === 'down' ? '#b83232' : '#1a1a18' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            {result && result.chartData.length > 2 && (
              <div style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a7870', fontFamily: MONO, marginBottom: 12 }}>Cumulative Returns</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={result.chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <XAxis dataKey="idx" tick={{ fontFamily: MONO, fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} interval={Math.floor(result.chartData.length / 5)} />
                    <YAxis tickFormatter={chartFmt} tick={{ fontFamily: MONO, fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} width={42} />
                    <Tooltip formatter={(v, name) => [`${(v * 100).toFixed(2)}%`, name === 'strategy' ? 'Strategy' : 'Market']} labelFormatter={v => `Day ${v}`} contentStyle={{ fontFamily: MONO, fontSize: 11, border: '1px solid #e2e0d8', borderRadius: 6 }} />
                    <Legend wrapperStyle={{ fontFamily: MONO, fontSize: 11, color: '#7a7870' }} />
                    <ReferenceLine y={0} stroke="#e2e0d8" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="strategy" stroke="#1a4fd6" strokeWidth={1.5} dot={false} name="Strategy" />
                    <Line type="monotone" dataKey="market"   stroke="#aaa"    strokeWidth={1}   dot={false} name="Market" strokeDasharray="4 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a7870', fontFamily: MONO, marginBottom: 10 }}>Console</div>
              <div ref={logRef} style={{ background: '#1a1a18', borderRadius: 8, padding: '12px 14px', fontFamily: MONO, fontSize: 11, color: '#8a8e7a', minHeight: 60, maxHeight: 110, overflowY: 'auto', lineHeight: 1.7 }}>
                {logs.length === 0
                  ? <span style={{ color: '#555' }}>$ …</span>
                  : logs.map((l, i) => <div key={i} style={{ color: l.type === 'ok' ? '#5ab875' : l.type === 'err' ? '#d46060' : l.type === 'info' ? '#6a9fd4' : '#8a8e7a' }}>{l.msg}</div>)
                }
              </div>
            </div>
          </>}

          {/* ─── EXPLAIN TAB ─── */}
          {activeTab === 'explain' && (
            !result
              ? <div style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 10, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🧠</div>
                  <div style={{ fontSize: 13, color: '#7a7870', fontFamily: MONO }}>Run a backtest first to generate the model explanation.</div>
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Feature importance bar chart */}
                  <div style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a7870', fontFamily: MONO, marginBottom: 14 }}>Feature Importance  ·  |weight| normalised</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {result.featureWeights.map(f => (
                        <div key={f.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontFamily: MONO, color: '#1a1a18', fontWeight: 500 }}>{f.name}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontFamily: MONO, color: f.direction === 'bullish' ? '#1e7a45' : '#b83232', background: f.direction === 'bullish' ? '#eaf5ee' : '#faeaea', padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>
                                {f.direction === 'bullish' ? '▲ BUY' : '▼ HOLD'}
                              </span>
                              <span style={{ fontSize: 11, fontFamily: MONO, color: '#7a7870', minWidth: 36, textAlign: 'right' }}>{f.importance}%</span>
                              <span style={{ fontSize: 10, fontFamily: MONO, color: '#aaa' }}>w={f.weight > 0 ? '+' : ''}{f.weight}</span>
                            </div>
                          </div>
                          <div style={{ height: 7, background: '#f0ede8', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${f.importance}%`, background: f.direction === 'bullish' ? '#1a4fd6' : '#b83232', borderRadius: 4, transition: 'width .4s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 10, color: '#aaa', fontFamily: MONO }}>
                      bias (intercept) = {result.bias > 0 ? '+' : ''}{result.bias}
                      &nbsp;·&nbsp;
                      {result.bias > 0.3 ? 'model leans bullish by default' : result.bias < -0.3 ? 'model leans bearish by default' : 'model is neutral by default'}
                    </div>
                  </div>

                  {/* Explanation sections */}
                  {sections.map((s, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid #e2e0d8', borderRadius: 10, padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        {s.title}
                      </div>
                      <p style={{ fontSize: 13, color: '#3a3830', lineHeight: 1.75, margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {s.body.split('**').map((part, j) =>
                          j % 2 === 1
                            ? <strong key={j} style={{ color: '#1a1a18', fontWeight: 600 }}>{part}</strong>
                            : <span key={j}>{part}</span>
                        )}
                      </p>
                    </div>
                  ))}

                </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN STOCK DETAIL PAGE
───────────────────────────────────────────── */
const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'All'];
const LOGOS  = { AAPL:'🍎', MSFT:'🪟', NVDA:'🎮', AMZN:'📦', GOOGL:'🔍', META:'👾', TSLA:'⚡', JPM:'🏦', V:'💳', NFLX:'🎬' };

export default function StockDetailPage() {
  const { symbol } = useParams();
  const sym = symbol?.toUpperCase();

  /* ─── Stable context reads (no price) ─── */
  const { prices, toggleWatchlist, watchlist, placeOrder, user, portfolio, refreshPortfolio } = useApp();

  /* ─── Stable UI state — none of these change on price ticks ─── */
  const [stock,          setStock]         = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [activeRange,    setActiveRange]   = useState('1M');
  const [activeTab,      setActiveTab]     = useState('BUY');
  const [shares,         setShares]        = useState(1);
  const [showUPI,        setShowUPI]       = useState(false);
  const [lockedPrice,    setLockedPrice]   = useState(0);
  const [showOrders,     setShowOrders]    = useState(false);
  const [showPos,        setShowPos]       = useState(true);
  const [orders,         setOrders]        = useState([]);
  const [showForecast,   setShowForecast]  = useState(false);
  const [forecastDays,   setForecastDays]  = useState(30);
  const [showBacktester, setShowBacktester]= useState(false);
  const [showToolMenu,   setShowToolMenu]  = useState(false);

  /* ─── Chart candles — only this state updates on price ticks ─── */
  const [candles,   setCandles]   = useState([]);
  const [chartSize, setChartSize] = useState({ width: 800, height: 400 });
  const tickRef           = useRef(0);
  const toolMenuRef       = useRef(null);
  const chartContainerRef = useRef(null);

  /* ─── Live price via ref — no re-render for trading panel ─── */
  const priceRef    = useRef(0);
  const liveDataRef = useRef({});

  /* Snapshot of price for UI that needs a render (top bar, OHLCV, order panel) */
  const [priceSnap, setPriceSnap] = useState({ price: 0, change: 0, changePct: 0, isUp: true });

  /* market open derived from current hour — stable */
  const marketOpen = new Date().getHours() >= 9 && new Date().getHours() < 16;

  useEffect(() => {
    const h = e => { if (toolMenuRef.current && !toolMenuRef.current.contains(e.target)) setShowToolMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const obs = () => { if (chartContainerRef.current) { const { width, height } = chartContainerRef.current.getBoundingClientRect(); setChartSize({ width: Math.floor(width), height: Math.floor(height) }); } };
    obs();
    const ro = new ResizeObserver(obs);
    if (chartContainerRef.current) ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getStock(sym).then(d => {
      setStock(d);
      setCandles(d.candles || []);
      const base = d.price || 0;
      priceRef.current = base;
      setPriceSnap({ price: base, change: d.change || 0, changePct: d.change_pct || 0, isUp: (d.change_pct || 0) >= 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
    if (user?.id) api.getOrders(user.id).then(setOrders).catch(() => {});
  }, [sym, user?.id]);

  /* ─── Price tick handler: update chart candles + price snapshot ─── */
  useEffect(() => {
    const liveData = prices[sym];
    if (!liveData?.price) return;

    /* Always update ref immediately — no re-render */
    priceRef.current    = liveData.price;
    liveDataRef.current = liveData;

    /* Throttle the priceSnap state update to once every 4 ticks (~8s)
       so the top-bar / order-panel re-renders are infrequent            */
    tickRef.current += 1;
    if (tickRef.current % 4 === 0 || tickRef.current === 1) {
      setPriceSnap({
        price:     liveData.price,
        change:    liveData.change    ?? 0,
        changePct: liveData.change_pct ?? 0,
        isUp:      (liveData.change_pct ?? 0) >= 0,
      });
    }

    /* Update only the last candle — leaves rest of state untouched */
    setCandles(prev => {
      if (prev.length === 0) return prev;
      const arr  = [...prev];
      const last = { ...arr[arr.length - 1] };
      last.close = liveData.price;
      last.high  = Math.max(last.high, liveData.price);
      last.low   = Math.min(last.low,  liveData.price);
      arr[arr.length - 1] = last;
      /* Spawn a new candle every 60 ticks (~2 min) */
      if (tickRef.current % 60 === 0) {
        return [...arr.slice(-200), { time: Math.floor(Date.now() / 1000), open: liveData.price, high: liveData.price, low: liveData.price, close: liveData.price, volume: Math.floor(Math.random() * 5e6 + 1e6) }];
      }
      return arr;
    });
  }, [prices[sym]?.price]);

  const price     = priceSnap.price;
  const change    = priceSnap.change;
  const changePct = priceSnap.changePct;
  const isUp      = priceSnap.isUp;

  const chartData = useMemo(() => {
    const now_s = Date.now() / 1000;
    const secs = { '1D': 86400, '1W': 604800, '1M': 2592000, '3M': 7776000, '6M': 15552000, 'YTD': (new Date().getMonth() + 1) * 2592000, '1Y': 31536000, 'All': Infinity };
    const filtered = candles.filter(c => c.time >= now_s - (secs[activeRange] || Infinity));
    return filtered.length >= 5 ? filtered : candles.slice(-60);
  }, [candles, activeRange]);

  const { forecast: forecastData, confidence: confidenceData } = useMemo(() => {
    if (!showForecast || chartData.length < 10) return { forecast: [], confidence: [] };
    return logisticRegressionForecast(chartData.map(c => c.close), forecastDays);
  }, [showForecast, chartData, forecastDays]);

  const forecastTrend = forecastData.length > 0 ? (forecastData[forecastData.length - 1] > price ? 'bullish' : 'bearish') : null;
  const forecastPct   = forecastData.length > 0 ? ((forecastData[forecastData.length - 1] - price) / price * 100).toFixed(2) : null;

  const position    = portfolio?.positions?.find(p => p.symbol === sym);
  const cashBalance = portfolio?.cash_balance ?? user?.balance ?? 100000;
  const inWatchlist = watchlist?.some(w => w.symbol === sym);
  const recentTrades = orders.filter(o => o.symbol === sym).slice(0, 6);

  const handleTradeClick = () => { if (activeTab === 'BUY') { setLockedPrice(price); setShowUPI(true); } else executeTrade(price); };
  const executeTrade = async ep => { try { await placeOrder(sym, activeTab, Number(shares), 'MARKET', ep); refreshPortfolio(); if (user?.id) api.getOrders(user.id).then(setOrders).catch(() => {}); } catch {} };
  const handlePaymentSuccess = async () => { setShowUPI(false); await executeTrade(lockedPrice); };

  /* marketOpen is derived at render time from wall clock — no hook needed */
  const _marketOpenNow = new Date().getHours() >= 9 && new Date().getHours() < 16;

  if (loading) return <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}><div style={{ width: 36, height: 36, border: '3px solid #eee', borderTopColor: '#26a69a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><span style={{ color: '#aaa', fontSize: 14 }}>Loading {sym}…</span></div>;
  if (!stock) return <div style={{ textAlign: 'center', padding: 80 }}><div style={{ fontSize: 48 }}>❌</div><h2>Stock not found</h2><Link to="/" style={{ color: '#26a69a' }}>← Back</Link></div>;

  return (
    <div style={{ background: '#f5f6f8', minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, flexWrap: 'wrap' }}>
        <Link to="/" style={{ color: '#26a69a', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>‹ Back</Link>
        <div style={{ width: 1, height: 20, background: '#eee' }} />
        <span style={{ fontSize: 20 }}>{LOGOS[sym]}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{stock.name}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', fontVariantNumeric: 'tabular-nums' }}>${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: isUp ? '#26a69a' : '#ef5350' }}>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
        </div>
        {showForecast && forecastPct && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: forecastTrend === 'bullish' ? '#f3f0ff' : '#fdf2f8', border: `1px solid ${forecastTrend === 'bullish' ? '#a78bfa' : '#f0abfc'}`, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, color: forecastTrend === 'bullish' ? '#7c3aed' : '#a21caf' }}>
            🔮 AI Forecast: {forecastTrend === 'bullish' ? '+' : ''}{forecastPct}% ({forecastDays}d)
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <LiveClock marketOpen={_marketOpenNow} />
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', gap: 10, padding: 10, overflow: 'hidden', minHeight: 0 }}>

        {/* ═══ CHART PANEL ═══ */}
        <div style={{ flex: 1, background: 'white', borderRadius: 12, border: '1px solid #eee', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)', minWidth: 0 }}>

          {/* Toolbar */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14, color: '#ccc', cursor: 'pointer' }}>✎</span>
            <span style={{ fontSize: 14, color: '#ccc', cursor: 'pointer' }} onClick={() => api.getStock(sym).then(d => setCandles(d.candles || []))}>↻</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>

              {/* AI Forecast toggle */}
              <button onClick={() => setShowForecast(f => !f)} style={{ background: showForecast ? '#f3f0ff' : '#f5f6f8', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: showForecast ? '#7c3aed' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, border: `1.5px solid ${showForecast ? '#a78bfa' : '#eee'}`, fontWeight: showForecast ? 700 : 400, transition: 'all .15s' }}>
                🔮 {showForecast ? 'Forecast ON' : 'AI Forecast'}
              </button>
              {showForecast && (
                <select value={forecastDays} onChange={e => setForecastDays(Number(e.target.value))} style={{ background: '#f3f0ff', border: '1.5px solid #a78bfa', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontWeight: 600, outline: 'none' }}>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              )}

              {/* Tools dropdown */}
              <div ref={toolMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowToolMenu(v => !v)} style={{ background: showBacktester ? '#eef2fd' : '#f5f6f8', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: showBacktester ? '#1a4fd6' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, border: `1.5px solid ${showBacktester ? '#1a4fd6' : '#eee'}`, fontWeight: showBacktester ? 700 : 400, transition: 'all .15s' }}>
                  📊 Tools ▾
                </button>
                {showToolMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 200, background: 'white', borderRadius: 10, border: '1px solid #e8e8e8', boxShadow: '0 8px 28px rgba(0,0,0,.13)', minWidth: 230, padding: '6px 0' }}>
                    <div style={{ padding: '5px 14px 6px', fontSize: 10, color: '#bbb', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Analysis Tools</div>
                    {[
                      { icon: '📊', title: 'ML Backtester',     sub: 'Logistic regression · LR · feature engineering', action: () => { setShowBacktester(v => !v); setShowToolMenu(false); }, active: showBacktester, accent: '#1a4fd6', bg: '#eef2fd' },
                      { icon: '🔮', title: 'AI Price Forecast', sub: 'Logistic growth model · confidence bands',          action: () => { setShowForecast(v => !v);  setShowToolMenu(false); }, active: showForecast,  accent: '#7c3aed', bg: '#f3f0ff' },
                      { icon: '↻',  title: 'Refresh Chart',     sub: 'Reload all candle data',                            action: () => { api.getStock(sym).then(d => setCandles(d.candles || [])); setShowToolMenu(false); }, active: false, accent: '#666', bg: '#f5f6f8' },
                    ].map((item, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <div style={{ height: 1, background: '#f5f5f5', margin: '3px 0' }} />}
                        <button onClick={item.action} style={{ width: '100%', padding: '9px 14px', border: 'none', background: item.active ? item.bg : 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ fontSize: 18 }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: item.active ? item.accent : '#333' }}>{item.active ? '✓ ' : ''}{item.title}</div>
                            <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{item.sub}</div>
                          </div>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {[['🕐', '5 min ▾'], ['🕯', 'Candle ▾'], ['📈', 'Indicator ▾']].map(([icon, label]) => (
                <div key={icon} style={{ background: '#f5f6f8', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #eee' }}>{icon}<span>{label}</span></div>
              ))}
            </div>
          </div>

          {/* OHLCV strip */}
          <div style={{ padding: '5px 16px', display: 'flex', gap: 14, fontSize: 12, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', borderBottom: '1px solid #fafafa' }}>
            <span style={{ color: '#aaa' }}>Price</span>
            {(() => {
              const d = chartData.length ? chartData[chartData.length - 1] : {};
              return <>
                <span style={{ color: '#26a69a', fontWeight: 700 }}>O <b>{(d.open || 0).toFixed(2)}</b></span>
                <span style={{ color: '#26a69a', fontWeight: 700 }}>H <b>{(d.high || 0).toFixed(2)}</b></span>
                <span style={{ color: '#ef5350', fontWeight: 700 }}>L <b>{(d.low || 0).toFixed(2)}</b></span>
                <span style={{ color: '#555',    fontWeight: 700 }}>C <b>{(d.close || price).toFixed(2)}</b></span>
                <span style={{ width: 1, height: 14, background: '#eee', display: 'inline-block' }} />
                <span style={{ color: '#26a69a', fontWeight: 600 }}>Volume <b>{((d.volume || 0) / 1000).toFixed(1)}K</b></span>
                {showForecast && forecastPct && <>
                  <span style={{ width: 1, height: 14, background: '#eee', display: 'inline-block' }} />
                  <span style={{ color: '#7c3aed', fontWeight: 700, background: '#f3f0ff', padding: '1px 8px', borderRadius: 4, fontSize: 11 }}>🔮 {forecastDays}d: <b style={{ color: forecastTrend === 'bullish' ? '#16a34a' : '#dc2626' }}>{forecastTrend === 'bullish' ? '+' : ''}{forecastPct}%</b></span>
                </>}
              </>;
            })()}
            <TimeStamp style={{ marginLeft: 'auto', fontSize: 11, color: '#bbb', fontVariantNumeric: 'tabular-nums' }} />
          </div>

          {/* SVG Chart */}
          <div ref={chartContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            {chartSize.width > 0 && chartSize.height > 0 && (
              <CandlestickChart data={chartData} width={chartSize.width} height={chartSize.height} livePrice={price} showForecast={showForecast} forecastData={forecastData} confidenceData={confidenceData} backtestTrades={[]} />
            )}
          </div>

          {/* Range bar */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <TimeStamp style={{ fontSize: 11, color: '#bbb' }} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              {RANGES.map(r => (
                <button key={r} onClick={() => setActiveRange(r)} style={{ padding: '4px 11px', border: 'none', borderRadius: 20, background: activeRange === r ? '#26a69a' : 'transparent', color: activeRange === r ? 'white' : '#777', fontSize: 12, fontWeight: activeRange === r ? 700 : 400, cursor: 'pointer', transition: 'all .15s' }}>{r}</button>
              ))}
            </div>
          </div>

          {/* ML Backtester panel (slides in below chart) */}
          {showBacktester && (
            <MLBacktesterPanel
              candles={chartData}
              sym={sym}
              onClose={() => setShowBacktester(false)}
            />
          )}
        </div>

        {/* ═══ TRADING PANEL ═══ */}
        <div style={{ width: 296, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, overflowY: 'auto' }}>

          {/* Buy/Sell */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', position: 'relative' }}>
              {['BUY', 'SELL'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '14px 0', border: 'none', background: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: activeTab === t ? (t === 'BUY' ? '#26a69a' : '#ef5350') : '#c0c0c0', borderBottom: `2.5px solid ${activeTab === t ? (t === 'BUY' ? '#26a69a' : '#ef5350') : 'transparent'}`, transition: 'all .15s' }}>
                  Market {t === 'BUY' ? 'Buy' : 'Sell'}
                </button>
              ))}
              <span style={{ position: 'absolute', right: 14, top: 14, color: '#ccc', fontSize: 18 }}>⋯</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Shares to {activeTab === 'BUY' ? 'Buy' : 'Sell'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setShares(s => Math.max(1, s - 1))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #e8e8e8', background: '#fafafa', cursor: 'pointer', fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input type="number" min="1" value={shares} onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: 48, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, color: '#26a69a', textAlign: 'right', background: 'transparent' }} />
                  <button onClick={() => setShares(s => s + 1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #e8e8e8', background: '#fafafa', cursor: 'pointer', fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div style={{ height: 1, background: '#f5f5f5', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Market Price <span style={{ background: '#e6f7f5', color: '#26a69a', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>NSE</span></span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', fontVariantNumeric: 'tabular-nums' }}>{price.toFixed(2)}</span>
              </div>
              <div style={{ height: 1, background: '#f5f5f5', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#bbb' }}>Balance Available</span>
                <span style={{ fontSize: 13, color: '#bbb' }}>☐ ${cashBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div style={{ background: '#f8f9fb', borderRadius: 8, padding: '8px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#999' }}>Estimated {activeTab === 'BUY' ? 'Cost' : 'Proceeds'}</span>
                <span style={{ fontWeight: 700, color: '#333' }}>${(price * shares).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {activeTab === 'BUY' && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#26a69a', marginBottom: 10, background: '#f0faf9', borderRadius: 6, padding: '5px 10px' }}><span>📱</span> Payment via UPI QR code</div>}
              <button onClick={handleTradeClick} style={{ width: '100%', padding: '13px 0', background: activeTab === 'BUY' ? '#26a69a' : '#ef5350', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 800, letterSpacing: 1.5, cursor: 'pointer', transition: 'all .15s', boxShadow: `0 4px 14px ${activeTab === 'BUY' ? 'rgba(38,166,154,.3)' : 'rgba(239,83,80,.3)'}` }}>
                {activeTab === 'BUY' ? '📱 PAY & BUY' : '📉 SELL'}
              </button>
              <button onClick={() => toggleWatchlist(stock)} style={{ width: '100%', marginTop: 10, padding: '8px 0', background: 'none', border: `1px solid ${inWatchlist ? '#ef5350' : '#e8e8e8'}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', color: inWatchlist ? '#ef5350' : '#999' }}>
                {inWatchlist ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}
              </button>
            </div>
          </div>

          {/* AI Forecast Card */}
          {showForecast && forecastData.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #f3f0ff 0%, #fdf2f8 100%)', borderRadius: 12, border: '1.5px solid #a78bfa', padding: '14px 18px', boxShadow: '0 2px 12px rgba(139,92,246,.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔮 AI PRICE FORECAST
                <span style={{ fontSize: 10, background: '#a78bfa', color: 'white', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>Logistic Regression</span>
              </div>
              {[
                ['Current Price', `$${price.toFixed(2)}`, '#555'],
                [`${forecastDays}d Target`, `$${forecastData[forecastData.length - 1].toFixed(2)}`, forecastTrend === 'bullish' ? '#16a34a' : '#dc2626'],
                ['Expected Move', `${forecastTrend === 'bullish' ? '+' : ''}${forecastPct}%`, forecastTrend === 'bullish' ? '#16a34a' : '#dc2626'],
                ['Upper Band', `$${confidenceData[confidenceData.length - 1]?.upper?.toFixed(2)}`, '#a78bfa'],
                ['Lower Band', `$${confidenceData[confidenceData.length - 1]?.lower?.toFixed(2)}`, '#a78bfa'],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(139,92,246,.1)' }}>
                  <span style={{ color: '#9370db' }}>{k}</span><span style={{ fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 10, color: '#a78bfa', lineHeight: 1.5 }}>⚠️ Educational purposes only. Not financial advice.</div>
            </div>
          )}

          {/* Open Orders */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <button onClick={() => setShowOrders(o => !o)} style={{ width: '100%', padding: '13px 18px', border: 'none', background: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#333' }}>
              Open Orders <span style={{ color: '#bbb', transform: showOrders ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
            </button>
            {showOrders && <div style={{ borderTop: '1px solid #f5f5f5', padding: '12px 18px', fontSize: 13, color: '#bbb', textAlign: 'center' }}>No pending orders for {sym}</div>}
          </div>

          {/* Positions */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <button onClick={() => setShowPos(o => !o)} style={{ width: '100%', padding: '13px 18px', border: 'none', background: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#333' }}>
              Positions <span style={{ color: '#bbb', transform: showPos ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
            </button>
            {showPos && (
              <div style={{ borderTop: '1px solid #f5f5f5', padding: '12px 18px' }}>
                {!position ? <div style={{ fontSize: 13, color: '#bbb', textAlign: 'center', padding: '8px 0' }}>No position in {sym}</div> : <>
                  {[['Qty', position.quantity], ['Avg Cost', `$${position.avg_cost.toFixed(2)}`], ['Market Value', `$${position.market_value.toFixed(2)}`]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span style={{ color: '#999' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0 4px', borderTop: '1px solid #f5f5f5', marginTop: 4 }}>
                    <span style={{ color: '#999' }}>P&L</span>
                    <span style={{ fontWeight: 700, color: position.pnl >= 0 ? '#26a69a' : '#ef5350' }}>{position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)} ({position.pnl_pct >= 0 ? '+' : ''}{position.pnl_pct.toFixed(2)}%)</span>
                  </div>
                </>}
              </div>
            )}
          </div>

          {/* Recent trades */}
          {recentTrades.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #eee', padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>Recent Trades</div>
              {recentTrades.map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f8f8f8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: o.order_type === 'BUY' ? '#e6f7f5' : '#fde8e8', color: o.order_type === 'BUY' ? '#26a69a' : '#ef5350', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{o.order_type}</span>
                    <span style={{ color: '#666' }}>{o.quantity} sh</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#333' }}>${o.price.toFixed(2)}</div>
                    <div style={{ color: '#bbb', fontSize: 10 }}>{new Date(o.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{ background: 'white', borderTop: '1px solid #eee', padding: '10px 20px', display: 'flex', gap: 28, overflowX: 'auto', flexShrink: 0 }}>
        {[['Mkt Cap', stock.market_cap], ['P/E Ratio', stock.pe_ratio], ['52W High', `$${stock.high_52w}`], ['52W Low', `$${stock.low_52w}`], ['Div Yield', stock.dividend_yield > 0 ? `${stock.dividend_yield}%` : '—'], ['Analyst', stock.analyst_rating], ['Sector', stock.sector]].map(([k, v]) => (
          <div key={k} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: k === 'Analyst' && (v === 'Strong Buy' || v === 'Buy') ? '#26a69a' : '#1a1a2e' }}>{v}</div>
          </div>
        ))}
      </div>

      {showUPI && <UPIPaymentModal amount={lockedPrice * shares} items={[{ ...stock, price: lockedPrice, quantity: shares, logo: LOGOS[sym] || '📈' }]} onSuccess={handlePaymentSuccess} onClose={() => setShowUPI(false)} />}
    </div>
  );
}
