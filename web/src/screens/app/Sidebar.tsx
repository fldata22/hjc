import { useNavigate } from 'react-router-dom';
import { type TabKey } from './Shell';
import { useAuth } from '../../auth/useAuth';
import { useCrusade } from '../../api/hooks';
import { crusadeProgressLabel } from '../../lib/dateHelpers';

const NAV_ROUTES: Record<TabKey, string> = {
  home: '/',
  forms: '/forms',
  pillars: '/pillars',
  weekly: '/weekly',
  activity: '/activity',
};

export const Sidebar = ({ active }: { active: TabKey }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: crusade } = useCrusade();
  const goto = (key: TabKey) => () => navigate(NAV_ROUTES[key]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const cityShort = crusade?.city ?? '';
  const nameSuffix = crusade?.name?.replace(cityShort, '').trim() || crusade?.name || '';
  const progress = crusadeProgressLabel(crusade?.opens_at, crusade?.closes_at);

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-head">
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
      <div className="sidebar-section">Director</div>
      <button
        type="button"
        className={'sidebar-item' + (active === 'home' ? ' on' : '')}
        aria-current={active === 'home' ? 'page' : undefined}
        onClick={goto('home')}
      >
        <span className="ico"><span className="gl-home"/></span>Home
      </button>
      <button
        type="button"
        className={'sidebar-item' + (active === 'forms' ? ' on' : '')}
        aria-current={active === 'forms' ? 'page' : undefined}
        onClick={goto('forms')}
      >
        <span className="ico"><span className="gl-doc"/></span>Forms
      </button>
      <button
        type="button"
        className={'sidebar-item' + (active === 'pillars' ? ' on' : '')}
        aria-current={active === 'pillars' ? 'page' : undefined}
        onClick={goto('pillars')}
      >
        <span className="ico"><span className="gl-pillars"><i/><i/><i/><i/></span></span>Pillars
      </button>
      <button
        type="button"
        className={'sidebar-item' + (active === 'weekly' ? ' on' : '')}
        aria-current={active === 'weekly' ? 'page' : undefined}
        onClick={goto('weekly')}
      >
        <span className="ico"><span className="gl-cal"/></span>Weekly
      </button>
      <button
        type="button"
        className={'sidebar-item' + (active === 'activity' ? ' on' : '')}
        aria-current={active === 'activity' ? 'page' : undefined}
        onClick={goto('activity')}
      >
        <span className="ico"><span className="gl-list"/></span>Activity log
      </button>
      <div className="sidebar-section">Crusade</div>
      <button type="button" className="sidebar-item" onClick={() => navigate('/people')}>
        <span className="ico">◐</span>People
      </button>
      <button type="button" className="sidebar-item" onClick={() => navigate('/budget')}>
        <span className="ico">◇</span>Budget
      </button>
      <div className="sidebar-section" style={{ marginTop: 'auto' }}>Account</div>
      <button type="button" className="sidebar-item" onClick={handleSignOut}>
        <span className="ico">⤴</span>Sign out
      </button>
    </aside>
  );
};
