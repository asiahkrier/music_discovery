# Catalog recovery

Run `supabase/009_catalog_cache.sql` in Supabase before deploying. Render uses the existing `VITE_SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY`. No new secret is required. The cache table is inaccessible to browser accounts.

Successful public Spotify lookups are shared across artist search, song search, discovery, microgenres, and mixes. They stay fresh for one hour and can be used during temporary failures for up to 24 hours. The homepage artist pool is also persisted by country. OAuth tokens, user libraries, and passwords are never stored in this table. Query keys are hashed.

Catalog requests are serialized with a 250 ms gap. Spotify's Retry-After cooldown is respected and persisted per client ID. Queued requests recheck the cooldown before calling Spotify. This queue limits one Render process; use one service instance for the demo. Multiple instances do not share a distributed request lock.

The mix still excludes the previous three mixes' artists and songs. Cached catalog data is a candidate pool, not a saved playlist to repeat. If no fresh candidates remain, the existing mix stays saved and Ripple explains that no fresh matches are available.

This cannot end an existing Spotify cooldown or supply uncached artists while Spotify is unavailable. The persistent cache starts filling after successful requests. Existing saved mixes remain in `ripple_mixes`.

If Supabase cache access fails or the migration is missing, catalog requests still run with process-local protection. Check Render logs for the generic cache write warning. Periodically delete expired cache rows using the final statement in the migration; expiry is enforced on reads even before cleanup.
