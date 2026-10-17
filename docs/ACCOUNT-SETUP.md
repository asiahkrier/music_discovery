# Ripple accounts

## Signup and login

The My account header button opens signup/login. Usernames use 3–24 letters, numbers or underscores and are stored lowercase under a unique database constraint. Passwords require at least 12 characters and matching confirmation. A boolean Supabase function checks username availability; a failed database signup is rechecked for concurrent claims. Supabase Auth owns email uniqueness, password hashing and sessions. No service-role key is used in the browser.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the root `.env` for local development and in Render before the build. These values are embedded by Vite at build time; rebuild after changing them. Never use a secret/service-role key for a VITE variable. `.env` is ignored by Git.

For a new Supabase project, apply `supabase/001_accounts.sql` through `004_username_availability.sql` in numeric order. 001 includes the shared profile, avatar and library schema used by the next two feature branches. 002 and 003 preserve the migration history of the existing project; 003 removes the former age/terms gate. Do not rerun 001 on an already initialized project. The existing Ripple project already has all four migrations applied.

Enable email/password signup and email confirmation in Supabase Auth. Set its password minimum to 12 characters. Add local and Render origins to the Auth redirect allowlist, and configure email delivery. Confirm-email signup displays instructions rather than promising that an existing email created another account.

Run `npm run dev`, then open `/?view=account`. The dev-only sample profile does not create an account or persist edits. The three-photo Spotify artwork refreshes every three seconds, pauses during interaction and respects reduced motion.

## Scope

This branch adds registration, login/logout, basic profile loading and shared account styling/schema. Profile editing and saved-library controls arrive in separate dependent PRs. Account deletion, age screening, and terms/privacy screens are deferred.

## Validation before marking Done

Automated username/password validation and username-availability feedback tests run with `npm test`. Build with `npm run build`.

Live acceptance testing is still required: create and confirm a disposable account; log in and reload; try a duplicate username with different capitalization and a duplicate email; test invalid input and network/server failures; verify keyboard navigation and that concurrent submissions do not create duplicate accounts. Use two test accounts to confirm private profile/library isolation. Do not mark these live checks complete based only on unit tests.
