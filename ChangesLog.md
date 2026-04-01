# Changes Log

## 2026-04-01

- FRONTEND: Reworked the generated PDF report into a narrative-first, print-style document:
  - Replaced the old PDF generator layout with a creative report flow in `frontend/src/lib/generatePDFReport.ts`.
  - Added an editorial cover page, executive brief, ranked finding cards, submission archive appendix, methodology page, and optional similarity map.
  - Shifted the report from utility-style output toward a documented, insight-led reading experience.
  - Validated the result with `frontend` TypeScript checks and a production build.

- FRONTEND: Removed the standalone methodology/interpretation page from the generated PDF report and cleaned up the remaining intro copy so the document no longer references that page.

- FRONTEND: Upgraded the Student Portal receipt export from plain text to a professional PDF receipt:
  - Added `frontend/src/components/student-portal/submissionReceiptPdf.ts` to render a branded receipt with summary cards, receipt metadata, file table, and verification note.
  - Updated the Save Receipt action to download `receipt_*.pdf` instead of a `.txt` file.
  - Updated the button label to make the output format explicit for students.

- FRONTEND: Simplified the Student Portal PDF receipt layout to remove decorative cover-style content and keep only the essential receipt details, status line, and file list.

- FRONTEND: Compressed the assignment PDF report into a strict two-page brief:
  - Replaced the oversized report layout with a lean summary focused on overall metrics, the risk spread, top findings, and a compact evidence snapshot.
  - Kept the report capped at two pages so large comparison sets stay readable instead of expanding into a long narrative document.
  - Validated the new report with a frontend production build.
  - Replaced the comparison label separator with ASCII text so jsPDF renders the student pair labels cleanly.
  - Threaded decrypted student-name fields through the assignment comparison response so the PDF can prefer human-readable labels when they are available.
  - Reworked the PDF around a matrix-first page 2, modernized the risk spread, and removed the file-hotspot section.

## 2026-03-29

- DEPLOYMENT: Production-readiness changes for hosting on DigitalOcean VPS:
  - FRONTEND — Centralized all API calls into a single Axios instance:
    - Created `frontend/src/lib/apiClient.ts` with `baseURL` driven by `VITE_API_BASE_URL` env var, falling back to `http://localhost:8000/api/v1` for local development.
    - Replaced 8 hardcoded `http://localhost:8000/api/v1` URL constants across 7 files with `apiClient` calls:
      - `frontend/src/api/dashboardApi.ts`
      - `frontend/src/hooks/useAssignmentDetailsData.ts`
      - `frontend/src/hooks/useStudentPortalSubmission.ts`
      - `frontend/src/pages/InstructorLogin.tsx`
      - `frontend/src/pages/Repositories.tsx`
      - `frontend/src/pages/ComparisonView.tsx`
      - `frontend/src/components/comparison/useComparisonData.ts`
  - FRONTEND — Updated `frontend/nginx.conf` to proxy `/api/` requests to the backend container, enabling a single public port (80) for both the React app and the API in production.
  - FRONTEND — Updated `frontend/Dockerfile` to accept `VITE_API_BASE_URL` as a Docker build argument (`ARG`/`ENV`), baking the correct API base URL into the static build at image build time.
  - BACKEND — Added `ALLOWED_ORIGINS` setting to `backend/app/core/config.py` (defaults to `"*"` for local dev, comma-separated origins for production).
  - BACKEND — Updated CORS middleware in `backend/main.py` to read allowed origins from `settings.ALLOWED_ORIGINS` instead of hardcoded `["*"]`.
  - INFRA — Created `docker-compose.prod.yml`:
    - Frontend built with `VITE_API_BASE_URL=/api/v1` (relative path, handled by nginx proxy).
    - Backend runs without `--reload` (production mode).
    - Database and MinIO ports not exposed externally (internal Docker network only).
    - All secrets read from `.env` file via environment variable substitution.
    - All services configured with `restart: unless-stopped`.
  - INFRA — Created `.env.example` documenting all required production environment variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `SECRET_KEY`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `ALLOWED_ORIGINS`.

- CODE CLEANUP: Refactored `backend/app/api/v1/endpoints/instructor.py` from 721 to 551 lines (24% reduction) with no behavior change:
  - Extracted `_mask_id(encrypted)` helper — replaces the decrypt + mask display pattern repeated across submissions list, comparisons list, and comparison detail endpoints.
  - Extracted `_decrypt_id(submission)` helper — replaces the try/except decrypt + UUID fallback pattern used in both download endpoints.
  - Extracted `_safe_name(s)` helper — replaces inline character sanitization used in 3 places across download endpoints.
  - Extracted `_build_range_lookup(items)` helper — replaces the 10-line range dict building block duplicated twice inside `get_comparison_detail`.
  - Extracted `_files_to_output(files, by_index, by_name)` helper — replaces the 10-line file download + output list loop duplicated twice inside `get_comparison_detail`.
  - Moved `LANGUAGE_EXTENSIONS` dict to module level (was buried mid-file before download endpoints).
  - Removed redundant intermediate variables and verbose inline comments throughout all endpoints.

## 2026-03-28

- BACKEND: Replaced lazy-only archival behavior with scheduled archival enforcement for overdue assignments:
  - Added shared archival service in `backend/app/services/archival_service.py` with `effective_status`, `finalize_archive`, and `finalize_overdue_archives` to centralize PII stripping + repository snapshot logic.
  - Added FastAPI lifespan scheduler loop in `backend/main.py` that runs periodically and archives assignments past the 30-day grace window even when no instructor pages are opened.
  - Added scheduler settings in `backend/app/core/config.py`:
    - `ARCHIVE_SCHEDULER_ENABLED` (default `True`)
    - `ARCHIVE_SWEEP_INTERVAL_SECONDS` (default `60`)
    - `ARCHIVE_SWEEP_BATCH_SIZE` (default `200`)
  - Refactored `backend/app/api/v1/endpoints/instructor.py` to import and reuse shared archival logic, preserving manual archive endpoint behavior while removing duplicate inline implementation.
  - Precision and scale hardening:
    - Exact threshold semantics use inclusive cutoffs (`<=`) for deadline and archive boundary checks.
    - Scheduler sweep now queries only due assignments (`deadline <= now - 30 days`) instead of scanning all open/closed assignments.
    - Added DB-level batching + ordered processing to cap per-run work and reduce burst costs.
    - Added Postgres transaction advisory lock to prevent duplicate scheduler work across multiple app instances.
    - Added index migration `idx_assignments_status_deadline` to accelerate overdue-archive lookups.
  - Added easy E2E verification script `scripts/test-archive-scheduler.ps1` to validate scheduled archival, PII stripping, comparison cleanup, and repository snapshot creation via API + DB assertions.

- FRONTEND: Dashboard filter/UI simplification for deferred risk feature:
  - Removed `High Risk` from the Dashboard status filter dropdown in `frontend/src/components/dashboard/DashboardHeaderStats.tsx`.
  - Removed High-Risk filter branch from Dashboard filtering logic in `frontend/src/pages/Dashboard.tsx`.
  - Removed the `High-Risk Flags` stat card from the Dashboard summary cards in `frontend/src/components/dashboard/DashboardHeaderStats.tsx`.

- CODE CLEANUP: Comparison View large-file refactor for maintainability (no behavior change intended):
  - Extracted shared comparison domain types to `frontend/src/components/comparison/types.ts`.
  - Extracted comparison parsing/highlight/filter utilities to `frontend/src/components/comparison/comparisonUtils.ts`.
  - Extracted comparison data-fetching flow (base payload + related matches) to `frontend/src/components/comparison/useComparisonData.ts`.
  - Extracted reusable UI building blocks from `frontend/src/pages/ComparisonView.tsx`:
    - `frontend/src/components/comparison/FileTabBar.tsx`
    - `frontend/src/components/comparison/CodePane.tsx`
    - `frontend/src/components/comparison/FloatingMatchNavigator.tsx`
  - Updated `frontend/src/components/comparison/RelatedMatchesSidebar.tsx` to consume shared `OtherAssignmentMatch` typing from `types.ts`.
  - Updated `frontend/src/pages/ComparisonView.tsx` to use extracted modules, reducing inline duplication and improving separation of concerns for future edits.

- CODE CLEANUP: Student Portal large-file refactor for maintainability (no behavior change intended):
  - Extracted Student Portal domain types to `frontend/src/components/student-portal/types.ts`.
  - Extracted upload parsing/receipt/time formatting helpers to `frontend/src/components/student-portal/studentPortalUtils.ts`.
  - Extracted submission state + API + file-drop orchestration to `frontend/src/hooks/useStudentPortalSubmission.ts`.
  - Extracted success/receipt UI to `frontend/src/components/student-portal/StudentSubmissionSuccess.tsx`.
  - Extracted submission form/upload preview UI to `frontend/src/components/student-portal/StudentSubmissionForm.tsx`.
  - Refactored `frontend/src/pages/StudentPortal.tsx` into a lean composition layer using the new hook/components.
  - Added `frontend/src/types/jszip.d.ts` for explicit local JSZip typings and stronger type-safety around zip preview handling.
  - Installed missing declared frontend dependency (`jszip`) in `frontend/node_modules` to restore production bundling.

- CODE CLEANUP: Assignment Details large-file refactor for maintainability (no behavior change intended):
  - Added shared Assignment Details domain types in `frontend/src/components/assignment-details/types.ts`.
  - Added reusable utilities in `frontend/src/components/assignment-details/assignmentDetailsUtils.ts` for byte formatting, metrics, filtering/sorting, and matrix support helpers.
  - Added data orchestration hook in `frontend/src/hooks/useAssignmentDetailsData.ts` to centralize data loading, analysis triggers, download flow, responsive state, and derived view-model state.
  - Added extracted UI modules in `frontend/src/components/assignment-details/`:
    - `AssignmentDetailsHeader.tsx`
    - `RepositorySelectionModal.tsx`
    - `AssignmentDetailsSidebar.tsx`
    - `PairwiseResultsTab.tsx`
    - `SimilarityMatrixTab.tsx`
  - Refactored `frontend/src/pages/AssignmentDetails.tsx` into a lean orchestration layer that composes extracted modules while preserving existing behavior.
  - Preserved matrix cell click-through navigation to comparison detail (`/instructor/compare/{comparison_id}`) via the new matrix component.

- CODE CLEANUP: Dashboard page modularization for maintainability (no behavior change intended):
  - Extracted active assignment card rendering into `frontend/src/components/dashboard/ActiveAssignmentCard.tsx`.
  - Extracted repository list/empty-state/upload strip into `frontend/src/components/dashboard/RepositoriesSection.tsx`.
  - Extracted archived assignments accordion/list into `frontend/src/components/dashboard/ArchivedAssignmentsSection.tsx`.
  - Refactored `frontend/src/pages/Dashboard.tsx` into a thinner orchestration layer focused on state/actions/composition.
  - Removed redundant post-save loader toggle in Dashboard submit flow to avoid stale loading state after create/edit.

- CODE CLEANUP: Dashboard architecture refactor (specific module split for maintainability/testing):
  - Added typed domain models in `frontend/src/types/dashboard.ts`:
    - Introduced `Assignment`, `Repository`, `AssignmentFormState`, `AssignmentFilter`, and `DashboardStats` to replace untyped page-level state.
  - Added API boundary in `frontend/src/api/dashboardApi.ts`:
    - Moved Dashboard axios calls into dedicated functions (`fetch/create/update/archive assignment`, `fetch/upload/delete repository`).
    - Centralized auth header/multipart handling to avoid repeated inline request setup.
  - Added stateful data hook in `frontend/src/hooks/useDashboardData.ts`:
    - Centralized token-guarded data loading and mutation flow for assignments/repositories.
    - Added shared backend error-message extraction helper used by UI actions.
  - Added Dashboard UI component modules in `frontend/src/components/dashboard/`:
    - `AssignmentModal.tsx` (create/edit assignment modal form)
    - `RepositoryUploadModal.tsx` (repository upload modal form)
    - `DashboardHeaderStats.tsx` (top summary + search/filter controls)
    - `FileDropInput.tsx` (shared drag/drop upload control used by both modals)
  - Updated `frontend/src/pages/Dashboard.tsx`:
    - Rewired page to consume the new hook/API/components and typed models.
    - Preserved existing behaviors (create/edit/archive, repository upload/delete, filtering/search, cards/sections).
    - Reduced page complexity by moving large modal/header/upload blocks out of the main page file.

- CODE CLEANUP: Frontend page decomposition and component extraction:
  - Added reusable component folder structure for large-page decomposition:
    - `frontend/src/components/assignment-details/`
    - `frontend/src/components/comparison/`
  - Extracted large Assignment Details sections into dedicated components:
    - `SubmissionsTab.tsx` (summary cards + responsive submission list/table)
    - `AnalyticsOverviewTab.tsx` (analytics cards + responsive distribution chart)
  - Extracted Comparison View related matches panel into dedicated component:
    - `RelatedMatchesSidebar.tsx` (unified sidebar header, filters, list rendering, mobile close behavior)
  - Updated page files to consume extracted components while preserving existing behavior/state flow:
    - `frontend/src/pages/AssignmentDetails.tsx`
    - `frontend/src/pages/ComparisonView.tsx`
  - Goal of refactor: reduce oversized page file complexity, improve maintainability, and enable safer reuse of major UI sections.

- FRONTEND: Mobile optimization and UX/QoL pass across all primary pages:
  - Team note: current brand/logo in header is text-rendered (not PNG). If/when replaced with a PNG/SVG asset, adjust header spacing and size tokens to preserve mobile compactness.
  - Global responsiveness baseline in `frontend/src/index.css`:
    - Added mobile breakpoints for buttons, form controls, and table behavior.
    - Improved small-screen touch target sizing and tighter typographic scale.
  - App shell updates in `frontend/src/App.tsx`:
    - Global header/footer now wrap cleanly on narrow viewports.
    - Reduced horizontal padding pressure to prevent clipping.
    - Mobile header typography and logo text sizing reduced further for a lighter top footprint.
  - Comparison View improvements in `frontend/src/pages/ComparisonView.tsx`:
    - Reworked Related Student Matches into a unified sidebar header layout (title + controls integrated in one sticky section) to remove stacked-header clutter and better match a sidebar navigation pattern.
    - Added collapsible Related Student Matches behavior through the header-level Show Matches / Hide Matches control (single control path for panel visibility).
    - Added compact-header toggle controls and refined header density behavior for better vertical workspace usage.
    - Compact header now significantly denser (reduced paddings, tighter labels/chips, condensed controls).
    - Mobile pane headers and code typography tightened for smaller screens.
    - Floating match navigator reduced footprint on mobile.
    - Added mobile-specific in-panel Close control + backdrop click-to-close for matches panel usability when the panel overlays header controls.
    - Reduced mobile matches panel width so it does not dominate viewport space.
    - Kept header-level button as the primary source of truth for panel visibility.
  - Assignment Details improvements in `frontend/src/pages/AssignmentDetails.tsx`:
    - Added responsive layout detection and mobile-specific rendering behavior.
    - Converted desktop sidebar into a horizontal scrollable mobile tab strip.
    - Added desktop collapsible sidebar (expanded panel -> icon rail) with persisted collapse state via localStorage.
    - Header actions now wrap without overflowing.
    - Submissions and Pairwise Similarities now use card-based mobile views instead of dense desktop tables.
    - Desktop table/grid behavior preserved for larger screens.
    - Fixed mobile overlap in Similarity Distribution chart labels by enabling horizontal scroll and mobile-optimized label sizing.
  - Dashboard improvements in `frontend/src/pages/Dashboard.tsx`:
    - Both modals now use viewport-constrained responsive widths/heights.
    - Instructor nav wraps properly on small screens.
    - Assignment grid minimum width reduced for small tablets/phones.
    - Main content spacing tightened for mobile.
  - Repositories page improvements in `frontend/src/pages/Repositories.tsx`:
    - Upload modal made responsive with viewport bounds and internal scrolling.
    - Top nav and page header now wrap cleanly on narrow screens.
    - Repository grid min width reduced to avoid horizontal overflow.
  - Student/Instructor entry screens:
    - `frontend/src/pages/StudentPortal.tsx`: receipt rows wrap safely and action buttons stack responsively.
    - `frontend/src/pages/InstructorLogin.tsx`: compacted spacing for smaller/shorter screens.

- Comparison reliability and UX improvements:
  - Added linked match identity model (`matched_pairs`) end-to-end so highlights are explicitly paired across source/target panes.
  - Updated frontend comparison navigation to sync by linked match ID, including auto-switching file tabs when the linked region is in a different file.
  - Active linked match is now emphasized in both panes while non-selected highlights are dimmed for clearer equivalence.
  - Reduced over-highlighting by pairing repeated hash occurrences up to min frequency per shared hash.
  - Merged nearby raw fingerprint pairs into larger linked blocks to reduce noisy, inflated match counts.
  - Added stricter weak/generic block filtering (minimum span/hash-count/pair-count) to suppress low-value matches.
  - Similarity score now reflects retained quality-filtered evidence, reducing generic-pattern inflation.
  - UI now shows active linked match confidence and span context.
  - Added an inline Similarity Score help hint (`?`) in Comparison View explaining that weak/generic matches are excluded before score calculation.
  - Calibrated sensitivity for verbose languages (e.g., Java): `DEFAULT_K` changed from 5 -> 20, `DEFAULT_WINDOW_SIZE` changed from 4 -> 10, and `MIN_BLOCK_CHARS` changed from 45 -> 120 to suppress scaffolding-heavy false positives.
  - Fixed asymmetric score denominator in scorer (now uses smaller side for symmetric containment-style scoring).
  - Added deterministic ordering for active submissions used during pair generation.
  - Comparison detail endpoint now maps ranges by `file_index` first (with filename fallback for older metadata) and includes `file_index` in response files.
  - Detailed rationale and rollout notes documented in `docs/comparison-reliability-fixes-2026-03-28.md`.

## 2026-03-25

- File clear/replace UX across all upload zones:
  - All 4 drop zones (StudentPortal submission, Dashboard boilerplate, Dashboard repo upload, Repositories page repo upload) now show a circular X button in the top-right corner when a file is selected, allowing users to clear the selection without refreshing.
  - X button uses `stopPropagation` to avoid triggering the file picker, with red hover effect for clear intent.
  - "Click to replace" hint text shown below the filename in all zones, signaling that clicking the zone itself opens the picker to swap files directly.
  - StudentPortal clears both file and zip preview list on removal.

- Drag-and-drop file upload across all drop zones:
  - Created shared `useFileDrop` hook (frontend/src/hooks/useFileDrop.ts) with counter-based drag tracking to prevent child-element flicker, file extension validation, and single-file enforcement.
  - Applied to all 4 upload zones: StudentPortal submission (.zip, .java, .c, .cpp), Dashboard boilerplate (.java, .c, .cpp, .h, .zip), Dashboard repo upload (.zip), Repositories page repo upload (.zip).
  - Each zone shows a drag-active state: colored border highlight (red for submissions/boilerplate, purple for repositories) with "Drop here" text and UploadCloud icon.
  - Removed invisible `<input>` overlay pattern that was blocking drag events — hidden inputs now triggered by click only.
  - StudentPortal zip preview (JSZip client-side extraction) triggers identically on drag-drop as on click-browse.
  - Added `jszip` dependency to frontend.

- Pre-submit file preview on StudentPortal:
  - When a zip file is selected (via click or drag), JSZip reads the archive client-side and lists all detected source files (.java, .c, .cpp, .h) with filenames and sizes in an animated preview panel below the upload area.
  - For non-zip single files, shows the file directly in the preview.
  - Warning banner appears if a zip contains zero supported source files, alerting the student before submission.
  - Preview scrollable at 120px max height for large submissions.

- Copy access key to clipboard:
  - Dashboard assignment cards now allow clicking the access key row to copy it to clipboard.
  - Shows a Copy icon that swaps to a green Check with "Copied!" text for 1.5s on click.
  - Subtle hover highlight provides visual affordance.

- Inline Repositories section on Dashboard:
  - Added "Submission Repositories" section between active assignments and archived assignments on the Dashboard.
  - When no repositories exist, shows a dashed-border empty state CTA explaining the feature and linking to upload.
  - When repositories exist, shows compact horizontal-scrolling cards (name, language, date, submission count, delete) with an "Upload More" trailing card.
  - Upload Repository modal opens inline on Dashboard (same form: name, language, zip-of-zips).
  - Repository delete with confirmation dialog, inline on Dashboard.
  - Nav bar "Repositories" button updated with Database icon (was Archive), still links to full management page.

- Post-submission receipt enhancements (StudentPortal):
  - backend/app/api/v1/endpoints/student.py submit response now includes `files` (name, lines, size_bytes per file), `total_files`, `total_lines`, `health` (ok/warning), `health_message`, `assignment_title`, and `language`.
  - Health check logic: verifies all extracted files match the assignment's expected language extension and are non-empty. Returns "ok" or "warning" with a descriptive message.
  - frontend/src/pages/StudentPortal.tsx receipt screen now shows:
    - Health check banner (green for ok, yellow for warning) with contextual message.
    - File preview table listing each detected file with filename, line count, and size. Scrollable for large submissions.
    - "Save Receipt" button that downloads a formatted `.txt` file with full submission details (receipt ID, timestamp, attempt, file list, health status) for student records.

- Assignment Archival System:
  - Extended `effective_status()` in backend/app/api/v1/endpoints/instructor.py to auto-detect `Archived` status when deadline + 30 days has passed (read-time computation, no cron needed).
  - Added `finalize_archive()` helper that: sets DB status to `Archived`, strips all PII (NULLs `student_name_encrypted` and `student_id_encrypted` on every submission), deletes all `ComparisonResult` rows, and auto-creates a `Repository` with linked `RepositorySubmission` entries from the archived submissions.
  - Lazy archive finalization: triggered on first read after 30-day grace period, idempotent.
  - Added `POST /api/v1/instructor/assignments/{id}/archive` manual archive endpoint with confirmation.
  - Guarded existing endpoints: submissions list shows `REDACTED` for archived PII, download uses submission UUID for folder names, analysis trigger returns 400 for archived assignments.
  - Dashboard split into Active Assignments and collapsible Archived Assignments section (purple badge, muted styling, no edit/analysis buttons, download-only).
  - Closed assignments show an Archive icon button for early manual archival with irreversibility confirmation dialog.
  - AssignmentDetails page hides analytics/pairwise/heatmap tabs and Run Analysis button for archived assignments.

- Submission Repositories (cross-semester analysis):
  - New `Repository` model (backend/app/models/repository.py): `id`, `instructor_id`, `name`, `language`, `source_assignment_id` (nullable, set when auto-created from archive), `submission_count`, `created_at`.
  - New `RepositorySubmission` model (backend/app/models/repository_submission.py): `id`, `repository_id`, `label`.
  - Added nullable `repository_submission_id` FK on `StoredFile` model so files can belong to either a submission or a repository submission.
  - Added `comparison_type` (`internal`/`cross_repo`) and `target_repo_submission_id` fields on `ComparisonResult` model for cross-repo match tracking.
  - New endpoint file: backend/app/api/v1/endpoints/repository.py with `GET /repositories/` (list), `POST /repositories/upload` (zip-of-zips upload + fingerprinting), `DELETE /repositories/{id}` (MinIO cleanup).
  - Repository upload processes outer zip → each inner zip becomes a `RepositorySubmission` → each file inside gets uploaded to MinIO, fingerprinted, and stored as a `StoredFile`.
  - New frontend page: frontend/src/pages/Repositories.tsx — manages repositories with upload modal, delete button, cards showing name/language/count/date.
  - Dashboard nav bar now includes "Repositories" link.
  - Route added: `/instructor/repositories`.

- Cross-Repository Analysis:
  - Extended `perform_full_analysis()` in backend/app/api/v1/endpoints/analysis.py to accept optional `repository_ids`. After N×N internal comparison, also compares each current submission against every repository submission in selected repos.
  - Analysis trigger endpoint `POST /analysis/{id}/run` now accepts optional JSON body `{ "repository_ids": [...] }`.
  - Comparisons listing endpoint now handles both `internal` and `cross_repo` results, displaying repo name and label for cross-repo targets.
  - Comparison detail endpoint handles cross-repo comparisons by loading target files from `repository_submission_id` instead of `target_submission_id`.
  - Run Analysis button now has a split-button dropdown (when repositories exist): "Internal Analysis Only" or "Compare Against Repositories..." which opens a modal with checkbox selection.
  - Pairwise Similarities table shows a purple `REPO` badge next to cross-repo target entries.

- Updated logic for "Download Submissions" in `AssignmentDetails` to generate `.zip` file of nested `.zip`s:
  - backend/app/api/v1/endpoints/instructor.py `download_submissions` endpoint now creates a main `.zip` archive per assignment which contains an inner `.zip` file for every individual student instead of loose folders.
- Submissions overview tab in AssignmentDetails:
  - Added GET /api/v1/instructor/assignments/{assignment_id}/submissions endpoint in backend/app/api/v1/endpoints/instructor.py. Returns a privacy-safe list of submissions with masked student ID, timestamp, attempt number, file count, total lines, total bytes, status, and flagged state.
  - Added "Submissions" tab as the first sidebar item in frontend/src/pages/AssignmentDetails.tsx (above Analytics Overview). Includes summary stat cards (total submissions, total files, total lines of code, latest submission time) and a detailed table showing each submission row with masked ID, submission time (GMT-4), attempt number, file count, line count, human-readable size, and status badge. Default active tab on page load.

## 2026-03-24

- Reveal Identity shows student name alongside student ID:
  - backend/app/api/v1/endpoints/instructor.py comparison detail endpoint now decrypts `student_name_encrypted` and returns `source_student_name` / `target_student_name` in the response.
  - frontend/src/pages/ComparisonView.tsx "Reveal Identities" now displays the student's full name above their student ID on each panel header (e.g. "John Smith" on top, "1234567" below in mono font).

- Multi-file analysis and comparison view:
  - backend/app/api/v1/endpoints/analysis.py now tags each fingerprint with a `file_index` identifying which file it came from. Fingerprints from all files in a zip submission are combined for scoring, but match ranges are grouped per-file in `match_metadata` as `{ "source_files": [{"file_index", "filename", "ranges"}], "target_files": [...] }`.
  - backend/app/analysis/scorer.py `calculate_similarity()` now includes `file_index` in returned match range dicts so ranges can be attributed to specific files.
  - Added `ORDER BY storage_path` to stored file queries in both analysis.py and instructor.py to guarantee deterministic file ordering.
  - backend/app/api/v1/endpoints/instructor.py comparison detail endpoint now downloads ALL files for each submission (not just the first), attaches per-file match ranges from metadata, and returns `source_files` / `target_files` arrays alongside the backward-compat `source_code` / `target_code` fields.
  - frontend/src/pages/ComparisonView.tsx now renders file tabs above each code panel when a submission has multiple files. Each tab shows the filename and a match count badge. Switching tabs updates the highlighted code view with that file's specific match ranges. Single-file submissions render without tabs (unchanged UX).
  - Fixed duplicate `return response_data` in `get_comparisons` endpoint.

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
