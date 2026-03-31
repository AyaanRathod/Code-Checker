import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

import StudentPortal from './pages/StudentPortal';
import InstructorLogin from './pages/InstructorLogin';
import InstructorRegister from './pages/InstructorRegister';
import InstructorProfile from './pages/InstructorProfile';
import Dashboard from './pages/Dashboard.tsx';
import AssignmentDetails from './pages/AssignmentDetails';
import ComparisonView from './pages/ComparisonView';
import Repositories from './pages/Repositories';

import { ToastProvider } from './components/ui/Toast';
import { useAuth } from './contexts/AuthContext';
import { getInitials, getAvatarColor, formatDisplayName } from './types/auth';
import './index.css';

const GlobalHeader = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isFacultyRoute = location.pathname.startsWith('/instructor');

  if (
    location.pathname.includes('/assignment/') ||
    location.pathname.includes('/compare/') ||
    location.pathname.includes('/repositories')
  ) {
    return null;
  }

  return (
    <div
      style={{
        background: '#991b1b',
        color: 'white',
        padding: '0.65rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.6rem',
        flexShrink: 0,
      }}
    >
      <Link
        to="/"
        style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'white' }}
      >
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '0.1rem',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          BROCK{' '}
          <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: '6px' }}>UNIVERSITY</span>
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.4px' }}>
          Academic Integrity Portal
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
        {isFacultyRoute && isAuthenticated && user && (
          <Link
            to="/instructor/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'rgba(255,255,255,0.92)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: getAvatarColor(user.email),
                border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {getInitials(user)}
            </div>
            <span>
              Hello,{' '}
              <span style={{ fontWeight: 700 }}>{formatDisplayName(user)}</span>
            </span>
          </Link>
        )}

        <Link
          to={isFacultyRoute ? '/' : '/instructor/login'}
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.9rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s',
            textDecoration: 'none',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {isFacultyRoute ? 'Submission Page' : 'Faculty Access'}
        </Link>
      </div>
    </div>
  );
};

const AppContent = () => {
  return (
    <div className="app-container">
      <GlobalHeader />

      <Routes>
        <Route path="/" element={<StudentPortal />} />

        <Route path="/instructor/login" element={<InstructorLogin />} />
        <Route path="/instructor/register" element={<InstructorRegister />} />
        <Route path="/instructor/profile" element={<InstructorProfile />} />
        <Route path="/instructor/dashboard" element={<Dashboard />} />
        <Route path="/instructor/assignment/:id" element={<AssignmentDetails />} />
        <Route path="/instructor/compare/:comparison_id" element={<ComparisonView />} />
        <Route path="/instructor/repositories" element={<Repositories />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '0.65rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem 1rem',
          color: 'var(--text-tertiary)',
          fontSize: '0.75rem',
          marginTop: 'auto',
        }}
      >
        <span>&copy; {new Date().getFullYear()} Brock University. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="#" style={{ color: 'var(--text-tertiary)' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'var(--text-tertiary)' }}>Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}

export default App;
