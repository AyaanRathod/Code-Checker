import React from 'react';
import { Upload, UploadCloud, X } from 'lucide-react';
import { useFileDrop } from '../../hooks/useFileDrop';

interface FileDropInputProps {
  inputId: string;
  accept: string[];
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  activeColor: string;
  activeBackground: string;
  idleText: string;
  activeText: string;
}

const FileDropInput: React.FC<FileDropInputProps> = ({
  inputId,
  accept,
  selectedFile,
  onFileChange,
  activeColor,
  activeBackground,
  idleText,
  activeText,
}) => {
  const fileDrop = useFileDrop({
    accept,
    onFile: (file) => onFileChange(file),
  });

  return (
    <div
      {...fileDrop.dragHandlers}
      style={{
        border: `2px dashed ${fileDrop.dragActive ? activeColor : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: fileDrop.dragActive ? activeBackground : selectedFile ? '#ecfdf5' : 'var(--bg-surface-raised)',
        transition: 'all 0.15s ease',
      }}
      onClick={() => document.getElementById(inputId)?.click()}
    >
      <input
        id={inputId}
        type="file"
        accept={accept.join(',')}
        style={{ display: 'none' }}
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />

      {fileDrop.dragActive ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: activeColor, fontSize: '0.85rem', fontWeight: 600 }}>
          <UploadCloud size={18} /> {activeText}
        </div>
      ) : selectedFile ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFileChange(null);
            }}
            title="Remove file"
            style={{
              position: 'absolute',
              top: '-0.4rem',
              right: '-0.4rem',
              width: '20px',
              height: '20px',
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
            <X size={10} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
            <Upload size={16} /> {selectedFile.name}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Click to replace</span>
        </div>
      ) : (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          <Upload size={16} style={{ margin: '0 auto 0.25rem auto', display: 'block', opacity: 0.5 }} />
          {idleText}
        </div>
      )}
    </div>
  );
};

export default FileDropInput;
