import React from 'react';
import { Plus } from 'lucide-react';
import type { AssignmentFilter, DashboardStats } from '../../types/dashboard';

interface DashboardHeaderStatsProps {
  stats: DashboardStats;
  assignmentQuery: string;
  assignmentFilter: AssignmentFilter;
  onAssignmentQueryChange: (value: string) => void;
  onAssignmentFilterChange: (value: AssignmentFilter) => void;
  onClearFilters: () => void;
  onOpenCreateModal: () => void;
}

const DashboardHeaderStats: React.FC<DashboardHeaderStatsProps> = ({
  stats,
  assignmentQuery,
  assignmentFilter,
  onAssignmentQueryChange,
  onAssignmentFilterChange,
  onClearFilters,
  onOpenCreateModal,
}) => {
  return (
    <div className="glass-card" style={{ padding: '1.15rem 1.15rem 1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', marginBottom: '0.2rem' }}>Instructor Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Quickly review active courses, risk hotspots, and repository coverage.</p>
        </div>
        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={18} /> New Assignment
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <div style={{ padding: '0.65rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Assignments</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.activeCount}</div>
        </div>
        <div style={{ padding: '0.65rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Submissions</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.totalSubmissions}</div>
        </div>
        <div style={{ padding: '0.65rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repositories</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.repoCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.6rem', alignItems: 'center' }}>
        <input
          type="text"
          value={assignmentQuery}
          onChange={(event) => onAssignmentQueryChange(event.target.value)}
          placeholder="Search by title, course, or access key"
          className="form-input"
          style={{ height: '2.25rem' }}
        />
        <select
          value={assignmentFilter}
          onChange={(event) => onAssignmentFilterChange(event.target.value as AssignmentFilter)}
          className="form-input"
          style={{ height: '2.25rem' }}
        >
          <option value="All">All statuses</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        <button
          type="button"
          className="btn btn-outline"
          onClick={onClearFilters}
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap', justifySelf: 'start' }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default DashboardHeaderStats;
