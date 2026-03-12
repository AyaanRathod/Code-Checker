from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict

# Import our custom analysis modules
# These modules handle the core logic of plagiarism detection:
# 1. tokenizer: Cleans and breaks down code into tokens.
# 2. fingerprint: Converts tokens into unique hashes (Winnowing).
# 3. scorer: Compares hashes to find similarity.
import tokenizer
import fingerprint
import scorer
import test_engine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello World from FastAPI Backend!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/v1/test-report")
def run_test_report():
    """
    Triggers the automated test suite and returns the validation report.
    """
    try:
        report = test_engine.run_tests()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test suite failed: {str(e)}")

# --- Pydantic Models ---
# These classes define the "shape" of data we expect to receive and return.
# They automatically validate data types (e.g., ensuring 'similarity_score' is a float).

class ComparisonRequest(BaseModel):
    """
    Schema for the Code Comparison Request.
    
    Attributes:
        source_code (str): The code from Student A (or the suspicious file).
        target_code (str): The code from Student B (or the potential source).
        language (str): The programming language (e.g., 'python', 'cpp', 'java').
        boilerplate_code (Optional[str]): Common starter code provided by the instructor.
                                          If provided, this will be excluded from analysis.
    """
    source_code: str
    target_code: str
    language: str
    boilerplate_code: Optional[str] = None

class ComparisonResponse(BaseModel):
    """
    Schema for the Analysis Result.
    
    Attributes:
        similarity_score (float): A percentage (0.0 to 100.0) indicating how much
                                  of the source code is contained within the target code.
        normalized_source (str): Diagnostic: The code from Student A after tokenization and normalization.
        normalized_target (str): Diagnostic: The code from Student B after tokenization and normalization.
        source_match_ranges (List[Dict]): List of {start: int, end: int} for highlighting Student A.
        target_match_ranges (List[Dict]): List of {start: int, end: int} for highlighting Student B.
    """
    similarity_score: float
    normalized_source: str
    normalized_target: str
    source_match_ranges: List[Dict[str, int]]
    target_match_ranges: List[Dict[str, int]]

# --- API Endpoints ---

@app.post("/api/v1/analyze", response_model=ComparisonResponse)
def analyze_code(request: ComparisonRequest):
    """
    Triggers the full Similarity Analysis Pipeline.

    Process:
    1.  **Tokenization**: Clean and normalize raw source code.
    2.  **Fingerprinting**: Generate unique hashes using Winnowing.
    3.  **Boilerplate Removal**: Subtract common code hashes (if provided).
    4.  **Scoring**: Calculate the Containment metric.

    Returns:
        ComparisonResponse: The calculated similarity score.
    """
    try:
        # Step 1: Tokenization
        # We convert the raw string of code into a list of normalized tokens.
        # This removes comments, whitespace, and renames variables to generic IDs.
        source_tokens = tokenizer.normalize_source_code(request.source_code, request.language)
        target_tokens = tokenizer.normalize_source_code(request.target_code, request.language)

        # Step 2: Fingerprinting
        # We convert the list of tokens into a set of integer hashes.
        # This represents the "DNA" of the document.
        source_fingerprint = fingerprint.generate_fingerprint(source_tokens)
        target_fingerprint = fingerprint.generate_fingerprint(target_tokens)

        # Step 3: Boilerplate Exclusion (Optional)
        # If the instructor provided starter code, we process it and remove its
        # fingerprints from the student submissions to avoid false positives.
        if request.boilerplate_code:
            boilerplate_tokens = tokenizer.normalize_source_code(request.boilerplate_code, request.language)
            boilerplate_fingerprint = fingerprint.generate_fingerprint(boilerplate_tokens)
            # Convert boilerplate list-of-dicts to a simple set of hashes for fast lookup
            boilerplate_hashes = {fp['hash'] for fp in boilerplate_fingerprint}
            
            # Subtract boilerplate hashes from student hashes
            source_fingerprint = scorer.remove_boilerplate(source_fingerprint, boilerplate_hashes)
            target_fingerprint = scorer.remove_boilerplate(target_fingerprint, boilerplate_hashes)

        # Step 4: Similarity Calculation
        # We compare the two sets of hashes using the Containment metric.
        # Now expecting score + ranges back from the scorer.
        score, ranges_a, ranges_b = scorer.calculate_similarity(source_fingerprint, target_fingerprint)

        # Step 5: Package Diagnostic Data
        # We pack the internal engine data into the response payload for the frontend UI.
        # We join the normalized tokens with spaces so the UI can easily display the normalized code.
        return ComparisonResponse(
            similarity_score=score,
            normalized_source=" ".join([t['token'] for t in source_tokens]),
            normalized_target=" ".join([t['token'] for t in target_tokens]),
            source_match_ranges=ranges_a,
            target_match_ranges=ranges_b
        )

    except Exception as e:
        # Log the error (in a real app) and return a 500 Internal Server Error
        # This prevents the server from crashing if bad input is received.
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
