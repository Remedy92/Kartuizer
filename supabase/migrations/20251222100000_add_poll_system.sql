-- Migration: Add poll system
-- Features:
-- 1. question_type column to distinguish standard votes from polls
-- 2. allow_multiple column for multi-choice polls
-- 3. poll_options table for poll choices
-- 4. poll_option_id on votes for poll responses
-- 5. Trigger to calculate poll winner (plurality)
-- 6. RLS policies for poll_options

-- 1. Add question_type to questions (standard = yes/no/abstain, poll = custom options)
alter table public.questions
  add column if not exists question_type text not null default 'standard'
  check (question_type in ('standard', 'poll'));

-- 2. Add allow_multiple for multi-choice polls
alter table public.questions
  add column if not exists allow_multiple boolean not null default false;

-- 3. Add winning_option_id to store poll winner
alter table public.questions
  add column if not exists winning_option_id uuid;

-- 4. Create poll_options table
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index for efficient lookups
create index if not exists idx_poll_options_question on public.poll_options(question_id);

-- 5. Add poll_option_id to votes (null for standard votes, set for poll votes)
alter table public.votes
  add column if not exists poll_option_id uuid references public.poll_options(id) on delete cascade;

-- 6. Update votes constraint to handle both vote types
-- For standard questions: vote must be set, poll_option_id must be null
-- For poll questions: poll_option_id must be set, vote can be null
alter table public.votes
  drop constraint if exists votes_vote_check;

-- Add new flexible check
alter table public.votes
  add constraint votes_type_check check (
    -- Either it's a standard vote (vote is set, no option)
    (vote in ('yes', 'no', 'abstain') and poll_option_id is null)
    or
    -- Or it's a poll vote (option is set, vote can be null)
    (poll_option_id is not null)
  );

-- 7. Add foreign key for winning_option_id
alter table public.questions
  add constraint fk_winning_option
  foreign key (winning_option_id)
  references public.poll_options(id)
  on delete set null;

-- 8. RLS policies for poll_options
alter table public.poll_options enable row level security;

-- Anyone authenticated can view poll options
create policy "Poll options viewable by authenticated users"
  on public.poll_options for select
  to authenticated
  using (true);

-- Only admins can create/update/delete poll options
create policy "Poll options admin insert"
  on public.poll_options for insert
  to authenticated
  with check (public.is_admin());

create policy "Poll options admin update"
  on public.poll_options for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Poll options admin delete"
  on public.poll_options for delete
  to authenticated
  using (public.is_admin());

-- 9. Function to calculate poll winner (plurality - highest vote count wins)
create or replace function public.update_poll_winner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_question_type text;
  v_winning_option uuid;
  v_max_votes integer;
begin
  -- Get the question_id from the vote
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  -- Check if this is a poll question
  select question_type into v_question_type
  from public.questions
  where id = v_question_id;

  -- Only process poll questions
  if v_question_type != 'poll' then
    return coalesce(new, old);
  end if;

  -- Find the option with the most votes (plurality)
  select poll_option_id, count(*) as vote_count
  into v_winning_option, v_max_votes
  from public.votes
  where question_id = v_question_id
    and poll_option_id is not null
  group by poll_option_id
  order by count(*) desc, poll_option_id -- tie-breaker: first option by id
  limit 1;

  -- Update the winning_option_id
  update public.questions
  set winning_option_id = v_winning_option
  where id = v_question_id;

  return coalesce(new, old);
end;
$$;

-- 10. Trigger to update poll winner on vote changes
drop trigger if exists update_poll_winner_on_vote on public.votes;
create trigger update_poll_winner_on_vote
  after insert or update or delete on public.votes
  for each row execute procedure public.update_poll_winner();

-- 11. Update the existing close_question_if_threshold_reached function
-- to also handle poll questions
create or replace function public.close_question_if_threshold_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_votes integer;
  v_required_votes integer;
  v_question_type text;
begin
  -- Get required votes and question type for this question's group
  select g.required_votes, q.question_type
  into v_required_votes, v_question_type
  from public.questions q
  join public.groups g on g.id = q.group_id
  where q.id = new.question_id;

  -- Count total unique voters (works for both standard and poll questions)
  if v_question_type = 'poll' then
    -- For polls, count distinct users who voted
    select count(distinct user_id) into v_total_votes
    from public.votes
    where question_id = new.question_id;
  else
    -- For standard questions, count total votes
    select count(*) into v_total_votes
    from public.votes
    where question_id = new.question_id;
  end if;

  -- Close if threshold reached
  if v_total_votes >= v_required_votes then
    update public.questions
    set
      status = 'completed',
      completion_method = 'threshold',
      completed_at = now()
    where id = new.question_id
      and status = 'open';
  end if;

  return new;
end;
$$;

-- 12. For multi-choice polls, we need a unique constraint per user per option
-- But allow multiple options per user if allow_multiple is true
-- This is handled in application logic, not database constraint

-- 13. Add index for efficient vote counting by option
create index if not exists idx_votes_poll_option on public.votes(poll_option_id) where poll_option_id is not null;

-- 14. Grant permissions
grant select on public.poll_options to authenticated;
grant insert, update, delete on public.poll_options to authenticated;
