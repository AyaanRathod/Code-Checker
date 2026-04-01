import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowRight, Eye, EyeOff, CheckCircle, BarChart2, Shield, BookOpen } from 'lucide-react';
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
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <div
      className="main-content"
      style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '1.5rem' }}
    >
      <motion.div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '900px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          minHeight: '560px',
        }}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        {/* ── Left panel ── */}
        <div
          style={{
            width: '38%',
            background: 'linear-gradient(160deg, #7f1d1d 0%, #991b1b 45%, #b91c1c 100%)',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
        >
          {/* Shield logo */}
          <div style={{ marginBottom: '1.75rem' }}>
            <svg width="52" height="60" viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M26 2L4 12V28C4 40.5 13.5 52 26 56C38.5 52 48 40.5 48 28V12L26 2Z"
                fill="rgba(255,255,255,0.15)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
              <path
                d="M26 10L10 18V28C10 37 17 45 26 48C35 45 42 37 42 28V18L26 10Z"
                fill="rgba(255,255,255,0.1)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
              <text x="26" y="33" textAnchor="middle" fill="white" fontSize="14" fontWeight="800" fontFamily="sans-serif">
                BU
              </text>
            </svg>
          </div>

          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.4rem' }}>
            BROCK UNIVERSITY
          </div>

          <h2
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: '0.6rem',
              letterSpacing: '-0.3px',
            }}
          >
            Join the Academic
            <br />
            Integrity Portal
          </h2>

          <p style={{ fontSize: '0.83rem', opacity: 0.75, lineHeight: 1.55, marginBottom: '2rem' }}>
            Empower your courses with real-time submission monitoring and AI-powered analysis.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { Icon: BarChart2, text: 'Real-time submission monitoring' },
              { Icon: Shield, text: 'AI-powered similarity detection' },
              { Icon: BookOpen, text: 'Manage multiple courses effortlessly' },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.83rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </div>
                <span style={{ opacity: 0.85 }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.75rem', opacity: 0.5 }}>
            Already have an account?{' '}
            <Link to="/instructor/login" style={{ color: 'white', fontWeight: 700 }}>
              Sign In
            </Link>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, padding: '2rem 2.25rem', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create Your Account</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Fill in your details to get started.
          </p>

          {error && (
            <div
              style={{
                padding: '0.7rem 0.85rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                color: '#dc2626',
                marginBottom: '1.1rem',
                fontSize: '0.84rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Row 1: First + Last name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  style={inputStyle}
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={set('first_name')}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  style={inputStyle}
                  placeholder="Smith"
                  value={form.last_name}
                  onChange={set('last_name')}
                  required
                />
              </div>
            </div>

            {/* Row 2: Title + Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <select style={inputStyle} value={form.title} onChange={set('title')}>
                  <option value="">Select...</option>
                  {TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <select style={inputStyle} value={form.department} onChange={set('department')}>
                  <option value="">Select...</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '0.85rem' }}>
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
              <label style={labelStyle}>Password * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>(min 8 characters)</span></label>
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
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '0.2rem' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: '3px',
                          borderRadius: '2px',
                          background: i <= strength.score ? strength.color : 'var(--border-strong)',
                          transition: 'background 0.2s',
                        }}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 600 }}>
                      {strength.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{
                    ...inputStyle,
                    paddingRight: '2.5rem',
                    borderColor: passwordMismatch ? '#ef4444' : passwordMatch ? '#22c55e' : 'var(--border-strong)',
                  }}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set('confirm')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {passwordMatch && (
                  <CheckCircle
                    size={15}
                    color="#22c55e"
                    style={{ position: 'absolute', right: '2.2rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                )}
              </div>
              {passwordMismatch && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                  Passwords do not match.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
              }}
              disabled={loading || passwordMismatch}
            >
              {loading ? 'Creating account...' : 'Create Account'}
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
                  margin: '1.25rem 0',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.8rem',
                }}
              >
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
                />
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/instructor/login" style={{ color: 'var(--brand-red)', fontWeight: 600 }}>
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default InstructorRegister;
