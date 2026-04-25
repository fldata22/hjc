// @ts-nocheck
import React from 'react';
import { useParams } from 'react-router-dom';
import { Phone, TopBar, MobileIcon } from '../../components/MobileShell';
import { usePowers, useAwarenessTrajectory } from '../../api/hooks';

export function PowerDetailMobile() {
  const { code } = useParams<{ code: string }>();
  const { data: powers } = usePowers();
  const power = powers?.find(p => p.code === code);

  if (code === 'awareness') {
    return <AwarenessDrilldown power={power} />;
  }

  // Generic placeholder for other powers (data sources not yet wired)
  return (
    <Phone active="powers" top={<TopBar back title={power?.name ?? code ?? 'Power'} eyebrow="Mission control / Powers" />}>
      <div style={{ padding: 24, color: 'var(--text-secondary)' }}>
        <p style={{ marginTop: 0 }}>Drilldown for <b>{power?.name ?? code}</b> coming soon.</p>
        <p style={{ fontSize: 13 }}>{power?.description}</p>
      </div>
    </Phone>
  );
}

function AwarenessDrilldown({ power }: { power: any }) {
  const { data: trajectory, isLoading } = useAwarenessTrajectory();

  if (isLoading) {
    return (
      <Phone active="powers" top={<TopBar back title={power?.name ?? 'Awareness'} eyebrow="Mission control / Powers" />}>
        <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading…</div>
      </Phone>
    );
  }

  const rows = trajectory ?? [];
  const latestPct = rows.length > 0 ? parseFloat(rows[rows.length - 1].pct) : 0;
  const status = latestPct >= 60 ? 'success' : latestPct >= 22 ? 'warning' : 'danger';
  const statusTextColor = `var(--text-${status})`;

  const pctCls = (v: number | null) =>
    v == null ? 'zero' : v >= 60 ? 'high' : v >= 22 ? 'mid' : 'low';

  const totalYes = rows.reduce((s, r) => s + r.attending_yes_total, 0);
  const totalSurveyed = rows.reduce((s, r) => s + r.surveyed_total, 0);

  return (
    <Phone
      active="powers"
      top={
        <TopBar
          back
          title={power?.name ?? 'Awareness'}
          eyebrow="Mission control / Powers"
          right={<button className="mw-iconbtn"><MobileIcon name="more" size={20} /></button>}
        />
      }
    >
      {/* Hero card: latest % + status badge */}
      <div className="mw-card" style={{ textAlign: 'center', marginBottom: 14, padding: '18px 14px' }}>
        <div style={{ fontSize: 42, fontWeight: 500, color: statusTextColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {Math.round(latestPct)}%
        </div>
        <div className="mw-row" style={{ justifyContent: 'center', gap: 6, marginTop: 8 }}>
          <span className={`mw-badge ${status}`}>
            <span className="mw-dot" /> {status === 'success' ? 'On track' : status === 'warning' ? 'Developing' : 'Critical'}
          </span>
          <span className="mw-badge outline">target ≥ 60%</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
          "Yes and attending" share across {rows.length} surveyed {rows.length === 1 ? 'survey' : 'surveys'}
        </div>
      </div>

      {/* Trajectory bar chart */}
      <div className="mw-card" style={{ marginBottom: 14 }}>
        <div className="mw-eyebrow">Trajectory · {rows.length} surveys</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(1, rows.length)}, 1fr)`,
            gap: 8,
            height: 110,
            alignItems: 'end',
          }}
        >
          {rows.map(row => {
            const v = parseFloat(row.pct);
            const color = v >= 60 ? 'var(--text-success)' : v >= 22 ? 'var(--text-warning)' : 'var(--text-danger)';
            return (
              <div key={row.survey_number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
                  <div style={{ fontSize: 10, textAlign: 'center', marginBottom: 3, color: 'var(--text-secondary)' }}>
                    {Math.round(v)}%
                  </div>
                  <div style={{ height: `${Math.max(4, v * 2.5)}%`, background: color, borderRadius: '3px 3px 0 0' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>S{row.survey_number}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-survey breakdown matrix */}
      <div className="mw-section-title"><span>Per-survey breakdown</span></div>
      <div className="mw-card" style={{ padding: '10px 8px', marginBottom: 14 }}>
        <div
          className="mw-matrix"
          style={{ gridTemplateColumns: `56px repeat(${Math.max(1, rows.length)}, 1fr)` }}
        >
          <div className="mw-mh left">Survey</div>
          {rows.map(r => (
            <div key={r.survey_number} className="mw-mh">S{r.survey_number}</div>
          ))}
          <div className="mw-row-label">Yes</div>
          {rows.map(r => (
            <div key={r.survey_number} className={`mw-mc ${pctCls(r.attending_yes_total)}`}>
              {r.attending_yes_total.toLocaleString()}
            </div>
          ))}
          <div className="mw-row-label">Total</div>
          {rows.map(r => (
            <div key={r.survey_number} className="mw-mc">
              {r.surveyed_total.toLocaleString()}
            </div>
          ))}
          <div className="mw-row-label">%</div>
          {rows.map(r => {
            const v = parseFloat(r.pct);
            return (
              <div key={r.survey_number} className={`mw-mc ${pctCls(v)}`}>
                {Math.round(v)}%
              </div>
            );
          })}
        </div>
      </div>

      {/* Aggregate counts */}
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 2px 14px' }}>
        {totalYes.toLocaleString()} attending yes / {totalSurveyed.toLocaleString()} surveyed across {rows.length} surveys
      </div>

      <button className="mw-btn primary full">
        <MobileIcon name="plus" size={16} /> Log new survey
      </button>
    </Phone>
  );
}
