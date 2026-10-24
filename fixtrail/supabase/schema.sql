-- FixTrail schema. Run once in the Supabase SQL editor.
-- All access goes through the Next.js server using the service-role key.
-- RLS is enabled with NO public policies, so the anon key can read nothing.

create extension if not exists pgcrypto;

create table if not exists buildings (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address_line text not null default '',
  city         text not null default '',
  state        text not null default 'VA',
  is_demo      boolean not null default false,
  is_vt_campus boolean not null default false,
  created_at   timestamptz not null default now()
);

create unique index if not exists buildings_vt_campus_name_idx
  on buildings (lower(name)) where is_vt_campus;

create table if not exists reports (
  id               uuid primary key,
  building_id      uuid not null references buildings(id) on delete cascade,
  reporter_hash    text not null,              -- SHA-256 of the Supabase user ID; raw ID never stored
  tenant_name      text not null default '',   -- private to the reporter
  landlord_name    text not null default '',   -- private to the reporter
  unit_label       text not null default '',   -- never included in public report views
  description      text not null default '',   -- public only when is_public is true
  is_public        boolean not null default false,
  category         text not null,
  severity         text not null check (severity in ('minor','standard','urgent','emergency')),
  ai_category      text,
  ai_severity      text,
  ai_confidence    real,
  visible_evidence text not null default '',
  flags            text[] not null default '{}',
  tenant_edited    boolean not null default false,
  ai_provider      text,
  ai_model         text,
  status           text not null default 'open' check (status in ('open','acknowledged','resolved')),
  reported_at      timestamptz not null default now(),
  due_at           timestamptz not null,
  acknowledged_at  timestamptz,
  resolved_at      timestamptz,
  photo_path       text
);

alter table public.reports add column if not exists tenant_name text not null default '';
alter table public.reports add column if not exists landlord_name text not null default '';
alter table public.reports add column if not exists is_public boolean not null default false;

create index if not exists reports_building_idx on reports (building_id);
create index if not exists reports_reporter_idx on reports (reporter_hash);

alter table buildings enable row level security;
alter table reports   enable row level security;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email ~* '^[^@]+@vt[.]edu$'),
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  room_number text not null check (length(trim(room_number)) between 1 and 30),
  building_id uuid not null references public.buildings(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
drop policy if exists residents_read_own_profile on public.profiles;
create policy residents_read_own_profile
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

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
after insert or update of building_id on public.profiles
for each row execute function public.add_primary_resident_building();

with campus_residences(name) as (
  values
    ('Ambler Johnston (East)'), ('Ambler Johnston (West)'),
    ('Campbell (Main)'), ('Campbell (East)'), ('Cochrane'),
    ('The Creativity and Innovation District Residence Hall'),
    ('Eggleston (East)'), ('Eggleston (Main)'), ('Eggleston (West)'),
    ('Graduate Life Center at Donaldson Brown'), ('Harper'), ('Hillcrest'),
    ('Hoge Hall'), ('Johnson'), ('Miles'), ('New Hall West'),
    ('New Residence Hall East'), ('Newman'), ('O''Shaughnessy Hall'),
    ('Payne'), ('Pearson Hall East'), ('Pearson Hall West'), ('Peddrew-Yates'),
    ('Pritchard'), ('Slusher Hall'), ('Upper Quad Hall North'), ('Vawter'),
    ('Whitehurst Hall')
)
insert into public.buildings (name, address_line, city, state, is_demo, is_vt_campus)
select c.name, 'Virginia Tech campus', 'Blacksburg', 'VA', false, true
from campus_residences c
where not exists (
  select 1 from public.buildings b
  where lower(b.name) = lower(c.name) and b.is_vt_campus
);

-- Private storage bucket; the app serves consented public report photos through
-- its server endpoint so the bucket itself remains inaccessible to anon users.
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;

-- Shared rolling-window counters used by photo analysis in serverless deployments.
create table if not exists public.fixtrail_rate_limit_hits (
  key text not null,
  hit_at timestamptz not null default now()
);

create index if not exists fixtrail_rate_limit_hits_key_time_idx
  on public.fixtrail_rate_limit_hits (key, hit_at);

alter table public.fixtrail_rate_limit_hits enable row level security;

create or replace function public.consume_fixtrail_rate_limit(
  p_key text,
  p_max_hits integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  hit_count integer;
  window_start timestamptz;
begin
  if p_key is null or p_max_hits < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate-limit arguments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_key, 0));
  window_start := now() - make_interval(secs => p_window_seconds);

  delete from public.fixtrail_rate_limit_hits
  where key = p_key and hit_at <= window_start;

  select count(*) into hit_count
  from public.fixtrail_rate_limit_hits
  where key = p_key and hit_at > window_start;

  if hit_count >= p_max_hits then
    return false;
  end if;

  insert into public.fixtrail_rate_limit_hits (key, hit_at) values (p_key, now());
  return true;
end;
$$;

revoke all on table public.fixtrail_rate_limit_hits from public, anon, authenticated;
grant all on table public.fixtrail_rate_limit_hits to service_role;
revoke all on function public.consume_fixtrail_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_fixtrail_rate_limit(text, integer, integer) to service_role;
