# HTTP API

All routes return JSON. `country` defaults to `US` and must be two uppercase letters. Spotify artist IDs must be 22 alphanumeric characters. Queries must be nonempty strings of at most 200 characters. Secrets and access tokens are never part of a response.

| GET endpoint | Parameters | Successful response |
|---|---|---|
| `/api/song-providers` | None | `{ providers: [{ id: "spotify", name: "Spotify", enabled: boolean }] }`; enabled indicates credentials are present, not that Spotify accepted them. |
| `/api/artists` | Required `q`, optional `country` | `{ artists: Artist[], country }`. A full `https://open.spotify.com/artist/ID` URL (optional query string) resolves that exact artist; other text uses name search. |
| `/api/artist` | Required `id`, optional `country` | `{ artist: Artist, country, source: "Spotify" }`. |
| `/api/discover` | Optional `country` | `{ artists: Artist[], country, notice }`. |
| `/api/related-artists` | Required `id`, optional `country` | `{ artists: Artist[], basis }`; candidates may include numeric `score` and display `recommendationReason`. |
| `/api/songs` | Required `q`, optional `country` | `{ songs: Song[], country, providers: [{ name: "Spotify", status: "ok" }] }`. |

`Artist` contains `id`, `spotifyId`, `name`, `tags` (normalized strings), `rawGenres`, `image`, `imageSource`, `url`, `spotifyEmbed`, and `source`. Images may be empty; tags may be an empty array. A public oEmbed profile has no genres. There is no biography field.

`Song` contains `id`, `title`, `artist` (joined names), optional `album`, `url`, and `providerName`. Song search results link to Spotify; the artist profile provides embedded playback.

Errors use `{ error: "User-facing message" }`:

- `400`: Invalid or missing input.
- `404`: Unknown API endpoint or Spotify item not found.
- `429`: Spotify rate limit; a server-wide client cooldown follows the Retry-After value.
- `503`: Credentials absent for an operation that needs the catalog API.
- `502`: Upstream denial, failed authentication, network error, timeout, or other provider failure. A 403 denial gets an access-specific message.

There is no automatic fallback to another provider. With credentials configured but rejected, artist requests also report errors rather than silently changing data sources. Expired tokens refresh on subsequent requests according to their cached expiry; there is no automatic 401 retry.

`GET /api/artist-biography?id=<Spotify ID>` returns `{text, sourceUrl}` from Last.fm. Both values are empty strings when no biography is available. Loads independently from the Spotify profile/player. See [biographies](biographies.md).
