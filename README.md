# Karthuizer

Karthuizer is a voting and approval app built with React, Vite, Express, and Postgres.

The app is deployed as a split setup:
- Frontend: Vercel at `https://karthuizer.vercel.app`
- API: Render at `https://kartuizer.onrender.com`

## What matters most

- The browser should talk to the API through the Vercel rewrite or the configured API base URL.
- Magic links and auth callbacks must use the public Render URL, not localhost.
- The API must have a working database, email transport, and Better Auth secret in production.

## Local Development

```bash
npm install
npm run dev
```

The dev server starts:
- Vite web app
- Express API on `PORT` or `8787`

## Available Scripts

- `npm run dev` - start the web app and API together
- `npm run dev:web` - start Vite only
- `npm run dev:server` - start the Express API in watch mode
- `npm run build` - type-check and build the SPA
- `npm run start` - run the Express API
- `npm run lint` - run ESLint
- `npm run preview` - preview the production SPA build locally

## Production Setup

### Render API

The Render blueprint lives in [render.yaml](./render.yaml).

Required env vars on Render:
- `DATABASE_URL`
- `APP_ORIGIN` should be `https://karthuizer.vercel.app`
- `API_PUBLIC_URL` should be `https://kartuizer.onrender.com`
- `AUTH_FROM_EMAIL`
- `RESEND_API_KEY`
- `BETTER_AUTH_SECRET`

Optional:
- `FRONTEND_ORIGINS` for preview URLs

The API health check should be `/api/health`.

### Vercel frontend

The Vercel deployment should point at the Render API.

Required env var on Vercel production:
- `VITE_API_BASE_URL=https://kartuizer.onrender.com`

If you need to update that from the terminal, use:

```bash
./scripts/set-vercel-vite-api-base.sh 'https://kartuizer.onrender.com'
```

### Deploy flow

1. Update env vars on Render.
2. Redeploy Render.
3. Redeploy Vercel.
4. Run the smoke tests below.

## Smoke Tests

These are the checks that matter most in production. The easiest way to run them is:

```bash
./scripts/smoke-prod.sh
```

If you want to point it at a different environment:

```bash
API_BASE_URL=https://kartuizer.onrender.com \
WEB_BASE_URL=https://karthuizer.vercel.app \
./scripts/smoke-prod.sh
```

The script checks:

```bash
curl https://kartuizer.onrender.com/api/health
curl https://karthuizer.vercel.app/api/health
```

For auth, trigger a magic-link login and confirm:
- the log shows a `https://kartuizer.onrender.com/api/auth/...` callback
- the login response returns `authenticated: true`
- `/api/me` returns a session when the cookie is present

## Notes For Maintainers

- `render.yaml` is the source of truth for the Render service blueprint.
- `vercel.json` rewrites `/api/*` from Vercel to Render.
- `server/auth.ts` logs a warning in production if `API_PUBLIC_URL` is missing.
- Legacy Supabase edge-function env vars still exist under `supabase/functions/`, but the live API path is the Express app on Render.

## Supabase Project

If you touch Supabase migrations for this repo, use the Karthuizer project:
- project ref: `yzrvfpitavjtvhbdshjh`
- URL: `https://yzrvfpitavjtvhbdshjh.supabase.co`
