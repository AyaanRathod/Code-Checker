import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowRight, Eye, EyeOff, CheckCircle, UserPlus } from 'lucide-react';
import { registerApi, googleAuthApi } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';

const TITLES = ['Prof.', 'Dr.', 'Lecturer', 'TA', 'Other'];

const DEPARTMENTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Engineering',
  'Biological Sciences',
  'Chemistry',
  'Business',
  'Other',
];

const getStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const levels = [
    { label: '', color: 'transparent' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f97316' },
    { label: 'Good', color: '#eab308' },
    { label: 'Strong', color: '#22c55e' },
    { label: 'Very strong', color: '#16a34a' },
  ];
  return { score, ...levels[score] };
};

const InstructorRegister: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    title: '',
    department: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = getStrength(form.password);
  const passwordMatch = form.confirm.length > 0 && form.password === form.confirm;
  const passwordMismatch = form.confirm.length > 0 && form.password !== form.confirm;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await registerApi({
        first_name: form.first_name,
        last_name: form.last_name,
        title: form.title || undefined,
        department: form.department || undefined,
        email: form.email,
        password: form.password,
      });
      login(data.access_token, data.user);
      navigate('/instructor/dashboard');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(msg ?? 'Registration failed. Please try again.');
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
      setError('Google sign-up failed. Please try again.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <div
      className="main-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 0.85rem',
      }}
    >
      <motion.div
        className="glass-card"
        style={{ width: '100%', maxWidth: '440px', padding: '1.75rem 1.5rem', background: 'var(--bg-surface)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
            <UserPlus size={22} color="var(--brand-red)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Register to access the faculty portal.
          </p>
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
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* First + Last name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} placeholder="Jane" value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} placeholder="Smith" value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>

          {/* Title + Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Title</label>
              <select style={inputStyle} value={form.title} onChange={set('title')}>
                <option value="">None</option>
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select style={inputStyle} value={form.department} onChange={set('department')}>
                <option value="">None</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Email Address *</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Password * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>(min 8 chars)</span></label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: '2.5rem' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password.length > 0 && (
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '0.2rem' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength.score ? strength.color : 'var(--border-strong)', transition: 'background 0.2s' }} />
                  ))}
                </div>
                {strength.label && <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: '2.5rem', borderColor: passwordMismatch ? '#ef4444' : passwordMatch ? '#22c55e' : 'var(--border-strong)' }}
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {passwordMatch && (
                <CheckCircle size={15} color="#22c55e" style={{ position: 'absolute', right: '2.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              )}
            </div>
            {passwordMismatch && (
              <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={loading || passwordMismatch}
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {googleClientId && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              or sign up with
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-up failed. Please try again.')}
                text="signup_with"
                shape="rectangular"
                width="368"
              />
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/instructor/login" style={{ color: 'var(--brand-red)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default InstructorRegister;
