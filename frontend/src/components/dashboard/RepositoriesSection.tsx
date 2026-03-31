import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, Code, Database, Trash2 } from 'lucide-react';
import type { Repository } from '../../types/dashboard';

interface RepositoriesSectionProps {
  repos: Repository[];
  onUpload: () => void;
  onDelete: (repoId: string, repoName: string) => void;
}

const RepositoriesSection: React.FC<RepositoriesSectionProps> = ({ repos, onUpload, onDelete }) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <section style={{ marginTop: '1.25rem' }}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '0.5rem 0',
          marginBottom: expanded ? '0.6rem' : 0,
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '1.05rem',
          }}
        >
          <Database size={16} style={{ color: '#7c3aed' }} />
          Repository Library
          <span
            style={{
              fontSize: '0.75rem',
              background: '#ede9fe',
              color: '#7c3aed',
              borderRadius: 'var(--radius-full)',
              padding: '0.1rem 0.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {repos.length}
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-tertiary)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {expanded && (
        <>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-tertiary)', margin: '0 0 0.65rem 0.1rem' }}>
            Upload past submissions to compare against current assignments.
          </p>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {repos.map((repo, index) => (
            <motion.div
              key={repo.id}
              className="glass-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}
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
        </div>
      )}
        </>
      )}
    </section>
  );
};

export default RepositoriesSection;
