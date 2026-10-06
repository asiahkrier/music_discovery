import { randomInt } from 'node:crypto';
import { normalizeTags } from './genres.js';
const idPattern = /^[A-Za-z0-9]{22}$/;
export const validId = id => typeof id === 'string' && idPattern.test(id);
function artist(a) {
  return { id: a.id, spotifyId: a.id, name: a.name, tags: normalizeTags(a.genres || []), rawGenres: a.genres || [], image: a.images?.[0]?.url || '', imageSource: `https://open.spotify.com/artist/${a.id}`, url: `https://open.spotify.com/artist/${a.id}`, spotifyEmbed: `https://open.spotify.com/embed/artist/${a.id}?utm_source=generator`, source: 'Spotify' };
}
const fail = (message, status = 502) => Object.assign(new Error(message), { status });
export function createSpotify({ spotifyId = '', spotifySecret = '', fetchImpl = fetch } = {}) {
  let token, expires = 0, pending, blockedUntil = 0;
  const configured = Boolean(spotifyId && spotifySecret);
  async function json(url, options = {}) {
    if (Date.now() < blockedUntil) throw fail('Spotify is busy. Please try again in a minute.', 429);
    const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (response.status === 429) { blockedUntil = Date.now() + Math.max(1, Number(response.headers?.get('retry-after')) || 60) * 1000; throw fail('Spotify is busy. Please try again later.', 429); }
    if (!response.ok) throw fail(response.status === 403 ? 'Spotify denied access. Check your Spotify developer app access.' : 'Spotify could not load this request.', response.status === 404 ? 404 : 502);
    return response.json();
  }
  async function accessToken() {
    if (!configured) throw fail('Connect Spotify to enable catalog search and discovery. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the local .env file, then restart Ripple.', 503);
    if (token && Date.now() < expires) return token;
    const encodedCredentials = Buffer.from(spotifyId + ':' + spotifySecret).toString('base64');
    if (!pending) pending = json('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${encodedCredentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }).then(data => {
      if (!data.access_token) throw fail('Spotify authentication failed.');
      token = data.access_token; expires = Date.now() + Math.max(0, (data.expires_in || 3600) - 60) * 1000; return token;
    }).finally(() => { pending = null; });
    return pending;
  }
  async function api(path, params = {}) { return json(`https://api.spotify.com/v1/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${await accessToken()}` } }); }
  async function profile(id) {
    if (configured) return artist(await api(`artists/${id}`));
    const artistUrl = `https://open.spotify.com/artist/${id}`;
    const params = new URLSearchParams({ url: artistUrl });
    const data = await json(`https://open.spotify.com/oembed?${params}`);
    return artist({ id, name: data.title, images: data.thumbnail_url ? [{ url: data.thumbnail_url }] : [] });
  }
  async function search(q, country, offset = 0) { const data = await api('search', { q, type: 'artist', market: country, limit: 10, offset }); return (data.artists?.items || []).filter(a => validId(a.id)).map(artist); }
  const cache = new Map();
  async function discover(country) {
    if (cache.has(country) && cache.get(country).until > Date.now()) return cache.get(country).promise;
    const promise = (async () => {
      const pool = new Map();
      // Search different scenes and depths; do not label search rank as popularity.
      const genres = ['pop', 'hip-hop', 'r&b', 'k-pop', 'house', 'shoegaze', 'ambient', 'indie rock'];
      const groups = await Promise.all(genres.map(genre => search(`genre:"${genre}"`, country, randomInt(5) * 10)));
      for (const a of groups.flat()) pool.set(a.id, a);
      return [...pool.values()];
    })();
    if (cache.size >= 20) cache.delete(cache.keys().next().value);
    cache.set(country, { until: Date.now() + 300000, promise });
    try { return await promise; } catch (e) { cache.delete(country); throw e; }
  }
  async function searchSuggestions(current, country) {
    const matches = await search(current.name, country);
    // Require the exact Spotify identity before treating the remaining search hits as suggestions.
    if (!matches.some(match => match.id === current.id)) {
      return { artists: [], basis: 'Spotify did not return a verified set of suggestions for this artist.' };
    }
    const candidates = new Map();
    for (const match of matches) {
      if (match.id !== current.id && match.name.toLowerCase() !== current.name.toLowerCase()) candidates.set(match.id, match);
    }
    return {
      artists: [...candidates.values()].slice(0, 6),
      basis: 'Artists suggested by Spotify search for ' + current.name + '. These are search suggestions, not Spotify’s Fans also like list.',
      method: 'spotify-search',
    };
  }
  async function related(id, country) {
    const current = await profile(id);
    if (!current.rawGenres.length) {
      if (configured) return searchSuggestions(current, country);
      return { artists: [], basis: 'Connect Spotify catalog access to load artist suggestions.' };
    }
    const candidates = new Map();
    const groups = await Promise.all(current.rawGenres.slice(0, 2).map(genre => search(`genre:"${genre}"`, country)));
    for (const a of groups.flat()) {
      const overlap = a.rawGenres.filter(g => current.rawGenres.includes(g)).length;
      if (a.id !== id && overlap) candidates.set(a.id, { ...a, score: overlap, recommendationReason: a.tags.join(' · ') || 'musical style' });
    }
    if (!candidates.size) return searchSuggestions(current, country);
    return { artists: [...candidates.values()].sort((a,b) => b.score - a.score).slice(0,6), basis: 'Ripple suggestions based on shared Spotify genres; this is not Spotify’s Fans also like list.' };
  }
  async function songs(q, country) {
    const data = await api('search', { q, type: 'track', market: country, limit: 10 });
    return (data.tracks?.items || []).filter(Boolean).map(t => ({ id: t.id, title: t.name, artist: t.artists.map(a => a.name).join(', '), album: t.album?.name, url: `https://open.spotify.com/track/${t.id}`, providerName: 'Spotify' }));
  }
  return { configured, profile, search, discover, related, songs };
}
