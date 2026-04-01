import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Database, Calendar, Code, X, ShieldCheck, LogOut, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../lib/apiClient';
import { useFileDrop } from '../hooks/useFileDrop';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../components/ui/Toast';

const Repositories: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadLanguage, setUploadLanguage] = useState('JAVA');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const repoFileDrop = useFileDrop({
    accept: ['.zip'],
    onFile: (f) => setUploadFile(f),
  });

  const fetchRepos = async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/instructor/login'); return; }
    try {
      const res = await apiClient.get('/repositories/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRepos(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError('Please select a zip file'); return; }
    const token = localStorage.getItem('token');
    if (!token) { navigate('/instructor/login'); return; }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('name', uploadName);
      formData.append('language', uploadLanguage);
      formData.append('file', uploadFile);

      await apiClient.post('/repositories/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      setIsUploadOpen(false);
      setUploadName('');
      setUploadFile(null);
      setLoading(true);
      fetchRepos();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload repository');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (repoId: string, repoName: string) => {
    setConfirmDelete({ id: repoId, name: repoName });
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    const token = localStorage.getItem('token');
    try {
      await apiClient.delete(`/repositories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepos(repos.filter(r => r.id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete repository', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/instructor/login');
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
      <ConfirmModal
        open={!!confirmDelete}
        title={`Delete "${confirmDelete?.name ?? ''}"`}
        message="This will permanently remove all stored files."
        confirmLabel="Delete"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card"
              style={{ width: 'min(450px, calc(100vw - 1rem))', maxHeight: 'calc(100vh - 1.5rem)', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
            >
              <button onClick={() => setIsUploadOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.25rem' }}>Upload Repository</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 0 0' }}>
                Upload a <code>.zip</code> of <code>.zip</code> files. Each inner zip represents one student submission.
              </p>

              {uploadError && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.85rem' }}>
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repository Name</label>
                  <input type="text" placeholder="e.g. COSC 4P02 - A1 - Winter 2025" required value={uploadName} onChange={e => setUploadName(e.target.value)} className="form-input" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Language</label>
                  <select className="form-input" value={uploadLanguage} onChange={e => setUploadLanguage(e.target.value)}>
                    <option value="JAVA">Java</option>
                    <option value="CPP">C++</option>
                    <option value="C">C</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repository File (.zip of .zips)</label>
                  <div
                    {...repoFileDrop.dragHandlers}
                    style={{
                      border: `2px dashed ${repoFileDrop.dragActive ? '#7c3aed' : 'var(--border-strong)'}`, borderRadius: 'var(--radius-md)', padding: '1.25rem',
                      textAlign: 'center', cursor: 'pointer',
                      background: repoFileDrop.dragActive ? '#faf5ff' : uploadFile ? '#ecfdf5' : 'var(--bg-surface-raised)', transition: 'all 0.15s ease'
                    }}
                    onClick={() => document.getElementById('repo-file-input')?.click()}
                  >
                    <input id="repo-file-input" type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                    {repoFileDrop.dragActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600 }}>
                        <UploadCloud size={20} /> Drop .zip file here
                      </div>
                    ) : uploadFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setUploadFile(null); }}
                          title="Remove file"
                          style={{
                            position: 'absolute', top: '-0.4rem', right: '-0.4rem',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'var(--bg-surface-highest)', border: '1px solid var(--border-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'all 0.15s ease', padding: 0
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-highest)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                        >
                          <X size={10} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Upload size={16} /> {uploadFile.name}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Click to replace</span>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <Upload size={20} style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.5 }} />
                        Drop or click to select a .zip file
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ marginTop: '0.5rem' }}>
                  {uploading ? 'Uploading & Processing...' : 'Upload Repository'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav bar */}
      <nav style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem 0.8rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/instructor/dashboard')} className="btn btn-outline" style={{ border: 'none', padding: 0, color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <LogOut size={14} /> Logout
        </button>
      </nav>

      <main style={{ padding: '1rem 0.75rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Submission Repositories</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Upload and manage student repositories for current or past assignment analysis.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Upload size={18} /> Upload Repository
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>Loading repositories...</div>
        ) : repos.length === 0 ? (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Database size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
            <h3>No Repositories Yet</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Repositories can be uploaded manually (zip of student zips) or auto-created when assignments are archived.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
            {repos.map((repo, i) => (
              <motion.div
                key={repo.id}
                className="glass-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.25rem 0.6rem', background: '#ede9fe', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Database size={12} /> Repository
                  </div>
                  <button
                    onClick={() => handleDelete(repo.id, repo.name)}
                    title="Delete repository"
                    style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.3rem', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{repo.name}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Code size={14} />
                    <span>{repo.language}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} />
                    <span>{repo.created_at ? new Date(repo.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '—'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{repo.submission_count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Submissions</div>
                </div>

                {repo.source_assignment_id && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    Auto-created from archived assignment
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Repositories;
