# Ripple

Ripple is a student music-discovery application built with React, Vite, Node.js, and Express. This version uses **Spotify** for artist metadata, artwork, song search, and embedded playback, plus **Last.fm** for biography summaries.

## What works

- Search Spotify artists and songs by name with server-side developer credentials.
- Paste a full Spotify artist URL to open its profile. Without credentials, this uses Spotify's public oEmbed metadata.
- View one consistent artist profile with available artwork, simple genre labels, and Spotify's embedded artist player.
- Shuffle six discovery cards every ten seconds, with pause and manual-shuffle controls.
- Suggest artists using Ripple's own shared-genre scoring when Spotify supplies genre data.

Spotify does not supply biographies through this integration. A profile may have no genre data or similar artists. Discovery is a sample of genre search results, not every artist, a popularity ranking, or a guarantee of underground recommendations. Spotify controls playback, previews, and regional availability.

## Run locally

Use Node.js 24 (see `.nvmrc`; minimum supported version is in `package.json`).

```sh
npm ci
cp .env.example .env
```

Privately fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`. Keep the secret out of source control, frontend code, screenshots, and chat.

```sh
npm run build
npm start
```

Open http://localhost:3006 unless you set a different `PORT`. For development with frontend hot reload, run `npm run dev` and open http://127.0.0.1:5173. The Vite proxy uses the same `PORT` as the server.

Without credentials, name searches and discovery show a setup message. You can still paste a Spotify artist link to try a public profile/player. Restart the server after changing `.env`.

## Documentation

- [Code guide: every source file and data flow](docs/code-guide.md)
- [HTTP API and data contracts](docs/api.md)
- [Local setup, Render deployment, and troubleshooting](docs/deployment.md)
- [Artist and song search behavior](docs/song-search.md)
- [Testing and limitations](docs/testing.md)
- [Artwork credits](CREDITS.md)

## Checks and collaboration

```sh
npm test
npm run build
```

Submit changes through pull requests to `main`. Do not commit `.env`, `node_modules`, or `client/dist`. The existing Trivy workflow scans dependency files on pull requests and uploads reports. A successful Trivy job does not guarantee zero findings: the workflow reports vulnerabilities without failing the job for their count.

## Artist suggestions when genres are unavailable

If Spotify omits genres or genre matching produces no candidates, Ripple searches the current artist name, verifies that the exact Spotify ID appears, then displays up to six other unique artists returned by that search. The section is labeled “Other artists to explore” and explains the search-based source. This is not Spotify’s Fans also like feed and may be empty if the identity cannot be verified or no other matches exist. No additional provider is used. Homepage cards no longer show the generic “Discover on Spotify” badge; photo attribution links remain.
## Artist About section

Artist profiles now display a short Last.fm biography next to the photo and name, while Spotify continues to supply search, photos and playback. Set `LASTFM_API_KEY` on the server (Render Environment or local `.env`). A shared secret is not required. See [biography setup and limitations](docs/biographies.md).

## Similar artists update

Profile recommendations now come from Last.fm's similar-artist results, matched to Spotify profiles. The former Spotify name-search fallback is removed. The existing `LASTFM_API_KEY` is reused. See [recommendation behavior and limitations](docs/recommendations.md).
