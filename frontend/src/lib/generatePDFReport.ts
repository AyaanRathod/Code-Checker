import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AssignmentComparisonItem,
  AssignmentDetailsModel,
  AssignmentMetrics,
  AssignmentSubmissionItem,
} from '../components/assignment-details/types';
import { formatBytes } from '../components/assignment-details/assignmentDetailsUtils';

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
  softBlue: [239, 246, 255] as Color,
  white: [255, 255, 255] as Color,
  success: [22, 163, 74] as Color,
  successBg: [240, 253, 244] as Color,
  warning: [234, 88, 12] as Color,
  warningBg: [255, 247, 237] as Color,
  danger: [220, 38, 38] as Color,
  dangerBg: [254, 242, 242] as Color,
  low: [161, 98, 7] as Color,
  lowBg: [254, 252, 232] as Color,
};

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

type ComparisonReportItem = AssignmentComparisonItem & {
  source_student_name?: string;
  target_student_name?: string;
};

function formatComparisonLabel(doc: jsPDF, comparison: ComparisonReportItem, maxWidth: number): string {
  const separator = ' to ';
  const sourceWidth = Math.max(6, Math.floor((maxWidth - separator.length * 2) / 2));
  const targetWidth = Math.max(6, Math.floor((maxWidth - separator.length * 2) / 2));
  const sourceLabel = comparison.source_student_name?.trim() || comparison.source_student;
  const targetLabel = comparison.target_student_name?.trim() || comparison.target_student;
  const source = truncate(doc, sourceLabel, sourceWidth);
  const target = truncate(doc, targetLabel, targetWidth);
  return `${source}${separator}${target}`;
}

function getRiskBand(score: number): { label: string; fill: Color; text: Color } {
  if (score > 80) return { label: 'HIGH', fill: COLORS.dangerBg, text: COLORS.danger };
  if (score > 60) return { label: 'MEDIUM', fill: COLORS.warningBg, text: COLORS.warning };
  if (score > 40) return { label: 'LOW', fill: COLORS.lowBg, text: COLORS.low };
  return { label: 'MINIMAL', fill: COLORS.successBg, text: COLORS.success };
}

function drawHeader(doc: jsPDF, assignment: AssignmentDetailsModel, pageLabel: string): void {
  doc.setFillColor(...COLORS.brand);
  doc.rect(0, 0, PAGE_W, 12, 'F');
  doc.setFillColor(...COLORS.brandDark);
  doc.rect(0, 0, PAGE_W, 3.5, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text(assignment.course || 'Course', MARGIN, 7.2);
  doc.setFont('helvetica', 'normal');
  doc.text(pageLabel, PAGE_W - MARGIN, 7.2, { align: 'right' });
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(6.4);
  doc.setFont('helvetica', 'italic');
  doc.text('Full details remain available in the dashboard.', MARGIN, PAGE_H - 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
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
  doc.rect(x, y, w, 2, 'F');

  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(value, x + w / 2, y + 10.8, { align: 'center' });
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.text(label.toUpperCase(), x + w / 2, y + 18, { align: 'center' });
}

function drawPill(doc: jsPDF, x: number, y: number, w: number, h: number, text: string, fill: Color, textColor: Color): void {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(text, x + w / 2, y + h / 2 + 1.5, { align: 'center' });
}

function drawDistributionBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  counts: number[],
): void {
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  const colors = [COLORS.success, [132, 204, 22] as Color, [234, 179, 8] as Color, [249, 115, 22] as Color, COLORS.danger];
  const labels = ['0-19', '20-39', '40-59', '60-79', '80-100'];

  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 9, 2, 2, 'FD');

  let currentX = x;
  counts.forEach((count, index) => {
    const segmentWidth = (count / total) * w;
    if (segmentWidth > 0) {
      doc.setFillColor(...colors[index]);
      doc.rect(currentX, y, segmentWidth, 9, 'F');
      currentX += segmentWidth;
    }
  });

  let legendX = x;
  counts.forEach((count, index) => {
    const segmentWidth = w / counts.length;
    doc.setFillColor(...colors[index]);
    doc.roundedRect(legendX, y + 12, 3.2, 3.2, 0.5, 0.5, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${labels[index]}: ${count}`, legendX + 4.8, y + 14.5);
    legendX += segmentWidth;
  });
}

function drawFindingRow(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rank: number,
  comparison: ComparisonReportItem,
): number {
  const band = getRiskBand(comparison.score);
  const rowH = 8.5;
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, rowH, 2.5, 2.5, 'FD');
  doc.setFillColor(...band.fill);
  doc.rect(x, y, 3, rowH, 'F');

  const pair = formatComparisonLabel(doc, comparison, 40);
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.text(`${rank}. ${pair}`, x + 5, y + 5.5);

  doc.setTextColor(...band.text);
  doc.setFontSize(10);
  doc.text(`${comparison.score.toFixed(1)}%`, x + w - 42, y + 5.5, { align: 'right' });

  const typeText = comparison.comparison_type === 'cross_repo' ? 'CROSS-REPO' : 'INTERNAL';
  drawPill(doc, x + w - 36, y + 1.5, 16, 5.5, typeText, COLORS.softBlue, COLORS.brand);
  drawPill(doc, x + w - 18, y + 1.5, 16, 5.5, band.label, band.fill, band.text);
  return y + rowH + 2.5;
}

export function generatePDFReport(
  assignment: AssignmentDetailsModel,
  submissions: AssignmentSubmissionItem[],
  comparisons: ComparisonReportItem[],
  metrics: AssignmentMetrics,
  instructorName: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();
  const totalComparisons = metrics.total || comparisons.length;
  const averageScore = metrics.avg || 0;
  const highRiskCount = metrics.highRisk || comparisons.filter((comparison) => comparison.score > 80).length;
  const reviewCount = metrics.reviews || comparisons.filter((comparison) => comparison.score > 60 && comparison.score <= 80).length;
  const maxScore = comparisons.reduce((max, comparison) => Math.max(max, comparison.score), 0);
  const topComparisons = [...comparisons].sort((a, b) => b.score - a.score).slice(0, 4);
  const topSubmissions = [...submissions]
    .sort((a, b) => (b.attempt_number - a.attempt_number) || ((new Date(b.timestamp || 0).getTime()) - (new Date(a.timestamp || 0).getTime())))
    .slice(0, 4);
  const generatedAt = formatDateTime(now.toISOString());
  const fileName = `integrity-report-${(assignment.course || 'course').replace(/\s+/g, '-').toLowerCase()}-${(assignment.title || 'assignment').replace(/\s+/g, '-').toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`;
  const summary = `This report condenses ${totalComparisons} comparison pair(s) across ${submissions.length} submission(s) into a two-page brief. It highlights the highest-risk pairs, the average similarity, and the latest submission snapshot.`;

  doc.setProperties({
    title: `Academic Integrity Report - ${assignment.title}`,
    subject: 'Compact academic integrity report',
    author: instructorName || 'Brock University',
    creator: 'Code Checker',
  });

  // Page 1: overview
  drawHeader(doc, assignment, 'Report Summary');

  let y = 20;
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(truncate(doc, assignment.title, CONTENT_W - 42), MARGIN, y + 4);

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Generated ${generatedAt}`, PAGE_W - MARGIN, y + 2, { align: 'right' });
  drawPill(doc, PAGE_W - MARGIN - 26, y + 6, 26, 6, (assignment.status || 'STATUS').toUpperCase(), getRiskBand(assignment.status === 'Archived' ? 0 : 1).fill, COLORS.text);

  y += 14;
  const cardW = (CONTENT_W - 9) / 4;
  drawMetricCard(doc, MARGIN, y, cardW, 22, 'Submissions', String(submissions.length), COLORS.brand);
  drawMetricCard(doc, MARGIN + cardW + 3, y, cardW, 22, 'High risk', String(highRiskCount), COLORS.danger);
  drawMetricCard(doc, MARGIN + (cardW + 3) * 2, y, cardW, 22, 'Average', `${averageScore.toFixed(1)}%`, COLORS.warning);
  drawMetricCard(doc, MARGIN + (cardW + 3) * 3, y, cardW, 22, 'Max', `${maxScore.toFixed(1)}%`, COLORS.success);

  y += 30;
  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3, 3, 'FD');
  doc.setFillColor(...COLORS.brand);
  doc.rect(MARGIN, y, 3, 20, 'F');
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Key summary', MARGIN + 6, y + 6.5);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.text(doc.splitTextToSize(summary, CONTENT_W - 12), MARGIN + 6, y + 12);

  y += 28;
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text('Risk spread', MARGIN, y);
  y += 5;
  drawDistributionBar(doc, MARGIN, y, CONTENT_W, metrics.distribution || [0, 0, 0, 0, 0]);

  y += 30;
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text('Top findings', MARGIN, y);
  y += 5;
  if (topComparisons.length > 0) {
    topComparisons.forEach((comparison, index) => {
      y = drawFindingRow(doc, MARGIN, y, CONTENT_W, index + 1, comparison);
    });
  } else {
    doc.setFillColor(...COLORS.paper);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'FD');
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No comparison data available.', PAGE_W / 2, y + 6.4, { align: 'center' });
    y += 12;
  }

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.text(`Showing only the most important comparisons to keep this report concise.`, MARGIN, 236);

  // Page 2: compact evidence snapshot
  doc.addPage();
  drawHeader(doc, assignment, 'Evidence Snapshot');

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.2);
  doc.text('Evidence snapshot', MARGIN, 22);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text('Only the most relevant rows are shown here. The dashboard contains the full record set.', MARGIN, 28);

  const comparisonRows = topComparisons.map((comparison, index) => {
    const risk = getRiskBand(comparison.score);
    return [
      String(index + 1),
      formatComparisonLabel(doc, comparison, 62),
      `${comparison.score.toFixed(1)}%`,
      risk.label,
      comparison.comparison_type === 'cross_repo' ? 'Cross-Repo' : 'Internal',
    ];
  });

  autoTable(doc, {
    startY: 34,
    margin: { left: MARGIN, right: MARGIN },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    head: [['#', 'Top comparison pairs', 'Score', 'Risk', 'Type']],
    body: comparisonRows,
    styles: {
      fontSize: 7.2,
      cellPadding: 2.1,
      textColor: COLORS.text,
      lineColor: COLORS.line,
      lineWidth: 0.15,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: COLORS.brand,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    alternateRowStyles: {
      fillColor: COLORS.paper,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 74, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 32, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const risk = String(data.cell.raw);
        if (risk === 'HIGH') data.cell.styles.textColor = COLORS.danger;
        else if (risk === 'MEDIUM') data.cell.styles.textColor = COLORS.warning;
        else if (risk === 'LOW') data.cell.styles.textColor = COLORS.low;
        else data.cell.styles.textColor = COLORS.success;
      }
    },
  });

  const afterComparisonTable = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 60) + 8;
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.text(`Showing the top ${topComparisons.length} of ${totalComparisons} pair(s).`, PAGE_W - MARGIN, afterComparisonTable - 2, { align: 'right' });

  const submissionRows = topSubmissions.map((submission, index) => [
    String(index + 1),
    submission.masked_student_id,
    String(submission.attempt_number),
    String(submission.file_count),
    String(submission.total_lines),
    formatBytes(submission.total_bytes),
    submission.status,
  ]);

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text('Submission snapshot', MARGIN, afterComparisonTable + 4);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Newest or highest-attempt submissions only.', MARGIN, afterComparisonTable + 9);

  autoTable(doc, {
    startY: afterComparisonTable + 12,
    margin: { left: MARGIN, right: MARGIN },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    head: [['#', 'Masked ID', 'Attempt', 'Files', 'Lines', 'Size', 'Status']],
    body: submissionRows,
    styles: {
      fontSize: 7.1,
      cellPadding: 2.1,
      textColor: COLORS.text,
      lineColor: COLORS.line,
      lineWidth: 0.15,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: COLORS.brand,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 7.1,
    },
    alternateRowStyles: {
      fillColor: COLORS.paper,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 52, fontStyle: 'bold' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 28, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const status = String(data.cell.raw).toLowerCase();
        if (status.includes('flag')) data.cell.styles.textColor = COLORS.danger;
        else if (status.includes('active')) data.cell.styles.textColor = COLORS.success;
      }
    },
  });

  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.text(`Showing the top ${topSubmissions.length} of ${submissions.length} submission record(s).`, MARGIN, 244);
  doc.text(`This PDF is intentionally capped at two pages for quick review.`, MARGIN, 248);

  const totalPages = doc.internal.pages.length - 1;
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }

  doc.save(fileName);
}
