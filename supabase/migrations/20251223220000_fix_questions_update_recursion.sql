-- Fix recursive RLS on questions by removing vote-count policy and enforcing immutability via trigger.

-- The previous policy queried votes from questions UPDATE, which can recurse when votes triggers update questions.

drop policy if exists "Questions are immutable after first vote" on public.questions;

create or replace function public.prevent_question_edits_after_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.votes v where v.question_id = old.id) then
    if (new.title is distinct from old.title)
      or (new.description is distinct from old.description)
      or (new.deadline is distinct from old.deadline)
      or (new.question_type is distinct from old.question_type)
      or (new.allow_multiple is distinct from old.allow_multiple)
      or (new.group_id is distinct from old.group_id) then
      raise exception 'Question cannot be edited after votes exist';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_question_edits_after_votes on public.questions;
create trigger prevent_question_edits_after_votes
before update on public.questions
for each row execute procedure public.prevent_question_edits_after_votes();
