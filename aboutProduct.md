Code-Checker: Academic Integrity Code Submission Checker

Product Purpose
Code-Checker helps instructors detect potential code similarity and collusion in programming assignments. Students submit source code using an assignment access key, and instructors review similarity results in a dashboard with side-by-side code comparisons.

Core User Roles
Student: submits assignment files with an access key and identity details.
Instructor: creates assignments, monitors submissions, runs analysis, and reviews flagged comparisons.

Current Architecture
Frontend: React + TypeScript + Vite, served via Nginx container.
Backend: FastAPI (async) with modular routers, repositories, services, and schemas.
Database: PostgreSQL for instructors, courses, assignments, submissions, files, and comparison results.
Object Storage: MinIO for sanitized uploaded code artifacts.
Deployment: Docker Compose for local full-stack orchestration.

Main Flows Implemented
Instructor authentication and dashboard access.
Instructor assignment creation with generated access keys.
Student submission flow with file upload and basic sanitization.
Storage of submission metadata and processed file artifacts.
Similarity analysis trigger and comparison record creation.
Instructor comparison viewer with highlighted matching blocks.
Technical Design Highlights
Layered backend structure (API endpoints to repositories/services to models).
SQLAlchemy async sessions and repository pattern for DB access.
Identity encryption for submitted student identifiers.
Basic source preprocessing and fingerprint/scoring analysis pipeline.
UI pages for student portal, instructor login, dashboard, assignment details, and comparison view.

Current Strengths
End-to-end product skeleton is functional across frontend, backend, DB, and storage.
Good domain model coverage for academic workflow entities.
Clear route structure and role-separated UX paths.
Dockerized setup enables easier onboarding for team development.
Current Gaps Before Final Product Readiness
Environment hardening: secrets and configuration defaults need production-safe handling.
Reliability: submission/storage transaction safety must prevent partial writes or data loss.
Identity integrity: matching logic should avoid edge-case mismatch under concurrency.
Trust calibration: similarity thresholds and review policy need validation to reduce false assumptions.
Observability: structured logging, error correlation, and stronger health checks are needed.
Security controls: CORS restrictions, rate limits, and clearer compliance posture for real student data.
Testing maturity: automated integration and regression tests need to become release gates.

Product Readiness Snapshot
Prototype readiness: strong.
Final production readiness: moderate-to-low without hardening.
Fastest path: focus first on reliability, identity integrity, and analysis trustworthiness before UX polish.
In-Scope Product Goal (Current Phase)

Deliver a dependable internal academic-integrity platform where:
submissions are not lost,
student identities are handled consistently,
similarity outcomes are reviewable and not treated as automatic guilt.
Recommended Near-Term Milestones
Stabilize startup/init and environment configuration.
Harden submission and identity logic with deterministic safeguards.
Validate similarity scoring behavior against known sample datasets.
Add CI-backed integration tests for critical user journeys.
Finalize operational runbook for pilot/term launch.

Notes
This product supports instructor decision-making and should be treated as an evidence-assistance tool, not an automatic disciplinary engine.

If you want, I can also produce a shorter one-page executive version and a separate technical version for developers.