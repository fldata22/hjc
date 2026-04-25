// @ts-nocheck
import React from 'react';

interface DonutSegment {
  color: string;
  weight: number;
}

export function PaveDonut({
  size = 180,
  segments,
  centerLabel,
  centerSubLabel = 'overall',
}: {
  size?: number;
  segments?: DonutSegment[];
  centerLabel?: string;
  centerSubLabel?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
  const sw = size * 0.18;

  // Default segments if not provided (matches the hi-fi)
  const segs: DonutSegment[] = segments ?? [
    { color: '#EF9F27', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#639922', weight: 1 },
    { color: '#639922', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#EF9F27', weight: 1 },
    { color: '#E24B4A', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#EF9F27', weight: 1 },
    { color: '#E24B4A', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#639922', weight: 1 },
    { color: '#B4B2A9', weight: 1 }, { color: '#B4B2A9', weight: 1 },
  ];

  const total = segs.reduce((s, x) => s + x.weight, 0);
  const C = 2 * Math.PI * r;
  const segLen = C / total;
  const gap = 2;
  let off = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`} fill="none" strokeWidth={sw}>
        {segs.map(({ color }, i) => {
          const dash = `${segLen - gap} ${C - (segLen - gap)}`;
          const dashoffset = -off;
          off += segLen;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} stroke={color}
                    strokeDasharray={dash} strokeDashoffset={dashoffset} />
          );
        })}
      </g>
      {centerLabel && (
        <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.19} fontWeight={500} fill="currentColor">
          {centerLabel}
        </text>
      )}
      {centerSubLabel && (
        <text x={cx} y={cy + size * 0.13} textAnchor="middle" dominantBaseline="central"
              fontSize="11" fill="var(--text-secondary)">
          {centerSubLabel}
        </text>
      )}
    </svg>
  );
}

// Helper: convert mission-control powers array to donut segments
export function powersToSegments(powers: Array<{ value_pct: number | null; status: string }>): DonutSegment[] {
  const colorFor = (status: string) => {
    switch (status) {
      case 'success': return '#639922';
      case 'warning': return '#EF9F27';
      case 'danger': return '#E24B4A';
      case 'muted':
      default: return '#B4B2A9';
    }
  };
  return powers.map((p) => ({ color: colorFor(p.status), weight: 1 }));
}
