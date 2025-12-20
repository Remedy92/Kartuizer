# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React SPA. Key areas: `components/` (UI building blocks), `features/` (feature-level UI logic), `routes/` (view routing), `api/` (Supabase client calls), `stores/` (Zustand state), `hooks/`, `providers/`, and `types/`.
- `src/assets/` holds static assets used by the app. Global styling lives in `src/index.css`.
- `supabase/functions/send-vote-results/` contains the Edge Function that emails vote results.
- Build output is in `dist/` (generated).

## Build, Test, and Development Commands
- `npm run dev` — start the Vite dev server with HMR.
- `npm run build` — TypeScript project build (`tsc -b`) and production bundle.
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
- Frontend env vars (local `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Edge Function env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.
- Never commit secrets; use `.env` and Supabase dashboard configuration.
