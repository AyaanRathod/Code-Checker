import { useEffect, useState } from 'react';

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

export default App;
