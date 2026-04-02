import jsPDF from 'jspdf';
import type { FileEntry, MatchPair } from '../components/comparison/types';
import { MATCH_COLOR_PALETTE } from '../components/comparison/comparisonUtils';

type Color = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Font sizing
const FONT_SIZE_CODE = 7;
const LINE_H = 3.8;
const HEADER_H = 7;
const FILE_HEADER_H = 9;

// Colors
const C_BRAND: Color = [153, 27, 27];
const C_INK: Color = [15, 23, 42];
const C_MUTED: Color = [100, 116, 139];
const C_LINE: Color = [226, 232, 240];
const C_WHITE: Color = [255, 255, 255];
const C_PAPER: Color = [248, 250, 252];
const C_CODE_BG: Color = [30, 41, 59];
const C_LINE_NUM: Color = [148, 163, 184];

// Highlight palette matching the UI (solid fills for PDF)
const HIGHLIGHT_COLORS: Color[] = [
  [253, 224, 132],  // amber
  [191, 219, 254],  // blue
  [254, 202, 202],  // red
  [251, 207, 232],  // pink
  [221, 214, 254],  // violet
  [186, 230, 253],  // sky
];

function buildLineHighlightMap(files: FileEntry[], allMatchPairs: MatchPair[]): Map<string, Map<number, number>> {
  // Returns: Map<filename, Map<lineIndex, matchId>>
  const result = new Map<string, Map<number, number>>();

  for (const file of files) {
    const lineMap = new Map<number, number>();
    result.set(file.filename, lineMap);

    if (allMatchPairs.length > 0) {
      const fileIndex = file.file_index ?? 0;
      for (const pair of allMatchPairs) {
        // Determine whether this file is source or target based on which side has this file_index
        // We'll handle both source and target ranges — caller passes the right side's files
        for (const ranges of [pair.source, pair.target]) {
          for (const range of ranges) {
            if ((range.file_index ?? 0) !== fileIndex) continue;
            // Map char positions to lines
            const lines = file.code.split('\n');
            let charPos = 0;
            for (let li = 0; li < lines.length; li++) {
              const lineEnd = charPos + lines[li].length;
              if (charPos <= range.end && lineEnd >= range.start) {
                if (!lineMap.has(li)) lineMap.set(li, pair.match_id);
              }
              charPos = lineEnd + 1; // +1 for \n
            }
          }
        }
      }
    } else {
      // Synthesize from file ranges
      const lines = file.code.split('\n');
      for (let rangeIdx = 0; rangeIdx < (file.ranges || []).length; rangeIdx++) {
        const range = file.ranges[rangeIdx];
        let charPos = 0;
        for (let li = 0; li < lines.length; li++) {
          const lineEnd = charPos + lines[li].length;
          if (charPos <= range.end && lineEnd >= range.start) {
            if (!lineMap.has(li)) lineMap.set(li, rangeIdx);
          }
          charPos = lineEnd + 1;
        }
      }
    }
  }

  return result;
}

function drawPageHeader(doc: jsPDF, pane: 'source' | 'target', identity: string, score: number, pageNum: number, totalPages: number) {
  const y = MARGIN;

  // Brand bar
  doc.setFillColor(...C_BRAND);
  doc.rect(MARGIN, y, CONTENT_W, HEADER_H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C_WHITE);
  const label = pane === 'source' ? 'SOURCE DOCUMENT' : 'TARGET DOCUMENT';
  doc.text(label, MARGIN + 3, y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${identity}   ·   Similarity: ${score.toFixed(1)}%`, MARGIN + 3, y + 6.8 + 0.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C_WHITE);
  const pageLabel = `Page ${pageNum} / ${totalPages}`;
  doc.text(pageLabel, PAGE_W - MARGIN - doc.getTextWidth(pageLabel), y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.text(`CodeSimilar · Generated ${dateStr}`, PAGE_W - MARGIN - doc.getTextWidth(`CodeSimilar · Generated ${dateStr}`), y + 6.8 + 0.5);
}

function drawFileHeader(doc: jsPDF, filename: string, matchCount: number, y: number): number {
  doc.setFillColor(...C_PAPER);
  doc.setDrawColor(...C_LINE);
  doc.rect(MARGIN, y, CONTENT_W, FILE_HEADER_H, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C_INK);
  doc.text(filename, MARGIN + 3, y + 5.5);

  if (matchCount > 0) {
    const pill = `${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
    const pillW = doc.getTextWidth(pill) + 4;
    const pillX = PAGE_W - MARGIN - pillW - 2;
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(pillX, y + 2, pillW, 4.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(pill, pillX + 2, y + 5.3);
  }

  return y + FILE_HEADER_H;
}

function renderFile(
  doc: jsPDF,
  file: FileEntry,
  lineHighlightMap: Map<number, number>,
  pane: 'source' | 'target',
  identity: string,
  score: number,
  pageTracker: { pageNum: number; totalPages: number },
  yRef: { y: number }
): void {
  const lines = file.code.split('\n');
  const lineNumW = 9;
  const codeX = MARGIN + lineNumW + 1;
  const codeW = CONTENT_W - lineNumW - 1;

  // Count unique matches
  const uniqueMatches = new Set(lineHighlightMap.values()).size;

  // Draw file header
  if (yRef.y + FILE_HEADER_H > PAGE_H - MARGIN) {
    doc.addPage();
    pageTracker.pageNum++;
    drawPageHeader(doc, pane, identity, score, pageTracker.pageNum, pageTracker.totalPages);
    yRef.y = MARGIN + HEADER_H + 2;
  }
  yRef.y = drawFileHeader(doc, file.filename, uniqueMatches, yRef.y) + 1;

  doc.setFont('courier', 'normal');
  doc.setFontSize(FONT_SIZE_CODE);

  for (let li = 0; li < lines.length; li++) {
    const lineText = lines[li];
    const matchId = lineHighlightMap.get(li);
    const isHighlighted = matchId !== undefined;

    // Wrap long lines
    const wrappedLines = doc.splitTextToSize(lineText || ' ', codeW - 2);

    const blockH = wrappedLines.length * LINE_H;

    // Page break
    if (yRef.y + blockH > PAGE_H - MARGIN) {
      doc.addPage();
      pageTracker.pageNum++;
      drawPageHeader(doc, pane, identity, score, pageTracker.pageNum, pageTracker.totalPages);
      yRef.y = MARGIN + HEADER_H + 2;
    }

    const bgColor: Color = isHighlighted
      ? HIGHLIGHT_COLORS[matchId! % HIGHLIGHT_COLORS.length]
      : C_WHITE;

    // Row background
    doc.setFillColor(...bgColor);
    doc.rect(MARGIN, yRef.y, CONTENT_W, blockH, 'F');

    // Highlight left border
    if (isHighlighted) {
      const borderColor = MATCH_COLOR_PALETTE[matchId! % MATCH_COLOR_PALETTE.length].activeBorder;
      const hex = borderColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      doc.setFillColor(r, g, b);
      doc.rect(MARGIN, yRef.y, 1.2, blockH, 'F');
    }

    // Line number
    doc.setTextColor(...C_MUTED);
    doc.setFont('courier', 'normal');
    doc.setFontSize(FONT_SIZE_CODE - 0.5);
    doc.text(String(li + 1), MARGIN + lineNumW - 1, yRef.y + LINE_H * 0.78, { align: 'right' });

    // Separator line
    doc.setDrawColor(...C_LINE);
    doc.setLineWidth(0.1);
    doc.line(MARGIN + lineNumW, yRef.y, MARGIN + lineNumW, yRef.y + blockH);

    // Code text
    doc.setTextColor(...C_INK);
    doc.setFont('courier', 'normal');
    doc.setFontSize(FONT_SIZE_CODE);
    for (let wi = 0; wi < wrappedLines.length; wi++) {
      doc.text(wrappedLines[wi], codeX + 1, yRef.y + LINE_H * (wi + 0.78));
    }

    yRef.y += blockH;
  }

  yRef.y += 3; // gap after file
}

export function generateComparisonPDF(
  pane: 'source' | 'target',
  files: FileEntry[],
  allMatchPairs: MatchPair[],
  identity: string,
  score: number,
  filename: string
): void {
  if (files.length === 0) return;

  // Build line highlight maps for all files
  const allHighlightMaps = buildLineHighlightMap(files, allMatchPairs);

  // --- Two-pass rendering: first pass counts pages, second renders ---
  // For simplicity, we do a single pass and patch page numbers afterward.
  // jsPDF doesn't support deferred page count easily, so we estimate first.

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setFont('courier', 'normal');

  const pageTracker = { pageNum: 1, totalPages: 1 }; // will patch after render
  const yRef = { y: MARGIN + HEADER_H + 2 };

  // Draw page 1 header placeholder
  drawPageHeader(doc, pane, identity, score, 1, 1);

  for (const file of files) {
    const lineHighlightMap = allHighlightMaps.get(file.filename) ?? new Map<number, number>();
    renderFile(doc, file, lineHighlightMap, pane, identity, score, pageTracker, yRef);
  }

  // Patch total pages in header on all pages
  pageTracker.totalPages = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  const totalPages = pageTracker.totalPages;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Overdraw with correct page count
    drawPageHeader(doc, pane, identity, score, p, totalPages);
  }

  doc.save(filename);
}
