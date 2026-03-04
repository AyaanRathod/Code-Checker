# Code-Checker Backend Documentation

## Overview

The Code-Checker backend is a Python-based service that analyzes and evaluates code quality through multiple scoring mechanisms. Built with FastAPI, it provides endpoints for code fingerprinting, tokenization, and comprehensive code assessment.

## Architecture

### Core Components

#### 1. **Main Application** (`main.py`)
The FastAPI application that serves as the entry point for the backend service.
- Initializes the web server and routing
- Manages HTTP endpoints for code analysis
- Handles request/response processing

#### 2. **Code Fingerprinting** (`fingerprint.py`)
Generates unique fingerprints for code snippets to identify similarities and detect plagiarism.
- Creates hash-based identifiers for code blocks
- Compares code fingerprints for pattern matching
- Enables efficient duplicate detection

#### 3. **Code Tokenization** (`tokenizer.py`)
Breaks down source code into meaningful tokens for analysis.
- Parses code into lexical tokens
- Normalizes code structure
- Prepares code for scoring algorithms

#### 4. **Scoring Engine** (`scorer.py`)
Evaluates code quality based on multiple metrics.
- Analyzes code complexity
- Assesses readability and style adherence
- Generates quality scores and recommendations

#### 5. **Test Engine** (`test_engine.py`)
Validates code functionality and correctness.
- Executes unit tests against submitted code
- Tracks test coverage
- Reports test results and failures

### Services Layer (`services/`)
Modular service components that encapsulate business logic and can be extended independently.

## Dependencies

All Python dependencies are specified in `requirements.txt`. Key libraries include:
- **FastAPI** - Modern web framework for building APIs
- **Pydantic** - Data validation and settings management
- **Additional analysis tools** - Code parsing, testing, and quality assessment libraries

## Deployment

### Docker Support
A `Dockerfile` is included for containerized deployment:
- Ensures consistent runtime environment across systems
- Simplifies deployment and scaling
- Isolates dependencies from host system

**To build and run:**
```bash
docker build -t code-checker-backend .
docker run -p 8000:8000 code-checker-backend
```

## Features

✅ **Code Analysis** - Multi-dimensional code quality evaluation  
✅ **Plagiarism Detection** - Fingerprint-based similarity matching  
✅ **Automated Testing** - Unit test execution and validation  
✅ **Code Tokenization** - Structural code parsing and analysis  
✅ **Scalable Architecture** - Modular design for easy extensions  

## Development

### Project Structure
```
backend/
├── main.py              # Application entry point
├── fingerprint.py       # Plagiarism detection
├── tokenizer.py         # Code tokenization
├── scorer.py            # Quality scoring
├── test_engine.py       # Testing framework
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
└── services/           # Modular services
```

### Running Locally

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the application:**
   ```bash
   python main.py
   ```

3. **Access API documentation:**
   Open `http://localhost:8000/docs` in your browser for interactive Swagger UI

## API Endpoints

*(Add specific endpoints once code is reviewed)*

The backend exposes REST endpoints for:
- Code submission and analysis
- Test execution
- Score retrieval
- Plagiarism checking

---

**Last Updated:** March 4, 2026  
**Status:** Testing Ready
