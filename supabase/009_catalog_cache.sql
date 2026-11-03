-- Shared public music metadata. Access is restricted to the server.
begin;
create table if not exists public.catalog_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);
create index if not exists catalog_cache_expiry on public.catalog_cache (expires_at);
alter table public.catalog_cache enable row level security;
revoke all on public.catalog_cache from anon, authenticated;
grant select, insert, update, delete on public.catalog_cache to service_role;
-- Expired rows can be removed safely; run periodically in Supabase SQL or a scheduled job.
delete from public.catalog_cache where expires_at < now();
commit;
