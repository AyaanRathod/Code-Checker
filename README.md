<div align="center">

<img src="assets/banner.png" alt="CodeSimilar: catch copied code, even when the variable names change. 1st place out of 12 teams (84 students), COSC 4P02, Brock University" width="100%">

### Catch copied code, even when the variable names change.

A code similarity checker for instructors. Students submit C, C++ or Java code with an access key,<br>
and you get similarity scores, a heatmap, collusion clusters and a side-by-side view of the matching code.

<br>

[![1st Place of 12 Teams, 84 Students](https://img.shields.io/badge/%F0%9F%8F%86%201st%20Place-12%20Teams%20%C2%B7%2084%20Students-FFB000?style=for-the-badge)](#-team)
[![Course](https://img.shields.io/badge/Brock%20University-COSC%204P02-8B1A1A?style=for-the-badge)](#-team)
[![Languages](https://img.shields.io/badge/Checks-Java%20%7C%20C%20%7C%20C%2B%2B-1f6feb?style=for-the-badge)](#-features)

<br>

<sub>🏆 <b>1st place out of 12 teams (84 students)</b> in COSC 4P02 at Brock University</sub>

<br>

<img src="assets/hero.gif" alt="Running an analysis and opening the side-by-side comparison" width="900">

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 📊 Pairwise similarity scores
Every submission is compared with every other one. Pairs are ranked and tagged **High Risk**, **Review** or **Normal**.

<img src="assets/pairwise-cross-repo.png" alt="Pairwise similarity table">

</td>
<td width="50%" valign="top">

### 🔀 Side-by-side comparison
Matching blocks are highlighted in both files. Jump between matches with **Prev / Next** or the `J` / `K` keys.

<img src="assets/compare-navigator.png" alt="Side-by-side comparison with match navigator">

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🟥 Similarity heatmap
See the whole class at a glance. Darker red means more similar. Click any cell to open that pair.

<img src="assets/heatmap.png" alt="Similarity heatmap">

</td>
<td width="50%" valign="top">

### 🕸️ Collusion cluster graph
Groups of students who are all similar to each other show up as connected clusters. Pick a threshold from 60% to 90%.

<img src="assets/cluster-graph.png" alt="Collusion cluster graph">

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🗂️ Compare against past semesters
Upload last term's submissions as a repository, then run a cross-repo check. Copies from old work get flagged too.

<img src="assets/compare-cross-repo.png" alt="Match against a past-semester repository">

</td>
<td width="50%" valign="top">

### 🕶️ Anonymous by default
Student names and IDs are encrypted and shown masked (`61****01`). Click **Reveal Identities** only when you need to.

<img src="assets/compare-reveal.png" alt="Identities revealed in the comparison view">

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📥 Simple student portal
No student accounts. Students enter the access key, their name and ID, and upload a file or `.zip`. They get a receipt.

<img src="assets/student-receipt.png" alt="Student submission receipt">

</td>
<td width="50%" valign="top">

### 📄 Reports and exports
Download a PDF integrity report for the whole assignment, or all submissions as a `.zip`.

<img src="assets/analytics-overview.png" alt="Analytics overview">

</td>
</tr>
</table>

**Also included:** up to 3 attempts per student (the newest one counts) and comments stripped before storage.

---

## 🎬 See it in action

<details open>
<summary><b>1. Create an assignment and get an access key</b></summary>
<br>
<img src="assets/demo-create-assignment.gif" alt="Instructor logs in and creates an assignment" width="900">
</details>

<details>
<summary><b>2. A student submits their code</b></summary>
<br>
<img src="assets/demo-student-submit.gif" alt="Student submits a Java file through the portal" width="900">
</details>

<details>
<summary><b>3. Run the analysis and explore the results</b></summary>
<br>
<img src="assets/demo-run-analysis.gif" alt="Running analysis and browsing the result tabs" width="900">
</details>

<details>
<summary><b>4. Check against a past-semester repository</b></summary>
<br>
<img src="assets/demo-cross-repo.gif" alt="Running a cross-repository analysis" width="900">
</details>

<details>
<summary><b>5. Walk through matches side by side</b></summary>
<br>
<img src="assets/demo-side-by-side.gif" alt="Stepping through matched blocks in the comparison view" width="900">
</details>

---

## 🧠 How it works

```mermaid
flowchart LR
    A["📤 Student uploads<br/>.java / .c / .cpp / .zip"] --> B["🧹 Strip comments<br/>and whitespace"]
    B --> C["🔤 Tokenize<br/>names become ID,<br/>numbers become LIT"]
    C --> D["🧩 Make k-grams<br/>(runs of 20 tokens)"]
    D --> E["#️⃣ Hash each k-gram"]
    E --> F["🪟 Winnowing<br/>keep a small set<br/>of fingerprints"]
    F --> G["⚖️ Compare fingerprints<br/>between every pair"]
    G --> H["📊 Score, heatmap,<br/>clusters, side-by-side"]
```

**In plain English:**

1. **Normalize.** Comments and spacing are removed. Every variable or method name becomes the same placeholder, so renaming `scores` to `marks` changes nothing.
2. **Fingerprint.** The code is cut into overlapping runs of 20 tokens (a token is one word or symbol, like `for` or `{`). Each run is turned into a number (a hash).
3. **Winnowing.** Keeping every hash would be huge, so the engine slides a window of 10 hashes along the file and keeps the smallest one from each window. This gives a compact "fingerprint" that still catches any shared stretch of code that is long enough.
4. **Score.** Two submissions are compared by how many fingerprints they share. Tiny or generic matches are filtered out so short, common snippets do not inflate the score.

> 💡 Because matching works on code structure and not on names, reordering methods or renaming variables does not hide a copy. In testing, a renamed copy scored **100%** and a copy with every method reordered scored **68.4%**.

---

## 🛠️ Tech stack

<div align="center">

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-4-646CFF?style=flat-square&logo=vite&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![MinIO](https://img.shields.io/badge/S3%20storage-MinIO-C72E49?style=flat-square&logo=minio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white)

</div>

| Layer | What it does |
|---|---|
| **Frontend** | React + TypeScript + Vite. Student portal, instructor dashboard, result tabs and the comparison view. Served by Nginx in Docker. |
| **Backend** | FastAPI (Python). Auth, uploads, encryption of student identity, and the similarity engine (Pygments tokenizer + winnowing). |
| **Database** | PostgreSQL stores courses, assignments, submissions and comparison results. |
| **Storage** | S3-compatible object storage (MinIO client) stores the uploaded source files. |

---

## 🚀 Quick start

### Option A: Docker (one command)

```bash
git clone https://github.com/AyaanRathod/Code-Checker.git
cd Code-Checker
docker compose up --build
```

### Option B: Run the frontend and backend yourself

```bash
# 1. Database + file storage
docker compose up -d db minio

# 2. Backend (Python 3.11+)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt greenlet
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/codechecker \
MINIO_ENDPOINT=localhost:9000 \
uvicorn main:app --port 8000

# 3. Frontend (Node 18+), in a new terminal
cd frontend
npm ci
npx vite --port 3000
```

Then open **http://localhost:3000**.

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/v1/health |

### 🔑 Demo login

A demo instructor is created on first start:

| Email | Username | Password |
|---|---|---|
| `faculty@brocku.ca` | `faculty` | `password123` |

You can also make your own account from **Create one** on the login page.

### 🧪 Try it in 2 minutes

1. Log in, click **New Assignment**, and copy the access key it gives you.
2. Open the **Submission Page**, paste the key and upload a few `.java` files (one per student).
3. Back on the dashboard, open the assignment and click **Run Analysis**.
4. Open **Pairwise Similarities** and click **Inspect Match** on the top pair.

> ⚠️ For anything beyond local testing, set your own `SECRET_KEY` and `ENCRYPTION_KEY` (see `.env.example`) and change the demo password.

---

## 📁 Project structure

```
Code-Checker/
├── backend/
│   ├── main.py                  # FastAPI app, startup, demo account seed
│   └── app/
│       ├── analysis/            # 🧠 similarity engine
│       │   ├── tokenizer.py     #    code -> normalized tokens
│       │   ├── fingerprint.py   #    k-grams + winnowing
│       │   └── scorer.py        #    shared fingerprints -> score + matched blocks
│       ├── api/v1/endpoints/    # auth, student, instructor, analysis, repository
│       ├── models/ schemas/     # database tables and API shapes
│       ├── repositories/        # database access
│       └── services/            # storage, encryption, sanitizing, archiving
├── frontend/
│   └── src/
│       ├── pages/               # StudentPortal, Dashboard, AssignmentDetails, ComparisonView, ...
│       ├── components/          # comparison/, assignment-details/, dashboard/, student-portal/
│       └── lib/                 # API client, PDF report generators
├── Documents/                   # draw.io diagrams and UI mockups
├── SRS Documentation/           # requirements spec and change requests
├── Technical Manuals/
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## 👥 Team

Built by **Group 8** for **COSC 4P02** at Brock University.

<table>
<tr>
<td align="center"><a href="https://github.com/AyaanRathod"><img src="https://github.com/AyaanRathod.png" width="80" style="border-radius:50%"><br><b>Ayaan Rathod</b></a><br><sub>Similarity engine (tokenizer, fingerprinting, matching) and the side-by-side comparison UI</sub></td>
<td align="center"><a href="https://github.com/paramp16"><img src="https://github.com/paramp16.png" width="80" style="border-radius:50%"><br><b>Param Patel</b></a></td>
<td align="center"><a href="https://github.com/thanmaya-05"><img src="https://github.com/thanmaya-05.png" width="80" style="border-radius:50%"><br><b>thanmaya-05</b></a></td>
<td align="center"><a href="https://github.com/hannah-thomas70"><img src="https://github.com/hannah-thomas70.png" width="80" style="border-radius:50%"><br><b>Hannah Thomas</b></a></td>
</tr>
<tr>
<td align="center"><a href="https://github.com/Aniirudh03"><img src="https://github.com/Aniirudh03.png" width="80" style="border-radius:50%"><br><b>Aniirudh Sharma</b></a></td>
<td align="center"><a href="https://github.com/ArtsCode101"><img src="https://github.com/ArtsCode101.png" width="80" style="border-radius:50%"><br><b>Atharv Adhyapak</b></a></td>
<td align="center"><a href="https://github.com/Shweta-Dhiman1"><img src="https://github.com/Shweta-Dhiman1.png" width="80" style="border-radius:50%"><br><b>Shweta Dhiman</b></a></td>
<td></td>
</tr>
</table>

<div align="center">
<br>
<sub>Made at Brock University 🍁</sub>
</div>
