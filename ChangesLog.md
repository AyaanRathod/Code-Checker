# Changes Log

## 2026-03-24

- Download all submissions as zip:
  - Added GET /api/v1/instructor/assignments/{assignment_id}/download endpoint in backend/app/api/v1/endpoints/instructor.py.
  - Zips all active submissions into folders named by decrypted student ID, with files named using the assignment language extension.
  - Added "Download Submissions" button (Archive icon) to frontend/src/pages/AssignmentDetails.tsx header, next to Export PDF and Run Analysis Now.

- Download individual submission from ComparisonView:
  - Added GET /api/v1/instructor/submissions/{submission_id}/download endpoint in backend/app/api/v1/endpoints/instructor.py.
  - Zips all files for a single submission, verifies instructor ownership through assignment/course chain.
  - Added source_submission_id and target_submission_id to GET /api/v1/instructor/comparisons/{comparison_id} response.
  - Added Download button to each panel header (Source Document / Target Document) in frontend/src/pages/ComparisonView.tsx.

- Fixed duplicate analysis results on re-run:
  - backend/app/api/v1/endpoints/analysis.py now deletes all existing ComparisonResult records for the assignment's submissions before inserting fresh results.
  - Prevents duplicate rows from accumulating when "Run Analysis Now" is clicked multiple times.

- Boilerplate / starter code exclusion:
  - POST /api/v1/instructor/assignments now accepts an optional boilerplate_file via multipart form (switched from JSON body to Form fields + UploadFile).
  - Uploaded boilerplate is stored in MinIO at boilerplate/{assignment_id}/{filename} and a Boilerplate DB record is created with cached content.
  - backend/app/api/v1/endpoints/analysis.py now loads boilerplate records before N×N comparison, fingerprints the boilerplate code, and calls scorer.remove_boilerplate() on every student's fingerprints to exclude starter code from similarity scoring.
  - frontend/src/pages/Dashboard.tsx Create Assignment modal now includes a dashed file upload zone for boilerplate (.java, .c, .cpp, .zip) with helper text explaining exclusion behavior.
  - Frontend form submission switched from JSON to multipart/form-data.

- Edit existing assignment:
  - Added PATCH /api/v1/instructor/assignments/{assignment_id} endpoint in backend/app/api/v1/endpoints/instructor.py.
  - Accepts optional form fields: title, course_code, language, deadline, boilerplate_file. Only updates provided fields. Submissions are not affected.
  - If a new boilerplate file is uploaded, the old one is deleted from MinIO and DB before storing the replacement.
  - frontend/src/pages/Dashboard.tsx now has a pencil (edit) icon button on each assignment card.
  - Clicking the pencil opens the same create modal pre-filled with existing values, title changes to "Edit Assignment", submit button changes to "Save Changes", and form sends PATCH instead of POST.

- Clickable heatmap cells in Similarity Matrix:
  - frontend/src/pages/AssignmentDetails.tsx heatmap cells with a comparison now use pointer cursor and navigate to /instructor/compare/{comparison_id} on click.
  - Diagonal cells and cells with no comparison data are not clickable.
  - Tooltip includes "Click to inspect" for clickable cells.

- Auto-close assignments past deadline:
  - Added effective_status() helper in backend/app/api/v1/endpoints/instructor.py that returns "Closed" when an assignment's deadline has passed and its stored status is "Open".
  - Applied to all three response points: GET /assignments list, GET /assignments/{id} detail, and PATCH /assignments/{id} update.
  - Computed at read time — no DB writes or background jobs needed. Extending the deadline via edit will flip status back to "Open" automatically.
  - No frontend changes required — existing badge styling already handles "Closed" status (gray badge).

- Merge conflict resolution:
  - Resolved merge conflicts in frontend/src/pages/AssignmentDetails.tsx: merged new tabbed UI (overview/results/clusters sidebar, analytics metrics, distribution chart, similarity matrix heatmap) with download submissions functionality.
  - Resolved merge conflicts in backend/app/api/v1/endpoints/analysis.py: kept Option A (clear-before-rerun) approach over the incoming skip-existing-pairs approach.

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
