import dotenv from 'dotenv';
import { createApp } from './app.js';
dotenv.config({ quiet: true });
const port = Number(process.env.PORT) || 3006;
createApp({ spotifyAccountOptions: { url: process.env.VITE_SUPABASE_URL, secret: process.env.SUPABASE_SERVICE_ROLE_KEY, clientId: process.env.SPOTIFY_CLIENT_ID, clientSecret: process.env.SPOTIFY_CLIENT_SECRET, redirectUri: process.env.SPOTIFY_REDIRECT_URI, encryptionKey: process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY }, accountOptions: { url: process.env.VITE_SUPABASE_URL, publicKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY, secret: process.env.SUPABASE_SERVICE_ROLE_KEY }, lastfmApiKey: process.env.LASTFM_API_KEY?.trim(), songOptions: { spotifyId: process.env.SPOTIFY_CLIENT_ID?.trim(), spotifySecret: process.env.SPOTIFY_CLIENT_SECRET?.trim() } }).listen(port, '0.0.0.0', () => console.log(`Ripple: http://localhost:${port} (Spotify with Last.fm biographies)`));
