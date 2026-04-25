import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Karthuizer <onboarding@resend.dev>'
const NOTIFICATION_TO_EMAIL = Deno.env.get('NOTIFICATION_TO_EMAIL') ?? 'raadkarthuizer@gmail.com'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderEmail(params: {
  oldEmail: string
  newEmail: string
  userId: string
}): { subject: string; html: string; text: string } {
  const subject = `[Karthuizer] E-mailadres gewijzigd: ${params.oldEmail} → ${params.newEmail}`

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f4; font-family: ui-serif, Georgia, 'Times New Roman', serif;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
      <div style="background:#ffffff; border:1px solid #e7e5e4; border-radius: 16px; overflow:hidden;">
        <div style="padding: 22px 20px; background:#292524; color:#ffffff;">
          <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color:#d6d3d1;">Karthuizer</div>
          <div style="margin-top: 8px; font-size: 20px; font-weight: 700; line-height: 1.25;">E-mailadres gewijzigd</div>
        </div>

        <div style="padding: 22px 20px; color:#44403c; line-height: 1.7;">
          <p style="margin: 0 0 10px 0;">
            Gelieve dit ook manueel aan te passen bij de <b>doorstuuradressen</b> van <b>${escapeHtml(NOTIFICATION_TO_EMAIL)}</b>.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; background: #fafaf9;">
            <tr>
              <td style="padding: 14px 16px; border-bottom: 1px solid #e7e5e4;">
                <div style="font-size: 14px; font-weight: 700; color: #292524;">Wijziging</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px 16px;"><b>Oud:</b> ${escapeHtml(params.oldEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 0 16px 14px;"><b>Nieuw:</b> ${escapeHtml(params.newEmail)}</td>
            </tr>
          </table>

          <p style="margin: 14px 0 0 0; font-size: 12px; color:#78716c;">
            User ID: ${escapeHtml(params.userId)}
          </p>
        </div>

        <div style="padding: 18px 20px; background:#fafaf9; border-top:1px solid #e7e5e4; color:#78716c; font-size: 12px; text-align:center;">
          Dit is een automatisch bericht van het Karthuizer Voting Platform.
        </div>
      </div>
    </div>
  </body>
</html>
  `

  const text = [
    'E-mailadres gewijzigd',
    '',
    `Oud: ${params.oldEmail}`,
    `Nieuw: ${params.newEmail}`,
    `User ID: ${params.userId}`,
    '',
    `Pas dit ook handmatig aan bij de doorstuuradressen van ${NOTIFICATION_TO_EMAIL}.`,
  ].join('\n')

  return { subject, html, text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!SUPABASE_URL) return json(500, { error: 'SUPABASE_URL ontbreekt' })
  if (!SUPABASE_ANON_KEY) return json(500, { error: 'SUPABASE_ANON_KEY ontbreekt' })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(401, { error: 'Geen autorisatie header' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return json(401, { error: 'Niet geauthenticeerd' })
  }

  const authEmail = user.email?.trim()
  if (!authEmail) {
    return json(400, { error: 'Geen e-mailadres gevonden in auth user' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return json(404, { error: profileError?.message || 'Profiel niet gevonden' })
  }

  const oldEmail = typeof profile.email === 'string' ? profile.email : ''
  if (!oldEmail) {
    return json(400, { error: 'Geen e-mailadres gevonden in user_profiles' })
  }

  if (oldEmail.toLowerCase() === authEmail.toLowerCase()) {
    return json(200, {
      synced: false,
      emailSent: false,
      profile,
    })
  }

  const updateViaServiceRole = Boolean(SUPABASE_SERVICE_ROLE_KEY)
  const updater = updateViaServiceRole
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ?? '')
    : supabase

  const { data: updatedProfile, error: updateError } = await updater
    .from('user_profiles')
    .update({ email: authEmail })
    .eq('id', user.id)
    .select('*')
    .single()

  if (updateError || !updatedProfile) {
    return json(500, { error: updateError?.message || 'E-mailadres bijwerken mislukt' })
  }

  if (!RESEND_API_KEY) {
    return json(200, {
      synced: true,
      emailSent: false,
      emailError: 'RESEND_API_KEY ontbreekt',
      oldEmail,
      newEmail: authEmail,
      profile: updatedProfile,
    })
  }

  const { subject, html, text } = renderEmail({
    oldEmail,
    newEmail: authEmail,
    userId: user.id,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [NOTIFICATION_TO_EMAIL],
      subject,
      html,
      text,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    return json(200, {
      synced: true,
      emailSent: false,
      emailError: `Resend API error (${res.status}): ${errorText}`,
      oldEmail,
      newEmail: authEmail,
      profile: updatedProfile,
    })
  }

  const resData = await res.json().catch(() => null)
  return json(200, {
    synced: true,
    emailSent: true,
    oldEmail,
    newEmail: authEmail,
    profile: updatedProfile,
    response: resData,
  })
})
