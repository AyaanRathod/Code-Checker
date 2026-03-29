import React from 'react';
import { motion } from 'framer-motion';
import StudentSubmissionSuccess from '../components/student-portal/StudentSubmissionSuccess';
import StudentSubmissionForm from '../components/student-portal/StudentSubmissionForm';
import { useStudentPortalSubmission } from '../hooks/useStudentPortalSubmission';

const StudentPortal: React.FC = () => {
  const {
    formState,
    file,
    previewFiles,
    loading,
    error,
    successData,
    dragActive,
    dragHandlers,
    showZipNoValidFilesWarning,
    onFieldChange,
    processSelectedFile,
    clearFile,
    submit,
    submitAnother,
    saveReceipt,
    formatTorontoTimestamp,
  } = useStudentPortalSubmission();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      processSelectedFile(event.target.files[0]);
    }
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.85rem' }}>
      <motion.div
        className="glass-card"
        style={{ width: '100%', maxWidth: '440px', padding: '1.2rem', background: 'var(--bg-surface)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {successData ? (
          <StudentSubmissionSuccess
            successData={successData}
            onSaveReceipt={saveReceipt}
            onSubmitAnother={submitAnother}
            formatTimestamp={formatTorontoTimestamp}
          />
        ) : (
          <StudentSubmissionForm
            formState={formState}
            file={file}
            previewFiles={previewFiles}
            loading={loading}
            error={error}
            dragActive={dragActive}
            dragHandlers={dragHandlers}
            showZipNoValidFilesWarning={showZipNoValidFilesWarning}
            onSubmit={submit}
            onFieldChange={onFieldChange}
            onInputFileChange={handleFileChange}
            onClearFile={clearFile}
          />
        )}
      </motion.div>
    </div>
  );
};

export default StudentPortal;
