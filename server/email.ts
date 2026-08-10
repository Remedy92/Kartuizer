import './loadEnv.js'
import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import fs from 'node:fs/promises'
import path from 'node:path'

const resendApiKey = process.env.RESEND_API_KEY
const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || '587')
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const fromEmail = process.env.AUTH_FROM_EMAIL || 'Karthuizer <onboarding@resend.dev>'
const emailTestRecipient = process.env.EMAIL_TEST_RECIPIENT?.trim() || null
const emailAuditDir = process.env.EMAIL_AUDIT_DIR?.trim() || null
// Hard limit on one send. Login waits for this call, so it must never hang.
const emailTimeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || '10000')

type TransportName = 'smtp' | 'resend'

/**
 * Every configured transport, in the order we try them.
 *
 * SMTP wins when both exist, because setting SMTP_HOST is a deliberate choice.
 * Resend stays in the chain as a fallback: hosts such as Render block outbound
 * SMTP ports, and a blocked port must not mean no mail at all.
 */
const transports: TransportName[] = [
  ...(smtpHost ? (['smtp'] as const) : []),
  ...(resendApiKey ? (['resend'] as const) : []),
]
const transport = transports[0] ?? null

const resend = resendApiKey ? new Resend(resendApiKey) : null
const smtpTransport = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
      connectionTimeout: emailTimeoutMs,
      greetingTimeout: emailTimeoutMs,
      socketTimeout: emailTimeoutMs,
    })
  : null

export const emailTransportName = transport
export const emailTransportNames = transports

/** Reject after `emailTimeoutMs` so a stalled provider cannot block a request. */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${emailTimeoutMs}ms`)),
      emailTimeoutMs
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

if (transport) {
  console.log(
    `[email] transports: ${transports.join(' -> ')}${smtpHost ? ` (smtp ${smtpHost}:${smtpPort})` : ''}`
  )
  if (transports.length === 1) {
    console.warn(`[email] only one transport configured (${transport}); a provider outage means no mail`)
  }
} else {
  console.warn('[email] no email transport configured (set SMTP_HOST or RESEND_API_KEY)')
}

type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

type SendEmailResult =
  | {
      sent: true
      id?: string | null
      originalTo: string[]
      actualTo: string[]
      subject: string
      overridden: boolean
      transport?: TransportName
    }
  | {
      sent: false
      originalTo: string[]
      actualTo: string[]
      subject: string
      overridden: boolean
      reason?: string
      error?: string
      transport?: TransportName
    }

function normalizeRecipients(to: string | string[]) {
  return (Array.isArray(to) ? to : [to]).map((value) => value.trim()).filter(Boolean)
}

async function writeEmailAuditFile(input: {
  originalTo: string[]
  actualTo: string[]
  subject: string
  html: string
  text?: string
  overridden: boolean
  id?: string | null
  error?: unknown
  transport?: TransportName
}) {
  if (!emailAuditDir) return

  await fs.mkdir(emailAuditDir, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(':', '-')
  const filePath = path.join(emailAuditDir, `${stamp}-${Math.random().toString(36).slice(2, 10)}.json`)
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        ...input,
      },
      null,
      2
    )
  )
}

type AttemptResult = { id: string | null } | { error: string }

async function attemptSmtp(
  actualTo: string[],
  subject: string,
  input: SendEmailInput
): Promise<AttemptResult> {
  try {
    const info = await withTimeout(
      smtpTransport!.sendMail({
        from: fromEmail,
        to: actualTo.join(', '),
        subject,
        html: input.html,
        text: input.text,
      }),
      'smtp send'
    )
    return { id: info.messageId ?? null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

async function attemptResend(
  actualTo: string[],
  subject: string,
  input: SendEmailInput
): Promise<AttemptResult> {
  try {
    const response = await withTimeout(
      resend!.emails.send({
        from: fromEmail,
        to: actualTo,
        subject,
        html: input.html,
        text: input.text,
      }),
      'resend send'
    )
    if (response.error) return { error: response.error.message }
    return { id: response.data?.id ?? null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Send through the first transport that accepts the message.
 *
 * Never throws and never hangs: callers such as Better Auth await this inside a
 * login request, so a dead provider must degrade to `sent: false`, not a stall.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const originalTo = normalizeRecipients(input.to)
  const actualTo = emailTestRecipient ? [emailTestRecipient] : originalTo
  const overridden = Boolean(emailTestRecipient)

  if (transports.length === 0) {
    console.warn('[email] no transport configured, skipped:', input.subject)
    await writeEmailAuditFile({
      originalTo,
      actualTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      overridden,
    })
    return { sent: false, originalTo, actualTo, subject: input.subject, overridden, reason: 'no-transport' }
  }

  const subject = overridden ? `[TEST to ${emailTestRecipient}] ${input.subject}` : input.subject
  const failures: string[] = []

  for (const name of transports) {
    const attempt =
      name === 'smtp'
        ? await attemptSmtp(actualTo, subject, input)
        : await attemptResend(actualTo, subject, input)

    if ('error' in attempt) {
      failures.push(`${name}: ${attempt.error}`)
      console.error(
        '[email] transport failed',
        JSON.stringify({ transport: name, subject, originalTo, actualTo, overridden, error: attempt.error })
      )
      continue
    }

    await writeEmailAuditFile({
      originalTo,
      actualTo,
      subject,
      html: input.html,
      text: input.text,
      overridden,
      id: attempt.id,
      transport: name,
      ...(failures.length ? { error: `recovered after ${failures.join('; ')}` } : {}),
    })

    console.log(
      '[email] sent',
      JSON.stringify({ transport: name, subject, originalTo, actualTo, overridden, id: attempt.id, failedFirst: failures })
    )
    return { sent: true, id: attempt.id, originalTo, actualTo, subject, overridden, transport: name }
  }

  const error = failures.join('; ')

  await writeEmailAuditFile({
    originalTo,
    actualTo,
    subject,
    html: input.html,
    text: input.text,
    overridden,
    id: null,
    error,
  })

  console.error(
    '[email] all transports failed',
    JSON.stringify({ subject, originalTo, actualTo, overridden, error })
  )

  return {
    sent: false,
    originalTo,
    actualTo,
    subject,
    overridden,
    reason: 'all-transports-failed',
    error,
  }
}
