-- Allow creating/updating vote comments before a user has cast a vote.
-- This supports "discussion first" workflows and matches the UI copy that
-- comments are independent from votes.

drop policy if exists "Vote comments insert own" on public.vote_comments;
create policy "Vote comments insert own" on public.vote_comments
  for insert to authenticated
  with check (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = vote_comments.question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = vote_comments.question_id
    )
  );

drop policy if exists "Vote comments update own" on public.vote_comments;
create policy "Vote comments update own" on public.vote_comments
  for update to authenticated
  using (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = vote_comments.question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = vote_comments.question_id
    )
  )
  with check (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = vote_comments.question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = vote_comments.question_id
    )
  );

drop policy if exists "Vote comments delete own" on public.vote_comments;
create policy "Vote comments delete own" on public.vote_comments
  for delete to authenticated
  using (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = vote_comments.question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = vote_comments.question_id
    )
  );

