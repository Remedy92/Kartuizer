-- Convert any super_admins to admin
update public.user_profiles
set role = 'admin'
where role = 'super_admin';

-- Update the check constraint
-- First we need to find the name of the constraint if it varies, but based on init it is likely standard or we can just drop it if we know the table.
-- In PostgreSQL, we can use the following to drop and recreate.
alter table public.user_profiles
drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
add constraint user_profiles_role_check
check (role in ('member', 'admin'));

-- Update is_admin function to remove super_admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;
