import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StudentSubmissionSuccess from '../components/student-portal/StudentSubmissionSuccess';
import StudentSubmissionForm from '../components/student-portal/StudentSubmissionForm';
import { useStudentPortalSubmission } from '../hooks/useStudentPortalSubmission';

const StudentPortal: React.FC = () => {
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < 768);

  const {
    formState,
    file,
    previewFiles,
    loading,
    error,
    successData,
    assignmentInfo,
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

  useEffect(() => {
    const onResize = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      className="main-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobileLayout ? 'flex-start' : 'center',
        padding: isMobileLayout ? '0.7rem 0.7rem 1rem' : '0.85rem',
      }}
    >
      <motion.div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: isMobileLayout ? '100%' : '440px',
          padding: isMobileLayout ? '1rem' : '1.2rem',
          background: 'var(--bg-surface)',
        }}
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
            isMobileLayout={isMobileLayout}
          />
        ) : (
          <StudentSubmissionForm
            formState={formState}
            file={file}
            previewFiles={previewFiles}
            loading={loading}
            error={error}
            assignmentInfo={assignmentInfo}
            dragActive={dragActive}
            dragHandlers={dragHandlers}
            showZipNoValidFilesWarning={showZipNoValidFilesWarning}
            onSubmit={submit}
            onFieldChange={onFieldChange}
            onInputFileChange={handleFileChange}
            onClearFile={clearFile}
            isMobileLayout={isMobileLayout}
          />
        )}
      </motion.div>
    </div>
  );
};

export default StudentPortal;
