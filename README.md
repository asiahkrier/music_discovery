# Music Discovery · Sprint 1

A beginner-friendly React + Vite frontend and small Node/Express backend. Search for an artist, select a result, and explore up to five similar artists. No database or login is needed.

## Run on macOS

1. Install Node.js 24 LTS from https://nodejs.org (npm is included). If you use nvm, run `nvm install` in this folder; `.nvmrc` selects version 24.
2. Open Terminal in this `music_discovery` folder.
3. Run:

```sh
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Keep Terminal running; press Control+C to stop both servers. The server listens on port 3001 and Vite on 5173. If either port is busy, stop the other app. To change the backend port, update `PORT` in `.env` and restart; Vite reads the same setting.

Frontend edits refresh automatically. After editing backend files, stop and restart `npm run dev`.

No API key is needed for the demo. Try **Radiohead**, **Daft Punk**, or **SZA**, then click any recommendation. There are 18 searchable sample artists. Unknown searches return an honest empty state. Demo recommendations are hand-curated associations, not measured similarity scores.

## Optional live Last.fm data

Create an API account/key at https://www.last.fm/api/account/create and review the provider's terms. Add the key to the root `.env`:

```dotenv
LASTFM_API_KEY=your_key_here
PORT=3001
```

Restart `npm run dev`. The backend calls Last.fm's [artist.search](https://www.last.fm/api/show/artist.search), [artist.getInfo](https://www.last.fm/api/show/artist.getInfo), and [artist.getSimilar](https://www.last.fm/api/show/artist.getSimilar) endpoints. The frontend displays whether a response is live or sample data. Real artists may have fewer than three recommendations; the app never invents live matches to fill the grid.

The API key stays on the server. **Never prefix a secret with `VITE_`**, which would expose it in the browser bundle. `.env` is ignored by Git; commit only `.env.example`. The server uses a fixed upstream URL, validates query length, and applies an eight-second upstream timeout. If Last.fm fails, matching demo data is returned with a visible notice. An artist outside the demo catalog gets an explanatory error. If only the similar-artist lookup fails, the live profile remains visible with a notice.

Live behavior is covered with simulated service responses; a real credential was not supplied for end-to-end Last.fm validation.

## Production build / local demo

```sh
npm run build
npm start
```

Open http://localhost:3001. Express serves both the built frontend and API. `npm start` requires the build first. This is a local classroom project, bound to the local computer; public hosting would need an appropriate secret store and request/rate controls.

## File guide

```text
music_discovery/
├── client/
│   ├── index.html
│   ├── vite.config.js        # React setup and local API proxy
│   ├── public/images/       # Bundled licensed photo
│   └── src/
│       ├── main.jsx         # Search, results, artist and recommendation UI
│       └── styles.css       # Responsive dark theme
├── server/
│   ├── index.js             # Environment loading and server startup
│   ├── app.js               # API routes and Last.fm adapter
│   ├── mock-data.js         # Sample artist catalog
│   └── app.test.js          # API and fallback tests
├── .env.example
├── .gitignore
├── .nvmrc
├── package.json
└── package-lock.json
```

The browser requests `/api/artists?q=…` for search and `/api/artist?name=…` for details and recommendations. React state drives loading, results, errors, and the selected artist. A new action cancels the previous browser request so slow responses cannot overwrite newer choices. Bios are rendered as text, never injected HTML.

## Checks and classroom demo

```sh
npm test
npm run build
```

Manual acceptance checks:

- Search `radio`, choose Radiohead, and see its profile and five recommendations.
- Select Thom Yorke and confirm both the profile and recommendations change.
- Search a nonsense name and confirm the empty state.
- Submit whitespace and confirm a useful validation message.
- Use Tab and Enter to complete the same flow; check at a narrow mobile width.
- Leave the key blank to verify demo mode. With an invalid key, verify the fallback notice. Use a valid key to verify live mode.

## Add to your shared GitHub repository

Copy **the contents** of this folder into your existing `music_discovery` checkout, including `.gitignore`, `.env.example`, and `.nvmrc`. Do not replace an existing `.git` directory. Review overlapping files first. Do not copy `node_modules`, `.env`, or `client/dist`.

From your shared repo checkout, create a branch, then stage the app files:

```sh
git switch -c sprint1/music-discovery
npm install
npm test
npm run build
git add client server package.json package-lock.json README.md CREDITS.md .gitignore .env.example .nvmrc
git status
```

Check that `.env` and `node_modules` are absent from the staged changes, then commit and push your branch and open a pull request using your usual workflow. No remote repository was changed by this delivery.

Suggested two-person split: one person owns the React interface and accessibility checks; the other owns API integration, demo data, and service tests. Review each other's pull requests. Playback, accounts, saved libraries, and advanced recommendation algorithms are outside Sprint 1.
