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
  // --- React State Hooks ---
  // useState allows us to store data that changes over time. When state changes, the UI re-renders.

  // 1. Input States: Store the text users type into the text areas.
  const [sourceCode, setSourceCode] = useState<string>('');
  const [targetCode, setTargetCode] = useState<string>('');
  const [boilerplateCode, setBoilerplateCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python'); // Defaulting to Python

  // 2. UI Status States: Handle loading spinners and error messages.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Result State: Stores the final score returned from the API.
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  
  // 4. Diagnostic State: Stores engine variables (tokens, hashes) to prove logic on the UI.
  const [diagnostics, setDiagnostics] = useState<AnalysisResponse | null>(null);

  // 5. QA Testing States
  const [isTestRunLoading, setIsTestRunLoading] = useState<boolean>(false);
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [showTestReport, setShowTestReport] = useState<boolean>(false);

  // --- API Handler ---
  // This async function is triggered when the "Run Similarity Analysis" button is clicked.
  const handleAnalyze = async () => {
    // Reset previous errors and results
    setError(null);
    setSimilarityScore(null);
    setDiagnostics(null); // Clear previous diagnostics
    
    // Validate inputs locally before sending
    if (!sourceCode.trim() || !targetCode.trim()) {
      setError("Please provide both Source Code and Target Code.");
      return;
    }

    // Start loading state (show spinner/text)
    setIsLoading(true);

    try {
      // Prepare the payload matching the backend's 'ComparisonRequest'
      const payload: AnalysisRequest = {
        source_code: sourceCode,
        target_code: targetCode,
        language: language,
        boilerplate_code: boilerplateCode.trim() === "" ? undefined : boilerplateCode
      };

      // Perform the HTTP POST request to your FastAPI backend
      // Note: We use http://localhost:8000 as specified in your setup
      const response = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Parse the JSON response
      const data: AnalysisResponse = await response.json();
      
      // Update state with the result, triggering a re-render to show the score
      setSimilarityScore(data.similarity_score);
      // Store the full response payload into the diagnostics state for the UI panel
      setDiagnostics(data);
      
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to connect to the analysis engine.");
    } finally {
      // Always turn off loading, whether successful or failed
      setIsLoading(false);
    }
  };

  // --- QA Test Suite Handler ---
  const handleRunTestTask = async () => {
    setIsTestRunLoading(true);
    setTestReport(null);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/test-report');
      if (!response.ok) {
        throw new Error(`Test suite failed: ${response.statusText}`);
      }
      const data: TestReport = await response.json();
      setTestReport(data);
      setShowTestReport(true);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve test report.");
    } finally {
      setIsTestRunLoading(false);
    }
  };

  const handleDownloadTestReport = () => {
    if (!testReport) return;
    let content = `Code-Checker Automated Test Report\nStatus: ${testReport.status.toUpperCase()} (${testReport.passed_count}/${testReport.total_count} passed)\n\n`;
    testReport.results.forEach(r => {
      content += `Test: ${r.name}\nDescription: ${r.description}\nResult: ${r.passed ? 'PASSED' : 'FAILED'}\nExpected Score: ${r.expected}\nActual Score: ${r.score.toFixed(2)}%\n\n`;
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test_report.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Helper: Highlight Code ---
  // This function takes raw code and a list of index ranges.
  // It returns an HTML string with <mark> tags wrapping the copied sections.
  const highlightCode = (text: string, ranges: { start: number; end: number }[]) => {
    if (!ranges || ranges.length === 0) return text;

    // 1. Sort ranges by start index
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

    // 2. Merge overlapping ranges
    // Winnowing produces many overlapping k-grams. We must merge them
    // to avoid messy HTML like <mark>...<mark>...</mark>...</mark>
    const mergedRanges: { start: number; end: number }[] = [];
    let current = sortedRanges[0];

    for (let i = 1; i < sortedRanges.length; i++) {
      const next = sortedRanges[i];
      if (next.start <= current.end) {
        // Overlap detected: extend the current end if needed
        current.end = Math.max(current.end, next.end);
      } else {
        // No overlap: push current and start a new one
        mergedRanges.push(current);
        current = next;
      }
    }
    mergedRanges.push(current);

    // 3. Construct HTML
    let html = "";
    let lastIndex = 0;

    mergedRanges.forEach(range => {
      // Append non-highlighted text before this range
      // We escape HTML characters to prevent XSS (basic replacement)
      const prefix = text.slice(lastIndex, range.start)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html += prefix;

      // Append highlighted text
      const highlight = text.slice(range.start, range.end)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      // Use a yellow background for the highlight
      html += `<mark style="background-color: #ffeb3b; color: black; border-radius: 2px;">${highlight}</mark>`;

      lastIndex = range.end;
    });

    // Append remaining text
    const suffix = text.slice(lastIndex)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html += suffix;

    return html;
  };

  // --- Render ---
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Academic Integrity Code Checker</h1>
        <p style={styles.subtitle}>COSC 4P02 Group 8 - Alpha Demo</p>
      </header>

      <main style={styles.main}>
        {/* --- Input Section --- */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Configuration & Inputs</h2>
          
          {/* Language Selection */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Select Language:</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.select}
            >
              <option value="python">Python 3</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>

          <div style={styles.gridContainer}>
            {/* Student A Input */}
            <div style={styles.gridItem}>
              <label style={styles.label}>Source Code (Student A)</label>
              <textarea
                style={styles.textarea}
                placeholder="Paste code here..."
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
              />
            </div>

            {/* Student B Input */}
            <div style={styles.gridItem}>
              <label style={styles.label}>Target Code (Student B)</label>
              <textarea
                style={styles.textarea}
                placeholder="Paste code here..."
                value={targetCode}
                onChange={(e) => setTargetCode(e.target.value)}
              />
            </div>
          </div>

          {/* Boilerplate Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Boilerplate / Starter Code (Optional)</label>
            <textarea
              style={{...styles.textarea, height: '80px'}}
              placeholder="Paste common starter code here to exclude it from analysis..."
              value={boilerplateCode}
              onChange={(e) => setBoilerplateCode(e.target.value)}
            />
          </div>

          {/* Action Button */}
          <div style={styles.buttonContainer}>
            <button 
              onClick={handleAnalyze} 
              disabled={isLoading}
              style={isLoading ? styles.buttonDisabled : styles.button}
            >
              {isLoading ? 'Analyzing...' : 'Run Similarity Analysis'}
            </button>
          </div>
          
          {/* Error Display */}
          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        {/* --- Results Section (Conditional Rendering) --- */}
        {/* Only show this section if we have a valid similarity score */}
        {similarityScore !== null && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle} id="results">Analysis Results</h2>
            
            <div style={styles.scoreContainer}>
              <span style={styles.scoreLabel}>Similarity Score:</span>
              <span style={getScoreStyle(similarityScore)}>
                {similarityScore.toFixed(2)}%
              </span>
            </div>

            <p style={styles.instruction}>
              Below is a side-by-side view of the submitted code for manual review.
            </p>

            {/* --- Engine Diagnostics Section --- */}
            {/* This renders the backend tokenization and fingerprinting data for the demo */}
            {diagnostics && (
               <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f4f8', borderRadius: '8px', border: '1px solid #c9d6df', marginBottom: '30px' }}>
                 <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>
                   ⚙️ Engine Diagnostics (Under the Hood)
                 </h3>
                 <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '15px', fontStyle: 'italic' }}>
                   These metrics illustrate exactly what the engine extracted to calculate the final similarity score.
                 </p>
                 
                 <div style={styles.gridContainer}>
                   {/* Normalized Code Diagnostic */}
                   <div style={styles.gridItem}>
                     <label style={styles.label}>1. Normalized Code (Student A)</label>
                     <div style={{...styles.codeBlock, height: '150px', backgroundColor: '#e2e8f0', color: '#334155'}}>
                       {diagnostics.normalized_source}
                     </div>
                   </div>
                   
                   <div style={styles.gridItem}>
                     <label style={styles.label}>1. Normalized Code (Student B)</label>
                     <div style={{...styles.codeBlock, height: '150px', backgroundColor: '#e2e8f0', color: '#334155'}}>
                       {diagnostics.normalized_target}
                     </div>
                   </div>
                 </div>

               </div>
            )}

            <div style={styles.gridContainer}>
              {/* Read-Only View Student A */}
              <div style={styles.gridItem}>
                <label style={styles.label}>Student A (Highlighted Matches)</label>
                <div 
                  style={styles.codeBlock}
                  dangerouslySetInnerHTML={{ __html: highlightCode(sourceCode, diagnostics?.source_match_ranges || []) }}
                />
              </div>

               {/* Read-Only View Student B */}
              <div style={styles.gridItem}>
                <label style={styles.label}>Student B (Highlighted Matches)</label>
                <div 
                  style={styles.codeBlock}
                  dangerouslySetInnerHTML={{ __html: highlightCode(targetCode, diagnostics?.target_match_ranges || []) }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
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