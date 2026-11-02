# Testing and current limits

Run `npm test` for Node's built-in test runner and `npm run build` for the production frontend build. Tests inject mocked Spotify responses so they require no secrets and do not consume Spotify quota. HTTP tests use an ephemeral local port.

Coverage includes credential absence, shared token requests, Spotify-only outbound hosts, artist identity/artwork, public oEmbed profiles, Last.fm recommendation matching, missing provider data, rate-limit cooldown, discovery caching, input validation, route contracts, and shuffling. Genre normalization has dedicated alias/unknown-label tests.

Before merging or releasing with real credentials, manually check:

- Artist and song name searches with your Spotify app.
- Two same-name artists retain distinct profiles.
- A pasted artist URL loads the expected image and player.
- Discovery changes every ten seconds, pauses during interaction, and resumes.
- Related cards navigate to their own profiles; missing matches show an empty state.
- Mobile layout and keyboard navigation remain usable.
- Spotify playback works in the target browser/region, or its direct link remains available.

Automated tests do not prove Spotify app eligibility, live catalog coverage, the quality of genre recommendations, or audio playback inside Spotify's iframe. No live credentialed catalog test was possible during this update because credentials were not configured. A public SZA oEmbed request was verified during local development.

The existing Trivy workflow reports dependencies but uses `exit-code: '0'`, so review counts in the artifact; a green job does not mean zero vulnerabilities. Prior sprint reports describe their own scanned commits and are not evidence for this update. SonarQube and Trivy results for this PR must be checked after CI runs.


Account tests cover validation, owner isolation, availability checks and settings. Mix tests cover Ripple-only inputs, persistence, ranking, balance and dismissals. Spotify tests cover optional linking and saves, restricted permissions and retired endpoint rejection. Live Supabase confirmation, playback and Spotify consent/save checks require authorized accounts; mocked tests do not verify them.
