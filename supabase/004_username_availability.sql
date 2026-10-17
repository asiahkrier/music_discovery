-- Return only availability; private profile rows remain protected by RLS.
begin;
create or replace function public.ripple_username_available(requested_username text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when lower(trim(requested_username)) ~ '^[a-z0-9_]{3,24}$'
    then not exists (
      select 1 from public.profiles where username = lower(trim(requested_username))
    )
    else false
  end;
$$;
revoke all on function public.ripple_username_available(text) from public;
grant execute on function public.ripple_username_available(text) to anon, authenticated;
commit;
