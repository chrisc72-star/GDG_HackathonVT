-- Team: Chris and Shruti
-- GDG Hackathon 2026
-- This migration restores the one-hall limit for ordinary resident accounts and removes extra memberships from profiles. It reinstates the corresponding uniqueness rule and membership trigger.

-- Residents may access only the hall selected on their profile.
-- Remove extra hall memberships created by the previous multi-hall feature.
delete from public.resident_buildings rb
using public.profiles p
where rb.user_id = p.user_id
  and rb.building_id <> p.building_id;

create unique index if not exists resident_buildings_one_hall_per_user_idx
  on public.resident_buildings (user_id);

create or replace function public.add_primary_resident_building()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.resident_buildings (user_id, building_id)
  values (new.user_id, new.building_id)
  on conflict (user_id) do update set building_id = excluded.building_id;
  return new;
end;
$$;

revoke all on function public.add_primary_resident_building() from public, anon, authenticated;
drop trigger if exists profiles_add_primary_resident_building on public.profiles;
create trigger profiles_add_primary_resident_building
after insert or update of building_id on public.profiles
for each row execute function public.add_primary_resident_building();
