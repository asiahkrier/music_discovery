# Artist biographies

Ripple uses Spotify for search, artist photos, genres and playback, and Last.fm only for the inline About section. No hometown or country is displayed. On desktop, About appears beside the photo/name; on narrow screens it stacks beneath them.

## Setup

Set LASTFM_API_KEY in the Render service's Environment settings and deploy the branch containing this feature. Local development uses the same variable in an untracked .env file. No Last.fm shared secret is needed. Never commit real keys. package.json and package-lock.json include the runtime html-to-text dependency.

## Data flow

ArtistBiography.jsx independently requests GET /api/artist-biography?id=<Spotify artist ID>. The server resolves the name through Spotify, then server/lastfm.js calls Last.fm artist.getInfo with English language and autocorrect disabled. Only the name-matched biography summary is returned as plain text, alongside a generated HTTPS Last.fm source link. Provider HTML is parsed with html-to-text and rendered as React text, never injected as HTML.

The request has a four-second Last.fm timeout. The bounded in-memory cache holds up to 200 names, shares in-flight requests, caches successful summaries for one hour and unavailable results for one minute. Missing credentials, missing summaries and provider errors show an unavailable message; playback loads independently. The frontend cancels outdated requests when navigating between artists.

## Coverage and limitations

Last.fm does not have biographies for every Spotify artist. Its API identifies artists by name, so exact-name matching prevents spelling substitutions but cannot reliably distinguish separate artists with identical names. Last.fm pages may combine those artists. Summaries can be truncated by the provider; the source link opens the full Last.fm page. This integration does not change artist recommendations.

## Validation

Run npm test and npm run build. Tests cover name mismatch, unavailable data, provider failures, HTML conversion, attribution, caching, route validation and secret omission. Live Last.fm verification requires the deployment's configured key; mocked tests do not establish live coverage.
