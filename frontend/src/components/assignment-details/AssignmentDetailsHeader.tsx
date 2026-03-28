import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Archive, BookOpen, ChevronDown, Clock, Database, Download, Play } from 'lucide-react';
import type { AssignmentDetailsModel } from './types';

interface AssignmentDetailsHeaderProps {
  assignment: AssignmentDetailsModel;
  comparisonsCount: number;
  repositoriesCount: number;
  triggering: boolean;
  downloading: boolean;
  isMobileLayout: boolean;
  showAnalysisMenu: boolean;
  onBack: () => void;
  onDownloadSubmissions: () => void;
  onRunAnalysis: () => void;
  onToggleAnalysisMenu: () => void;
  onCloseAnalysisMenu: () => void;
  onOpenRepoModal: () => void;
}

const AssignmentDetailsHeader: React.FC<AssignmentDetailsHeaderProps> = ({
  assignment,
  comparisonsCount,
  repositoriesCount,
  triggering,
  downloading,
  isMobileLayout,
  showAnalysisMenu,
  onBack,
  onDownloadSubmissions,
  onRunAnalysis,
  onToggleAnalysisMenu,
  onCloseAnalysisMenu,
  onOpenRepoModal,
}) => {
  return (
    <>
      {showAnalysisMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onCloseAnalysisMenu} />}

      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '0.6rem 0.85rem',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <button onClick={onBack} className="btn btn-outline" style={{ border: 'none', padding: 0, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: isMobileLayout ? '1.1rem' : '1.5rem', margin: 0 }}>{assignment.title}</h1>
              <span
                style={{
                  background: assignment.status === 'Archived' ? '#ede9fe' : assignment.status === 'Open' ? '#f1f5f9' : '#ecfdf5',
                  color: assignment.status === 'Archived' ? '#7c3aed' : assignment.status === 'Open' ? '#64748b' : '#059669',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {assignment.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.9rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen size={14} /> {assignment.course}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} /> Deadline: {new Date(assignment.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={onDownloadSubmissions} disabled={downloading} style={{ background: 'var(--bg-surface)' }}>
              <Archive size={16} /> {downloading ? 'Downloading...' : 'Download Submissions'}
            </button>
            {assignment.status !== 'Archived' && (
              <>
                <button className="btn btn-outline" disabled={comparisonsCount === 0} style={{ background: 'var(--bg-surface)' }}>
                  <Download size={16} /> PDF Report
                </button>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex' }}>
                    <button
                      className="btn btn-primary"
                      onClick={onRunAnalysis}
                      disabled={triggering}
                      style={{
                        borderTopRightRadius: repositoriesCount > 0 ? 0 : undefined,
                        borderBottomRightRadius: repositoriesCount > 0 ? 0 : undefined,
                      }}
                    >
                      <Play size={16} fill="currentColor" /> {triggering ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                    {repositoriesCount > 0 && (
                      <button
                        className="btn btn-primary"
                        onClick={onToggleAnalysisMenu}
                        disabled={triggering}
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem' }}
                      >
                        <ChevronDown size={16} />
                      </button>
                    )}
                  </div>
                  {showAnalysisMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.25rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        minWidth: '260px',
                        zIndex: 50,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={onRunAnalysis}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'left' }}
                        className="table-row-hover"
                      >
                        <Play size={14} /> Internal Analysis Only
                      </button>
                      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
                      <button
                        onClick={onOpenRepoModal}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'left' }}
                        className="table-row-hover"
                      >
                        <Database size={14} /> Compare Against Repositories...
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AssignmentDetailsHeader;
