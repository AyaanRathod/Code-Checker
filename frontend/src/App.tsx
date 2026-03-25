import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

import StudentPortal from './pages/StudentPortal';
import InstructorLogin from './pages/InstructorLogin';
import Dashboard from './pages/Dashboard';
import AssignmentDetails from './pages/AssignmentDetails';
import ComparisonView from './pages/ComparisonView';

import './index.css';

const GlobalHeader = () => {
  const location = useLocation();
  // Hide header on detail pages since they have their own navigation
  if (location.pathname.includes('/assignment/') || location.pathname.includes('/compare/')) {
    return null;
  }
  
  return (
    <div style={{ background: '#991b1b', color: 'white', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
      <Link to="/" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'white' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.1rem', display: 'flex', alignItems: 'baseline' }}>
          BROCK <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: '6px' }}>UNIVERSITY</span>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Academic Integrity Portal
        </div>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/instructor/dashboard" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600, padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s', textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
          Faculty Access
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
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Standardized Branding Footer */}
      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 2rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 'auto' }}>
         <span>&copy; {new Date().getFullYear()} Brock University. All rights reserved.</span>
         <div style={{ display: 'flex', gap: '2rem' }}>
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