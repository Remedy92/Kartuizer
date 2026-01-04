-- Add per-user comments for questions (included in vote results)

create table if not exists public.vote_comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vote_comments_unique_user_question unique (question_id, user_id),
  constraint vote_comments_nonempty check (char_length(trim(comment)) > 0),
  constraint vote_comments_maxlen check (char_length(comment) <= 2000)
);

create index if not exists idx_vote_comments_question on public.vote_comments (question_id);

-- Keep updated_at in sync
drop trigger if exists set_vote_comments_updated_at on public.vote_comments;
create trigger set_vote_comments_updated_at
  before update on public.vote_comments
  for each row execute procedure public.set_updated_at();

alter table public.vote_comments enable row level security;

drop policy if exists "Vote comments readable" on public.vote_comments;
create policy "Vote comments readable" on public.vote_comments
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_user_approved()
      and exists (
        select 1
        from public.group_members gm
        join public.questions q on q.group_id = gm.group_id
        where gm.user_id = auth.uid()
          and q.id = vote_comments.question_id
      )
    )
  );

drop policy if exists "Vote comments insert own" on public.vote_comments;
create policy "Vote comments insert own" on public.vote_comments
  for insert to authenticated
  with check (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = question_id
    )
    and exists (
      select 1
      from public.votes v
      where v.question_id = question_id
        and v.user_id = auth.uid()
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
      where q.id = question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = question_id
    )
    and exists (
      select 1
      from public.votes v
      where v.question_id = question_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1
      from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = question_id
    )
    and exists (
      select 1
      from public.votes v
      where v.question_id = question_id
        and v.user_id = auth.uid()
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
      where q.id = question_id
        and q.status = 'open'
    )
    and exists (
      select 1
      from public.group_members gm
      join public.questions q on q.group_id = gm.group_id
      where gm.user_id = auth.uid()
        and q.id = question_id
    )
    and exists (
      select 1
      from public.votes v
      where v.question_id = question_id
        and v.user_id = auth.uid()
    )
  );

