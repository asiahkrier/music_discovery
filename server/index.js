import dotenv from 'dotenv';
import { createApp } from './app.js';
dotenv.config({ quiet: true });
const port = Number(process.env.PORT) || 3001;
createApp({ apiKey: process.env.LASTFM_API_KEY?.trim() }).listen(port, '127.0.0.1', () => {
  console.log(`Music Discovery: http://localhost:${port} (${process.env.LASTFM_API_KEY?.trim() ? 'Last.fm enabled' : 'demo mode'})`);
});
