import './loadEnv.js'
import { betterAuth } from 'better-auth'
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node'
import { magicLink } from 'better-auth/plugins'
import { pool, query } from './db.js'
import { sendEmail } from './email.js'

const appOrigin = process.env.APP_ORIGIN || 'http://localhost:5173'
const apiPublicUrl = process.env.API_PUBLIC_URL || 'http://localhost:8787'
/**
 * Public auth URL used inside email links.
 *
 * In production this must be the web origin, because Vercel rewrites /api/* to
 * this API and the browser needs auth cookies on the web domain.
 */
const publicAuthOrigin = process.env.PUBLIC_AUTH_ORIGIN || appOrigin

if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN) {
  console.warn(
    '[auth] APP_ORIGIN is unset; magic links and OAuth callbacks may point at the wrong host. Set it to the Vercel web URL (e.g. https://karthuizer.vercel.app).'
  )
}
// Capture magic link URLs so the server can verify them directly
// (avoids dependency on email delivery for login)
const pendingMagicLinks = new Map<string, string>()

export function consumeMagicLinkUrl(email: string): string | null {
  const url = pendingMagicLinks.get(email.toLowerCase()) ?? null
  pendingMagicLinks.delete(email.toLowerCase())
  return url
}

export const auth = betterAuth({
  database: pool,
  baseURL: publicAuthOrigin,
  trustedOrigins: [
    appOrigin,
    apiPublicUrl,
    'https://karthuizer.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8787',
  ],
  advanced: {
    backgroundTasks: {
      handler: async (promise) => {
        await promise
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 6,
    sendResetPassword: async ({ user, url }) => {
      console.log('[auth-email] reset-password', JSON.stringify({ email: user.email, url }))
      await sendEmail({
        to: user.email,
        subject: 'Karthuizer - wachtwoord resetten',
        html: `<p>Klik op deze link om je wachtwoord te resetten:</p><p><a href="${url}">${url}</a></p>`,
        text: `Reset je wachtwoord via ${url}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.log('[auth-email] verification', JSON.stringify({ email: user.email, url }))
      await sendEmail({
        to: user.email,
        subject: 'Karthuizer - bevestig je e-mailadres',
        html: `<p>Bevestig je e-mailadres via deze link:</p><p><a href="${url}">${url}</a></p>`,
        text: `Bevestig je e-mailadres via ${url}`,
      })
    },
  },
  plugins: [
    magicLink({
      disableSignUp: false,
      sendMagicLink: async ({ email, url }) => {
        console.log('[auth-email] magic-link', JSON.stringify({ email, url }))

        pendingMagicLinks.set(email.toLowerCase(), url)

        await sendEmail({
          to: email,
          subject: 'Karthuizer - je loginlink',
          html: `<p>Klik op deze link om in te loggen:</p><p><a href="${url}">${url}</a></p>`,
          text: `Log in via ${url}`,
        })
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const settings = await query<{ require_user_approval: boolean }>(
            'select require_user_approval from public.app_settings limit 1'
          ).catch(() => ({ rows: [] as { require_user_approval: boolean }[] }))

          const approvalRequired = settings.rows[0]?.require_user_approval ?? true

          await query(
            `
              insert into public.user_profiles (id, email, role, approval_status)
              values ($1, $2, 'member', $3)
              on conflict (id) do update
              set email = excluded.email
            `,
            [user.id, user.email, approvalRequired ? 'pending' : 'approved']
          )
        },
      },
    },
  },
})

export const authHandler = toNodeHandler(auth)

export async function getServerSession(headers: Record<string, string | string[] | undefined>) {
  return auth.api.getSession({
    headers: fromNodeHeaders(headers),
  })
}
