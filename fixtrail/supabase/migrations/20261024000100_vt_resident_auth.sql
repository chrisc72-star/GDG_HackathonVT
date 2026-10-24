-- Virginia Tech residents sign in with a verified @vt.edu address and are
-- assigned one on-campus residence building during onboarding.

alter table public.buildings
  add column if not exists is_vt_campus boolean not null default false;

create unique index if not exists buildings_vt_campus_name_idx
  on public.buildings (lower(name)) where is_vt_campus;

with campus_residences(name) as (
  values
    ('Ambler Johnston (East)'),
    ('Ambler Johnston (West)'),
    ('Campbell (Main)'),
    ('Campbell (East)'),
    ('Cochrane'),
    ('The Creativity and Innovation District Residence Hall'),
    ('Eggleston (East)'),
    ('Eggleston (Main)'),
    ('Eggleston (West)'),
    ('Graduate Life Center at Donaldson Brown'),
    ('Harper'),
    ('Hillcrest'),
    ('Hoge Hall'),
    ('Johnson'),
    ('Miles'),
    ('New Hall West'),
    ('New Residence Hall East'),
    ('Newman'),
    ('O''Shaughnessy Hall'),
    ('Payne'),
    ('Pearson Hall East'),
    ('Pearson Hall West'),
    ('Peddrew-Yates'),
    ('Pritchard'),
    ('Slusher Hall'),
    ('Upper Quad Hall North'),
    ('Vawter'),
    ('Whitehurst Hall')
)
insert into public.buildings (name, address_line, city, state, is_demo, is_vt_campus)
select c.name, 'Virginia Tech campus', 'Blacksburg', 'VA', false, true
from campus_residences c
where not exists (
  select 1 from public.buildings b
  where lower(b.name) = lower(c.name) and b.is_vt_campus
);

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

