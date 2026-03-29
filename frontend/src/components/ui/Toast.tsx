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

const STYLES = {
  success: {
    accent: '#22c55e',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#14532d',
    subtext: '#166534',
    icon: '#22c55e',
  },
  error: {
    accent: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#7f1d1d',
    subtext: '#991b1b',
    icon: '#ef4444',
  },
  info: {
    accent: '#6366f1',
    bg: 'var(--bg-surface)',
    border: 'var(--border-strong)',
    text: 'var(--text-primary)',
    subtext: 'var(--text-secondary)',
    icon: '#6366f1',
  },
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
      <style>{`
        @keyframes toastDrop {
          from { opacity: 0; transform: translateX(-50%) translateY(-0.75rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: '1.25rem', left: '50%',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
        pointerEvents: 'none',
        width: 'min(480px, calc(100vw - 2rem))',
        transform: 'translateX(-50%)',
      }}>
        {toasts.map(toast => {
          const Icon = ICONS[toast.type];
          const s = STYLES[toast.type];
          return (
            <div key={toast.id} style={{
              width: '100%',
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderLeft: `4px solid ${s.accent}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1rem 0.9rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
              animation: 'toastDrop 0.22s cubic-bezier(0.34,1.56,0.64,1)',
              pointerEvents: 'all',
            }}>
              <Icon size={19} style={{ color: s.icon, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: s.text, lineHeight: 1.4 }}>
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.subtext, opacity: 0.5, padding: 0, flexShrink: 0, display: 'flex', marginLeft: '0.25rem' }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
