import { type ReactNode } from 'react';

export function InlineSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="form-sheet-overlay">
      <div className="form-sheet-backdrop" onClick={onClose} />
      <div className="form-sheet">
        <div className="form-sheet-handle" />
        <div className="form-sheet-body">{children}</div>
      </div>
    </div>
  );
}
