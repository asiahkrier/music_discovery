-- Defer age/terms requirements without deleting accounts or historical data.
begin;
drop trigger if exists ripple_signup_checked on auth.users;
create or replace function public.create_ripple_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, lower(trim(new.raw_user_meta_data ->> 'username')), lower(trim(new.raw_user_meta_data ->> 'username')));
  return new;
end;
$$;
commit;
