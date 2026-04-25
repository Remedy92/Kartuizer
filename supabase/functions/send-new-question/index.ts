import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildAppUrl } from '../_shared/appUrl.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Karthuizer <onboarding@resend.dev>'
const NOTIFICATION_TO_EMAIL = Deno.env.get('NOTIFICATION_TO_EMAIL') ?? 'raadkarthuizer@gmail.com'

const APP_URL = Deno.env.get('APP_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function normalizeTag(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const withoutBrackets = trimmed.slice(1, -1).trim()
    return withoutBrackets ? withoutBrackets : null
  }

  return trimmed
}

function normalizeBaseUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

function resolveAppUrl(req: Request): string | null {
  const fromOrigin = normalizeBaseUrl(req.headers.get('origin'))
  if (fromOrigin) return fromOrigin

  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const url = new URL(referer)
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin
    } catch {
      // ignore
    }
  }

  const fromEnv = normalizeBaseUrl(APP_URL)
  if (fromEnv) return fromEnv

  return null
}

function renderEmail(params: {
  groupName: string
  title: string
  description?: string | null
  questionType: 'standard' | 'poll'
  subjectTag: string
  questionId: string
  appUrl: string | null
}): { subject: string; html: string; text: string } {
  const safeGroup = escapeHtml(params.groupName)
  const safeTitle = escapeHtml(params.title)
  const safeDescription = escapeHtml(params.description?.trim() || 'Geen toelichting opgegeven.')
  const safeType = params.questionType === 'poll' ? 'Poll' : 'Stemming'

  const subject = `[${params.subjectTag}] ${params.title}`

  const questionUrl = buildAppUrl(params.appUrl ?? APP_URL, {
    path: 'dashboard',
    search: { question: params.questionId },
  })

  const linkHtml = questionUrl
    ? `
      <p style="margin: 18px 0 0 0;">
        <a href="${questionUrl}" style="color: #8a5a2b; text-decoration: underline;">Open ${safeType}</a>
      </p>
      <p style="margin: 12px 0 0 0; font-size: 13px; line-height: 1.6; color: #78716c;">
        Werkt de knop niet? Open deze link handmatig:<br />
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all;">${escapeHtml(questionUrl)}</span>
      </p>
    `
    : ''

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
          <div style="margin-bottom: 12px;">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 4v24M8 16l10-12M8 16l10 12" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color:#d6d3d1;">
            ${safeGroup} · ${safeType}
          </div>
          <div style="margin-top: 8px; font-size: 22px; font-weight: 700; line-height: 1.25;">
            ${safeTitle}
          </div>
        </div>

        <div style="padding: 22px 20px;">
          <div style="color:#44403c; line-height: 1.7; white-space: pre-wrap;">
            ${safeDescription}
          </div>
          ${linkHtml}
        </div>

        <div style="padding: 18px 20px; background:#fafaf9; border-top:1px solid #e7e5e4; color:#78716c; font-size: 12px; text-align:center;">
          Dit is een automatisch bericht van het Karthuizer Voting Platform.
        </div>
      </div>
    </div>
  </body>
</html>
  `

  const text = questionUrl
    ? `${params.title}\n\n${params.description?.trim() || 'Geen toelichting opgegeven.'}\n\nOpen: ${questionUrl}`
    : `${params.title}\n\n${params.description?.trim() || 'Geen toelichting opgegeven.'}`

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!RESEND_API_KEY) return json(500, { error: 'RESEND_API_KEY ontbreekt' })
  if (!SUPABASE_URL) return json(500, { error: 'SUPABASE_URL ontbreekt' })
  const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  if (!supabaseKey) {
    return json(500, { error: 'SUPABASE_SERVICE_ROLE_KEY (aanbevolen) of SUPABASE_ANON_KEY ontbreekt' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(401, { error: 'Geen autorisatie header' })
  }

  const supabase = createClient(SUPABASE_URL, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return json(401, { error: 'Niet geauthenticeerd' })
  }

  const payload = await req.json().catch(() => ({} as Record<string, unknown>))
  const record = (payload as { record?: { id?: string } }).record
  const questionId = (payload as { questionId?: string }).questionId ?? record?.id

  if (!questionId || typeof questionId !== 'string') {
    return json(400, { error: 'questionId is verplicht' })
  }

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = callerProfile?.role === 'admin'

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, title, description, question_type, group_id, groups(name, email_subject_tag)')
    .eq('id', questionId)
    .single()

  if (questionError || !question) {
    return json(404, { error: 'Vraag niet gevonden' })
  }

  if (!isAdmin) {
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', question.group_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      return json(500, { error: membershipError.message })
    }

    if (!membership) {
      return json(403, { error: 'Geen toegang tot deze groep' })
    }
  }

  const groupName = (question.groups as { name?: string } | null)?.name ?? 'Onbekende groep'
  const rawTag = (question.groups as { email_subject_tag?: string | null } | null)?.email_subject_tag
  const subjectTag = normalizeTag(rawTag) ?? normalizeTag(groupName) ?? 'Karthuizer'

  const appUrl = resolveAppUrl(req)

  const { subject, html, text } = renderEmail({
    groupName,
    title: question.title,
    description: question.description,
    questionType: question.question_type,
    subjectTag,
    questionId: question.id,
    appUrl,
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
    return json(500, { error: `Resend API error (${res.status}): ${errorText}` })
  }

  const resData = await res.json().catch(() => null)
  return json(200, {
    sent: true,
    to: NOTIFICATION_TO_EMAIL,
    subject,
    questionId: question.id,
    appUrlUsed: appUrl,
    response: resData,
  })
})
