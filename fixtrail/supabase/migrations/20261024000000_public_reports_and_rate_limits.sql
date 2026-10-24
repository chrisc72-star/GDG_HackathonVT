-- Shared rolling-window counters used by the photo-analysis endpoint.
-- The API passes only a SHA-256 device/IP identifier, never a raw token or IP.
alter table public.reports
  add column if not exists is_public boolean not null default false;

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
