import React from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface AnalyticsMetrics {
  total: number;
  highRisk: number;
  avg: number;
  distribution: number[];
  maxInDist: number;
}

interface AnalyticsOverviewTabProps {
  metrics: AnalyticsMetrics;
  isMobileLayout: boolean;
}

const AnalyticsOverviewTab: React.FC<AnalyticsOverviewTabProps> = ({ metrics, isMobileLayout }) => {
  return (
    <>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Analytics Overview</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid var(--brand-secondary)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Activity size={14} /> Computed Matches
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.total}</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <AlertTriangle size={14} color="#dc2626" /> Critical Flag (&gt;80%)
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>{metrics.highRisk}</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <CheckCircle size={14} color="#10b981" /> Average Similarity
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{metrics.avg.toFixed(1)}%</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Similarity Distribution Model</h3>

        {metrics.total === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)' }}>No data to graph yet.</div>
        ) : (
          <div style={{ overflowX: isMobileLayout ? 'auto' : 'visible', paddingBottom: isMobileLayout ? '0.35rem' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '180px', minWidth: isMobileLayout ? '460px' : 'unset', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-strong)', position: 'relative' }}>
              {metrics.distribution.map((val, idx) => {
                const heightPercentage = (val / metrics.maxInDist) * 100;
                const labels = isMobileLayout ? ['0-20', '21-40', '41-60', '61-80', '81-100'] : ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
                const colors = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#dc2626'];

                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1, type: 'spring' }}
                      style={{
                        width: '100%',
                        maxWidth: '80px',
                        background: colors[idx],
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        minHeight: val > 0 ? '4px' : '0'
                      }}
                    >
                      {val > 0 && (
                        <span style={{ position: 'absolute', top: '-23px', width: '100%', textAlign: 'center', fontSize: isMobileLayout ? '0.76rem' : '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {val}
                        </span>
                      )}
                    </motion.div>
                    <span style={{ position: 'absolute', bottom: '-25px', fontSize: isMobileLayout ? '0.72rem' : '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{labels[idx]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AnalyticsOverviewTab;
