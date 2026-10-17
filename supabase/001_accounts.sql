-- Run once in your Supabase SQL editor before enabling real signup.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default '' check (length(display_name) <= 60),
  bio text not null default '' check (length(bio) <= 240),
  genres text not null default '' check (length(genres) <= 120),
  avatar_url text not null default '' check (length(avatar_url) <= 2048),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, bio, genres, avatar_url) on public.profiles to authenticated;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Edit own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.create_ripple_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, lower(trim(new.raw_user_meta_data ->> 'username')), lower(trim(new.raw_user_meta_data ->> 'username')));
  return new;
end;
$$;
revoke all on function public.create_ripple_profile() from public, anon, authenticated;
create trigger ripple_profile_created after insert on auth.users for each row execute function public.create_ripple_profile();

create table public.library_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('artist', 'song')),
  spotify_id text not null check (spotify_id ~ '^[A-Za-z0-9]{22}$'),
  name text not null check (length(name) between 1 and 500),
  subtitle text not null default '' check (length(subtitle) <= 1000),
  image text not null default '' check (length(image) <= 2048),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, spotify_id)
);
alter table public.library_items enable row level security;
revoke all on public.library_items from anon, authenticated;
grant select, insert, update, delete on public.library_items to authenticated;
create policy "Own library only" on public.library_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']);
create policy "Upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
