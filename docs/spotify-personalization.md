# Ripple Mix

Ripple Mix uses only songs and artists saved in Ripple. Personal Spotify linking, imports, direct Spotify saves and playlist export have been removed. Spotify app credentials still supply catalog metadata and official embeds still provide previews.

## Current mix behavior

Apply `supabase/007_ripple_mixes.sql` for independent server-only mix storage. `/api/mix` verifies the Ripple session and reads only the current user's 100 latest saves, considering up to 20 saved artists and 10 saved songs. Up to eight weighted seed artists produce familiar songs and Last.fm-related discoveries matched to Spotify IDs. App credentials supply catalog metadata; no personal Spotify token is used.

Ranking uses 65% relevance, adventure-scaled novelty and a small audience-size bonus, plus deterministic tie variation. Selection reserves familiar artists and discoveries across audience sizes, excludes dismissed/unavailable items, deduplicates tracks and caps each artist at two songs. At adventure 60, a full 20-song pool targets 8 familiar, 6 other discoveries and 6 smaller-audience discoveries. These are targets subject to available matches. Audience comparisons use Last.fm listeners, not Spotify monthly listeners.

Snapshots persist between visits and rebuild in a new UTC Monday-based week. Manual refresh is limited to once a minute. Locks and cooldowns are in memory; multiple server instances would need shared coordination.

All `/api/spotify/*` account routes are retired. Historical migration 005 and its existing tables are retained; no stored user data is deleted by this code change. Old Spotify credentials are no longer read or used. Users can revoke an earlier grant through Spotify's account/apps page.

`SPOTIFY_REDIRECT_URI` and `SPOTIFY_TOKEN_ENCRYPTION_KEY` are no longer required. Keep the server's `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for catalog requests, plus Supabase configuration and `LASTFM_API_KEY`.

Run `npm test` and `npm run build`. Automated tests use mocks; live playback and provider availability must be checked separately.
