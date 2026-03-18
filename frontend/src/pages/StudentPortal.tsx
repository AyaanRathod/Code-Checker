import React, { useState } from 'react';
import { UploadCloud, CheckCircle, FileCode2, Key, User, Badge, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const StudentPortal: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

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
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Submission Received</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Your file was securely processed and encrypted.
            </p>
            
            <div style={{ background: 'var(--bg-base)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Receipt ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{successData.submission_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(successData.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Attempt:</span>
                 <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{successData.attempt} / 3</span>
              </div>
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setSuccessData(null); setFile(null); }}>
              Submit Another File
            </button>
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
                style={{ 
                  border: '2px dashed var(--border-strong)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '1rem', 
                  textAlign: 'center',
                  background: 'var(--bg-surface)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background var(--transition-fast)'
                }}
                className="file-drop-area"
              >
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  required
                  accept=".zip,.c,.cpp,.java"
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} 
                />
                
                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCode2 size={40} color="var(--brand-red)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{file.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(1)} KB</span>
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
