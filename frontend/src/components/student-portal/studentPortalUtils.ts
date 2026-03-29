import JSZip from 'jszip';
import type { PreviewFile, SubmissionSuccessData } from './types';

export const SUPPORTED_EXTS = ['.java', '.c', '.cpp', '.h'];
export const ACCEPTED_UPLOAD = ['.zip', '.c', '.cpp', '.java'];

export const formatTorontoTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'N/A';
  return `${new Date(timestamp).toLocaleDateString([], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'America/Toronto',
  })} ${new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Toronto',
  })} (GMT-4)`;
};

export const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export const extractPreviewFilesFromUpload = async (selected: File): Promise<PreviewFile[]> => {
  if (!selected.name.endsWith('.zip')) {
    return [{ name: selected.name, size: selected.size }];
  }

  try {
    const zip = await JSZip.loadAsync(selected);
    const entries: PreviewFile[] = [];
    const promises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;

      const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
      if (!SUPPORTED_EXTS.includes(ext)) return;

      promises.push(
        zipEntry.async('uint8array').then((data) => {
          entries.push({ name: relativePath, size: data.byteLength });
        })
      );
    });

    await Promise.all(promises);
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  } catch {
    return [];
  }
};

export const buildReceiptText = (successData: SubmissionSuccessData) => {
  const timestamp = formatTorontoTimestamp(successData.timestamp);
  const fileList = (successData.files || [])
    .map((file) => `  - ${file.name} (${file.lines} lines, ${formatKb(file.size_bytes)})`)
    .join('\n');

  return [
    '=======================================',
    '  SUBMISSION RECEIPT',
    '  Academic Integrity Portal - Brock University',
    '=======================================',
    '',
    `Assignment:  ${successData.assignment_title || 'N/A'}`,
    `Language:    ${successData.language || 'N/A'}`,
    `Receipt ID:  ${successData.submission_id || 'N/A'}`,
    `Timestamp:   ${timestamp}`,
    `Attempt:     ${successData.attempt || 0} / 3`,
    '',
    `Files (${successData.total_files || 0}):`,
    fileList || '  (none)',
    `Total Lines: ${successData.total_lines || 0}`,
    '',
    `Status: ${successData.health === 'ok' ? 'PASS - All files processed successfully' : `WARNING - ${successData.health_message || 'Review your submission'}`}`,
    '',
    '=======================================',
    '  Keep this receipt for your records.',
    '=======================================',
  ].join('\n');
};
