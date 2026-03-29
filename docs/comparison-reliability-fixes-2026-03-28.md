# Comparison Reliability Fixes (2026-03-28)

## Scope
This update fixes reliability issues in comparison highlighting, cross-panel linkage, score symmetry, and run-to-run determinism.

## Why these changes were needed
- In the comparison UI, highlighted blocks could appear unrelated across source/target panes because both sides were grouped independently without a shared match identity.
- Some highlights were attached to the wrong file when metadata was matched by filename only.
- Similarity score used an asymmetric denominator (`len(source_hashes)`), so score could change based on pair ordering.
- Active submissions had no explicit ordering in one query, which could cause unstable source/target orientation and unstable results.

## Changes made

### 0) Second hardening pass (false-positive reduction)
Files:
- `backend/app/analysis/scorer.py`
- `frontend/src/pages/ComparisonView.tsx`

What changed:
- Introduced stricter filtering for weak/generic linked blocks in scorer using minimum span, minimum unique-hash count, and minimum pair-count gates.
- Similarity score is now recomputed from retained (quality-filtered) evidence only.
- Added confidence metadata per linked block (`high`/`medium`/`low`) and exposed active match confidence + span in the UI control panel.

Why:
- This directly targets confusing "looks-not-similar" highlights by suppressing tiny generic scaffolding matches and emphasizing stronger evidence.

### 1) Linked match identities from backend to frontend
Files:
- `backend/app/analysis/scorer.py`
- `backend/app/services/analysis_service.py`
- `backend/app/api/v1/endpoints/analysis.py`
- `frontend/src/pages/ComparisonView.tsx`

What changed:
- Scorer now returns `matched_pairs` with explicit `match_id` and paired source/target ranges.
- Analysis metadata now stores `matched_pairs` for internal and cross-repo comparisons.
- Frontend now uses `matched_pairs` as the source of truth for highlighting and navigation.

Why:
- This creates a concrete link between both panes for each match and removes guesswork from UI-only clustering.

### 2) Reduced over-highlighting from repeated hash occurrences
File:
- `backend/app/analysis/scorer.py`

What changed:
- For each shared hash, occurrences are paired up to `min(freq_source, freq_target)` instead of highlighting all occurrences on both sides.
- Added linked-block merging of nearby pair matches (`MERGE_GAP_CHARS`) so output represents larger human-readable regions rather than noisy fingerprint windows.

Why:
- Prevents one-sided repeated patterns from generating excessive highlights that have no counterpart.
- Reduces inflated match counters (e.g., 185+) caused by highly overlapping k-gram-level matches.

### 3) Symmetric score denominator
File:
- `backend/app/analysis/scorer.py`

What changed:
- Similarity denominator changed to `min(len(hashes_a), len(hashes_b))`.
- Final score now uses quality-filtered retained hashes (after weak/generic block filtering), not all raw shared hashes.

Why:
- Makes scoring symmetric and consistent with containment-style expectations.

### 4) Deterministic ordering of active submissions
File:
- `backend/app/repositories/submission_repository.py`

What changed:
- `get_active_by_assignment` now orders by `timestamp ASC, id ASC`.

Why:
- Stabilizes pair generation order and improves reproducibility across runs.

### 5) File-index-first range mapping in detail endpoint
File:
- `backend/app/api/v1/endpoints/instructor.py`

What changed:
- Comparison detail now maps ranges by `file_index` first, with filename fallback for legacy rows.
- Response now includes `file_index` per source/target file payload.

Why:
- Prevents ranges from attaching to wrong files where filename-only lookup is ambiguous.

### 6) Frontend sync behavior and clarity
File:
- `frontend/src/pages/ComparisonView.tsx`

What changed:
- Click on a highlight now focuses linked `match_id` and sync-scrolls to the linked range in the other pane.
- If the linked range is in another file, the other pane auto-switches file tab and then scrolls.
- Counter is now position-in-active-panel list (e.g., 2/7), not raw `match_id` arithmetic.
- Navigation (`Prev/Next`, `J/K`, arrow keys) moves through linked matches in the active panel.
- Active linked match is now emphasized in both panes simultaneously, while non-selected highlights are strongly dimmed.

Why:
- Makes the relationship between panes understandable and actionable for end users.

## Compatibility and rollout notes
- Existing comparison rows created before this change may not have `matched_pairs`.
- Frontend includes a fallback path for legacy metadata, but best results require re-running analysis so metadata is regenerated.

## Validation performed
- Type/lint diagnostics check on edited files returned no errors.

## Recommended operational step
- Re-run analysis for assignments you want to review with the new linked-match behavior and improved scoring.
