# Account settings

The circular avatar in the header opens My profile, Settings, and Log out. It uses the current profile picture, with the Ripple logo as a fallback. Log out was removed from the profile page; it closes the dropdown and returns to Discover. Settings includes email changes, password changes, and permanent account deletion. Email/password updates use Supabase Auth and require the current password. New passwords must match and contain at least 12 characters. Configure the same minimum length in Supabase Auth so it is enforced beyond the form.

## Render setup

Keep VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY as a server-only Render environment variable. Never prefix it with VITE_, include it in client code, or commit its value. Until configured, deletion returns an unavailable message. No new SQL migration is required: 001_accounts.sql already cascades profile and library deletion from auth.users.

Allow the deployed /?view=settings URL in Supabase Auth redirect settings. Keep secure email-change confirmation enabled; users should follow the confirmation instructions sent by Supabase. Email changes are not reported as completed before confirmation.

## Deletion behavior

DELETE /api/account verifies the bearer token with Supabase, verifies the current password against that user's email, checks identity equality, requires DELETE confirmation, and limits attempts per user to once per minute per server process. It removes the user's avatar files before deleting the auth user. It never accepts a target user ID from the browser. Failures stop deletion; storage cleanup can partially complete and the error explains this. Supabase JWTs can remain valid until expiration, although deleted profile/library rows are removed by database cascades. Review token lifetime and test against a disposable account before production deployment.

## Signup feedback

Username and email availability are checked after a 500 ms typing pause and again before signup through `POST /api/signup-availability`. The server calls the corresponding Supabase function using its service-role key and returns only `{ available }`. Input validation, no-store responses, and per-IP request limits apply. Apply migration 006 for email checks. Database username uniqueness and Supabase Auth still enforce account creation, including races after availability checks.

## Verification

Automated tests cover unauthorized deletion, mismatched password identity, confirmation, rate limiting, storage failure, missing credentials, and cleanup ordering/owner selection. Live email confirmation, password changes, and deletion must still be tested with a disposable Supabase account before marking complete. Local previews do not modify real accounts.

Settings and song-preview buttons use dark backgrounds and light text for legible contrast.
