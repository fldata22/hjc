import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar, useDrawer } from './Shell';
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
import { useToast } from '../../lib/toast-context';
import { relativeAgo } from '../../lib/dateHelpers';
import './app.css';

function dayLabel(crusade: { opens_at: string; closes_at: string } | undefined): string {
  if (!crusade) return '…';
  const today = new Date();
  const opens = new Date(crusade.opens_at);
  const closes = new Date(crusade.closes_at);
  const totalDays = Math.max(1, Math.round((closes.getTime() - opens.getTime()) / 86_400_000));
  const daysIn = Math.max(0, Math.round((today.getTime() - opens.getTime()) / 86_400_000));
  return `Day ${daysIn} / ${totalDays}`;
}

function statusClass(pct: number): 'risk' | 'hold' | 'ok' {
  if (pct < 50) return 'risk';
  if (pct < 75) return 'hold';
  return 'ok';
}

export function HomeScreen() {
  const drawer = useDrawer();
  const { user } = useAuth();
  const { data: mc, isLoading: mcLoading, isError: mcError, refetch: refetchMc } = useMissionControl();
  const { data: activity, isLoading: actLoading, isError: actError, refetch: refetchAct } = useActivityEntries({ per_page: 4 });
  const { data: crusade } = useCrusade();
  const { data: reminders, isLoading: remLoading } = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const toast = useToast();
  const [reminderText, setReminderText] = useState('');
  const [reminderDue, setReminderDue] = useState('');

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
      toast.show("Couldn't add reminder", 'error');
    }
  };

  const initials = (user?.name ?? 'D').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ResponsiveShell active="home">
      <AppBar
        title={crusade?.city ?? 'HJC'}
        sub={dayLabel(crusade)}
        onMenu={drawer.show}
        initials={initials}
      />

      <div className="scroll">

        {/* Readiness stat */}
        <div className="readiness-stat">
          <div className="stat-row">
            {mcLoading ? (
              <span className="stat-num" style={{ color: 'var(--line-2)' }}>—</span>
            ) : mcError ? (
              <span className="stat-num" style={{ color: 'var(--risk)' }}>—</span>
            ) : (
              <span className="stat-num">{composite ?? '—'}</span>
            )}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-sub">
            Composite readiness · <b>{onTrackCount} / {mc?.powers.length ?? '—'}</b> on track
          </div>
          <div className="progress-track">
            <div
              className={'progress-fill' + (composite !== null ? ' ' + statusClass(composite) : '')}
              style={{ width: `${composite ?? 0}%` }}
            />
          </div>
        </div>

        {/* At risk */}
        <div className="sec-label">
          Pillars at risk
          <span className="sec-count">{atRisk.length} below 50%</span>
        </div>

        {mcError ? (
          <div className="error-banner">
            <span>Couldn't load pillars.</span>
            <button type="button" onClick={() => refetchMc()}>Retry</button>
          </div>
        ) : mcLoading ? (
          <div className="empty-state">Loading…</div>
        ) : atRisk.length === 0 ? (
          <div className="empty-state">No pillars below 50%</div>
        ) : (
          atRisk.map((p) => {
            const v = p.value_pct ?? 0;
            const cls = statusClass(v);
            return (
              <div className="list-row" key={p.code}>
                <div className={`pillar-badge ${cls}`}>{p.code[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row-label">{p.name}</div>
                  <div className="mini-bar">
                    <div className={`mini-bar-fill ${cls}`} style={{ width: `${v}%` }}/>
                  </div>
                </div>
                <div className={`row-val ${cls}`}>{v}<small>%</small></div>
              </div>
            );
          })
        )}

        <div className="divider full"/>

        {/* Recent activity */}
        <div className="sec-label">
          Recent activity
        </div>

        {actError ? (
          <div className="error-banner">
            <span>Couldn't load activity.</span>
            <button type="button" onClick={() => refetchAct()}>Retry</button>
          </div>
        ) : actLoading ? (
          <div className="empty-state">Loading…</div>
        ) : (activity?.data.length ?? 0) === 0 ? (
          <div className="empty-state">No activity yet.</div>
        ) : (
          activity!.data.slice(0, 4).map((e) => (
            <div className="act-row" key={e.id}>
              <div className="act-when">{relativeAgo(e.occurred_at)}</div>
              <div className="act-what">
                {e.description}
                <div><span className="act-tag">{e.power.code} · {e.power.name}</span></div>
              </div>
            </div>
          ))
        )}

        <div className="divider full"/>

        {/* Reminders */}
        <div className="sec-label">
          Reminders
          <span className="sec-count">{reminders?.length ?? 0} open</span>
        </div>

        {remLoading ? (
          <div className="empty-state">Loading…</div>
        ) : (reminders?.length ?? 0) === 0 ? (
          <div className="empty-state" style={{ padding: '12px 20px 0' }}>Nothing on your list.</div>
        ) : (
          reminders!.map((r) => (
            <div className="rem-row" key={r.id}>
              <button
                type="button"
                className="rem-check"
                onClick={() => updateReminder.mutate({ id: r.id, body: { completed_at: new Date().toISOString() } })}
                aria-label="Mark done"
              />
              <div className="rem-text">
                {r.text}
                {r.due_on && (
                  <div className="rem-due">
                    Due {new Date(r.due_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="rem-del"
                onClick={() => { if (confirm('Delete this reminder?')) deleteReminder.mutate(r.id); }}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))
        )}

        <div className="rem-input-row">
          <input
            type="text"
            className="rem-input"
            placeholder="New reminder…"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReminder()}
          />
          <input
            type="date"
            className="rem-date"
            value={reminderDue}
            onChange={(e) => setReminderDue(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={addReminder}
            disabled={createReminder.isPending || reminderText.trim() === ''}
          >
            Add
          </button>
        </div>

        <div className="bot-pad"/>
      </div>

      <TabBar active="home"/>
      {drawer.open && <Drawer active="home" onClose={drawer.hide}/>}
    </ResponsiveShell>
  );
}
