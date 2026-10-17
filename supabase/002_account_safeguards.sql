-- Apply after 001_accounts.sql. Review in a test project first.
begin;
alter table public.profiles add column policy_version text;
alter table public.profiles add column policy_accepted_at timestamptz;
alter table public.profiles add column age_declared_at timestamptz;

-- Check before persisting an auth user. The supplied birthday is removed.
create function public.check_ripple_signup() returns trigger
language plpgsql set search_path = '' as $$
declare birthday date;
begin
  if coalesce(new.raw_user_meta_data ->> 'birthday', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Age requirement not met';
  end if;
  birthday := (new.raw_user_meta_data ->> 'birthday')::date;
  if birthday < date '1900-01-01' or birthday > (current_date - interval '13 years')::date then
    raise exception 'Age requirement not met';
  end if;
  if new.raw_user_meta_data ->> 'policy_version' is distinct from '2026-10-13'
    or new.raw_user_meta_data ->> 'policy_accepted' is distinct from 'true' then
    raise exception 'Terms acknowledgment required';
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'birthday';
  return new;
end;
$$;
revoke all on function public.check_ripple_signup() from public, anon, authenticated;
create trigger ripple_signup_checked before insert on auth.users for each row execute function public.check_ripple_signup();

create or replace function public.create_ripple_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name, policy_version, policy_accepted_at, age_declared_at)
  values (new.id, lower(trim(new.raw_user_meta_data ->> 'username')), lower(trim(new.raw_user_meta_data ->> 'username')), '2026-10-13', now(), now());
  return new;
end;
$$;
-- A deleted user's unexpired JWT must not be allowed to upload new objects.
alter policy "Upload own avatar" on storage.objects with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);
commit;
