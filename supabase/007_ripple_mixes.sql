-- Independent mix storage: no Spotify account or tokens required.
begin;
create table if not exists public.ripple_mixes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  mix jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ripple_mixes enable row level security;
revoke all on public.ripple_mixes from anon, authenticated;
grant select, insert, update, delete on public.ripple_mixes to service_role;
commit;
