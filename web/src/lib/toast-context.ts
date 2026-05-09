import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
