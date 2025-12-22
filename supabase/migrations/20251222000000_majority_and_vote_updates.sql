-- Migration: Add server-side majority detection and allow vote updates
-- Features:
-- 1. decided_result column on questions (computed by trigger)
-- 2. Trigger to recalculate majority on vote changes
-- 3. UPDATE policy for votes (allows changing vote while question is open)
-- 4. updated_at column on votes

-- 1. Add decided_result column to questions
alter table public.questions
  add column if not exists decided_result text
  check (decided_result is null or decided_result in ('yes', 'no'));

-- 2. Function to calculate and update decided_result
-- Majority = more than half of required_votes (e.g., 2/3, 3/5)
-- Abstentions do NOT count - only yes and no votes matter
create or replace function public.update_question_decided_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_required_votes integer;
  v_yes_count integer;
  v_no_count integer;
  v_majority_threshold integer;
  v_new_result text;
begin
  -- Get the question_id from the vote
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  -- Get required_votes for this question's group
  select g.required_votes into v_required_votes
  from public.questions q
  join public.groups g on g.id = q.group_id
  where q.id = v_question_id;

  -- If no required_votes found, exit
  if v_required_votes is null then
    return coalesce(new, old);
  end if;

  -- Count yes and no votes (abstentions don't count)
  select
    count(*) filter (where vote = 'yes'),
    count(*) filter (where vote = 'no')
  into v_yes_count, v_no_count
  from public.votes
  where question_id = v_question_id;

  -- Calculate majority threshold (more than half)
  -- e.g., required_votes=5 -> threshold=3, required_votes=3 -> threshold=2
  v_majority_threshold := (v_required_votes / 2) + 1;

  -- Determine result
  if v_yes_count >= v_majority_threshold then
    v_new_result := 'yes';
  elsif v_no_count >= v_majority_threshold then
    v_new_result := 'no';
  else
    v_new_result := null;
  end if;

  -- Update question's decided_result
  update public.questions
  set decided_result = v_new_result
  where id = v_question_id;

  return coalesce(new, old);
end;
$$;

-- 3. Trigger on vote INSERT, UPDATE, DELETE
drop trigger if exists update_decided_result_on_vote on public.votes;
create trigger update_decided_result_on_vote
  after insert or update or delete on public.votes
  for each row execute procedure public.update_question_decided_result();

-- 4. Add UPDATE policy for votes
-- Users can update their own vote while the question is still open
drop policy if exists "Votes update own" on public.votes;
create policy "Votes update own" on public.votes
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
  );

-- 5. Add updated_at column to votes to track when votes were changed
alter table public.votes
  add column if not exists updated_at timestamptz;

-- 6. Function to auto-set updated_at on vote update
create or replace function public.set_vote_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 7. Trigger to set updated_at before update
drop trigger if exists set_votes_updated_at on public.votes;
create trigger set_votes_updated_at
  before update on public.votes
  for each row execute procedure public.set_vote_updated_at();

-- 8. Recalculate decided_result for all existing questions
-- This ensures existing data is consistent
do $$
declare
  q record;
  v_yes_count integer;
  v_no_count integer;
  v_majority_threshold integer;
  v_new_result text;
begin
  for q in
    select qu.id, g.required_votes
    from public.questions qu
    join public.groups g on g.id = qu.group_id
    where qu.status = 'open'
  loop
    -- Count yes and no votes
    select
      count(*) filter (where vote = 'yes'),
      count(*) filter (where vote = 'no')
    into v_yes_count, v_no_count
    from public.votes
    where question_id = q.id;

    -- Calculate majority threshold
    v_majority_threshold := (q.required_votes / 2) + 1;

    -- Determine result
    if v_yes_count >= v_majority_threshold then
      v_new_result := 'yes';
    elsif v_no_count >= v_majority_threshold then
      v_new_result := 'no';
    else
      v_new_result := null;
    end if;

    -- Update
    update public.questions
    set decided_result = v_new_result
    where id = q.id;
  end loop;
end;
$$;
