-- Migration: Switch to dynamic threshold system
-- Description: 
-- 1. Automate maintenance of groups.required_votes based on group_members count
-- 2. This effectively makes the "drempel" dynamic (equal to member count)
-- 3. We keep the column for performance/compatibility, but it's now system-managed

-- 1. Create function to sync member count to required_votes
create or replace function public.sync_group_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
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

  -- Count effective members (excluding potentially disabled users if we had them, but for now count all)
  select count(*) into v_count
  from public.group_members
  where group_id = v_group_id;

  -- Update the group
  -- If count is 0, we set to 1 to avoid division by zero errors in logic, or 0? 
  -- Logic uses (votes / required), if required is 0 => division by zero.
  -- Let's set minimum to 0, but handle in logic. Actually 0 required means 0 votes closes it.
  update public.groups
  set required_votes = v_count
  where id = v_group_id;

  return null;
end;
$$;

-- 2. Create trigger on group_members
drop trigger if exists sync_member_count_on_change on public.group_members;
create trigger sync_member_count_on_change
  after insert or update or delete on public.group_members
  for each row execute procedure public.sync_group_member_count();

-- 3. Run synchronization for all existing groups immediately
do $$
declare
  g record;
  v_count integer;
begin
  for g in select id from public.groups loop
    select count(*) into v_count
    from public.group_members
    where group_id = g.id;

    update public.groups
    set required_votes = v_count
    where id = g.id;
  end loop;
end;
$$;
