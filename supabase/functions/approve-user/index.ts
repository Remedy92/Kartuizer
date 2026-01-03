import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('APP_URL')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Karthuizer <onboarding@resend.dev>'

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function sendWelcomeEmail(to: string): Promise<{ sent: true } | { sent: false; error: string }> {
  if (!RESEND_API_KEY) {
    return { sent: false, error: 'RESEND_API_KEY ontbreekt' }
  }

  const subject = 'Je toegang tot Karthuizer is geactiveerd'

  const linkHtml = APP_URL
    ? `<p style="margin: 0 0 16px 0;"><a href="${APP_URL}" style="color: #8a5a2b; text-decoration: underline;">Open Karthuizer</a></p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f5f3f0; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 32px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto; background: #fffdf9; border: 1px solid #e7e2db;">
            <tr>
              <td style="background: #3d2c24; padding: 24px 24px; text-align: center;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #ffffff; letter-spacing: 1px;">Karthuizer</div>
                <div style="width: 48px; height: 2px; background-color: #c4a98a; margin: 14px auto 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 24px; color: #3d2c24;">
                <h1 style="margin: 0 0 12px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600;">Toegang geactiveerd</h1>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #6b5c52;">
                  Je account is goedgekeurd. Je kunt nu inloggen en stemmen op openstaande vragen.
                </p>
                ${linkHtml}
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #a8a29e;">
                  Heb je vragen? Neem contact op met een beheerder.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    return { sent: false, error: `Resend API error (${res.status}): ${errorText}` }
  }

  return { sent: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(401, { error: 'Geen autorisatie header' })
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !caller) {
    return json(401, { error: 'Niet geauthenticeerd' })
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAuth
    .from('user_profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfileError || !callerProfile) {
    return json(403, { error: 'Profiel niet gevonden' })
  }

  if (callerProfile.role !== 'admin') {
    return json(403, { error: 'Geen beheerder rechten' })
  }

  const { userId } = await req.json().catch(() => ({} as { userId?: string }))
  if (!userId || typeof userId !== 'string') {
    return json(400, { error: 'userId is verplicht' })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (targetError || !targetProfile) {
    return json(404, { error: 'Gebruiker niet gevonden' })
  }

  const alreadyApproved = targetProfile.approval_status === 'approved' || targetProfile.approval_status === null

  let updatedProfile = targetProfile
  if (!alreadyApproved) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (updateError || !updated) {
      return json(500, { error: updateError?.message || 'Goedkeuren mislukt' })
    }

    updatedProfile = updated
  }

  if (alreadyApproved) {
    return json(200, { profile: updatedProfile, emailSent: false, emailError: 'Gebruiker is al goedgekeurd' })
  }

  const email = typeof updatedProfile.email === 'string' ? updatedProfile.email : null
  if (!email) {
    return json(200, { profile: updatedProfile, emailSent: false, emailError: 'Geen emailadres gevonden' })
  }

  const emailResult = await sendWelcomeEmail(email)
  if (!emailResult.sent) {
    return json(200, { profile: updatedProfile, emailSent: false, emailError: emailResult.error })
  }

  return json(200, { profile: updatedProfile, emailSent: true })
})
