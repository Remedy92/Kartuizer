import './loadEnv'
import { Resend } from 'resend'
import fs from 'node:fs/promises'
import path from 'node:path'

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.AUTH_FROM_EMAIL || 'Kartuizer <onboarding@resend.dev>'
const emailTestRecipient = process.env.EMAIL_TEST_RECIPIENT?.trim() || null
const emailAuditDir = process.env.EMAIL_AUDIT_DIR?.trim() || null

const resend = resendApiKey ? new Resend(resendApiKey) : null

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
    }
  | {
      sent: false
      originalTo: string[]
      actualTo: string[]
      subject: string
      overridden: boolean
      reason?: string
      error?: string
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

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const originalTo = normalizeRecipients(input.to)
  const actualTo = emailTestRecipient ? [emailTestRecipient] : originalTo
  const overridden = Boolean(emailTestRecipient)

  if (!resend) {
    console.warn('RESEND_API_KEY missing, skipped email:', input.subject)
    await writeEmailAuditFile({
      originalTo,
      actualTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      overridden,
    })
    return { sent: false, originalTo, actualTo, subject: input.subject, overridden, reason: 'missing-resend-key' }
  }

  const subject = overridden
    ? `[TEST to ${emailTestRecipient}] ${input.subject}`
    : input.subject

  const response = await resend.emails.send({
    from: fromEmail,
    to: actualTo,
    subject,
    html: input.html,
    text: input.text,
  })

  if (response.error) {
    await writeEmailAuditFile({
      originalTo,
      actualTo,
      subject,
      html: input.html,
      text: input.text,
      overridden,
      id: null,
      error: response.error,
    })

    console.error(
      '[email] failed',
      JSON.stringify({
        subject,
        originalTo,
        actualTo,
        overridden,
        error: response.error,
      })
    )

    return {
      sent: false,
      originalTo,
      actualTo,
      subject,
      overridden,
      reason: 'resend-error',
      error: response.error.message,
    }
  }

  await writeEmailAuditFile({
    originalTo,
    actualTo,
    subject,
    html: input.html,
    text: input.text,
    overridden,
    id: response.data?.id ?? null,
  })

  console.log(
    '[email] sent',
    JSON.stringify({
      subject,
      originalTo,
      actualTo,
      overridden,
      id: response.data?.id ?? null,
    })
  )

  return {
    sent: true,
    id: response.data?.id ?? null,
    originalTo,
    actualTo,
    subject,
    overridden,
  }
}
