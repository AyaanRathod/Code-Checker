import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Lock, User, Calendar, Clock } from 'lucide-react';
import { updateMeApi, changePasswordApi } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import { getInitials, getAvatarColor } from '../types/auth';

const TITLES = ['', 'Prof.', 'Dr.', 'Lecturer', 'TA', 'Other'];

const DEPARTMENTS = [
  '',
  'Computer Science',
  'Mathematics',
  'Physics',
  'Engineering',
  'Biological Sciences',
  'Chemistry',
  'Business',
  'Other',
];

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
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.3rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
};

const InstructorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, updateUser, logout } = useAuth();

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    title: user?.title ?? '',
    department: user?.department ?? '',
    username: user?.username ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  if (!user || !token) {
    navigate('/instructor/login');
    return null;
  }

  const avatarColor = getAvatarColor(user.email);
  const initials = getInitials(user);

  const setProfile = (key: keyof typeof profileForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setProfileForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const updated = await updateMeApi(token, {
        first_name: profileForm.first_name || undefined,
        last_name: profileForm.last_name || undefined,
        title: profileForm.title || undefined,
        department: profileForm.department || undefined,
        username: profileForm.username || undefined,
      });
      updateUser(updated);
      setProfileSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setProfileError(msg ?? 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    setPwSuccess('');
    setPwError('');
    try {
      await changePasswordApi(token, pwForm.current, pwForm.next);
      setPwSuccess('Password changed successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setPwError(msg ?? 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/instructor/login');
  };

  return (
    <div className="main-content" style={{ padding: '1.25rem 1rem 3rem' }}>
      {/* Back nav */}
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/instructor/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 500,
            padding: '0.3rem 0',
            marginBottom: '1.25rem',
          }}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        {/* Profile header card */}
        <motion.div
          className="glass-card"
          style={{ padding: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
              letterSpacing: '-1px',
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.15rem' }}>
              {[user.title, user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', marginBottom: '0.35rem' }}>
              {user.email}
            </p>
            {user.department && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  background: 'var(--bg-surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {user.department}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={12} />
              Member since {formatDate(user.created_at)}
            </div>
            {user.last_login_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={12} />
                Last login {formatDate(user.last_login_at)}
              </div>
            )}
            {user.auth_provider === 'google' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#1e40af',
                  fontWeight: 600,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Signed in with Google
              </div>
            )}
          </div>
        </motion.div>

        {/* Two cards: Personal Info + Security */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          {/* Personal Information */}
          <motion.div
            className="glass-card"
            style={{ padding: '1.5rem' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <User size={16} color="var(--brand-red)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Personal Information</h3>
            </div>

            <form onSubmit={handleProfileSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input style={inputStyle} value={profileForm.first_name} onChange={setProfile('first_name')} placeholder="Jane" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input style={inputStyle} value={profileForm.last_name} onChange={setProfile('last_name')} placeholder="Smith" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <select style={inputStyle} value={profileForm.title} onChange={setProfile('title')}>
                    {TITLES.map((t) => (
                      <option key={t} value={t}>{t || 'None'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select style={inputStyle} value={profileForm.department} onChange={setProfile('department')}>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d || 'None'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.1rem' }}>
                <label style={labelStyle}>Username</label>
                <input style={inputStyle} value={profileForm.username} onChange={setProfile('username')} placeholder="jsmith" />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Email</label>
                <input
                  style={{ ...inputStyle, background: 'var(--bg-surface-raised)', color: 'var(--text-tertiary)', cursor: 'not-allowed' }}
                  value={user.email}
                  disabled
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Email cannot be changed.
                </p>
              </div>

              {profileSuccess && (
                <div style={{ padding: '0.6rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
                  {profileSuccess}
                </div>
              )}
              {profileError && (
                <div style={{ padding: '0.6rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
                  {profileError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
                disabled={profileSaving}
              >
                <Save size={14} />
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>

          {/* Account Security */}
          <motion.div
            className="glass-card"
            style={{ padding: '1.5rem' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Lock size={16} color="var(--brand-red)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Account Security</h3>
            </div>

            {user.auth_provider === 'google' && !user.avatar_url ? (
              /* Google-only account — no password */
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--bg-surface-raised)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google Account
                </div>
                Your password is managed by Google. Sign in is handled securely through Google OAuth.
              </div>
            ) : (
              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>Current Password</label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="••••••••"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>New Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>(min 8 chars)</span></label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="••••••••"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div style={{ marginBottom: '1.1rem' }}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input
                    style={{
                      ...inputStyle,
                      borderColor:
                        pwForm.confirm.length > 0
                          ? pwForm.next === pwForm.confirm ? '#22c55e' : '#ef4444'
                          : 'var(--border-strong)',
                    }}
                    type="password"
                    placeholder="••••••••"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                    required
                  />
                  {pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm && (
                    <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>Passwords do not match.</p>
                  )}
                </div>

                {pwSuccess && (
                  <div style={{ padding: '0.6rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
                    {pwSuccess}
                  </div>
                )}
                {pwError && (
                  <div style={{ padding: '0.6rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
                    {pwError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
                  disabled={pwSaving || (pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm)}
                >
                  <Lock size={14} />
                  {pwSaving ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            )}

            {/* Danger zone */}
            <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.6rem' }}>Session</p>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Sign out of all sessions
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default InstructorProfile;
