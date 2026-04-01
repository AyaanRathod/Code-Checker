import React, { useMemo, useState } from 'react';
import type { AssignmentComparisonItem } from './types';
import { buildCollusionGraphData } from './assignmentDetailsUtils';

interface CollusionClusterTabProps {
  comparisons: AssignmentComparisonItem[];
  onInspectComparison: (comparisonId: string) => void;
}

const CLUSTER_COLORS = ['#dc2626', '#ea580c', '#d97706', '#0f766e', '#2563eb', '#7c3aed', '#be185d'];

const CollusionClusterTab: React.FC<CollusionClusterTabProps> = ({ comparisons, onInspectComparison }) => {
  const [minClusterScore, setMinClusterScore] = useState(70);
  const [focusClusterId, setFocusClusterId] = useState<number | null>(null);

  const graphData = useMemo(
    () => buildCollusionGraphData(comparisons, minClusterScore, { width: 900, height: 530 }),
    [comparisons, minClusterScore]
  );

  const visibleClusterIds = new Set(
    focusClusterId ? graphData.clusters.filter((cluster) => cluster.id === focusClusterId).map((cluster) => cluster.id) : graphData.clusters.map((cluster) => cluster.id)
  );

  const visibleNodes = graphData.nodes.filter((node) => visibleClusterIds.has(node.clusterId));
  const nodeMap = new Map(visibleNodes.map((node) => [node.id, node]));
  const visibleEdges = graphData.edges.filter(
    (edge) => nodeMap.has(edge.from) && nodeMap.has(edge.to)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.2rem' }}>Collusion Cluster Graph</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Suspicious groups are formed from connected internal comparisons above the selected threshold.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Cluster Threshold
            <select
              value={minClusterScore}
              onChange={(event) => {
                setMinClusterScore(Number(event.target.value));
                setFocusClusterId(null);
              }}
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.55rem',
                fontWeight: 600,
                minWidth: '118px',
              }}
            >
              <option value={60}>60% +</option>
              <option value={70}>70% +</option>
              <option value={80}>80% +</option>
              <option value={90}>90% +</option>
            </select>
          </label>
          {focusClusterId && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ marginTop: '1.15rem' }}
              onClick={() => setFocusClusterId(null)}
            >
              Reset Focus
            </button>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.9rem' }}>
          <div style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Clusters Found</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{graphData.clusters.length}</div>
          </div>
          <div style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Flagged Pairs</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{graphData.edges.length}</div>
          </div>
          <div style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Internal Comparisons</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{graphData.totalInternalPairs}</div>
          </div>
        </div>

        {visibleEdges.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.8rem 0.5rem' }}>
            No collusion clusters at {minClusterScore}% threshold. Lower the threshold to explore weaker links.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <svg width="900" height="530" viewBox="0 0 900 530" role="img" aria-label="Collusion cluster graph">
              <defs>
                <pattern id="clusterGridPattern" width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                </pattern>
              </defs>

              <rect x="0" y="0" width="900" height="530" fill="url(#clusterGridPattern)" />

              {visibleEdges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                const intensity = Math.min(1, Math.max(0.22, edge.score / 100));
                const highlighted = focusClusterId ? from.clusterId === focusClusterId : true;
                return (
                  <line
                    key={`edge-${edge.id}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={`rgba(220, 38, 38, ${highlighted ? intensity : 0.12})`}
                    strokeWidth={Math.max(1.5, (edge.score - minClusterScore) / 8 + 2)}
                    strokeLinecap="round"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onInspectComparison(edge.comparisonId)}
                  >
                    <title>{`${from.fullLabel} <> ${to.fullLabel}: ${edge.score.toFixed(1)}% (click to inspect)`}</title>
                  </line>
                );
              })}

              {visibleNodes.map((node) => {
                const color = CLUSTER_COLORS[(node.clusterId - 1) % CLUSTER_COLORS.length];
                const highlighted = focusClusterId ? node.clusterId === focusClusterId : true;
                return (
                  <g key={`node-${node.id}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      fill={color}
                      fillOpacity={highlighted ? 0.96 : 0.24}
                      stroke="#ffffff"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setFocusClusterId(node.clusterId)}
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill="#fff"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.display}
                    </text>
                    <title>{`${node.fullLabel} (Cluster #${node.clusterId})`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {graphData.clusters.length > 0 && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1rem' }}>Flagged Groups</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {graphData.clusters.map((cluster) => (
              <button
                key={`cluster-card-${cluster.id}`}
                type="button"
                onClick={() => setFocusClusterId((prev) => (prev === cluster.id ? null : cluster.id))}
                style={{
                  border: cluster.risk === 'High Risk' ? '1px solid rgba(220,38,38,0.45)' : '1px solid var(--border-subtle)',
                  background: focusClusterId === cluster.id ? 'rgba(220,38,38,0.06)' : 'var(--bg-surface-raised)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.7rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Cluster #{cluster.id}</strong>
                  <span style={{
                    fontSize: '0.73rem',
                    padding: '0.18rem 0.42rem',
                    borderRadius: '999px',
                    background: cluster.risk === 'High Risk' ? 'rgba(220,38,38,0.12)' : 'rgba(245,158,11,0.12)',
                    color: cluster.risk === 'High Risk' ? '#b91c1c' : '#b45309',
                    fontWeight: 700,
                  }}>{cluster.risk}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.42rem' }}>
                  {cluster.members.length} members, {cluster.pairCount} linked pair(s), max {cluster.maxScore.toFixed(1)}%, avg {cluster.avgScore.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  {cluster.memberLabels.join(', ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollusionClusterTab;
