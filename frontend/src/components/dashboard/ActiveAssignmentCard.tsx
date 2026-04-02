import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Archive, BookOpen, Check, ChevronRight, Clock, Copy, Key, Pencil } from 'lucide-react';
import type { Assignment } from '../../types/dashboard';

interface ActiveAssignmentCardProps {
  assignment: Assignment;
  index: number;
  formatDeadline: (deadline: string) => string;
  openEditModal: (assignment: Assignment) => void;
  onArchive: (assignmentId: string) => void;
}

const ActiveAssignmentCard: React.FC<ActiveAssignmentCardProps> = ({
  assignment,
  index,
  formatDeadline,
  openEditModal,
  onArchive,
}) => {
  const statusColor =
    assignment.status === 'Closed' ? { bg: '#f1f5f9', fg: '#64748b' } : { bg: '#ecfdf5', fg: '#059669' };
  const [copied, setCopied] = React.useState(false);

  const handleCopyKey = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(assignment.access_key).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div
          style={{
            padding: '0.25rem 0.6rem',
            background: 'var(--bg-surface-highest)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <BookOpen size={12} /> {assignment.course}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              background: statusColor.bg,
              color: statusColor.fg,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {assignment.status}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{assignment.title}</h3>

      <div
        style={{
          padding: '0.5rem 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        <div
          onClick={handleCopyKey}
          title="Click to copy access key"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            padding: '0.15rem 0.4rem',
            margin: '-0.15rem -0.4rem',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'var(--bg-surface-highest)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
          }}
        >
          <Key size={14} color="#d97706" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{assignment.access_key}</span>
          {copied ? <Check size={13} color="#059669" /> : <Copy size={13} color="var(--text-tertiary)" />}
          {copied && <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>Copied!</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} color="var(--text-tertiary)" />
          <span>Due: {formatDeadline(assignment.deadline)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{assignment.count}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Submissions</div>
        </div>
        {assignment.flags > 0 && (
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#dc2626' }}>{assignment.flags}</div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>High Risk</div>
          </div>
        )}
      </div>

      <Link
        to={`/instructor/assignment/${assignment.id}`}
        className="btn btn-outline"
        style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-surface-raised)' }}
      >
        View Details <ChevronRight size={16} />
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: assignment.status === 'Closed' ? '1fr 1fr' : '1fr',
          gap: '0.6rem',
          marginTop: '0.65rem',
        }}
      >
        <button className="btn btn-outline" onClick={() => openEditModal(assignment)} style={{ width: '100%', justifyContent: 'center' }}>
          <Pencil size={14} /> Edit
        </button>
        {assignment.status === 'Closed' && (
          <button
            className="btn btn-outline"
            onClick={() => onArchive(assignment.id)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Archive size={14} /> Archive
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ActiveAssignmentCard;
