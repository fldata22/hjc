import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../auth/useAuth';
import { useCrusade } from '../../api/hooks';
import { crusadeProgressLabel, nowHHMM } from '../../lib/dateHelpers';

export type TabKey = 'home' | 'forms' | 'pillars' | 'weekly' | 'activity';

export const StatusBar = () => {
  const [time, setTime] = useState(nowHHMM());
  useEffect(() => {
    const id = setInterval(() => setTime(nowHHMM()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="statusbar">
      <span>{time}</span>
      <span className="icons">
        <span className="sb-signal"><i/><i/><i/><i/></span>
        <span style={{ fontSize: 11, fontWeight: 600 }}>5G</span>
        <span className="sb-batt"><i/></span>
      </span>
    </div>
  );
};

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
  home: '/',
  forms: '/forms',
  pillars: '/pillars',
  weekly: '/weekly',
  activity: '/activity',
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
      <button type="button" className={'tabbtn' + (active === 'forms' ? ' on' : '')} onClick={go('forms')}>
        <span className="ico"><span className="gl-doc"/></span>
        Forms
      </button>
      <button type="button" className={'tabbtn' + (active === 'pillars' ? ' on' : '')} onClick={go('pillars')}>
        <span className="ico"><span className="gl-pillars"><i/><i/><i/><i/></span></span>
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
  const goto = (key: TabKey) => () => {
    onClose();
    navigate(TAB_ROUTES[key]);
  };
  const handleSignOut = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const cityShort = crusade?.city ?? '';
  const nameSuffix = crusade?.name?.replace(cityShort, '').trim() || crusade?.name || '';
  const progress = crusadeProgressLabel(crusade?.opens_at, crusade?.closes_at);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div className="crusade-eyebrow">Crusade</div>
          <h2 className="serif">
            {cityShort || 'Crusade'}
            {nameSuffix && (
              <>
                , <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{nameSuffix}</em>
              </>
            )}
          </h2>
          {progress && <div className="day">{progress}</div>}
        </div>
        <div className="drawer-section">Director</div>
        <button type="button" className={'drawer-item' + (active === 'home' ? ' on' : '')} onClick={goto('home')}>
          <span className="ico"><span className="gl-home"/></span>Home
        </button>
        <button type="button" className={'drawer-item' + (active === 'forms' ? ' on' : '')} onClick={goto('forms')}>
          <span className="ico"><span className="gl-doc"/></span>Forms
        </button>
        <button type="button" className={'drawer-item' + (active === 'pillars' ? ' on' : '')} onClick={goto('pillars')}>
          <span className="ico"><span className="gl-pillars"><i/><i/><i/><i/></span></span>Pillars
        </button>
        <button type="button" className={'drawer-item' + (active === 'weekly' ? ' on' : '')} onClick={goto('weekly')}>
          <span className="ico"><span className="gl-cal"/></span>Weekly
        </button>
        <button type="button" className={'drawer-item' + (active === 'activity' ? ' on' : '')} onClick={goto('activity')}>
          <span className="ico"><span className="gl-list"/></span>Activity log
        </button>
        <div className="drawer-section">Crusade</div>
        <button type="button" className="drawer-item" onClick={() => { onClose(); navigate('/people'); }}>
          <span className="ico">◐</span>People
        </button>
        <button type="button" className="drawer-item" onClick={() => { onClose(); navigate('/budget'); }}>
          <span className="ico">◇</span>Budget
        </button>
        <div className="drawer-section" style={{ marginTop: 12 }}>Account</div>
        <button type="button" className="drawer-item" onClick={handleSignOut}>
          <span className="ico">⤴</span>Sign out
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
    <Sidebar active={active} />
    <div className="phone">{children}</div>
  </div>
);
