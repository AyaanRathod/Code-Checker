import React from 'react';
import type { AssignmentComparisonItem } from './types';
import { buildUniqueMatrixIds, findComparisonPair } from './assignmentDetailsUtils';

interface SimilarityMatrixTabProps {
  comparisons: AssignmentComparisonItem[];
  onInspectComparison: (comparisonId: string) => void;
}

/** Smooth linear interpolation between two [r,g,b] triples */
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const b2 = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${b2})`;
}

const COLOR_STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0,   rgb: [241, 245, 249] }, // slate-100 — zero / no match
  { at: 20,  rgb: [219, 234, 254] }, // blue-100
  { at: 40,  rgb: [147, 197, 253] }, // blue-300
  { at: 60,  rgb: [253, 224, 132] }, // amber-200
  { at: 75,  rgb: [249, 115,  22] }, // orange-500
  { at: 90,  rgb: [220,  38,  38] }, // red-600
  { at: 100, rgb: [153,  27,  27] }, // red-800
];

function getMatrixCellColor(score: number | undefined): string {
  if (score === undefined || score <= 0) return `rgb(${COLOR_STOPS[0].rgb.join(',')})`;
  const clamped = Math.min(100, Math.max(0, score));
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    if (clamped <= COLOR_STOPS[i].at) {
      const prev = COLOR_STOPS[i - 1];
      const next = COLOR_STOPS[i];
      const t = (clamped - prev.at) / (next.at - prev.at);
      return lerpColor(prev.rgb, next.rgb, t);
    }
  }
  return `rgb(${COLOR_STOPS[COLOR_STOPS.length - 1].rgb.join(',')})`;
}

function getTextColor(score: number | undefined): string {
  if (score === undefined) return 'var(--text-tertiary)';
  if (score >= 60) return '#fff';
  if (score >= 20) return '#1e40af';
  return 'var(--text-tertiary)';
}

const DIAGONAL_BG =
  'repeating-linear-gradient(45deg, #e2e8f0 0px, #e2e8f0 3px, #f8fafc 3px, #f8fafc 9px)';

const CELL_SIZE = 34;
const HEADER_WIDTH = 90;

const SimilarityMatrixTab: React.FC<SimilarityMatrixTabProps> = ({ comparisons, onInspectComparison }) => {
  const studentKeys = buildUniqueMatrixIds(comparisons);

  const toShortId = (id: string) => (id.length > 9 ? `${id.slice(0, 9)}…` : id);

  if (studentKeys.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        No matrix data available yet.
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.2rem' }}>Similarity Heatmap</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Click any cell to inspect that pair. Darker red = higher similarity.
          </p>
        </div>

        {/* Inline legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <span>Low</span>
          <div style={{
            width: '120px', height: '10px', borderRadius: '99px',
            background: 'linear-gradient(90deg, rgb(241,245,249) 0%, rgb(147,197,253) 30%, rgb(253,224,132) 55%, rgb(249,115,22) 75%, rgb(220,38,38) 100%)',
            border: '1px solid var(--border-subtle)'
          }} />
          <span>High</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.5rem' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: DIAGONAL_BG, border: '1px solid var(--border-subtle)' }} />
            <span>Self</span>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1rem', overflow: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '3px', margin: 0, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {/* Corner spacer */}
              <th style={{ width: `${HEADER_WIDTH}px`, minWidth: `${HEADER_WIDTH}px` }} />
              {studentKeys.map((key) => (
                <th
                  key={`col-${key}`}
                  style={{
                    width: `${CELL_SIZE}px`,
                    minWidth: `${CELL_SIZE}px`,
                    height: '90px',
                    padding: 0,
                    verticalAlign: 'bottom',
                  }}
                  title={key}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    height: '90px',
                    paddingBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      writingMode: 'vertical-lr',
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}>
                      {toShortId(key)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {studentKeys.map((rowKey) => (
              <tr key={`row-${rowKey}`}>
                {/* Sticky row label */}
                <th
                  title={rowKey}
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    background: 'var(--bg-surface)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    textAlign: 'right',
                    paddingRight: '0.5rem',
                    whiteSpace: 'nowrap',
                    fontWeight: 400,
                    width: `${HEADER_WIDTH}px`,
                    minWidth: `${HEADER_WIDTH}px`,
                    // Fade edge so cells don't bleed through
                    boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
                  }}
                >
                  {toShortId(rowKey)}
                </th>

                {studentKeys.map((colKey) => {
                  const isSelf = rowKey === colKey;

                  if (isSelf) {
                    return (
                      <td
                        key={`cell-${rowKey}-${colKey}`}
                        title="Same submission"
                        style={{
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                          background: DIAGONAL_BG,
                          borderRadius: '5px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      />
                    );
                  }

                  const comparison = findComparisonPair(comparisons, rowKey, colKey);
                  const score = comparison?.score;
                  const bg = getMatrixCellColor(score);
                  const fg = getTextColor(score);
                  const isHigh = score !== undefined && score >= 60;

                  return (
                    <td
                      key={`cell-${rowKey}-${colKey}`}
                      className="heatmap-cell"
                      onClick={() => { if (comparison) onInspectComparison(comparison.id); }}
                      title={
                        score !== undefined
                          ? `${toShortId(rowKey)} vs ${toShortId(colKey)}: ${score.toFixed(1)}%${comparison ? ' — click to inspect' : ''}`
                          : `${toShortId(rowKey)} vs ${toShortId(colKey)}: no data`
                      }
                      style={{
                        width: `${CELL_SIZE}px`,
                        height: `${CELL_SIZE}px`,
                        background: bg,
                        borderRadius: '5px',
                        textAlign: 'center',
                        fontSize: '0.67rem',
                        fontWeight: isHigh ? 700 : 500,
                        color: fg,
                        border: isHigh ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-subtle)',
                        cursor: comparison ? 'pointer' : 'default',
                        verticalAlign: 'middle',
                        lineHeight: `${CELL_SIZE}px`,
                        padding: 0,
                        transition: 'filter 0.12s ease',
                      }}
                    >
                      {score !== undefined ? Math.round(score) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimilarityMatrixTab;
