# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Karthuizer is a digital voting platform for the Board of Directors and Block Chairs of Domein Karthuizer. It's a Dutch-language React SPA with a local Node/Express backend, Better Auth, and Neon Postgres that allows authenticated users to vote on questions (yes/no/abstain) organized by groups, with automatic email notifications when voting completes.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4 (via @tailwindcss/vite plugin)
- **Backend**: Express server in `server/`, Better Auth, Neon Postgres
- **UI**: Framer Motion for animations, Lucide React for icons, clsx/tailwind-merge for class utilities
- **Email**: Resend (via Edge Function)

## Architecture

### Frontend (Single-Page App)
The entire UI lives in `src/App.tsx` as a single component with view-based routing (`landing`, `login`, `dashboard`, `archive`, `admin`). State is managed with React hooks. No external router.

### Database Schema (Postgres)
- `groups` - Voting groups with `name` and `required_votes`
- `questions` - Voting topics with `title`, `description`, `status` (open/completed), `group_id`
- `votes` - Individual votes with `question_id`, `user_id`, `vote` (yes/no/abstain)
- `group_members` - Links users to groups

### Legacy Supabase Functions
`supabase/functions/` contains the old Supabase edge-function implementation kept for historical reference during the migration.

## Environment Variables

App (`.env.local`):
- `DATABASE_URL`
- `APP_ORIGIN`
- `AUTH_FROM_EMAIL`
- `RESEND_API_KEY`

Legacy Edge Function:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
- Optional: `APP_URL` (included as a link in the welcome email), `RESEND_FROM` (defaults to `Karthuizer <onboarding@resend.dev>`)

## Styling

Tailwind 4 with custom theme defined in `src/index.css`:
- Custom `primary` color palette (warm brown tones)
- Serif font: Playfair Display for headings
- Utility classes: `.btn`, `.btn-primary`, `.btn-outline`, `.input-field`, `.pro-card`
