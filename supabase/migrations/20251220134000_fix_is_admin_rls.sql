-- Fix potential RLS recursion: public.is_admin() reads public.user_profiles.
-- Ensure the function bypasses RLS while checking the caller's role.

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
        and role in ('admin','super_admin')
    );
$$;

