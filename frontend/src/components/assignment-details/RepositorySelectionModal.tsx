import React from 'react';
import { Play } from 'lucide-react';
import type { AssignmentRepositoryItem } from './types';

interface RepositorySelectionModalProps {
  isOpen: boolean;
  repositories: AssignmentRepositoryItem[];
  selectedRepoIds: string[];
  onClose: () => void;
  onToggleRepo: (repoId: string) => void;
  onRunAnalysis: () => void;
}

const RepositorySelectionModal: React.FC<RepositorySelectionModalProps> = ({
  isOpen,
  repositories,
  selectedRepoIds,
  onClose,
  onToggleRepo,
  onRunAnalysis,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: 'min(480px, calc(100vw - 1rem))',
          maxHeight: 'calc(100vh - 1.5rem)',
          overflowY: 'auto',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Compare Against Repositories</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Select one or more repositories to compare current submissions against. Internal N x N analysis will also run.
        </p>

        {repositories.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No repositories available. Upload a repository or archive an assignment first.
          </div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {repositories.map((repo) => (
              <label
                key={repo.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: selectedRepoIds.includes(repo.id) ? '#ede9fe' : 'var(--bg-surface)',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRepoIds.includes(repo.id)}
                  onChange={() => onToggleRepo(repo.id)}
                  style={{ accentColor: '#7c3aed' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{repo.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {repo.language} · {repo.submission_count} submissions
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={selectedRepoIds.length === 0} onClick={onRunAnalysis}>
            <Play size={14} fill="currentColor" /> Run Cross-Repo Analysis ({selectedRepoIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepositorySelectionModal;
