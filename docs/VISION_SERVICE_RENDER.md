# Vision Service Deployment (Render) + Vercel Wiring

This guide deploys the Python vision service on Render and connects it to the web app already deployed on Vercel.

## 1. Why this split

- Web app (Next.js + API routes): Vercel
- Vision pipeline (long-running Python process): Render

The vision service should not run on Vercel serverless functions because it is a continuous process.

## 2. Deploy vision service on Render

1. Push your repository with [render.yaml](render.yaml).
2. In Render: New -> Blueprint -> select this repo.
3. Render creates service `pool-vision-service` from [render.yaml](render.yaml).
4. In Render service environment variables, set:
- `NEXT_API_BASE_URL` = your Vercel URL (example: `https://pool-championship-phi.vercel.app`)
- `VISION_SERVICE_KEY` = a strong shared secret (same value later in Vercel)

After deploy, note your Render URL, for example:
- `https://pool-vision-service.onrender.com`

Health checks:
- `GET <render-url>/health`
- `GET <render-url>/ready`

## 3. Wire Vercel to Render

In Vercel project settings -> Environment Variables (Production), add:
- `VISION_SERVICE_INTERNAL_URL` = `<render-url>`
- `VISION_SERVICE_KEY` = same secret as Render

Then redeploy Vercel production.

## 4. Validate end-to-end

Run these checks on Vercel production:
- `GET /api/health/live` -> should be live
- `GET /api/health/ready` -> should show `vision.configured: true` and `vision.ok: true`

Admin UI checks:
1. Login to `/admin/dashboard`
2. Open Streaming tab
3. Select a match
4. Click Go live
5. Open Arena and Overlay links

The admin action updates match live status and calls Render `/control/match` automatically.

## 5. Security notes

- Keep `VISION_SERVICE_KEY` private and identical in both services.
- Do not commit `.env` secrets.
- Restrict admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`) in Vercel.
