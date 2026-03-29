import React, { createContext, useCallback, useContext, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

const COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d', icon: '#22c55e' },
  error:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '#ef4444' },
  info:    { bg: 'var(--bg-surface)', border: 'var(--border-strong)', text: 'var(--text-primary)', icon: 'var(--text-secondary)' },
};

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(1rem)}to{opacity:1;transform:translateX(0)}}`}</style>
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'min(360px, calc(100vw - 2rem))', pointerEvents: 'none' }}>
        {toasts.map(toast => {
          const Icon = ICONS[toast.type];
          const c = COLORS[toast.type];
          return (
            <div key={toast.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', animation: 'toastIn 0.2s ease', pointerEvents: 'all' }}>
              <Icon size={17} style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }} />
              <span style={{ flex: 1, fontSize: '0.875rem', color: c.text, lineHeight: 1.45 }}>{toast.message}</span>
              <button onClick={() => dismiss(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, opacity: 0.45, padding: 0, flexShrink: 0, display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
