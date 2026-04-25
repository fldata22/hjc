// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, TopBar, MobileIcon as Icon } from '../../components/MobileShell';
import { PaveDonut, powersToSegments } from '../../components/PaveDonut';
import { useMissionControl } from '../../api/hooks';

export function MissionControlMobile() {
  const { data, isLoading, isError } = useMissionControl();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Phone active="home" top={<TopBar eyebrow="Crusade director" title="Mission control" />}>
        <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading…</div>
      </Phone>
    );
  }

  if (isError || !data) {
    return (
      <Phone active="home" top={<TopBar eyebrow="Crusade director" title="Mission control" />}>
        <div style={{ padding: 24, color: 'var(--text-danger)' }}>Failed to load. Please retry.</div>
      </Phone>
    );
  }

  const { top_stats, powers, context, top_risks, crusade } = data;

  // Average power value for donut center label
  const powersWithValues = powers.filter((p) => p.value_pct !== null);
  const avg =
    powersWithValues.length > 0
      ? Math.round(powersWithValues.reduce((s, p) => s + p.value_pct, 0) / powersWithValues.length)
      : 0;

  const criticalCount = top_risks.filter((r) => r.severity === 'critical' || r.severity === 'high').length;

  // Financial bar width
  const financialPct = parseFloat(top_stats.financial.pct) || 0;
  const pastorsPct = parseFloat(top_stats.pastors_won.pct) || 0;

  // First 4 powers for the mini sidebar list in PAVEDDD section
  const topPowers = powers.slice(0, 4);

  return (
    <Phone active="home" top={<TopBar eyebrow={crusade.name} title="Mission control" />}>
      {/* Days-to-crusade hero stat */}
      <div
        className="mw-stat danger"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}
      >
        <div>
          <div className="lbl">Days to crusade</div>
          <div className="val" style={{ fontSize: 32 }}>{top_stats.days_to_go}</div>
          <div className="sub">{formatOpensAt(crusade.opens_at)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {criticalCount > 0 && (
            <div className="mw-badge danger" style={{ marginBottom: 8 }}>
              <span className="mw-dot" />{criticalCount} risks
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-danger)' }}>{crusade.city}</div>
        </div>
      </div>

      {/* PAVEDDD donut + top powers list */}
      <div className="mw-card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <PaveDonut size={120} segments={powersToSegments(powers)} centerLabel={String(avg)} centerSubLabel="overall" />
        <div className="mw-col" style={{ gap: 8, flex: 1, fontSize: 12 }}>
          {topPowers.map((p, i) => (
            <div key={p.code ?? i} className="mw-row mw-between">
              <div className="mw-row" style={{ gap: 6 }}>
                <span className="mw-dot" style={{ color: colorForStatus(p.status) }} />
                <span>{p.name}</span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>
                {p.value_pct !== null ? `${p.value_pct}%` : '—'}
              </span>
            </div>
          ))}
          {powers.length > 4 && (
            <div
              style={{ fontSize: 11, color: 'var(--text-info)', marginTop: 2, cursor: 'pointer' }}
              onClick={() => navigate('/m/powers')}
            >
              +{powers.length - 4} more powers →
            </div>
          )}
        </div>
      </div>

      {/* Financial + Pastors + context stats grid */}
      <div className="mw-grid mw-g2" style={{ marginBottom: 6 }}>
        <div className="mw-stat">
          <div className="lbl">Financial</div>
          <div className="val" style={{ fontSize: 18 }}>{top_stats.financial.spent}</div>
          <div className="mw-bar" style={{ marginTop: 6 }}>
            <div style={{ width: `${Math.min(financialPct, 100)}%`, background: 'var(--text-success)' }} />
          </div>
          <div className="sub">of {top_stats.financial.total} target</div>
        </div>
        <div className="mw-stat">
          <div className="lbl">Pastors won</div>
          <div className="val" style={{ fontSize: 18 }}>{top_stats.pastors_won.n.toLocaleString()}</div>
          <div className="mw-bar" style={{ marginTop: 6 }}>
            <div style={{ width: `${Math.min(pastorsPct, 100)}%`, background: 'var(--text-success)' }} />
          </div>
          <div className="sub">of {top_stats.pastors_won.target.toLocaleString()} identified</div>
        </div>
        {context.convoy_target > 0 && (
          <div className={`mw-stat ${context.convoy_actual < context.convoy_target ? 'warning' : ''}`}>
            <div className="lbl">Convoy</div>
            <div className="val" style={{ fontSize: 18 }}>
              {context.convoy_actual} / {context.convoy_target}
            </div>
          </div>
        )}
        {context.conference_capacity > 0 && (
          <div className={`mw-stat ${context.conference_registered < context.conference_capacity ? 'warning' : ''}`}>
            <div className="lbl">Conference</div>
            <div className="val" style={{ fontSize: 18 }}>
              {context.conference_registered} / {context.conference_capacity}
            </div>
          </div>
        )}
      </div>

      {/* Top risks */}
      {top_risks.length > 0 && (
        <>
          <div className="mw-section-title">
            <span>Top risks</span>
            <a onClick={() => navigate('/m/more')}>See all {top_risks.length}</a>
          </div>
          <div className="mw-rowlist">
            {top_risks.map((risk, i) => (
              <div key={i} className="row">
                <div style={{ flex: 1 }}>
                  <div className="title">{risk.text}</div>
                </div>
                <span className={`mw-badge ${severityClass(risk.severity)}`}>
                  <span className="mw-dot" />{capitalise(risk.severity)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Awareness quick stat */}
      {top_stats.awareness_pct && (
        <>
          <div className="mw-section-title"><span>Awareness</span></div>
          <div className="mw-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="lbl">Community awareness</div>
              <div className="val" style={{ fontSize: 24 }}>{top_stats.awareness_pct}%</div>
            </div>
            <Icon name="spark" size={28} />
          </div>
        </>
      )}
    </Phone>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function colorForStatus(status: string): string {
  switch (status) {
    case 'success': return '#639922';
    case 'warning': return '#EF9F27';
    case 'danger': return '#E24B4A';
    default: return '#B4B2A9';
  }
}

function severityClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high': return 'danger';
    case 'medium': return 'warning';
    default: return '';
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatOpensAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) + ' · 6:30pm';
  } catch {
    return iso;
  }
}
