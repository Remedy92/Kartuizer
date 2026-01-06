-- Add a stable email subject tag per group for Gmail routing.
-- Used to prefix email subjects as: [<tag>] <question-title>

alter table public.groups
  add column if not exists email_subject_tag text;

comment on column public.groups.email_subject_tag is
  'Stable short tag used in email subjects for Gmail routing. Prefer not to change once set.';

