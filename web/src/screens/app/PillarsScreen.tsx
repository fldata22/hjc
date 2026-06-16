import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar, useDrawer } from './Shell';
import { useMissionControl, useWeeklyLatest } from '../../api/hooks';
import './app.css';

type Filter = 'all' | 'risk' | 'hold' | 'track';

function statusClass(pct: number): 'risk' | 'hold' | 'ok' {
  if (pct < 50) return 'risk';
  if (pct < 75) return 'hold';
  return 'ok';
}

export function PillarsScreen() {
  const navigate = useNavigate();
  const drawer = useDrawer();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: mc, isLoading, isError, refetch } = useMissionControl();
  const { data: weekly } = useWeeklyLatest();

  const allPowers = useMemo(() => mc?.powers ?? [], [mc]);

  const composite = useMemo(() => {
    const valid = allPowers.filter((p) => p.value_pct != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
  }, [allPowers]);

  const riskCount  = useMemo(() => allPowers.filter((p) => (p.value_pct ?? 0) < 50).length, [allPowers]);
  const holdCount  = useMemo(() => allPowers.filter((p) => { const v = p.value_pct ?? 0; return v >= 50 && v < 75; }).length, [allPowers]);
  const trackCount = useMemo(() => allPowers.filter((p) => (p.value_pct ?? 0) >= 75).length, [allPowers]);

  const filtered = useMemo(() => {
    return [...allPowers]
      .filter((p) => {
        const v = p.value_pct ?? 0;
        if (filter === 'risk')  return v < 50;
        if (filter === 'hold')  return v >= 50 && v < 75;
        if (filter === 'track') return v >= 75;
        return true;
      })
      .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0));
  }, [allPowers, filter]);

  const FILTERS: Array<{ k: Filter; l: string; n: number }> = [
    { k: 'all',   l: 'All',      n: allPowers.length },
    { k: 'risk',  l: 'At risk',  n: riskCount },
    { k: 'hold',  l: 'Holding',  n: holdCount },
    { k: 'track', l: 'On track', n: trackCount },
  ];

  return (
    <ResponsiveShell active="pillars">
      <AppBar title="Pillars" sub={composite !== null ? `${composite}% avg` : undefined} onMenu={drawer.show}/>
      <div className="scroll">

        <div className="chip-row" style={{ paddingTop: 12 }}>
          {FILTERS.map(({ k, l, n }) => (
            <button
              key={k}
              type="button"
              className={'filter-chip' + (filter === k ? ' on' : '')}
              onClick={() => setFilter(k)}
            >
              {l} <span className="chip-n">{n}</span>
            </button>
          ))}
        </div>

        {isError ? (
          <div className="error-banner">
            <span>Couldn't load pillars.</span>
            <button type="button" onClick={() => refetch()}>Retry</button>
          </div>
        ) : isLoading ? (
          <div className="empty-state">Loading pillars…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No pillars in this filter.</div>
        ) : filtered.map((p) => {
          const reading = weekly?.readings?.find((r) => r.power.code === p.code);
          const dir = (p.value_pct != null && reading != null) ? p.value_pct - reading.value_pct : null;
          const v = p.value_pct ?? 0;
          const cls = statusClass(v);
          return (
            <button
              type="button"
              className="list-row"
              key={p.code}
              onClick={() => navigate(`/pillars/${p.code}`)}
              style={{ width: '100%', background: 'transparent', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
            >
              <div className={`pillar-badge ${cls}`}>{p.code[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-label">{p.name}</div>
                <div className="mini-bar">
                  <div className={`mini-bar-fill ${cls}`} style={{ width: `${v}%` }}/>
                </div>
                {dir !== null && (
                  <div className={dir >= 0 ? 'delta-up' : 'delta-down'} style={{ marginTop: 4 }}>
                    {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts week
                  </div>
                )}
              </div>
              <div className={`row-val ${cls}`}>{p.value_pct != null ? `${p.value_pct}%` : '—'}</div>
            </button>
          );
        })}

        <div className="bot-pad"/>
      </div>
      <TabBar active="pillars"/>
      {drawer.open && <Drawer active="pillars" onClose={drawer.hide}/>}
    </ResponsiveShell>
  );
}
