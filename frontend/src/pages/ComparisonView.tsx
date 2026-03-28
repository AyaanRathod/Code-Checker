import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertOctagon, Unlock, ChevronLeft, ChevronRight, Info, Download, FileCode } from 'lucide-react';
import axios from 'axios';

interface FileEntry {
  filename: string;
  code: string;
  ranges: { start: number; end: number }[];
}

interface AssignmentSummary {
  id: string;
  title: string;
  course: string;
}

interface AssignmentComparison {
  id: string;
  source_student: string;
  target_student: string;
  raw_source_id: string;
  raw_target_id: string;
  score: number;
  status: string;
}

interface OtherAssignmentMatch extends AssignmentComparison {
  assignmentId: string;
  assignmentTitle: string;
  course: string;
  isCurrentAssignment: boolean;
}

const ComparisonView: React.FC = () => {
  const { comparison_id } = useParams();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otherAssignmentMatches, setOtherAssignmentMatches] = useState<OtherAssignmentMatch[]>([]);
  const [otherMatchesLoading, setOtherMatchesLoading] = useState(true);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);
  const [selectedSimilarityRange, setSelectedSimilarityRange] = useState('All');
  const [otherMatchesSortOrder, setOtherMatchesSortOrder] = useState<'desc' | 'asc'>('desc');

  // Track the CURRENTLY focused match block
  const [activeBlockId, setActiveBlockId] = useState<number | null>(0);

  // Multi-file tab state
  const [sourceFileIdx, setSourceFileIdx] = useState(0);
  const [targetFileIdx, setTargetFileIdx] = useState(0);

  const buildMaskedIdentity = (id: string) => {
    if (!id) return '';
    if (id.length > 4) return `${id.substring(0, 2)}****${id.substring(id.length - 2)}`;
    return id;
  };

  const getIdentityTokens = (id: string) => {
    const tokens = new Set<string>();
    if (!id) return tokens;

    const trimmed = id.trim();
    if (!trimmed) return tokens;

    tokens.add(trimmed.toLowerCase());
    tokens.add(buildMaskedIdentity(trimmed).toLowerCase());
    return tokens;
  };

  useEffect(() => {
    const fetchComparison = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/instructor/login');
        return;
      }

      try {
        const response = await axios.get(`http://localhost:8000/api/v1/instructor/comparisons/${comparison_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load comparison data.");
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [comparison_id, navigate]);

  useEffect(() => {
    if (!data) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const currentIds = new Set<string>();
    getIdentityTokens(data.source_student_decrypted).forEach((token) => currentIds.add(token));

    if (currentIds.size === 0) {
      setOtherAssignmentMatches([]);
      setOtherMatchesLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOtherAssignmentMatches = async () => {
      setOtherMatchesLoading(true);

      try {
        const assignmentsResponse = await axios.get('http://localhost:8000/api/v1/instructor/assignments', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const assignments: AssignmentSummary[] = assignmentsResponse.data;
        const comparisonResults = await Promise.allSettled(
          assignments.map(async (assignment) => {
            const comparisonsResponse = await axios.get(
              `http://localhost:8000/api/v1/instructor/assignments/${assignment.id}/comparisons`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            return {
              assignment,
              comparisons: comparisonsResponse.data as AssignmentComparison[]
            };
          })
        );

        const assignmentComparisons = comparisonResults
          .filter((result): result is PromiseFulfilledResult<{ assignment: AssignmentSummary; comparisons: AssignmentComparison[] }> => result.status === 'fulfilled')
          .map((result) => result.value);

        const currentAssignmentId = assignmentComparisons.find(({ comparisons }) =>
          comparisons.some((comparison) => comparison.id === comparison_id)
        )?.assignment.id;

        const currentAssignment = assignmentComparisons.find(({ assignment }) => assignment.id === currentAssignmentId);

        const matches = (currentAssignment?.comparisons || [])
          .filter((comparison) => {
            if (comparison.id === comparison_id) return false;

            const sourceTokens = new Set<string>();
            getIdentityTokens(comparison.raw_source_id).forEach((token) => sourceTokens.add(token));
            getIdentityTokens(comparison.source_student).forEach((token) => sourceTokens.add(token));

            return Array.from(sourceTokens).some((token) => currentIds.has(token));
          })
          .map((comparison) => ({
            ...comparison,
            assignmentId: currentAssignmentId || '',
            assignmentTitle: currentAssignment?.assignment.title || '',
            course: currentAssignment?.assignment.course || '',
            isCurrentAssignment: true
          }))
          .sort((a, b) => {
            return b.score - a.score;
          });

        if (!cancelled) {
          setCurrentAssignmentId(currentAssignmentId || null);
          setOtherAssignmentMatches(matches);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOtherAssignmentMatches([]);
        }
      } finally {
        if (!cancelled) {
          setOtherMatchesLoading(false);
        }
      }
    };

    fetchOtherAssignmentMatches();

    return () => {
      cancelled = true;
    };
  }, [comparison_id, data]);

  // Build file arrays from response (with backward compat fallback)
  const sourceFiles: FileEntry[] = useMemo(() => {
    if (!data) return [];
    if (data.source_files && data.source_files.length > 0) return data.source_files;
    // Fallback for old metadata format
    return [{ filename: 'source', code: data.source_code || '', ranges: data.metadata?.source_ranges || [] }];
  }, [data]);

  const targetFiles: FileEntry[] = useMemo(() => {
    if (!data) return [];
    if (data.target_files && data.target_files.length > 0) return data.target_files;
    return [{ filename: 'target', code: data.target_code || '', ranges: data.metadata?.target_ranges || [] }];
  }, [data]);

  const filteredAndSortedOtherMatches = useMemo(() => {
    const filtered = otherAssignmentMatches.filter((match) => {
      switch (selectedSimilarityRange) {
        case '0-20':
          return match.score >= 0 && match.score <= 20;
        case '21-40':
          return match.score >= 21 && match.score <= 40;
        case '41-60':
          return match.score >= 41 && match.score <= 60;
        case '61-80':
          return match.score >= 61 && match.score <= 80;
        case '81-100':
          return match.score >= 81 && match.score <= 100;
        default:
          return true;
      }
    });

    return [...filtered].sort((a, b) => (
      otherMatchesSortOrder === 'desc' ? b.score - a.score : a.score - b.score
    ));
  }, [otherAssignmentMatches, selectedSimilarityRange, otherMatchesSortOrder]);

  // Reset tab index and active block when data changes
  useEffect(() => {
    setSourceFileIdx(0);
    setTargetFileIdx(0);
    setActiveBlockId(0);
  }, [data]);

  // -------------------------------------------------------------------------
  // Process Data & Maps — recalculates when active file tabs change
  // -------------------------------------------------------------------------
  const parsedData = useMemo(() => {
    if (!data) return null;
    const currentSource = sourceFiles[sourceFileIdx];
    const currentTarget = targetFiles[targetFileIdx];
    if (!currentSource || !currentTarget) return null;

    const getHighlightedLines = (code: string, ranges: {start: number, end: number}[]) => {
      const lines = new Set<number>();
      if (!ranges || !code) return lines;

      let currentLine = 0;
      const charToLine: number[] = [];
      for (let i = 0; i < code.length; i++) {
          charToLine[i] = currentLine;
          if (code[i] === '\n') currentLine++;
      }

      ranges.forEach(r => {
          const startLine = charToLine[Math.min(r.start, code.length - 1)] || 0;
          const endLine = charToLine[Math.min(r.end, code.length - 1)] || 0;
          for (let l = startLine; l <= endLine; l++) {
              lines.add(l);
          }
      });
      return lines;
    };

    const getLineToBlockMap = (linesSet: Set<number>) => {
        const sorted = Array.from(linesSet).sort((a,b)=>a-b);
        const lineMap = new Map<number, number>();
        let blockIdx = 0;

        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] > sorted[i-1] + 2) {
               blockIdx++;
            }
            lineMap.set(sorted[i], blockIdx);
        }
        return lineMap;
    };

    const sLines = getHighlightedLines(currentSource.code, currentSource.ranges || []);
    const tLines = getHighlightedLines(currentTarget.code, currentTarget.ranges || []);

    const sMap = getLineToBlockMap(sLines);
    const tMap = getLineToBlockMap(tLines);

    const total = Math.max(
        sMap.size > 0 ? Math.max(...Array.from(sMap.values())) + 1 : 0,
        tMap.size > 0 ? Math.max(...Array.from(tMap.values())) + 1 : 0
    );

    return { sMap, tMap, totalBlocks: total };
  }, [data, sourceFiles, targetFiles, sourceFileIdx, targetFileIdx]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading comparison...</div>;
  if (!data || !parsedData) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Comparison not found.</div>;

  const {
    score = 0,
    source_student_decrypted = 'Student_Hidden',
    target_student_decrypted = 'Student_Hidden',
    source_student_name = '',
    target_student_name = '',
  } = data || {};

  const currentSourceCode = sourceFiles[sourceFileIdx]?.code || '';
  const currentTargetCode = targetFiles[targetFileIdx]?.code || '';
  const { sMap, tMap, totalBlocks } = parsedData;

  const maskIdentity = (id: string) => {
    if (id.length > 4) return id.substring(0, 2) + "****" + id.substring(id.length - 2);
    return "Student_Hidden";
  };

  const getStatusStyles = (status: string) => {
    if (status === 'High Risk') {
      return {
        color: '#dc2626',
        background: '#fef2f2',
        border: '#fecaca'
      };
    }

    if (status === 'Review') {
      return {
        color: '#d97706',
        background: '#fffbeb',
        border: '#fed7aa'
      };
    }

    return {
      color: '#64748b',
      background: '#f8fafc',
      border: '#cbd5e1'
    };
  };

  // -------------------------------------------------------------------------
  // Interaction Logic (UX)
  // -------------------------------------------------------------------------
  const scrollToBlock = (blockId: number, targetPanel: 'source' | 'target') => {
      const mapToSearch = targetPanel === 'source' ? sMap : tMap;
      let targetLineIdx = -1;

      for (const [lineIdx, bId] of mapToSearch.entries()) {
          if (bId === blockId) {
              targetLineIdx = lineIdx;
              break;
          }
      }

      if (targetLineIdx !== -1) {
          const el = document.getElementById(`${targetPanel}-line-${targetLineIdx}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  };

  const jumpToBlock = (blockId: number) => {
      if (blockId < 0 || blockId >= totalBlocks) return;
      setActiveBlockId(blockId);
      scrollToBlock(blockId, 'source');
      setTimeout(() => scrollToBlock(blockId, 'target'), 50);
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/instructor/login'); return; }

    try {
      const response = await axios.get(
        `http://localhost:8000/api/v1/instructor/submissions/${submissionId}/download`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'submission.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download submission files.');
    }
  };

  const MATCH_COLOR_PALETTE = [
    {
      activeBg: 'rgba(245, 158, 11, 0.34)',
      activeBorder: '#d97706',
      inactiveBg: 'rgba(245, 158, 11, 0.14)',
      inactiveBorder: 'rgba(217, 119, 6, 0.34)'
    },
    {
      activeBg: 'rgba(59, 130, 246, 0.28)',
      activeBorder: '#2563eb',
      inactiveBg: 'rgba(59, 130, 246, 0.12)',
      inactiveBorder: 'rgba(37, 99, 235, 0.3)'
    },
    {
      activeBg: 'rgba(239, 68, 68, 0.24)',
      activeBorder: '#dc2626',
      inactiveBg: 'rgba(239, 68, 68, 0.1)',
      inactiveBorder: 'rgba(220, 38, 38, 0.26)'
    },
    {
      activeBg: 'rgba(236, 72, 153, 0.24)',
      activeBorder: '#db2777',
      inactiveBg: 'rgba(236, 72, 153, 0.1)',
      inactiveBorder: 'rgba(219, 39, 119, 0.26)'
    },
    {
      activeBg: 'rgba(139, 92, 246, 0.24)',
      activeBorder: '#7c3aed',
      inactiveBg: 'rgba(139, 92, 246, 0.1)',
      inactiveBorder: 'rgba(124, 58, 237, 0.26)'
    },
    {
      activeBg: 'rgba(14, 165, 233, 0.24)',
      activeBorder: '#0284c7',
      inactiveBg: 'rgba(14, 165, 233, 0.1)',
      inactiveBorder: 'rgba(2, 132, 199, 0.26)'
    }
  ];

  const getStyleForLine = (lineIdx: number, map: Map<number, number>) => {
      if (!map.has(lineIdx)) return { bg: 'transparent', border: 'transparent', blockId: -1, isActive: false };

      const blockId = map.get(lineIdx)!;
      const isActive = blockId === activeBlockId;
      const palette = MATCH_COLOR_PALETTE[blockId % MATCH_COLOR_PALETTE.length];

      return {
        bg: isActive ? palette.activeBg : palette.inactiveBg,
        border: isActive ? palette.activeBorder : palette.inactiveBorder,
        blockId,
        isActive
      };
  };

  // Count how many files have matches for a badge
  const countFileMatches = (files: FileEntry[]) => files.filter(f => f.ranges && f.ranges.length > 0).length;

  // File tab bar component
  const FileTabBar = ({ files, activeIdx, onSelect, side }: { files: FileEntry[]; activeIdx: number; onSelect: (i: number) => void; side: string }) => {
    if (files.length <= 1) return null;
    return (
      <div style={{
        display: 'flex', gap: '0', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)', overflowX: 'auto', flexShrink: 0
      }}>
        {files.map((f, i) => {
          const hasMatches = f.ranges && f.ranges.length > 0;
          const isActive = i === activeIdx;
          return (
            <button
              key={`${side}-tab-${i}`}
              onClick={() => { onSelect(i); setActiveBlockId(0); }}
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
                transition: 'all 0.15s ease'
              }}
            >
              <FileCode size={13} />
              {f.filename}
              {hasMatches && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(170, 0, 0, 0.1)' : 'rgba(170, 0, 0, 0.06)',
                  color: 'var(--brand-red)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)'
                }}>
                  {f.ranges.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', position: 'fixed', inset: 0, minHeight:0, overflow: 'hidden',  background: 'var(--bg-base)'}}>

      {/* Top Navigation & Status Header */}
      <div style={{ padding: '1.25rem 2.5rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>

        {/* Top row: Back button & identities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => currentAssignmentId && navigate(`/instructor/assignment/${currentAssignmentId}`, { state: { initialTab: 'results' } })}
            className="btn btn-outline"
            style={{ border: 'none', padding: 0, color: 'var(--text-secondary)', opacity: currentAssignmentId ? 1 : 0.6 }}
            disabled={!currentAssignmentId}
          >
            <ArrowLeft size={18} /> Back to Pairwise Similarities
          </button>
          <button
            onClick={() => setRevealed(!revealed)}
            className="btn btn-outline"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: revealed ? 'var(--brand-red)' : 'var(--border-strong)', color: revealed ? 'var(--brand-red)' : 'var(--text-secondary)' }}
          >
            <Unlock size={14} /> {revealed ? 'Identities Revealed' : 'Reveal Identities'}
          </button>
        </div>

        {/* Bottom row: Score & Context */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Similarity Score</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{typeof score === 'number' ? score.toFixed(1) : '0.0'}%</span>
                {score > 80 ? (
                  <span style={{ color: '#dc2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', background: '#fef2f2', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    <AlertOctagon size={14} /> Critical Match
                  </span>
                ) : score > 60 ? (
                  <span style={{ color: '#d97706', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', background: '#fffbeb', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    <AlertOctagon size={14} /> High Match
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', background: '#ecfdf5', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Normal
                  </span>
                )}
              </div>
            </div>

            <div style={{ height: '40px', width: '1px', background: 'var(--border-strong)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Info size={14} color="var(--brand-red)" />
                The highlighted blocks represent code structure that is mathematically identical between these two students.
              </span>
              <span>Click on any highlighted block to focus it and auto-sync the side-by-side view.</span>
            </div>
          </div>

          {/* File count summary */}
          {(sourceFiles.length > 1 || targetFiles.length > 1) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <span>Source: {countFileMatches(sourceFiles)}/{sourceFiles.length} files with matches</span>
              <span>Target: {countFileMatches(targetFiles)}/{targetFiles.length} files with matches</span>
            </div>
          )}

        </div>
      </div>

      {/* Editor Main Split Pane */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0, flex: 1 }}>

        <div style={{ display: 'flex', overflow: 'hidden', minWidth: 0, minHeight: 0, flex: 1 }}>

          {/* Source Side */}
          <div style={{ flex: 1, borderRight: '2px solid var(--border-strong)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minWidth: 0, minHeight: 0, height: '100%', position: 'relative' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-surface-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Source Document</span>
                {revealed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    {source_student_name && (
                      <span style={{ color: 'var(--brand-red)', fontSize: '0.95rem', fontWeight: 600 }}>{source_student_name}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-red)', fontSize: '0.85rem', fontWeight: 500 }}>{source_student_decrypted}</span>
                  </div>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
                    {maskIdentity(source_student_decrypted)}
                  </span>
                )}
              </div>
              {data.source_submission_id && (
                <button
                  onClick={() => handleDownloadSubmission(data.source_submission_id)}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                  title="Download source submission files"
                >
                  <Download size={14} /> Download
                </button>
              )}
            </div>
            <FileTabBar files={sourceFiles} activeIdx={sourceFileIdx} onSelect={setSourceFileIdx} side="source" />
            <div style={{ flex: 1, minHeight: 0, padding: '1.5rem 0', paddingBottom: '8rem', overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {currentSourceCode.split('\n').map((line: string, i: number) => {
                const style = getStyleForLine(i, sMap);
                const isClickable = style.blockId !== -1;
                return (
                  <div
                    key={i}
                    id={`source-line-${i}`}
                    onClick={() => {
                        if (isClickable) jumpToBlock(style.blockId);
                    }}
                    style={{
                        display: 'flex',
                        background: style.bg,
                        padding: '1px 0',
                        borderLeft: isClickable ? `3px solid ${style.border}` : '3px solid transparent',
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: (activeBlockId !== null && isClickable && !style.isActive) ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ width: '50px', color: style.isActive ? '#000' : 'var(--text-tertiary)', userSelect: 'none', textAlign: 'right', paddingRight: '16px', flexShrink: 0, fontWeight: style.isActive ? 600 : 400 }}>{i+1}</span>
                    <span style={{ padding: '0 8px', width: '100%', wordBreak: 'break-all', color: 'inherit', fontWeight: style.isActive ? 600 : 400 }}>{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Side */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minWidth: 0, minHeight: 0, height: '100%', position: 'relative' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-surface-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Target Document</span>
                {revealed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    {target_student_name && (
                      <span style={{ color: 'var(--brand-red)', fontSize: '0.95rem', fontWeight: 600 }}>{target_student_name}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-red)', fontSize: '0.85rem', fontWeight: 500 }}>{target_student_decrypted}</span>
                  </div>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
                    {maskIdentity(target_student_decrypted)}
                  </span>
                )}
              </div>
              {data.target_submission_id && (
                <button
                  onClick={() => handleDownloadSubmission(data.target_submission_id)}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                  title="Download target submission files"
                >
                  <Download size={14} /> Download
                </button>
              )}
            </div>
            <FileTabBar files={targetFiles} activeIdx={targetFileIdx} onSelect={setTargetFileIdx} side="target" />
            <div style={{ flex: 1, minHeight: 0, padding: '1.5rem 0', paddingBottom: '8rem', overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
               {currentTargetCode.split('\n').map((line: string, i: number) => {
                 const style = getStyleForLine(i, tMap);
                 const isClickable = style.blockId !== -1;
                 return (
                  <div
                    key={i}
                    id={`target-line-${i}`}
                    onClick={() => {
                        if (isClickable) jumpToBlock(style.blockId);
                    }}
                    style={{
                        display: 'flex',
                        background: style.bg,
                        padding: '1px 0',
                        marginLeft: '2px',
                        borderLeft: isClickable ? `3px solid ${style.border}` : '3px solid transparent',
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: (activeBlockId !== null && isClickable && !style.isActive) ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ width: '50px', color: style.isActive ? '#000' : 'var(--text-tertiary)', userSelect: 'none', textAlign: 'right', paddingRight: '16px', flexShrink: 0, fontWeight: style.isActive ? 600 : 400 }}>{i+1}</span>
                    <span style={{ padding: '0 8px', width: '100%', wordBreak: 'break-all', color: 'inherit', fontWeight: style.isActive ? 600 : 400 }}>{line}</span>
                  </div>
                 );
               })}
            </div>
          </div>

          <aside style={{ width: '420px', maxWidth: '32vw', minWidth: '340px', borderLeft: '1px solid var(--border-strong)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.45rem', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Related Student Matches</h3>
            </div>
            <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setOtherMatchesSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', whiteSpace: 'nowrap', background: 'var(--bg-surface)' }}
              >
                Similarity Score
                <span
                  style={{
                    display: 'inline-block',
                    transform: otherMatchesSortOrder === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  ▼
                </span>
              </button>

              <select
                value={selectedSimilarityRange}
                onChange={(e) => setSelectedSimilarityRange(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: 0, background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                <option value="All">All Scores</option>
                <option value="0-20">0% - 20%</option>
                <option value="21-40">21% - 40%</option>
                <option value="41-60">41% - 60%</option>
                <option value="61-80">61% - 80%</option>
                <option value="81-100">81% - 100%</option>
              </select>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
            {otherMatchesLoading ? (
              <div style={{ padding: '2rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Loading related matches...
              </div>
            ) : filteredAndSortedOtherMatches.length === 0 ? (
              <div style={{ padding: '2rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No related matches match the selected score filter.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredAndSortedOtherMatches.map((match) => {
                  const statusStyles = getStatusStyles(match.status);
                  const sourceLabel = revealed ? match.raw_source_id : match.source_student;
                  const targetLabel = revealed ? match.raw_target_id : match.target_student;

                  return (
                    <div key={match.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{match.assignmentTitle}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          {match.course}{match.isCurrentAssignment ? ' • Current assignment' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Source ID</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{sourceLabel}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Target ID</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{targetLabel}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Similarity Score</span>
                          <span style={{ fontWeight: 700, color: match.score >= 80 ? '#dc2626' : match.score >= 60 ? '#d97706' : 'var(--text-primary)' }}>
                            {match.score.toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>Risk Level</span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: statusStyles.color,
                            background: statusStyles.background,
                            border: `1px solid ${statusStyles.border}`
                          }}>
                            {match.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/instructor/compare/${match.id}`)}
                            className="btn btn-outline"
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', background: 'var(--bg-surface)' }}
                          >
                            Inspect Match
                          </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </aside>
        </div>
      </div>

      {/* Centered Floating Control Panel */}
      {totalBlocks > 0 && (
          <div style={{
              position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-strong)',
              display: 'flex', gap: '1.5rem', alignItems: 'center',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100
          }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Matches</span>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#ca8a04' }}>{activeBlockId !== null ? activeBlockId + 1 : 0}</span> / {totalBlocks}
                </span>
             </div>

             <div style={{ width: '1px', height: '30px', background: 'var(--border-subtle)' }}></div>

             <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button
                    onClick={() => jumpToBlock(activeBlockId !== null ? activeBlockId - 1 : 0)}
                    disabled={activeBlockId === null || activeBlockId <= 0}
                    className="btn"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', opacity: (activeBlockId === null || activeBlockId <= 0) ? 0.3 : 1, transition: 'all 0.2s ease' }}
                 >
                     <ChevronLeft size={16} /> Prev
                 </button>

                 <button
                    onClick={() => jumpToBlock(activeBlockId !== null ? activeBlockId + 1 : 0)}
                    disabled={activeBlockId === null || activeBlockId >= totalBlocks - 1}
                    className="btn"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', opacity: (activeBlockId === null || activeBlockId >= totalBlocks - 1) ? 0.3 : 1, transition: 'all 0.2s ease' }}
                 >
                     Next <ChevronRight size={16} />
                 </button>
             </div>
          </div>
      )}

    </div>
  );
};

export default ComparisonView;
