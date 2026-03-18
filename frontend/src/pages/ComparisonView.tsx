import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertOctagon, Unlock, ChevronLeft, ChevronRight, LocateFixed, Info } from 'lucide-react';
import axios from 'axios';

const ComparisonView: React.FC = () => {
  const { comparison_id } = useParams();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Track the CURRENTLY focused match block
  const [activeBlockId, setActiveBlockId] = useState<number | null>(0);

  useEffect(() => {
    const fetchComparison = async () => {
      const token = localStorage.getItem('token');
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
  }, [comparison_id]);

  // -------------------------------------------------------------------------
  // Process Data & Maps
  // -------------------------------------------------------------------------
  const parsedData = useMemo(() => {
    if (!data) return null;
    const { source_code, target_code, metadata } = data;
    
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

    const sLines = getHighlightedLines(source_code, metadata?.source_ranges || []);
    const tLines = getHighlightedLines(target_code, metadata?.target_ranges || []);
    
    const sMap = getLineToBlockMap(sLines);
    const tMap = getLineToBlockMap(tLines);
    
    const total = Math.max(
        sMap.size > 0 ? Math.max(...Array.from(sMap.values())) + 1 : 0,
        tMap.size > 0 ? Math.max(...Array.from(tMap.values())) + 1 : 0
    );

    return { sMap, tMap, totalBlocks: total };
  }, [data]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading comparison...</div>;
  if (!data || !parsedData) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Comparison not found.</div>;

  const { score, source_student_decrypted, target_student_decrypted, source_code, target_code } = data;
  const { sMap, tMap, totalBlocks } = parsedData;

  const maskIdentity = (id: string) => {
    if (id.length > 4) return id.substring(0, 2) + "****" + id.substring(id.length - 2);
    return "Student_Hidden";
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

  // Modern UI Colors for Highlight States (Light Theme)
  const ACTIVE_MATCH_BG = 'rgba(234, 179, 8, 0.35)'; // Yellow highlight
  const ACTIVE_MATCH_BORDER = '#ca8a04';
  
  const INACTIVE_MATCH_BG = 'rgba(170, 0, 0, 0.05)'; // Subtle Brock Red
  const INACTIVE_MATCH_BORDER = 'rgba(170, 0, 0, 0.2)';

  const getStyleForLine = (lineIdx: number, map: Map<number, number>) => {
      if (!map.has(lineIdx)) return { bg: 'transparent', border: 'transparent', blockId: -1, isActive: false };
      
      const blockId = map.get(lineIdx)!;
      const isActive = blockId === activeBlockId;
      
      return { 
        bg: isActive ? ACTIVE_MATCH_BG : INACTIVE_MATCH_BG, 
        border: isActive ? ACTIVE_MATCH_BORDER : INACTIVE_MATCH_BORDER,
        blockId,
        isActive
      };
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1 }}>
      
      {/* Top Navigation & Status Header */}
      <div style={{ padding: '1.25rem 2.5rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        
        {/* Top row: Back button & identities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ border: 'none', padding: 0, color: 'var(--text-secondary)' }}>
            <ArrowLeft size={18} /> Back to Assignment
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
                <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{score.toFixed(1)}%</span>
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
          
        </div>
      </div>

      {/* Editor Main Split Pane */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        
        {/* Source Side */}
        <div style={{ flex: 1, borderRight: '2px solid var(--border-strong)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minWidth: 0, position: 'relative' }}>
          <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-surface-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Source Document</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: revealed ? 'var(--brand-red)' : 'var(--text-primary)', fontSize: '0.95rem', fontWeight: revealed ? 600 : 500 }}>
                {revealed ? source_student_decrypted : maskIdentity(source_student_decrypted)}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, padding: '1.5rem 0', paddingBottom: '8rem', overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {source_code.split('\n').map((line: string, i: number) => {
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
                      opacity: (activeBlockId !== null && isClickable && !style.isActive) ? 0.7 : 1, // Dim inactive matches slightly
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minWidth: 0, position: 'relative' }}>
          <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-surface-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Target Document</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: revealed ? 'var(--brand-red)' : 'var(--text-primary)', fontSize: '0.95rem', fontWeight: revealed ? 600 : 500 }}>
                {revealed ? target_student_decrypted : maskIdentity(target_student_decrypted)}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, padding: '1.5rem 0', paddingBottom: '8rem', overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
             {target_code.split('\n').map((line: string, i: number) => {
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
                      marginLeft: '2px', // Prevent border overlapping center divider
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
