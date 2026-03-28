import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MatchPair } from './types';

interface FloatingMatchNavigatorProps {
  isMobileLayout: boolean;
  activePanel: 'source' | 'target';
  activePanelPosition: number;
  totalBlocks: number;
  activeBlockId: number | null;
  activeMatch: MatchPair | null;
  onPrev: () => void;
  onNext: () => void;
}

const FloatingMatchNavigator: React.FC<FloatingMatchNavigatorProps> = ({
  isMobileLayout,
  activePanel,
  activePanelPosition,
  totalBlocks,
  activeBlockId,
  activeMatch,
  onPrev,
  onNext,
}) => {
  if (totalBlocks <= 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-surface)',
        padding: isMobileLayout ? '0.5rem' : '0.75rem',
        borderRadius: '12px',
        border: '1px solid var(--border-strong)',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 100,
        maxWidth: 'calc(100vw - 1.25rem)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
          {activePanel === 'source' ? 'Source Matches' : 'Target Matches'}
        </span>
        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#ca8a04' }}>{activePanelPosition}</span> / {totalBlocks}
        </span>
        {activeMatch && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            Confidence: {(activeMatch.confidence || 'medium').toUpperCase()} • Span: {activeMatch.min_span_chars || 0} chars
          </span>
        )}
      </div>

      <div style={{ width: '1px', height: '30px', background: 'var(--border-subtle)' }} />

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onPrev}
          disabled={activeBlockId === null || activePanelPosition <= 1}
          className="btn"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            display: 'flex',
            gap: '0.5rem',
            opacity: activeBlockId === null || activePanelPosition <= 1 ? 0.3 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <button
          onClick={onNext}
          disabled={activeBlockId === null || activePanelPosition >= totalBlocks}
          className="btn"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            display: 'flex',
            gap: '0.5rem',
            opacity: activeBlockId === null || activePanelPosition >= totalBlocks ? 0.3 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default FloatingMatchNavigator;
