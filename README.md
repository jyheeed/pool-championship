# 🎱 Pool Championship Management System

A complete billiards/pool championship management app built with **Next.js 14**, **MongoDB (Mongoose)** as the primary database, and a live stream HUD with planned AI ball detection.

## Features

### Phase 1 — Championship Management (✅ Built)
- **Standings** — Auto-calculated from match results (W/D/L points, frame diff, form)
- **Fixtures** — Upcoming matches grouped by round
- **Results** — Completed matches with scores
- **Players** — Player profiles with full stats
- **Head to Head** — Direct comparison between any two players
- **Admin Dashboard** — Login-protected CRUD for players & matches
- **Club Management** — Admin CRUD for clubs and city metadata
- **MongoDB DB** — All runtime data stored in MongoDB collections

### Phase 2 — Live Stream HUD + Vision Integration (✅ Phase 1 Foundation)
- **Backend source-of-truth stream state** — match-state managed in backend collections
- **SSE live updates** — stream UI consumes live backend state (no UI-owned state)
- **Vision event ingestion** — `/api/stream/vision-events` receives motion/stable/ball events
- **OBS overlay mode** — `/stream?overlay=true&matchId=<id>`
- **Python vision service (mock pipeline)** — stable-state logic with production-shaped interfaces

### Phase 3 — Production Hardening & Deployment (✅ Delivered)
- **Overlay polish for broadcast use** — cleaner status/review indicators in OBS mode
- **Containerized stack** — root `Dockerfile` + `docker-compose.yml` (web + vision + mongo)
- **Health and readiness checks** — `/api/health/live`, `/api/health/ready`, vision `/health` and `/ready`
- **Operational scripts** — `scripts/stack-up.*`, `scripts/stack-down.*`
- **Deployment docs** — see `docs/DEPLOYMENT.md`

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd pool-championship
npm install
```

### 2. MongoDB Setup

1. Use MongoDB Atlas for deployment, or a local MongoDB instance during development.
2. Set `MONGODB_URI` in your local env file.
3. Optional: seed players from import output:

```bash
npm run seed:players
```

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in:
- `MONGODB_URI` — e.g. `mongodb://localhost:27017/pool-championship`
- `JWT_SECRET` — run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_USERNAME` — e.g. `admin`
- `ADMIN_PASSWORD_HASH` — run: `node -e "require('bcryptjs').hash('yourpassword',10).then(console.log)"`

Production requirement:
- `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH` must be set for production.

### 4. Run

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Deployment (Vercel — Free)

```bash
npm i -g vercel
vercel
```

Add all env vars in Vercel Dashboard → Settings → Environment Variables.

**Important**:
- Ensure `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `NEXT_PUBLIC_APP_URL` are defined in Vercel.
- For photo uploads, the app stores a compressed image data URL in MongoDB, so no separate file storage bucket is required.

## Deployment (Production Recommended: Vercel + Render)

- Deploy Next.js app on Vercel (web + API routes).
- Deploy `vision_service` as a long-running process on Render.

Use the included blueprint:
- `render.yaml`

Full wiring guide:
- `docs/VISION_SERVICE_RENDER.md`

Required Vercel env vars for vision integration:
- `VISION_SERVICE_INTERNAL_URL` = Render service URL (for example `https://pool-vision-service.onrender.com`)
- `VISION_SERVICE_KEY` = shared secret (must match Render)

Required Render env vars:
- `NEXT_API_BASE_URL` = your Vercel production URL
- `VISION_SERVICE_KEY` = same shared secret as Vercel

## Deployment (Docker Compose Stack)

1. Create env file:

```bash
cp .env.example .env
```

2. Start stack:

```bash
npm run stack:up
```

3. Validate:

```text
http://localhost:3000/api/health/live
http://localhost:3000/api/health/ready
http://localhost:8010/health
```

4. Stop stack:

```bash
npm run stack:down
```

More details: `docs/DEPLOYMENT.md`

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Home / Standings (SSR)
│   ├── fixtures/page.tsx     # Upcoming matches (SSR)
│   ├── results/page.tsx      # Completed matches (SSR)
│   ├── players/
│   │   ├── page.tsx          # Player grid (SSR)
│   │   └── [id]/page.tsx     # Player detail (SSR)
│   ├── h2h/page.tsx          # Head to Head (Client)
│   ├── stream/page.tsx       # Live HUD (Client)
│   ├── admin/
│   │   ├── login/page.tsx    # Admin login (Client)
│   │   └── dashboard/page.tsx# CRUD dashboard (Client)
│   └── api/
│       ├── auth/             # Login, check, logout
│       ├── public/           # Public read endpoints
│       └── admin/            # Protected CRUD endpoints
├── lib/
│   ├── mongodb.ts            # MongoDB connection
│   ├── mongo-service.ts      # Data access + domain logic
│   ├── auth.ts               # JWT auth helpers
│   └── types.ts              # TypeScript interfaces
└── components/
    └── Navbar.tsx
```

### Data Flow
- **Public pages** → SSR with `revalidate=60` (ISR) → `mongo-service.ts` → MongoDB
- **Admin** → Client-side → `/api/admin/*` → auth check → `mongo-service.ts` → MongoDB
- **H2H** → Client-side → `/api/public/h2h` → `mongo-service.ts`

---

## Phase 2: Stream + AI Architecture (Implemented Foundation)

```
Camera/Mock Camera → Vision Service (Python)
         ↓
      POST /api/stream/vision-events
         ↓
      Match-state service (Next backend + Mongo)
         ↓
       SSE /api/stream/events?matchId=...
         ↓
      Stream HUD + OBS Overlay
```

### New Stream APIs
- `GET /api/stream/state?matchId=<id>`
- `GET /api/stream/events?matchId=<id>` (SSE)
- `POST /api/stream/vision-events`
- `GET /api/stream/health`

### Vision Service (Mock but Production-Shaped)
- Path: `vision_service/`
- Run:

```bash
cd vision_service
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

- Health:
  - `GET http://localhost:8010/health`
  - `GET http://localhost:8010/ready`

### Reliability Rules Implemented in this phase
- Never confirms missing balls during motion.
- Stable state is based on consecutive stable frames.
- Ball presence is aggregated from a stable multi-frame window.
- Missing balls require confidence + stable-frame confirmation.
- Uncertain detections emit `review_required` instead of forcing decisions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | MongoDB + Mongoose |
| Auth | JWT (jose) + bcrypt |
| Icons | Lucide React |
| Deploy | Vercel (free tier) |
| AI (Phase 2) | YOLOv8 + OpenCV + FastAPI |

---

## License

MIT


## Added in this delivery

- Safer MongoDB CRUD operations with stronger validation and cleaner error handling
- Validation for player and match creation/update
- Public API endpoints for standings, settings, and player detail
- Admin settings API and dashboard tab to manage tournament identity and scoring rules
- Homepage hero text now configurable from tournament settings
