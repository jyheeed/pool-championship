# Tunisian Pool Championship — Audit & SaaS Blueprint

## 1) What the current project is
The app is a Next.js 14 tournament dashboard with:
- public pages for standings, groups, fixtures, results, players, H2H, and stream HUD
- MongoDB/Mongoose as the current data source
- one admin area protected by a single JWT cookie login
- a nice MVP direction, but not a true multi-tenant SaaS yet

## 2) What I changed
### Front-end repositioning
- remade the shell to feel closer to premium pool event products
- renamed the navigation to a cleaner product language:
  - Overview
  - Draw
  - Schedule
  - Results
  - Players
  - H2H Lab
  - Arena HUD
- added a more premium pool-table environment:
  - dark arena background
  - felt-inspired gradients
  - wood-and-gold cues
  - stronger hierarchy and spacing
  - Tunisian flag badge in the main brand area

### Technical cleanup
- fixed missing CSS tokens used across multiple pages
- fixed TypeScript typing issues on fixtures, results, and players pages
- added an offline import bridge for `BD_joueurs.xlsx`

## 3) What is still weak in the original project
### Not SaaS-ready yet
The current single-database setup is okay for MVP or internal use, but weak for a serious SaaS:
- no tenant isolation
- fragile schema management
- poor auditability
- limited concurrency safety
- harder permissions model
- weak long-term reporting and query flexibility

### Auth is too basic
Current auth is a single admin account with one cookie:
- no roles
- no per-organization access
- no invite flow
- no reset / recovery
- no audit trail

### Deployment hygiene was not clean
The uploaded zip included:
- `.next`
- `node_modules`

That should never be committed or shipped inside a project handoff archive for deployment.

## 4) BD_joueurs integration plan
Your Excel file currently contains this structure:
- Nom
- Prénom
- Club
- Points
- Rang
- Win
- Loose
- Games

I added:
- `scripts/import_bd_joueurs.py`

This script:
- reads `BD_joueurs.xlsx`
- generates clean player IDs
- exports a Mongo-friendly CSV and JSON seed file
- creates a small import summary

### Recommended usage
```bash
python scripts/import_bd_joueurs.py ../BD_joueurs.xlsx
```

Output folder:
- `import_output/players.mongo.csv`
- `import_output/players.seed.json`
- `import_output/import-summary.txt`

## 5) Real SaaS architecture I recommend
### Phase 1 — Clean production MVP
Use:
- Next.js 14 or 15
- MongoDB Atlas or local MongoDB
- JWT auth with role-based admin checks
- Vercel deployment

### Core tables
- organizations
- users
- memberships
- tournaments
- players
- matches
- standings_snapshots
- venues
- streams
- audit_logs

### Why this is the right move
It gives you:
- predictable document queries
- simpler deployment and operations
- multi-tenant support once schema and auth are extended
- easier admin tooling
- cleaner analytics and exports
- better future mobile/API support

## 6) Feature roadmap I would add next
### Must-have
1. player search + filters
2. tournament settings UI
3. match creation wizard
4. bulk player import UI
5. CSV / Excel export
6. responsive mobile cards for standings
7. admin role split:
   - super admin
   - tournament admin
   - score operator
8. empty-state onboarding
9. loading skeletons
10. error states with actual messages

### High-value after that
1. live score operator panel
2. automatic standings recompute service
3. OBS overlay presets
4. bracket mode
5. sponsor slots
6. matchroom-style event landing pages
7. public share pages per player
8. lightweight CMS for event news

## 7) What “deployment-ready” means here
This updated handoff is deployment-improved, but not magically enterprise-ready.
The honest state is:

### Ready now
- polished UI direction
- stronger product naming
- corrected styling foundation
- BD_joueurs import bridge
- cleaner project handoff

### Still needed for a serious SaaS launch
- move from single-tenant admin to org-aware auth and data partitioning
- real multi-user auth and roles
- import UI, not only a script
- validation, rate limits, audit logs
- observability and backups

## 8) Practical recommendation
Do not over-engineer the current MVP.
Use MongoDB as the stable runtime layer and add multi-tenant architecture only when the product needs it.

Best path:
1. use the import script now
2. validate the UI and flows
3. harden the MongoDB data model and indexes
4. keep the polished front-end
5. add role-based admin and onboarding

That gets you to an actual product instead of a dressed-up spreadsheet website.
