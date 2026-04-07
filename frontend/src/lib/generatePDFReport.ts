import jsPDF from 'jspdf';
import type {
  AssignmentComparisonItem,
  AssignmentDetailsModel,
  AssignmentMetrics,
  AssignmentSubmissionItem,
} from '../components/assignment-details/types';
import { buildCollusionGraphData, formatBytes } from '../components/assignment-details/assignmentDetailsUtils';

type Color = [number, number, number];

const PAGE_W = 210;
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


function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function maskIdentity(value: string): string {
  const clean = (value || '').trim();
  if (!clean) return '****';
  if (clean.includes('****')) return clean;
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}

function getStatusStyle(status: string): { label: string; fill: Color; text: Color } {
  const value = status.toLowerCase();
  if (value.includes('archiv')) return { label: 'ARCHIVED', fill: COLORS.paper, text: COLORS.brand };
  if (value.includes('analys')) return { label: 'ANALYZING', fill: COLORS.paper, text: COLORS.brand };
  if (value.includes('close')) return { label: 'CLOSED', fill: COLORS.successBg, text: COLORS.success };
  if (value.includes('open')) return { label: 'OPEN', fill: COLORS.paper, text: COLORS.text };
  return { label: status.toUpperCase() || 'STATUS', fill: COLORS.paper, text: COLORS.text };
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

function drawCollusionClusterPage(doc: jsPDF, assignment: AssignmentDetailsModel, comparisons: AssignmentComparisonItem[]): void {
  const threshold = 70;
  const graphData = buildCollusionGraphData(comparisons, threshold, { width: 150, height: 95 });

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.6);
  doc.text('Collusion Cluster Graph', MARGIN, 18);

  const subtitle = `Clustered network view for ${assignment.course || 'Course'} ${assignment.title || 'Assignment'}. Links represent internal submission pairs at or above ${threshold}% similarity.`;
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(doc.splitTextToSize(subtitle, CONTENT_W), MARGIN, 25);

  const cardW = (CONTENT_W - 6) / 3;
  drawMetricCard(doc, MARGIN, 35, cardW, 18, 'Clusters found', String(graphData.clusters.length), COLORS.brand);
  drawMetricCard(doc, MARGIN + cardW + 3, 35, cardW, 18, 'Flagged pairs', String(graphData.edges.length), COLORS.danger);
  drawMetricCard(doc, MARGIN + (cardW + 3) * 2, 35, cardW, 18, 'Internal pairs', String(graphData.totalInternalPairs), COLORS.warning);

  if (!graphData.edges.length) {
    doc.setFillColor(...COLORS.paper);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(MARGIN, 62, CONTENT_W, 26, 3, 3, 'FD');
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.0);
    doc.text(`No collusion clusters at ${threshold}% threshold.`, PAGE_W / 2, 76, { align: 'center' });
    return;
  }

  const panelX = MARGIN;
  const panelY = 62;
  const panelW = CONTENT_W;
  const panelH = 116;

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(panelX, panelY, panelW, panelH, 3, 3, 'FD');

  doc.setFillColor(...COLORS.paper);
  doc.roundedRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 2.2, 2.2, 'F');

  const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));
  const palette: Color[] = [
    [220, 38, 38],
    [234, 88, 12],
    [217, 119, 6],
    [15, 118, 110],
    [37, 99, 235],
    [124, 58, 237],
    [190, 24, 93],
  ];

  const graphPad = 8;
  const graphX = panelX + graphPad;
  const graphY = panelY + graphPad;
  const graphW = panelW - graphPad * 2;
  const graphH = panelH - graphPad * 2;

  graphData.edges.forEach((edge) => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return;

    const x1 = graphX + (from.x / 150) * graphW;
    const y1 = graphY + (from.y / 95) * graphH;
    const x2 = graphX + (to.x / 150) * graphW;
    const y2 = graphY + (to.y / 95) * graphH;
    const intensity = Math.min(1, Math.max(0.2, edge.score / 100));

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(Math.max(0.25, intensity * 0.8));
    doc.line(x1, y1, x2, y2);
  });

  graphData.nodes.forEach((node) => {
    const color = palette[(node.clusterId - 1) % palette.length];
    const x = graphX + (node.x / 150) * graphW;
    const y = graphY + (node.y / 95) * graphH;

    doc.setFillColor(...color);
    doc.setDrawColor(...COLORS.white);
    doc.setLineWidth(0.2);
    doc.circle(x, y, 2.4, 'FD');
  });

  let tableY = panelY + panelH + 9;
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.text('Flagged Cluster Summary', MARGIN, tableY);
  tableY += 6;

  const shownClusters = graphData.clusters.slice(0, 6);
  shownClusters.forEach((cluster) => {
    doc.setDrawColor(...COLORS.line);
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(MARGIN, tableY - 3.6, CONTENT_W, 12.5, 2, 2, 'FD');

    const chipFill = cluster.risk === 'High Risk' ? COLORS.dangerBg : COLORS.warningBg;
    const chipText = cluster.risk === 'High Risk' ? COLORS.danger : COLORS.warning;
    drawPill(doc, PAGE_W - MARGIN - 25, tableY - 2.1, 25, 5.5, cluster.risk.toUpperCase(), chipFill, chipText);

    doc.setTextColor(...COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.text(`Cluster #${cluster.id}`, MARGIN + 3, tableY + 0.6);

    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.text(
      `${cluster.members.length} members | ${cluster.pairCount} linked pairs | max ${cluster.maxScore.toFixed(1)}% | avg ${cluster.avgScore.toFixed(1)}%`,
      MARGIN + 3,
      tableY + 4.8
    );
    const maskedMembers = cluster.memberLabels.map(maskIdentity).join(', ');
    doc.text(maskedMembers, MARGIN + 3, tableY + 8.4);

    tableY += 14;
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
  const summary = `This report condenses ${totalComparisons} comparison pair${totalComparisons === 1 ? '' : 's'} across ${submissions.length} submission${submissions.length === 1 ? '' : 's'}. Page 2 highlights collusion clusters. Peak similarity reaches ${formatPercentage(maxScore)}. Data footprint: ${totalLines.toLocaleString('en-CA')} lines across ${formatBytes(totalBytes)}.`;

  doc.setProperties({
    title: `Academic Integrity Report - ${assignment.title}`,
    subject: 'Compact academic integrity report',
    author: instructorName || 'CodeSimilar',
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
  drawCollusionClusterPage(doc, assignment, comparisons);

  doc.save(fileName);
}
