# Spotify connection and Your Ripple Mix

Local implementation; not deployed. Spotify account linking is separate from Ripple/Supabase login.

## Setup before a live test

1. Apply `supabase/005_spotify_connection.sql` in the existing Supabase project's SQL editor. It adds two server-only tables protected by RLS; browser roles have no access. Existing accounts and libraries are unchanged. Account deletion cascades to these tables.
2. Set server environment variables: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_TOKEN_ENCRYPTION_KEY`, `SPOTIFY_REDIRECT_URI`. Existing `VITE_SUPABASE_URL` is also required. Keep the existing publishable key and `LASTFM_API_KEY`.
3. Generate a new encryption key once with `openssl rand -base64 32`. Store it only as `SPOTIFY_TOKEN_ENCRYPTION_KEY`. Never prefix server secrets with `VITE_`, commit them, or paste them into chat. Keep it stable; rotation requires a reconnect/migration of existing encrypted connections.
4. Register the exact redirect URI in the Spotify app dashboard. Local preview: `http://127.0.0.1:5184/api/spotify/callback` (or the actual Vite port). Render: `https://musicdiscoverywip.onrender.com/api/spotify/callback`. The callback origin is also the return destination. Use the same hostname when opening the app so the browser-binding cookie is present. Do not use localhost in the registered URI.
5. Spotify development-mode restrictions apply: check the app owner's Premium eligibility and add class testers to the app's allowed users. New apps typically allow only five users. Playlist reads may be limited to owned/collaborative playlists. Do not assume public rollout eligibility.
6. Start the backend and frontend with matching proxy port. Visit Settings → Connected accounts and complete Spotify's consent screen yourself. Never enter Spotify passwords in Ripple.

## Implemented behavior

- Official authorization-code flow with PKCE, a random state, single-use ten-minute database state, and an HttpOnly SameSite=Lax browser-binding cookie. HTTPS cookies are Secure.
- Supabase verifies the current Ripple session on every private endpoint. Client-supplied user IDs are ignored.
- AES-256-GCM encryption for access/refresh tokens, bound to the Ripple user's ID. Tokens are never returned to the browser. Refresh tokens are rotated when Spotify returns a replacement.
- Opt-in mix generation after connecting. Source checkboxes, up to three chosen playlists, and a Familiar–Adventurous slider.
- Bounded samples: newest 100 Ripple saved items; up to 20 Ripple artist seeds and 10 saved tracks; Spotify 50 saved songs, 20 top artists/tracks, 50 recent plays, and 50 tracks per selected playlist. This is **not** a complete Spotify library/history import. Playlist picker lists eligible entries from the first 50 playlists.
- Up to eight seed artists, with reserved room for Ripple saves. Last.fm similarity and tag matches produce candidates, verified against Spotify artist IDs. Requests are bounded and failures are visible; no same-name guessing fallback.
- Rules-based ranking uses 65% relevance plus up to 20% novelty and 5% smaller-audience boost, with a small deterministic variation for ties. At most two tracks per artist. Duplicates, dismissed songs, unavailable tracks, local files, and episodes are excluded. Unknown listener counts never qualify as a smaller audience.
- Last.fm listener counts compare audience size; they are not Spotify monthly listeners. The UI discloses the source and links discovery sources. No Spotify content is used for ML training.
- Mix snapshot stays across visits, rebuilding on the next visit in a new UTC Monday-based week. Manual refresh includes updated saves/preferences, limited to once a minute. Source changes take effect when rebuilding.
- Save to Ripple and Save to Spotify are separate. Spotify library saves use `PUT /me/library?uris=...`. Export explicitly creates a private playlist, then writes its items. Repeated export of the same snapshot reuses that playlist. Refresh creates a new snapshot; export then creates another playlist.
- Disconnect deletes the connection, stored mix/preferences, and pending OAuth state. Ripple saves remain. Spotify permission revocation can also be performed on Spotify's account/apps page.

## Verification and rollout limits

Run `npm test` and `npm run build`. Tests cover token confidentiality and owner binding, OAuth cookie/state/replay behavior, expired token refresh, disconnect and owner isolation, request validation, failure messages, deterministic ranking, diversity, niche boosts, source opt-outs, and exact-artist track matching.

Live consent, Supabase migration/RLS behavior, real library access, revocation, and Spotify save/export must still be tested with authorized test accounts. Preview cards are explicitly synthetic, with playback and saving disabled. Automated tests use mocks, not real accounts.

The first release assumes one Node server instance: user action locks and rebuild throttles are in memory. Before horizontal scaling, move locks/rate limits to a distributed store or transactional database service. If playlist creation succeeds but saving its ID to Supabase fails, an empty playlist may remain in Spotify; delete it manually before retrying. Authorization records expire after ten minutes and old rows are removed at the next connection attempt; schedule database cleanup if needed.

## Official API references

- https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- https://developer.spotify.com/documentation/web-api/reference/save-library-items
- https://developer.spotify.com/documentation/web-api/reference/create-playlist
- https://developer.spotify.com/documentation/web-api/concepts/quota-modes

## Balanced mix update

Saved artist seeds now supply up to two playable songs each (up to eight seed artists), even with no Spotify listening data. Ripple saves remain the source of taste; Apple Music history is not imported. Related candidates no longer get an extra audience-size bonus before track lookup.

Selection reserves 60%–30% of slots for familiar artists as adventure increases from 0 to 100, and 20%–40% for smaller-audience discoveries, with the remainder for other related discoveries. At adventure 60 and 20 tracks, targets are 8 familiar, 6 other discoveries, and 6 smaller-audience discoveries. These are targets, not guarantees: available candidates, dismissals and the two-track artist cap can leave gaps. Fill unused slots with other eligible tracks, favoring non-smaller candidates before the remaining pool. Unknown audience size is not labeled mainstream.

Existing weekly snapshots stay unchanged until the user selects Refresh my mix.
