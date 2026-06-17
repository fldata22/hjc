import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function FormSheet({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const close = () => {
    const bg = (location.state as { background?: { pathname: string } } | null)?.background;
    if (bg) navigate(bg.pathname, { replace: true });
    else navigate('/forms');
  };

  return (
    <div className="form-sheet-overlay">
      <div className="form-sheet-backdrop" onClick={close}/>
      <div className="form-sheet">
        <div className="form-sheet-handle"/>
        {children}
      </div>
    </div>
  );
}
