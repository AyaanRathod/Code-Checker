import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { AssignmentLanguage } from '../../types/dashboard';
import FileDropInput from './FileDropInput';

interface RepositoryUploadModalProps {
  isOpen: boolean;
  uploadName: string;
  uploadLanguage: AssignmentLanguage;
  uploadFile: File | null;
  uploadError: string;
  uploading: boolean;
  importToActive: boolean;
  onNameChange: (value: string) => void;
  onLanguageChange: (value: AssignmentLanguage) => void;
  onFileChange: (file: File | null) => void;
  onImportToActiveChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

const RepositoryUploadModal: React.FC<RepositoryUploadModalProps> = ({
  isOpen,
  uploadName,
  uploadLanguage,
  uploadFile,
  uploadError,
  uploading,
  importToActive,
  onNameChange,
  onLanguageChange,
  onFileChange,
  onImportToActiveChange,
  onSubmit,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-card"
            style={{ width: 'min(450px, calc(100vw - 1rem))', maxHeight: 'calc(100vh - 1.5rem)', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
          >
            <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.25rem' }}>Upload Repository</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 0 0' }}>
              Upload a <code>.zip</code> of <code>.zip</code> files. Each inner zip represents one student submission.
            </p>

            {uploadError && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.85rem' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Repository Name</label>
                <input
                  type="text"
                  placeholder="e.g. COSC 4P02 - A1 - Winter 2025"
                  required
                  value={uploadName}
                  onChange={(event) => onNameChange(event.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Language</label>
                <select className="form-input" value={uploadLanguage} onChange={(event) => onLanguageChange(event.target.value as AssignmentLanguage)}>
                  <option value="JAVA">Java</option>
                  <option value="CPP">C++</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Repository File (.zip of .zips)</label>
                <FileDropInput
                  inputId="dashboard-repo-file-input"
                  accept={['.zip']}
                  selectedFile={uploadFile}
                  onFileChange={onFileChange}
                  activeColor="#7c3aed"
                  activeBackground="#faf5ff"
                  activeText="Drop .zip file here"
                  idleText="Drop or click to select a .zip file"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="checkbox"
                    checked={importToActive}
                    onChange={(event) => onImportToActiveChange(event.target.checked)}
                    style={{ accentColor: '#7c3aed' }}
                  />
                  <span className="form-label" style={{ marginBottom: 0 }}>Also import as active submissions</span>
                </label>
              </div>

              {importToActive && (
                <div
                  style={{
                    padding: '0.7rem 0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #d1fae5',
                    background: '#ecfdf5',
                    color: '#065f46',
                    fontSize: '0.82rem',
                  }}
                >
                  A new active assignment will be created automatically with title prefix [Repo Import].
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={uploading} style={{ marginTop: '0.5rem' }}>
                {uploading ? 'Uploading & Processing...' : 'Upload Repository'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RepositoryUploadModal;
