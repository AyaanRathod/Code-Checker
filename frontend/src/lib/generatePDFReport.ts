import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AssignmentComparisonItem,
  AssignmentDetailsModel,
  AssignmentMetrics,
  AssignmentSubmissionItem,
} from '../components/assignment-details/types';
import {
  buildUniqueMatrixIds,
  findComparisonPair,
  formatBytes,
} from '../components/assignment-details/assignmentDetailsUtils';

type Color = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

const PALETTE = {
  primary: [153, 27, 27] as Color,
  primaryDark: [110, 18, 18] as Color,
  ink: [15, 23, 42] as Color,
  text: [51, 65, 85] as Color,
  muted: [100, 116, 139] as Color,
  line: [226, 232, 240] as Color,
  paper: [248, 250, 252] as Color,
  white: [255, 255, 255] as Color,
  softBlue: [239, 246, 255] as Color,
  softRose: [254, 242, 242] as Color,
  softAmber: [255, 247, 237] as Color,
  softGold: [254, 252, 232] as Color,
  softGreen: [240, 253, 244] as Color,
  softSlate: [241, 245, 249] as Color,
};

const RISK = {
  high: [220, 38, 38] as Color,
  highBg: [254, 242, 242] as Color,
  medium: [234, 88, 12] as Color,
  mediumBg: [255, 247, 237] as Color,
  low: [161, 98, 7] as Color,
  lowBg: [254, 252, 232] as Color,
  minimal: [22, 163, 74] as Color,
  minimalBg: [240, 253, 244] as Color,
};

const DISTRIBUTION_COLORS = [
  [22, 163, 74] as Color,
  [132, 204, 22] as Color,
  [234, 179, 8] as Color,
  [249, 115, 22] as Color,
  [220, 38, 38] as Color,
];

const STATUS_COLORS: Record<string, { fill: Color; text: Color }> = {
  open: { fill: [100, 116, 139], text: PALETTE.white },
  closed: { fill: [22, 163, 74], text: PALETTE.white },
  archived: { fill: [124, 58, 237], text: PALETTE.white },
  analyzing: { fill: [37, 99, 235], text: PALETTE.white },
  default: { fill: [71, 85, 105], text: PALETTE.white },
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report';
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Toronto',
  }).format(new Date(iso));
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getStatusStyle(status: string): { fill: Color; text: Color; label: string } {
  const key = status.toLowerCase();

  if (key.includes('archiv')) {
    return { fill: STATUS_COLORS.archived.fill, text: STATUS_COLORS.archived.text, label: 'ARCHIVED' };
  }

  if (key.includes('analys')) {
    return { fill: STATUS_COLORS.analyzing.fill, text: STATUS_COLORS.analyzing.text, label: 'ANALYZING' };
  }

  if (key.includes('close')) {
    return { fill: STATUS_COLORS.closed.fill, text: STATUS_COLORS.closed.text, label: 'CLOSED' };
  }

  if (key.includes('open')) {
    return { fill: STATUS_COLORS.open.fill, text: STATUS_COLORS.open.text, label: 'OPEN' };
  }

  return { fill: STATUS_COLORS.default.fill, text: STATUS_COLORS.default.text, label: key.toUpperCase() || 'STATUS' };
}

function getRiskBand(score: number): { label: string; fill: Color; text: Color; soft: Color } {
  if (score > 80) return { label: 'HIGH RISK', fill: RISK.high, text: PALETTE.white, soft: RISK.highBg };
  if (score > 60) return { label: 'MEDIUM RISK', fill: RISK.medium, text: PALETTE.white, soft: RISK.mediumBg };
  if (score > 40) return { label: 'LOW RISK', fill: RISK.low, text: PALETTE.white, soft: RISK.lowBg };
  return { label: 'MINIMAL', fill: RISK.minimal, text: PALETTE.white, soft: RISK.minimalBg };
}

function drawPill(doc: jsPDF, x: number, y: number, w: number, h: number, text: string, fill: Color, textColor: Color): void {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  doc.setTextColor(...textColor);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(text, x + w / 2, y + h / 2 + 1.6, { align: 'center' });
}

function drawHeaderBand(doc: jsPDF, course: string, section: string): void {
  doc.setFillColor(...PALETTE.primary);
  doc.rect(0, 0, PAGE_W, 12, 'F');

  doc.setTextColor(...PALETTE.white);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(course || 'Course', MARGIN, 7);
  doc.setFont('helvetica', 'normal');
  doc.text(section, PAGE_W - MARGIN, 7, { align: 'right' });
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);

  doc.setTextColor(...PALETTE.muted);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text('CONFIDENTIAL - Academic integrity review only.', MARGIN, PAGE_H - 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: Color,
  note?: string,
): void {
  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');

  doc.setFillColor(...accent);
  doc.rect(x, y, w, 2, 'F');

  doc.setTextColor(...accent);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + w / 2, y + 11, { align: 'center' });

  doc.setTextColor(...PALETTE.muted);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(label.toUpperCase(), x + w / 2, y + 18, { align: 'center' });

  if (note) {
    doc.setTextColor(...PALETTE.text);
    doc.setFontSize(6.2);
    const lines = doc.splitTextToSize(note, w - 6);
    doc.text(lines, x + 3, y + 22);
  }
}

function drawNotePanel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body: string | string[],
  accent: Color,
  fill: Color = PALETTE.white,
): void {
  doc.setFillColor(...fill);
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  doc.setFillColor(...accent);
  doc.rect(x, y, 3, h, 'F');

  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 6, y + 8);

  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');
  const bodyLines = Array.isArray(body)
    ? body.flatMap((line) => doc.splitTextToSize(line, w - 12))
    : doc.splitTextToSize(body, w - 12);
  doc.text(bodyLines, x + 6, y + 15);
}

function drawDistributionBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  counts: number[],
): number {
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  const labels = ['0-19', '20-39', '40-59', '60-79', '80-100'];

  doc.setFillColor(...PALETTE.paper);
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 10, 2, 2, 'FD');

  let offset = x;
  counts.forEach((count, index) => {
    const segmentWidth = (count / total) * w;
    if (segmentWidth > 0) {
      doc.setFillColor(...DISTRIBUTION_COLORS[index]);
      doc.rect(offset, y, segmentWidth, 10, 'F');
      offset += segmentWidth;
    }
  });

  let legendX = x;
  counts.forEach((count, index) => {
    const segmentWidth = w / counts.length;
    const pct = ((count / total) * 100).toFixed(0);
    doc.setFillColor(...DISTRIBUTION_COLORS[index]);
    doc.roundedRect(legendX, y + 13, 3.5, 3.5, 0.7, 0.7, 'F');
    doc.setTextColor(...PALETTE.text);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${labels[index]}: ${count} (${pct}%)`, legendX + 5.5, y + 16);
    legendX += segmentWidth;
  });

  return y + 22;
}

function drawTopFindingCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  rank: number,
  item: AssignmentComparisonItem,
): void {
  const band = getRiskBand(item.score);
  const typeLabel = item.comparison_type === 'cross_repo' ? 'Cross Repo' : 'Internal';

  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  doc.setFillColor(...band.soft);
  doc.rect(x, y, w, 4, 'F');

  doc.setFillColor(...PALETTE.primary);
  doc.roundedRect(x + 4, y + 6, 11, 11, 2, 2, 'F');
  doc.setTextColor(...PALETTE.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(String(rank), x + 9.5, y + 13, { align: 'center' });

  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${item.source_student} to ${item.target_student}`, x + 19, y + 11);

  doc.setTextColor(...band.fill);
  doc.setFontSize(15);
  doc.text(formatPercent(item.score), x + w - 6, y + 12, { align: 'right' });

  drawPill(doc, x + 19, y + 15.5, 28, 6, typeLabel, band.fill, band.text);
  drawPill(doc, x + 49, y + 15.5, 30, 6, band.label, band.fill, band.text);

  doc.setFillColor(...PALETTE.softSlate);
  doc.roundedRect(x + 19, y + h - 6, w - 24, 2.4, 1, 1, 'F');
  doc.setFillColor(...band.fill);
  doc.roundedRect(x + 19, y + h - 6, clamp((w - 24) * (item.score / 100), 0, w - 24), 2.4, 1, 1, 'F');
}

function drawHeatmapPage(
  doc: jsPDF,
  course: string,
  assignmentTitle: string,
  comparisons: AssignmentComparisonItem[],
  matrixIds: string[],
): void {
  drawHeaderBand(doc, course, 'Similarity Map');

  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Similarity Map', MARGIN, 22);

  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const subtitle = `Printed relationship map for ${assignmentTitle}. Red cells indicate the strongest similarity, while pale cells indicate no recorded comparison.`;
  const subtitleLines = doc.splitTextToSize(subtitle, CONTENT_W);
  doc.text(subtitleLines, MARGIN, 29);

  const topY = 38 + subtitleLines.length * 4;
  const n = matrixIds.length;
  const cellSize = clamp(Math.floor((CONTENT_W - 10) / (n + 1)), 5, 11);
  const originX = MARGIN + cellSize + 2;
  const originY = topY + 8;

  doc.setTextColor(...PALETTE.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Diagonal cells are self references and are intentionally neutral.', MARGIN, topY);

  matrixIds.forEach((id, index) => {
    doc.setTextColor(...PALETTE.ink);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(id.slice(-4), originX + index * cellSize + cellSize / 2, originY - 2, { align: 'center' });
    doc.text(id.slice(-4), originX - 2, originY + index * cellSize + cellSize / 2 + 1.6, { align: 'right' });
  });

  matrixIds.forEach((rowId, rowIndex) => {
    matrixIds.forEach((colId, colIndex) => {
      const x = originX + colIndex * cellSize;
      const y = originY + rowIndex * cellSize;

      if (rowId === colId) {
        doc.setFillColor(215, 219, 224);
      } else {
        const pair = findComparisonPair(comparisons, rowId, colId);
        const score = pair?.score || 0;

        if (score === 0) {
          doc.setFillColor(245, 247, 250);
        } else {
          const band = getRiskBand(score);
          const blend = 0.3 + (score / 100) * 0.7;
          doc.setFillColor(
            Math.round(255 - (255 - band.fill[0]) * blend),
            Math.round(255 - (255 - band.fill[1]) * blend),
            Math.round(255 - (255 - band.fill[2]) * blend),
          );
        }
      }

      doc.rect(x, y, cellSize, cellSize, 'F');
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.15);
      doc.rect(x, y, cellSize, cellSize, 'S');

      if (rowId !== colId) {
        const pair = findComparisonPair(comparisons, rowId, colId);
        const score = pair?.score || 0;
        if (score > 0 && cellSize >= 8) {
          doc.setTextColor(score > 60 ? 255 : 50, score > 60 ? 255 : 50, score > 60 ? 255 : 50);
          doc.setFontSize(4.5);
          doc.setFont('helvetica', 'bold');
          doc.text(String(Math.round(score)), x + cellSize / 2, y + cellSize / 2 + 1.5, { align: 'center' });
        }
      }
    });
  });

  const legendY = originY + n * cellSize + 10;
  const legendItems = [
    { label: 'High risk', color: RISK.high },
    { label: 'Medium', color: RISK.medium },
    { label: 'Low', color: RISK.low },
    { label: 'Minimal', color: RISK.minimal },
    { label: 'No comparison', color: [220, 224, 230] as Color },
  ];

  let legendX = MARGIN;
  legendItems.forEach((item) => {
    doc.setFillColor(...item.color);
    doc.roundedRect(legendX, legendY, 5, 3.5, 0.5, 0.5, 'F');
    doc.setTextColor(...PALETTE.text);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, legendX + 7, legendY + 2.8);
    legendX += 38;
  });
}

export function generatePDFReport(
  assignment: AssignmentDetailsModel,
  submissions: AssignmentSubmissionItem[],
  comparisons: AssignmentComparisonItem[],
  metrics: AssignmentMetrics,
  instructorName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const reportDate = new Date();

  const sortedComparisons = [...comparisons].sort((a, b) => b.score - a.score);
  const totalComparisons = comparisons.length;
  const highRisk = comparisons.filter((comparison) => comparison.score > 80);
  const mediumRisk = comparisons.filter((comparison) => comparison.score > 60 && comparison.score <= 80);
  const lowRisk = comparisons.filter((comparison) => comparison.score > 40 && comparison.score <= 60);
  const minimalRisk = comparisons.filter((comparison) => comparison.score <= 40);
  const reviewBand = mediumRisk.length;
  const uniqueStudents = new Set(comparisons.flatMap((comparison) => [comparison.source_student, comparison.target_student])).size;
  const crossRepoCount = comparisons.filter((comparison) => comparison.comparison_type === 'cross_repo').length;
  const flaggedSubmissions = submissions.filter((submission) => submission.is_flagged || submission.status.toLowerCase().includes('flag')).length;
  const totalLines = submissions.reduce((sum, submission) => sum + submission.total_lines, 0);
  const totalBytes = submissions.reduce((sum, submission) => sum + submission.total_bytes, 0);

  const distribution = [0, 0, 0, 0, 0];
  comparisons.forEach((comparison) => {
    if (comparison.score < 20) distribution[0] += 1;
    else if (comparison.score < 40) distribution[1] += 1;
    else if (comparison.score < 60) distribution[2] += 1;
    else if (comparison.score < 80) distribution[3] += 1;
    else distribution[4] += 1;
  });

  const averageScore = totalComparisons
    ? comparisons.reduce((sum, comparison) => sum + comparison.score, 0) / totalComparisons
    : metrics.avg;

  const topFindings = sortedComparisons.slice(0, 4);
  const courseLabel = assignment.course || 'Course';
  const assignmentLabel = assignment.title || 'Assignment';
  const statusStyle = getStatusStyle(assignment.status || '');
  const fileName = `code-checker-report-${slugify(courseLabel)}-${slugify(assignmentLabel)}-${reportDate.toISOString().slice(0, 10)}.pdf`;

  // Cover page
  doc.setFillColor(...PALETTE.primary);
  doc.rect(0, 0, PAGE_W, 34, 'F');
  doc.setFillColor(...PALETTE.primaryDark);
  doc.rect(0, 0, PAGE_W, 6, 'F');

  doc.setTextColor(...PALETTE.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setCharSpace(1.5);
  doc.text('ACADEMIC INTEGRITY REPORT', MARGIN, 20);
  doc.setCharSpace(0);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateTime(reportDate.toISOString()), PAGE_W - MARGIN, 12, { align: 'right' });
  doc.text('Print edition of the analysis dashboard', PAGE_W - MARGIN, 20, { align: 'right' });

  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, 22, CONTENT_W, 100, 4, 4, 'FD');
  doc.setFillColor(...PALETTE.primary);
  doc.rect(MARGIN, 22, 4, 100, 'F');

  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(courseLabel.toUpperCase(), MARGIN + 8, 35);
  drawPill(doc, MARGIN + 8, 39, 30, 8, statusStyle.label, statusStyle.fill, statusStyle.text);
  drawPill(doc, MARGIN + 40, 39, 28, 8, `${totalComparisons} PAIRS`, PALETTE.softBlue, PALETTE.primary);

  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(assignmentLabel, CONTENT_W - 16);
  doc.text(titleLines, MARGIN + 8, 55);

  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared for ${instructorName}`, MARGIN + 8, 55 + titleLines.length * 9 + 4);

  const coverNote = [
    `This report turns the live analysis view into a print-first document.`,
    `It foregrounds ranked concerns, concise interpretation, and a preserved evidence trail.`,
    `The layout is intentionally editorial: a cover, an executive brief, and an archive.`,
  ].join(' ');
  const coverNoteLines = doc.splitTextToSize(coverNote, 86);
  doc.setFillColor(...PALETTE.paper);
  doc.setDrawColor(...PALETTE.line);
  doc.roundedRect(PAGE_W - MARGIN - 88, 34, 80, 62, 3, 3, 'FD');
  doc.setFillColor(...PALETTE.softRose);
  doc.rect(PAGE_W - MARGIN - 88, 34, 80, 4, 'F');
  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Report intent', PAGE_W - MARGIN - 82, 45);
  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');
  doc.text(coverNoteLines, PAGE_W - MARGIN - 82, 52);

  const coverMetricsY = 128;
  const coverCardW = (CONTENT_W - 9) / 4;
  drawMetricCard(doc, MARGIN, coverMetricsY, coverCardW, 23, 'Submissions', String(submissions.length), [59, 130, 246]);
  drawMetricCard(doc, MARGIN + coverCardW + 3, coverMetricsY, coverCardW, 23, 'Pairs', String(totalComparisons), PALETTE.primary);
  drawMetricCard(doc, MARGIN + (coverCardW + 3) * 2, coverMetricsY, coverCardW, 23, 'High risk', String(highRisk.length), RISK.high);
  drawMetricCard(doc, MARGIN + (coverCardW + 3) * 3, coverMetricsY, coverCardW, 23, 'Average', formatPercent(averageScore), RISK.medium);

  doc.setFillColor(...PALETTE.white);
  doc.setDrawColor(...PALETTE.line);
  doc.roundedRect(MARGIN, 157, CONTENT_W, 32, 3, 3, 'FD');
  doc.setFillColor(...PALETTE.primary);
  doc.rect(MARGIN, 157, 3, 32, 'F');
  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive abstract', MARGIN + 6, 166);
  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8.6);
  doc.setFont('helvetica', 'normal');
  const coverAbstract = `The analysis covers ${totalComparisons} comparison pairs and ${submissions.length} submissions. ${highRisk.length} pair(s) exceed the 80% threshold, ${reviewBand} sit in the review band, and the average similarity score is ${formatPercent(averageScore)}. The document that follows explains what matters first, then preserves the supporting archive in a clean appendix.`;
  const coverAbstractLines = doc.splitTextToSize(coverAbstract, CONTENT_W - 14);
  doc.text(coverAbstractLines, MARGIN + 6, 174);

  // Executive brief
  doc.addPage();
  drawHeaderBand(doc, courseLabel, 'Executive Brief');
  const executiveSubtitle = `A curated reading of the dashboard. This section prioritizes patterns, severity, and next steps over raw data density.`;
  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Brief', MARGIN, 22);
  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const executiveSubtitleLines = doc.splitTextToSize(executiveSubtitle, CONTENT_W);
  doc.text(executiveSubtitleLines, MARGIN, 29);

  const briefMetricY = 38 + executiveSubtitleLines.length * 4;
  const briefMetricW = (CONTENT_W - 9) / 4;
  drawMetricCard(doc, MARGIN, briefMetricY, briefMetricW, 22, 'Submissions', String(submissions.length), [59, 130, 246]);
  drawMetricCard(doc, MARGIN + briefMetricW + 3, briefMetricY, briefMetricW, 22, 'Unique students', String(uniqueStudents || submissions.length), [15, 23, 42]);
  drawMetricCard(doc, MARGIN + (briefMetricW + 3) * 2, briefMetricY, briefMetricW, 22, 'High risk', String(highRisk.length), RISK.high);
  drawMetricCard(doc, MARGIN + (briefMetricW + 3) * 3, briefMetricY, briefMetricW, 22, 'Average', formatPercent(averageScore), RISK.medium);

  const narrativeBody = `The report shows ${totalComparisons} pairwise comparison(s) across ${uniqueStudents || submissions.length} unique student identifier(s). ${highRisk.length} pair(s) are above the 80% similarity threshold and warrant immediate review. ${reviewBand} additional pair(s) fall into the 61-80% review band, while ${minimalRisk.length} pair(s) remain at or below the minimal threshold. ${crossRepoCount} cross-repository comparison(s) were included in the analysis, which helps identify similarities that might not appear inside a single repository.`;
  const narrativeY = briefMetricY + 30;
  drawNotePanel(doc, MARGIN, narrativeY, 117, 38, 'What the numbers say', narrativeBody, PALETTE.primary);

  const actionBody = [
    `- Inspect the ranked pair cards below, starting with the highest score.`,
    `- Compare source and target repositories side by side before making a decision.`,
    `- Archive supporting evidence for any pair above the review threshold.`,
  ];
  drawNotePanel(doc, MARGIN + 121, narrativeY, 75, 38, 'Immediate actions', actionBody, RISK.medium);

  const distY = narrativeY + 44;
  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Similarity distribution', MARGIN, distY);
  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('A compact score spectrum for the comparison set.', MARGIN, distY + 6);
  drawDistributionBar(doc, MARGIN, distY + 10, CONTENT_W, distribution);

  const topY = distY + 34;
  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Priority findings', MARGIN, topY);
  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('The most important comparisons are shown as ranked cards instead of a plain spreadsheet dump.', MARGIN, topY + 6);

  const findingCount = Math.min(topFindings.length, 4);
  const cardHeight = findingCount >= 4 ? 21 : 22;
  const cardGap = 3;
  const cardWidth = CONTENT_W;
  let cardY = topY + 10;
  topFindings.forEach((finding, index) => {
    drawTopFindingCard(doc, MARGIN, cardY + index * (cardHeight + cardGap), cardWidth, cardHeight, index + 1, finding);
  });

  // Submission archive
  doc.addPage();
  drawHeaderBand(doc, courseLabel, 'Submission Archive');
  doc.setTextColor(...PALETTE.ink);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Submission Archive', MARGIN, 22);
  doc.setTextColor(...PALETTE.text);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const archiveSubtitle = 'A compact evidence ledger for the submitted files, attempts, and flag state. This is the printable counterpart to the dashboard list view.';
  const archiveSubtitleLines = doc.splitTextToSize(archiveSubtitle, CONTENT_W);
  doc.text(archiveSubtitleLines, MARGIN, 29);

  const archiveCardY = 38 + archiveSubtitleLines.length * 4;
  const archiveCardW = (CONTENT_W - 9) / 4;
  drawMetricCard(doc, MARGIN, archiveCardY, archiveCardW, 22, 'Entries', String(submissions.length), [59, 130, 246]);
  drawMetricCard(doc, MARGIN + archiveCardW + 3, archiveCardY, archiveCardW, 22, 'Flagged', String(flaggedSubmissions), RISK.high);
  drawMetricCard(doc, MARGIN + (archiveCardW + 3) * 2, archiveCardY, archiveCardW, 22, 'Lines', String(totalLines), [15, 23, 42]);
  drawMetricCard(doc, MARGIN + (archiveCardW + 3) * 3, archiveCardY, archiveCardW, 22, 'Size', formatBytes(totalBytes), RISK.low);

  const archiveStartY = archiveCardY + 28;
  autoTable(doc, {
    startY: archiveStartY,
    margin: { top: 30, left: MARGIN, right: MARGIN, bottom: 18 },
    head: [['#', 'Masked ID', 'Submitted', 'Attempt', 'Files', 'Lines', 'Size', 'Status']],
    body: submissions.map((submission, index) => [
      String(index + 1),
      submission.masked_student_id,
      formatDateTime(submission.timestamp),
      String(submission.attempt_number),
      String(submission.file_count),
      String(submission.total_lines),
      formatBytes(submission.total_bytes),
      submission.status,
    ]),
    styles: {
      fontSize: 7.4,
      cellPadding: 2.6,
      textColor: PALETTE.text,
      lineColor: PALETTE.line,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: PALETTE.primary,
      textColor: PALETTE.white,
      fontStyle: 'bold',
      fontSize: 7.4,
    },
    alternateRowStyles: {
      fillColor: PALETTE.paper,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 30, fontStyle: 'bold' },
      2: { cellWidth: 36 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 22, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const status = String(data.cell.raw);
        const isFlagged = /flag/i.test(status);
        data.cell.styles.textColor = isFlagged ? RISK.high : PALETTE.text;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: () => {
      drawHeaderBand(doc, courseLabel, 'Submission Archive');
      doc.setTextColor(...PALETTE.ink);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Submission Archive', MARGIN, 22);
      doc.setTextColor(...PALETTE.text);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('A printable evidence ledger for the submission set.', MARGIN, 29);
    },
  });

  // Similarity map page
  const matrixIds = buildUniqueMatrixIds(comparisons);
  if (matrixIds.length >= 2 && matrixIds.length <= 30) {
    doc.addPage();
    drawHeatmapPage(doc, courseLabel, assignmentLabel, comparisons, matrixIds);
  }

  const totalPages = doc.internal.pages.length - 1;
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }

  doc.save(fileName);
}