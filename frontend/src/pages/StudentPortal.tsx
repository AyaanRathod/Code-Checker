import React, { useState, useCallback } from 'react';
import { UploadCloud, CheckCircle, FileCode2, Key, User, Badge, ArrowRight, Download, AlertTriangle, File as FileIcon, X } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { useFileDrop } from '../hooks/useFileDrop';

const StudentPortal: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [previewFiles, setPreviewFiles] = useState<{ name: string; size: number }[]>([]);

  const SUPPORTED_EXTS = ['.java', '.c', '.cpp', '.h'];
  const ACCEPTED_UPLOAD = ['.zip', '.c', '.cpp', '.java'];

  const processSelectedFile = useCallback(async (selected: File) => {
    setFile(selected);
    setPreviewFiles([]);

    if (selected.name.endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(selected);
        const entries: { name: string; size: number }[] = [];
        const promises: Promise<void>[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
            if (SUPPORTED_EXTS.includes(ext)) {
              promises.push(
                zipEntry.async('uint8array').then(data => {
                  entries.push({ name: relativePath, size: data.byteLength });
                })
              );
            }
          }
        });
        await Promise.all(promises);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        setPreviewFiles(entries);
      } catch {
        setPreviewFiles([]);
      }
    } else {
      setPreviewFiles([{ name: selected.name, size: selected.size }]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const { dragActive, dragHandlers } = useFileDrop({
    accept: ACCEPTED_UPLOAD,
    onFile: processSelectedFile,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey || !studentName || !studentId || !file) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('access_key', accessKey);
    formData.append('student_name', studentName);
    formData.append('student_id', studentId);
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/v1/student/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessData(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit assignment. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', background: 'var(--bg-surface)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {successData ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" }}
            >
              <CheckCircle size={64} color="var(--accent-tertiary)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
            </motion.div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Submission Received</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Your file was securely processed and encrypted.
            </p>

            {/* Health Check Banner */}
            {successData.health && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '0.7rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem',
                  ...(successData.health === 'ok'
                    ? { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }
                    : { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' })
                }}
              >
                {successData.health === 'ok'
                  ? <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  : <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
                <span>{successData.health_message || (successData.health === 'ok' ? 'All files processed successfully.' : 'Review your submission.')}</span>
              </motion.div>
            )}

            {/* Receipt Details */}
            <div style={{ background: 'var(--bg-base)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Receipt ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{successData?.submission_id || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{successData?.timestamp ? `${new Date(successData.timestamp).toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'America/Toronto' })} ${new Date(successData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Toronto' })} (GMT-4)` : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Attempt:</span>
                 <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{successData?.attempt || 0} / 3</span>
              </div>
            </div>

            {/* File Preview */}
            {successData.files && successData.files.length > 0 && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left', marginBottom: '1.25rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Files Detected</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {successData.total_files} file{successData.total_files !== 1 ? 's' : ''} &middot; {successData.total_lines} lines
                  </span>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {successData.files.map((f: any, i: number) => (
                    <div key={i} style={{
                      padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: i < successData.files.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <FileIcon size={14} color="var(--brand-red)" style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, marginLeft: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                        <span>{f.lines} lines</span>
                        <span>{(f.size_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                onClick={() => {
                  const ts = successData?.timestamp
                    ? `${new Date(successData.timestamp).toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'America/Toronto' })} ${new Date(successData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Toronto' })} (GMT-4)`
                    : 'N/A';
                  const fileList = (successData.files || []).map((f: any) => `  - ${f.name} (${f.lines} lines, ${(f.size_bytes / 1024).toFixed(1)} KB)`).join('\n');
                  const receipt = [
                    '═══════════════════════════════════════',
                    '  SUBMISSION RECEIPT',
                    '  Academic Integrity Portal — Brock University',
                    '═══════════════════════════════════════',
                    '',
                    `Assignment:  ${successData.assignment_title || 'N/A'}`,
                    `Language:    ${successData.language || 'N/A'}`,
                    `Receipt ID:  ${successData.submission_id || 'N/A'}`,
                    `Timestamp:   ${ts}`,
                    `Attempt:     ${successData.attempt || 0} / 3`,
                    '',
                    `Files (${successData.total_files || 0}):`,
                    fileList || '  (none)',
                    `Total Lines: ${successData.total_lines || 0}`,
                    '',
                    `Status: ${successData.health === 'ok' ? 'PASS — All files processed successfully' : 'WARNING — ' + (successData.health_message || 'Review your submission')}`,
                    '',
                    '═══════════════════════════════════════',
                    '  Keep this receipt for your records.',
                    '═══════════════════════════════════════',
                  ].join('\n');
                  const blob = new Blob([receipt], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `receipt_${(successData.submission_id || 'unknown').slice(0, 8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={15} /> Save Receipt
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setSuccessData(null); setFile(null); setPreviewFiles([]); }}>
                Submit Another File
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Access Key</label>
              <div className="input-with-icon">
                <Key />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: 'var(--bg-surface)' }}
                  placeholder="e.g. A1-B2C3" 
                  value={accessKey}
                  onChange={e => setAccessKey(e.target.value)}
                  required 
                />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Student Name</label>
              <div className="input-with-icon">
                <User />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: 'var(--bg-surface)' }}
                  placeholder="John Doe" 
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
               <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Student ID</label>
               <div className="input-with-icon">
                 <Badge />
                 <input 
                   type="text" 
                   className="form-input" 
                   style={{ background: 'var(--bg-surface)' }}
                   placeholder="1234567" 
                   value={studentId}
                   onChange={e => setStudentId(e.target.value)}
                   required 
                 />
               </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 600 }}>File Submission</label>
              <div
                {...dragHandlers}
                onClick={() => document.getElementById('submission-file-input')?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--brand-red)' : 'var(--border-strong)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  textAlign: 'center',
                  background: dragActive ? '#fef2f2' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="file-drop-area"
              >
                <input
                  id="submission-file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".zip,.c,.cpp,.java"
                  style={{ display: 'none' }}
                />

                {dragActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                    <UploadCloud size={36} color="var(--brand-red)" />
                    <span style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9rem' }}>Drop your file here</span>
                  </div>
                ) : file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); setFile(null); setPreviewFiles([]); }}
                      title="Remove file"
                      style={{
                        position: 'absolute', top: '-0.25rem', right: '-0.25rem',
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: 'var(--bg-surface-highest)', border: '1px solid var(--border-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'all 0.15s ease', padding: 0
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-highest)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                    >
                      <X size={12} />
                    </button>
                    <FileCode2 size={40} color="var(--brand-red)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{file.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>Click to replace</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        background: 'var(--bg-surface-highest)',
                        width: '48px', height: '48px',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        <UploadCloud size={24} color="var(--text-secondary)" />
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--brand-red)', fontWeight: 600 }}>Upload a file</span> or drag and drop
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Supports .zip, .c, .cpp, .java up to 50MB</span>
                  </div>
                )}
              </div>

              {/* Pre-submit file preview */}
              <AnimatePresence>
                {file && previewFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', marginTop: '0.75rem' }}
                  >
                    <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                      <div style={{ padding: '0.55rem 0.85rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {previewFiles.length} source file{previewFiles.length !== 1 ? 's' : ''} found
                        </span>
                        {previewFiles.length === 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>No valid files</span>
                        )}
                      </div>
                      <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                        {previewFiles.map((pf, i) => (
                          <div key={i} style={{
                            padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: i < previewFiles.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            fontSize: '0.78rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                              <FileIcon size={12} color="var(--brand-red)" style={{ flexShrink: 0 }} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pf.name}</span>
                            </div>
                            {pf.size > 0 && (
                              <span style={{ flexShrink: 0, marginLeft: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                                {(pf.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {file && file.name.endsWith('.zip') && previewFiles.length === 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  No .java, .c, or .cpp files found in this archive.
                </div>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', marginBottom: '1.25rem', fontSize: '0.85rem', textAlign: 'center' }}
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Need help? <a href="#" style={{ color: 'var(--brand-red)', fontWeight: 600 }}>Contact Support</a>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default StudentPortal;
