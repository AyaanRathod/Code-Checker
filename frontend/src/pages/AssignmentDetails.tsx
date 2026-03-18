import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, AlertTriangle, CheckCircle, Search, Download, BookOpen, Clock, FileWarning } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const AssignmentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      const token = localStorage.getItem('token');
      try {
        const [assnRes, compRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/v1/instructor/assignments/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:8000/api/v1/instructor/assignments/${id}/comparisons`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setAssignment(assnRes.data);
        setComparisons(compRes.data);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch assignment details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleRunAnalysis = async () => {
    setTriggering(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`http://localhost:8000/api/v1/analysis/${id}/run`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Analysis has been queued to run in the background! Check back in a moment.');
      setAssignment({...assignment, status: 'Analyzing...'});
    } catch (err) {
      console.error(err);
      alert('Failed to trigger analysis. Ensure students have submitted files first.');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading assignment details...</div>;
  if (!assignment) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Assignment not found.</div>;

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
      <main style={{ padding: '3rem 2.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        
        <button onClick={() => navigate('/instructor/dashboard')} className="btn btn-outline" style={{ border: 'none', padding: 0, marginBottom: '2rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{assignment.title}</h1>
              <span style={{ 
                background: assignment.status === 'Open' ? '#f1f5f9' : '#ecfdf5', 
                color: assignment.status === 'Open' ? '#64748b' : '#059669', 
                padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' 
              }}>
                {assignment.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BookOpen size={16}/> {assignment.course}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={16}/> Deadline: {new Date(assignment.deadline).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" disabled={comparisons.length === 0} style={{ background: 'var(--bg-surface)' }}>
              <Download size={16} /> Export PDF
            </button>
            <button className="btn btn-primary" onClick={handleRunAnalysis} disabled={triggering}>
              <Play size={16} fill="currentColor" /> {triggering ? 'Triggering...' : 'Run Analysis Now'}
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Similarity Results</h2>
            <div className="input-with-icon">
              <Search />
              <input type="text" placeholder="Search Encrypted ID..." className="form-input" style={{ width: '250px' }} />
            </div>
          </div>

          {comparisons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>
                <FileWarning size={48} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>No Analysis Results Yet</h3>
              <p style={{ fontSize: '0.9rem' }}>Click "Run Analysis Now" above to start comparing student submissions.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '2px solid var(--border-subtle)' }}>Source ID (Encrypted)</th>
                    <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '2px solid var(--border-subtle)' }}>Target ID (Encrypted)</th>
                    <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '2px solid var(--border-subtle)' }}>Similarity Score</th>
                    <th style={{ padding: '1rem', fontWeight: 600, borderBottom: '2px solid var(--border-subtle)' }}>Risk Level</th>
                    <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right', borderBottom: '2px solid var(--border-subtle)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <motion.tr 
                      key={c.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{c.source_student}</td>
                      <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{c.target_student}</td>
                      <td style={{ padding: '1.25rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.score > 80 ? '#dc2626' : c.score > 60 ? '#d97706' : 'var(--text-primary)' }}>
                        {c.score.toFixed(1)}%
                      </td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        {c.score > 80 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}><AlertTriangle size={14} /> High Risk</span>
                        ) : c.score > 60 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontSize: '0.85rem', fontWeight: 600 }}><AlertTriangle size={14} /> Review</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}><CheckCircle size={14} /> Normal</span>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                        <Link to={`/instructor/compare/${c.id}`} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--bg-surface)' }}>
                          Inspect Match
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-surface-raised);
        }
      `}</style>
    </div>
  );
};

export default AssignmentDetails;
