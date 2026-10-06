import dotenv from 'dotenv';
import { createApp } from './app.js';
dotenv.config({ quiet: true });
const port = Number(process.env.PORT) || 3006;
createApp({ lastfmApiKey: process.env.LASTFM_API_KEY?.trim(), songOptions: { spotifyId: process.env.SPOTIFY_CLIENT_ID?.trim(), spotifySecret: process.env.SPOTIFY_CLIENT_SECRET?.trim() } }).listen(port, '0.0.0.0', () => console.log(`Ripple: http://localhost:${port} (Spotify with Last.fm biographies)`));
