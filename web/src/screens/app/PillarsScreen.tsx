import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import { useMissionControl, useWeeklyLatest } from '../../api/hooks';
import './app.css';

type Filter = 'all' | 'risk' | 'hold' | 'track';

export function PillarsScreen() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const { data: mc, isLoading, isError, refetch } = useMissionControl();
  const { data: weekly } = useWeeklyLatest();

  const allPowers = useMemo(() => mc?.powers ?? [], [mc]);

  const composite = useMemo(() => {
    const valid = allPowers.filter((p) => p.value_pct != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, p) => s + (p.value_pct ?? 0), 0) / valid.length);
  }, [allPowers]);

  const riskCount = useMemo(() => allPowers.filter((p) => (p.value_pct ?? 0) < 50).length, [allPowers]);
  const holdCount = useMemo(() => allPowers.filter((p) => {
    const v = p.value_pct ?? 0;
    return v >= 50 && v < 75;
  }).length, [allPowers]);
  const trackCount = useMemo(() => allPowers.filter((p) => (p.value_pct ?? 0) >= 75).length, [allPowers]);

  const filtered = useMemo(() => {
    return allPowers
      .filter((p) => {
        const v = p.value_pct ?? 0;
        if (filter === 'risk') return v < 50;
        if (filter === 'hold') return v >= 50 && v < 75;
        if (filter === 'track') return v >= 75;
        return true;
      })
      .sort((a, b) => (a.value_pct ?? 0) - (b.value_pct ?? 0));
  }, [allPowers, filter]);

  return (
    <ResponsiveShell active="pillars">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="pillars-hero" style={{ padding: '20px 20px 0' }}>
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
            13 pillars · weighted composite {composite ?? '—'}%
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            Readiness<br/>by <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>pillar.</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>
            Tap any pillar to see its source forms, week-over-week trend, and gaps.
          </p>
        </div>

        <div className="chips pillars-chips">
          <div className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>All<span className="n">{allPowers.length}</span></div>
          <div className={'chip' + (filter === 'risk' ? ' on' : '')} onClick={() => setFilter('risk')}>At risk<span className="n">{riskCount}</span></div>
          <div className={'chip' + (filter === 'hold' ? ' on' : '')} onClick={() => setFilter('hold')}>Holding<span className="n">{holdCount}</span></div>
          <div className={'chip' + (filter === 'track' ? ' on' : '')} onClick={() => setFilter('track')}>On track<span className="n">{trackCount}</span></div>
        </div>

        <div
          style={{
            padding: '18px 20px 6px',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Sorted: lowest first</span>
          <span style={{ color: 'var(--ink)' }}>↕</span>
        </div>

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
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>Couldn't load pillars.</div>
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
            Loading pillars…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
            No pillar data yet.
          </div>
        ) : (
          <div className="pillars-grid">
            {filtered.map((p) => {
              const reading = weekly?.readings?.find((r) => r.power.code === p.code);
              const dir = (p.value_pct != null && reading != null) ? p.value_pct - reading.value_pct : null;
              const v = p.value_pct ?? 0;
              return (
                <button
                  type="button"
                  className="pillar-row"
                  key={p.code}
                  onClick={() => navigate(`/pillars/${p.code}`)}
                  style={{ background: 'transparent', border: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%', padding: 0 }}
                >
                  <div className="L serif">{p.code[0]}</div>
                  <div>
                    <div className="nm">{p.name}</div>
                    <div className="bar">
                      <i className={v < 50 ? 'acc' : ''} style={{ width: v + '%' }}/>
                    </div>
                    {dir !== null && (
                      <div className="pillar-meta" style={{ marginTop: 8 }}>
                        <span className={dir >= 0 ? 'delta-up' : 'delta-down'}>
                          {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts wk
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={'pct' + (v < 50 ? ' acc' : '')}>
                    {p.value_pct != null ? <>{p.value_pct}<small>%</small></> : <>—</>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="bot-pad"/>
      </div>
      <TabBar active="pillars"/>
      {drawer && <Drawer active="pillars" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
