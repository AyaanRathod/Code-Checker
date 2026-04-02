import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  /** 'sm' for sidebar/inline use, 'md' for full-page use (default) */
  size?: 'sm' | 'md';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label, size = 'md' }) => {
  const iconSize = size === 'sm' ? 18 : 26;
  const padding  = size === 'sm' ? '2rem' : '4rem';
  const fontSize = size === 'sm' ? '0.82rem' : '0.9rem';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.65rem',
        padding,
        color: 'var(--text-tertiary)',
      }}
    >
      <Loader2 size={iconSize} className="cc-spin" />
      {label && (
        <span className="cc-pulse" style={{ fontSize }}>
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
