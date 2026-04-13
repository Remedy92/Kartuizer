#!/usr/bin/env bash
# Smoke test the live split-deploy setup:
# - Render API health
# - Vercel rewrite to Render health
# - Magic-link login and authenticated /api/me
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://kartuizer.onrender.com}"
WEB_BASE_URL="${WEB_BASE_URL:-https://karthuizer.vercel.app}"
SMOKE_EMAIL="${SMOKE_EMAIL:-smoke+$(date +%s)@example.com}"

tmp_dir="$(mktemp -d)"
cookie_jar="$tmp_dir/cookies.txt"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

assert_json() {
  local label="$1"
  local json="$2"

  LABEL="$label" JSON_PAYLOAD="$json" node --input-type=module <<'NODE'
const label = process.env.LABEL
const data = JSON.parse(process.env.JSON_PAYLOAD ?? '')

if (label === 'health') {
  if (data?.ok !== true) {
    throw new Error(`Expected {"ok":true}, got ${JSON.stringify(data)}`)
  }
  process.stdout.write('health ok\n')
  process.exit(0)
}

if (label === 'magic-link') {
  if (data?.status !== true || data?.authenticated !== true) {
    throw new Error(`Expected authenticated magic-link response, got ${JSON.stringify(data)}`)
  }
  process.stdout.write('magic-link ok\n')
  process.exit(0)
}

if (label === 'me') {
  const session = data?.session?.session
  const user = data?.session?.user
  if (!session || !user?.email) {
    throw new Error(`Expected session payload, got ${JSON.stringify(data)}`)
  }
  process.stdout.write(`me ok for ${user.email}\n`)
  process.exit(0)
}

throw new Error(`Unknown assertion label: ${label}`)
NODE
}

echo "Checking Render health..."
render_health="$(curl -fsS "${API_BASE_URL}/api/health")"
assert_json health "$render_health"

echo "Checking Vercel health rewrite..."
web_health="$(curl -fsS "${WEB_BASE_URL}/api/health")"
assert_json health "$web_health"

echo "Requesting magic-link login..."
magic_link="$(curl -fsS -c "$cookie_jar" -b "$cookie_jar" \
  -X POST "${API_BASE_URL}/api/internalauth/sign-in-magic-link" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${SMOKE_EMAIL}\",\"callbackURL\":\"/dashboard\"}")"
assert_json magic-link "$magic_link"

echo "Checking authenticated /api/me..."
me_response="$(curl -fsS -b "$cookie_jar" "${API_BASE_URL}/api/me")"
assert_json me "$me_response"

echo "Smoke test passed."
