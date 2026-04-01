import JSZip from 'jszip';
import type { PreviewFile, SubmissionSuccessData } from './types';

export const SUPPORTED_EXTS = ['.java', '.c', '.cpp', '.h'];
export const ACCEPTED_UPLOAD = ['.zip', '.c', '.cpp', '.java', '.h'];

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
