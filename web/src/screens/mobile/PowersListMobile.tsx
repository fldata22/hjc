// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, TopBar } from '../../components/MobileShell';
import { usePowers, useWeeklyLatest } from '../../api/hooks';

export function PowersListMobile() {
  const { data: powers, isLoading: powersLoading } = usePowers();
  const { data: latest, isLoading: latestLoading } = useWeeklyLatest();

  if (powersLoading || latestLoading) {
    return (
      <Phone active="powers" top={<TopBar eyebrow="14 powers" title="PAVEDDD" />}>
        <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading…</div>
      </Phone>
    );
  }

  const readingsMap = new Map<number, number | null>();
  if (latest?.readings) {
    for (const r of latest.readings) {
      readingsMap.set(r.power_id, r.value_pct);
    }
  }

  const sorted = [...(powers ?? [])].sort((a, b) => a.order_index - b.order_index);

  const colorFor = (pct: number | null | undefined) => {
    if (pct == null) return '#B4B2A9';
    if (pct >= 60) return '#639922';
    if (pct >= 30) return '#EF9F27';
    return '#E24B4A';
  };

  return (
    <Phone active="powers" top={<TopBar eyebrow="14 powers" title="PAVEDDD" />}>
      <div className="mw-rowlist">
        {sorted.map((power) => {
          const pct = readingsMap.has(power.id) ? readingsMap.get(power.id) : null;
          const color = colorFor(pct);
          return (
            <Link
              key={power.id}
              to={`/m/powers/${power.code}`}
              className="row"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ width: 6, height: 36, borderRadius: 3, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="title">{power.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 500, color, letterSpacing: '-0.01em' }}>
                  {pct != null ? `${pct}%` : '—'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Phone>
  );
}
