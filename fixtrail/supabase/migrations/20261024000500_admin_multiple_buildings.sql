-- Allow multiple residence hall memberships only through the server-side
-- administrator endpoint. Regular residents still receive only their profile hall.
drop index if exists public.resident_buildings_one_hall_per_user_idx;

create or replace function public.add_primary_resident_building()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.resident_buildings (user_id, building_id)
  values (new.user_id, new.building_id)
  on conflict (user_id, building_id) do nothing;
  return new;
end;
$$;
