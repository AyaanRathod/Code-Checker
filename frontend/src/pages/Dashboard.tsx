import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronRight, BookOpen, Plus, X, Key, ShieldCheck, Clock } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', course_code: '', language: 'JAVA', deadline: '' });
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }
    fetchAssignments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/instructor/login');
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
      await axios.post('http://localhost:8000/api/v1/instructor/assignments', newAssignment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setNewAssignment({ title: '', course_code: '', language: 'JAVA', deadline: '' });
      setLoading(true);
      fetchAssignments();
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.detail || 'Failed to create assignment.');
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
                onClick={() => setIsModalOpen(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              
              <h2 style={{ fontSize: '1.25rem' }}>Create Assignment</h2>

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
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create & Generate Access Key</button>
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
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <LogOut size={14} /> Logout
        </button>
      </nav>

      <main style={{ padding: '3rem 2.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage your active courses and similarity analyses.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {assignments.map((assignment, i) => (
              <motion.div 
                key={assignment.id}
                className="glass-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.25rem 0.6rem', background: 'var(--bg-surface-highest)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={12} /> {assignment.course}
                  </div>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: 'var(--radius-sm)',
                    background: assignment.status === 'Closed' ? '#f1f5f9' : '#ecfdf5',
                    color: assignment.status === 'Closed' ? '#64748b' : '#059669',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {assignment.status}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{assignment.title}</h3>
                
                <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={14} color="var(--brand-red)" /> 
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{assignment.access_key}</span>
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
