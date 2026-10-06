import express from 'express';
import { createLastfm } from './lastfm.js';
import { fileURLToPath } from 'node:url';
import { createSpotify, validId } from './spotify.js';
export function createApp({ fetchImpl = fetch, songOptions = {}, lastfmApiKey = '' } = {}) {
  const app = express();
  const biography = createLastfm({ apiKey: lastfmApiKey, fetchImpl });
  const spotify = createSpotify({ ...songOptions, fetchImpl });
  app.disable('x-powered-by');
  const route = (path, handler) => app.get(path, async (req, res) => {
    const country = req.query.country || 'US';
    if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return res.status(400).json({ error: 'Use a two-letter country code.' });
    if (req.query.id !== undefined && !validId(req.query.id)) return res.status(400).json({ error: 'Use a valid Spotify artist ID.' });
    if (req.query.q !== undefined && (typeof req.query.q !== 'string' || !req.query.q.trim() || req.query.q.length > 200)) return res.status(400).json({ error: 'Enter a search between 1 and 200 characters.' });
    try { res.json(await handler(req.query, country)); } catch (e) { res.status(e.status || 502).json({ error: e.status ? e.message : 'Spotify is temporarily unavailable. Please try again.' }); }
  });
  route('/api/song-providers', () => ({ providers: [{ id: 'spotify', name: 'Spotify', enabled: spotify.configured }] }));
  route('/api/artists', async ({ q }, country) => {
    if (!q) throw Object.assign(new Error('Enter an artist name or Spotify artist link.'), { status: 400 });
    const match = q.match(/^https:\/\/open\.spotify\.com\/artist\/([A-Za-z0-9]{22})(?:\?.*)?$/);
    return { artists: match ? [await spotify.profile(match[1])] : await spotify.search(q, country), country };
  });
  route('/api/artist', async ({ id }, country) => {
    if (!validId(id)) throw Object.assign(new Error('Choose a Spotify artist.'), { status: 400 });
    return { artist: await spotify.profile(id), country, source: 'Spotify' };
  });
  route('/api/artist-biography', async ({ id }) => {
    if (!validId(id)) throw Object.assign(new Error('Choose a Spotify artist.'), { status: 400 });
    if (!lastfmApiKey) return { text: '', sourceUrl: '' };
    const artist = await spotify.profile(id);
    return biography(artist.name);
  });
  route('/api/discover', async (_, country) => ({ artists: await spotify.discover(country), country, notice: 'Shuffled Spotify genre searches, including different result pages. This is not a popularity ranking.' }));
  route('/api/related-artists', async ({ id }, country) => {
    if (!validId(id)) throw Object.assign(new Error('Choose a Spotify artist.'), { status: 400 });
    return spotify.related(id, country);
  });
  route('/api/songs', async ({ q }, country) => {
    if (!q) throw Object.assign(new Error('Enter a song or artist.'), { status: 400 });
    return { songs: await spotify.songs(q, country), country, providers: [{ name: 'Spotify', status: 'ok' }] };
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use(express.static(fileURLToPath(new URL('../client/dist/', import.meta.url))));
  return app;
}
