import { randomInt } from 'node:crypto';
import { normalizeTags } from './genres.js';
const idPattern = /^[A-Za-z0-9]{22}$/;
export const validId = id => typeof id === 'string' && idPattern.test(id);
function artist(a) {
  return { id: a.id, spotifyId: a.id, name: a.name, tags: normalizeTags(a.genres || []), rawGenres: a.genres || [], image: a.images?.[0]?.url || '', imageSource: `https://open.spotify.com/artist/${a.id}`, url: `https://open.spotify.com/artist/${a.id}`, spotifyEmbed: `https://open.spotify.com/embed/artist/${a.id}?utm_source=generator`, source: 'Spotify' };
}
const fail = (message, status = 502) => Object.assign(new Error(message), { status });
export function createSpotify({ spotifyId = '', spotifySecret = '', fetchImpl = fetch, now = Date.now } = {}) {
  let token, expires = 0, pending, blockedUntil = 0;
  const responses = new Map();
  function rateLimitError() {
    const seconds = Math.max(1, Math.ceil((blockedUntil - now()) / 1000));
    return Object.assign(fail('Music discovery is temporarily unavailable while the catalog recovers. Please try again later.', 429), { retryAfter: seconds });
  }
  const configured = Boolean(spotifyId && spotifySecret);
  async function json(url, options = {}) {
    if (now() < blockedUntil) throw rateLimitError();
    const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (response.status === 429) { blockedUntil = now() + Math.max(1, Number(response.headers?.get('retry-after')) || 60) * 1000; throw rateLimitError(); }
    if (!response.ok) throw fail(response.status === 403 ? 'Spotify denied access. Check your Spotify developer app access.' : 'Spotify could not load this request.', response.status === 404 ? 404 : 502);
    return response.json();
  }
  async function accessToken() {
    if (!configured) throw fail('Music catalog access is temporarily unavailable. Please try again later.', 503);
    if (token && Date.now() < expires) return token;
    const encodedCredentials = Buffer.from(spotifyId + ':' + spotifySecret).toString('base64');
    if (!pending) pending = json('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${encodedCredentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' }).then(data => {
      if (!data.access_token) throw fail('Spotify authentication failed.');
      token = data.access_token; expires = Date.now() + Math.max(0, (data.expires_in || 3600) - 60) * 1000; return token;
    }).finally(() => { pending = null; });
    return pending;
  }
  async function api(path, params = {}) {
    const query = new URLSearchParams(params);
    query.sort();
    const url = `https://api.spotify.com/v1/${path}?${query}`;
    const cached = responses.get(url);
    if (cached && cached.until > now()) return cached.promise;
    const promise = (async () => json(url, { headers: { Authorization: `Bearer ${await accessToken()}` } }))();
    if (responses.size >= 500) responses.delete(responses.keys().next().value);
    responses.set(url, { until: now() + 300000, promise });
    try { return await promise; }
    catch (error) {
      if (responses.get(url)?.promise === promise) responses.delete(url);
      throw error;
    }
  }
  async function profile(id) {
    if (configured) return artist(await api(`artists/${id}`));
    const artistUrl = `https://open.spotify.com/artist/${id}`;
    const params = new URLSearchParams({ url: artistUrl });
    const data = await json(`https://open.spotify.com/oembed?${params}`);
    return artist({ id, name: data.title, images: data.thumbnail_url ? [{ url: data.thumbnail_url }] : [] });
  }
  async function search(q, country, offset = 0) { const data = await api('search', { q, type: 'artist', market: country, limit: 10, offset }); return (data.artists?.items || []).filter(a => validId(a.id)).map(artist); }
  const cache = new Map();
  const recentPools = new Map();
  const genres = ['pop', 'hip-hop', 'r&b', 'k-pop', 'house', 'shoegaze', 'ambient', 'indie rock'];
  async function discoveryGroups(country, offset = 0) {
    if (offset >= genres.length) return [];
    const batch = await Promise.allSettled(genres.slice(offset, offset + 2).map(genre => search(`genre:"${genre}"`, country, randomInt(5) * 10)));
    const artists = batch.filter(result => result.status === 'fulfilled').flatMap(result => result.value);
    const error = batch.find(result => result.status === 'rejected');
    if (error) {
      if (artists.length) return artists;
      throw error.reason;
    }
    try { return artists.concat(await discoveryGroups(country, offset + 2)); }
    catch (error) { if (artists.length) return artists; throw error; }
  }
  async function discover(country) {
    const cached = cache.get(country);
    if (cached && cached.until > now()) return cached.promise;
    const promise = (async () => {
      try {
        const artists = [...new Map((await discoveryGroups(country)).map(a => [a.id, a])).values()];
        if (artists.length) {
          if (recentPools.size >= 20) recentPools.delete(recentPools.keys().next().value);
          recentPools.set(country, { artists, until: now() + 86400000 });
        }
        return artists;
      } catch (error) {
        const recent = recentPools.get(country);
        if (recent && recent.until > now()) return recent.artists;
        recentPools.delete(country);
        throw error;
      }
    })();
    if (cache.size >= 20) cache.delete(cache.keys().next().value);
    cache.set(country, { until: now() + 3600000, promise });
    try { return await promise; }
    catch (error) { cache.delete(country); throw error; }
  }
  async function songArtwork(id) {
    const track = await api(`tracks/${id}`);
    return { image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '' };
  }
  async function songs(q, country) {
    const data = await api('search', { q, type: 'track', market: country, limit: 10 });
    return (data.tracks?.items || []).filter(Boolean).map(t => ({ id: t.id, title: t.name, artist: t.artists.map(a => a.name).join(', '), album: t.album?.name, image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '', durationMs: t.duration_ms || 0, url: `https://open.spotify.com/track/${t.id}`, providerName: 'Spotify' }));
  }
  async function catalog(path) {
    const [endpoint, query = ''] = path.split('?');
    if (endpoint !== 'search' && !/^tracks\/[A-Za-z0-9]{22}$/.test(endpoint)) throw fail('Unsupported catalog request.', 400);
    return api(endpoint, Object.fromEntries(new URLSearchParams(query)));
  }
  return { configured, profile, search, discover, songs, songArtwork, catalog };
}
