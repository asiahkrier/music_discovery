-- Server-only lookup; never expose auth.users or the service-role key to browsers.
begin;
create or replace function public.ripple_email_available(requested_email text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1 from auth.users
    where lower(email) = lower(trim(requested_email)) and deleted_at is null
  );
$$;
revoke all on function public.ripple_email_available(text) from public, anon, authenticated;
grant execute on function public.ripple_email_available(text) to service_role;
-- Keep existing anonymous username checks; allow the new server endpoint explicitly.
grant execute on function public.ripple_username_available(text) to service_role;
commit;
