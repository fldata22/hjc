import { useState } from 'react';
import { AppBar, Drawer, ResponsiveShell, StatusBar, TabBar } from './Shell';
import './app.css';

type FormRow = { n: string; p: string; meta: string; due: string; dueClass: 'ok' | 'warn' | 'urgent' };

const PARTICIPATION: FormRow[] = [
  { n: 'PCM (Primary Committee Members)', p: 'P1', meta: '9 of 10 confirmed · 2h ago', due: 'OK', dueClass: 'ok' },
  { n: 'Fathers of the Land',             p: 'P2', meta: '3 of 4 verified · yesterday', due: 'DRAFT', dueClass: 'warn' },
  { n: 'BOT (Board of Trustees)',         p: 'P3', meta: 'Last edit 5d ago · Director', due: 'SUN · 4D', dueClass: 'warn' },
  { n: 'CPC (Central Planning)',          p: 'P4', meta: '42 zones mapped · today', due: 'OK', dueClass: 'ok' },
  { n: 'Worker Groups',                   p: 'P6', meta: 'Choir 28 enrolled · 5d ago', due: 'DRAFT', dueClass: 'warn' },
];

const AWARENESS: FormRow[] = [
  { n: 'Awareness Survey · Field',  p: 'A9',    meta: '500 posters printed · 4d ago', due: 'MON · 5D', dueClass: 'warn' },
  { n: 'PPPPPPPAVEDDD Town Name',   p: 'A·all', meta: 'Population baseline · 12d',    due: 'DONE',     dueClass: 'ok' },
  { n: 'Publicity & Video Campaign', p: 'D13',  meta: 'On track · today',             due: 'OK',       dueClass: 'ok' },
];

const VENUE: FormRow[] = [
  { n: 'Venue Inspection (Regular)', p: 'V10', meta: 'Permits secured · 3d ago', due: 'OK', dueClass: 'ok' },
  { n: 'Must-Do Checklist',          p: 'V10', meta: '82% complete · 2d ago',    due: 'OK', dueClass: 'ok' },
];

const DAILY: FormRow[] = [
  { n: 'Weekly Assessment Rating', p: 'All',    meta: 'W8 awaiting submission',     due: 'FRI · 2D', dueClass: 'urgent' },
  { n: 'Crusade Daily Expenses',   p: 'Budget', meta: '$43.8k of $84k · today',     due: 'DAILY',    dueClass: 'ok' },
];

const FormGroup = ({ rows }: { rows: FormRow[] }) => (
  <div className="form-list forms-grid">
    {rows.map((r, i) => (
      <div className="form-row" key={i}>
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
      </div>
    ))}
  </div>
);

export function FormsScreen() {
  const [drawer, setDrawer] = useState(false);
  const [tab, setTab] = useState('all');
  const tabs: Array<{ k: string; l: string; n: number }> = [
    { k: 'all', l: 'All', n: 36 },
    { k: 'due', l: 'Due', n: 3 },
    { k: 'pcm', l: 'PCM', n: 5 },
    { k: 'workers', l: 'Workers', n: 8 },
    { k: 'govt', l: 'Government', n: 4 },
    { k: 'awareness', l: 'Awareness', n: 6 },
  ];

  return (
    <ResponsiveShell active="forms">
      <StatusBar/>
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
            36 forms · 5 categories
          </div>
          <h1
            className="serif"
            style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.02 }}
          >
            All <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>intake</em><br/>forms.
          </h1>
        </div>

        <div className="search">
          <span className="ic"/>
          <span>Search forms, pillars, fields…</span>
        </div>

        <div className="tabs">
          {tabs.map((t) => (
            <div
              key={t.k}
              className={'tab' + (tab === t.k ? ' on' : '')}
              onClick={() => setTab(t.k)}
            >
              {t.l}<span className="n">{t.n}</span>
            </div>
          ))}
        </div>

        <div className="cat-group">
          <div className="cat-head"><span>P · Participation</span><span>17 forms</span></div>
        </div>
        <FormGroup rows={PARTICIPATION}/>

        <div className="cat-group">
          <div className="cat-head"><span>A · Awareness</span><span>6 forms</span></div>
        </div>
        <FormGroup rows={AWARENESS}/>

        <div className="cat-group">
          <div className="cat-head"><span>V · Venue & Logistics</span><span>5 forms</span></div>
        </div>
        <FormGroup rows={VENUE}/>

        <div className="cat-group">
          <div className="cat-head"><span>D · Daily ops</span><span>8 forms</span></div>
        </div>
        <FormGroup rows={DAILY}/>

        <div className="bot-pad"/>
      </div>
      <TabBar active="forms"/>
      {drawer && <Drawer active="forms" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
