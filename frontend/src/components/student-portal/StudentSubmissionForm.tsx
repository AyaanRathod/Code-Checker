import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Badge, File as FileIcon, FileCode2, Key, UploadCloud, User, X } from 'lucide-react';
import { ACCEPTED_UPLOAD, formatKb } from './studentPortalUtils';
import type { PreviewFile, StudentSubmissionFormState } from './types';

interface StudentSubmissionFormProps {
  formState: StudentSubmissionFormState;
  file: File | null;
  previewFiles: PreviewFile[];
  loading: boolean;
  isMobileLayout: boolean;
  error: string;
  dragActive: boolean;
  dragHandlers: Pick<React.HTMLAttributes<HTMLDivElement>, 'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'>;
  showZipNoValidFilesWarning: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onFieldChange: (field: keyof StudentSubmissionFormState, value: string) => void;
  onInputFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}

const StudentSubmissionForm: React.FC<StudentSubmissionFormProps> = ({
  formState,
  file,
  previewFiles,
  loading,
  isMobileLayout,
  error,
  dragActive,
  dragHandlers,
  showZipNoValidFilesWarning,
  onSubmit,
  onFieldChange,
  onInputFileChange,
  onClearFile,
}) => {
  const inputIdAccessKey = 'student-access-key';
  const inputIdStudentName = 'student-name';
  const inputIdStudentId = 'student-id';
  const inputIdSubmissionFile = 'submission-file-input';
  const formErrorId = 'student-submission-form-error';
  const acceptedUploadList = ACCEPTED_UPLOAD.join(',');

  return (
    <form onSubmit={onSubmit}>
      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label htmlFor={inputIdAccessKey} className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Access Key</label>
        <div className="input-with-icon">
          <Key />
          <input id={inputIdAccessKey} type="text" className="form-input" style={{ background: 'var(--bg-surface)' }} placeholder="e.g. A1-B2C3" value={formState.accessKey} onChange={(event) => onFieldChange('accessKey', event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? formErrorId : undefined} disabled={loading} required />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label htmlFor={inputIdStudentName} className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Student Name</label>
        <div className="input-with-icon">
          <User />
          <input id={inputIdStudentName} type="text" className="form-input" style={{ background: 'var(--bg-surface)' }} placeholder="John Doe" value={formState.studentName} onChange={(event) => onFieldChange('studentName', event.target.value)} autoComplete="name" aria-invalid={Boolean(error)} aria-describedby={error ? formErrorId : undefined} disabled={loading} required />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label htmlFor={inputIdStudentId} className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Student ID</label>
        <div className="input-with-icon">
          <Badge />
          <input id={inputIdStudentId} type="text" className="form-input" style={{ background: 'var(--bg-surface)' }} placeholder="1234567" value={formState.studentId} onChange={(event) => onFieldChange('studentId', event.target.value)} inputMode="numeric" autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? formErrorId : undefined} disabled={loading} required />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
        <label htmlFor={inputIdSubmissionFile} className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 600 }}>File Submission</label>
        <div
          {...dragHandlers}
          onClick={() => document.getElementById(inputIdSubmissionFile)?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              document.getElementById(inputIdSubmissionFile)?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload submission file"
          aria-disabled={loading}
          style={{
            border: `2px dashed ${dragActive ? 'var(--brand-red)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            textAlign: 'center',
            background: dragActive ? '#fef2f2' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          className="file-drop-area"
        >
          <input id={inputIdSubmissionFile} type="file" onChange={onInputFileChange} accept={acceptedUploadList} style={{ display: 'none' }} disabled={loading} />

          {dragActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
              <UploadCloud size={36} color="var(--brand-red)" />
              <span style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9rem' }}>Drop your file here</span>
            </div>
          ) : file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'relative', width: '100%' }}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClearFile();
                }}
                title="Remove file"
                style={{
                  position: 'absolute',
                  top: '-0.25rem',
                  right: '-0.25rem',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface-highest)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
                disabled={loading}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = '#fef2f2';
                  event.currentTarget.style.color = '#dc2626';
                  event.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'var(--bg-surface-highest)';
                  event.currentTarget.style.color = 'var(--text-tertiary)';
                  event.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <X size={12} />
              </button>
              <FileCode2 size={40} color="var(--brand-red)" />
              <span
                title={file.name}
                style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  maxWidth: '100%',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  padding: '0 1.7rem 0 0.25rem',
                }}
              >
                {file.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{formatKb(file.size)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>Click to replace</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--bg-surface-highest)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <UploadCloud size={24} color="var(--text-secondary)" />
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--brand-red)', fontWeight: 600 }}>{isMobileLayout ? 'Tap to upload a file' : 'Upload a file'}</span>
                {!isMobileLayout ? ' or drag and drop' : ''}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', textAlign: 'center' }}>Supports .zip, .c, .cpp, .java, .h up to 50MB</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {file && previewFiles.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: '0.75rem' }}>
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{ padding: '0.55rem 0.85rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {previewFiles.length} source file{previewFiles.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {previewFiles.map((preview, index) => (
                    <div
                      key={`${preview.name}-${index}`}
                      style={{
                        padding: '0.4rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: index < previewFiles.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                        <FileIcon size={12} color="var(--brand-red)" style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.name}</span>
                      </div>
                      {preview.size > 0 && (
                        <span style={{ flexShrink: 0, marginLeft: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                          {formatKb(preview.size)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showZipNoValidFilesWarning && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            No .java, .c, .cpp, or .h files found in this archive.
          </div>
        )}
      </div>

      {error && (
        <motion.div id={formErrorId} role="alert" aria-live="assertive" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', marginBottom: '1.25rem', fontSize: '0.85rem', textAlign: 'center' }}>
          {error}
        </motion.div>
      )}

      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: isMobileLayout ? '0.95rem' : '1rem', borderRadius: 'var(--radius-sm)' }} disabled={loading}>
        {loading ? 'Processing...' : 'Submit'} <ArrowRight size={16} style={{ marginLeft: '0.45rem' }} />
      </button>
      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Need help? <a href="mailto:faculty@brocku.ca?subject=CodeSimilar%20Submission%20Help" style={{ color: 'var(--brand-red)', fontWeight: 600 }}>Contact Support</a>
      </div>
    </form>
  );
};

export default StudentSubmissionForm;
