import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Laptop } from 'lucide-react';

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
      className="global-header"
      style={{
        background: 'hsl(3, 61%, 34%)',
        color: 'white',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        flexShrink: 0,
        boxShadow: '0 8px 18px rgba(127, 29, 29, 0.22)',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
      }}
    >
      <Link
        to="/"
        className="global-header-brand"
        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', color: 'white' }}
      >
        <div
          className="global-logo-badge"
          aria-hidden="true"
        >
          <span className="global-logo-glyph">
            <Laptop size={18} strokeWidth={2.4} color="rgba(255,255,255,0.96)" />
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          className="global-header-topline"
          style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            letterSpacing: '0.9px',
            textTransform: 'uppercase',
            marginBottom: '0.1rem',
          }}
        >
          CodeSimilar
        </div>
        <div className="global-header-title" style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.4px' }}>
          Academic Integrity Platform
        </div>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
        <Link
          to={isFacultyRoute ? '/' : (isAuthenticated ? '/instructor/dashboard' : '/instructor/login')}
          className="global-header-switch"
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
          {isFacultyRoute ? 'Submission Page' : 'Instructor Access'}
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
        className="global-footer"
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
        <span>&copy; {new Date().getFullYear()} CodeSimilar. All rights reserved.</span>
        <div className="global-footer-links" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
