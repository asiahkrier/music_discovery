import dotenv from 'dotenv';
import { createApp } from './app.js';
dotenv.config({ quiet: true });
const port = Number(process.env.PORT) || 3001;
createApp({ apiKey: process.env.LASTFM_API_KEY?.trim() }).listen(port, '0.0.0.0', () => {
  console.log(`Music Discovery: http://localhost:${port} (${process.env.LASTFM_API_KEY?.trim() ? 'Last.fm enabled' : 'demo mode'})`);
});
