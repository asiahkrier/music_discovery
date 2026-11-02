# Spotify connection and Ripple Mix

## Separate features

Ripple Mix uses only songs and artists saved in Ripple. It does not import personal Spotify listening history, playlists or saved songs. Optional Spotify linking remains in Settings so users can choose **Save to Spotify** on song results or saved songs. Linking is separate from Supabase login and is not required to generate a mix.

## Optional Spotify linking setup

Apply `supabase/005_spotify_connection.sql` if it has not already been applied. Configure `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_TOKEN_ENCRYPTION_KEY` and `SPOTIFY_REDIRECT_URI` on the server. Generate the encryption key once with `openssl rand -base64 32`; keep it stable and private. Never prefix secrets with `VITE_`.

Register the exact callback URL in the Spotify developer dashboard. For Render this is `https://musicdiscoverywip.onrender.com/api/spotify/callback`. For development use the actual local frontend port and `/api/spotify/callback`, with the same hostname as the page. Spotify app access restrictions still apply.

Authorization uses PKCE, single-use state, a browser-binding cookie and encrypted tokens bound to the Ripple user. New connections request only `user-library-modify`, needed for saving songs. Existing connections may retain previously granted scopes until revoked in Spotify and reconnected. Tokens are never returned to the frontend.

Disconnect removes the stored connection and pending authorization. It leaves the Ripple library and current Ripple Mix intact. To revoke Spotify-side permission, remove Ripple on Spotify's account/apps page.

## Current mix behavior

Apply `supabase/007_ripple_mixes.sql` for independent server-only mix storage. `/api/mix` verifies the Ripple session and reads only the current user's 100 latest saves, considering up to 20 saved artists and 10 saved songs. Up to eight weighted seed artists produce familiar songs and Last.fm-related discoveries matched to Spotify IDs. App credentials supply catalog metadata; no personal Spotify token is used.

Ranking uses 65% relevance, adventure-scaled novelty and a small audience-size bonus, plus deterministic tie variation. Selection reserves familiar artists and discoveries across audience sizes, excludes dismissed/unavailable items, deduplicates tracks and caps each artist at two songs. At adventure 60, a full 20-song pool targets 8 familiar, 6 other discoveries and 6 smaller-audience discoveries. These are targets subject to available matches. Audience comparisons use Last.fm listeners, not Spotify monthly listeners.

Snapshots persist between visits and rebuild in a new UTC Monday-based week. Manual refresh is limited to once a minute. Locks and cooldowns are in memory; multiple server instances would need shared coordination.

The old `/api/spotify/playlists`, `/api/spotify/preferences`, `/api/spotify/dismiss`, `/api/spotify/mix` and `/api/spotify/export` routes are retired. Historical migration columns remain to avoid altering existing databases; current code does not use old Spotify mix snapshots.

Run `npm test` and `npm run build`. Automated tests use mocks. Live consent, permission revocation and actual Spotify saves require an authorized test account.
