import '../server/loadEnv'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const databaseUrl = process.env.DATABASE_URL
const sourceProjectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  (await fs.readFile(path.resolve(__dirname, '../supabase/.temp/project-ref'), 'utf8')
    .then((value) => value.trim())
    .catch(() => ''))

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL for Neon target database')
}

if (!sourceProjectRef) {
  throw new Error('Missing SUPABASE_PROJECT_REF and could not read supabase/.temp/project-ref')
}

const sourceUrl = process.env.SUPABASE_SOURCE_URL || `https://${sourceProjectRef}.supabase.co`

function getSupabaseSourceKey() {
  const explicitKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SOURCE_KEY

  if (explicitKey) {
    return explicitKey
  }

  try {
    const output = execFileSync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', sourceProjectRef, '-o', 'json'],
      {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
      }
    )

    const keys = JSON.parse(output) as Array<{ name?: string; api_key?: string }>
    const serviceRoleKey = keys.find((key) => key.name === 'service_role')?.api_key
    const anonKey = keys.find((key) => key.name === 'anon')?.api_key

    if (serviceRoleKey) return serviceRoleKey
    if (anonKey) return anonKey
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Could not resolve Supabase source API key for project ${sourceProjectRef}. ` +
        `Use a logged-in Supabase CLI session or set SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SOURCE_KEY. ${message}`
    )
  }

  throw new Error(
    `No usable Supabase API key found for project ${sourceProjectRef}. ` +
      'Set SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SOURCE_KEY or log into the Supabase CLI.'
  )
}

const sourceApiKey = getSupabaseSourceKey()

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
})

type UserProfile = {
  id: string
  email: string
  display_name: string | null
  role: 'member' | 'admin'
  approval_status: 'pending' | 'approved' | null
  created_at: string
  updated_at: string
  last_active_at: string | null
}

type Group = {
  id: string
  name: string
  description: string | null
  email_subject_tag: string | null
  required_votes: number
  created_by: string | null
  created_at: string
  updated_at: string
}

type GroupMember = {
  group_id: string
  user_id: string
  joined_at: string
}

type Question = {
  id: string
  group_id: string
  title: string
  description: string | null
  status: 'open' | 'completed'
  created_by: string | null
  deadline: string | null
  completed_at: string | null
  completion_method: 'manual' | 'threshold' | 'deadline' | null
  created_at: string
  updated_at: string
  decided_result: 'yes' | 'no' | null
  question_type: 'standard' | 'poll'
  allow_multiple: boolean
  winning_option_id: string | null
}

type PollOption = {
  id: string
  question_id: string
  label: string
  description: string | null
  sort_order: number
  created_at: string
}

type Vote = {
  id: string
  question_id: string
  user_id: string
  vote: 'yes' | 'no' | 'abstain' | null
  poll_option_id: string | null
  created_at: string
  updated_at: string | null
}

type VoteComment = {
  id: string
  question_id: string
  user_id: string
  comment: string
  created_at: string
  updated_at: string
}

type AppSetting = {
  id: string
  require_user_approval: boolean
  updated_at: string
  updated_by: string | null
}

type ActivityLog = {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

async function fetchTable<T>(table: string, order?: string): Promise<T[]> {
  const url = new URL(`${sourceUrl}/rest/v1/${table}`)
  url.searchParams.set('select', '*')
  if (order) url.searchParams.set('order', order)

  const response = await fetch(url, {
    headers: {
      apikey: sourceApiKey,
      Authorization: `Bearer ${sourceApiKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to fetch ${table}: ${response.status} ${body}`)
  }

  return (await response.json()) as T[]
}

async function readSql(fileName: string) {
  return fs.readFile(path.join(__dirname, 'sql', fileName), 'utf8')
}

async function truncateAll() {
  await pool.query(`
    truncate table
      public.activity_log,
      public.vote_comments,
      public.votes,
      public.poll_options,
      public.questions,
      public.group_members,
      public.groups,
      public.app_settings,
      public.user_profiles,
      "account",
      "session",
      "verification",
      "user"
    restart identity cascade
  `)
}

function toUserName(profile: UserProfile) {
  const fallback = profile.email.split('@')[0] || profile.email
  return profile.display_name?.trim() || fallback
}

function buildPollOptions(questions: Question[], votes: Vote[], pollOptions: PollOption[]) {
  const byId = new Map(pollOptions.map((option) => [option.id, option]))
  const synthesized = new Map<string, PollOption>()
  const optionOrderByQuestion = new Map<string, string[]>()

  const registerMissing = (questionId: string, optionId: string | null) => {
    if (!optionId || byId.has(optionId) || synthesized.has(optionId)) return
    const existing = optionOrderByQuestion.get(questionId) ?? []
    optionOrderByQuestion.set(questionId, existing)
    if (!existing.includes(optionId)) existing.push(optionId)
    synthesized.set(optionId, {
      id: optionId,
      question_id: questionId,
      label: `Optie ${existing.length}`,
      description: 'Gemigreerde optie zonder bronlabel uit Supabase REST-export.',
      sort_order: existing.length - 1,
      created_at: new Date().toISOString(),
    })
  }

  for (const option of pollOptions) {
    const existing = optionOrderByQuestion.get(option.question_id) ?? []
    optionOrderByQuestion.set(option.question_id, existing)
    if (!existing.includes(option.id)) existing.push(option.id)
  }

  for (const vote of votes) {
    registerMissing(vote.question_id, vote.poll_option_id)
  }

  for (const question of questions) {
    if (question.question_type === 'poll') {
      registerMissing(question.id, question.winning_option_id)
    }
  }

  return [...pollOptions, ...synthesized.values()]
}

async function main() {
  const schemaSql = await readSql('neon-schema.sql')
  const postDataSql = await readSql('neon-post-data.sql')

  console.log('Fetching source data from Supabase REST...')
  const [
    userProfiles,
    groups,
    groupMembers,
    questions,
    pollOptions,
    votes,
    voteComments,
    appSettings,
    activityLog,
  ] = await Promise.all([
    fetchTable<UserProfile>('user_profiles', 'created_at.asc'),
    fetchTable<Group>('groups', 'created_at.asc'),
    fetchTable<GroupMember>('group_members', 'joined_at.asc'),
    fetchTable<Question>('questions', 'created_at.asc'),
    fetchTable<PollOption>('poll_options', 'created_at.asc'),
    fetchTable<Vote>('votes', 'created_at.asc'),
    fetchTable<VoteComment>('vote_comments', 'created_at.asc'),
    fetchTable<AppSetting>('app_settings', 'updated_at.asc').catch(() => []),
    fetchTable<ActivityLog>('activity_log', 'created_at.asc').catch(() => []),
  ])

  console.log(
    `Fetched ${userProfiles.length} users, ${groups.length} groups, ${questions.length} questions, ${votes.length} votes`
  )

  const resolvedPollOptions = buildPollOptions(questions, votes, pollOptions)
  const synthesizedOptionCount = resolvedPollOptions.length - pollOptions.length
  if (synthesizedOptionCount > 0) {
    console.warn(
      `Synthesized ${synthesizedOptionCount} poll option records because Supabase REST did not expose them.`
    )
  }

  console.log('Applying Neon schema...')
  await pool.query(schemaSql)

  console.log('Replacing target data...')
  await truncateAll()

  const client = await pool.connect()

  try {
    await client.query('begin')

    for (const profile of userProfiles) {
      await client.query(
        `
          insert into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
          values ($1, $2, $3, true, null, $4, $5)
        `,
        [profile.id, toUserName(profile), profile.email, profile.created_at, profile.updated_at]
      )
    }

    for (const profile of userProfiles) {
      await client.query(
        `
          insert into public.user_profiles (
            id, email, display_name, role, approval_status, created_at, updated_at, last_active_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          profile.id,
          profile.email,
          profile.display_name,
          profile.role,
          profile.approval_status,
          profile.created_at,
          profile.updated_at,
          profile.last_active_at,
        ]
      )
    }

    for (const group of groups) {
      await client.query(
        `
          insert into public.groups (
            id, name, description, email_subject_tag, required_votes, created_by, created_at, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          group.id,
          group.name,
          group.description,
          group.email_subject_tag,
          group.required_votes,
          group.created_by,
          group.created_at,
          group.updated_at,
        ]
      )
    }

    if (appSettings.length > 0) {
      await client.query('delete from public.app_settings')
      for (const setting of appSettings) {
        await client.query(
          `
            insert into public.app_settings (id, require_user_approval, updated_at, updated_by)
            values ($1, $2, $3, $4)
          `,
          [setting.id, setting.require_user_approval, setting.updated_at, setting.updated_by]
        )
      }
    }

    for (const membership of groupMembers) {
      await client.query(
        `
          insert into public.group_members (group_id, user_id, joined_at)
          values ($1, $2, $3)
        `,
        [membership.group_id, membership.user_id, membership.joined_at]
      )
    }

    for (const question of questions) {
      await client.query(
        `
          insert into public.questions (
            id, group_id, title, description, status, created_by, deadline, completed_at,
            completion_method, created_at, updated_at, decided_result, question_type,
            allow_multiple, winning_option_id
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15
          )
        `,
        [
          question.id,
          question.group_id,
          question.title,
          question.description,
          question.status,
          question.created_by,
          question.deadline,
          question.completed_at,
          question.completion_method,
          question.created_at,
          question.updated_at,
          question.decided_result,
          question.question_type,
          question.allow_multiple,
          question.winning_option_id,
        ]
      )
    }

    for (const option of resolvedPollOptions) {
      await client.query(
        `
          insert into public.poll_options (id, question_id, label, description, sort_order, created_at)
          values ($1, $2, $3, $4, $5, $6)
        `,
        [option.id, option.question_id, option.label, option.description, option.sort_order, option.created_at]
      )
    }

    for (const vote of votes) {
      await client.query(
        `
          insert into public.votes (id, question_id, user_id, vote, poll_option_id, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [vote.id, vote.question_id, vote.user_id, vote.vote, vote.poll_option_id, vote.created_at, vote.updated_at]
      )
    }

    for (const comment of voteComments) {
      await client.query(
        `
          insert into public.vote_comments (id, question_id, user_id, comment, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6)
        `,
        [comment.id, comment.question_id, comment.user_id, comment.comment, comment.created_at, comment.updated_at]
      )
    }

    for (const entry of activityLog) {
      await client.query(
        `
          insert into public.activity_log (id, user_id, action, entity_type, entity_id, metadata, created_at)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [entry.id, entry.user_id, entry.action, entry.entity_type, entry.entity_id, entry.metadata, entry.created_at]
      )
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }

  console.log('Enabling triggers and post-data guards...')
  await pool.query(postDataSql)

  const summary = await pool.query<{
    users: string
    groups: string
    questions: string
    votes: string
    comments: string
  }>(`
    select
      (select count(*)::text from public.user_profiles) as users,
      (select count(*)::text from public.groups) as groups,
      (select count(*)::text from public.questions) as questions,
      (select count(*)::text from public.votes) as votes,
      (select count(*)::text from public.vote_comments) as comments
  `)

  console.log('Migration complete:', summary.rows[0])
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end().catch(() => undefined)
  process.exitCode = 1
})
