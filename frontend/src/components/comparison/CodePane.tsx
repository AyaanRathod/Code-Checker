import React from 'react';
import { Download } from 'lucide-react';
import FileTabBar from './FileTabBar';
import type { FileEntry, LineHighlightStyle } from './types';

interface CodePaneProps {
  pane: 'source' | 'target';
  title: string;
  revealed: boolean;
  studentName: string;
  studentIdentity: string;
  maskedIdentity: string;
  submissionId?: string;
  onDownload: (submissionId: string) => void;
  files: FileEntry[];
  activeFileIdx: number;
  onSelectFile: (index: number) => void;
  onAfterSelectFile: () => void;
  code: string;
  lineMatchMap: Map<number, Set<number>>;
  getLineStyle: (lineIdx: number, map: Map<number, Set<number>>) => LineHighlightStyle;
  onLineClick: (blockId: number, panel: 'source' | 'target') => void;
  activeBlockId: number | null;
  isMobileLayout: boolean;
  withRightBorder: boolean;
}

const CodePane: React.FC<CodePaneProps> = ({
  pane,
  title,
  revealed,
  studentName,
  studentIdentity,
  maskedIdentity,
  submissionId,
  onDownload,
  files,
  activeFileIdx,
  onSelectFile,
  onAfterSelectFile,
  code,
  lineMatchMap,
  getLineStyle,
  onLineClick,
  activeBlockId,
  isMobileLayout,
  withRightBorder,
}) => {
  return (
    <div
      style={{
        flex: 1,
        borderRight: withRightBorder ? '2px solid var(--border-strong)' : 'none',
        borderBottom: isMobileLayout && withRightBorder ? '2px solid var(--border-strong)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          padding: isMobileLayout ? '0.55rem 0.65rem' : '0.75rem 1.5rem',
          background: 'var(--bg-surface-raised)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{title}</span>
          {revealed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              {studentName && <span style={{ color: 'var(--brand-red)', fontSize: '0.95rem', fontWeight: 600 }}>{studentName}</span>}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-red)', fontSize: '0.85rem', fontWeight: 500 }}>{studentIdentity}</span>
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>{maskedIdentity}</span>
          )}
        </div>

        {submissionId && (
          <button
            onClick={() => onDownload(submissionId)}
            className="btn btn-outline"
            style={{
              padding: isMobileLayout ? '0.3rem 0.45rem' : '0.35rem 0.75rem',
              fontSize: isMobileLayout ? '0.72rem' : '0.8rem',
              gap: '0.35rem',
            }}
            title={`Download ${pane} submission files`}
          >
            <Download size={14} /> Download
          </button>
        )}
      </div>

      <FileTabBar
        files={files}
        activeIdx={activeFileIdx}
        onSelect={onSelectFile}
        side={pane}
        onAfterSelect={onAfterSelectFile}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: isMobileLayout ? '0.8rem 0' : '1.5rem 0',
          paddingBottom: '8rem',
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: isMobileLayout ? '0.78rem' : '0.85rem',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: isMobileLayout ? 1.48 : 1.6,
        }}
      >
        {code.split('\n').map((line, lineIndex) => {
          const style = getLineStyle(lineIndex, lineMatchMap);
          const isClickable = style.blockId !== -1;

          return (
            <div
              key={lineIndex}
              id={`${pane}-line-${lineIndex}`}
              onClick={() => {
                if (isClickable) onLineClick(style.blockId, pane);
              }}
              style={{
                display: 'flex',
                background: style.bg,
                padding: '1px 0',
                marginLeft: pane === 'target' ? '2px' : '0',
                borderLeft: isClickable ? `3px solid ${style.border}` : '3px solid transparent',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: activeBlockId !== null && isClickable && !style.isActive ? 0.28 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  width: '50px',
                  color: style.isActive ? '#000' : 'var(--text-tertiary)',
                  userSelect: 'none',
                  textAlign: 'right',
                  paddingRight: '16px',
                  flexShrink: 0,
                  fontWeight: style.isActive ? 600 : 400,
                }}
              >
                {lineIndex + 1}
              </span>
              <span style={{ padding: '0 8px', width: '100%', wordBreak: 'break-all', color: 'inherit', fontWeight: style.isActive ? 600 : 400 }}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CodePane;
