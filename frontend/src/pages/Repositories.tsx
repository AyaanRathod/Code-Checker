import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Database, Calendar, Code, X, ShieldCheck, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Repositories: React.FC = () => {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadLanguage, setUploadLanguage] = useState('JAVA');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchRepos = async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/instructor/login'); return; }
    try {
      const res = await axios.get('http://localhost:8000/api/v1/repositories/', {
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

      await axios.post('http://localhost:8000/api/v1/repositories/upload', formData, {
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

  const handleDelete = async (repoId: string, repoName: string) => {
    if (!window.confirm(`Delete repository "${repoName}"?\n\nThis will permanently remove all stored files.`)) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:8000/api/v1/repositories/${repoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepos(repos.filter(r => r.id !== repoId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete repository');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/instructor/login');
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

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
              style={{ width: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
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
                    style={{
                      border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.25rem',
                      textAlign: 'center', cursor: 'pointer',
                      background: uploadFile ? '#ecfdf5' : 'var(--bg-surface-raised)', transition: 'all 0.15s ease'
                    }}
                    onClick={() => document.getElementById('repo-file-input')?.click()}
                  >
                    <input id="repo-file-input" type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                    {uploadFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Upload size={16} /> {uploadFile.name}
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); setUploadFile(null); }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <Upload size={20} style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.5 }} />
                        Click to select a .zip file
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
      <nav style={{ padding: '0.75rem 2.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/instructor/dashboard')} className="btn btn-outline" style={{ border: 'none', padding: 0, color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <LogOut size={14} /> Logout
        </button>
      </nav>

      <main style={{ padding: '3rem 2.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Submission Repositories</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage past submission archives for cross-semester analysis.</p>
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
              Repositories are auto-created when assignments are archived, or you can upload one manually.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
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
