import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

import StudentPortal from './pages/StudentPortal';
import InstructorLogin from './pages/InstructorLogin';
import Dashboard from './pages/Dashboard.tsx';
import AssignmentDetails from './pages/AssignmentDetails';
import ComparisonView from './pages/ComparisonView';
import Repositories from './pages/Repositories';

import './index.css';

const GlobalHeader = () => {
  const location = useLocation();
  const isFacultyRoute = location.pathname.startsWith('/instructor');
  // Hide header on detail pages since they have their own navigation
  if (location.pathname.includes('/assignment/') || location.pathname.includes('/compare/') || location.pathname.includes('/repositories')) {
    return null;
  }
  
  return (
    <div className="global-header" style={{ background: '#991b1b', color: 'white', padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', flexShrink: 0 }}>
      <Link to="/" className="global-header-brand" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'white' }}>
        <div className="global-header-topline" style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.1rem', display: 'flex', alignItems: 'baseline' }}>
          BROCK <span className="global-header-topline-sub" style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: '6px' }}>UNIVERSITY</span>
        </div>
        <div className="global-header-title" style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.4px' }}>
          Academic Integrity Portal
        </div>
      </Link>
      
      <div className="global-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
        <Link to={isFacultyRoute ? "/" : "/instructor/dashboard"} className="global-header-switch" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600, padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s', textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
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

      {/* Dynamic Routes Content */}
      <Routes>
        {/* Public Route for Students */}
        <Route path="/" element={<StudentPortal />} />
        
        {/* Instructor Routes */}
        <Route path="/instructor/login" element={<InstructorLogin />} />
        <Route path="/instructor/dashboard" element={<Dashboard />} />
        <Route path="/instructor/assignment/:id" element={<AssignmentDetails />} />
        <Route path="/instructor/compare/:comparison_id" element={<ComparisonView />} />
        <Route path="/instructor/repositories" element={<Repositories />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Standardized Branding Footer */}
      <div className="global-footer" style={{ background: 'var(--bg-surface)', padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 'auto' }}>
         <span>&copy; {new Date().getFullYear()} Brock University. All rights reserved.</span>
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
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

