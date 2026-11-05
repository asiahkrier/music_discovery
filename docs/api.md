# HTTP API

Catalog routes return JSON. `country` defaults to `US` and must be two uppercase letters. Spotify artist IDs must be 22 alphanumeric characters. Queries must be nonempty strings of at most 200 characters. Secrets and access tokens are never part of a response.

| GET endpoint | Parameters | Successful response |
|---|---|---|
| `/api/song-providers` | None | `{ providers: [{ id: "spotify", name: "Spotify", enabled: boolean }] }`; enabled indicates credentials are present, not that Spotify accepted them. |
| `/api/artists` | Required `q`, optional `country` | `{ artists: Artist[], country }`. A full `https://open.spotify.com/artist/ID` URL (optional query string) resolves that exact artist; other text uses name search. |
| `/api/artist` | Required `id`, optional `country` | `{ artist: Artist, country, source: "Spotify" }`. |
| `/api/discover` | Optional `country` | `{ artists: Artist[], country, notice }`. |
| `/api/related-artists` | Required `id`, optional `country` | `{ artists: Artist[], basis }`; candidates may include numeric `score` and display `recommendationReason`. |
| `/api/songs` | Required `q`, optional `country` | `{ songs: Song[], country, providers: [{ name: "Spotify", status: "ok" }] }`. |

`Artist` contains `id`, `spotifyId`, `name`, `tags` (normalized strings), `rawGenres`, `image`, `imageSource`, `url`, `spotifyEmbed`, and `source`. Images may be empty; tags may be an empty array. A public oEmbed profile has no genres. There is no biography field.

`Song` contains `id`, `title`, `artist` (joined names), optional `album`, `url`, `providerName`, `image` and `durationMs`. Song results and saved songs provide inline Spotify previews.

Errors use `{ error: "User-facing message" }`:

- `400`: Invalid or missing input.
- `404`: Unknown API endpoint or Spotify item not found.
- `429`: Spotify rate limit; a server-wide client cooldown follows the Retry-After value.
- `503`: Credentials absent for an operation that needs the catalog API.
- `502`: Upstream denial, failed authentication, network error, timeout, or other provider failure. A 403 denial gets an access-specific message.

There is no automatic fallback to another provider. With credentials configured but rejected, artist requests also report errors rather than silently changing data sources. Expired tokens refresh on subsequent requests according to their cached expiry; there is no automatic 401 retry.


## Profile data

- `GET /api/artist-biography?id=ID`: `{ text, sourceUrl }` from Last.fm, empty when unavailable.
- `GET /api/top-tracks?id=ID&country=US`: Last.fm-ranked songs matched to Spotify tracks for previews.
- `GET /api/song-artwork?id=ID`: `{ image }` from Spotify album artwork.

Related artists use Last.fm similarity and tags matched to Spotify identities, with no name-search fallback. See [recommendations](recommendations.md).

## Accounts and mixes

Private server routes require a Supabase bearer token; browser profile/library access uses Supabase row-level security. See [account setup](ACCOUNT-SETUP.md) and [account settings](account-settings.md).

| Method and endpoint | Behavior |
|---|---|
| `POST /api/signup-availability` | Public, rate-limited check. Accepts `{ field, value }` for username/email; returns `{ available }`. |
| `DELETE /api/account` | Verifies current password and DELETE confirmation before deletion. |
| `GET /api/mix/status` | Current Ripple mix and preferences. |
| `PUT /api/mix/preferences` | Updates adventure level while preserving dismissals. |
| `POST /api/mix/mix` | Builds/reuses the weekly mix; `{ refresh: true }` requests rebuilding. |
| `POST /api/mix/dismiss` | Dismisses a song by ID. |

All `/api/spotify/*` account endpoints are removed. Ripple Mix uses `/api/mix` and Ripple library saves only. See [Ripple Mix](ripple-mix.md).

## Microgenres

- `POST /api/microgenres`: accepts `{ artists: string[] }` (at most 50 names, each at most 200 characters). Uses up to 15 saved names to return `{ basis, microgenres }`. `basis` is `saved` or `starter`.
- `GET /api/microgenre-artists?tag=TAG&country=US`: requires a cleaned tag up to 40 characters; returns `{ tag, artists, sourceUrl }`.

Public catalog results may come from a recent cache during provider outages. See [catalog recovery](catalog-recovery.md). A cached response does not guarantee current playback availability.
