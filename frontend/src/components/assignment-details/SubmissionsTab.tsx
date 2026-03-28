import React from 'react';
import { Users, FileCode, Hash, Clock, Flag } from 'lucide-react';

interface SubmissionsTabProps {
  submissions: any[];
  formatBytes: (bytes: number) => string;
  isMobileLayout: boolean;
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({ submissions, formatBytes, isMobileLayout }) => {
  const totalSubs = submissions.length;
  const totalFiles = submissions.reduce((sum: number, s: any) => sum + (s.file_count || 0), 0);
  const totalLines = submissions.reduce((sum: number, s: any) => sum + (s.total_lines || 0), 0);
  const avgFiles = totalSubs > 0 ? (totalFiles / totalSubs).toFixed(1) : 0;
  const avgLines = totalSubs > 0 ? Math.round(totalLines / totalSubs) : 0;
  const latestTime = totalSubs > 0 ? submissions[0].timestamp : null;

  return (
    <>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Submissions</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid var(--brand-secondary)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={14} /> Total Submissions
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSubs}</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #6366f1', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <FileCode size={14} /> Total Files
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>{totalFiles}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>~{avgFiles} per submission</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Hash size={14} /> Avg Lines of Code
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{avgLines.toLocaleString()}</span>
        </div>

        {latestTime && (
          <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={14} /> Latest Submission
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date(latestTime).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}{' '}
              {new Date(latestTime).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>(GMT-4)</span>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Submissions Yet</h3>
            <p style={{ fontSize: '0.9rem' }}>Students haven\'t submitted any files for this assignment yet.</p>
          </div>
        ) : isMobileLayout ? (
          <div style={{ display: 'grid', gap: '0.6rem', padding: '0.6rem' }}>
            {submissions.map((s: any, i: number) => (
              <div key={s.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.7rem', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>#{i + 1}</span>
                  <span style={{ fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: 'var(--radius-full)', background: s.status === 'Active' ? '#ecfdf5' : '#f1f5f9', color: s.status === 'Active' ? '#059669' : '#64748b', fontWeight: 600 }}>{s.status}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
                  {s.masked_student_id}
                  {s.is_flagged && <Flag size={13} style={{ marginLeft: '0.5rem', color: '#dc2626', verticalAlign: 'middle' }} />}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 0.6rem', marginTop: '0.55rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                  <span>Attempt: {s.attempt_number}</span>
                  <span>Files: {s.file_count}</span>
                  <span>Lines: {s.total_lines.toLocaleString()}</span>
                  <span>Size: {formatBytes(s.total_bytes)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>#</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Student ID</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Submitted</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Attempt</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Files</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Lines</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Size</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s: any, i: number) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                  <td style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{i + 1}</td>
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {s.masked_student_id}
                    {s.is_flagged && <Flag size={13} style={{ marginLeft: '0.5rem', color: '#dc2626', verticalAlign: 'middle' }} />}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {s.timestamp ? (
                      <>
                        {new Date(s.timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}{' '}
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          {new Date(s.timestamp).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>{s.attempt_number}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{s.file_count}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{s.total_lines.toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{formatBytes(s.total_bytes)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: s.status === 'Active' ? '#ecfdf5' : '#f1f5f9',
                      color: s.status === 'Active' ? '#059669' : '#64748b'
                    }}>
                      {s.status}
                    </span>
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

export default SubmissionsTab;
