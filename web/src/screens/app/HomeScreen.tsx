import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import { useMissionControl, useActivityEntries } from '../../api/hooks';
import { useAuth } from '../../auth/useAuth';
import { relativeAgo } from '../../lib/dateHelpers';
import './app.css';

function dayCounterLabel(crusade: { opens_at: string; closes_at: string } | undefined): string {
  if (!crusade) return '…';
  const today = new Date();
  const opens = new Date(crusade.opens_at);
  const closes = new Date(crusade.closes_at);
  const totalDays = Math.max(1, Math.round((closes.getTime() - opens.getTime()) / 86_400_000));
  const daysIn = Math.max(0, Math.round((today.getTime() - opens.getTime()) / 86_400_000));
  const dow = today.toLocaleDateString('en-GB', { weekday: 'short' });
  const dom = today.getDate();
  const month = today.toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} · ${dom} ${month} · Day ${daysIn} / ${totalDays}`;
}

const ErrorBanner = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <div style={{
    padding: '14px 16px',
    margin: '12px 20px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent-soft)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  }}>
    <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load {what}.</div>
    <button
      type="button"
      onClick={onRetry}
      style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        border: '1px solid var(--accent)',
        background: 'transparent',
        color: 'var(--accent)',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

export function HomeScreen() {
  const [drawer, setDrawer] = useState(false);
  const { user } = useAuth();
  const { data: mc, isLoading: mcLoading, isError: mcError, refetch: refetchMc } = useMissionControl();
  const { data: activity, isLoading: actLoading, isError: actError, refetch: refetchAct } = useActivityEntries({ per_page: 4 });

  const composite = useMemo(() => {
    if (!mc) return null;
    const valid = mc.powers.filter((p) => p.value_pct != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
  }, [mc]);

  const onTrackCount = useMemo(() => {
    if (!mc) return 0;
    return mc.powers.filter((p) => (p.value_pct ?? 0) >= 75).length;
  }, [mc]);

  const atRisk = useMemo(() => {
    if (!mc) return [];
    return [...mc.powers]
      .filter((p) => (p.value_pct ?? 0) < 50)
      .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0))
      .slice(0, 4);
  }, [mc]);

  return (
    <ResponsiveShell active="home">
      <AppBar onMenu={() => setDrawer(true)}/>

      <div className="scroll">
        <div className="home-hero">
          <div className="home-hero-l">
            <div className="greet">
              <div className="eyebrow">{dayCounterLabel(mc?.crusade)}</div>
              <h1 className="serif">Good morning,<br/><em>{user?.name ?? 'Director'}.</em></h1>
              <p className="summary">
                Composite readiness {composite !== null ? <>at <b>{composite}%</b></> : <>loading…</>}.
                {' '}{onTrackCount} of {mc?.powers.length ?? 13} on track.
              </p>
            </div>

            <div className="composite">
              <div className="label">Composite readiness</div>
              <div className="row">
                {mcError ? (
                  <div className="num serif" style={{ fontSize: 32, color: 'var(--accent)' }}>—</div>
                ) : mcLoading ? (
                  <div className="num serif" style={{ background: 'var(--bg-2)', color: 'var(--bg-2)', borderRadius: 4 }}>00<small>%</small></div>
                ) : (
                  <div className="num serif">
                    {composite !== null ? <>{composite}<small>%</small></> : <>—</>}
                  </div>
                )}
                <div className="delta">
                  <b>{onTrackCount} / {mc?.powers.length ?? 13}</b>
                  on track<br/>
                  composite avg
                </div>
              </div>
              <div className="track"><i style={{ width: `${composite ?? 0}%` }}/></div>
            </div>
          </div>

          <div className="home-hero-r">
            <div className="pillar-strip">
              <div className="lab">
                <span>13 pillars · readiness</span>
                <span>P · A · V · E · D · D</span>
              </div>
              <div className="grid">
                {(mcLoading ? Array(13).fill(null) : (mc?.powers ?? [])).map((p, i) => (
                  <div
                    key={p?.code ?? i}
                    className={'chip' + (p && (p.value_pct ?? 0) < 50 ? ' acc' : '')}
                    style={{ ['--f' as never]: p ? (p.value_pct ?? 0) / 100 : 0 } as React.CSSProperties}
                  >
                    <span>{p?.code[0] ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="home-grid">
          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Pillars <em>at risk</em></h2>
              <span className="more">{atRisk.length} below 50%</span>
            </div>
            {mcError ? (
              <ErrorBanner what="pillars" onRetry={refetchMc}/>
            ) : mcLoading ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
            ) : atRisk.length === 0 ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>No pillars below 50%.</div>
            ) : (
              <div className="at-risk">
                {atRisk.map((p) => (
                  <div className="at-risk-row" key={p.code}>
                    <span className="L serif">{p.code[0]}</span>
                    <span className="nm">{p.name}</span>
                    <span className="pct">{p.value_pct}<small>%</small></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="home-card">
            <div className="sec">
              <h2 className="serif">Recent <em>activity</em></h2>
              <span className="more">View all</span>
            </div>
            {actError ? (
              <ErrorBanner what="recent activity" onRetry={refetchAct}/>
            ) : actLoading ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
            ) : (activity?.data.length ?? 0) === 0 ? (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>No activity yet.</div>
            ) : (
              <div className="activity">
                {activity!.data.slice(0, 4).map((e) => (
                  <div className="activity-item" key={e.id}>
                    <div className="when">{relativeAgo(e.occurred_at)}</div>
                    <div className="what">
                      {e.description}
                      <div className="tag">{e.power.code} · {e.power.name.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="bot-pad"/>
      </div>

      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
