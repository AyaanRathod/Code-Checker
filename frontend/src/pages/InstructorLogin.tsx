import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, ArrowRight, Mail, Key, Eye, EyeOff } from 'lucide-react';
import { loginApi, googleAuthApi } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';

const InstructorLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isMobileLayout = viewportWidth < 640;
  const googleButtonWidth = Math.max(220, Math.min(368, viewportWidth - (isMobileLayout ? 86 : 120)));

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginApi(email, password);
      login(data.access_token, data.user);
      navigate('/instructor/dashboard');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(msg ?? 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError('');
    try {
      const data = await googleAuthApi(credentialResponse.credential);
      login(data.access_token, data.user);
      navigate('/instructor/dashboard');
    } catch {
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div
      className="main-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobileLayout ? 'flex-start' : 'center',
        padding: isMobileLayout ? '0.85rem 0.6rem 1rem' : '1.25rem 0.85rem',
      }}
    >
      <motion.div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: isMobileLayout ? '100%' : '400px',
          padding: isMobileLayout ? '1.2rem 1rem' : '1.45rem 1.5rem',
          background: 'var(--bg-surface)',
        }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ textAlign: 'center', marginBottom: isMobileLayout ? '1rem' : '1.25rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              background: 'var(--bg-surface-highest)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Lock size={24} color="var(--brand-red)" />
          </div>
          <h2 style={{ fontSize: isMobileLayout ? '1.35rem' : '1.5rem', marginBottom: '0.25rem' }}>Instructor Login</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobileLayout ? '0.82rem' : '0.85rem' }}>
            Authenticate to view analysis reports.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="instructor-email" className="form-label">Instructor Email</label>
            <div className="input-with-icon">
              <Mail />
              <input
                id="instructor-email"
                type="email"
                className="form-input"
                placeholder="faculty@brocku.ca"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: isMobileLayout ? '1.25rem' : '1.5rem' }}>
            <label htmlFor="instructor-password" className="form-label">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Key />
              <input
                id="instructor-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="current-password"
                disabled={loading}
                style={{ paddingRight: '2.75rem' }}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: 0,
                  display: 'flex',
                }}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                color: '#dc2626',
                marginBottom: '1rem',
                fontSize: isMobileLayout ? '0.8rem' : '0.85rem',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {googleClientId && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: isMobileLayout ? '1rem 0' : '1.25rem 0',
                color: 'var(--text-tertiary)',
                fontSize: isMobileLayout ? '0.76rem' : '0.8rem',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              or continue with
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                text="signin_with"
                shape="rectangular"
                width={`${googleButtonWidth}`}
              />
            </div>
          </>
        )}

        <p
          style={{
            textAlign: 'center',
            marginTop: isMobileLayout ? '1rem' : '1.25rem',
            fontSize: isMobileLayout ? '0.82rem' : '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link to="/instructor/register" style={{ color: 'var(--brand-red)', fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default InstructorLogin;
