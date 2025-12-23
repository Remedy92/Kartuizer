-- Add FK so PostgREST can embed voter profiles under votes
alter table public.votes
  drop constraint if exists votes_user_profiles_fkey;

alter table public.votes
  add constraint votes_user_profiles_fkey
  foreign key (user_id)
  references public.user_profiles(id)
  on delete cascade;
