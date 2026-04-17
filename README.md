# Pool Championship Management System

A Next.js 14 application for managing a billiards championship with MongoDB, admin CRUD, standings, fixtures, results, player profiles, and head-to-head views.

## What’s Included

- Standings calculated from completed matches
- Fixtures and results pages
- Player directory and player detail pages
- Head-to-head comparison
- Admin dashboard for players, matches, clubs, registrations, and settings
- MongoDB-backed persistence through Mongoose

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set at minimum:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

## Verification

- `npm run lint`
- `npm run build`

## Deployment

- Use Vercel for the web app.
- Use a managed MongoDB deployment in production.

## Project Layout

- `src/app` for routes and pages
- `src/app/api` for API handlers
- `src/lib` for shared services and helpers
- `src/models` for Mongoose models

## License

MIT
