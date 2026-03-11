# Academic Integrity Code Submission Checker (Code-Checker)

**Course:** COSC 4P02  Group 8

**Project:** Code Submission Similarity Checker for Academic Integrity

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started (Docker)](#getting-started-docker)
- [Service URLs](#service-urls)
- [Project Structure](#project-structure)
- [How to Use GitHub for This Project](#how-to-use-github-for-this-project)
- [Contributing](#contributing)
- [Contact](#contact)

---

## Project Overview

This project is designed to help instructors in COSC 4P02 check students’ code submissions for academic integrity.
The system will support uploads (C, C++, Java), store submissions across semesters, anonymize students for privacy, and generate similarity reports instructors can review in a web interface.

This repository is scaffolded as a Dockerized full-stack monorepo:

- Frontend web UI
- Backend API
- PostgreSQL database
- MinIO object storage (S3-compatible) for uploaded files/blobs

---

## Features

**Implemented (current scaffold / plumbing)**

- Docker Compose stack that starts the system with one command
- Frontend page that calls the backend and displays a status message
- Backend endpoints: `/` and `/health` + Swagger/OpenAPI docs
- Persistent local volumes for Postgres and MinIO

**Planned (core project functionality)**

- Submission upload + storage
- Organization by course/assignment/semester
- Similarity analysis engine (no AI)
- Anonymization + instructor dashboard and side-by-side comparisons

---

## Technologies Used

- **Frontend:** React + TypeScript + Vite (built and served by Nginx in Docker)
- **Backend:** Python FastAPI (Uvicorn)
- **Database:** PostgreSQL 16
- **Object Storage:** MinIO (S3-compatible)
- **Orchestration:** Docker + Docker Compose
- **Version Control:** Git + GitHub

---

## Getting Started (Docker)

### Prerequisites

- Install Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Install Git (optional if you already have the repo locally)

### Clone the Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### Start the Full Stack

From the repository root:

```bash
docker-compose up --build
```

If your Docker supports the newer syntax, this also works:

```bash
docker compose up --build
```

To stop containers:

```bash
docker-compose down
```

To stop and wipe local data volumes (Postgres/MinIO):

```bash
docker-compose down -v
```

---

## Service URLs

Once Docker Compose is running:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Backend Swagger Docs:** http://localhost:8000/docs
- **Backend Health Check:** http://localhost:8000/health
- **MinIO API (S3 endpoint):** http://localhost:9000
- **MinIO Console:** http://localhost:9001
  - Default credentials (dev):
    - Username: `minioadmin`
    - Password: `minioadmin`

### Note on CORS

The backend is currently configured with permissive CORS for development so the frontend (port 3000) can call the backend (port 8000). Tighten this before production.

---

## Project Structure

High-level layout:

- `backend/` — FastAPI service
- `frontend/` — React/Vite app + Nginx config
- `docker-compose.yml` — Orchestrates frontend + backend + Postgres + MinIO
- `draw.io/` — Diagrams (store `.drawio` files here)
  - Example: `draw.io/Instructor_sequence.drawio`
- `documentation/` — Documentation (requirements, architecture notes, meetings, reports)

---

## How to Use GitHub for This Project

Recommended team workflow:

1. Create a branch per feature/task:
   ```bash
   git checkout -b feature/<short-name>
   ```
2. Commit small, meaningful changes.
3. Open a Pull Request (PR) into `main`.
4. Use PR reviews to catch issues early and avoid conflicts.
5. Keep diagrams in `draw.io/` and written docs in `documentation/`.

---

## Contributing

- Keep PRs focused (one feature/fix per PR)
- Update docs when setup/ports/env vars change
- If you change Docker ports or service names, update `docker-compose.yml` and this README

---

