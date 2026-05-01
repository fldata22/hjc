import { useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, PILLARS, StatusBar, TabBar } from './Shell';
import './app.css';

type Filter = 'all' | 'risk' | 'hold' | 'track';

export function PillarsScreen() {
  const [drawer, setDrawer] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const sorted = [...PILLARS].sort((a, b) => a.s - b.s);

  return (
    <ResponsiveShell active="pillars">
      <StatusBar/>
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
            13 pillars · weighted composite 64%
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
          <div className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>All<span className="n">13</span></div>
          <div className={'chip' + (filter === 'risk' ? ' on' : '')} onClick={() => setFilter('risk')}>At risk<span className="n">4</span></div>
          <div className={'chip' + (filter === 'hold' ? ' on' : '')} onClick={() => setFilter('hold')}>Holding<span className="n">4</span></div>
          <div className={'chip' + (filter === 'track' ? ' on' : '')} onClick={() => setFilter('track')}>On track<span className="n">5</span></div>
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

        <div className="pillars-grid">
          {sorted.map((p, i) => {
            const dir = p.s - p.n7;
            return (
              <div className="pillar-row" key={i}>
                <div className="L serif">{p.l}</div>
                <div>
                  <div className="nm">{p.n}</div>
                  <div className="bar">
                    <i className={p.s < 50 ? 'acc' : ''} style={{ width: p.s + '%' }}/>
                  </div>
                  <div className="pillar-meta" style={{ marginTop: 8 }}>
                    <span>{p.src}</span>
                    <span className="d">·</span>
                    <span className={dir >= 0 ? 'delta-up' : 'delta-down'}>
                      {dir >= 0 ? '▲' : '▼'} {Math.abs(dir)} pts wk
                    </span>
                  </div>
                </div>
                <div className={'pct' + (p.s < 50 ? ' acc' : '')}>
                  {p.s}<small>%</small>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bot-pad"/>
      </div>
      <TabBar active="pillars"/>
      {drawer && <Drawer active="pillars" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
