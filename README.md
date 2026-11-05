# Ripple

Ripple is a student music-discovery app built with React, Vite, Express, and Supabase. Spotify supplies catalog metadata and embedded playback; Last.fm supplies biographies, similarity, genre tags, and listener-based ranking data.

## Features

- Artist and song search, typing suggestions, and inline Spotify previews.
- Artist profiles with artwork, biographies, related artists, and all-time song rankings.
- Homepage discovery with a ten-second shuffle and microgenre exploration.
- Signup/login, profile customization, account settings, and saved artists/songs.
- Personalized Ripple Mix built from the current user's Ripple saves—not a connected Spotify account.

Catalog coverage, images, genres, and playback depend on provider availability. Ripple does not guarantee every artist, previews for every song, or uninterrupted Spotify access. Last.fm listener counts are not Spotify monthly listeners.

## Local setup

Use the Node 24 version specified by `.nvmrc` and `package.json`.

```sh
npm ci
cp .env.example .env
```

Fill in `.env` privately using [deployment and configuration](docs/deployment.md). For accounts and persistent caching, follow the [database migration guide](supabase/README.md).

```sh
npm run dev
```

Open the Vite URL printed in the terminal (normally http://127.0.0.1:5173). The backend uses port 3006 unless `PORT` overrides it. For a production-style local run:

```sh
npm run build
npm start
```

Open http://localhost:3006. Restart after changing server environment variables; rebuild after changing `VITE_` variables.

## Documentation

Start with the [documentation index](docs/README.md). It links setup, source files, API contracts, feature behavior, ranking explanations, and testing instructions.

## Contributing

Use feature branches and reviewed PRs to `main`. Before review, run:

```sh
npm test
npm run build
```

See [contributing](CONTRIBUTING.md). Keep secrets, dependencies, and generated build output out of Git. Sprint reports and demo recordings are historical coursework, not application dependencies.
