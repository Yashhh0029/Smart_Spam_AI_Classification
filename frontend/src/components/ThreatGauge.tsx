import React, { useEffect, useRef } from 'react';

interface ThreatGaugeProps {
  score: number;       // 0–100
  severity: string;   // "High" | "Medium" | "Low"
  isSpam: boolean;
  animating?: boolean;
}

const RADIUS = 70;
const CIRCUMFERENCE = Math.PI * RADIUS; // half-circle arc

const ThreatGauge: React.FC<ThreatGaugeProps> = ({ score, severity, isSpam, animating }) => {
  const arcRef = useRef<SVGCircleElement>(null);

  const colorMap: Record<string, string> = {
    High:   '#f43f5e',
    Medium: '#f59e0b',
    Low:    '#10b981',
  };

  const glowMap: Record<string, string> = {
    High:   'rgba(244,63,94,0.6)',
    Medium: 'rgba(245,158,11,0.5)',
    Low:    'rgba(16,185,129,0.5)',
  };

  const color = colorMap[severity] ?? '#6d28d9';
  const glow  = glowMap[severity]  ?? 'rgba(109,40,217,0.5)';
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  useEffect(() => {
    if (arcRef.current) {
      arcRef.current.style.strokeDashoffset = String(offset);
    }
  }, [offset]);

  const label = isSpam
    ? (severity === 'High' ? '⚠ HIGH THREAT' : severity === 'Medium' ? '⚠ MEDIUM THREAT' : '⚠ SUSPICIOUS')
    : '✓ CLEAR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg
        width={200}
        height={110}
        viewBox="-10 -10 220 120"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx="100" cy="100" r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-180 100 100)"
        />

        {/* Arc */}
        <circle
          ref={arcRef}
          cx="100" cy="100" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE}
          strokeLinecap="round"
          transform="rotate(-180 100 100)"
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${glow})`,
          }}
        />

        {/* Score text */}
        <text
          x="100" y="82"
          textAnchor="middle"
          fill={color}
          fontSize="32"
          fontWeight="800"
          fontFamily="Outfit, sans-serif"
          style={{ filter: `drop-shadow(0 0 10px ${glow})` }}
        >
          {animating ? '…' : `${score}`}
        </text>
        <text
          x="100" y="100"
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="11"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          letterSpacing="2"
        >
          THREAT SCORE
        </text>
      </svg>

      {/* Label */}
      <div style={{
        padding: '6px 18px',
        borderRadius: '20px',
        background: isSpam ? `rgba(${severity === 'High' ? '244,63,94' : severity === 'Medium' ? '245,158,11' : '16,185,129'},0.12)` : 'rgba(16,185,129,0.12)',
        border: `1px solid ${color}55`,
        color,
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>
    </div>
  );
};

export default ThreatGauge;
