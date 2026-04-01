import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Download, File as FileIcon } from 'lucide-react';
import { formatKb } from './studentPortalUtils';
import type { SubmissionSuccessData } from './types';

interface StudentSubmissionSuccessProps {
  successData: SubmissionSuccessData;
  onSaveReceipt: () => void;
  onSubmitAnother: () => void;
  formatTimestamp: (timestamp?: string) => string;
}

const StudentSubmissionSuccess: React.FC<StudentSubmissionSuccessProps> = ({
  successData,
  onSaveReceipt,
  onSubmitAnother,
  formatTimestamp,
}) => {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
        <CheckCircle size={64} color="var(--accent-tertiary)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
      </motion.div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Submission Received</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Your file was securely processed and encrypted.</p>

      {successData.health && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.7rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.82rem',
            ...(successData.health === 'ok'
              ? { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }
              : { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }),
          }}
        >
          {successData.health === 'ok' ? <CheckCircle size={16} style={{ flexShrink: 0 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
          <span>{successData.health_message || (successData.health === 'ok' ? 'All files processed successfully.' : 'Review your submission.')}</span>
        </motion.div>
      )}

      <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Receipt ID:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{successData.submission_id || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{formatTimestamp(successData.timestamp)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Attempt:</span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{successData.attempt || 0} / 3</span>
        </div>
      </div>

      {!!successData.files?.length && (
        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left', marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Files Detected</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {successData.total_files} file{successData.total_files !== 1 ? 's' : ''} · {successData.total_lines} lines
            </span>
          </div>
          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            {successData.files?.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                style={{
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: index < (successData.files?.length || 0) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <FileIcon size={14} color="var(--brand-red)" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, marginLeft: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                  <span>{file.lines} lines</span>
                  <span>{formatKb(file.size_bytes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem' }} onClick={onSaveReceipt}>
          <Download size={15} /> Download Receipt
        </button>
        <button className="btn btn-primary" onClick={onSubmitAnother}>
          Submit Another File
        </button>
      </div>
    </div>
  );
};

export default StudentSubmissionSuccess;
