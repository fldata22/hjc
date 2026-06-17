import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar, useDrawer } from './Shell';
import {
  usePower,
  useMissionControl,
  useActivityEntries,
  useWeeklyLatest,
} from '../../api/hooks';
import './app.css';

const STATUS_LABEL: Record<'success' | 'warning' | 'danger' | 'muted', string> = {
  success: 'On track',
  warning: 'Holding',
  danger: 'At risk',
  muted: 'No data',
};

function statusClass(pct: number): 'risk' | 'hold' | 'ok' {
  if (pct < 50) return 'risk';
  if (pct < 75) return 'hold';
  return 'ok';
}

export function PillarDetailScreen() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const drawer = useDrawer();

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

  const pct = mcPower?.value_pct ?? 0;
  const cls = statusClass(pct);

  return (
    <ResponsiveShell active="pillars">
      <AppBar
        title={power?.name ?? '…'}
        sub={power ? `Pillar · ${power.code}` : ''}
        onMenu={drawer.show}
      />
      <div className="scroll">

        <div style={{ padding: '12px 20px 0' }}>
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
            }}
          >
            ← All pillars
          </button>
        </div>

        {powerError ? (
          <div className="error-banner" style={{ margin: '16px 20px' }}>
            <span>Couldn't load this pillar.</span>
          </div>
        ) : powerLoading || !power ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <>
            {power.description && (
              <div style={{ padding: '12px 20px 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                {power.description}
              </div>
            )}

            <div className="readiness-stat">
              <div className="stat-row">
                <span className={`stat-num${mcPower?.value_pct == null ? '' : ''}`} style={mcPower?.value_pct == null ? { color: 'var(--ink-3)' } : undefined}>
                  {mcPower?.value_pct != null ? mcPower.value_pct : '—'}
                </span>
                {mcPower?.value_pct != null && <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink-3)', alignSelf: 'flex-end', marginBottom: 8 }}>%</span>}
              </div>
              <div className="stat-sub">
                {mcPower?.status ? <b>{STATUS_LABEL[mcPower.status]}</b> : 'No data'}
                {dir !== null && (
                  <>
                    {' · '}
                    <span className={dir >= 0 ? 'delta-up' : 'delta-down'}>
                      {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts wk
                    </span>
                  </>
                )}
              </div>
              {mcPower?.value_pct != null && (
                <div className="progress-track">
                  <div className={`progress-fill ${cls}`} style={{ width: `${mcPower.value_pct}%` }}/>
                </div>
              )}
            </div>

            {relevantRisks.length > 0 && (
              <>
                <div className="sec-label">
                  Open risks
                  <span className="sec-count">{relevantRisks.length}</span>
                </div>
                {relevantRisks.map((r, i) => (
                  <div key={i} className="list-row">
                    <div style={{ flex: 1 }}>
                      <div className="row-label">{r.text}</div>
                      <div className="row-sub">Severity · {r.severity}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="sec-label">
              Recent activity
              <span className="sec-count">{activityList.length}</span>
            </div>

            {activityList.length === 0 ? (
              <div className="empty-state">No activity logged for this pillar yet.</div>
            ) : (
              activityList.slice(0, 12).map((e) => (
                <div key={e.id} className="list-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-label">{e.description}</div>
                    <div className="row-sub">
                      {new Date(e.occurred_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="row-right">
                    <span
                      className="flr-status"
                      style={e.status === 'done' ? { background: 'var(--accent-bg)', borderColor: 'transparent', color: 'var(--accent-text)' } : undefined}
                    >
                      {e.status === 'done' ? 'Done' : 'Running'}
                    </span>
                  </div>
                </div>
              ))
            )}

            {activityList.length > 0 && (
              <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/activity')}
                  style={{ background: 'transparent', border: 0, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  See all activity →
                </button>
              </div>
            )}

            <div className="sec-label">Log activity</div>
            <div style={{ padding: '12px 20px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => navigate('/forms/activity-quick-log')}
              >
                Quick-log activity →
              </button>
            </div>
          </>
        )}

        <div className="bot-pad"/>
      </div>
      <TabBar active="pillars"/>
      {drawer.open && <Drawer active="pillars" onClose={drawer.hide}/>}
    </ResponsiveShell>
  );
}
