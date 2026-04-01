import React from 'react';
import { Database, GitCommit, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Rows2, Users } from 'lucide-react';
import type { TabView } from './types';

interface AssignmentDetailsSidebarProps {
  activeTab: TabView;
  submissionsCount: number;
  assignmentStatus: string;
  isMobileLayout: boolean;
  isSidebarCollapsed: boolean;
  onTabChange: (tab: TabView) => void;
  onToggleSidebar: () => void;
}

const AssignmentDetailsSidebar: React.FC<AssignmentDetailsSidebarProps> = ({
  activeTab,
  submissionsCount,
  assignmentStatus,
  isMobileLayout,
  isSidebarCollapsed,
  onTabChange,
  onToggleSidebar,
}) => {
  const showArchiveOnlyTabs = assignmentStatus === 'Archived';

  return (
    <aside
      style={{
        width: isMobileLayout ? '100%' : isSidebarCollapsed ? '74px' : '240px',
        background: 'var(--bg-surface-raised)',
        borderRight: isMobileLayout ? 'none' : '1px solid var(--border-subtle)',
        borderBottom: isMobileLayout ? '1px solid var(--border-subtle)' : 'none',
        padding: isMobileLayout ? '0.4rem' : '0.7rem 0.5rem',
        display: 'flex',
        flexDirection: isMobileLayout ? 'row' : 'column',
        gap: '0.25rem',
        overflowX: isMobileLayout ? 'auto' : 'visible',
        transition: 'width 0.2s ease',
      }}
    >
      {!isMobileLayout && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            marginBottom: '0.3rem',
            padding: isSidebarCollapsed ? '0' : '0 0.35rem',
          }}
        >
          {!isSidebarCollapsed && (
            <h3
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: 0,
              }}
            >
              Reports Engine
            </h3>
          )}
          <button
            type="button"
            className="btn btn-outline"
            onClick={onToggleSidebar}
            style={{ padding: '0.28rem 0.42rem', fontSize: '0.72rem' }}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>
      )}

      <button
        onClick={() => onTabChange('submissions')}
        className={`sidebar-tab ${activeTab === 'submissions' ? 'active' : ''}`}
        style={{
          justifyContent: isMobileLayout ? 'flex-start' : isSidebarCollapsed ? 'center' : 'flex-start',
          padding: isSidebarCollapsed && !isMobileLayout ? '0.7rem 0.45rem' : undefined,
        }}
        title="Submissions"
      >
        <Users size={18} /> {!isSidebarCollapsed || isMobileLayout ? 'Submissions' : ''}
        {(!isSidebarCollapsed || isMobileLayout) && submissionsCount > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              background: 'var(--bg-surface)',
              padding: '0.1rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {submissionsCount}
          </span>
        )}
      </button>

      {!showArchiveOnlyTabs && (
        <>
          <button
            onClick={() => onTabChange('overview')}
            className={`sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
            style={{
              justifyContent: isMobileLayout ? 'flex-start' : isSidebarCollapsed ? 'center' : 'flex-start',
              padding: isSidebarCollapsed && !isMobileLayout ? '0.7rem 0.45rem' : undefined,
            }}
            title="Analytics Overview"
          >
            <LayoutDashboard size={18} /> {!isSidebarCollapsed || isMobileLayout ? 'Analytics Overview' : ''}
          </button>

          <button
            onClick={() => onTabChange('results')}
            className={`sidebar-tab ${activeTab === 'results' ? 'active' : ''}`}
            style={{
              justifyContent: isMobileLayout ? 'flex-start' : isSidebarCollapsed ? 'center' : 'flex-start',
              padding: isSidebarCollapsed && !isMobileLayout ? '0.7rem 0.45rem' : undefined,
            }}
            title="Pairwise Similarities"
          >
            <Database size={18} /> {!isSidebarCollapsed || isMobileLayout ? 'Pairwise Similarities' : ''}
          </button>

          <button
            onClick={() => onTabChange('clusters')}
            className={`sidebar-tab ${activeTab === 'clusters' ? 'active' : ''}`}
            style={{
              justifyContent: isMobileLayout ? 'flex-start' : isSidebarCollapsed ? 'center' : 'flex-start',
              padding: isSidebarCollapsed && !isMobileLayout ? '0.7rem 0.45rem' : undefined,
            }}
            title="Collusion Cluster Graph"
          >
            <GitCommit size={18} /> {!isSidebarCollapsed || isMobileLayout ? 'Collusion Cluster Graph' : ''}
          </button>

          <button
            onClick={() => onTabChange('heatmap')}
            className={`sidebar-tab ${activeTab === 'heatmap' ? 'active' : ''}`}
            style={{
              justifyContent: isMobileLayout ? 'flex-start' : isSidebarCollapsed ? 'center' : 'flex-start',
              padding: isSidebarCollapsed && !isMobileLayout ? '0.7rem 0.45rem' : undefined,
            }}
            title="Similarity Heatmap"
          >
            <Rows2 size={18} /> {!isSidebarCollapsed || isMobileLayout ? 'Similarity Heatmap' : ''}
          </button>
        </>
      )}
    </aside>
  );
};

export default AssignmentDetailsSidebar;
