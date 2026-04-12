create extension if not exists pgcrypto;

create table if not exists "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create table if not exists "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

create table if not exists public.user_profiles (
  id text primary key references "user" (id) on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  approval_status text check (approval_status is null or approval_status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  email_subject_tag text,
  required_votes integer not null default 0,
  created_by text references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id text not null references public.user_profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'completed')),
  created_by text references public.user_profiles (id) on delete set null,
  deadline timestamptz,
  completed_at timestamptz,
  completion_method text check (completion_method in ('manual', 'threshold', 'deadline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_result text check (decided_result is null or decided_result in ('yes', 'no')),
  question_type text not null default 'standard' check (question_type in ('standard', 'poll')),
  allow_multiple boolean not null default false,
  winning_option_id uuid
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id text not null references public.user_profiles (id) on delete cascade,
  vote text check (vote in ('yes', 'no', 'abstain')),
  poll_option_id uuid references public.poll_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint votes_type_check check (
    (vote in ('yes', 'no', 'abstain') and poll_option_id is null)
    or (poll_option_id is not null)
  )
);

create table if not exists public.vote_comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id text not null references public.user_profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vote_comments_unique_user_question unique (question_id, user_id),
  constraint vote_comments_nonempty check (char_length(trim(comment)) > 0),
  constraint vote_comments_maxlen check (char_length(comment) <= 2000)
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  require_user_approval boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text references public.user_profiles (id) on delete set null
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.user_profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_status on public.questions (status);
create index if not exists idx_questions_group on public.questions (group_id);
create index if not exists idx_questions_created_by on public.questions (created_by);
create index if not exists idx_questions_winning_option on public.questions (winning_option_id);
create index if not exists idx_votes_question on public.votes (question_id);
create index if not exists idx_votes_user on public.votes (user_id);
create index if not exists idx_votes_poll_option on public.votes (poll_option_id) where poll_option_id is not null;
create index if not exists idx_group_members_user on public.group_members (user_id);
create index if not exists idx_poll_options_question on public.poll_options (question_id);
create index if not exists idx_vote_comments_question on public.vote_comments (question_id);
create index if not exists idx_app_settings_updated_by on public.app_settings (updated_by);
create index if not exists idx_activity_log_created_at on public.activity_log (created_at desc);
create index if not exists idx_user_profiles_approval_pending
  on public.user_profiles (approval_status)
  where approval_status = 'pending';

create unique index if not exists votes_unique_standard
  on public.votes (question_id, user_id)
  where poll_option_id is null;

create unique index if not exists votes_unique_poll_option
  on public.votes (question_id, user_id, poll_option_id)
  where poll_option_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_group_member_count()
returns trigger
language plpgsql
as $$
declare
  v_group_id uuid;
  v_count integer;
begin
  if tg_op = 'DELETE' then
    v_group_id := old.group_id;
  else
    v_group_id := new.group_id;
  end if;

  select count(*) into v_count
  from public.group_members
  where group_id = v_group_id;

  update public.groups
  set required_votes = v_count,
      updated_at = now()
  where id = v_group_id;

  return null;
end;
$$;

create or replace function public.close_question_if_threshold_reached()
returns trigger
language plpgsql
as $$
declare
  v_total_votes integer;
  v_required_votes integer;
  v_question_type text;
begin
  select g.required_votes, q.question_type
  into v_required_votes, v_question_type
  from public.questions q
  join public.groups g on g.id = q.group_id
  where q.id = new.question_id;

  if v_question_type = 'poll' then
    select count(distinct user_id) into v_total_votes
    from public.votes
    where question_id = new.question_id;
  else
    select count(*) into v_total_votes
    from public.votes
    where question_id = new.question_id;
  end if;

  if v_total_votes >= coalesce(v_required_votes, 0) then
    update public.questions
    set status = 'completed',
        completion_method = 'threshold',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = new.question_id
      and status = 'open';
  end if;

  return new;
end;
$$;

create or replace function public.update_question_decided_result()
returns trigger
language plpgsql
as $$
declare
  v_question_id uuid;
  v_required_votes integer;
  v_yes_count integer;
  v_no_count integer;
  v_majority_threshold integer;
  v_new_result text;
begin
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  select g.required_votes into v_required_votes
  from public.questions q
  join public.groups g on g.id = q.group_id
  where q.id = v_question_id;

  select
    count(*) filter (where vote = 'yes'),
    count(*) filter (where vote = 'no')
  into v_yes_count, v_no_count
  from public.votes
  where question_id = v_question_id;

  v_majority_threshold := (coalesce(v_required_votes, 0) / 2) + 1;

  if v_yes_count >= v_majority_threshold and v_majority_threshold > 0 then
    v_new_result := 'yes';
  elsif v_no_count >= v_majority_threshold and v_majority_threshold > 0 then
    v_new_result := 'no';
  else
    v_new_result := null;
  end if;

  update public.questions
  set decided_result = v_new_result,
      updated_at = now()
  where id = v_question_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.update_poll_winner()
returns trigger
language plpgsql
as $$
declare
  v_question_id uuid;
  v_question_type text;
  v_winning_option uuid;
begin
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  select question_type into v_question_type
  from public.questions
  where id = v_question_id;

  if v_question_type != 'poll' then
    return coalesce(new, old);
  end if;

  select poll_option_id
  into v_winning_option
  from public.votes
  where question_id = v_question_id
    and poll_option_id is not null
  group by poll_option_id
  order by count(*) desc, poll_option_id
  limit 1;

  update public.questions
  set winning_option_id = v_winning_option,
      updated_at = now()
  where id = v_question_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_question_edits_after_votes()
returns trigger
language plpgsql
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

create or replace function public.prevent_last_admin()
returns trigger
language plpgsql
as $$
declare
  v_other_admins integer;
begin
  if tg_op = 'UPDATE' then
    if old.role = 'admin' and new.role <> 'admin' then
      select count(*) into v_other_admins
      from public.user_profiles
      where role = 'admin'
        and id <> old.id;

      if v_other_admins = 0 then
        raise exception 'U kan de laatste beheerder niet omzetten naar lid.' using errcode = 'P0001';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      select count(*) into v_other_admins
      from public.user_profiles
      where role = 'admin'
        and id <> old.id;

      if v_other_admins = 0 then
        raise exception 'U kan de laatste beheerder niet verwijderen.' using errcode = 'P0001';
      end if;
    end if;

    return old;
  end if;

  return coalesce(new, old);
end;
$$;

insert into public.app_settings (require_user_approval)
select true
where not exists (select 1 from public.app_settings);
