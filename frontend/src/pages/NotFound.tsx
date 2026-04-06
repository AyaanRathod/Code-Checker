import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      <FileQuestion size={48} style={{ opacity: 0.3, marginBottom: '1.25rem', color: 'var(--text-primary)' }} />
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-1px' }}>
        404
      </h1>
      <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.4rem 0 0.65rem' }}>
        Page not found
      </p>
      <p style={{ fontSize: '0.88rem', maxWidth: '340px', lineHeight: 1.65, marginBottom: '2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-outline" style={{ background: 'var(--bg-surface)' }}>
        Back to home
      </Link>
    </div>
  );
};

export default NotFound;
