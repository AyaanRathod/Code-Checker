import type {
  ComparisonData,
  FileEntry,
  FileRange,
  LineHighlightStyle,
  MatchPair,
  OtherAssignmentMatch,
  ParsedComparisonData,
} from './types';

export const MATCH_COLOR_PALETTE = [
  {
    activeBg: 'rgba(245, 158, 11, 0.34)',
    activeBorder: '#d97706',
    inactiveBg: 'rgba(245, 158, 11, 0.14)',
    inactiveBorder: 'rgba(217, 119, 6, 0.34)',
  },
  {
    activeBg: 'rgba(59, 130, 246, 0.28)',
    activeBorder: '#2563eb',
    inactiveBg: 'rgba(59, 130, 246, 0.12)',
    inactiveBorder: 'rgba(37, 99, 235, 0.3)',
  },
  {
    activeBg: 'rgba(239, 68, 68, 0.24)',
    activeBorder: '#dc2626',
    inactiveBg: 'rgba(239, 68, 68, 0.1)',
    inactiveBorder: 'rgba(220, 38, 38, 0.26)',
  },
  {
    activeBg: 'rgba(236, 72, 153, 0.24)',
    activeBorder: '#db2777',
    inactiveBg: 'rgba(236, 72, 153, 0.1)',
    inactiveBorder: 'rgba(219, 39, 119, 0.26)',
  },
  {
    activeBg: 'rgba(139, 92, 246, 0.24)',
    activeBorder: '#7c3aed',
    inactiveBg: 'rgba(139, 92, 246, 0.1)',
    inactiveBorder: 'rgba(124, 58, 237, 0.26)',
  },
  {
    activeBg: 'rgba(14, 165, 233, 0.24)',
    activeBorder: '#0284c7',
    inactiveBg: 'rgba(14, 165, 233, 0.1)',
    inactiveBorder: 'rgba(2, 132, 199, 0.26)',
  },
] as const;

export const buildMaskedIdentity = (id: string) => {
  if (!id) return '';
  if (id.length > 4) return `${id.substring(0, 2)}****${id.substring(id.length - 2)}`;
  return id;
};

export const maskIdentity = (id: string) => {
  if (id.length > 4) return id.substring(0, 2) + '****' + id.substring(id.length - 2);
  return 'Student_Hidden';
};

export const getIdentityTokens = (id: string) => {
  const tokens = new Set<string>();
  if (!id) return tokens;

  const trimmed = id.trim();
  if (!trimmed) return tokens;

  tokens.add(trimmed.toLowerCase());
  tokens.add(buildMaskedIdentity(trimmed).toLowerCase());
  return tokens;
};

export const buildSourceFiles = (data: ComparisonData | null): FileEntry[] => {
  if (!data) return [];
  if (data.source_files && data.source_files.length > 0) return data.source_files;
  return [{ file_index: 0, filename: 'source', code: data.source_code || '', ranges: data.metadata?.source_ranges || [] }];
};

export const buildTargetFiles = (data: ComparisonData | null): FileEntry[] => {
  if (!data) return [];
  if (data.target_files && data.target_files.length > 0) return data.target_files;
  return [{ file_index: 0, filename: 'target', code: data.target_code || '', ranges: data.metadata?.target_ranges || [] }];
};

export const parseMatchPairs = (data: ComparisonData | null): MatchPair[] => {
  const pairs = data?.metadata?.matched_pairs;
  if (!Array.isArray(pairs)) return [];

  return pairs
    .filter((pair): pair is Record<string, unknown> => !!pair && typeof pair === 'object')
    .filter((pair) => typeof pair.match_id === 'number' && Array.isArray(pair.source) && Array.isArray(pair.target))
    .map((pair) => ({
      match_id: pair.match_id as number,
      confidence: pair.confidence as MatchPair['confidence'],
      min_span_chars: pair.min_span_chars as number | undefined,
      hash_count: pair.hash_count as number | undefined,
      pair_count: pair.pair_count as number | undefined,
      source: pair.source as FileRange[],
      target: pair.target as FileRange[],
    }));
};

const buildCharToLineMap = (code: string) => {
  const charToLine: number[] = [];
  let currentLine = 0;
  for (let i = 0; i < code.length; i++) {
    charToLine[i] = currentLine;
    if (code[i] === '\n') currentLine++;
  }
  return charToLine;
};

const markRange = (
  lineMap: Map<number, Set<number>>,
  firstLineMap: Map<number, number>,
  matchId: number,
  start: number,
  end: number,
  codeLength: number,
  charToLine: number[]
) => {
  if (codeLength === 0) return;
  const startLine = charToLine[Math.min(Math.max(start, 0), codeLength - 1)] || 0;
  const endLine = charToLine[Math.min(Math.max(end, 0), codeLength - 1)] || 0;

  if (!firstLineMap.has(matchId)) {
    firstLineMap.set(matchId, startLine);
  }

  for (let line = startLine; line <= endLine; line++) {
    if (!lineMap.has(line)) lineMap.set(line, new Set<number>());
    lineMap.get(line)?.add(matchId);
  }
};

export const buildParsedData = (
  data: ComparisonData | null,
  sourceFiles: FileEntry[],
  targetFiles: FileEntry[],
  sourceFileIdx: number,
  targetFileIdx: number,
  allMatchPairs: MatchPair[]
): ParsedComparisonData | null => {
  if (!data) return null;
  const currentSource = sourceFiles[sourceFileIdx];
  const currentTarget = targetFiles[targetFileIdx];
  if (!currentSource || !currentTarget) return null;

  const sourceFileIndex = currentSource.file_index ?? sourceFileIdx;
  const targetFileIndex = currentTarget.file_index ?? targetFileIdx;

  const sourceCharToLine = buildCharToLineMap(currentSource.code);
  const targetCharToLine = buildCharToLineMap(currentTarget.code);

  const sourceLineMatchMap = new Map<number, Set<number>>();
  const targetLineMatchMap = new Map<number, Set<number>>();
  const sourceFirstLineByMatch = new Map<number, number>();
  const targetFirstLineByMatch = new Map<number, number>();
  const sourceMatchIds = new Set<number>();
  const targetMatchIds = new Set<number>();

  if (allMatchPairs.length > 0) {
    allMatchPairs.forEach((pair) => {
      const matchId = pair.match_id;

      pair.source.forEach((range) => {
        if ((range.file_index ?? 0) !== sourceFileIndex) return;
        sourceMatchIds.add(matchId);
        markRange(
          sourceLineMatchMap,
          sourceFirstLineByMatch,
          matchId,
          range.start,
          range.end,
          currentSource.code.length,
          sourceCharToLine
        );
      });

      pair.target.forEach((range) => {
        if ((range.file_index ?? 0) !== targetFileIndex) return;
        targetMatchIds.add(matchId);
        markRange(
          targetLineMatchMap,
          targetFirstLineByMatch,
          matchId,
          range.start,
          range.end,
          currentTarget.code.length,
          targetCharToLine
        );
      });
    });
  } else {
    const synthesize = (
      ranges: FileRange[],
      lineMap: Map<number, Set<number>>,
      firstLineMap: Map<number, number>,
      matchIds: Set<number>,
      codeLength: number,
      charToLine: number[]
    ) => {
      ranges.forEach((range, idx) => {
        matchIds.add(idx);
        markRange(lineMap, firstLineMap, idx, range.start, range.end, codeLength, charToLine);
      });
    };

    synthesize(currentSource.ranges || [], sourceLineMatchMap, sourceFirstLineByMatch, sourceMatchIds, currentSource.code.length, sourceCharToLine);
    synthesize(currentTarget.ranges || [], targetLineMatchMap, targetFirstLineByMatch, targetMatchIds, currentTarget.code.length, targetCharToLine);
  }

  return {
    sourceLineMatchMap,
    targetLineMatchMap,
    sourceFirstLineByMatch,
    targetFirstLineByMatch,
    sourceMatchIds: Array.from(sourceMatchIds).sort((a, b) => a - b),
    targetMatchIds: Array.from(targetMatchIds).sort((a, b) => a - b),
  };
};

export const getStyleForLine = (
  lineIdx: number,
  map: Map<number, Set<number>>,
  activeBlockId: number | null
): LineHighlightStyle => {
  const ids = map.get(lineIdx);
  if (!ids || ids.size === 0) {
    return { bg: 'transparent', border: 'transparent', blockId: -1, isActive: false };
  }

  const sortedIds = Array.from(ids).sort((a, b) => a - b);
  const blockId = sortedIds[0];
  const isActive = activeBlockId !== null && ids.has(activeBlockId);
  const paletteId = activeBlockId !== null && ids.has(activeBlockId) ? activeBlockId : blockId;
  const palette = MATCH_COLOR_PALETTE[paletteId % MATCH_COLOR_PALETTE.length];

  return {
    bg: isActive ? palette.activeBg : palette.inactiveBg,
    border: isActive ? palette.activeBorder : palette.inactiveBorder,
    blockId,
    isActive,
  };
};

export const countFileMatches = (files: FileEntry[]) => files.filter((file) => file.ranges && file.ranges.length > 0).length;

export const filterAndSortOtherMatches = (
  matches: OtherAssignmentMatch[],
  selectedSimilarityRange: string,
  otherMatchesSortOrder: 'desc' | 'asc'
) => {
  const filtered = matches.filter((match) => {
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

  return [...filtered].sort((a, b) => (otherMatchesSortOrder === 'desc' ? b.score - a.score : a.score - b.score));
};
