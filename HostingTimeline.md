# Hosting Timeline
Deployment of Code-Checker to DigitalOcean VPS.
Server IP: 162.243.166.196 | Branch: ProductionReadyV0

---

## Phase 1 — Production Readiness (Local, 2026-03-29)

### Code Changes Made
- Created `frontend/src/lib/apiClient.ts` — centralized Axios instance using `VITE_API_BASE_URL` env var, fallback to `http://localhost:8000/api/v1` for local dev.
- Replaced all 8 hardcoded `localhost:8000` URLs across 7 frontend files with `apiClient`.
- Updated `frontend/nginx.conf` — added `/api/` proxy to backend container (single public port in prod).
- Updated `frontend/Dockerfile` — added `ARG VITE_API_BASE_URL` so build arg is baked into the static build.
- Updated `backend/app/core/config.py` — added `ALLOWED_ORIGINS` setting (defaults to `*`).
- Updated `backend/main.py` — CORS now reads from `settings.ALLOWED_ORIGINS`.
- Created `docker-compose.prod.yml` — production compose: no `--reload`, no exposed DB/MinIO ports, secrets from `.env`, `restart: unless-stopped`.
- Created `.env.example` — documents all required production secrets.
- Refactored `backend/app/api/v1/endpoints/instructor.py` — 721 → 551 lines (no behavior change).

### Branch Setup
- Created dedicated deployment branch: `ProductionReadyV0`
- All production changes committed and pushed to `ProductionReadyV0`
- `main` remains untouched until development is complete

---

## Phase 2 — Server Setup (Remote, 2026-03-29)

### Droplet Purchased
- Provider: DigitalOcean
- Name: Code-Checker-Droplet
- Specs: 2GB RAM / 1 vCPU / 50GB Disk
- Region: NYC1
- OS: Ubuntu 24.04 (LTS) x64
- IPv4: 162.243.166.196

### Steps Completed
- [ ] Connected to droplet via SSH: `ssh root@162.243.166.196`
- [ ] Ran system update: `apt-get update && apt-get upgrade -y`
- [x] Installing Docker: `curl -fsSL https://get.docker.com | sh`

### Steps Remaining
- [x] Verify Docker: `docker --version` → v29.3.1
- [x] Clone repo (ProductionReadyV0 branch)
- [x] Create `.env` file with production secrets
- [x] Run production compose: `docker compose -f docker-compose.prod.yml up -d --build`
- [x] Verify all containers are running (frontend, backend, db, minio — all Up)
- [ ] Set up domain + SSL (Cloudflare)
- [ ] Smoke test the live site

---

## Commands Reference

### Connect to server
```bash
ssh root@162.243.166.196
```

### Deploy / redeploy after a code push
```bash
cd /root/Code-Checker
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### View running containers
```bash
docker ps
```

### View logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```
