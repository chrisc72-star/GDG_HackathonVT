-- Team: Chris and Shruti
-- GDG Hackathon 2026
-- This migration adds tenant and landlord identity columns and public-visibility state to existing report tables. It also refreshes the PostgREST schema cache.

-- Keep legacy installations aligned with the report fields used by SupabaseStore.
alter table public.reports
  add column if not exists tenant_name text not null default '',
  add column if not exists landlord_name text not null default '',
  add column if not exists is_public boolean not null default false;

-- Make PostgREST see newly added columns immediately.
notify pgrst, 'reload schema';
