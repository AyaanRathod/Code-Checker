import jsPDF from 'jspdf';
import type {
  AssignmentComparisonItem,
  AssignmentDetailsModel,
  AssignmentMetrics,
  AssignmentSubmissionItem,
} from '../components/assignment-details/types';
import { buildUniqueMatrixIds, findComparisonPair, formatBytes } from '../components/assignment-details/assignmentDetailsUtils';

type Color = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLORS = {
  brand: [153, 27, 27] as Color,
  brandDark: [110, 18, 18] as Color,
  ink: [15, 23, 42] as Color,
  text: [51, 65, 85] as Color,
  muted: [100, 116, 139] as Color,
  line: [226, 232, 240] as Color,
  paper: [248, 250, 252] as Color,
  white: [255, 255, 255] as Color,
  success: [22, 163, 74] as Color,
  successBg: [240, 253, 244] as Color,
  warning: [234, 88, 12] as Color,
  warningBg: [255, 247, 237] as Color,
  danger: [220, 38, 38] as Color,
  dangerBg: [254, 242, 242] as Color,
  low: [161, 98, 7] as Color,
  lowBg: [254, 252, 232] as Color,
  noComparison: [226, 232, 240] as Color,
  noComparisonBg: [248, 250, 252] as Color,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report';
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

function truncate(doc: jsPDF, text: string, maxWidth: number): string {
  const value = text.replace(/\s+/g, ' ').trim();
  if (!value) return '-';
  if (doc.getTextWidth(value) <= maxWidth) return value;

  const ellipsis = '...';
  let end = value.length;
  while (end > 0 && doc.getTextWidth(`${value.slice(0, end).trimEnd()}${ellipsis}`) > maxWidth) {
    end -= 1;
  }
  return `${value.slice(0, end).trimEnd()}${ellipsis}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getStatusStyle(status: string): { label: string; fill: Color; text: Color } {
  const value = status.toLowerCase();
  if (value.includes('archiv')) return { label: 'ARCHIVED', fill: COLORS.paper, text: COLORS.brand };
  if (value.includes('analys')) return { label: 'ANALYZING', fill: COLORS.paper, text: COLORS.brand };
  if (value.includes('close')) return { label: 'CLOSED', fill: COLORS.successBg, text: COLORS.success };
  if (value.includes('open')) return { label: 'OPEN', fill: COLORS.paper, text: COLORS.text };
  return { label: status.toUpperCase() || 'STATUS', fill: COLORS.paper, text: COLORS.text };
}

function getRiskBand(score: number): { label: string; fill: Color; text: Color; soft: Color } {
  if (score > 80) return { label: 'HIGH', fill: COLORS.danger, text: COLORS.white, soft: COLORS.dangerBg };
  if (score > 60) return { label: 'MEDIUM', fill: COLORS.warning, text: COLORS.white, soft: COLORS.warningBg };
  if (score > 40) return { label: 'LOW', fill: COLORS.low, text: COLORS.white, soft: COLORS.lowBg };
  return { label: 'MINIMAL', fill: COLORS.success, text: COLORS.white, soft: COLORS.successBg };
}

function getMatrixCellStyle(score: number | undefined): { fill: Color; text: Color; label?: string } {
  if (score === undefined || score <= 0) return { fill: COLORS.noComparisonBg, text: COLORS.muted };
  if (score > 80) return { fill: COLORS.danger, text: COLORS.white };
  if (score > 60) return { fill: COLORS.warning, text: COLORS.white };
  if (score > 40) return { fill: COLORS.low, text: COLORS.white };
  return { fill: COLORS.success, text: COLORS.white };
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text(title, MARGIN, y);
  doc.setFillColor(...COLORS.brand);
  doc.roundedRect(MARGIN, y + 2.2, 14, 1.5, 0.7, 0.7, 'F');
  return y + 9;
}

function drawPill(doc: jsPDF, x: number, y: number, w: number, h: number, text: string, fill: Color, textColor: Color): void {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text(text, x + w / 2, y + h / 2 + 1.4, { align: 'center' });
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
): void {
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  doc.setFillColor(...accent);
  doc.rect(x, y, w, 2.2, 'F');

  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.3);
  doc.text(value, x + w / 2, y + 10.2, { align: 'center' });
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.text(label.toUpperCase(), x + w / 2, y + 18, { align: 'center' });
}

function drawSummaryPanel(doc: jsPDF, x: number, y: number, w: number, title: string, body: string): number {
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 26, 3, 3, 'FD');
  doc.setFillColor(...COLORS.brand);
  doc.rect(x, y, 3, 26, 'F');

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.4);
  doc.text(title, x + 6, y + 7.1);

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(doc.splitTextToSize(body, w - 12), x + 6, y + 13);
  return y + 30;
}

function drawRiskSpreadPanel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  metrics: AssignmentMetrics,
  totalComparisons: number,
): number {
  const panelHeight = 74;
  const counts = metrics.distribution || [0, 0, 0, 0, 0];
  const labels = ['0-19', '20-39', '40-59', '60-79', '80-100'];
  const colors = [COLORS.success, [132, 204, 22] as Color, [234, 179, 8] as Color, [249, 115, 22] as Color, COLORS.danger];

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, panelHeight, 3, 3, 'FD');
  doc.setFillColor(...COLORS.brand);
  doc.rect(x, y, w, 1.8, 'F');

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text('Risk spread', x + 5, y + 7.2);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.text('Score distribution across the comparison set.', x + 5, y + 12.5);

  const highRisk = counts[4] || 0;
  const reviewBand = counts[3] || 0;
  const highRiskPct = totalComparisons > 0 ? Math.round((highRisk / totalComparisons) * 100) : 0;
  drawPill(doc, x + w - 48, y + 4.8, 43, 7, `High risk ${highRiskPct}%`, COLORS.paper, COLORS.brand);

  const barX = x + 5;
  const barY = y + 17;
  const barW = w - 10;
  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(barX, barY, barW, 10.5, 2.4, 2.4, 'FD');

  let currentX = barX;
  counts.forEach((count, index) => {
    const segmentWidth = (count / Math.max(totalComparisons, 1)) * barW;
    if (segmentWidth <= 0) return;
    doc.setFillColor(...colors[index]);
    doc.rect(currentX, barY, segmentWidth, 10.5, 'F');
    currentX += segmentWidth;
  });

  const tileTop = y + 32;
  const tileW = (w - 12) / 5 - 2;
  const tileGap = 2;

  counts.forEach((count, index) => {
    const tileX = x + 5 + index * (tileW + tileGap);
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(tileX, tileTop, tileW, 20.5, 2.3, 2.3, 'FD');
    doc.setFillColor(...colors[index]);
    doc.rect(tileX, tileTop, tileW, 2, 'F');

    const percentage = totalComparisons > 0 ? Math.round((count / totalComparisons) * 100) : 0;
    doc.setTextColor(...colors[index]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.2);
    doc.text(String(count), tileX + tileW / 2, tileTop + 9.9, { align: 'center' });
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text(labels[index], tileX + tileW / 2, tileTop + 15.4, { align: 'center' });
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(6.0);
    doc.text(`${percentage}%`, tileX + tileW / 2, tileTop + 18.8, { align: 'center' });
  });

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.2);
  doc.text(`Review band: ${reviewBand} comparison${reviewBand === 1 ? '' : 's'}.`, x + 5, y + panelHeight - 4.4);

  return y + panelHeight;
}

function drawMatrixLegend(doc: jsPDF, y: number): void {
  const items = [
    { label: 'High risk', color: COLORS.danger },
    { label: 'Medium', color: COLORS.warning },
    { label: 'Low', color: COLORS.low },
    { label: 'Minimal', color: COLORS.success },
    { label: 'No comparison', color: COLORS.noComparison },
  ];
  const segmentW = CONTENT_W / items.length;

  items.forEach((item, index) => {
    const x = MARGIN + index * segmentW;
    doc.setFillColor(...item.color);
    doc.roundedRect(x + 2, y, 5, 5, 1, 1, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.text(item.label, x + 9, y + 4.1);
  });
}

function drawSimilarityMapPage(doc: jsPDF, assignment: AssignmentDetailsModel, comparisons: AssignmentComparisonItem[]): void {
  const labels = buildUniqueMatrixIds(comparisons);

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.6);
  doc.text('Similarity Map', MARGIN, 18);

  const subtitle = `Printed relationship map for ${assignment.course || 'Course'} ${assignment.title || 'Assignment'}. Red cells indicate the strongest similarity, while pale cells indicate no recorded comparison.`;
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(doc.splitTextToSize(subtitle, CONTENT_W), MARGIN, 25);

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.0);
  doc.text('Diagonal cells are self references and are intentionally neutral.', MARGIN, 33);

  if (labels.length === 0) {
    doc.setFillColor(...COLORS.paper);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(MARGIN, 48, CONTENT_W, 24, 3, 3, 'FD');
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.0);
    doc.text('No similarity matrix data available yet.', PAGE_W / 2, 62, { align: 'center' });
    return;
  }

  const labelWidth = 18;
  const matrixLeft = MARGIN + labelWidth;
  const matrixTop = 46;
  const availableWidth = CONTENT_W - labelWidth;
  const availableHeight = PAGE_H - matrixTop - 44;
  const cellSize = Math.max(5.8, Math.min(12, availableWidth / labels.length, availableHeight / labels.length));
  const gridTop = matrixTop + 10;
  const rowLabelFont = cellSize > 9 ? 5.4 : 4.8;
  const columnLabelFont = cellSize > 9 ? 5.2 : 4.6;
  const scoreFont = cellSize > 9 ? 4.9 : 4.2;

  labels.forEach((label, index) => {
    const x = matrixLeft + index * cellSize + cellSize / 2;
    doc.setTextColor(...COLORS.muted);
    doc.setFont('courier', 'normal');
    doc.setFontSize(columnLabelFont);
    doc.text(truncate(doc, label, 22), x, matrixTop + 7.8, { angle: 90, align: 'center' });
  });

  labels.forEach((label, index) => {
    const y = gridTop + index * cellSize + cellSize / 2 + 1.1;
    doc.setTextColor(...COLORS.text);
    doc.setFont('courier', 'normal');
    doc.setFontSize(rowLabelFont);
    doc.text(truncate(doc, label, labelWidth - 3), matrixLeft - 2, y, { align: 'right' });
  });

  labels.forEach((rowLabel, rowIndex) => {
    labels.forEach((colLabel, colIndex) => {
      const cellX = matrixLeft + colIndex * cellSize;
      const cellY = gridTop + rowIndex * cellSize;
      const isSelf = rowLabel === colLabel;
      const comparison = isSelf ? null : findComparisonPair(comparisons, rowLabel, colLabel);
      const score = comparison?.score;
      const style = isSelf
        ? { fill: COLORS.noComparison, text: COLORS.muted }
        : getMatrixCellStyle(score);

      doc.setFillColor(...style.fill);
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.14);
      doc.roundedRect(cellX, cellY, cellSize - 0.2, cellSize - 0.2, 0.6, 0.6, 'FD');

      if (score !== undefined && score > 0) {
        doc.setTextColor(...style.text);
        doc.setFont('courier', 'bold');
        doc.setFontSize(scoreFont);
        doc.text(String(Math.round(score)), cellX + (cellSize - 0.2) / 2, cellY + (cellSize - 0.2) / 2 + 1.0, { align: 'center' });
      }
    });
  });

  drawMatrixLegend(doc, PAGE_H - 24);
}

export function generatePDFReport(
  assignment: AssignmentDetailsModel,
  submissions: AssignmentSubmissionItem[],
  comparisons: AssignmentComparisonItem[],
  metrics: AssignmentMetrics,
  instructorName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();
  const totalComparisons = metrics.total || comparisons.length;
  const highRiskCount = metrics.highRisk || comparisons.filter((comparison) => comparison.score > 80).length;
  const reviewCount = metrics.reviews || comparisons.filter((comparison) => comparison.score > 60 && comparison.score <= 80).length;
  const averageScore = metrics.avg || 0;
  const maxScore = comparisons.reduce((max, comparison) => Math.max(max, comparison.score), 0);
  const totalLines = submissions.reduce((sum, submission) => sum + submission.total_lines, 0);
  const totalBytes = submissions.reduce((sum, submission) => sum + submission.total_bytes, 0);
  const generatedAt = formatDateTime(now.toISOString());
  const fileName = `integrity-report-${slugify(assignment.course || 'course')}-${slugify(assignment.title || 'assignment')}-${now.toISOString().slice(0, 10)}.pdf`;
  const summary = `This report condenses ${totalComparisons} comparison pair${totalComparisons === 1 ? '' : 's'} across ${submissions.length} submission${submissions.length === 1 ? '' : 's'}. The matrix on page 2 is the primary pairwise view, while the risk spread shows the overall score distribution. Peak similarity reaches ${formatPercentage(maxScore)}. Data footprint: ${totalLines.toLocaleString('en-CA')} lines across ${formatBytes(totalBytes)}.`;

  doc.setProperties({
    title: `Academic Integrity Report - ${assignment.title}`,
    subject: 'Compact academic integrity report',
    author: instructorName || 'Brock University',
    creator: 'Code Checker',
  });

  let y = 18;
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Academic Integrity Report', MARGIN, y);

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.text(assignment.course || 'Course', MARGIN, y + 6);
  doc.text(`Generated ${generatedAt}`, PAGE_W - MARGIN, y + 1.8, { align: 'right' });

  const statusStyle = getStatusStyle(assignment.status || 'Status');
  drawPill(doc, PAGE_W - MARGIN - 30, y + 5.5, 30, 6.2, statusStyle.label, statusStyle.fill, statusStyle.text);

  y += 16;
  const cardW = (CONTENT_W - 9) / 4;
  drawMetricCard(doc, MARGIN, y, cardW, 22, 'Submissions', String(submissions.length), COLORS.brand);
  drawMetricCard(doc, MARGIN + cardW + 3, y, cardW, 22, 'High risk', String(highRiskCount), COLORS.danger);
  drawMetricCard(doc, MARGIN + (cardW + 3) * 2, y, cardW, 22, 'Review', String(reviewCount), COLORS.warning);
  drawMetricCard(doc, MARGIN + (cardW + 3) * 3, y, cardW, 22, 'Average', formatPercentage(averageScore), COLORS.success);

  y += 30;
  y = drawSummaryPanel(doc, MARGIN, y, CONTENT_W, 'Key summary', summary);

  y += 2;
  drawRiskSpreadPanel(doc, MARGIN, y, CONTENT_W, metrics, totalComparisons);

  doc.addPage();
  drawSimilarityMapPage(doc, assignment, comparisons);

  doc.save(fileName);
}
