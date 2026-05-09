import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ToastContext, type ToastKind } from './toast-context';

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++;
    setEntries((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }, kind === 'error' ? 5000 : 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {entries.map((e) => (
          <ToastBubble key={e.id} entry={e}/>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ entry }: { entry: ToastEntry }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const bg =
    entry.kind === 'error' ? 'var(--accent)' :
    entry.kind === 'success' ? '#2a8c4a' :
    'var(--ink)';

  return (
    <div
      style={{
        background: bg,
        color: '#fff',
        padding: '10px 16px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {entry.message}
    </div>
  );
}
