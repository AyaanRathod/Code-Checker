import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, AlertTriangle, CheckCircle, Search, Download, BookOpen, Clock, FileWarning, LayoutDashboard, Database, Activity, GitCommit, Archive, Users, FileCode, Hash, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

type TabView = 'submissions' | 'overview' | 'results' | 'clusters';

const AssignmentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('submissions');
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      const token = localStorage.getItem('token');
      try {
        const [assnRes, compRes, subRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/v1/instructor/assignments/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:8000/api/v1/instructor/assignments/${id}/comparisons`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:8000/api/v1/instructor/assignments/${id}/submissions`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setAssignment(assnRes.data);
        setComparisons(compRes.data);
        setSubmissions(subRes.data);
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

  const handleDownloadSubmissions = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/instructor/login');
      return;
    }

    setDownloading(true);
    try {
      const response = await axios.get(
        `http://localhost:8000/api/v1/instructor/assignments/${id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'submissions.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const message = err.response?.status === 404
        ? 'No submissions found to download.'
        : 'Failed to download submissions.';
      alert(message);
    } finally {
      setDownloading(false);
    }
  };

  const metrics = useMemo(() => {
    if (!comparisons.length) return { total: 0, highRisk: 0, reviews: 0, avg: 0, distribution: [0,0,0,0,0], maxInDist: 1 };

    let highRisk = 0;
    let reviews = 0;
    let sum = 0;
    const dist = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100

    comparisons.forEach(c => {
      sum += c.score;
      if (c.score > 80) highRisk++;
      else if (c.score > 60) reviews++;

      if (c.score < 20) dist[0]++;
      else if (c.score < 40) dist[1]++;
      else if (c.score < 60) dist[2]++;
      else if (c.score < 80) dist[3]++;
      else dist[4]++;
    });

    return {
      total: comparisons.length,
      highRisk,
      reviews,
      avg: sum / comparisons.length,
      distribution: dist,
      maxInDist: Math.max(...dist) || 1
    };
  }, [comparisons]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading assignment details...</div>;
  if (!assignment) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Assignment not found.</div>;

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Top Details Action Header */}
      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 2rem', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <button onClick={() => navigate('/instructor/dashboard')} className="btn btn-outline" style={{ border: 'none', padding: 0, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{assignment.title}</h1>
              <span style={{
                background: assignment.status === 'Open' ? '#f1f5f9' : '#ecfdf5',
                color: assignment.status === 'Open' ? '#64748b' : '#059669',
                padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {assignment.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BookOpen size={14}/> {assignment.course}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14}/> Deadline: {new Date(assignment.deadline).toLocaleDateString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" disabled={comparisons.length === 0} style={{ background: 'var(--bg-surface)' }}>
              <Download size={16} /> PDF Report
            </button>
            <button className="btn btn-outline" onClick={handleDownloadSubmissions} disabled={downloading} style={{ background: 'var(--bg-surface)' }}>
              <Archive size={16} /> {downloading ? 'Downloading...' : 'Download Submissions'}
            </button>
            <button className="btn btn-primary" onClick={handleRunAnalysis} disabled={triggering}>
              <Play size={16} fill="currentColor" /> {triggering ? 'Analyzing...' : 'Run Graph Setup'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Sidebar Menu */}
        <aside style={{ width: '240px', background: 'var(--bg-surface-raised)', borderRight: '1px solid var(--border-subtle)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
           <h3 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>Reports Engine</h3>

           <button
             onClick={() => setActiveTab('submissions')}
             className={`sidebar-tab ${activeTab === 'submissions' ? 'active' : ''}`}
           >
             <Users size={18} /> Submissions
             {submissions.length > 0 && (
               <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: 'var(--bg-surface)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                 {submissions.length}
               </span>
             )}
           </button>

           <button
             onClick={() => setActiveTab('overview')}
             className={`sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
           >
             <LayoutDashboard size={18} /> Analytics Overview
           </button>

           <button
             onClick={() => setActiveTab('results')}
             className={`sidebar-tab ${activeTab === 'results' ? 'active' : ''}`}
           >
             <Database size={18} /> Pairwise Similarities
           </button>

           <button
             onClick={() => setActiveTab('clusters')}
             className={`sidebar-tab ${activeTab === 'clusters' ? 'active' : ''}`}
           >
             <GitCommit size={18} /> Similarity Matrix Hover
           </button>
        </aside>

        {/* Right Content Area */}
        <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>

            <AnimateTab tab={activeTab} target="submissions">
               <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Submissions</h2>

               {/* Summary Stats */}
               {(() => {
                 const totalSubs = submissions.length;
                 const totalFiles = submissions.reduce((sum: number, s: any) => sum + (s.file_count || 0), 0);
                 const totalLines = submissions.reduce((sum: number, s: any) => sum + (s.total_lines || 0), 0);
                 const avgFiles = totalSubs > 0 ? (totalFiles / totalSubs).toFixed(1) : 0;
                 const avgLines = totalSubs > 0 ? Math.round(totalLines / totalSubs) : 0;
                 const latestTime = totalSubs > 0 ? submissions[0].timestamp : null;

                 return (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                     <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid var(--brand-secondary)' }}>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                         <Users size={14} /> Total Submissions
                       </span>
                       <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSubs}</span>
                     </div>

                     <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #6366f1', display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                         <FileCode size={14} /> Total Files
                       </span>
                       <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>{totalFiles}</span>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>~{avgFiles} per submission</span>
                     </div>

                     <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #10b981' }}>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                         <Hash size={14} /> Avg Lines of Code
                       </span>
                       <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{avgLines.toLocaleString()}</span>
                     </div>

                     {latestTime && (
                       <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #f59e0b' }}>
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                           <Clock size={14} /> Latest Submission
                         </span>
                         <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                           {new Date(latestTime).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}{' '}
                           {new Date(latestTime).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>(GMT-4)</span>
                       </div>
                     )}
                   </div>
                 );
               })()}

               {/* Submissions Table */}
               <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                 {submissions.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                     <Users size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
                     <h3 style={{ marginBottom: '0.5rem' }}>No Submissions Yet</h3>
                     <p style={{ fontSize: '0.9rem' }}>Students haven't submitted any files for this assignment yet.</p>
                   </div>
                 ) : (
                   <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                     <thead>
                       <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>#</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Student ID</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Submitted</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Attempt</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Files</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Lines</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Size</th>
                         <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                       </tr>
                     </thead>
                     <tbody>
                       {submissions.map((s: any, i: number) => {
                         const formatBytes = (bytes: number) => {
                           if (bytes < 1024) return `${bytes} B`;
                           if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                           return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                         };

                         return (
                           <tr
                             key={s.id}
                             style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }}
                             className="table-row-hover"
                           >
                             <td style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{i + 1}</td>
                             <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
                               {s.masked_student_id}
                               {s.is_flagged && (
                                 <Flag size={13} style={{ marginLeft: '0.5rem', color: '#dc2626', verticalAlign: 'middle' }} />
                               )}
                             </td>
                             <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                               {s.timestamp ? (
                                 <>
                                   {new Date(s.timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}{' '}
                                   <span style={{ color: 'var(--text-tertiary)' }}>
                                     {new Date(s.timestamp).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' })}
                                   </span>
                                 </>
                               ) : '—'}
                             </td>
                             <td style={{ padding: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>{s.attempt_number}</td>
                             <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{s.file_count}</td>
                             <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{s.total_lines.toLocaleString()}</td>
                             <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{formatBytes(s.total_bytes)}</td>
                             <td style={{ padding: '1rem' }}>
                               <span style={{
                                 padding: '0.2rem 0.6rem',
                                 borderRadius: 'var(--radius-full)',
                                 fontSize: '0.75rem',
                                 fontWeight: 600,
                                 background: s.status === 'Active' ? '#ecfdf5' : '#f1f5f9',
                                 color: s.status === 'Active' ? '#059669' : '#64748b'
                               }}>
                                 {s.status}
                               </span>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 )}
               </div>
            </AnimateTab>

            <AnimateTab tab={activeTab} target="overview">
               <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Analytics Overview</h2>

               {/* Stat Cards Grid */}
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                 <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid var(--brand-secondary)' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                     <Activity size={14} /> Computed Matches
                   </span>
                   <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.total}</span>
                 </div>

                 <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #dc2626' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                     <AlertTriangle size={14} color="#dc2626" /> Critical Flag (&gt;80%)
                   </span>
                   <span style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>{metrics.highRisk}</span>
                 </div>

                 <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #10b981' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                     <CheckCircle size={14} color="#10b981" /> Average Similarity
                   </span>
                   <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{metrics.avg.toFixed(1)}%</span>
                 </div>
               </div>

               {/* CSS Native Distribution Graph */}
               <div className="glass-card" style={{ padding: '1.5rem' }}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Similarity Distribution Model</h3>

                 {metrics.total === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)' }}>No data to graph yet.</div>
                 ) : (
                   <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '180px', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-strong)', position: 'relative' }}>
                     {metrics.distribution.map((val, idx) => {
                       const heightPercentage = (val / metrics.maxInDist) * 100;
                       const labels = ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"];
                       const colors = ["#10b981", "#34d399", "#fbbf24", "#f59e0b", "#dc2626"];
                       return (
                         <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                           <motion.div
                             initial={{ height: 0 }}
                             animate={{ height: `${heightPercentage}%` }}
                             transition={{ duration: 1, delay: idx * 0.1, type: "spring" }}
                             style={{
                               width: '100%',
                               maxWidth: '80px',
                               background: colors[idx],
                               borderRadius: '4px 4px 0 0',
                               position: 'relative',
                               minHeight: val > 0 ? '4px' : '0'
                             }}
                           >
                             {val > 0 && (
                               <span style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                 {val}
                               </span>
                             )}
                           </motion.div>
                           <span style={{ position: 'absolute', bottom: '-25px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{labels[idx]}</span>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
            </AnimateTab>

            <AnimateTab tab={activeTab} target="results">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.5rem' }}>Pairwise Similarities</h2>
                  <div className="input-with-icon">
                    <Search />
                    <input type="text" placeholder="Search Encrypted ID..." className="form-input" style={{ width: '280px', background: 'var(--bg-surface)' }} />
                  </div>
               </div>

               <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                 {comparisons.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                      <FileWarning size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
                      <h3 style={{ marginBottom: '0.5rem' }}>No Analysis Results Yet</h3>
                      <p style={{ fontSize: '0.9rem' }}>Click "Run Graph Setup" above to start comparing.</p>
                    </div>
                 ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '1rem', fontWeight: 600 }}>Source ID (Encrypted)</th>
                          <th style={{ padding: '1rem', fontWeight: 600 }}>Target ID (Encrypted)</th>
                          <th style={{ padding: '1rem', fontWeight: 600 }}>Similarity Score</th>
                          <th style={{ padding: '1rem', fontWeight: 600 }}>Risk Level</th>
                          <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisons.map((c, i) => (
                          <tr
                            key={c.id}
                            style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }}
                            className="table-row-hover"
                          >
                            <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{c.source_student}</td>
                            <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{c.target_student}</td>
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
                              <Link to={`/instructor/compare/${c.id}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--bg-surface)' }}>
                                Inspect Match
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 )}
               </div>
            </AnimateTab>

            <AnimateTab tab={activeTab} target="clusters">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>N × N Similarity Matrix</h2>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 12, height: 12, background: 'hsl(220, 20%, 95%)', border: '1px solid #ccc' }}></div> Low/None</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 12, height: 12, background: 'var(--brand-secondary)' }}></div> Minor</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 12, height: 12, background: '#f59e0b' }}></div> Review</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 12, height: 12, background: '#dc2626' }}></div> Critical</span>
                  </div>
               </div>

               <div className="glass-card" style={{ padding: '0', overflowX: 'auto', overflowY: 'hidden' }}>
                 {(() => {
                    if (comparisons.length === 0) return (
                       <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No data to construct heatmap.</div>
                    );

                    // Extract unique student IDs from the comparisons array
                    const uniqueIds = Array.from(new Set(comparisons.flatMap(c => [c.source_student, c.target_student]))).sort();

                    if (uniqueIds.length === 0) return null;

                    // Compute cellSize dynamically depending on grid volume (min 20px, max 80px)
                    const cellSize = Math.max(20, Math.min(80, 800 / uniqueIds.length));

                    return (
                       <div style={{ padding: '2rem' }}>
                         {/* Matrix Container */}
                         <div style={{ display: 'inline-flex', flexDirection: 'column' }}>

                           {/* Render Columns Header */}
                           <div style={{ display: 'flex', marginLeft: '80px' }}>
                             {uniqueIds.map((colId, i) => (
                               <div key={i} style={{ width: cellSize, height: '80px', position: 'relative' }}>
                                 <span style={{
                                   position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%) rotate(-45deg)', transformOrigin: 'bottom left',
                                   fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                                   width: '60px', overflow: 'hidden', textOverflow: 'ellipsis'
                                 }} title={colId}>
                                    {colId.substring(0, 8)}...
                                 </span>
                               </div>
                             ))}
                           </div>

                           {/* Render Rows */}
                           {uniqueIds.map((rowId, i) => (
                             <div key={i} style={{ display: 'flex', alignItems: 'center' }}>

                               {/* Row Label */}
                               <div style={{ width: '80px', fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'right', paddingRight: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rowId}>
                                  {rowId.substring(0, 8)}...
                               </div>

                               {/* Cells */}
                               {uniqueIds.map((colId, j) => {
                                 let score = 0;
                                 let comp: any = null;
                                 if (rowId === colId) {
                                   score = 100; // Identity diagonal
                                 } else {
                                   comp = comparisons.find(c => (c.source_student === rowId && c.target_student === colId) || (c.source_student === colId && c.target_student === rowId));
                                   if (comp) score = comp.score;
                                 }

                                 const isClickable = comp !== null;

                                 // Color calculation based on score
                                 let bgColor = 'hsl(220, 20%, 95%)'; // Very light gray/blue
                                 let borderCol = 'rgba(0,0,0,0.05)';

                                 if (score > 80) { bgColor = '#dc2626'; borderCol = '#b91c1c'; }
                                 else if (score > 60) { bgColor = '#f59e0b'; borderCol = '#d97706'; }
                                 else if (score > 40) { bgColor = 'var(--brand-secondary)'; borderCol = 'var(--brand-primary)'; }
                                 else if (score > 20) { bgColor = 'hsl(220, 30%, 85%)'; borderCol = 'hsl(220, 30%, 75%)'; }
                                 else if (score > 0) { bgColor = 'hsl(220, 20%, 90%)'; borderCol = 'hsl(220, 20%, 80%)'; }

                                 if (rowId === colId) {
                                   bgColor = 'rgba(0,0,0,0.1)'; // Diagonal
                                 }

                                 return (
                                   <div
                                      key={`${rowId}-${colId}`}
                                      className="heatmap-cell"
                                      title={`Source: ${rowId}\nTarget: ${colId}\nSimilarity: ${score.toFixed(1)}%${isClickable ? '\nClick to inspect' : ''}`}
                                      onClick={() => { if (isClickable) navigate(`/instructor/compare/${comp.id}`); }}
                                      style={{
                                        width: cellSize,
                                        height: cellSize,
                                        background: bgColor,
                                        border: `1px solid ${borderCol}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: cellSize < 30 ? '0' : '0.6rem',
                                        color: score > 60 && rowId !== colId ? 'white' : 'transparent',
                                        fontWeight: 700,
                                        cursor: isClickable ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease'
                                      }}
                                   >
                                      {rowId !== colId && score > 60 ? Math.round(score) : ''}
                                   </div>
                                 );
                               })}
                             </div>
                           ))}

                         </div>
                       </div>
                    );
                 })()}
               </div>
            </AnimateTab>

        </div>
      </div>
      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-surface-raised);
        }
        .heatmap-cell:hover {
          transform: scale(1.15);
          box-shadow: var(--shadow-md);
          z-index: 10;
        }
        .sidebar-tab {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          transition: all var(--transition-fast);
          text-align: left;
        }
        .sidebar-tab:hover {
          background: rgba(0,0,0,0.03);
          color: var(--text-primary);
        }
        .sidebar-tab.active {
          background: var(--bg-surface);
          color: var(--brand-red);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
};

// Quick helper to animate tabs transitioning
const AnimateTab: React.FC<{ tab: TabView, target: TabView, children: React.ReactNode }> = ({ tab, target, children }) => {
  if (tab !== target) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
};

export default AssignmentDetails;
