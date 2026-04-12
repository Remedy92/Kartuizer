import './loadEnv'
import express from 'express'
import { auth, authHandler, getServerSession, consumeMagicLinkUrl } from './auth'
import { query } from './db'
import { getQuestionById, listQuestions } from './questions'
import { sendApprovalEmail, sendNewQuestionEmail, sendVoteResultsEmailIfNeeded } from './notifications'

const app = express()
const port = Number(process.env.PORT || 8787)
const allowedOrigins = [
  process.env.APP_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
]

app.use(
  (req, res, next) => {
    const origin = req.headers.origin
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin)
      res.header('Vary', 'Origin')
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  }
)
app.use(express.json())

function toRequestHeaders(req: express.Request) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else if (typeof value === 'string') {
      headers.set(key, value)
    }
  }
  return headers
}

app.post('/api/internalauth/send-verification-email', async (req, res) => {
  const result = await auth.api.sendVerificationEmail({
    body: {
      email: String(req.body.email || ''),
      callbackURL: req.body.callbackURL ? String(req.body.callbackURL) : undefined,
    },
    headers: toRequestHeaders(req),
  })
  res.json(result)
})

app.post('/api/internalauth/request-password-reset', async (req, res) => {
  const result = await auth.api.requestPasswordReset({
    body: {
      email: String(req.body.email || ''),
      redirectTo: req.body.redirectTo ? String(req.body.redirectTo) : undefined,
    },
    headers: toRequestHeaders(req),
  })
  res.json(result)
})

app.post('/api/internalauth/sign-in-magic-link', async (req, res) => {
  const email = String(req.body.email || '')

  // Step 1: Generate magic link token (also creates user if new)
  await (auth.api as {
    signInMagicLink: (input: {
      body: { email: string; callbackURL?: string; name?: string }
      headers: Headers
    }) => Promise<unknown>
  }).signInMagicLink({
    body: {
      email,
      callbackURL: req.body.callbackURL ? String(req.body.callbackURL) : undefined,
      name: req.body.name ? String(req.body.name) : undefined,
    },
    headers: toRequestHeaders(req),
  })

  // Step 2: Auto-verify the magic link server-side to create a session instantly
  // This avoids dependency on email delivery (Resend requires a verified domain)
  const magicLinkUrl = consumeMagicLinkUrl(email)
  if (magicLinkUrl) {
    try {
      const verifyResponse = await fetch(magicLinkUrl, { redirect: 'manual' })
      const cookies = verifyResponse.headers.getSetCookie()
      for (const cookie of cookies) {
        res.append('Set-Cookie', cookie)
      }
      res.json({ status: true, authenticated: true })
      return
    } catch (err) {
      console.error('[auth] auto-verify failed, falling back to email flow:', err)
    }
  }

  // Fallback: email was sent, user needs to click the link
  res.json({ status: true, authenticated: false })
})

app.post('/api/internalauth/sign-up-email', async (req, res) => {
  const result = await (auth.api as {
    signUpEmail: (input: {
      body: { email: string; password: string; name: string; callbackURL?: string }
      headers: Headers
    }) => Promise<unknown>
  }).signUpEmail({
    body: {
      email: String(req.body.email || ''),
      password: String(req.body.password || ''),
      name: String(req.body.name || ''),
      callbackURL: req.body.callbackURL ? String(req.body.callbackURL) : undefined,
    },
    headers: toRequestHeaders(req),
  })
  res.json(result)
})

app.all('/api/auth/*splat', authHandler)

async function requireSession(req: express.Request, res: express.Response) {
  const session = await getServerSession(req.headers)
  if (!session) {
    res.status(401).json({ error: 'Niet ingelogd' })
    return null
  }
  return session
}

async function requireAdmin(req: express.Request, res: express.Response) {
  const session = await requireSession(req, res)
  if (!session) return null

  const profile = await query<{ role: string }>(
    'select role from public.user_profiles where id = $1',
    [session.user.id]
  )

  if (profile.rows[0]?.role !== 'admin') {
    res.status(403).json({ error: 'Geen toegang' })
    return null
  }

  return session
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/me', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return

  const profile = await query(
    'select * from public.user_profiles where id = $1',
    [session.user.id]
  )

  res.json({
    session,
    profile: profile.rows[0] ?? null,
  })
})

app.get('/api/groups', async (_req, res) => {
  const groups = await query('select * from public.groups order by name asc')
  res.json(groups.rows)
})

app.get('/api/groups/:id', async (req, res) => {
  const result = await query('select * from public.groups where id = $1', [req.params.id])
  res.json(result.rows[0] ?? null)
})

app.post('/api/groups', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const { name, description, email_subject_tag } = req.body
  const result = await query(
    `
      insert into public.groups (name, description, email_subject_tag, required_votes, created_by)
      values ($1, $2, $3, 0, $4)
      returning *
    `,
    [name, description ?? null, email_subject_tag ?? null, session.user.id]
  )
  res.status(201).json(result.rows[0])
})

app.patch('/api/groups/:id', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const { name, description, email_subject_tag } = req.body
  const result = await query(
    `
      update public.groups
      set name = coalesce($2, name),
          description = $3,
          email_subject_tag = $4,
          updated_at = now()
      where id = $1
      returning *
    `,
    [req.params.id, name ?? null, description ?? null, email_subject_tag ?? null]
  )
  res.json(result.rows[0])
})

app.delete('/api/groups/:id', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  await query('delete from public.groups where id = $1', [req.params.id])
  res.status(204).end()
})

app.get('/api/groups/:id/members', async (req, res) => {
  const result = await query(
    `
      select gm.*, row_to_json(up) as user_profiles
      from public.group_members gm
      join public.user_profiles up on up.id = gm.user_id
      where gm.group_id = $1
      order by gm.joined_at asc
    `,
    [req.params.id]
  )
  res.json(result.rows)
})

app.get('/api/group-members', async (_req, res) => {
  const result = await query(
    `
      select gm.*, row_to_json(up) as user_profiles
      from public.group_members gm
      join public.user_profiles up on up.id = gm.user_id
      order by gm.joined_at asc
    `
  )
  res.json(result.rows)
})

app.post('/api/groups/:id/members', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const result = await query(
    `
      insert into public.group_members (group_id, user_id)
      values ($1, $2)
      returning *
    `,
    [req.params.id, req.body.userId]
  )
  res.status(201).json(result.rows[0])
})

app.delete('/api/groups/:id/members/:userId', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  await query('delete from public.group_members where group_id = $1 and user_id = $2', [
    req.params.id,
    req.params.userId,
  ])
  res.status(204).end()
})

app.get('/api/questions', async (_req, res) => {
  res.json(await listQuestions())
})

app.get('/api/questions/status/:status', async (req, res) => {
  res.json(await listQuestions('q.status = $1', [req.params.status]))
})

app.get('/api/questions/:id', async (req, res) => {
  res.json(await getQuestionById(req.params.id))
})

app.post('/api/questions', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return

  const { title, description, group_id, deadline, question_type = 'standard', allow_multiple = false } = req.body

  const created = await query<{ id: string }>(
    `
      insert into public.questions (title, description, group_id, deadline, question_type, allow_multiple, status, created_by)
      values ($1, $2, $3, $4, $5, $6, 'open', $7)
      returning id
    `,
    [title, description ?? null, group_id, deadline ?? null, question_type, allow_multiple, session.user.id]
  )

  const question = await getQuestionById(created.rows[0].id)
  void sendNewQuestionEmail(created.rows[0].id).catch((error) => {
    console.error('Failed to send new-question email:', error)
  })
  res.status(201).json(question)
})

app.post('/api/questions/polls', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return

  const { title, description, group_id, deadline, allow_multiple = false, options } = req.body

  const created = await query<{ id: string }>(
    `
      insert into public.questions (title, description, group_id, deadline, question_type, allow_multiple, status, created_by)
      values ($1, $2, $3, $4, 'poll', $5, 'open', $6)
      returning id
    `,
    [title, description ?? null, group_id, deadline ?? null, allow_multiple, session.user.id]
  )

  for (const [index, option] of options.entries()) {
    await query(
      `
        insert into public.poll_options (question_id, label, description, sort_order)
        values ($1, $2, $3, $4)
      `,
      [created.rows[0].id, option.label, option.description ?? null, index]
    )
  }

  const question = await getQuestionById(created.rows[0].id)
  void sendNewQuestionEmail(created.rows[0].id).catch((error) => {
    console.error('Failed to send new-question email:', error)
  })

  res.status(201).json(question)
})

app.patch('/api/questions/:id', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return
  const { title, description, deadline } = req.body
  await query(
    `
      update public.questions
      set title = coalesce($2, title),
          description = $3,
          deadline = $4,
          updated_at = now()
      where id = $1
    `,
    [req.params.id, title ?? null, description ?? null, deadline ?? null]
  )
  res.json(await getQuestionById(req.params.id))
})

app.patch('/api/questions/:id/poll-draft', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return
  const { title, description, options } = req.body
  const voteCount = await query<{ count: string }>(
    'select count(*)::text as count from public.votes where question_id = $1',
    [req.params.id]
  )
  if (Number(voteCount.rows[0]?.count ?? 0) > 0) {
    res.status(400).json({ error: 'Deze poll heeft al stemmen en kan niet meer aangepast worden.' })
    return
  }
  await query(
    'update public.questions set title = $2, description = $3, updated_at = now() where id = $1',
    [req.params.id, title, description ?? null]
  )
  await query('delete from public.poll_options where question_id = $1', [req.params.id])
  for (const [index, option] of options.entries()) {
    await query(
      'insert into public.poll_options (question_id, label, description, sort_order) values ($1,$2,$3,$4)',
      [req.params.id, option.label, option.description ?? null, index]
    )
  }
  res.json(await getQuestionById(req.params.id))
})

app.post('/api/questions/:id/close', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const method = req.body.method || 'manual'
  await query(
    `
      update public.questions
      set status = 'completed',
          completed_at = now(),
          completion_method = $2,
          updated_at = now()
      where id = $1
    `,
    [req.params.id, method]
  )
  const emailResult = await sendVoteResultsEmailIfNeeded(req.params.id).catch((error) => {
    console.error('Failed to send vote-results email:', error)
    return { sent: false as const, reason: 'send-exception' }
  })
  console.log('vote-results email result', JSON.stringify({ questionId: req.params.id, ...emailResult }))
  res.json(await getQuestionById(req.params.id))
})

app.delete('/api/questions/:id', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return
  await query('delete from public.questions where id = $1', [req.params.id])
  res.status(204).end()
})

app.post('/api/questions/:id/votes', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return
  const questionId = req.params.id
  const userId = session.user.id
  const { vote, optionId, optionIds } = req.body

  if (Array.isArray(optionIds)) {
    await query('delete from public.votes where question_id = $1 and user_id = $2', [questionId, userId])
    for (const id of optionIds) {
      await query(
        `insert into public.votes (question_id, user_id, poll_option_id, vote) values ($1,$2,$3,null)`,
        [questionId, userId, id]
      )
    }
    void sendVoteResultsEmailIfNeeded(questionId).catch((error) => {
      console.error('Failed to send vote-results email after multi vote:', error)
    })
    res.status(204).end()
    return
  }

  if (optionId) {
    await query('delete from public.votes where question_id = $1 and user_id = $2', [questionId, userId])
    const inserted = await query(
      `insert into public.votes (question_id, user_id, poll_option_id, vote) values ($1,$2,$3,null) returning *`,
      [questionId, userId, optionId]
    )
    void sendVoteResultsEmailIfNeeded(questionId).catch((error) => {
      console.error('Failed to send vote-results email after poll vote:', error)
    })
    res.json(inserted.rows[0])
    return
  }

  const updated = await query(
    `
      insert into public.votes (question_id, user_id, vote, poll_option_id)
      values ($1,$2,$3,null)
      on conflict (question_id, user_id) where poll_option_id is null
      do update set vote = excluded.vote, updated_at = now()
      returning *
    `,
    [questionId, userId, vote]
  ).catch(async () => {
    const result = await query(
      `
        update public.votes
        set vote = $3
        where question_id = $1 and user_id = $2 and poll_option_id is null
        returning *
      `,
      [questionId, userId, vote]
    )
    return result
  })

  if (!updated.rows[0]) {
    const result = await query(
      `
        update public.votes
        set vote = $3
        where question_id = $1 and user_id = $2 and poll_option_id is null
        returning *
      `,
      [questionId, userId, vote]
    )
    void sendVoteResultsEmailIfNeeded(questionId).catch((error) => {
      console.error('Failed to send vote-results email after standard vote:', error)
    })
    res.json(result.rows[0])
    return
  }

  void sendVoteResultsEmailIfNeeded(questionId).catch((error) => {
    console.error('Failed to send vote-results email after standard vote:', error)
  })
  res.json(updated.rows[0])
})

app.put('/api/questions/:id/comment', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return
  const result = await query(
    `
      insert into public.vote_comments (question_id, user_id, comment)
      values ($1, $2, $3)
      on conflict (question_id, user_id)
      do update set comment = excluded.comment, updated_at = now()
      returning *
    `,
    [req.params.id, session.user.id, String(req.body.comment || '').trim()]
  )
  res.json(result.rows[0])
})

app.delete('/api/questions/:id/comment', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return
  await query('delete from public.vote_comments where question_id = $1 and user_id = $2', [
    req.params.id,
    session.user.id,
  ])
  res.status(204).end()
})

app.get('/api/users', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const users = await query('select * from public.user_profiles order by email asc')
  res.json(users.rows)
})

app.get('/api/users/:id', async (req, res) => {
  const result = await query('select * from public.user_profiles where id = $1', [req.params.id])
  res.json(result.rows[0] ?? null)
})

app.patch('/api/users/:id', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const result = await query(
    `
      update public.user_profiles
      set display_name = coalesce($2, display_name),
          role = coalesce($3, role),
          updated_at = now()
      where id = $1
      returning *
    `,
    [req.params.id, req.body.display_name ?? null, req.body.role ?? null]
  )
  res.json(result.rows[0])
})

app.get('/api/users/:id/groups', async (req, res) => {
  const groups = await query(
    `
      select gm.*, row_to_json(g) as groups
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.user_id = $1
    `,
    [req.params.id]
  )
  res.json(groups.rows)
})

app.patch('/api/users/:id/last-active', async (req, res) => {
  await query('update public.user_profiles set last_active_at = now() where id = $1', [req.params.id])
  res.status(204).end()
})

app.get('/api/users/pending/list', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const users = await query(
    `select * from public.user_profiles where approval_status = 'pending' order by created_at desc`
  )
  res.json(users.rows)
})

app.get('/api/users/pending/count', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const count = await query<{ count: string }>(
    `select count(*)::text as count from public.user_profiles where approval_status = 'pending'`
  )
  res.json(Number(count.rows[0]?.count ?? 0))
})

app.post('/api/users/:id/approve', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const current = await query<{
    id: string
    email: string
    display_name: string | null
    approval_status: 'pending' | 'approved' | null
  }>(
    `select id, email, display_name, approval_status from public.user_profiles where id = $1`,
    [req.params.id]
  )
  const existingProfile = current.rows[0]
  if (!existingProfile) {
    res.status(404).json({ error: 'Gebruiker niet gevonden' })
    return
  }
  if (existingProfile.approval_status === 'approved' || existingProfile.approval_status === null) {
    res.json({ profile: existingProfile, emailSent: false, emailError: 'Gebruiker is al goedgekeurd' })
    return
  }
  const updated = await query(
    `
      update public.user_profiles
      set approval_status = 'approved', updated_at = now()
      where id = $1
      returning *
    `,
    [req.params.id]
  )
  const profile = updated.rows[0] as {
    id: string
    email: string
    display_name: string | null
    approval_status: 'pending' | 'approved' | null
  }
  const emailResult = await sendApprovalEmail(profile).catch((error) => {
    console.error('Failed to send approval email:', error)
    return { sent: false as const, emailError: 'Email versturen mislukte' }
  })
  res.json({
    profile,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? undefined : emailResult.emailError,
  })
})

app.delete('/api/users/:id', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  await query('delete from public.user_profiles where id = $1', [req.params.id])
  res.status(204).end()
})

app.get('/api/settings', async (_req, res) => {
  const settings = await query('select * from public.app_settings limit 1')
  res.json(settings.rows[0] ?? null)
})

app.patch('/api/settings', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const existing = await query<{ id: string }>('select id from public.app_settings limit 1')
  const result = existing.rows[0]
    ? await query(
        `
          update public.app_settings
          set require_user_approval = coalesce($2, require_user_approval),
              updated_at = now(),
              updated_by = $3
          where id = $1
          returning *
        `,
        [existing.rows[0].id, req.body.require_user_approval, session.user.id]
      )
    : await query(
        `
          insert into public.app_settings (require_user_approval, updated_by)
          values ($1, $2)
          returning *
        `,
        [req.body.require_user_approval ?? true, session.user.id]
      )
  res.json(result.rows[0])
})

app.get('/api/analytics/stats', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const [questions, votes, users, groups] = await Promise.all([
    query<{ status: string }>('select status from public.questions'),
    query<{ count: string }>('select count(*)::text as count from public.votes'),
    query<{ count: string }>('select count(*)::text as count from public.user_profiles'),
    query<{ count: string }>('select count(*)::text as count from public.groups'),
  ])
  const openQuestions = questions.rows.filter((row: { status: string }) => row.status === 'open').length
  const completedQuestions = questions.rows.filter(
    (row: { status: string }) => row.status === 'completed'
  ).length
  res.json({
    totalQuestions: questions.rows.length,
    openQuestions,
    completedQuestions,
    totalVotes: Number(votes.rows[0]?.count ?? 0),
    totalUsers: Number(users.rows[0]?.count ?? 0),
    totalGroups: Number(groups.rows[0]?.count ?? 0),
    participationRate: 0,
  })
})

app.get('/api/analytics/activity', async (req, res) => {
  const session = await requireAdmin(req, res)
  if (!session) return
  const limit = Number(req.query.limit || 20)
  const activity = await query(
    `
      select al.*, row_to_json(up) as user_profiles
      from public.activity_log al
      left join public.user_profiles up on up.id = al.user_id
      order by al.created_at desc
      limit $1
    `,
    [limit]
  )
  res.json(activity.rows)
})

app.post('/api/analytics/activity', async (req, res) => {
  const session = await requireSession(req, res)
  if (!session) return

  const { action, entityType, entityId, metadata } = req.body

  const inserted = await query(
    `
      insert into public.activity_log (user_id, action, entity_type, entity_id, metadata)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [
      session.user.id,
      String(action ?? ''),
      String(entityType ?? ''),
      entityId ?? null,
      metadata ?? {},
    ]
  )

  res.status(201).json(inserted.rows[0])
})

// In local dev, start listening. On Vercel, the app is imported as a handler.
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Kartuizer backend listening on http://localhost:${port}`)
  })
}

export default app
