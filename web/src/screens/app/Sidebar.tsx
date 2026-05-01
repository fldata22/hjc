import { useNavigate } from 'react-router-dom';
import { type TabKey } from './Shell';

const NAV_ROUTES: Record<TabKey, string> = {
  home: '/d/',
  forms: '/d/forms',
  pillars: '/d/pillars',
  weekly: '/d/weekly',
  activity: '/d/activity',
};

export const Sidebar = ({ active }: { active: TabKey }) => {
  const navigate = useNavigate();
  const goto = (key: TabKey) => () => navigate(NAV_ROUTES[key]);
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-head">
        <div className="crusade-eyebrow">Crusade</div>
        <h2 className="serif">
          Wa, <em style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>Ghana 2024</em>
        </h2>
        <div className="day">Day <b>58</b> of 84 · 26 days out</div>
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
        <span className="ico"><span className="gl-doc"/></span>Forms<span className="badge">3</span>
      </button>
      <button
        type="button"
        className={'sidebar-item' + (active === 'pillars' ? ' on' : '')}
        aria-current={active === 'pillars' ? 'page' : undefined}
        onClick={goto('pillars')}
      >
        <span className="ico"><span className="gl-pillars"/></span>Pillars
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
      <div className="sidebar-item"><span className="ico">◐</span>People</div>
      <div className="sidebar-item"><span className="ico">◇</span>Budget</div>
      <div className="sidebar-item"><span className="ico">⊟</span>Documents</div>
      <div className="sidebar-section" style={{ marginTop: 'auto' }}>Account</div>
      <div className="sidebar-item"><span className="ico">⊙</span>Settings</div>
      <div className="sidebar-item"><span className="ico">⤴</span>Sign out</div>
    </aside>
  );
};
