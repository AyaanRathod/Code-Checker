import React, { useState } from 'react';

// --- TypeScript Interfaces ---
// These define the shape of the data we send and receive, matching your backend Pydantic models.

// Matches 'ComparisonRequest' in backend/main.py
interface AnalysisRequest {
  source_code: string;
  target_code: string;
  language: string;
  boilerplate_code?: string;
}

// Matches 'ComparisonResponse' in backend/main.py
interface AnalysisResponse {
  similarity_score: number;
  // --- New Diagnostic Fields added for Alpha Presentation ---
  normalized_source: string;
  normalized_target: string;
  source_match_ranges: { start: number; end: number }[];
  target_match_ranges: { start: number; end: number }[];
}

// --- New Interfaces for QA Test Suite ---
interface TestResult {
  name: string;
  description: string;
  score: number;
  expected: string;
  passed: boolean;
  error?: string;
}

interface TestReport {
  status: string;
  passed_count: number;
  total_count: number;
  results: TestResult[];
}

function App() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    // Determine the API URL based on environment. 
    // In dev (docker), it might be localhost:8000 if accessed from browser directly,
    // or through nginx proxy if configured.
    // For now, let's just try to fetch from the known localhost port for demo.
    fetch('http://localhost:8000/')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setMessage('Error connecting to backend: ' + err));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Code-Checker Frontend</h1>
      <p>Backend Status: <strong>{message}</strong></p>
    </div>
  );
}

// --- Styles & Helpers ---
// Basic inline styles for a clean demo look without external CSS files.

const getScoreStyle = (score: number) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  color: score > 70 ? '#d32f2f' : score > 40 ? '#f57c00' : '#388e3c', // Red if high, Orange if med, Green if low
});

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '40px',
  },
  header: {
    backgroundColor: '#1976d2',
    color: 'white',
    width: '100%',
    padding: '20px 0',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: { margin: '0', fontSize: '2rem' },
  subtitle: { margin: '5px 0 0', opacity: 0.9 },
  main: {
    width: '100%',
    maxWidth: '1200px',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    marginTop: 0,
    borderBottom: '2px solid #eee',
    paddingBottom: '10px',
    marginBottom: '20px',
    color: '#333',
  },
  gridContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  gridItem: {
    flex: 1,
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
  },
  inputGroup: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: '600',
    marginBottom: '8px',
    color: '#555',
  },
  select: {
    padding: '10px',
    fontSize: '1rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    maxWidth: '200px',
  },
  textarea: {
    width: '100%',
    height: '200px',
    padding: '10px',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  codeBlock: {
    width: '100%',
    height: '300px', // Taller for review
    padding: '15px',
    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
    fontSize: '0.9rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  },
  button: {
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    fontSize: '1.1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#90caf9',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    fontSize: '1.1rem',
    borderRadius: '4px',
    cursor: 'not-allowed',
  },
  errorBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    textAlign: 'center',
    border: '1px solid #ffcdd2',
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
  },
  scoreLabel: {
    fontSize: '1.2rem',
    color: '#666',
    marginBottom: '5px',
  },
  instruction: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#777',
    marginBottom: '20px',
  },
};

export default App;