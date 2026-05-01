import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type TabKey = 'home' | 'forms' | 'pillars' | 'weekly' | 'activity';

export const StatusBar = ({ time = '9:41' }: { time?: string }) => (
  <div className="statusbar">
    <span>{time}</span>
    <span className="icons">
      <span className="sb-signal"><i/><i/><i/><i/></span>
      <span style={{ fontSize: 11, fontWeight: 600 }}>5G</span>
      <span className="sb-batt"><i/></span>
    </span>
  </div>
);

export const AppBar = ({
  crumb,
  title,
  onMenu,
  hasNotif = true,
  initials = 'LA',
}: {
  crumb?: string;
  title?: string;
  onMenu?: () => void;
  hasNotif?: boolean;
  initials?: string;
}) => (
  <div className="app-bar">
    <div className="left">
      <button type="button" className="menu" onClick={onMenu} aria-label="Open menu"><i/></button>
      <div className="crumb">
        {title ? <b>{title}</b> : <><span>Wa 2024</span> · <b>Director</b></>}
        {crumb && <> · {crumb}</>}
      </div>
    </div>
    <div className="actions">
      <div className="icon-btn">🔔{hasNotif && <span className="dot"/>}</div>
      <div className="avatar">{initials}</div>
    </div>
  </div>
);

const TAB_ROUTES: Record<TabKey, string> = {
  home: '/d/',
  forms: '/d/forms',
  pillars: '/d/pillars',
  weekly: '/d/weekly',
  activity: '/d/activity',
};

export const TabBar = ({ active = 'home' }: { active?: TabKey }) => {
  const navigate = useNavigate();
  const go = (key: TabKey) => () => navigate(TAB_ROUTES[key]);
  return (
    <div className="tabbar">
      <button type="button" className={'tabbtn' + (active === 'home' ? ' on' : '')} onClick={go('home')}>
        <span className="ico"><span className="gl-home"/></span>
        Home
      </button>
      <button type="button" className={'tabbtn' + (active === 'forms' ? ' on' : '')} style={{ position: 'relative' }} onClick={go('forms')}>
        <span className="ico"><span className="gl-doc"/></span>
        Forms
        <span className="badge">3</span>
      </button>
      <button type="button" className={'tabbtn' + (active === 'pillars' ? ' on' : '')} onClick={go('pillars')}>
        <span className="ico"><span className="gl-pillars"/></span>
        Pillars
      </button>
      <button type="button" className={'tabbtn' + (active === 'weekly' ? ' on' : '')} onClick={go('weekly')}>
        <span className="ico"><span className="gl-cal"/></span>
        Weekly
      </button>
      <button type="button" className={'tabbtn' + (active === 'activity' ? ' on' : '')} onClick={go('activity')}>
        <span className="ico"><span className="gl-list"/></span>
        Log
      </button>
    </div>
  );
};

// 13 pillars with current readiness scores (mid-crusade Wa 2024 Day 58)
export type Pillar = { l: string; n: string; s: number; n7: number; src: string };
export const PILLARS: Pillar[] = [
  { l: 'P', n: 'Primary Committee Members', s: 90, n7: 86, src: 'PCM tab' },
  { l: 'P', n: "Fathers' Participation",     s: 75, n7: 70, src: 'Fathers tab' },
  { l: 'P', n: 'Board of Trustees',          s: 60, n7: 55, src: 'BOT tab' },
  { l: 'P', n: 'Central Planning Committee', s: 55, n7: 52, src: 'CPC tab' },
  { l: 'P', n: 'Governmental Participation', s: 80, n7: 70, src: 'Govt tab' },
  { l: 'P', n: 'Worker Group Participation', s: 40, n7: 35, src: 'Workers tab' },
  { l: 'P', n: 'Pastors Met',                s: 70, n7: 68, src: 'Pastors tab' },
  { l: 'P', n: 'Pastoral Status',            s: 65, n7: 60, src: 'Paid Pastors' },
  { l: 'A', n: 'Awareness',                  s: 50, n7: 45, src: 'Awareness tab' },
  { l: 'V', n: 'Venue',                      s: 85, n7: 78, src: 'Venue tab' },
  { l: 'E', n: 'E-House',                    s: 30, n7: 28, src: 'E-House tab' },
  { l: 'D', n: 'Past Crusades',              s: 100, n7: 100, src: 'Distance tab' },
  { l: 'D', n: 'Digital / Social Media',     s: 45, n7: 42, src: 'Publicity tab' },
];

export const Drawer = ({
  active,
  onClose,
}: {
  active: TabKey;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const goto = (key: TabKey) => () => {
    onClose();
    navigate(TAB_ROUTES[key]);
  };
  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div className="crusade-eyebrow">Crusade</div>
          <h2 className="serif">Wa, <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>Ghana 2024</em></h2>
          <div className="day">Day <b>58</b> of 84 · 26 days out</div>
        </div>
        <div className="drawer-section">Director</div>
        <button type="button" className={'drawer-item' + (active === 'home' ? ' on' : '')} onClick={goto('home')}>
          <span className="ico"><span className="gl-home"/></span>Home
        </button>
        <button type="button" className={'drawer-item' + (active === 'forms' ? ' on' : '')} onClick={goto('forms')}>
          <span className="ico"><span className="gl-doc"/></span>Forms<span className="badge">3</span>
        </button>
        <button type="button" className={'drawer-item' + (active === 'pillars' ? ' on' : '')} onClick={goto('pillars')}>
          <span className="ico"><span className="gl-pillars"/></span>Pillars
        </button>
        <button type="button" className={'drawer-item' + (active === 'weekly' ? ' on' : '')} onClick={goto('weekly')}>
          <span className="ico"><span className="gl-cal"/></span>Weekly
        </button>
        <button type="button" className={'drawer-item' + (active === 'activity' ? ' on' : '')} onClick={goto('activity')}>
          <span className="ico"><span className="gl-list"/></span>Activity log
        </button>
        <div className="drawer-section">Crusade</div>
        <div className="drawer-item"><span className="ico">◐</span>People</div>
        <div className="drawer-item"><span className="ico">◇</span>Budget</div>
        <div className="drawer-item"><span className="ico">⊟</span>Documents</div>
        <div className="drawer-section" style={{ marginTop: 12 }}>Account</div>
        <div className="drawer-item"><span className="ico">⊙</span>Settings</div>
        <div className="drawer-item"><span className="ico">⤴</span>Sign out</div>
      </div>
    </>
  );
};

export const PhoneFrame = ({ children }: { children: ReactNode }) => (
  <div className="app-root">
    <div className="phone">{children}</div>
  </div>
);
