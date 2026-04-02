# How to Test the Academic Integrity Code Comparison System

## Step 1: Fix the Docker Error (Start Docker Desktop)
The error `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` means that **Docker Desktop is not currently running** on your Windows machine.
1. Open your Windows Start menu.
2. Search for **Docker Desktop** and open it.
3. Wait a minute for the Docker Engine to fully start (the icon in your system tray will stop animating/turn green).

## Step 2: Boot the System
Once Docker Desktop is running, open your terminal in the `Code-Checker` folder and run:
```bash
docker-compose up --build
```
This will start PostgreSQL (Database), MinIO (Storage), the FastAPI Backend, and the React Frontend.

## Step 3: Seed the Database
Right now, the database is completely empty. We need to create an instructor, a course, and an assignment so you have something to test.

Open a **new** terminal (while `docker-compose up` is running in the first one) and run:
```bash
# Enter the backend container
docker-compose exec backend bash

# Run the seeding script
python seed.py
```
*This will generate test data:*
- **Instructor Email:** `faculty@brocku.ca`
- **Instructor Password:** `password123`
- **Assignment Access Key:** `cosc4p02-a1-test`

*You only need to do this step once.*

## Step 4: Test the Student Submission Flow
1. Open your browser and go to the frontend: **http://localhost:5173** (or whatever port Vite assigns, check your Docker terminal logs).
2. Enter the Assignment Access Key: `cosc4p02-a1-test`
3. Enter a mock Name and ID (e.g., `John Doe`, `1234567`).
4. Upload a test `.c`, `.cpp`, or `.zip` file from your computer.
5. Click **Submit**. You should receive a green success receipt.
6. *Optional:* Repeat the process with a different student name and a slightly modified file to generate a comparison match.

## Step 5: Test the Instructor Dashboard
1. Go to **http://localhost:5173/instructor/login** (you can get there by adding that to your browser URL).
2. Login with the seeded credentials:
   - Email: `faculty@brocku.ca`
   - Password: `password123`
3. You will see the **SYNAPSE.CORE** Dashboard with the `COSC 4P02` course.
4. Click **View Details** on the assignment. 
5. You can view the side-by-side comparison UI. *(Note: in this Alpha version, the comparison view matches two hardcoded mock files to demonstrate the highlighting UI).*

## API Testing (Optional)
If you want to interact directly with the backend API endpoints (bypassing the React frontend), you can access the interactive Swagger UI at:
**http://localhost:8000/docs**
