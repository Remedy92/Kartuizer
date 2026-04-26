#!/usr/bin/env bash
# Deprecated helper.
#
# Production auth relies on same-origin /api requests through the Vercel rewrite.
# This script now removes VITE_API_BASE_URL from Vercel production and deploys.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel" >&2
  exit 1
fi

vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true
vercel deploy --prod --yes
