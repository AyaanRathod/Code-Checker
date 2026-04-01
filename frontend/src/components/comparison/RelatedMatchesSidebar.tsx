import React from 'react';
import { X } from 'lucide-react';
import type { OtherAssignmentMatch } from './types';

interface RelatedMatchesSidebarProps {
  isMobileLayout: boolean;
  selectedSimilarityRange: string;
  onSimilarityRangeChange: (value: string) => void;
  otherMatchesSortOrder: 'desc' | 'asc';
  onToggleSort: () => void;
  otherMatchesLoading: boolean;
  matches: OtherAssignmentMatch[];
  revealed: boolean;
  onCloseMobile: () => void;
  onInspect: (matchId: string) => void;
}

const getStatusStyles = (status: string) => {
  if (status === 'High Risk') {
    return {
      color: '#dc2626',
      background: '#fef2f2',
      border: '#fecaca'
    };
  }

  if (status === 'Review') {
    return {
      color: '#d97706',
      background: '#fffbeb',
      border: '#fed7aa'
    };
  }

  return {
    color: '#64748b',
    background: '#f8fafc',
    border: '#cbd5e1'
  };
};

const RelatedMatchesSidebar: React.FC<RelatedMatchesSidebarProps> = ({
  isMobileLayout,
  selectedSimilarityRange,
  onSimilarityRangeChange,
  otherMatchesSortOrder,
  onToggleSort,
  otherMatchesLoading,
  matches,
  revealed,
  onCloseMobile,
  onInspect
}) => {
  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: isMobileLayout ? '0.75rem 0.8rem' : '0.9rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexShrink: 0, background: 'var(--bg-surface-raised)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.02rem' }}>Related Student Matches</h3>
          {isMobileLayout && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCloseMobile}
              style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
            >
              <X size={14} /> Close
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onToggleSort}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.76rem', gap: '0.35rem', whiteSpace: 'nowrap', background: 'var(--bg-surface)' }}
          >
            Similarity Score
            <span
              style={{
                display: 'inline-block',
                transform: otherMatchesSortOrder === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              ▼
            </span>
          </button>

          <select
            value={selectedSimilarityRange}
            onChange={(e) => onSimilarityRangeChange(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: isMobileLayout ? 120 : 150, background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            <option value="All">All Scores</option>
            <option value="0-20">0% - 20%</option>
            <option value="21-40">21% - 40%</option>
            <option value="41-60">41% - 60%</option>
            <option value="61-80">61% - 80%</option>
            <option value="81-100">81% - 100%</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {otherMatchesLoading ? (
          <div style={{ padding: '2rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Loading related matches...
          </div>
        ) : matches.length === 0 ? (
          <div style={{ padding: '2rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            No related matches match the selected score filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {matches.map((match) => {
              const statusStyles = getStatusStyles(match.status);
              const sourceLabel = match.source_student;
              const targetLabel = match.target_student;

              return (
                <div key={match.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{match.assignmentTitle}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      {match.course}{match.isCurrentAssignment ? ' • Current assignment' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Source ID</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{sourceLabel}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Target ID</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{targetLabel}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Similarity Score</span>
                      <span style={{ fontWeight: 700, color: match.score >= 80 ? '#dc2626' : match.score >= 60 ? '#d97706' : 'var(--text-primary)' }}>
                        {match.score.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Risk Level</span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: statusStyles.color,
                        background: statusStyles.background,
                        border: `1px solid ${statusStyles.border}`
                      }}>
                        {match.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => onInspect(match.id)}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', background: 'var(--bg-surface)' }}
                    >
                      Inspect Match
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default RelatedMatchesSidebar;
