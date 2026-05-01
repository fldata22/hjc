import { useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, StatusBar, TabBar } from './Shell';
import './app.css';

export function ActivityScreen() {
  const [drawer, setDrawer] = useState(false);
  const [chip, setChip] = useState('all');

  const chips: Array<{ k: string; l: string; n: number }> = [
    { k: 'all', l: 'All', n: 38 },
    { k: 'pcm', l: 'PCM', n: 9 },
    { k: 'workers', l: 'Workers', n: 7 },
    { k: 'govt', l: 'Govt', n: 5 },
    { k: 'awareness', l: 'Awareness', n: 6 },
    { k: 'weekly', l: 'Weekly', n: 8 },
  ];

  return (
    <ResponsiveShell active="activity">
      <StatusBar/>
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
          {chips.map((c) => (
            <div
              key={c.k}
              className={'chip' + (chip === c.k ? ' on' : '')}
              onClick={() => setChip(c.k)}
            >
              {c.l}<span className="n">{c.n}</span>
            </div>
          ))}
        </div>

        <div className="activity-log">
          <div className="day-head"><b>Today</b><span>Wed · 30 Apr</span></div>
          <div className="act-row">
            <div className="time">11:42</div>
            <div className="body">
              <div className="what">Bernard Anchebah verified <b>3 PCMs</b> — Fountain Gate, Living Word, Christ Apostolic.</div>
              <div className="meta"><span>PCM form</span><span className="d">·</span><span>Bernard A.</span></div>
              <div className="impact">P1 PCM · +4 PTS</div>
            </div>
          </div>
          <div className="act-row">
            <div className="time">09:14</div>
            <div className="body">
              <div className="what">Mayor's office visit logged as <b>won</b> — permit signed.</div>
              <div className="meta"><span>Govt form</span><span className="d">·</span><span>Field team</span></div>
              <div className="impact">P5 GOVT · +3 PTS</div>
            </div>
          </div>

          <div className="day-head"><b>Yesterday</b><span>Tue · 29 Apr</span></div>
          <div className="act-row">
            <div className="time">17:08</div>
            <div className="body">
              <div className="what"><b>Week 7 weekly assessment</b> submitted — composite landed at 60%.</div>
              <div className="meta"><span>Weekly</span><span className="d">·</span><span>CPC lead</span></div>
              <div className="impact">ALL · +2 AVG</div>
            </div>
          </div>
          <div className="act-row">
            <div className="time">14:30</div>
            <div className="body">
              <div className="what">Awareness Survey 6 — <b>500 posters printed</b>, batch 2 to print Friday.</div>
              <div className="meta"><span>Awareness</span><span className="d">·</span><span>Field team</span></div>
              <div className="impact">A9 AWARENESS · +5 PTS</div>
            </div>
          </div>

          <div className="day-head"><b>Mon · 28 Apr</b><span>2 days ago</span></div>
          <div className="act-row">
            <div className="time">16:15</div>
            <div className="body">
              <div className="what">4 fathers added to the <b>Fathers of the Land</b> roster.</div>
              <div className="meta"><span>Fathers form</span><span className="d">·</span><span>Director</span></div>
              <div className="impact">P2 FATHERS · +6 PTS</div>
            </div>
          </div>
          <div className="act-row">
            <div className="time">10:02</div>
            <div className="body">
              <div className="what">Venue inspection complete — <b>Wa Stadium permits secured</b>.</div>
              <div className="meta"><span>Venue form</span><span className="d">·</span><span>Director</span></div>
              <div className="impact">V10 VENUE · +12 PTS</div>
            </div>
          </div>

          <div className="day-head"><b>Sun · 27 Apr</b><span>3 days ago</span></div>
          <div className="act-row">
            <div className="time">19:44</div>
            <div className="body">
              <div className="what">Choir roster updated — <b>28 enrolled</b> across 8 zones.</div>
              <div className="meta"><span>Workers form</span><span className="d">·</span><span>Worker lead</span></div>
              <div className="impact">P6 WORKERS · +4 PTS</div>
            </div>
          </div>
          <div className="act-row">
            <div className="time">11:20</div>
            <div className="body">
              <div className="what">CPC formed officially — <b>31 members</b> across 42 zones.</div>
              <div className="meta"><span>CPC form</span><span className="d">·</span><span>CPC lead</span></div>
              <div className="impact">P4 CPC · +8 PTS</div>
            </div>
          </div>
        </div>
        <div className="bot-pad"/>
      </div>
      <TabBar active="activity"/>
      {drawer && <Drawer active="activity" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
