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
  created_at   timestamptz not null default now()
);

create table if not exists reports (
  id               uuid primary key,
  building_id      uuid not null references buildings(id) on delete cascade,
  reporter_hash    text not null,              -- SHA-256 of the device token; raw token never stored
  unit_label       text not null default '',   -- private to the reporter
  description      text not null default '',   -- private to the reporter
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

create index if not exists reports_building_idx on reports (building_id);
create index if not exists reports_reporter_idx on reports (reporter_hash);

alter table buildings enable row level security;
alter table reports   enable row level security;

-- Private storage bucket for photos (served only via the server / signed access).
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;
