import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Code, Database, Trash2 } from 'lucide-react';
import type { Repository } from '../../types/dashboard';

interface RepositoriesSectionProps {
  repos: Repository[];
  onUpload: () => void;
  onDelete: (repoId: string, repoName: string) => void;
}

const RepositoriesSection: React.FC<RepositoriesSectionProps> = ({ repos, onUpload, onDelete }) => {
  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <Database size={18} style={{ color: '#7c3aed' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Submission Repositories</h2>
            {repos.length > 0 && (
              <span style={{ fontSize: '0.8rem', background: '#ede9fe', padding: '0.1rem 0.55rem', borderRadius: 'var(--radius-full)', color: '#7c3aed', fontWeight: 600 }}>
                {repos.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>
            Upload past submissions to compare against current assignments.
          </p>
        </div>
        <button className="btn btn-outline" onClick={onUpload} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem', borderColor: '#7c3aed', color: '#7c3aed' }}>
          <Database size={15} /> Upload Repository
        </button>
      </div>

      {repos.length === 0 ? (
        <div
          onClick={onUpload}
          style={{
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: 'var(--bg-surface)',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = '#7c3aed';
            event.currentTarget.style.background = '#faf5ff';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = 'var(--border-strong)';
            event.currentTarget.style.background = 'var(--bg-surface)';
          }}
        >
          <Database size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem auto', display: 'block', color: '#7c3aed' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>
            No repositories yet
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
            Upload past semester submissions to detect cross-semester plagiarism, or archive an assignment to auto-create one.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {repos.map((repo, index) => (
            <motion.div
              key={repo.id}
              className="glass-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              style={{ padding: '1.25rem', minWidth: '280px', maxWidth: '320px', flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.2rem 0.5rem', background: '#ede9fe', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 600, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Database size={11} /> Repository
                </div>
                <button
                  onClick={() => onDelete(repo.id, repo.name)}
                  title="Delete repository"
                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = '#dc2626';
                    event.currentTarget.style.borderColor = '#dc2626';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = 'var(--text-tertiary)';
                    event.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {repo.name}
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Code size={12} /> {repo.language}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={12} />{' '}
                  {repo.created_at
                    ? new Date(repo.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
                    : '—'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {repo.submission_count}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>submissions</span>
              </div>

              {repo.source_assignment_id && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Auto-created from archived assignment
                </div>
              )}
            </motion.div>
          ))}

          <div
            onClick={onUpload}
            style={{
              minWidth: '200px',
              flex: '0 0 auto',
              border: '2px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              gap: '0.5rem',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = '#7c3aed';
              event.currentTarget.style.background = '#faf5ff';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = 'var(--border-strong)';
              event.currentTarget.style.background = 'transparent';
            }}
          >
            <Database size={20} style={{ color: '#7c3aed', opacity: 0.5 }} />
            <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>Upload More</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoriesSection;
