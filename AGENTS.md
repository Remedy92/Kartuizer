# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React SPA. Key areas: `components/` (UI building blocks), `features/` (feature-level UI logic), `routes/` (view routing), `api/` (backend API wrappers), `stores/` (Zustand state), `hooks/`, `providers/`, and `types/`.
- `src/assets/` holds static assets used by the app. Global styling lives in `src/index.css`.
- `supabase/functions/send-vote-results/` contains the Edge Function that emails vote results.
- Build output is in `dist/` (generated).

## Build, Test, and Development Commands
- `npm run dev` — Vite + Express API (API on `PORT` / default 8787, web proxies `/api`).
- `npm run build` — TypeScript check (`tsc -b`) and Vite production bundle for the SPA only.
- `npm run start` — run the Express API (use on Railway/Render/Fly or any long-lived host).
- `npm run lint` — run ESLint across the repo.
- `npm run preview` — serve the production build locally.

## Coding Style & Naming Conventions
- Language: TypeScript + React 19 with Vite 7; Tailwind CSS 4 for styling.
- Indentation: 2 spaces; prefer single quotes in JS/TS imports where existing.
- Components and files use PascalCase (`VoteCard.tsx`), hooks use `useX` (`useAuth.ts`).
- Prefer Tailwind utility classes and shared utilities (`.btn`, `.btn-primary`, `.input-field`) defined in `src/index.css`.
- Linting: ESLint with `@eslint/js`, `typescript-eslint`, `react-hooks`, and `react-refresh` rules.

## Testing Guidelines
- No automated tests are configured yet. If you add tests, colocate with features (e.g., `src/features/voting/VoteCard.test.tsx`) and document how to run them.

## Commit & Pull Request Guidelines
- Commit history uses short, imperative summaries; some use Conventional Commits (`feat: ...`). Follow that pattern when possible.
- PRs should include a concise description, screenshots for UI changes, and any relevant Supabase or environment updates.

## Security & Configuration Tips
- **Split deploy (recommended):** Vercel serves only the SPA. Run the API on a long-lived host.
  - **API on Render:** In the Render dashboard: *New* → *Blueprint* → connect this repo; `render.yaml` provisions `karthuizer-api` (Dockerfile). In the service **Environment**, set `DATABASE_URL`, `APP_ORIGIN` (e.g. `https://karthuizer.vercel.app`), `API_PUBLIC_URL` (the service’s own public `https://…onrender.com` URL), `AUTH_FROM_EMAIL`, `RESEND_API_KEY`, and optionally `FRONTEND_ORIGINS` for preview domains.
  - **Vercel client:** Add **Production** env `VITE_API_BASE_URL` = that same API public URL (no trailing slash), then redeploy the SPA. From a machine with `vercel` logged in: `./scripts/set-vercel-vite-api-base.sh 'https://YOUR-API.onrender.com'`.
  - **GitHub → Vercel (optional):** `.github/workflows/deploy-vercel.yml` (`workflow_dispatch`) with secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` from `.vercel/project.json` + a Vercel token.
- Local app env vars: `DATABASE_URL`, `APP_ORIGIN`, `AUTH_FROM_EMAIL`, `RESEND_API_KEY`.
- Legacy Supabase Edge Function env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.
- Never commit secrets; use `.env` and Supabase dashboard configuration.

## Supabase Projects (Important)
- **Karthuizer (should be used by this repo):** project ref `yzrvfpitavjtvhbdshjh` (`https://yzrvfpitavjtvhbdshjh.supabase.co`)
- **Guardrail:** Before running any Supabase MCP migrations, verify the MCP project URL matches the Karthuizer URL above.
