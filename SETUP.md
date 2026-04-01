# How to Run This Project

This guide is for team members who are new to Docker and GitHub. Follow each step in order.

---

## Step 1 — Install the Required Tools

You need two things installed on your computer before anything else.

### Git
Check if you already have it:
```
git --version
```
If you see a version number, you're good. If not, download it from https://git-scm.com/downloads and install it with all the default options.

### Docker Desktop
Docker is what runs the entire project (frontend, backend, database) with a single command.

- **Windows / Mac:** Download from https://www.docker.com/products/docker-desktop and install it.
- **Linux:** Follow the instructions at https://docs.docker.com/engine/install/

**After installing Docker Desktop, open it and wait for it to fully start** (there is a small whale icon in your taskbar/menu bar — wait until it stops animating). Docker must be running before you use any `docker` commands.

Check it works:
```
docker --version
```

---

## Step 2 — Get the Code

### If you are cloning for the first time:
```
git clone https://github.com/AyaanRathod/Code-Checker
cd Code-Checker
```
### If you already have the repo cloned:
Pull the latest changes first:
```
git pull origin main
```

---

## Step 3 — Switch to Your Branch

Your task will be on its own branch. Switch to it like this:
```
git checkout feature/BACKEND
```
Replace `feature/BACKEND` with whatever branch name you were given.

If you are starting fresh work and need to create your own branch:
```
git checkout -b feature/your-task-name
```

---

## Step 4 — Run the Project

Make sure you are inside the `Code-Checker` folder, then run:
```
docker-compose up --build
```

This will:
- Download everything needed (first run takes a few minutes)
- Build the frontend and backend
- Start the database and storage services

If you are deploying with real data, set a dedicated `ENCRYPTION_KEY` in your environment instead of reusing `SECRET_KEY`. If you rotate that key later, keep the previous value in `ENCRYPTION_LEGACY_KEYS` until the old records have been migrated or re-encrypted.

You will know it is ready when you see lines like:
```
code_checker_backend  | Uvicorn running on http://0.0.0.0:8000
```

Leave this terminal window open while you work. The project stops if you close it.

---

## Step 5 — Open the App

Once the project is running, open your browser and go to:

| What | URL |
|------|-----|
| App (frontend) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

---

## Step 6 — Stop the Project

When you are done, go back to the terminal and press `Ctrl + C`. Then run:
```
docker-compose down
```

---

## Common Problems

**"Docker not found" or "command not found: docker"**
Docker Desktop is not installed or not running. Open Docker Desktop and wait for it to fully start, then try again.

**"Port already in use" error**
Something else on your computer is using port 3000 or 8000. Either stop that other program, or restart your computer and try again.

**"Permission denied" on Mac/Linux**
Add `sudo` in front of the docker command:
```
sudo docker-compose up --build
```

**The page at localhost:3000 won't load**
Wait a bit longer — the frontend takes 30–60 seconds to build on the first run. Watch the terminal for the "Uvicorn running" message.

**Changes to your code are not showing up**
The backend folder is mounted with hot reload, so Python changes apply automatically. For frontend changes, you may need to stop and re-run `docker-compose up --build`.

**Everything is broken and you want to start fresh**
```
docker-compose down -v
docker-compose up --build
```
The `-v` flag wipes the local database and storage. Only do this if you do not need any saved data.

---

## Making and Submitting Your Changes

After you finish your work:

```
git add .
git commit -m "brief description of what you did"
git push origin feature/your-branch-name
```

Then go to the GitHub repo in your browser and open a **Pull Request** from your branch into `main`. Other than that ask me if any issue just send screenshots in teams chats.