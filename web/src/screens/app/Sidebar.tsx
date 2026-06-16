import { useNavigate } from 'react-router-dom';
import { type TabKey } from './Shell';
import { useAuth } from '../../auth/useAuth';
import { useCrusade } from '../../api/hooks';
import { crusadeProgressLabel } from '../../lib/dateHelpers';

const ITEMS: Array<{ key: TabKey; path: string; icon: string; label: string }> = [
  { key: 'home',     path: '/',         icon: '⌂', label: 'Home' },
  { key: 'forms',    path: '/forms',    icon: '≡', label: 'Forms' },
  { key: 'pillars',  path: '/pillars',  icon: '◈', label: 'Pillars' },
  { key: 'weekly',   path: '/weekly',   icon: '◷', label: 'Weekly' },
  { key: 'activity', path: '/activity', icon: '◎', label: 'Activity log' },
];

export const Sidebar = ({ active }: { active: TabKey }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: crusade } = useCrusade();

  const cityShort = crusade?.city ?? 'HJC';
  const progress = crusadeProgressLabel(crusade?.opens_at, crusade?.closes_at);

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        {cityShort}
        {progress && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)', marginTop: 2 }}>{progress}</div>}
      </div>

      <div className="drawer-section" style={{ marginTop: 8 }}>Director</div>
      {ITEMS.map(({ key, path, icon, label }) => (
        <button
          key={key}
          type="button"
          className={'sb-item' + (active === key ? ' on' : '')}
          onClick={() => navigate(path)}
          aria-current={active === key ? 'page' : undefined}
        >
          <span className="sb-icon">{icon}</span>
          {label}
        </button>
      ))}

      <div className="drawer-section">Crusade</div>
      <button type="button" className="sb-item" onClick={() => navigate('/people')}>
        <span className="sb-icon">◉</span>People
      </button>
      <button type="button" className="sb-item" onClick={() => navigate('/budget')}>
        <span className="sb-icon">◇</span>Budget
      </button>

      <div className="drawer-section" style={{ marginTop: 'auto' }}>Account</div>
      <button type="button" className="sb-item" onClick={handleSignOut}>
        <span className="sb-icon">↩</span>Sign out
      </button>
    </aside>
  );
};
