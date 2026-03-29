import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Mail, Key } from 'lucide-react';

const InstructorLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await axios.post('http://localhost:8000/api/v1/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.data?.access_token) {
        throw new Error('Invalid login response from server.');
      }

      localStorage.setItem('token', response.data.access_token);
      navigate('/instructor/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 0.85rem' }}>
      
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '400px', padding: '1.45rem 1rem', background: 'var(--bg-surface)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', background: 'var(--bg-surface-highest)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid var(--border-subtle)'}}>
            <Lock size={24} color="var(--brand-red)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Faculty Login</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Authenticate to view analysis reports.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Instructor Email</label>
            <div className="input-with-icon">
                <Mail />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="faculty@brocku.ca" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required 
                />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Password</span>
            </label>
            <div className="input-with-icon">
                <Key />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', marginBottom: '1.25rem', fontSize: '0.85rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default InstructorLogin;
