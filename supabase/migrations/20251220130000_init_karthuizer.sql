-- Kartuizer voting platform schema (public)
-- Apply this in the Kartuizer Supabase project (project ref: yzrvfpitavjtvhbdshjh)

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'member' check (role in ('member','admin','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  required_votes integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('member','chair','admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','completed')),
  group_id uuid not null references public.groups on delete restrict,
  deadline timestamptz,
  completed_at timestamptz,
  completion_method text check (completion_method in ('manual','threshold','deadline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  vote text not null check (vote in ('yes','no','abstain')),
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('new_question','vote_reminder','question_completed','deadline_approaching')),
  title text not null,
  message text,
  question_id uuid references public.questions on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_status on public.questions (status);
create index if not exists idx_questions_group on public.questions (group_id);
create index if not exists idx_votes_question on public.votes (question_id);
create index if not exists idx_votes_user on public.votes (user_id);
create index if not exists idx_group_members_user on public.group_members (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role)
  values (new.id, new.email, 'member')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role in ('admin','super_admin')
  );
$$;

create or replace function public.close_question_if_threshold_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_votes integer;
  current_votes integer;
begin
  select g.required_votes
    into required_votes
  from public.questions q
  join public.groups g on g.id = q.group_id
  where q.id = new.question_id;

  if required_votes is null then
    return new;
  end if;

  select count(*)
    into current_votes
  from public.votes
  where question_id = new.question_id;

  if current_votes >= required_votes then
    update public.questions
      set status = 'completed',
          completion_method = 'threshold',
          completed_at = now(),
          updated_at = now()
    where id = new.question_id
      and status = 'open';
  end if;

  return new;
end;
$$;

create or replace function public.close_expired_questions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.questions
    set status = 'completed',
        completion_method = 'deadline',
        completed_at = now(),
        updated_at = now()
  where status = 'open'
    and deadline is not null
    and deadline <= now();
end;
$$;

alter table public.user_profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

-- user_profiles policies
drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "Users can insert own profile" on public.user_profiles
  for insert to authenticated
  with check (id = auth.uid());
create policy "Users can update own profile" on public.user_profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- groups policies
drop policy if exists "Groups readable" on public.groups;
drop policy if exists "Groups insert" on public.groups;
drop policy if exists "Groups update" on public.groups;
drop policy if exists "Groups delete" on public.groups;
create policy "Groups readable" on public.groups
  for select to authenticated
  using (true);
create policy "Groups insert" on public.groups
  for insert to authenticated
  with check (public.is_admin());
create policy "Groups update" on public.groups
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "Groups delete" on public.groups
  for delete to authenticated
  using (public.is_admin());

-- group_members policies
drop policy if exists "Group members readable" on public.group_members;
drop policy if exists "Group members insert" on public.group_members;
drop policy if exists "Group members update" on public.group_members;
drop policy if exists "Group members delete" on public.group_members;
create policy "Group members readable" on public.group_members
  for select to authenticated
  using (true);
create policy "Group members insert" on public.group_members
  for insert to authenticated
  with check (public.is_admin());
create policy "Group members update" on public.group_members
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "Group members delete" on public.group_members
  for delete to authenticated
  using (public.is_admin());

-- questions policies
drop policy if exists "Questions readable" on public.questions;
drop policy if exists "Questions insert" on public.questions;
drop policy if exists "Questions update" on public.questions;
drop policy if exists "Questions delete" on public.questions;
create policy "Questions readable" on public.questions
  for select to authenticated
  using (true);
create policy "Questions insert" on public.questions
  for insert to authenticated
  with check (public.is_admin());
create policy "Questions update" on public.questions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "Questions delete" on public.questions
  for delete to authenticated
  using (public.is_admin());

-- votes policies
drop policy if exists "Votes readable" on public.votes;
drop policy if exists "Votes insert own" on public.votes;
create policy "Votes readable" on public.votes
  for select to authenticated
  using (true);
create policy "Votes insert own" on public.votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
  );

-- notifications policies
drop policy if exists "Notifications readable" on public.notifications;
drop policy if exists "Notifications insert" on public.notifications;
create policy "Notifications readable" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "Notifications insert" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- activity_log policies
drop policy if exists "Activity log readable" on public.activity_log;
drop policy if exists "Activity log insert" on public.activity_log;
create policy "Activity log readable" on public.activity_log
  for select to authenticated
  using (public.is_admin());
create policy "Activity log insert" on public.activity_log
  for insert to authenticated
  with check (auth.uid() is not null);

-- triggers
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
  before update on public.groups
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
  before update on public.questions
  for each row execute procedure public.set_updated_at();

drop trigger if exists close_question_on_vote on public.votes;
create trigger close_question_on_vote
  after insert on public.votes
  for each row execute procedure public.close_question_if_threshold_reached();

