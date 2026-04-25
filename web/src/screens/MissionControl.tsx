// @ts-nocheck
import React from 'react';
import { Shell } from '../components/Shell';
import { Icon } from '../components/Icon';
import { PaveDonut, powersToSegments } from '../components/PaveDonut';
import { useMissionControl } from '../api/hooks';
import { useAuth } from '../auth/useAuth';

export function MissionControl() {
  const { data, isLoading, isError, error } = useMissionControl();
  const { user, logout } = useAuth();

  if (isLoading) {
    return (
      <Shell user={user}>
        <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading mission control…</div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell user={user}>
        <div style={{ padding: 40 }}>
          <div style={{ color: 'var(--text-danger)', fontWeight: 500, marginBottom: 8 }}>Failed to load.</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(error as any)?.message ?? ''}</div>
          <button className="hf-btn" style={{ marginTop: 16 }} onClick={() => logout()}>Sign out</button>
        </div>
      </Shell>
    );
  }

  const { top_stats, powers, context, top_risks, crusade } = data;
  const days = top_stats.days_to_go;
  const financialPct = parseFloat(top_stats.financial.pct);
  const pastorsPct = parseFloat(top_stats.pastors_won.pct);
  const awarenessPct = parseFloat(top_stats.awareness_pct);
  const opensAt = new Date(crusade.opens_at).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  const fmtMoneyShort = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
  const spent = parseFloat(top_stats.financial.spent);
  const total = parseFloat(top_stats.financial.total);

  return (
    <Shell user={user}>
      <div className="hf-page-head">
        <div>
          <div className="hf-eyebrow">Crusade director</div>
          <h1 className="hf-page-title">Mission control</h1>
          <div className="hf-page-sub">{crusade.name} · {days} day{days === 1 ? '' : 's'} to go</div>
        </div>
        <div className="hf-row">
          <button className="hf-btn"><Icon name="download" size={14} /> Export</button>
          <button className="hf-btn primary"><Icon name="plus" size={14} /> Today's entry</button>
          <button className="hf-btn" onClick={() => logout()}>Sign out</button>
        </div>
      </div>

      <div className="hf-grid hf-g4" style={{ marginBottom: 14 }}>
        <div className={`hf-stat ${days <= 14 ? 'danger' : ''}`}>
          <div className="lbl">Days to go</div>
          <div className="val" style={{ fontSize: 34 }}>{days}</div>
          <div className="sub">Crusade opens {opensAt}</div>
        </div>
        <div className="hf-stat">
          <div className="lbl">Financial</div>
          <div className="val">{fmtMoneyShort(spent)} <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/ {fmtMoneyShort(total)}</span></div>
          <div className="hf-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, financialPct)}%`, background: 'var(--text-success)' }} />
          </div>
        </div>
        <div className="hf-stat">
          <div className="lbl">Pastors won</div>
          <div className="val">{top_stats.pastors_won.n.toLocaleString()} <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/ {top_stats.pastors_won.target.toLocaleString()}</span></div>
          <div className="hf-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, pastorsPct)}%`, background: 'var(--text-success)' }} />
          </div>
        </div>
        <div className={`hf-stat ${awarenessPct < 30 ? 'warning' : ''}`}>
          <div className="lbl">Awareness</div>
          <div className="val">{Math.round(awarenessPct)}<span style={{ fontSize: 18 }}>%</span></div>
          <div className="sub">Target was 60% by now</div>
        </div>
      </div>

      <div className="hf-grid" style={{ gridTemplateColumns: '1.05fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="hf-card">
          <div className="hf-eyebrow">PAVEDDD readiness · 14 powers</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
            <PaveDonut size={180} segments={powersToSegments(powers)} centerLabel={`${avgPct(powers)}%`} />
            <div className="hf-col" style={{ gap: 6, fontSize: 12, flex: 1 }}>
              {powers.slice(0, 8).map((p) => (
                <div key={p.code} className="hf-row hf-between">
                  <div className="hf-row" style={{ gap: 6 }}>
                    <span className="hf-dot" style={{ color: dotColor(p.status) }} />
                    <span>{p.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>{p.value_pct === null ? '—' : `${p.value_pct}%`}</span>
                </div>
              ))}
              <div className="hf-text-tertiary" style={{ fontSize: 11, marginTop: 4 }}>+ 6 more · view all →</div>
            </div>
          </div>
        </div>

        <div className="hf-card">
          <div className="hf-eyebrow">{crusade.city} · context</div>
          <div className="hf-grid hf-g2" style={{ gap: 8, marginBottom: 10 }}>
            <Stat lbl="Population" val={fmtCount(context.population)} />
            <Stat lbl="PAP" val={fmtCount(context.pap)} />
            <Stat lbl="Zones" val={String(context.zones_count)} />
            <Stat lbl="Conference" val={String(context.conference_registered)} />
          </div>
          <div className="hf-eyebrow">Operational counters</div>
          <div className="hf-grid hf-g3" style={{ gap: 8 }}>
            <CounterStat lbl="Convoy" actual={context.convoy_actual} target={context.convoy_target} />
            <CounterStat lbl="Makarios" actual={context.makarios_actual} target={context.makarios_target} />
            <CounterStat lbl="Permits" actual={context.permits_approved} target={context.permits_total} />
          </div>
        </div>
      </div>

      <div className="hf-eyebrow">Top risks</div>
      <div className="hf-rowlist">
        {top_risks.length === 0 && <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>No risks logged in the latest weekly assessment.</div>}
        {top_risks.map((r) => (
          <div key={r.ordering} className="row">
            <div>
              <div className="title">{r.text}</div>
            </div>
            <span className={`hf-badge ${badgeClassFor(r.severity)}`}>
              <span className="hf-dot" />
              {labelForSeverity(r.severity)}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Stat({ lbl, val }: { lbl: string; val: string }) {
  return (
    <div className="hf-stat" style={{ padding: '10px 12px' }}>
      <div className="lbl">{lbl}</div>
      <div className="val" style={{ fontSize: 18 }}>{val}</div>
    </div>
  );
}

function CounterStat({ lbl, actual, target }: { lbl: string; actual: number; target: number }) {
  return (
    <div className="hf-stat" style={{ padding: '10px 12px' }}>
      <div className="lbl">{lbl}</div>
      <div className="val" style={{ fontSize: 18 }}>
        {actual} <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 400 }}>/{target}</span>
      </div>
    </div>
  );
}

function fmtCount(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function dotColor(status: string): string {
  switch (status) {
    case 'success': return '#639922';
    case 'warning': return '#EF9F27';
    case 'danger': return '#E24B4A';
    default: return '#B4B2A9';
  }
}

function badgeClassFor(severity: string): string {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    default: return 'outline';
  }
}

function labelForSeverity(severity: string): string {
  switch (severity) {
    case 'critical': return 'Critical';
    case 'high': return 'High';
    default: return 'Medium';
  }
}

function avgPct(powers: Array<{ value_pct: number | null }>): number {
  const known = powers.filter((p) => p.value_pct !== null).map((p) => p.value_pct as number);
  if (known.length === 0) return 0;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}
