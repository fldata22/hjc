import { useMemo, useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, TabBar, useDrawer } from './Shell';
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
  { k: 'all',       l: 'All' },
  { k: 'pcm',       l: 'PCM' },
  { k: 'workers',   l: 'Workers' },
  { k: 'govt',      l: 'Govt' },
  { k: 'awareness', l: 'Awareness' },
];

function groupLabel(iso: string): string {
  const today = todayISO();
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yest) return 'Yesterday';
  const { dow, dnum } = formatDayLabel(iso);
  const month = new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
  return `${dow} ${dnum} ${month}`;
}

function entryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ActivityScreen() {
  const drawer = useDrawer();
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
      <AppBar title="Activity log" onMenu={drawer.show}/>
      <div className="scroll">

        <div className="chip-row" style={{ paddingTop: 12 }}>
          {CHIPS.map((c) => (
            <button
              key={c.k}
              type="button"
              className={'filter-chip' + (chip === c.k ? ' on' : '')}
              onClick={() => setChip(c.k)}
            >
              {c.l}
            </button>
          ))}
        </div>

        {isError ? (
          <div className="error-banner">
            <span>Couldn't load activity.</span>
            <button type="button" onClick={() => refetch()}>Retry</button>
          </div>
        ) : isLoading ? (
          <div className="empty-state">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="empty-state">No activity entries.</div>
        ) : (
          grouped.map(([day, entries]) => (
            <div key={day}>
              <div className="day-group-hd">{groupLabel(day)}</div>
              {entries.map((e) => (
                <div className="act-row" key={e.id}>
                  <div className="act-when">{entryTime(e.occurred_at)}</div>
                  <div className="act-what">
                    {e.description}
                    <div><span className="act-tag">{e.power.name}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        <div className="bot-pad"/>
      </div>
      <TabBar active="activity"/>
      {drawer.open && <Drawer active="activity" onClose={drawer.hide}/>}
    </ResponsiveShell>
  );
}
