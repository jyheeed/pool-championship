# Project Guidelines

## Build And Verify
- Install dependencies with `npm install`.
- Run local development with `npm run dev`.
- Build production output with `npm run build`.
- Run static checks with `npm run lint`.
- No test suite is currently defined; validate changes with lint plus targeted route or API smoke checks.

## Architecture
- This is a Next.js App Router project. UI routes live under `src/app`, API handlers live under `src/app/api`.
- Public read endpoints are under `src/app/api/public/*`; protected write/admin endpoints are under `src/app/api/admin/*`.
- Authentication is cookie-based JWT in `src/lib/auth.ts` using cookie name `pool-admin-token`.
- Persistence and business logic are centralized in `src/lib/mongo-service.ts`; Mongoose schemas are in `src/models/*`.
- Prefer reusing service functions (`getPlayers`, `getMatches`, `getStandings`, `getHeadToHead`, CRUD helpers) instead of duplicating calculations in route handlers or pages.

## Conventions
- Keep API boundary payloads aligned with `*Row` types in `src/lib/types.ts` (snake_case keys such as `photo_url`, `player1_id`).
- Keep domain objects aligned with app types in `src/lib/types.ts` (camelCase keys such as `photoUrl`, `player1Id`).
- For protected admin routes, keep the existing pattern:
  - call `requireAdmin()` at the top of each handler,
  - return `NextResponse.json` with a `success` boolean and `error` message on failure.
- Favor server components for pages unless interactivity requires client state.
- Follow existing status and discipline values from `src/lib/types.ts` and current API usage (`scheduled`, `live`, `completed`, `postponed`).

## Project-Specific Gotchas
- `getPlayers()` computes stats from completed matches on each call; avoid adding extra repeated passes over matches in pages or APIs.
- Production must not rely on dev auth fallbacks. Keep `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH` configured for deployed environments.

## Docs
- Setup, environment, and deployment notes: `README.md`
- Product and SaaS migration context: `docs/SAAS_READY_BLUEPRINT.md`
