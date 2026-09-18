import express from 'express';
import { fileURLToPath } from 'node:url';
import { getMock, searchMock } from './mock-data.js';
import { convert } from 'html-to-text';

const list = value => Array.isArray(value) ? value : value ? [value] : [];
export function normalizeArtist(artist) {
  return {
    name: artist.name,
    tags: list(artist.tags?.tag).map(tag => tag.name).slice(0, 3),
    // React renders this as text, never as untrusted HTML.
    bio: convert(artist.bio?.summary || '', {
  wordwrap: false,
  selectors: [
    { selector: 'a', format: 'skip' },
    { selector: 'img', format: 'skip' },
  ],
}).trim(),
  };
}
export function createApp({ apiKey = '', fetchImpl = fetch } = {}) {
  const app = express();
  app.disable('x-powered-by');
  async function lastfm(method, artist) {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.search = new URLSearchParams({ method, artist, api_key: apiKey, format: 'json', limit: '10', autocorrect: '1' });
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Music service unavailable');
    const data = await response.json();
    if (data.error) throw new Error('Music service unavailable');
    return data;
  }
  app.get('/api/artists', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query || query.length > 100) return res.status(400).json({ error: 'Enter an artist name between 1 and 100 characters.' });
    let notice = '';
    if (apiKey) {
      try {
        const data = await lastfm('artist.search', query);
        return res.json({ source: 'live', artists: list(data.results?.artistmatches?.artist).map(normalizeArtist) });
      } catch { notice = 'Last.fm is unavailable. Showing matching sample artists instead.'; }
    }
    return res.json({ source: 'demo', notice, artists: searchMock(query) });
  });
  app.get('/api/artist', async (req, res) => {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (!name || name.length > 100) return res.status(400).json({ error: 'Enter a valid artist name.' });
    let notice = '';
    if (apiKey) {
      try {
        const info = await lastfm('artist.getInfo', name);
        if (!info.artist?.name) return res.status(404).json({ error: 'Artist not found.' });
        const artist = normalizeArtist(info.artist);
        let similar = [];
        try {
          const data = await lastfm('artist.getSimilar', artist.name);
          const seen = new Set([artist.name.toLowerCase()]);
          similar = list(data.similarartists?.artist).filter(a => {
            if (!a.name || seen.has(a.name.toLowerCase())) return false;
            seen.add(a.name.toLowerCase()); return true;
          }).slice(0, 5).map(normalizeArtist);
        } catch { notice = 'Artist loaded, but similar artists could not be loaded. Try again.'; }
        return res.json({ source: 'live', notice, artist, similar });
      } catch { notice = 'Last.fm is unavailable. Showing sample data for this artist instead.'; }
    }
    const artist = getMock(name);
    if (!artist) return res.status(404).json({ error: apiKey ? 'Live lookup failed and this artist is not in the demo catalog. Try Radiohead, Daft Punk, or SZA.' : 'Artist not in the demo catalog. Try Radiohead, Daft Punk, or SZA.' });
    return res.json({ source: 'demo', notice, artist, similar: artist.similar.map(getMock) });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use(express.static(fileURLToPath(new URL('../client/dist/', import.meta.url))));
  return app;
}
