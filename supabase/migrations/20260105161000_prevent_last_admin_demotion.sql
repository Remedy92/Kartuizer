-- Prevent the platform from ending up with zero admins.
-- Blocks role updates or deletions that would remove the last remaining admin.

create or replace function public.prevent_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
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

drop trigger if exists prevent_last_admin_on_update on public.user_profiles;
create trigger prevent_last_admin_on_update
  before update on public.user_profiles
  for each row execute procedure public.prevent_last_admin();

drop trigger if exists prevent_last_admin_on_delete on public.user_profiles;
create trigger prevent_last_admin_on_delete
  before delete on public.user_profiles
  for each row execute procedure public.prevent_last_admin();

