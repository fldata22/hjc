import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Drawer, ResponsiveShell, TabBar } from './Shell';
import './app.css';

type FormRow = { n: string; p: string; meta: string; due: string; dueClass: 'ok' | 'warn' | 'urgent'; slug: string };

const PARTICIPATION: FormRow[] = [
  { n: 'PCM (Primary Committee Members)', p: 'P1', meta: '9 of 10 confirmed · 2h ago', due: 'OK', dueClass: 'ok', slug: 'pcm' },
  { n: 'Fathers of the Land',             p: 'P2', meta: 'Coming soon',                due: '—',  dueClass: 'ok', slug: 'fathers' },
  { n: 'BOT (Board of Trustees)',         p: 'P3', meta: 'Last edit 5d ago · Director', due: 'SUN · 4D', dueClass: 'warn', slug: 'bot' },
  { n: 'CPC (Central Planning)',          p: 'P4', meta: '42 zones mapped · today', due: 'OK', dueClass: 'ok', slug: 'cpc' },
  { n: 'Stakeholders (VIP funnel)',       p: 'P5', meta: 'Mayors, bishops, donors',  due: 'OK', dueClass: 'ok', slug: 'stakeholders' },
  { n: 'Worker Groups',                   p: 'P6', meta: 'Choir, ushers, security…', due: 'OK', dueClass: 'ok', slug: 'workers' },
  { n: 'Pledge Meetings',                 p: 'P7', meta: 'Schedule + record pledges', due: 'OK', dueClass: 'ok', slug: 'pledge-meetings' },
];

const AWARENESS: FormRow[] = [
  { n: 'Awareness Survey · Field',  p: 'A9',    meta: '500 posters printed · 4d ago', due: 'MON · 5D', dueClass: 'warn', slug: 'awareness-survey' },
  { n: 'Town Profile',              p: 'A·all', meta: 'Per-zone baseline',            due: 'OK',       dueClass: 'ok',   slug: 'town-profile' },
  { n: 'Publicity & Video Campaign', p: 'D13',  meta: 'Coming soon',                  due: '—',        dueClass: 'ok',   slug: 'publicity' },
];

const VENUE: FormRow[] = [
  { n: 'Venue Inspection (Regular)', p: 'V10', meta: 'Per-visit checklist', due: 'OK', dueClass: 'ok', slug: 'venue-inspection' },
  { n: 'Must-Do Checklist',          p: 'V10', meta: 'Pre-crusade items', due: 'OK', dueClass: 'ok', slug: 'must-do' },
];

const DAILY: FormRow[] = [
  { n: 'Weekly Assessment Rating', p: 'All',    meta: 'W8 awaiting submission',     due: 'FRI · 2D', dueClass: 'urgent', slug: 'weekly' },
  { n: 'Crusade Daily Expenses',   p: 'Budget', meta: '$43.8k of $84k · today',     due: 'DAILY',    dueClass: 'ok',     slug: 'daily-expenses' },
];

const FormGroup = ({ rows }: { rows: FormRow[] }) => {
  const navigate = useNavigate();
  const goto = (slug: string) => () => {
    if (slug === 'weekly') navigate('/weekly');
    else navigate(`/forms/${slug}`);
  };
  return (
    <div className="form-list forms-grid">
      {rows.map((r, i) => (
        <button
          type="button"
          className="form-row"
          key={i}
          onClick={goto(r.slug)}
          style={{ background: 'transparent', border: 0, padding: '16px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
        >
          <div>
            <div className="name">{r.n}</div>
            <div className="meta">
              <span className="pillar serif">{r.p}</span>
              <span className="d">·</span>
              <span>{r.meta}</span>
            </div>
          </div>
          <div className="right">
            <div className={'due ' + r.dueClass}>{r.due}</div>
            <div className="arr">›</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export function FormsScreen() {
  const [drawer, setDrawer] = useState(false);

  return (
    <ResponsiveShell active="forms">
      <AppBar onMenu={() => setDrawer(true)}/>
      <div className="scroll">
        <div className="forms-hero" style={{ padding: '20px 20px 0' }}>
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
            14 forms · 4 categories
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            All <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>intake</em><br/>forms.
          </h1>
        </div>

        <div className="cat-group">
          <div className="cat-head"><span>P · Participation</span><span>7 forms</span></div>
        </div>
        <FormGroup rows={PARTICIPATION}/>

        <div className="cat-group">
          <div className="cat-head"><span>A · Awareness</span><span>3 forms</span></div>
        </div>
        <FormGroup rows={AWARENESS}/>

        <div className="cat-group">
          <div className="cat-head"><span>V · Venue & Logistics</span><span>2 forms</span></div>
        </div>
        <FormGroup rows={VENUE}/>

        <div className="cat-group">
          <div className="cat-head"><span>D · Daily ops</span><span>2 forms</span></div>
        </div>
        <FormGroup rows={DAILY}/>

        <div className="bot-pad"/>
      </div>
      <TabBar active="forms"/>
      {drawer && <Drawer active="forms" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
