# Ripple accounts

## Signup and login

The My account header button opens signup/login. Usernames use 3–24 letters, numbers or underscores and are stored lowercase under a unique database constraint. Passwords require at least 12 characters and matching confirmation. A boolean Supabase function checks username availability; a failed database signup is rechecked for concurrent claims. Supabase Auth owns email uniqueness, password hashing and sessions. No service-role key is used in the browser.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the root `.env` for local development and in Render before the build. These values are embedded by Vite at build time; rebuild after changing them. Never use a secret/service-role key for a VITE variable. `.env` is ignored by Git.

For a new Supabase project, apply `supabase/001_accounts.sql` through `004_username_availability.sql` in numeric order. 001 includes the shared profile, avatar and library schema. 002 restricts avatar uploads to active profiles. The discarded birthday/age and terms-consent setup has been removed; 003 safely removes its legacy trigger/function if present and restores basic profile creation. Migration numbers remain unchanged for existing installations. Do not rerun 001 on an already initialized project. The existing Ripple project already has all four original migrations applied and does not need them rerun for this UI update. Historical consent columns may remain unused in existing databases; this cleanup does not delete stored data or change the live database.

Enable email/password signup and email confirmation in Supabase Auth. Set its password minimum to 12 characters. Add local and Render origins to the Auth redirect allowlist, and configure email delivery. Confirm-email signup displays instructions rather than promising that an existing email created another account.

Run `npm run dev`, then open `/?view=account`. The dev-only sample profile does not create an account or persist edits. The three-photo Spotify artwork refreshes every three seconds, pauses during interaction and respects reduced motion.

## Scope

The application includes registration, login/logout, profile customization, avatar uploads and saved artists/songs. Account deletion, age screening, and terms/privacy screens are deferred.

## Validation before marking Done

Automated username/password validation and username-availability feedback tests run with `npm test`. Build with `npm run build`.

Live acceptance testing is still required: create and confirm a disposable account; log in and reload; try a duplicate username with different capitalization and a duplicate email; test invalid input and network/server failures; verify keyboard navigation and that concurrent submissions do not create duplicate accounts. Use two test accounts to confirm private profile/library isolation. Do not mark these live checks complete based only on unit tests.

## Profile customization

Signed-in users can edit their display name (60 characters), bio (240 characters), and comma-separated favorite genres (120 characters), and upload a JPG, PNG or WebP avatar up to 2 MB. Profiles remain owner-only through RLS; avatar images are public. Database and bucket constraints enforce field and upload limits. Replacing a photo leaves the old file in storage for future cleanup. Test saving and reloading fields and images with a real account before deployment.

## Saved library

Artist profiles and song search results have Save/Unsave buttons with a saved indicator. My account includes Favorite artists and Saved songs, a saved-song search and Spotify previews. Real-account items are stored in `library_items` with owner-only RLS and a composite key preventing duplicates. The sample preview library is temporary. Test saving/unsaving, reload persistence and isolation with two real accounts before marking this feature Done.
