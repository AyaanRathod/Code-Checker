import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import FileDropInput from './FileDropInput';
import type { Assignment, AssignmentFormState } from '../../types/dashboard';

interface AssignmentModalProps {
  isOpen: boolean;
  editingAssignment: Assignment | null;
  formState: AssignmentFormState;
  boilerplateFile: File | null;
  createError: string;
  onFormChange: (next: AssignmentFormState) => void;
  onBoilerplateChange: (file: File | null) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  editingAssignment,
  formState,
  boilerplateFile,
  createError,
  onFormChange,
  onBoilerplateChange,
  onClose,
  onSubmit,
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

            <h2 style={{ fontSize: '1.25rem' }}>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</h2>

            {createError && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.85rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. COSC 4P02"
                  required
                  value={formState.course_code}
                  onChange={(event) => onFormChange({ ...formState, course_code: event.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  placeholder="e.g. A3: Graph Traversal"
                  required
                  value={formState.title}
                  onChange={(event) => onFormChange({ ...formState, title: event.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Language</label>
                <select
                  className="form-input"
                  value={formState.language}
                  onChange={(event) => onFormChange({ ...formState, language: event.target.value as AssignmentFormState['language'] })}
                >
                  <option value="JAVA">Java</option>
                  <option value="CPP">C++</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={formState.deadline}
                  onChange={(event) => onFormChange({ ...formState, deadline: event.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Boilerplate / Starter Code <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
                </label>

                <FileDropInput
                  inputId="boilerplate-input"
                  accept={['.java', '.c', '.cpp', '.h', '.zip']}
                  selectedFile={boilerplateFile}
                  onFileChange={onBoilerplateChange}
                  activeColor="var(--brand-red)"
                  activeBackground="#fef2f2"
                  activeText="Drop file here"
                  idleText="Drop or click to upload starter code (.java, .c, .cpp, .zip)"
                />

                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                  This code will be excluded from similarity comparisons.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                {editingAssignment ? 'Save Changes' : 'Create & Generate Access Key'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AssignmentModal;
