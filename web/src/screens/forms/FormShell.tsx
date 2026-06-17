import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './forms.css';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'pending' | 'synced' | 'error';

export type FormShellProps = {
  title: ReactNode;
  pillar: string;
  steps?: Array<{ id: string; label: string }>;
  currentStepId?: string;
  saveStatus?: SaveStatus;
  saveStatusLabel?: string;
  primaryAction: { label: string; onClick: () => void; disabled?: boolean };
  secondaryAction?: { label: string; onClick: () => void };
  backTo?: string;
  children: ReactNode;
};

const statusLabel = (s: SaveStatus, override?: string): string => {
  if (override) return override;
  switch (s) {
    case 'saving': return 'Saving…';
    case 'saved': return 'Saved';
    case 'pending': return 'Pending sync';
    case 'synced': return 'Synced ✓';
    case 'error': return 'Save error';
    default: return '';
  }
};

const statusClass = (s: SaveStatus): string => {
  if (s === 'pending') return 'pending';
  if (s === 'synced' || s === 'saved') return 'synced';
  return '';
};

export const FormShell = ({
  title,
  pillar,
  steps,
  currentStepId,
  saveStatus = 'idle',
  saveStatusLabel,
  primaryAction,
  secondaryAction,
  backTo = '/forms',
  children,
}: FormShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasBackground = !!(location.state as { background?: unknown } | null)?.background;
  const currentStepIndex = steps?.findIndex((s) => s.id === currentStepId) ?? -1;

  return (
    <>
      <div className="scroll">
        <div className="form-shell-top">
          <button type="button" className="back" onClick={() => hasBackground ? navigate(-1) : navigate(backTo)}>Back to forms</button>
          <div className="titlerow">
            <h1 className="title">{title}</h1>
            <span className="pillar-badge">{pillar}</span>
          </div>
          {saveStatus !== 'idle' && (
            <div className={'save-status ' + statusClass(saveStatus)}>
              {statusLabel(saveStatus, saveStatusLabel)}
            </div>
          )}
        </div>

        {steps && steps.length > 1 && (
          <div className="stepper">
            {steps.map((s, i) => {
              const isDone = i < currentStepIndex;
              const isActive = i === currentStepIndex;
              return (
                <div
                  key={s.id}
                  className={'st' + (isDone ? ' done' : '') + (isActive ? ' active' : '')}
                  title={s.label}
                />
              );
            })}
          </div>
        )}

        {children}
      </div>

      <div className="action-bar">
        {secondaryAction && (
          <button type="button" className="btn-secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </button>
        )}
        <div style={{ flex: 1 }}/>
        <button
          type="button"
          className="btn-primary"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </button>
      </div>
    </>
  );
};
