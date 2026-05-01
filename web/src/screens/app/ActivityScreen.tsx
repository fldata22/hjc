import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import { useActivityEntries, type ActivityEntry } from '../../api/hooks';
import { todayISO, formatDayLabel } from '../../lib/dateHelpers';
import './app.css';

const POWER_CHIP_MAP: Record<string, string | undefined> = {
  all: undefined,
  pcm: 'P1',
  workers: 'P6',
  govt: 'P5',
  awareness: 'A9',
};

const CHIPS: Array<{ k: string; l: string }> = [
  { k: 'all', l: 'All' },
  { k: 'pcm', l: 'PCM' },
  { k: 'workers', l: 'Workers' },
  { k: 'govt', l: 'Govt' },
  { k: 'awareness', l: 'Awareness' },
];

function dayLabel(iso: string): string {
  const today = todayISO();
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yest) return 'Yesterday';
  const { dow, dnum } = formatDayLabel(iso);
  const month = new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} · ${dnum} ${month}`;
}

function relativeDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Wed · 30 Apr'; // placeholder — never shown for today path
  const days = Math.round(
    (new Date(today + 'T00:00:00').getTime() - new Date(iso + 'T00:00:00').getTime()) / 86_400_000,
  );
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function entryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function ActivityScreen() {
  const [drawer, setDrawer] = useState(false);
  const [chip, setChip] = useState<string>('all');

  const { data: resp, isLoading, isError, refetch } = useActivityEntries({
    per_page: 50,
    power: POWER_CHIP_MAP[chip],
  });

  const grouped = useMemo(() => {
    const out = new Map<string, ActivityEntry[]>();
    for (const e of resp?.data ?? []) {
      const day = e.occurred_at.slice(0, 10);
      if (!out.has(day)) out.set(day, []);
      out.get(day)!.push(e);
    }
    return Array.from(out.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [resp]);

  return (
    <ResponsiveShell active="activity">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="activity-hero" style={{ padding: '20px 20px 24px' }}>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            All submissions · 30-day window
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Activity<br/><em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>log.</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>
            Every form submission feeding Mission Control, in chronological order.
          </p>
        </div>

        <div className="chips activity-chips" style={{ paddingBottom: 12 }}>
          {CHIPS.map((c) => (
            <div
              key={c.k}
              className={'chip' + (chip === c.k ? ' on' : '')}
              onClick={() => setChip(c.k)}
            >
              {c.l}
            </div>
          ))}
        </div>

        <div className="activity-log">
          {isError ? (
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
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load activity log.</div>
              <button
                type="button"
                onClick={() => refetch()}
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
          ) : isLoading ? (
            <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              Loading activity…
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              No activity entries.
            </div>
          ) : (
            grouped.map(([day, entries]) => (
              <div key={day}>
                <div className="day-head">
                  <b>{dayLabel(day)}</b>
                  {day !== todayISO() && <span>{relativeDayLabel(day)}</span>}
                </div>
                {entries.map((e) => (
                  <div className="act-row" key={e.id}>
                    <div className="time">{entryTime(e.occurred_at)}</div>
                    <div className="body">
                      <div className="what">{e.description}</div>
                      <div className="meta"><span>{e.power.name}</span></div>
                      <div className="impact">{e.power.code} · {e.power.name.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="bot-pad"/>
      </div>
      <TabBar active="activity"/>
      {drawer && <Drawer active="activity" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
