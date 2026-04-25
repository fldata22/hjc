// @ts-nocheck
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';

const NAV_ITEMS = [
  { key: 'home', icon: 'home', label: 'Mission control', to: '/' },
  { key: 'powers', icon: 'powers', label: 'PAVEDDD powers', count: 14, to: '/powers' },
  { key: 'pastors', icon: 'pastors', label: 'Pastors', count: '1.1k', to: '/pastors' },
  { key: 'committees', icon: 'committees', label: 'Committees', to: '/committees' },
  { key: 'pledges', icon: 'pledges', label: 'Pledges', to: '/pledges' },
  { key: 'conf', icon: 'conf', label: 'Conference', count: 559, to: '/conference' },
  { key: 'publicity', icon: 'publicity', label: 'Publicity', to: '/publicity' },
  { key: 'govt', icon: 'govt', label: 'Govt & permits', to: '/govt' },
  { key: 'budget', icon: 'budget', label: 'Budget', to: '/budget' },
  { key: 'prep', icon: 'prep', label: 'Preparation', to: '/preparation' },
];
const NAV_DAILY = [
  { key: 'activity', icon: 'activity', label: 'Activity log', to: '/activity' },
  { key: 'assess', icon: 'assess', label: 'Weekly assessment', to: '/assessment' },
  { key: 'inbox', icon: 'inbox', label: 'Inbox', count: 17, to: '/inbox' },
];

function Sidebar() {
  return (
    <aside className="hf-sidebar">
      <div className="hf-brand">
        <div className="hf-brand-mark">H</div>
        <div>
          <div className="hf-brand-name">HJC</div>
          <div className="hf-brand-meta">Lusaka 2026</div>
        </div>
      </div>
      <div className="hf-nav-section">Crusade</div>
      {NAV_ITEMS.map((n) => (
        <NavLink key={n.key} to={n.to} end={n.to === '/'}
                 className={({ isActive }) => `hf-nav-item ${isActive ? 'active' : ''}`}>
          <span className="ic"><Icon name={n.icon as any} size={15} /></span>
          <span>{n.label}</span>
          {n.count != null && <span className="count">{n.count}</span>}
        </NavLink>
      ))}
      <div className="hf-nav-section">Director</div>
      {NAV_DAILY.map((n) => (
        <NavLink key={n.key} to={n.to}
                 className={({ isActive }) => `hf-nav-item ${isActive ? 'active' : ''}`}>
          <span className="ic"><Icon name={n.icon as any} size={15} /></span>
          <span>{n.label}</span>
          {n.count != null && <span className="count">{n.count}</span>}
        </NavLink>
      ))}
    </aside>
  );
}

function Topbar({ user }: { user?: { name: string } | null }) {
  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  return (
    <div className="hf-topbar">
      <div className="hf-search">
        <Icon name="search" size={14} />
        <span>Search pastors, churches, expenses…</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
      </div>
      <div className="hf-topbar-actions">
        <div className="hf-icon-btn"><Icon name="cal" /></div>
        <div className="hf-icon-btn"><Icon name="bell" /><span className="dot" /></div>
        <div className="hf-user-chip">
          <div className="hf-avatar">{initials}</div>
          <div style={{ fontSize: 12, lineHeight: 1.2 }}>
            <div style={{ fontWeight: 500 }}>{user?.name ?? 'Director'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Director</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({ children, noPad, user }: { children: React.ReactNode; noPad?: boolean; user?: { name: string } | null }) {
  return (
    <div className="hf">
      <Sidebar />
      <div className="hf-main">
        <Topbar user={user} />
        <div className={`hf-content ${noPad ? 'no-pad' : ''}`}>{children}</div>
      </div>
    </div>
  );
}

export function Crumb({ path }: { path: string[] }) {
  return (
    <div className="hf-crumb">
      {path.map((p, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>/</span>}
          {i === path.length - 1 ? <span className="here">{p}</span> : <a>{p}</a>}
        </span>
      ))}
    </div>
  );
}
