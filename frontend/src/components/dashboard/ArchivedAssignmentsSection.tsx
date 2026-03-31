import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, BookOpen, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { Assignment } from '../../types/dashboard';

interface ArchivedAssignmentsSectionProps {
  assignments: Assignment[];
  formatDeadline: (deadline: string) => string;
  navigate: (path: string) => void;
}

const ArchivedAssignmentsSection: React.FC<ArchivedAssignmentsSectionProps> = ({
  assignments,
  formatDeadline,
  navigate,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem 0',
          marginBottom: '1rem',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <Archive size={18} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Archived Assignments
        </span>
        <span style={{ fontSize: '0.8rem', background: 'var(--bg-surface-highest)', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-full)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {assignments.length}
        </span>
        <ChevronDown
          size={16}
          style={{
            marginLeft: 'auto',
            color: 'var(--text-tertiary)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {assignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  className="glass-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', opacity: 0.85 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.25rem 0.6rem', background: 'var(--bg-surface-highest)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={12} /> {assignment.course}
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', background: '#ede9fe', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Archived
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    {assignment.title}
                  </h3>

                  <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} />
                      <span>Closed: {formatDeadline(assignment.deadline)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {assignment.count}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Submissions</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    <button
                      onClick={() => navigate(`/instructor/assignment/${assignment.id}`)}
                      className="btn btn-outline"
                      style={{ flex: 1, display: 'flex', justifyContent: 'space-between', background: 'var(--bg-surface-raised)' }}
                    >
                      View Details <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArchivedAssignmentsSection;
