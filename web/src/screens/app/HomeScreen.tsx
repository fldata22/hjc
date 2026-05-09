import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import {
  useMissionControl,
  useActivityEntries,
  useCrusade,
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
} from '../../api/hooks';
import { useAuth } from '../../auth/useAuth';
import { useToast } from './toast-context';
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
  const { data: crusade } = useCrusade();
  const { data: reminders, isLoading: remLoading } = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const { showToast } = useToast();
  const [reminderText, setReminderText] = useState('');
  const [reminderDue, setReminderDue] = useState('');

  const addReminder = async () => {
    if (!crusade || reminderText.trim() === '' || createReminder.isPending) return;
    try {
      await createReminder.mutateAsync({
        crusade_id: crusade.id,
        text: reminderText.trim(),
        due_on: reminderDue || null,
      });
      setReminderText('');
      setReminderDue('');
    } catch {
      showToast('Couldn’t add reminder', 'error');
    }
  };

  const completeReminder = (id: number) => {
    updateReminder.mutate({ id, body: { completed_at: new Date().toISOString() } });
  };

  const removeReminder = (id: number) => {
    if (!confirm('Delete this reminder?')) return;
    deleteReminder.mutate(id);
  };

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

        <section className="home-card" style={{ margin: '0 20px 24px' }}>
          <div className="sec">
            <h2 className="serif">Personal <em>reminders</em></h2>
            <span className="more">{reminders?.length ?? 0} open</span>
          </div>
          {remLoading ? (
            <div style={{ padding: '14px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Loading…</div>
          ) : (reminders?.length ?? 0) === 0 ? (
            <div style={{ padding: '10px 0 14px', fontSize: 13, color: 'var(--ink-3)' }}>Nothing on your list — add one below.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
              {reminders!.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <button
                    type="button"
                    onClick={() => completeReminder(r.id)}
                    aria-label="Mark done"
                    style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--ink-3)', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.4 }}>{r.text}</div>
                    {r.due_on && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Due {new Date(r.due_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReminder(r.id)}
                    aria-label="Delete reminder"
                    style={{ background: 'transparent', border: 0, padding: 4, fontSize: 14, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <input
              type="text"
              placeholder="New reminder…"
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addReminder()}
              style={{ flex: 1, fontSize: 13, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 4, background: 'var(--bg-1)', fontFamily: 'inherit', color: 'var(--ink-1)' }}
            />
            <input
              type="date"
              value={reminderDue}
              onChange={(e) => setReminderDue(e.target.value)}
              style={{ fontSize: 12, padding: '8px 8px', border: '1px solid var(--line)', borderRadius: 4, background: 'var(--bg-1)', fontFamily: 'inherit', color: 'var(--ink-1)' }}
            />
            <button
              type="button"
              onClick={addReminder}
              disabled={createReminder.isPending || reminderText.trim() === ''}
              style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, borderRadius: 4, border: '1px solid var(--ink-1)', background: 'var(--ink-1)', color: 'var(--bg-1)', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </section>

        <div className="bot-pad"/>
      </div>

      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
