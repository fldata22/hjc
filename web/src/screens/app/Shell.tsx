import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../auth/useAuth';
import { useCrusade } from '../../api/hooks';
import { crusadeProgressLabel } from '../../lib/dateHelpers';

export type TabKey = 'home' | 'forms' | 'pillars' | 'weekly' | 'activity';

const TAB_ROUTES: Record<TabKey, string> = {
  home: '/',
  forms: '/forms',
  pillars: '/pillars',
  weekly: '/weekly',
  activity: '/activity',
};

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'home',     label: 'Home',    icon: '⌂' },
  { key: 'forms',    label: 'Forms',   icon: '≡' },
  { key: 'pillars',  label: 'Pillars', icon: '◈' },
  { key: 'weekly',   label: 'Weekly',  icon: '◷' },
  { key: 'activity', label: 'Log',     icon: '◎' },
];

export const AppBar = ({
  title,
  sub,
  onMenu,
  hasNotif = false,
  initials = 'D',
}: {
  title?: string;
  sub?: string;
  onMenu?: () => void;
  hasNotif?: boolean;
  initials?: string;
}) => (
  <div className="app-bar">
    <button type="button" className="menu-btn" onClick={onMenu} aria-label="Open menu">
      <span className="menu-lines">
        <span/><span/><span/>
      </span>
    </button>
    <div className="bar-title">
      {title ?? 'HJC'}
      {sub && <span className="bar-sub"> · {sub}</span>}
    </div>
    <div className="bar-actions">
      <button type="button" className="notif-btn" aria-label="Notifications">
        ·
        {hasNotif && <span className="notif-dot"/>}
      </button>
      <div className="avatar">{initials}</div>
    </div>
  </div>
);

export const TabBar = ({ active = 'home' }: { active?: TabKey }) => {
  const navigate = useNavigate();
  return (
    <div className="tabbar">
      {TABS.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          className={'tabbtn' + (active === key ? ' on' : '')}
          onClick={() => navigate(TAB_ROUTES[key])}
        >
          <span className="tab-icon">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
};

export const Drawer = ({
  active,
  onClose,
}: {
  active: TabKey;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: crusade } = useCrusade();

  const cityShort = crusade?.city ?? 'Crusade';
  const progress = crusadeProgressLabel(crusade?.opens_at, crusade?.closes_at);

  const goto = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const navItem = (key: TabKey | null, path: string, icon: string, label: string) => (
    <button
      type="button"
      className={'drawer-item' + (key && active === key ? ' on' : '')}
      onClick={() => goto(path)}
    >
      <span className="d-icon">{icon}</span>
      {label}
    </button>
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div className="crusade-name">{cityShort}</div>
          {progress && <div className="crusade-meta">{progress}</div>}
        </div>

        <div className="drawer-section">Director</div>
        {navItem('home',     '/',          '⌂', 'Home')}
        {navItem('forms',    '/forms',     '≡', 'Forms')}
        {navItem('pillars',  '/pillars',   '◈', 'Pillars')}
        {navItem('weekly',   '/weekly',    '◷', 'Weekly')}
        {navItem('activity', '/activity',  '◎', 'Activity log')}

        <div className="drawer-section">Crusade</div>
        {navItem(null, '/people', '◉', 'People')}
        {navItem(null, '/budget', '◇', 'Budget')}

        <div className="drawer-section" style={{ marginTop: 'auto' }}>Account</div>
        <button type="button" className="drawer-item" onClick={handleSignOut}>
          <span className="d-icon">↩</span>
          Sign out
        </button>
      </div>
    </>
  );
};

export const ResponsiveShell = ({
  active,
  children,
}: {
  active: TabKey;
  children: ReactNode;
}) => (
  <div className="app-root">
    <Sidebar active={active}/>
    <div className="phone">{children}</div>
  </div>
);

export const useDrawer = () => {
  const [open, setOpen] = useState(false);
  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
  };
};
