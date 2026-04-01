import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatKb, formatTorontoTimestamp } from './studentPortalUtils';
import type { SubmissionSuccessData } from './types';

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
  warning: [217, 119, 6] as Color,
  warningBg: [255, 251, 235] as Color,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'receipt';
}

function drawHeader(doc: jsPDF, receiptId: string): void {
  doc.setFillColor(...COLORS.brand);
  doc.rect(0, 0, PAGE_W, 14, 'F');
  doc.setFillColor(...COLORS.brandDark);
  doc.rect(0, 0, PAGE_W, 3.5, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('SUBMISSION RECEIPT', MARGIN, 9.1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(`Receipt ${receiptId.slice(0, 8)}`, PAGE_W - MARGIN, 9.1, { align: 'right' });
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number, receiptId: string): void {
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(6.4);
  doc.setFont('helvetica', 'italic');
  doc.text('Keep this receipt for your records.', MARGIN, PAGE_H - 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt ${receiptId.slice(0, 8)} · Page ${pageNumber} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);

  doc.setFillColor(...COLORS.brand);
  doc.roundedRect(MARGIN, y + 2.5, 14, 1.6, 0.8, 0.8, 'F');
  return y + 10;
}

function drawStatusStrip(doc: jsPDF, y: number, healthy: boolean, message: string): number {
  const fill = healthy ? COLORS.successBg : COLORS.warningBg;
  const text = healthy ? COLORS.success : COLORS.warning;

  doc.setFillColor(...fill);
  doc.setDrawColor(...text);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 3, 3, 'FD');

  doc.setTextColor(...text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(message, MARGIN + 6, y + 9.2);
  return y + 20;
}

function drawSimpleInfoTable(doc: jsPDF, startY: number, receiptId: string, rows: [string, string][]): number {
  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Field', 'Value']],
    body: rows,
    theme: 'plain',
    styles: {
      fontSize: 8.4,
      cellPadding: 2.8,
      textColor: COLORS.text,
      lineColor: COLORS.line,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: COLORS.brand,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.paper,
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 150 },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(doc, receiptId);
      }
    },
  });

  return ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || startY) + 6;
}

export function buildSubmissionReceiptPdf(successData: SubmissionSuccessData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const receiptId = successData.submission_id || 'unknown';
  const totalFiles = successData.total_files || successData.files?.length || 0;
  const totalLines = successData.total_lines || 0;
  const attempt = successData.attempt || 0;
  const assignmentTitle = successData.assignment_title || 'Submission Receipt';
  const language = successData.language || 'N/A';
  const timestamp = formatTorontoTimestamp(successData.timestamp);
  const healthIsOk = (successData.health || '').toLowerCase() === 'ok';
  const healthLabel = healthIsOk ? 'Processed successfully' : successData.health_message || 'Review required';
  const generatedAt = new Date();
  const fileName = `submission-receipt-${slugify(receiptId)}-${generatedAt.toISOString().slice(0, 10)}.pdf`;

  doc.setProperties({
    title: `Submission Receipt - ${assignmentTitle}`,
    subject: 'Academic Integrity Portal submission receipt',
    author: 'CodeSimilar Academic Integrity Portal',
    creator: 'Code Checker',
  });

  drawHeader(doc, receiptId);

  let y = 22;
  y = drawStatusStrip(doc, y, healthIsOk, healthLabel);

  y = drawSectionTitle(doc, 'Receipt details', y);
  y = drawSimpleInfoTable(doc, y, receiptId, [
    ['Assignment', assignmentTitle],
    ['Receipt ID', receiptId],
    ['Timestamp', timestamp],
    ['Attempt', `${attempt} / 3`],
    ['Language', language],
  ]);

  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Detected files', MARGIN, y);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(`${totalFiles} file${totalFiles === 1 ? '' : 's'} · ${totalLines} lines`, PAGE_W - MARGIN, y, { align: 'right' });

  const files = successData.files || [];
  let lastY = y + 5;

  if (files.length > 0) {
    autoTable(doc, {
      startY: y + 5,
      margin: { left: MARGIN, right: MARGIN },
      head: [['File', 'Lines', 'Size']],
      body: files.map((file) => [file.name, String(file.lines), formatKb(file.size_bytes)]),
      styles: {
        fontSize: 8,
        cellPadding: 2.6,
        textColor: COLORS.text,
        lineColor: COLORS.line,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: COLORS.brand,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.paper,
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 24, halign: 'right' },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawHeader(doc, receiptId);
        }
      },
    });
    lastY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || lastY) + 8;
  } else {
    doc.setFillColor(...COLORS.paper);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y + 8, CONTENT_W, 16, 3, 3, 'FD');
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text('No files were detected in the submission package.', PAGE_W / 2, y + 18, { align: 'center' });
    lastY = y + 28;
  }

  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, lastY, CONTENT_W, 14, 3, 3, 'FD');
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'normal');
  doc.text('This PDF is your official submission record.', MARGIN + 6, lastY + 9.2);

  const totalPages = doc.internal.pages.length - 1;
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages, receiptId);
  }

  doc.save(fileName);
  return doc;
}
