-- Let a resident add existing Virginia Tech residence halls to their account.
-- The primary building_id on profiles remains the hall selected at onboarding.

create table if not exists public.resident_buildings (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, building_id)
);

create index if not exists resident_buildings_building_idx
  on public.resident_buildings (building_id);

alter table public.resident_buildings enable row level security;
grant select on public.resident_buildings to authenticated;
grant all on public.resident_buildings to service_role;
drop policy if exists residents_read_own_buildings on public.resident_buildings;
create policy residents_read_own_buildings
  on public.resident_buildings for select to authenticated
  using ((select auth.uid()) = user_id);

-- Existing residents keep access to their original hall.
insert into public.resident_buildings (user_id, building_id)
select user_id, building_id from public.profiles
on conflict (user_id, building_id) do nothing;

-- Any profile created in the future automatically starts with its primary hall.
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

revoke all on function public.add_primary_resident_building() from public, anon, authenticated;
drop trigger if exists profiles_add_primary_resident_building on public.profiles;
create trigger profiles_add_primary_resident_building
after insert on public.profiles
for each row execute function public.add_primary_resident_building();
