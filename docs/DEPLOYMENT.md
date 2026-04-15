# Deployment Guide (Phase 3)

This project now includes a production-oriented local stack with:
- Next.js web app (`web`)
- Python vision service (`vision-service`)
- MongoDB (`mongodb`)

## 1. Prerequisites

- Docker Engine + Docker Compose plugin
- A `.env` file at repository root

Create `.env` from template:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set at minimum:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `VISION_SERVICE_KEY` (recommended for secured vision event ingestion)

## 2. Start Full Stack

PowerShell:

```powershell
./scripts/stack-up.ps1
```

Bash:

```bash
./scripts/stack-up.sh
```

Equivalent raw command:

```bash
docker compose up -d --build
```

## 3. Health Checks

- Web live: `GET http://localhost:3000/api/health/live`
- Web ready: `GET http://localhost:3000/api/health/ready`
- Stream health: `GET http://localhost:3000/api/stream/health`
- Vision health: `GET http://localhost:8010/health`
- Vision ready: `GET http://localhost:8010/ready`

Readiness behavior:
- Web is `ready` when Mongo is reachable and (if configured) vision service health probe succeeds.
- Web returns HTTP `503` on readiness failure.

## 4. OBS Overlay

Use:

```text
http://localhost:3000/stream?overlay=true&matchId=<matchId>
```

The overlay is backend-driven via `/api/stream/state` + SSE `/api/stream/events`.

## 5. Stop Stack

PowerShell:

```powershell
./scripts/stack-down.ps1
```

Bash:

```bash
./scripts/stack-down.sh
```

## 6. Production Notes

- The Next.js image uses standalone output and a non-root user.
- Keep secrets out of source control; use deployment platform secret stores.
- Keep `VISION_SERVICE_KEY` identical in web and vision environments.
- For cloud production, replace Mongo volume with managed persistent storage / managed MongoDB.

## 7. Cloud Production (Vercel + Render)

Recommended split:
- Vercel: Next.js app (`web`) and API routes
- Render: Python `vision_service` (continuous process)

Deploy vision service with blueprint:
- `render.yaml`

Then wire env vars:
- Vercel `VISION_SERVICE_INTERNAL_URL` -> Render URL
- Vercel `VISION_SERVICE_KEY` -> shared secret
- Render `NEXT_API_BASE_URL` -> Vercel URL
- Render `VISION_SERVICE_KEY` -> same shared secret

Detailed steps are in:
- `docs/VISION_SERVICE_RENDER.md`
