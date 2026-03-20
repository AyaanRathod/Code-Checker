# Changes Log

## 2026-03-19

- Fixed critical ORM metadata split by unifying SQLAlchemy Base usage:
  - backend/app/core/database.py now imports Base from app/models/base.py.
  - Prevents model registration mismatch and missing table creation issues.

- Hardened backend startup lifecycle:
  - backend/main.py now retries DB readiness checks before initializing metadata.
  - Added legacy schema detection for submissions.id integer type and automated one-time legacy table reset to unblock UUID-based schema creation.
  - This reset drops legacy tables: comparisons, access_keys, stored_files, submissions, assignments, courses, instructors.

- Improved health endpoint reliability:
  - backend/app/api/v1/endpoints/health.py now checks API, database (SELECT 1), and MinIO bucket availability.
  - Returns 503 degraded status when dependencies are unavailable.

- Fixed background analysis task session lifecycle:
  - backend/app/api/v1/endpoints/analysis.py now creates its own AsyncSession for background work.
  - Added explicit commit/rollback and logging for task failures.

- Improved submission processing atomicity:
  - backend/app/api/v1/endpoints/student.py now tracks uploaded MinIO objects and performs rollback + object cleanup on failure.
  - Added guard to reject submissions where no decodable/sanitized source files remain.

- Added frontend runtime crash guards:
  - frontend/src/pages/InstructorLogin.tsx validates login response includes access_token before storing token.
  - frontend/src/pages/Dashboard.tsx validates token before API calls, surfaces create-assignment errors in UI, resets form after success.
  - frontend/src/pages/AssignmentDetails.tsx validates token, adds explicit error state, and guards score rendering.
  - frontend/src/pages/ComparisonView.tsx validates token, adds null-safe defaults for payload fields, guards score rendering.
  - frontend/src/pages/StudentPortal.tsx guards success receipt fields against partial API responses.

- Removed obsolete Docker Compose version attribute:
  - docker-compose.yml no longer uses deprecated version key.

- Runtime validation actions executed:
  - Python compile smoke check passed for backend source.
  - Backend services restarted and health endpoint returned:
    - {"status":"ok","message":"Backend is healthy","checks":{"api":"ok","database":"ok","storage":"ok"}}
  - Database reseeded successfully with trial credentials and seed defaults:
    - Instructor Email: faculty@brocku.ca
    - Instructor Password: password123
    - Assignment Access Key: cosc4p02-a1-test

- Notes on defaults currently present in code/config:
  - backend/app/core/config.py default SECRET_KEY is still super_secret_key_change_in_production (dev default).
  - backend/app/core/config.py default MinIO credentials remain minioadmin / minioadmin (dev default).

- UI deadline display improvement:
  - frontend/src/pages/AssignmentDetails.tsx now shows assignment deadline with both date and time in the header summary (instead of date-only).
  - frontend/src/pages/Dashboard.tsx assignment cards now also show deadline with both date and time for consistency.

- AssignmentDetails file problem fix:
  - Installed frontend dependencies via npm install in frontend/ to resolve missing module/type errors affecting frontend/src/pages/AssignmentDetails.tsx (axios, framer-motion, lucide-react).

- Deadline time visibility fix:
  - frontend/src/pages/Dashboard.tsx now formats deadline as explicit date + time using separate locale date/time rendering.
  - frontend/src/pages/AssignmentDetails.tsx now uses the same explicit formatter to guarantee deadline time is displayed.

- Canada timezone standardization (GMT-4 display policy):
  - backend/app/api/v1/endpoints/instructor.py now interprets assignment creation deadline input as Canada time when no timezone is provided, then stores it in UTC.
  - frontend/src/pages/Dashboard.tsx and frontend/src/pages/AssignmentDetails.tsx now render deadlines using America/Toronto timezone and append (GMT-4).
  - frontend/src/pages/StudentPortal.tsx now renders receipt timestamps in America/Toronto timezone and appends (GMT-4).
