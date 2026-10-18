-- Apply after 001_accounts.sql. Keep avatar uploads limited to active profiles.
begin;
-- A deleted user's unexpired JWT must not be allowed to upload new objects.
alter policy "Upload own avatar" on storage.objects with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);
commit;
