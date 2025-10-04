import React from 'react';

/**
 * SpeedometerGauge
 * Supports two modes:
 * - Percent/Range mode: value/min/max
 * - LeetCode-style Done/Total mode: done/total (preferred)
 *
 * Props:
 * - done, total: numbers for LeetCode-style meter (overrides value/min/max if provided)
 * - value, min=0, max=100: fallback percent/range mode
 * - size=180, label, units
 * - goodColor, warnColor, badColor
 * - thresholds: { warn, bad } in ABSOLUTE units of total/range for coloring
 * - showNeedle=true
 */
const SpeedometerGauge = ({
  value,
  done,
  total,
  min = 0,
  max = 100,
  size = 180,
  label,
  units,
  goodColor = '#22c55e',
  warnColor = '#f59e0b',
  badColor = '#ef4444',
  thresholds = { warn: 0.7, bad: 0.9 },
  showNeedle = true,
}) => {
  // Determine mode
  const inDoneTotalMode = typeof done === 'number' && typeof total === 'number' && total > 0;

  // Compute normalized percentage
  const usedMin = inDoneTotalMode ? 0 : min;
  const usedMax = inDoneTotalMode ? total : max;
  const rawVal = inDoneTotalMode ? done : (value ?? 0);
  const clamped = Math.max(usedMin, Math.min(usedMax, rawVal));
  const range = usedMax - usedMin || 1;
  const pct = ((clamped - usedMin) / range) * 100; // 0..100

  const strokeWidth = 18;
  const padding = 8;
  const radius = (size - padding * 2) / 2 - strokeWidth / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc helpers (semi-circle 180deg)
  const startAngle = Math.PI; // 180deg
  const endAngle = 0; // 0deg
  const angleForPct = (p) => startAngle + (endAngle - startAngle) * (p / 100);

  const describeArc = (r, startA, endA) => {
    const sx = cx + r * Math.cos(startA);
    const sy = cy + r * Math.sin(startA);
    const ex = cx + r * Math.cos(endA);
    const ey = cy + r * Math.sin(endA);
    const largeArc = endA - startA <= Math.PI ? 0 : 1;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  const bgPath = describeArc(radius, startAngle, endAngle);
  const valueAngle = angleForPct(pct);
  const valPath = describeArc(radius, startAngle, valueAngle);

  // Color based on thresholds (thresholds are in fraction of total/range if between 0..1, else absolute)
  const warnAbs = thresholds.warn <= 1 ? thresholds.warn * range + usedMin : thresholds.warn;
  const badAbs = thresholds.bad <= 1 ? thresholds.bad * range + usedMin : thresholds.bad;
  let valueColor = goodColor;
  if (clamped >= badAbs) valueColor = badColor;
  else if (clamped >= warnAbs) valueColor = warnColor;

  // Needle
  const needleLen = radius - 6;
  const needleAngle = valueAngle;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  // Gradient id for this instance
  const gradientId = React.useMemo(() => `sg-grad-${Math.floor(Math.random()*1e9)}`, []);

  return (
    <div className="flex flex-col items-center select-none" style={{ width: size }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor={warnColor} />
            <stop offset="100%" stopColor={badColor} />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path d={bgPath} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />

        {/* Single value arc (LeetCode-style) */}
        <path d={valPath} stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />

        {/* Needle */}
        {showNeedle && (
          <g>
            <circle cx={cx} cy={cy} r={6} fill="#111827" />
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#111827" strokeWidth={3} />
          </g>
        )}

        {/* Center text */}
        {inDoneTotalMode ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 14, fontWeight: 700 }}>
              {Number.isFinite(done) ? (Math.abs(done) >= 1000 ? done.toFixed(0) : done.toFixed(1)) : 0}
              {units ? ` ${units}` : ''}
              {` / `}
              {Number.isFinite(total) ? (Math.abs(total) >= 1000 ? total.toFixed(0) : total.toFixed(1)) : 0}
              {units ? ` ${units}` : ''}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 12 }}>
              {pct.toFixed(0)}%
            </text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 14, fontWeight: 700 }}>
              {value?.toFixed ? value.toFixed(1) : value}{units ? ` ${units}` : ''}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 12 }}>
              {min} - {max} {units || ''}
            </text>
          </>
        )}
      </svg>
      {label && (
        <div className="text-xs text-muted-700 font-poppins mt-1 text-center">{label}</div>
      )}
    </div>
  );
};

export default SpeedometerGauge;
