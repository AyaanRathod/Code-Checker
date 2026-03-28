import React from 'react';
import type { AssignmentComparisonItem } from './types';
import { buildUniqueMatrixIds, findComparisonPair } from './assignmentDetailsUtils';

interface SimilarityMatrixTabProps {
  comparisons: AssignmentComparisonItem[];
  onInspectComparison: (comparisonId: string) => void;
}

const SimilarityMatrixTab: React.FC<SimilarityMatrixTabProps> = ({ comparisons, onInspectComparison }) => {
  const studentKeys = buildUniqueMatrixIds(comparisons);

  const toShortEncryptedId = (id: string) => (id.length > 8 ? `${id.slice(0, 8)}...` : id);

  const getMatrixCellColor = (score?: number) => {
    if (score === undefined) return 'hsl(220, 20%, 95%)';
    if (score > 80) return '#dc2626';
    if (score > 60) return '#f59e0b';
    if (score > 40) return 'var(--brand-secondary)';
    if (score > 20) return 'hsl(220, 30%, 85%)';
    if (score > 0) return 'hsl(220, 20%, 90%)';
    return 'hsl(220, 20%, 95%)';
  };

  if (studentKeys.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        No matrix data available yet.
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.4rem' }}>Similarity Matrix Hover</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Hover cells to inspect pairwise similarities. Darker cells indicate higher similarity.
      </p>

      <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '4px', margin: '0 auto' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '80px' }}></th>
              {studentKeys.map((studentKey) => (
                <th
                  key={`column-${studentKey}`}
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    padding: '0.35rem',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                  title={studentKey}
                >
                  {toShortEncryptedId(studentKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {studentKeys.map((rowStudent) => (
              <tr key={`row-${rowStudent}`}>
                <th
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    textAlign: 'right',
                    paddingRight: '0.45rem',
                  }}
                  title={rowStudent}
                >
                  {toShortEncryptedId(rowStudent)}
                </th>

                {studentKeys.map((columnStudent) => {
                  if (rowStudent === columnStudent) {
                    return (
                      <td
                        key={`cell-${rowStudent}-${columnStudent}`}
                        style={{
                          width: '30px',
                          height: '30px',
                          background: 'var(--bg-surface-raised)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                        }}
                        title="Same student"
                      ></td>
                    );
                  }

                  const comparison = findComparisonPair(comparisons, rowStudent, columnStudent);
                  const score = comparison?.score;

                  return (
                    <td
                      key={`cell-${rowStudent}-${columnStudent}`}
                      className="heatmap-cell"
                      onClick={() => {
                        if (comparison) onInspectComparison(comparison.id);
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        background: getMatrixCellColor(score),
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontSize: '0.62rem',
                        color: score !== undefined && score >= 75 ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700,
                        border: score !== undefined && score >= 75 ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--border-subtle)',
                        cursor: comparison ? 'pointer' : 'default',
                      }}
                      title={
                        score !== undefined
                          ? `${rowStudent} vs ${columnStudent}: ${score.toFixed(1)}%${comparison ? ' (click to inspect)' : ''}`
                          : `${rowStudent} vs ${columnStudent}: no comparison`
                      }
                    >
                      {score !== undefined ? Math.round(score) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span>Low</span>
          <div style={{ width: '160px', height: '10px', borderRadius: '99px', background: 'linear-gradient(90deg, #f1f5f9 0%, #fecaca 55%, #dc2626 100%)', border: '1px solid var(--border-subtle)' }}></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default SimilarityMatrixTab;
