import './loadEnv.js'
import { buildAppUrl, resolvePublicAppOrigin } from './appUrl.js'
import { query } from './db.js'
import { sendEmail } from './email.js'
import { getQuestionById } from './questions.js'

const appOrigin = resolvePublicAppOrigin()

type UserProfile = {
  id: string
  email: string
  display_name: string | null
  approval_status: 'pending' | 'approved' | null
}

type GroupInfo = {
  name: string | null
  email_subject_tag?: string | null
}

type VoteInfo = {
  vote: 'yes' | 'no' | 'abstain' | null
  user_id: string
  poll_option_id: string | null
}

type PollOptionInfo = {
  id: string
  label: string
  sort_order: number
}

type VoteCommentInfo = {
  comment: string
  user_id: string
  created_at: string
  user_profiles?: {
    display_name?: string | null
    email?: string | null
  } | null
}

type QuestionNotificationData = {
  id: string
  title: string
  description: string | null
  question_type: 'standard' | 'poll'
  group_id: string
  status: 'open' | 'completed'
  groups?: GroupInfo | null
  votes: VoteInfo[]
  poll_options: PollOptionInfo[]
  vote_comments: VoteCommentInfo[]
}

function isQuestionNotificationData(value: unknown): value is QuestionNotificationData {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.group_id === 'string' &&
    typeof record.title === 'string' &&
    (record.status === 'open' || record.status === 'completed') &&
    (record.question_type === 'standard' || record.question_type === 'poll') &&
    Array.isArray(record.votes) &&
    Array.isArray(record.poll_options) &&
    Array.isArray(record.vote_comments)
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeTag(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const stripped = trimmed.slice(1, -1).trim()
    return stripped || null
  }

  return trimmed
}

function resultText(question: QuestionNotificationData) {
  if (question.question_type === 'poll') {
    const voteCounts = new Map<string, number>()
    for (const vote of question.votes ?? []) {
      if (vote.poll_option_id) {
        voteCounts.set(vote.poll_option_id, (voteCounts.get(vote.poll_option_id) || 0) + 1)
      }
    }

    const options = [...(question.poll_options ?? [])]
      .map((option) => ({ ...option, votes: voteCounts.get(option.id) || 0 }))
      .sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order)

    const winner = options[0]
    return winner && winner.votes > 0 ? `🏆 ${winner.label}` : 'Poll afgerond'
  }

  const summary = (question.votes ?? []).reduce(
    (acc: Record<'yes' | 'no' | 'abstain', number>, vote: { vote: 'yes' | 'no' | 'abstain' | null }) => {
      if (vote.vote && vote.vote in acc) acc[vote.vote] += 1
      return acc
    },
    { yes: 0, no: 0, abstain: 0 }
  )

  if (summary.yes > summary.no) return '✅ Goedgekeurd'
  if (summary.no > summary.yes) return '❌ Afgewezen'
  return '⚖️ Geen meerderheid'
}

function renderApprovalEmail(email: string) {
  const loginUrl = buildAppUrl(appOrigin, { path: 'login' })
  const safeEmail = escapeHtml(email)
  const safeLink = loginUrl ? `<p style="margin: 18px 0 0;"><a href="${loginUrl}" style="color:#8a5a2b;text-decoration:underline;">Open Karthuizer</a></p>` : ''
  const safeFallback = loginUrl
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#78716c;">Werkt de knop niet? Open deze link handmatig:<br /><span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${escapeHtml(loginUrl)}</span></p>`
    : ''

  return {
    subject: 'Je toegang tot Karthuizer is geactiveerd',
    html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f3f0;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e7e2db;">
            <tr>
              <td style="background:#3d2c24;padding:24px;text-align:center;color:#fff;">
                <div style="font-size:22px;letter-spacing:1px;">Karthuizer</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;color:#3d2c24;">
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Toegang geactiveerd</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#6b5c52;">
                  ${safeEmail} is goedgekeurd. Je kunt nu inloggen en stemmen op openstaande vragen.
                </p>
                ${safeLink}
                ${safeFallback}
                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#a8a29e;">
                  Heb je vragen? Neem contact op met een beheerder.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: loginUrl
      ? `Je account is goedgekeurd. Log in via ${loginUrl}`
      : 'Je account is goedgekeurd. Je kunt nu inloggen op Karthuizer.',
  }
}

function renderNewQuestionEmail(question: QuestionNotificationData) {
  const group: GroupInfo = question.groups ?? { name: null, email_subject_tag: null }
  const questionUrl = buildAppUrl(appOrigin, {
    path: 'dashboard',
    search: { question: question.id },
  })
  const subjectTag = normalizeTag(group.email_subject_tag) ?? normalizeTag(group.name) ?? 'Karthuizer'
  const subject = `[${subjectTag}] ${question.title}`

  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:ui-serif,Georgia,'Times New Roman',serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
        <div style="padding:22px 20px;background:#292524;color:#fff;">
          <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#d6d3d1;">
            ${escapeHtml(group.name ?? 'Karthuizer')} · ${question.question_type === 'poll' ? 'Poll' : 'Stemming'}
          </div>
          <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.25;">
            ${escapeHtml(question.title ?? '')}
          </div>
        </div>
        <div style="padding:22px 20px;color:#44403c;line-height:1.7;white-space:pre-wrap;">
          ${escapeHtml(question.description?.trim() || 'Geen toelichting opgegeven.')}
          ${questionUrl ? `<p style="margin:18px 0 0;"><a href="${questionUrl}" style="color:#8a5a2b;text-decoration:underline;">Open in Karthuizer</a></p>` : ''}
          ${questionUrl ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#78716c;white-space:normal;">Werkt de knop niet? Open deze link handmatig:<br /><span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${escapeHtml(questionUrl)}</span></p>` : ''}
        </div>
      </div>
    </div>
  </body>
</html>`,
    text: questionUrl
      ? `${question.title}\n\n${question.description ?? 'Geen toelichting opgegeven.'}\n\nOpen: ${questionUrl}`
      : `${question.title}\n\n${question.description ?? 'Geen toelichting opgegeven.'}`,
  }
}

function renderComments(comments: VoteCommentInfo[]) {
  const cleaned = comments
    .filter((comment) => Boolean(comment?.comment?.trim()))
    .map((comment) => ({
      name: comment.user_profiles?.display_name || comment.user_profiles?.email || comment.user_id,
      created_at: comment.created_at,
      comment: comment.comment.trim(),
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  if (cleaned.length === 0) return ''

  return `
    <h3 style="margin:28px 0 12px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#78716c;">Commentaar</h3>
    <div style="display:grid;gap:10px;">
      ${cleaned
        .map(
          (comment) => `
        <div style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:10px;background:#fafaf9;">
          <div style="font-weight:600;color:#292524;margin-bottom:6px;">${escapeHtml(comment.name)}</div>
          <div style="white-space:pre-wrap;color:#44403c;line-height:1.6;">${escapeHtml(comment.comment)}</div>
        </div>`
        )
        .join('')}
    </div>
  `
}

function renderStandardResults(question: QuestionNotificationData) {
  const summary = (question.votes ?? []).reduce(
    (acc: Record<'yes' | 'no' | 'abstain', number>, vote: { vote: 'yes' | 'no' | 'abstain' | null }) => {
      if (vote.vote && vote.vote in acc) acc[vote.vote] += 1
      return acc
    },
    { yes: 0, no: 0, abstain: 0 }
  )

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;background:#fafaf9;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e7e5e4;"><div style="font-size:14px;font-weight:700;color:#292524;">Stemverdeling</div></td></tr>
      <tr><td style="padding:14px 16px;"><b>Ja / Akkoord:</b> ${summary.yes}</td></tr>
      <tr><td style="padding:0 16px 14px;"><b>Nee / Niet akkoord:</b> ${summary.no}</td></tr>
      <tr><td style="padding:0 16px 14px;"><b>Onthouding:</b> ${summary.abstain}</td></tr>
    </table>
  `
}

function renderPollResults(question: QuestionNotificationData) {
  const voteCounts = new Map<string, number>()
  const uniqueVoters = new Set<string>()

  for (const vote of question.votes ?? []) {
    if (vote.poll_option_id) {
      voteCounts.set(vote.poll_option_id, (voteCounts.get(vote.poll_option_id) || 0) + 1)
      uniqueVoters.add(vote.user_id)
    }
  }

  const totalVotes = (question.votes ?? []).filter((vote: { poll_option_id: string | null }) => vote.poll_option_id).length
  const rows = [...(question.poll_options ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => {
      const votes = voteCounts.get(option.id) || 0
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
      return { ...option, votes, percentage }
    })
    .sort((a, b) => b.votes - a.votes || a.sort_order - b.sort_order)
    .map((option) => {
      const bar = option.percentage > 0
        ? `<div style="height:8px;background:#e7e5e4;border-radius:999px;overflow:hidden;"><div style="width:${option.percentage}%;height:100%;background:#78716c;"></div></div>`
        : ''
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e7e5e4;">
            <div style="display:flex;justify-content:space-between;gap:12px;">
              <div style="font-weight:600;color:#292524;">${escapeHtml(option.label)}</div>
              <div style="color:#78716c;">${option.votes} · ${option.percentage}%</div>
            </div>
            <div style="margin-top:8px;">${bar}</div>
          </td>
        </tr>
      `
    })
    .join('')

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;background:#fafaf9;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #e7e5e4;"><div style="font-size:14px;font-weight:700;color:#292524;">Resultaten</div></td></tr>
      ${rows || `<tr><td style="padding:14px 16px;">Geen stemmen.</td></tr>`}
    </table>
    <div style="margin-top:10px;font-size:13px;color:#78716c;text-align:center;">
      ${uniqueVoters.size} ${uniqueVoters.size === 1 ? 'persoon heeft' : 'personen hebben'} gestemd
    </div>
  `
}

function renderVoteResultsEmail(question: QuestionNotificationData) {
  const group: GroupInfo = question.groups ?? { name: null, email_subject_tag: null }
  const questionUrl = buildAppUrl(appOrigin, {
    path: 'archive',
    search: { question: question.id },
  })
  const subject = `${resultText(question)} - ${question.title}`

  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:ui-serif,Georgia,'Times New Roman',serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
        <div style="padding:22px 20px;background:#292524;color:#fff;">
          <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#d6d3d1;">${escapeHtml(group.name ?? 'Karthuizer')}</div>
          <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.25;">${escapeHtml(question.title ?? '')}</div>
          <div style="margin-top:10px;display:inline-block;padding:8px 12px;border-radius:999px;background:#44403c;font-size:14px;">${escapeHtml(resultText(question))}</div>
        </div>
        <div style="padding:22px 20px;">
          <div style="color:#44403c;line-height:1.7;white-space:pre-wrap;">${escapeHtml(question.description?.trim() || 'Geen beschrijving opgegeven.')}</div>
          <div style="margin-top:18px;">
            ${question.question_type === 'poll' ? renderPollResults(question) : renderStandardResults(question)}
          </div>
          ${renderComments(question.vote_comments ?? [])}
          ${questionUrl ? `<div style="margin-top:22px;text-align:center;"><a href="${questionUrl}" style="display:inline-block;padding:12px 16px;border-radius:999px;background:#292524;color:#fff;text-decoration:none;font-weight:600;">Bekijk in Karthuizer</a></div>` : ''}
          ${questionUrl ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#78716c;white-space:normal;">Werkt de knop niet? Open deze link handmatig:<br /><span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${escapeHtml(questionUrl)}</span></p>` : ''}
        </div>
      </div>
    </div>
  </body>
</html>`,
    text: questionUrl
      ? `${resultText(question)} - ${question.title}\n\n${question.description ?? ''}\n\nBekijk: ${questionUrl}`
      : `${resultText(question)} - ${question.title}`,
  }
}

function sendEmailReason(result: Awaited<ReturnType<typeof sendEmail>>, fallback: string) {
  return 'reason' in result ? result.reason ?? fallback : fallback
}

async function getApprovedGroupEmails(groupId: string) {
  const members = await query<{ email: string }>(
    `
      select distinct up.email
      from public.group_members gm
      join public.user_profiles up on up.id = gm.user_id
      where gm.group_id = $1
        and up.email is not null
        and coalesce(up.approval_status, 'approved') = 'approved'
      order by up.email asc
    `,
    [groupId]
  )

  return members.rows.map((row) => row.email).filter(Boolean)
}

async function hasQuestionNotificationBeenSent(action: string, questionId: string) {
  const existing = await query<{ count: string }>(
    `
      select count(*)::text as count
      from public.activity_log
      where action = $1
        and entity_type = 'question'
        and entity_id = $2::uuid
    `,
    [action, questionId]
  )

  return Number(existing.rows[0]?.count ?? 0) > 0
}

async function markQuestionNotification(action: string, questionId: string, metadata: Record<string, unknown>) {
  await query(
    `
      insert into public.activity_log (action, entity_type, entity_id, metadata)
      values ($1, 'question', $2::uuid, $3::jsonb)
    `,
    [action, questionId, metadata]
  )
}

export async function sendApprovalEmail(profile: UserProfile) {
  if (!profile.email) {
    return { sent: false as const, emailError: 'Geen emailadres gevonden' }
  }

  const rendered = renderApprovalEmail(profile.email)
  const result = await sendEmail({
    to: profile.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })

  if (!result.sent) {
    return { sent: false as const, emailError: sendEmailReason(result, 'Email niet verstuurd'), result }
  }

  return { sent: true as const, result }
}

export async function sendNewQuestionEmail(questionId: string) {
  const rawQuestion = await getQuestionById(questionId)
  if (!isQuestionNotificationData(rawQuestion)) {
    return { sent: false as const, reason: 'question-not-found' }
  }
  const question = rawQuestion

  const recipients = await getApprovedGroupEmails(String(question.group_id))
  if (recipients.length === 0) {
    return { sent: false as const, reason: 'no-recipients' }
  }

  const rendered = renderNewQuestionEmail(question)
  const result = await sendEmail({
    to: recipients,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })

  if (!result.sent) {
    return { sent: false as const, reason: sendEmailReason(result, 'send-failed'), result }
  }

  return { sent: true as const, result }
}

export async function sendVoteResultsEmailIfNeeded(questionId: string) {
  const rawQuestion = await getQuestionById(questionId)
  if (!isQuestionNotificationData(rawQuestion)) {
    return { sent: false as const, reason: 'question-not-found' }
  }
  const question = rawQuestion

  if (question.status !== 'completed') {
    return { sent: false as const, reason: 'question-not-completed' }
  }

  const alreadySent = await hasQuestionNotificationBeenSent('email_vote_results_sent', questionId)
  if (alreadySent) {
    return { sent: false as const, reason: 'already-sent' }
  }

  const recipients = await getApprovedGroupEmails(String(question.group_id))
  if (recipients.length === 0) {
    return { sent: false as const, reason: 'no-recipients' }
  }

  const rendered = renderVoteResultsEmail(question)
  const result = await sendEmail({
    to: recipients,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })

  if (!result.sent) {
    const reason = sendEmailReason(result, 'send-failed')
    await markQuestionNotification('email_vote_results_failed', questionId, {
      reason,
      recipients,
      subject: rendered.subject,
    })
    return { sent: false as const, reason, result }
  }

  await markQuestionNotification('email_vote_results_sent', questionId, {
    recipients: result.originalTo,
    actualTo: result.actualTo,
    subject: result.subject,
    providerId: result.id ?? null,
  })

  return { sent: true as const, result }
}
