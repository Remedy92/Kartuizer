import './loadEnv.js'
import { query } from './db.js'

export async function getQuestionById(id: string) {
  const base = await query<Record<string, unknown>>(
    `
      select
        q.*,
        row_to_json(g) as groups
      from public.questions q
      join public.groups g on g.id = q.group_id
      where q.id = $1
    `,
    [id]
  )

  const question = base.rows[0]
  if (!question) return null

  const [votes, pollOptions, comments] = await Promise.all([
    query(
      `
        select
          v.*,
          row_to_json(up) as user_profiles
        from public.votes v
        left join public.user_profiles up on up.id = v.user_id
        where v.question_id = $1
        order by v.created_at asc
      `,
      [id]
    ),
    query(
      `
        select *
        from public.poll_options
        where question_id = $1
        order by sort_order asc, created_at asc
      `,
      [id]
    ),
    query(
      `
        select
          vc.*,
          row_to_json(up) as user_profiles
        from public.vote_comments vc
        left join public.user_profiles up on up.id = vc.user_id
        where vc.question_id = $1
        order by vc.created_at asc
      `,
      [id]
    ),
  ])

  return {
    ...question,
    votes: votes.rows,
    poll_options: pollOptions.rows,
    vote_comments: comments.rows,
  }
}

export async function listQuestions(whereClause?: string, params: unknown[] = []) {
  const rows = await query<{ id: string }>(
    `
      select q.id
      from public.questions q
      ${whereClause ? `where ${whereClause}` : ''}
      order by q.created_at desc
    `,
    params
  )

  const questions = await Promise.all(
    rows.rows.map((row: { id: string }) => getQuestionById(row.id))
  )
  return questions.filter(Boolean)
}
