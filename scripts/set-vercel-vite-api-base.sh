#!/usr/bin/env bash
# Usage: ./scripts/set-vercel-vite-api-base.sh https://karthuizer-api.onrender.com
# Sets VITE_API_BASE_URL on Vercel (production) and triggers a production deploy.
set -euo pipefail
API_URL="${1:?Pass API public URL, e.g. https://karthuizer-api.onrender.com}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel" >&2
  exit 1
fi

vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true
vercel env add VITE_API_BASE_URL production --value "$API_URL" --yes
vercel deploy --prod --yes
