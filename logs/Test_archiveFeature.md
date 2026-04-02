# Testing Guide: Archive & Cross-Repository Analysis Features

This guide walks through manually testing the two new features end-to-end on a local setup.

## Prerequisites

1. **Project running locally** via `docker compose up` (or services started individually).
2. **Backend** on `http://localhost:8000`, **Frontend** on `http://localhost:3000`.
3. **Backend restarted** after the latest code pull so the new database tables (`repositories`, `repository_submissions`) and column migrations are applied automatically on startup.

### Seed Credentials

| Field    | Value               |
|----------|---------------------|
| Email    | `faculty@brocku.ca` |
| Password | `password123`       |

---

## Part 1: Assignment Archival

### 1.1 — Setup: Create a "Closed" Assignment

If you don't already have a closed assignment, create one with a past deadline:

1. Log in at `http://localhost:3000/instructor/login`.
2. Click **+ New Assignment**.
   - Course Code: `COSC TEST`
   - Title: `Archive Test`
   - Language: `Java`
   - Deadline: **set to a date/time in the past** (e.g., yesterday).
3. Click **Create & Generate Access Key**. Note the generated access key.
4. Submit 2-3 student files against this assignment using `curl` or the Student Portal (`http://localhost:3000/`):

```bash
# Example: submit via curl (repeat with different student_name/student_id for multiple students)
curl -X POST http://localhost:8000/api/v1/student/submit \
  -F "access_key=<YOUR_ACCESS_KEY>" \
  -F "student_name=Alice Smith" \
  -F "student_id=1234567" \
  -F "file=@path/to/submission.zip"
```

5. Refresh the Dashboard. The assignment should show **CLOSED** status (deadline has passed).

### 1.2 — Run Analysis (Before Archive)

1. Click **View Details** on the closed assignment.
2. Go to the **Analytics Overview** tab and click **Run Analysis**.
3. Wait a few seconds, then refresh. You should see pairwise comparison results.

### 1.3 — Manual Archive

1. Go back to the **Dashboard**.
2. On the CLOSED assignment card, you should see an **archive icon** (box with arrow) next to the pencil icon.
3. Click the archive icon.
4. A confirmation dialog appears warning that this is **irreversible** and student identities will be permanently deleted. Click **OK**.
5. The page refreshes. The assignment card should move to the **Archived Assignments** section at the bottom of the Dashboard.

### 1.4 — Verify Archived State

1. Click the **chevron** next to "Archived Assignments" to expand the section.
2. Observe:
   - The card has a **purple "ARCHIVED" badge**.
   - No edit (pencil) icon.
   - No archive icon.
   - Submission count is still shown.
3. Click **View Details** on the archived assignment.
4. Observe:
   - Only the **Submissions** tab is visible in the sidebar (Analytics Overview, Pairwise Similarities, and Similarity Matrix tabs are hidden).
   - The **Run Analysis** button is hidden.
   - **Download Submissions** button is still available.
   - Student IDs in the submissions table show **REDACTED** instead of masked IDs.
5. Click **Download Submissions** — verify it downloads a zip. Folder names inside will be short UUIDs (not student IDs, since PII was stripped).

### 1.5 — Auto-Archive (30-Day Grace Period)

> This is harder to test without time manipulation. The system automatically archives assignments whose deadline is more than 30 days in the past. To test:

1. Create an assignment with a deadline **31+ days ago**.
2. Submit at least one file.
3. Refresh the Dashboard.
4. The assignment should automatically appear in the **Archived Assignments** section (the backend computes this on read and finalizes the archive on first access).

---

## Part 2: Submission Repositories

### 2.1 — Verify Auto-Created Repository

When you archived the assignment in Part 1, a repository was automatically created.

1. Click **Repositories** in the Dashboard top-right nav bar.
2. You should see a repository card with:
   - Name matching `"COSC TEST - Archive Test"` (course code + assignment title).
   - Language: `JAVA`.
   - Submission count matching the number of students who submitted.
   - A note: *"Auto-created from archived assignment"*.

### 2.2 — Upload a Repository Manually

To test uploading an external repository:

1. **Prepare a zip-of-zips file:**
   - Create a folder, e.g., `my_repo/`.
   - Inside, create one `.zip` per "student" submission:
     - `student_A.zip` containing e.g., `Main.java`, `Helper.java`
     - `student_B.zip` containing e.g., `Main.java`, `Helper.java`
     - `student_C.zip` containing e.g., `Main.java`
   - Zip the folder contents into `my_repo.zip` (the outer zip should directly contain the inner zips, not a folder).

   ```
   my_repo.zip
   ├── student_A.zip
   │   ├── Main.java
   │   └── Helper.java
   ├── student_B.zip
   │   ├── Main.java
   │   └── Helper.java
   └── student_C.zip
       └── Main.java
   ```

   > **Tip:** The "Download Submissions" button on any assignment produces exactly this format. Download submissions from one assignment and re-upload as a repository.

2. On the Repositories page, click **Upload Repository**.
3. Fill in:
   - Repository Name: `Past Semester A1`
   - Language: `Java`
   - File: select `my_repo.zip`.
4. Click **Upload Repository**.
5. After processing, a new card appears showing the repository with the correct submission count.

### 2.3 — Delete a Repository

1. On any repository card, click the **trash icon** (top-right of the card).
2. Confirm the deletion.
3. The card disappears. Files are also cleaned up from MinIO storage.

---

## Part 3: Cross-Repository Analysis

### 3.1 — Setup

You need:
- An **active (Open or Closed) assignment** with at least 2 submissions and analysis not yet run.
- At least **one repository** (either auto-created from archive or manually uploaded).

### 3.2 — Run Internal-Only Analysis

1. Go to the active assignment's **View Details** page.
2. Click the **Run Analysis** button (the main button, not the dropdown).
3. This runs the standard N×N internal comparison. Wait and refresh to see results.

### 3.3 — Run Cross-Repository Analysis

1. On the same assignment, notice the **dropdown arrow (chevron)** to the right of the "Run Analysis" button. This only appears when repositories exist.
2. Click the **dropdown arrow**.
3. Two options appear:
   - **Internal Analysis Only** — same as clicking the main button.
   - **Compare Against Repositories...** — opens a repository selection modal.
4. Click **Compare Against Repositories...**
5. A modal appears listing all available repositories with checkboxes. Select one or more.
6. Click **Run Cross-Repo Analysis (N)** where N is the number of selected repos.
7. An alert confirms the analysis was queued. Wait a few seconds and refresh.

### 3.4 — View Cross-Repository Results

1. Go to the **Pairwise Similarities** tab.
2. You should see two types of rows:
   - **Internal comparisons** — Source and Target are both masked student IDs (e.g., `12****67` vs `23****78`).
   - **Cross-repo comparisons** — Source is a masked student ID, Target shows `[Repository Name] label` with a purple **REPO** badge.
3. Click **Inspect Match** on a cross-repo comparison.
4. The ComparisonView opens showing the current student's code on the left and the repository submission's code on the right, with match highlighting.

### 3.5 — Heatmap Behavior

- The **Similarity Matrix Hover** tab only shows internal comparisons (the N×N grid between current students).
- Cross-repo comparisons appear only in the Pairwise Similarities table, not the heatmap.

---

## Summary of New UI Elements

| Location | Element | Description |
|----------|---------|-------------|
| Dashboard card (Closed assignments) | Archive icon button | Manually archive an assignment |
| Dashboard bottom | "Archived Assignments" section | Collapsible section with purple-badged cards |
| Dashboard top-right nav | "Repositories" button | Navigate to repository management |
| Repositories page | Upload modal | Upload .zip of .zips as a new repository |
| Repositories page | Repository cards | View name, language, count; delete with trash icon |
| AssignmentDetails (archived) | Hidden tabs | Analytics/Pairwise/Heatmap tabs hidden; only Submissions visible |
| AssignmentDetails (archived) | REDACTED IDs | Student IDs show as REDACTED in submissions table |
| AssignmentDetails header | Split "Run Analysis" button | Dropdown with internal-only vs cross-repo options |
| AssignmentDetails header | Repository selection modal | Checkbox list of repos before cross-repo analysis |
| Pairwise Similarities table | Purple REPO badge | Marks cross-repository comparison rows |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to fetch assignment details" | Restart the backend so new tables are created and column migrations run. |
| Archive button not appearing | Only shows on **Closed** assignments, not Open ones. |
| No dropdown on Run Analysis button | No repositories exist yet. Archive an assignment or upload a repository first. |
| Cross-repo results not appearing | Ensure you selected repositories in the modal and waited for analysis to complete. Refresh the page. |
| Download shows UUID folder names | Expected for archived assignments — student identities were permanently stripped. |
