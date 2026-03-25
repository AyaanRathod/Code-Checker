import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronRight, BookOpen, Plus, X, Key, ShieldCheck, Clock, Upload, Pencil, Archive, ChevronDown, Download, Copy, Check, Database, Trash2, Code, Calendar, UploadCloud } from 'lucide-react';
import { useFileDrop } from '../hooks/useFileDrop';

const Dashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null); // null = create mode
  const [newAssignment, setNewAssignment] = useState({ title: '', course_code: '', language: 'JAVA', deadline: '' });
  const [boilerplateFile, setBoilerplateFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState('');
  // Repository state
  const [repos, setRepos] = useState<any[]>([]);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repoUploadName, setRepoUploadName] = useState('');
  const [repoUploadLanguage, setRepoUploadLanguage] = useState('JAVA');
  const [repoUploadFile, setRepoUploadFile] = useState<File | null>(null);
  const [repoUploading, setRepoUploading] = useState(false);
  const [repoUploadError, setRepoUploadError] = useState('');
  const navigate = useNavigate();

  const boilerplateDrop = useFileDrop({
    accept: ['.java', '.c', '.cpp', '.h', '.zip'],
    onFile: (f) => setBoilerplateFile(f),
  });

  const repoFileDrop = useFileDrop({
    accept: ['.zip'],
    onFile: (f) => setRepoUploadFile(f),
  });

  const formatDeadline = (deadline: string) => {
    const dt = new Date(deadline);
    if (Number.isNaN(dt.getTime())) {
      return 'Invalid deadline';
    }

    const datePart = dt.toLocaleDateString([], {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'America/Toronto'
    });
    const timePart = dt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto',
      hour12: false
    });
    return `${datePart} ${timePart} (GMT-4)`;
  };

  const fetchAssignments = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }

    try {
      const response = await axios.get('http://localhost:8000/api/v1/instructor/assignments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch assignments", e);
      setLoading(false);
    }
  };

  const fetchRepos = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:8000/api/v1/repositories/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepos(res.data);
    } catch (err) {
      console.error('Failed to fetch repositories', err);
    }
  };

  const handleRepoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUploadFile) { setRepoUploadError('Please select a zip file'); return; }
    const token = localStorage.getItem('token');
    if (!token) { navigate('/instructor/login'); return; }
    setRepoUploading(true);
    setRepoUploadError('');
    try {
      const formData = new FormData();
      formData.append('name', repoUploadName);
      formData.append('language', repoUploadLanguage);
      formData.append('file', repoUploadFile);
      await axios.post('http://localhost:8000/api/v1/repositories/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setIsRepoModalOpen(false);
      setRepoUploadName('');
      setRepoUploadFile(null);
      fetchRepos();
    } catch (err: any) {
      setRepoUploadError(err.response?.data?.detail || 'Failed to upload repository');
    } finally {
      setRepoUploading(false);
    }
  };

  const handleRepoDelete = async (repoId: string, repoName: string) => {
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }
    fetchAssignments();
    fetchRepos();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/instructor/login');
  };

  const openCreateModal = () => {
    setEditingAssignment(null);
    setNewAssignment({ title: '', course_code: '', language: 'JAVA', deadline: '' });
    setBoilerplateFile(null);
    setCreateError('');
    setIsModalOpen(true);
  };

  const handleArchive = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to archive this assignment?\n\nThis action is IRREVERSIBLE. All student identities (names and IDs) will be permanently deleted. Code files will be preserved for future repository comparisons.')) {
      return;
    }
    const token = localStorage.getItem('token');
    try {
      await axios.post(`http://localhost:8000/api/v1/instructor/assignments/${assignmentId}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAssignments();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to archive assignment.');
    }
  };

  const openEditModal = (assignment: any) => {
    setEditingAssignment(assignment);
    // Convert UTC deadline to local datetime-local format for the input
    let deadlineLocal = '';
    if (assignment.deadline) {
      const dt = new Date(assignment.deadline);
      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      const pad = (n: number) => n.toString().padStart(2, '0');
      deadlineLocal = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    setNewAssignment({
      title: assignment.title || '',
      course_code: assignment.course || '',
      language: assignment.language || 'JAVA',
      deadline: deadlineLocal
    });
    setBoilerplateFile(null);
    setCreateError('');
    setIsModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }

    try {
      setCreateError('');
      const formData = new FormData();
      formData.append('course_code', newAssignment.course_code);
      formData.append('title', newAssignment.title);
      formData.append('language', newAssignment.language);
      formData.append('deadline', newAssignment.deadline);
      if (boilerplateFile) {
        formData.append('boilerplate_file', boilerplateFile);
      }

      if (editingAssignment) {
        await axios.patch(`http://localhost:8000/api/v1/instructor/assignments/${editingAssignment.id}`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('http://localhost:8000/api/v1/instructor/assignments', formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      setEditingAssignment(null);
      setNewAssignment({ title: '', course_code: '', language: 'JAVA', deadline: '' });
      setBoilerplateFile(null);
      setLoading(true);
      fetchAssignments();
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.detail || (editingAssignment ? 'Failed to update assignment.' : 'Failed to create assignment.'));
    }
  };

  return (
    <div className="main-content" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card" 
              style={{ width: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
            >
              <button
                onClick={() => { setIsModalOpen(false); setEditingAssignment(null); }}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              
              <h2 style={{ fontSize: '1.25rem' }}>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</h2>

              {createError && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.85rem' }}>
                  {createError}
                </div>
              )}
              
              <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Course Code</label>
                  <input type="text" placeholder="e.g. COSC 4P02" required value={newAssignment.course_code} onChange={e => setNewAssignment({...newAssignment, course_code: e.target.value})} className="form-input" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Title</label>
                  <input type="text" placeholder="e.g. A3: Graph Traversal" required value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} className="form-input" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Language</label>
                  <select className="form-input" value={newAssignment.language} onChange={e => setNewAssignment({...newAssignment, language: e.target.value})}>
                    <option value="JAVA">Java</option>
                    <option value="CPP">C++</option>
                    <option value="C">C</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deadline</label>
                  <input type="datetime-local" required value={newAssignment.deadline} onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})} className="form-input" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Boilerplate / Starter Code <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                  <div
                    {...boilerplateDrop.dragHandlers}
                    style={{
                      border: `2px dashed ${boilerplateDrop.dragActive ? 'var(--brand-red)' : 'var(--border-strong)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: boilerplateDrop.dragActive ? '#fef2f2' : boilerplateFile ? '#ecfdf5' : 'var(--bg-surface-raised)',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => document.getElementById('boilerplate-input')?.click()}
                  >
                    <input
                      id="boilerplate-input"
                      type="file"
                      accept=".java,.c,.cpp,.h,.zip"
                      style={{ display: 'none' }}
                      onChange={e => setBoilerplateFile(e.target.files?.[0] || null)}
                    />
                    {boilerplateDrop.dragActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--brand-red)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <UploadCloud size={18} /> Drop file here
                      </div>
                    ) : boilerplateFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setBoilerplateFile(null); }}
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
                          <Upload size={16} /> {boilerplateFile.name}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Click to replace</span>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <Upload size={16} style={{ margin: '0 auto 0.25rem auto', display: 'block', opacity: 0.5 }} />
                        Drop or click to upload starter code (.java, .c, .cpp, .zip)
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                    This code will be excluded from similarity comparisons.
                  </span>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  {editingAssignment ? 'Save Changes' : 'Create & Generate Access Key'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repository Upload Modal */}
      <AnimatePresence>
        {isRepoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card"
              style={{ width: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
            >
              <button onClick={() => { setIsRepoModalOpen(false); setRepoUploadError(''); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.25rem' }}>Upload Repository</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 0 0' }}>
                Upload a <code>.zip</code> of <code>.zip</code> files. Each inner zip represents one student submission.
              </p>

              {repoUploadError && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.85rem' }}>
                  {repoUploadError}
                </div>
              )}

              <form onSubmit={handleRepoUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repository Name</label>
                  <input type="text" placeholder="e.g. COSC 4P02 - A1 - Winter 2025" required value={repoUploadName} onChange={e => setRepoUploadName(e.target.value)} className="form-input" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Language</label>
                  <select className="form-input" value={repoUploadLanguage} onChange={e => setRepoUploadLanguage(e.target.value)}>
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
                      background: repoFileDrop.dragActive ? '#faf5ff' : repoUploadFile ? '#ecfdf5' : 'var(--bg-surface-raised)', transition: 'all 0.15s ease'
                    }}
                    onClick={() => document.getElementById('dashboard-repo-file-input')?.click()}
                  >
                    <input id="dashboard-repo-file-input" type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setRepoUploadFile(e.target.files?.[0] || null)} />
                    {repoFileDrop.dragActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600 }}>
                        <UploadCloud size={20} /> Drop .zip file here
                      </div>
                    ) : repoUploadFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setRepoUploadFile(null); }}
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
                          <Upload size={16} /> {repoUploadFile.name}
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
                <button type="submit" className="btn btn-primary" disabled={repoUploading} style={{ marginTop: '0.5rem' }}>
                  {repoUploading ? 'Uploading & Processing...' : 'Upload Repository'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav style={{ padding: '0.75rem 2.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Instructor View</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/instructor/repositories')} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <Database size={14} /> Repositories
          </button>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main style={{ padding: '3rem 2.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage your active courses and similarity analyses.</p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> New Assignment
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>Loading valid assignments...</div>
        ) : assignments.length === 0 ? (
           <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
             <BookOpen size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
             <h3>No Assignments Yet</h3>
             <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Click "New Assignment" to start accepting student code submissions.</p>
           </div>
        ) : (
          <>
            {/* Active Assignments (Open + Closed) */}
            {(() => {
              const active = assignments.filter(a => a.status !== 'Archived');
              if (active.length === 0) return null;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                  {active.map((assignment, i) => (
                    <ActiveAssignmentCard key={assignment.id} assignment={assignment} index={i} formatDeadline={formatDeadline} openEditModal={openEditModal} onArchive={handleArchive} />
                  ))}
                </div>
              );
            })()}

            {/* Submission Repositories Section */}
            <RepositoriesSection repos={repos} onUpload={() => { setRepoUploadError(''); setIsRepoModalOpen(true); }} onDelete={handleRepoDelete} />

            {/* Archived Assignments */}
            {(() => {
              const archived = assignments.filter(a => a.status === 'Archived');
              if (archived.length === 0) return null;
              return (
                <ArchivedSection assignments={archived} formatDeadline={formatDeadline} navigate={navigate} />
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
};

// --- Sub-components ---

const ActiveAssignmentCard: React.FC<{ assignment: any; index: number; formatDeadline: (d: string) => string; openEditModal: (a: any) => void; onArchive: (id: string) => void }> = ({ assignment, index, formatDeadline, openEditModal, onArchive }) => {
  const statusColor = assignment.status === 'Closed' ? { bg: '#f1f5f9', fg: '#64748b' } : { bg: '#ecfdf5', fg: '#059669' };
  const [copied, setCopied] = React.useState(false);
  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(assignment.access_key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ padding: '0.25rem 0.6rem', background: 'var(--bg-surface-highest)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BookOpen size={12} /> {assignment.course}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={(e) => { e.preventDefault(); openEditModal(assignment); }}
            title="Edit assignment"
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.3rem', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand-red)'; e.currentTarget.style.borderColor = 'var(--brand-red)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          >
            <Pencil size={13} />
          </button>
          {assignment.status === 'Closed' && (
            <button
              onClick={(e) => { e.preventDefault(); onArchive(assignment.id); }}
              title="Archive assignment"
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.3rem', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <Archive size={13} />
            </button>
          )}
          <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', background: statusColor.bg, color: statusColor.fg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {assignment.status}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{assignment.title}</h3>

      <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        <div
          onClick={handleCopyKey}
          title="Click to copy access key"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.4rem', margin: '-0.15rem -0.4rem', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-highest)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Key size={14} color="var(--brand-red)" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{assignment.access_key}</span>
          {copied ? <Check size={13} color="#059669" /> : <Copy size={13} color="var(--text-tertiary)" />}
          {copied && <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>Copied!</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} color="var(--text-tertiary)" />
          <span>Due: {formatDeadline(assignment.deadline)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{assignment.count}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Submissions</div>
        </div>
        {assignment.flags > 0 && (
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#dc2626' }}>{assignment.flags}</div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>High Risk</div>
          </div>
        )}
      </div>

      <Link
        to={`/instructor/assignment/${assignment.id}`}
        className="btn btn-outline"
        style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-surface-raised)' }}
      >
        View Details <ChevronRight size={16} />
      </Link>
    </motion.div>
  );
};


const RepositoriesSection: React.FC<{ repos: any[]; onUpload: () => void; onDelete: (id: string, name: string) => void }> = ({ repos, onUpload, onDelete }) => {
  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <Database size={18} style={{ color: '#7c3aed' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Submission Repositories</h2>
            {repos.length > 0 && (
              <span style={{ fontSize: '0.8rem', background: '#ede9fe', padding: '0.1rem 0.55rem', borderRadius: 'var(--radius-full)', color: '#7c3aed', fontWeight: 600 }}>
                {repos.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>Upload past submissions to compare against current assignments.</p>
        </div>
        <button className="btn btn-outline" onClick={onUpload} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem', borderColor: '#7c3aed', color: '#7c3aed' }}>
          <Upload size={15} /> Upload Repository
        </button>
      </div>

      {repos.length === 0 ? (
        <div
          onClick={onUpload}
          style={{
            border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '2rem',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--bg-surface)'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
        >
          <Database size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem auto', display: 'block', color: '#7c3aed' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>No repositories yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
            Upload past semester submissions to detect cross-semester plagiarism, or archive an assignment to auto-create one.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {repos.map((repo, i) => (
            <motion.div
              key={repo.id}
              className="glass-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              style={{ padding: '1.25rem', minWidth: '280px', maxWidth: '320px', flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.2rem 0.5rem', background: '#ede9fe', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 600, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Database size={11} /> Repository
                </div>
                <button
                  onClick={() => onDelete(repo.id, repo.name)}
                  title="Delete repository"
                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>{repo.name}</h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Code size={12} /> {repo.language}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} /> {repo.created_at ? new Date(repo.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '—'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{repo.submission_count}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>submissions</span>
              </div>

              {repo.source_assignment_id && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Auto-created from archived assignment
                </div>
              )}
            </motion.div>
          ))}

          {/* Add more CTA card */}
          <div
            onClick={onUpload}
            style={{
              minWidth: '200px', flex: '0 0 auto', border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-md)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem',
              cursor: 'pointer', transition: 'all 0.2s ease', gap: '0.5rem'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Upload size={20} style={{ color: '#7c3aed', opacity: 0.5 }} />
            <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>Upload More</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ArchivedSection: React.FC<{ assignments: any[]; formatDeadline: (d: string) => string; navigate: (path: string) => void }> = ({ assignments, formatDeadline, navigate }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ marginTop: '3rem' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '0.5rem 0', marginBottom: '1rem', width: '100%', textAlign: 'left'
        }}
      >
        <Archive size={18} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Archived Assignments
        </span>
        <span style={{ fontSize: '0.8rem', background: 'var(--bg-surface-highest)', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-full)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {assignments.length}
        </span>
        <ChevronDown
          size={16}
          style={{
            marginLeft: 'auto',
            color: 'var(--text-tertiary)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {assignments.map((assignment, i) => (
                <motion.div
                  key={assignment.id}
                  className="glass-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', opacity: 0.85 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.25rem 0.6rem', background: 'var(--bg-surface-highest)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={12} /> {assignment.course}
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', background: '#ede9fe', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Archived
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{assignment.title}</h3>

                  <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} />
                      <span>Closed: {formatDeadline(assignment.deadline)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{assignment.count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Submissions</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    <button
                      onClick={() => navigate(`/instructor/assignment/${assignment.id}`)}
                      className="btn btn-outline"
                      style={{ flex: 1, display: 'flex', justifyContent: 'space-between', background: 'var(--bg-surface-raised)' }}
                    >
                      View Details <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default Dashboard;
