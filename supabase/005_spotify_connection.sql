begin;
-- Server-only tables: never expose OAuth tokens through the browser client.
create table public.spotify_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credentials text not null,
  spotify_user_id text not null,
  display_name text not null default '',
  preferences jsonb not null default '{}',
  mix jsonb,
  updated_at timestamptz not null default now()
);
create table public.spotify_oauth_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_hash text not null unique,
  browser_hash text not null,
  verifier text not null,
  expires_at timestamptz not null
);
alter table public.spotify_connections enable row level security;
alter table public.spotify_oauth_states enable row level security;
revoke all on public.spotify_connections, public.spotify_oauth_states from public, anon, authenticated;
grant all on public.spotify_connections, public.spotify_oauth_states to service_role;
commit;
