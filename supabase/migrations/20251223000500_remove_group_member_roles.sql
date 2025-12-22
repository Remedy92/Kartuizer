-- Remove role column from group_members
alter table public.group_members
drop constraint if exists group_members_role_check;

alter table public.group_members
drop column if exists role;

-- Note: In the handle_new_user and other functions/policies, 
-- we only need to ensure they don't depend on group_members.role.
-- Checking is_admin() which we just updated, it doesn't use group_members.
