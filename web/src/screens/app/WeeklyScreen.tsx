import { useState } from 'react';
import { AppBar, Drawer, PhoneFrame, PILLARS, StatusBar } from './Shell';
import './app.css';

export function WeeklyScreen() {
  const [drawer, setDrawer] = useState(false);
  const [ratings, setRatings] = useState<number[]>(() => PILLARS.map((p) => Math.round(p.s / 10)));
  const [touched, setTouched] = useState<Set<number>>(() => new Set([0, 1, 2, 3, 4, 5]));
  const lastWeek = PILLARS.map((p) => Math.round(p.n7 / 10));
  const total = PILLARS.length;
  const completed = Math.min(touched.size, total);

  const setRating = (i: number, n: number) => {
    setRatings((prev) => {
      const next = [...prev];
      next[i] = n;
      return next;
    });
    setTouched((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  };

  return (
    <PhoneFrame>
      <StatusBar/>
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="weekly-head">
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}/>
            Due Friday 02 May · 2 days
          </div>
          <h1 className="week serif">Week 8 <em>readiness</em></h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
            Rate each pillar 0–10. Last week's rating is shown for reference.
          </p>
          <div className="progress">
            <span><b>{completed}</b> of {total} rated</span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="ptrack"><i style={{ width: (completed / total * 100) + '%' }}/></div>
        </div>

        {PILLARS.slice(0, 6).map((p, i) => {
          const r = ratings[i];
          const lw = lastWeek[i];
          const dir = r - lw;
          return (
            <div className="rate-card" key={i}>
              <div className="top">
                <span className="L serif">{p.l}</span>
                <span className="nm">{p.n}</span>
                <span className="last">Last wk <b>{lw}/10</b></span>
              </div>
              <div className="scale">
                {Array.from({ length: 11 }, (_, n) => (
                  <span key={n} className={n === r ? 'on' : ''} onClick={() => setRating(i, n)}>{n}</span>
                ))}
              </div>
              <div className="delta">
                <span>Selected: <b>{r}/10</b></span>
                <span className={dir >= 0 ? 'up' : 'down'}>
                  {dir > 0 ? '▲ +' : dir < 0 ? '▼ ' : '— '}{dir !== 0 && Math.abs(dir)} {dir === 0 && 'no change'}
                </span>
              </div>
            </div>
          );
        })}

        <div style={{ padding: '22px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            + 7 more pillars
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Pastors · Pastoral Status · Awareness · Venue · E-House · Past Crusades · Social
          </div>
        </div>

        <div style={{ padding: '22px 20px 8px' }}>
          <h2
            className="serif"
            style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.025em', marginBottom: 4 }}
          >
            Narrative <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>notes</em>
          </h2>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em', marginBottom: 8 }}>
            Three short reflections — central office reads these.
          </p>
        </div>
        <div className="fields" style={{ paddingTop: 0 }}>
          <div className="field">
            <div className="lbl"><span>Biggest win this week</span></div>
            <textarea
              className="input area"
              placeholder="What moved? Who said yes?"
              defaultValue="Mayor's office signed off on the Wa Stadium permit. Religious affairs followed within 24h."
            />
          </div>
          <div className="field">
            <div className="lbl"><span>Biggest blocker</span></div>
            <textarea className="input area" placeholder="What's stuck or slipping?" defaultValue=""/>
          </div>
          <div className="field">
            <div className="lbl"><span>Ask of central office</span></div>
            <textarea className="input area" placeholder="What do you need from us?" defaultValue=""/>
          </div>
        </div>
        <div className="bot-pad"/>
      </div>

      <div className="action-bar">
        <div className="save-status">Auto-saved 12s ago</div>
        <button type="button" className="btn">Save</button>
        <button type="button" className="btn primary">Submit W8 →</button>
      </div>

      {drawer && <Drawer active="weekly" onClose={() => setDrawer(false)}/>}
    </PhoneFrame>
  );
}
