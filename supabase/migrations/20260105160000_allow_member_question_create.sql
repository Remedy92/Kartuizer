-- Allow approved group members to create questions and polls
-- Also prevent incomplete poll creation by allowing creators to delete their own drafts (no votes yet)

-- 1) Ensure questions.created_by is populated for authenticated inserts
create or replace function public.set_created_by()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_questions_created_by on public.questions;
create trigger set_questions_created_by
  before insert on public.questions
  for each row execute procedure public.set_created_by();

-- 2) Questions: allow admins OR approved members of the target group to insert
drop policy if exists "Questions insert" on public.questions;
create policy "Questions insert" on public.questions
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_user_approved()
      and (created_by is null or created_by = auth.uid())
      and exists (
        select 1
        from public.group_members gm
        where gm.group_id = group_id
          and gm.user_id = auth.uid()
      )
    )
  );

-- 3) Questions: allow admins OR creators to delete drafts (open + no votes)
drop policy if exists "Questions delete" on public.questions;
create policy "Questions delete" on public.questions
  for delete to authenticated
  using (
    public.is_admin()
    or (
      public.is_user_approved()
      and created_by = auth.uid()
      and status = 'open'
      and not exists (
        select 1
        from public.votes v
        where v.question_id = id
      )
    )
  );

-- 4) Poll options: remove legacy policy that bypassed approval
drop policy if exists "Poll options viewable by authenticated users" on public.poll_options;

-- 5) Poll options: allow admins OR poll creators (who are members of the group) to insert options before votes exist
drop policy if exists "Poll options admin insert" on public.poll_options;
create policy "Poll options insert" on public.poll_options
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_user_approved()
      and exists (
        select 1
        from public.questions q
        join public.group_members gm on gm.group_id = q.group_id
        where q.id = poll_options.question_id
          and q.created_by = auth.uid()
          and q.question_type = 'poll'
          and q.status = 'open'
          and gm.user_id = auth.uid()
      )
      and not exists (
        select 1
        from public.votes v
        where v.question_id = poll_options.question_id
      )
    )
  );

