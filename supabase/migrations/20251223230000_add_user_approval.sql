-- Add user approval system
-- New users require admin approval before accessing the platform

-- 1. Add approval_status column to user_profiles
-- Values: 'pending' (awaiting approval), 'approved' (access granted), NULL (legacy/grandfathered users)
alter table public.user_profiles
add column if not exists approval_status text
check (approval_status is null or approval_status in ('pending', 'approved'));

-- Create index for efficient querying of pending users
create index if not exists idx_user_profiles_approval_pending
on public.user_profiles (approval_status)
where approval_status = 'pending';

-- 2. Create app_settings table for platform configuration
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  require_user_approval boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

-- Enable RLS on app_settings
alter table public.app_settings enable row level security;

-- Everyone can read settings
create policy "App settings readable" on public.app_settings
  for select to authenticated
  using (true);

-- Only admins can update settings
create policy "App settings update" on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Insert default settings row (approval required by default)
insert into public.app_settings (require_user_approval)
values (true)
on conflict do nothing;

-- 3. Update handle_new_user() trigger to set approval_status
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  require_approval boolean;
begin
  -- Check if approval is required from settings
  select coalesce(
    (select require_user_approval from public.app_settings limit 1),
    true
  ) into require_approval;

  insert into public.user_profiles (id, email, role, approval_status)
  values (
    new.id,
    new.email,
    'member',
    case when require_approval then 'pending' else 'approved' end
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

-- 4. Create helper function to check if user is approved
create or replace function public.is_user_approved()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and (
        approval_status is null  -- Legacy users (grandfathered)
        or approval_status = 'approved'
        or role = 'admin'  -- Admins always have access
      )
  );
$$;

-- 5. Update RLS policies to check approval status for content access
-- Groups: only approved users can see groups
drop policy if exists "Groups readable" on public.groups;
create policy "Groups readable" on public.groups
  for select to authenticated
  using (public.is_user_approved() or public.is_admin());

-- Group members: only approved users can see group members
drop policy if exists "Group members readable" on public.group_members;
create policy "Group members readable" on public.group_members
  for select to authenticated
  using (public.is_user_approved() or public.is_admin());

-- Questions: only approved users can see questions
drop policy if exists "Questions readable" on public.questions;
create policy "Questions readable" on public.questions
  for select to authenticated
  using (public.is_user_approved() or public.is_admin());

-- Votes: only approved users can see and cast votes
drop policy if exists "Votes readable" on public.votes;
create policy "Votes readable" on public.votes
  for select to authenticated
  using (public.is_user_approved() or public.is_admin());

drop policy if exists "Votes insert own" on public.votes;
create policy "Votes insert own" on public.votes
  for insert to authenticated
  with check (
    public.is_user_approved()
    and user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and q.status = 'open'
    )
  );

-- Poll options: only approved users can see poll options
drop policy if exists "Poll options readable" on public.poll_options;
create policy "Poll options readable" on public.poll_options
  for select to authenticated
  using (public.is_user_approved() or public.is_admin());

-- 6. Add policy for admins to delete user profiles (for rejecting users)
drop policy if exists "Admin can delete profiles" on public.user_profiles;
create policy "Admin can delete profiles" on public.user_profiles
  for delete to authenticated
  using (public.is_admin());
