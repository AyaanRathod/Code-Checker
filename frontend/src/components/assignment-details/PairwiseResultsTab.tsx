import React from 'react';
import { AlertTriangle, CheckCircle, FileWarning, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AssignmentComparisonItem } from './types';

interface PairwiseResultsTabProps {
  isMobileLayout: boolean;
  comparisons: AssignmentComparisonItem[];
  selectedSimilarityRange: string;
  similaritySortOrder: 'desc' | 'asc';
  onSimilarityRangeChange: (value: string) => void;
  onToggleSimilaritySort: () => void;
}

const PairwiseResultsTab: React.FC<PairwiseResultsTabProps> = ({
  isMobileLayout,
  comparisons,
  selectedSimilarityRange,
  similaritySortOrder,
  onSimilarityRangeChange,
  onToggleSimilaritySort,
}) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Pairwise Similarities</h2>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedSimilarityRange}
            onChange={(event) => onSimilarityRangeChange(event.target.value)}
            className="form-input"
            style={{ width: isMobileLayout ? '150px' : '170px', background: 'var(--bg-surface)', cursor: 'pointer' }}
          >
            <option value="All">All Scores</option>
            <option value="0-20">0% - 20%</option>
            <option value="21-40">21% - 40%</option>
            <option value="41-60">41% - 60%</option>
            <option value="61-80">61% - 80%</option>
            <option value="81-100">81% - 100%</option>
          </select>

          <div className="input-with-icon">
            <Search />
            <input type="text" placeholder="Search Masked ID..." className="form-input" style={{ width: isMobileLayout ? '180px' : '280px', background: 'var(--bg-surface)' }} />
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        {comparisons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <FileWarning size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Matching Results</h3>
            <p style={{ fontSize: '0.9rem' }}>No pairwise similarities match the selected filter.</p>
          </div>
        ) : isMobileLayout ? (
          <div style={{ display: 'grid', gap: '0.6rem', padding: '0.6rem' }}>
            {comparisons.map((comparison) => (
              <div key={comparison.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.7rem', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.55rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Source</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.77rem' }}>{comparison.source_student}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Target</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.77rem' }}>{comparison.target_student}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: comparison.score > 80 ? '#dc2626' : comparison.score > 60 ? '#d97706' : 'var(--text-primary)' }}>
                    {comparison.score.toFixed(1)}%
                  </span>
                  <Link to={`/instructor/compare/${comparison.id}`} className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: 'var(--bg-surface)' }}>
                    Inspect Match
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Source ID (Masked)</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Target ID (Masked)</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={onToggleSimilaritySort}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' }}
                  >
                    Similarity Score
                    <span style={{ display: 'inline-block', transform: similaritySortOrder === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}>
                      ▼
                    </span>
                  </button>
                </th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Risk Level</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((comparison) => (
                <tr key={comparison.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                  <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{comparison.source_student}</td>
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{comparison.target_student}</span>
                    {comparison.comparison_type === 'cross_repo' && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', background: '#ede9fe', color: '#7c3aed', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                        REPO
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: comparison.score > 80 ? '#dc2626' : comparison.score > 60 ? '#d97706' : 'var(--text-primary)' }}>
                    {comparison.score.toFixed(1)}%
                  </td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    {comparison.score > 80 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                        <AlertTriangle size={14} /> High Risk
                      </span>
                    ) : comparison.score > 60 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontSize: '0.85rem', fontWeight: 600 }}>
                        <AlertTriangle size={14} /> Review
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <CheckCircle size={14} /> Normal
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                    <Link to={`/instructor/compare/${comparison.id}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--bg-surface)' }}>
                      Inspect Match
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default PairwiseResultsTab;
