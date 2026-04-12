import dotenv from 'dotenv'

// On Vercel, env vars are injected automatically — skip dotenv
if (!process.env.VERCEL) {
  dotenv.config({ path: '.env.local', override: false })
  dotenv.config({ override: false })
}
