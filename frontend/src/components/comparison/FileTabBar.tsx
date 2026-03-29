import React from 'react';
import { FileCode } from 'lucide-react';
import type { FileEntry } from './types';

interface FileTabBarProps {
  files: FileEntry[];
  activeIdx: number;
  onSelect: (index: number) => void;
  side: 'source' | 'target';
  onAfterSelect?: () => void;
}

const FileTabBar: React.FC<FileTabBarProps> = ({ files, activeIdx, onSelect, side, onAfterSelect }) => {
  if (files.length <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {files.map((file, index) => {
        const hasMatches = file.ranges && file.ranges.length > 0;
        const isActive = index === activeIdx;

        return (
          <button
            key={`${side}-tab-${index}`}
            onClick={() => {
              onSelect(index);
              onAfterSelect?.();
            }}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              background: isActive ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--brand-red)' : '2px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s ease',
            }}
          >
            <FileCode size={13} />
            {file.filename}
            {hasMatches && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(170, 0, 0, 0.1)' : 'rgba(170, 0, 0, 0.06)',
                  color: 'var(--brand-red)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {file.ranges.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FileTabBar;
