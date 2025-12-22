-- Fix poll vote compatibility with nullable vote column and multi-choice polls

-- Allow poll votes with vote = null
alter table public.votes
  alter column vote drop not null;

-- Drop legacy unique constraint that prevents multi-choice polls
alter table public.votes
  drop constraint if exists votes_question_id_user_id_key;

-- One standard vote per user per question
create unique index if not exists votes_unique_standard
  on public.votes (question_id, user_id)
  where poll_option_id is null;

-- One poll vote per option per user per question
create unique index if not exists votes_unique_poll_option
  on public.votes (question_id, user_id, poll_option_id)
  where poll_option_id is not null;
