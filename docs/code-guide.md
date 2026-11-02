# Code guide

## Data flow

React calls same-origin Express endpoints for catalog search, Last.fm biographies/recommendations, account administration and Ripple Mix. Supabase Auth handles login; browser profile and library access is protected by row-level security. Server secrets stay on the backend. Spotify embeds provide playback.

## Server files

| Files | Responsibility |
|---|---|
| `index.js`, `app.js` | Environment configuration, routes, validation and static frontend hosting. |
| `spotify.js`, `genres.js` | Spotify app-token catalog access, discovery caching, artwork and genre normalization. |
| `lastfm.js`, `recommendations.js`, `top-tracks.js` | Biographies, identity-matched related artists and all-time songs. |
| `signup-availability.js`, `account-settings.js` | Availability checks and verified account deletion. |
| `library-mix.js`, `ripple-mix.js`, `mix-shared.js` | Authenticated Ripple-only mix storage, candidate ranking, bounded requests, weekly caching and dismissals. |
| `spotify-account.js`, `spotify-vault.js` | Optional Spotify OAuth and direct song saves with encrypted credentials. |
| `fake-supabase.js`, `*.test.js` | Test-only database helper and regression suites. |

## Frontend files

| Files | Responsibility |
|---|---|
| `main.jsx` | Entry point, discovery/mix/account/settings views and avatar menu. |
| `ArtistSearch.jsx`, `SongSearch.jsx`, `SearchSuggestions.jsx` | Searches, autocomplete, profile navigation and inline song previews. |
| `Discovery.jsx`, `discovery-shuffle.js` | Homepage artist cards and ten-second shuffle. |
| `ArtistPhoto.jsx`, `SongArtwork.jsx` | Artwork and missing-image fallbacks. |
| `ArtistBiography.jsx`, `RelatedArtists.jsx` | Independently loaded biography and related artists. |
| `ArtistPlayer.jsx`, `AllTimeTopSongs.jsx` | Spotify artist player and Last.fm-ranked songs with Spotify previews. |
| `AccountPage.jsx`, `AccountContext.jsx`, `account-client.js` | Signup/login, profile editing, session and saved library. |
| `useSignupAvailability.js`, `email-validation.js` | Live availability feedback and shared email validation. |
| `SignupArtwork.jsx` | Rotating artist photos, reduced-motion handling and pause controls. |
| `AccountSettings.jsx` | Email/password changes and account deletion. |
| `SpotifyConnection.jsx`, `spotify-account-client.js` | Optional connection and direct Spotify saves. |
| `RippleMix.jsx`, `mix-client.js` | Ripple-library mix controls, previews and dismissals. |
| `styles.css`, `account.css` | Shared dark/lime styling and responsive layouts. |

## Configuration and history

`package.json` and its lockfile define dependencies and scripts. `client/index.html` provides the document entry point. `client/vite.config.js` builds the frontend and proxies `/api` during development. `client/public/ripple-logo.png` supplies the current brand/fallback logo. `.env.example` lists configuration without secrets. `.nvmrc` selects Node 24; `package.json` specifies the supported version range. `.github/workflows` contains CI.

Keep numbered Supabase migrations: later migrations may depend on earlier tables/functions even when an old feature has been retired. Existing database columns are not dropped by code cleanup. Sprint reports and the demonstration video are coursework history, not unused application code.

Use `npm test` and `npm run build` before review. See [API](api.md), [account setup](ACCOUNT-SETUP.md) and [Spotify/mix setup](spotify-personalization.md).
