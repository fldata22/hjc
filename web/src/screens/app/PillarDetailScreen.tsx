import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import {
  usePower,
  useMissionControl,
  useActivityEntries,
  useWeeklyLatest,
} from '../../api/hooks';
import './app.css';
import { useState } from 'react';

const STATUS_LABEL: Record<'success' | 'warning' | 'danger' | 'muted', string> = {
  success: 'On track',
  warning: 'Holding',
  danger: 'At risk',
  muted: 'No data',
};

export function PillarDetailScreen() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [drawer, setDrawer] = useState(false);

  const { data: power, isLoading: powerLoading, isError: powerError } = usePower(code);
  const { data: mc } = useMissionControl();
  const { data: weekly } = useWeeklyLatest();
  const { data: activityResp } = useActivityEntries({ power: code, per_page: 25 });

  const mcPower = useMemo(
    () => mc?.powers.find((p) => p.code === code) ?? null,
    [mc, code],
  );

  const weeklyReading = useMemo(
    () => weekly?.readings?.find((r) => r.power.code === code) ?? null,
    [weekly, code],
  );

  const dir = (mcPower?.value_pct != null && weeklyReading != null)
    ? mcPower.value_pct - weeklyReading.value_pct
    : null;

  const activityList = activityResp?.data ?? [];

  const relevantRisks = useMemo(() => {
    return (mc?.top_risks ?? []).filter((r) => {
      if (!power) return false;
      const text = r.text.toLowerCase();
      return text.includes(power.name.toLowerCase()) || text.includes(power.code.toLowerCase());
    });
  }, [mc, power]);

  return (
    <ResponsiveShell active="pillars">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div style={{ padding: '16px 20px 0' }}>
          <button
            type="button"
            onClick={() => navigate('/pillars')}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              fontSize: 12,
              color: 'var(--ink-3)',
              fontFamily: 'inherit',
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            ← All pillars
          </button>
        </div>

        {powerError ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>
            Couldn't load this pillar.
          </div>
        ) : powerLoading || !power ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '0 20px 0' }}>
              <div
                className="eyebrow"
                style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, marginBottom: 10 }}
              >
                Pillar · {power.code}
              </div>
              <h1 className="serif" style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}>
                {power.name}.
              </h1>
              {power.description && (
                <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, margin: '12px 0 0', maxWidth: 560 }}>
                  {power.description}
                </p>
              )}
            </div>

            {/* Composite stat */}
            <div className="composite" style={{ marginTop: 24 }}>
              <div className="label">Current value</div>
              <div className="row">
                <div className="num serif">{mcPower?.value_pct != null ? `${mcPower.value_pct}%` : '—'}</div>
                <div className="delta">
                  {mcPower?.status && <b>{STATUS_LABEL[mcPower.status]}</b>}
                  {dir !== null && (
                    <>
                      {' · '}
                      <span className={dir >= 0 ? 'delta-up' : 'delta-down'}>
                        {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts wk
                      </span>
                    </>
                  )}
                </div>
              </div>
              {mcPower?.value_pct != null && (
                <div className="track">
                  <i style={{ width: `${mcPower.value_pct}%`, background: mcPower.value_pct < 50 ? 'var(--accent)' : 'var(--ink)' }}/>
                </div>
              )}
            </div>

            {/* Relevant risks */}
            {relevantRisks.length > 0 && (
              <>
                <div className="sec">
                  <h2 className="serif">Open <em>risks</em></h2>
                  <span className="more">{relevantRisks.length}</span>
                </div>
                <div style={{ padding: '0 20px' }}>
                  {relevantRisks.map((r, i) => (
                    <div key={i} className="form-list-row">
                      <div>
                        <div className="name" style={{ fontSize: 13 }}>{r.text}</div>
                        <div className="sub">Severity · {r.severity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Recent activity */}
            <div className="sec">
              <h2 className="serif">Recent <em>activity</em></h2>
              <span className="more">{activityList.length}</span>
            </div>
            <div style={{ padding: '0 20px' }}>
              {activityList.length === 0 ? (
                <div className="empty">No activity logged for this pillar yet.</div>
              ) : (
                activityList.slice(0, 12).map((e) => (
                  <div key={e.id} className="form-list-row">
                    <div>
                      <div className="name" style={{ fontSize: 13 }}>{e.description}</div>
                      <div className="sub">
                        {new Date(e.occurred_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="right">
                      <div className={'status ' + (e.status === 'done' ? 'confirmed' : 'pending')}>
                        {e.status === 'done' ? 'Done' : 'Running'}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {activityList.length > 0 && (
                <div style={{ padding: '12px 0', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/activity')}
                    style={{ background: 'transparent', border: 0, fontSize: 11, color: 'var(--accent)', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    See all activity →
                  </button>
                </div>
              )}
            </div>

            <div className="sec">
              <h2 className="serif">Log <em>activity</em></h2>
            </div>
            <div style={{ padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => navigate('/forms/activity-quick-log')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid var(--ink)',
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Quick-log → /forms/activity-quick-log
              </button>
            </div>
          </>
        )}

        <div className="bot-pad"/>
      </div>
      <TabBar active="pillars"/>
      {drawer && <Drawer active="pillars" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
