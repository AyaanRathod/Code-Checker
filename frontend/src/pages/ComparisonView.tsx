import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertOctagon, Unlock, Info, PanelRightClose, PanelRightOpen, Maximize2, Minimize2 } from 'lucide-react';
import axios from 'axios';
import RelatedMatchesSidebar from '../components/comparison/RelatedMatchesSidebar';
import CodePane from '../components/comparison/CodePane';
import FloatingMatchNavigator from '../components/comparison/FloatingMatchNavigator';
import { useComparisonData } from '../components/comparison/useComparisonData';
import {
  buildParsedData,
  buildSourceFiles,
  buildTargetFiles,
  countFileMatches,
  filterAndSortOtherMatches,
  getStyleForLine,
  maskIdentity,
  parseMatchPairs,
} from '../components/comparison/comparisonUtils';
import type { MatchPair } from '../components/comparison/types';

const ComparisonView: React.FC = () => {
  const { comparison_id } = useParams();
  const navigate = useNavigate();

  const {
    data,
    loading,
    otherAssignmentMatches,
    otherMatchesLoading,
    currentAssignmentId,
  } = useComparisonData({ comparisonId: comparison_id, navigate });

  const [revealed, setRevealed] = useState(false);
  const [selectedSimilarityRange, setSelectedSimilarityRange] = useState('All');
  const [otherMatchesSortOrder, setOtherMatchesSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isNarrowLayout, setIsNarrowLayout] = useState(() => window.innerWidth < 1220);
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < 960);
  const [showMatchesPanel, setShowMatchesPanel] = useState(() => window.innerWidth >= 1220);
  const [compactHeader, setCompactHeader] = useState(() => window.innerWidth < 1220);
  const [pendingSync, setPendingSync] = useState<{ panel: 'source' | 'target'; matchId: number } | null>(null);

  // Track focused linked match id per active panel.
  const [activePanel, setActivePanel] = useState<'source' | 'target'>('source');
  const [activeBlockId, setActiveBlockId] = useState<number | null>(0);

  // Multi-file tab state
  const [sourceFileIdx, setSourceFileIdx] = useState(0);
  const [targetFileIdx, setTargetFileIdx] = useState(0);

  // Build file arrays from response (with backward compat fallback)
  const sourceFiles = useMemo(() => buildSourceFiles(data), [data]);

  const targetFiles = useMemo(() => buildTargetFiles(data), [data]);

  const allMatchPairs = useMemo<MatchPair[]>(() => parseMatchPairs(data), [data]);

  const matchFileIndexLookup = useMemo(() => {
    const sourceByMatch = new Map<number, number>();
    const targetByMatch = new Map<number, number>();

    allMatchPairs.forEach((pair) => {
      if (!sourceByMatch.has(pair.match_id) && pair.source[0]) {
        sourceByMatch.set(pair.match_id, pair.source[0].file_index ?? 0);
      }
      if (!targetByMatch.has(pair.match_id) && pair.target[0]) {
        targetByMatch.set(pair.match_id, pair.target[0].file_index ?? 0);
      }
    });

    return { sourceByMatch, targetByMatch };
  }, [allMatchPairs]);

  const sourceArrayIndexByFileIndex = useMemo(() => {
    const map = new Map<number, number>();
    sourceFiles.forEach((f, i) => map.set(f.file_index ?? i, i));
    return map;
  }, [sourceFiles]);

  const targetArrayIndexByFileIndex = useMemo(() => {
    const map = new Map<number, number>();
    targetFiles.forEach((f, i) => map.set(f.file_index ?? i, i));
    return map;
  }, [targetFiles]);

  const filteredAndSortedOtherMatches = useMemo(
    () => filterAndSortOtherMatches(otherAssignmentMatches, selectedSimilarityRange, otherMatchesSortOrder),
    [otherAssignmentMatches, selectedSimilarityRange, otherMatchesSortOrder]
  );

  // Reset tab index and active block when data changes
  useEffect(() => {
    setSourceFileIdx(0);
    setTargetFileIdx(0);
    setActivePanel('source');
    setActiveBlockId(0);
    setPendingSync(null);
  }, [data]);

  useEffect(() => {
    const onResize = () => {
      setIsNarrowLayout(window.innerWidth < 1220);
      setIsMobileLayout(window.innerWidth < 960);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // -------------------------------------------------------------------------
  // Process Data & Maps — recalculates when active file tabs change
  // -------------------------------------------------------------------------
  const parsedData = useMemo(
    () => buildParsedData(data, sourceFiles, targetFiles, sourceFileIdx, targetFileIdx, allMatchPairs),
    [data, sourceFiles, targetFiles, sourceFileIdx, targetFileIdx, allMatchPairs]
  );

  const sourceBlockCount = parsedData?.sourceMatchIds.length ?? 0;
  const targetBlockCount = parsedData?.targetMatchIds.length ?? 0;
  const totalBlocks = activePanel === 'source' ? sourceBlockCount : targetBlockCount;

  const {
    score = 0,
    source_student_decrypted = 'Student_Hidden',
    target_student_decrypted = 'Student_Hidden',
    source_student_name = '',
    target_student_name = '',
  } = data || {};

  const currentSourceCode = sourceFiles[sourceFileIdx]?.code || '';
  const currentTargetCode = targetFiles[targetFileIdx]?.code || '';
  const sourceLineMatchMap = parsedData?.sourceLineMatchMap ?? new Map<number, Set<number>>();
  const targetLineMatchMap = parsedData?.targetLineMatchMap ?? new Map<number, Set<number>>();
  const sourceFirstLineByMatch = parsedData?.sourceFirstLineByMatch ?? new Map<number, number>();
  const targetFirstLineByMatch = parsedData?.targetFirstLineByMatch ?? new Map<number, number>();
  const sourceMatchIds = parsedData?.sourceMatchIds ?? [];
  const targetMatchIds = parsedData?.targetMatchIds ?? [];

  const activePanelMatchIds = activePanel === 'source' ? sourceMatchIds : targetMatchIds;

  const activePanelPosition = useMemo(() => {
    if (activeBlockId === null) return 0;
    const idx = activePanelMatchIds.indexOf(activeBlockId);
    return idx >= 0 ? idx + 1 : 0;
  }, [activeBlockId, activePanelMatchIds]);

  const activeMatch = useMemo(() => {
    if (activeBlockId === null) return null;
    return allMatchPairs.find((m) => m.match_id === activeBlockId) ?? null;
  }, [activeBlockId, allMatchPairs]);

  useEffect(() => {
    if (totalBlocks === 0) {
      setActiveBlockId(null);
      return;
    }

    if (activeBlockId === null || !activePanelMatchIds.includes(activeBlockId)) {
      setActiveBlockId(activePanelMatchIds[0] ?? null);
    }
  }, [totalBlocks, activeBlockId, activePanelMatchIds]);

  // -------------------------------------------------------------------------
  // Interaction Logic (UX)
  // -------------------------------------------------------------------------
  const scrollToMatch = (matchId: number, targetPanel: 'source' | 'target') => {
      const lineLookup = targetPanel === 'source' ? sourceFirstLineByMatch : targetFirstLineByMatch;
      const targetLineIdx = lineLookup.get(matchId);
      if (typeof targetLineIdx !== 'number') return;
      const el = document.getElementById(`${targetPanel}-line-${targetLineIdx}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

    const jumpToBlock = (blockId: number, panel: 'source' | 'target' = activePanel) => {
      const validIds = panel === 'source' ? sourceMatchIds : targetMatchIds;
      if (!validIds.includes(blockId)) return;
      setActivePanel(panel);
      setActiveBlockId(blockId);

      scrollToMatch(blockId, panel);

      const otherPanel: 'source' | 'target' = panel === 'source' ? 'target' : 'source';
      const otherLineLookup = otherPanel === 'source' ? sourceFirstLineByMatch : targetFirstLineByMatch;

      if (otherLineLookup.has(blockId)) {
        setTimeout(() => scrollToMatch(blockId, otherPanel), 50);
        return;
      }

      if (otherPanel === 'source') {
        const sourceFileIndex = matchFileIndexLookup.sourceByMatch.get(blockId);
        if (typeof sourceFileIndex === 'number') {
          const sourceArrayIndex = sourceArrayIndexByFileIndex.get(sourceFileIndex);
          if (typeof sourceArrayIndex === 'number' && sourceArrayIndex !== sourceFileIdx) {
            setSourceFileIdx(sourceArrayIndex);
            setPendingSync({ panel: 'source', matchId: blockId });
          }
        }
      } else {
        const targetFileIndex = matchFileIndexLookup.targetByMatch.get(blockId);
        if (typeof targetFileIndex === 'number') {
          const targetArrayIndex = targetArrayIndexByFileIndex.get(targetFileIndex);
          if (typeof targetArrayIndex === 'number' && targetArrayIndex !== targetFileIdx) {
            setTargetFileIdx(targetArrayIndex);
            setPendingSync({ panel: 'target', matchId: blockId });
          }
        }
      }
  };

  useEffect(() => {
    if (!pendingSync) return;
    const lineLookup = pendingSync.panel === 'source' ? sourceFirstLineByMatch : targetFirstLineByMatch;
    if (!lineLookup.has(pendingSync.matchId)) return;

    scrollToMatch(pendingSync.matchId, pendingSync.panel);
    setPendingSync(null);
  }, [pendingSync, sourceFirstLineByMatch, targetFirstLineByMatch]);

  const jumpByDelta = (delta: number, panel: 'source' | 'target' = activePanel) => {
    const ids = panel === 'source' ? sourceMatchIds : targetMatchIds;
    if (ids.length === 0) return;

    const currentIdx = activeBlockId === null ? -1 : ids.indexOf(activeBlockId);
    let nextIdx = currentIdx + delta;
    if (currentIdx < 0) nextIdx = delta > 0 ? 0 : ids.length - 1;
    if (nextIdx < 0 || nextIdx >= ids.length) return;

    jumpToBlock(ids[nextIdx], panel);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
          return;
        }
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'j') {
        event.preventDefault();
        jumpByDelta(1, activePanel);
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        jumpByDelta(-1, activePanel);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeBlockId, totalBlocks, activePanel]);

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

  const getLineStyle = (lineIdx: number, map: Map<number, Set<number>>) => getStyleForLine(lineIdx, map, activeBlockId);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading comparison...</div>;
  if (!data || !parsedData) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Comparison not found.</div>;

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', position: 'fixed', inset: 0, minHeight:0, overflow: 'hidden',  background: 'var(--bg-base)'}}>

      {/* Top Navigation & Status Header */}
      <div style={{ padding: compactHeader ? '0.35rem 0.6rem' : '1.1rem 1.4rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>

        {/* Top row: Back button & identities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compactHeader ? '0.2rem' : '0.85rem', gap: compactHeader ? '0.35rem' : '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => currentAssignmentId && navigate(`/instructor/assignment/${currentAssignmentId}`, { state: { initialTab: 'results' } })}
            className="btn btn-outline"
            style={{ border: 'none', padding: 0, color: 'var(--text-secondary)', opacity: currentAssignmentId ? 1 : 0.6, fontSize: compactHeader ? '0.78rem' : '0.95rem' }}
            disabled={!currentAssignmentId}
          >
            <ArrowLeft size={compactHeader ? 14 : 18} /> {compactHeader ? 'Back' : 'Back to Pairwise Similarities'}
          </button>
          <div style={{ display: 'flex', gap: compactHeader ? '0.35rem' : '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCompactHeader(!compactHeader)}
              className="btn btn-outline"
              style={{ padding: compactHeader ? '0.22rem 0.42rem' : '0.35rem 0.7rem', fontSize: compactHeader ? '0.7rem' : '0.78rem' }}
              title={compactHeader ? 'Show full context header' : 'Reduce header footprint'}
            >
              {compactHeader ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              {compactHeader ? 'Expand Header' : 'Compact Header'}
            </button>
            <button
              onClick={() => setShowMatchesPanel((prev) => !prev)}
              className="btn btn-outline"
              style={{ padding: compactHeader ? '0.22rem 0.42rem' : '0.35rem 0.7rem', fontSize: compactHeader ? '0.7rem' : '0.78rem' }}
            >
              {showMatchesPanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              {showMatchesPanel ? 'Hide Matches' : 'Show Matches'}
            </button>
            <button
              onClick={() => setRevealed(!revealed)}
              className="btn btn-outline"
              style={{ padding: compactHeader ? '0.22rem 0.42rem' : '0.35rem 0.85rem', fontSize: compactHeader ? '0.7rem' : '0.8rem', borderColor: revealed ? 'var(--brand-red)' : 'var(--border-strong)', color: revealed ? 'var(--brand-red)' : 'var(--text-secondary)' }}
            >
              <Unlock size={14} /> {revealed ? 'Identities Revealed' : 'Reveal Identities'}
            </button>
          </div>
        </div>

        {/* Bottom row: Score & Context */}
        <div style={{ display: 'flex', alignItems: compactHeader ? 'flex-end' : 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>

          <div style={{ display: 'flex', alignItems: compactHeader ? 'flex-end' : 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: compactHeader ? '0.68rem' : '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                Similarity Score
                {!compactHeader && <span
                  title={"Score uses retained high-quality evidence only. Weak/generic matches are filtered out before scoring. Confidence labels describe strength of the selected linked match."}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'help',
                    userSelect: 'none'
                  }}
                >
                  ?
                </span>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: compactHeader ? '0.4rem' : '0.75rem' }}>
                <span style={{ fontSize: compactHeader ? '1.15rem' : '1.75rem', fontWeight: 700, lineHeight: 1 }}>{typeof score === 'number' ? score.toFixed(1) : '0.0'}%</span>
                {score > 80 ? (
                  <span style={{ color: '#dc2626', fontSize: compactHeader ? '0.7rem' : '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: compactHeader ? '0.08rem 0.35rem' : '0.2rem 0.6rem', background: '#fef2f2', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    <AlertOctagon size={14} /> Critical Match
                  </span>
                ) : score > 60 ? (
                  <span style={{ color: '#d97706', fontSize: compactHeader ? '0.7rem' : '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: compactHeader ? '0.08rem 0.35rem' : '0.2rem 0.6rem', background: '#fffbeb', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    <AlertOctagon size={14} /> High Match
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontSize: compactHeader ? '0.7rem' : '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: compactHeader ? '0.08rem 0.35rem' : '0.2rem 0.6rem', background: '#ecfdf5', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Normal
                  </span>
                )}
              </div>
            </div>

            {!compactHeader && <div style={{ height: '40px', width: '1px', background: 'var(--border-strong)' }}></div>}

            {!compactHeader && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Info size={14} color="var(--brand-red)" />
                The highlighted blocks represent code structure that is mathematically identical between these two students.
              </span>
              <span>Click any highlighted block to focus and sync its linked match in both panes. Use J/K or left/right arrows to jump between linked matches in the active panel.</span>
            </div>}
          </div>

          {/* File count summary */}
          {!compactHeader && (sourceFiles.length > 1 || targetFiles.length > 1) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <span>Source: {countFileMatches(sourceFiles)}/{sourceFiles.length} files with matches</span>
              <span>Target: {countFileMatches(targetFiles)}/{targetFiles.length} files with matches</span>
            </div>
          )}

        </div>
      </div>

      {/* Editor Main Split Pane */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0, flex: 1 }}>

        <div style={{ display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row', overflow: 'hidden', minWidth: 0, minHeight: 0, flex: 1 }}>

          <CodePane
            pane="source"
            title="Source Document"
            revealed={revealed}
            studentName={source_student_name}
            studentIdentity={source_student_decrypted}
            maskedIdentity={maskIdentity(source_student_decrypted)}
            submissionId={data.source_submission_id}
            onDownload={handleDownloadSubmission}
            files={sourceFiles}
            activeFileIdx={sourceFileIdx}
            onSelectFile={setSourceFileIdx}
            onAfterSelectFile={() => setActiveBlockId(0)}
            code={currentSourceCode}
            lineMatchMap={sourceLineMatchMap}
            getLineStyle={getLineStyle}
            onLineClick={jumpToBlock}
            activeBlockId={activeBlockId}
            isMobileLayout={isMobileLayout}
            withRightBorder={!isMobileLayout}
          />

          <CodePane
            pane="target"
            title="Target Document"
            revealed={revealed}
            studentName={target_student_name}
            studentIdentity={target_student_decrypted}
            maskedIdentity={maskIdentity(target_student_decrypted)}
            submissionId={data.target_submission_id}
            onDownload={handleDownloadSubmission}
            files={targetFiles}
            activeFileIdx={targetFileIdx}
            onSelectFile={setTargetFileIdx}
            onAfterSelectFile={() => setActiveBlockId(0)}
            code={currentTargetCode}
            lineMatchMap={targetLineMatchMap}
            getLineStyle={getLineStyle}
            onLineClick={jumpToBlock}
            activeBlockId={activeBlockId}
            isMobileLayout={isMobileLayout}
            withRightBorder={false}
          />

          {showMatchesPanel && isMobileLayout && (
            <div
              onClick={() => setShowMatchesPanel(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(15, 23, 42, 0.26)' }}
            />
          )}

          {showMatchesPanel && (
          <aside style={{ width: isMobileLayout ? 'min(78vw, 340px)' : (isNarrowLayout ? '340px' : '420px'), maxWidth: isMobileLayout ? '78vw' : '32vw', minWidth: isMobileLayout ? 'unset' : '320px', borderLeft: '1px solid var(--border-strong)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', minHeight: 0, position: isMobileLayout ? 'absolute' : 'relative', right: 0, top: 0, bottom: 0, zIndex: 40, boxShadow: isMobileLayout ? 'var(--shadow-lg)' : 'none' }}>
            <RelatedMatchesSidebar
              isMobileLayout={isMobileLayout}
              selectedSimilarityRange={selectedSimilarityRange}
              onSimilarityRangeChange={setSelectedSimilarityRange}
              otherMatchesSortOrder={otherMatchesSortOrder}
              onToggleSort={() => setOtherMatchesSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              otherMatchesLoading={otherMatchesLoading}
              matches={filteredAndSortedOtherMatches}
              revealed={revealed}
              onCloseMobile={() => setShowMatchesPanel(false)}
              onInspect={(matchId) => navigate(`/instructor/compare/${matchId}`)}
            />
          </aside>
          )}
        </div>
      </div>

      <FloatingMatchNavigator
        isMobileLayout={isMobileLayout}
        activePanel={activePanel}
        activePanelPosition={activePanelPosition}
        totalBlocks={totalBlocks}
        activeBlockId={activeBlockId}
        activeMatch={activeMatch}
        onPrev={() => jumpByDelta(-1, activePanel)}
        onNext={() => jumpByDelta(1, activePanel)}
      />

    </div>
  );
};

export default ComparisonView;
