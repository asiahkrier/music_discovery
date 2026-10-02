# Setup and Render deployment

## Credentials

Create a developer app in the [Spotify dashboard](https://developer.spotify.com/dashboard). Its Client ID and Client Secret are used on the server. Development-mode requirements and available endpoints/fields depend on Spotify's current access rules; consult the [migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide). App owners currently need Premium. Getting credentials does not guarantee biographies, genres, or Spotify's Fans also like list.

For local use, copy `.env.example` to `.env` beside `package.json`:

```dotenv
PORT=3006
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

Replace placeholders privately. Do not prefix these values with `VITE_` or put them in client JavaScript. `.env` is ignored by Git. Each developer uses their own local file; the shared app can use the same credentials. Restart the server after edits.

## Render

1. Merge the reviewed update PR into the branch your Render service deploys (normally `main`). Setting credentials alone does not deploy local code.
2. Use a **Node web service** connected to this repository. Root directory is the repository root (the directory containing `package.json`).
3. Build command: `npm ci --include=dev && npm run build`.
4. Start command: `npm start`.
5. In the service's **Environment** page, add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` with their actual values. No `.env` upload is necessary. Keep Render's supplied `PORT`; the server already honors it.
6. Select **Save, rebuild, and deploy** when both code/build and environment need updating. **Save and deploy** reuses the existing build. If auto-deploy is disabled, manually deploy the latest merged commit.
7. Check deployment logs and test artist search, song search, profile artwork, and the Spotify player. Test both a mainstream artist and a lesser-known artist.

[Render environment-variable instructions](https://render.com/docs/configure-environment-variables)

## Troubleshooting

| Symptom | Check |
|---|---|
| Connect Spotify message | Both variables must be present in the running backend environment. Restart locally or redeploy on Render. |
| Spotify authentication/access error | Correct app credentials, owner subscription, app eligibility, and current Spotify developer restrictions. Do not share the secret in a screenshot. |
| Artist link works but names do not | Public oEmbed can work without Web API credentials; it does not enable catalog search. |
| No similar artists | Spotify may omit genres; Ripple cannot score a genre match without them. Check the explanatory message rather than assuming credentials guarantee suggestions. |
| Missing photo | Spotify supplied no artwork, or the browser failed to load it; initials are the fallback. |
| Player unavailable | Use Reload player or Open in Spotify. Browser restrictions, region, Spotify session, and Spotify availability can affect playback. |
| Spotify busy | Wait for the provider cooldown. Repeated retries do not bypass it. |
| Local frontend API errors | Default backend is 3006 and Vite is 5173. Any custom `PORT` must be consistent; restart `npm run dev` after changing it. |

The server caches discovery in memory. Restarting clears that cache. There is no persistent database or background music-data import.
