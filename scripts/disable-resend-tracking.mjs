#!/usr/bin/env node

const adminKey = process.env.RESEND_ADMIN_API_KEY || process.env.RESEND_API_KEY
const targetDomain = process.env.RESEND_DOMAIN_NAME || process.argv[2]

if (!adminKey) {
  console.error('Missing RESEND_ADMIN_API_KEY or RESEND_API_KEY.')
  process.exit(1)
}

if (!targetDomain) {
  console.error('Usage: RESEND_ADMIN_API_KEY=... node scripts/disable-resend-tracking.mjs <domain>')
  process.exit(1)
}

async function resend(path, init = {}) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`)
  }

  return data
}

const domains = await resend('/domains')
const domain = domains.data?.find((entry) => entry.name === targetDomain)

if (!domain) {
  console.error(`Domain not found in this Resend account: ${targetDomain}`)
  process.exit(1)
}

const updated = await resend(`/domains/${domain.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    open_tracking: false,
    click_tracking: false,
  }),
})

console.log(JSON.stringify({
  domain: updated.name,
  open_tracking: updated.open_tracking,
  click_tracking: updated.click_tracking,
  id: updated.id,
}, null, 2))
