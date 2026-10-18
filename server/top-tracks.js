// All-time top songs: Last.fm ranks an artist's tracks by total listeners,
// then each title is matched to Spotify so it can be previewed.
const normalize = value => value.normalize('NFKC').trim().toLowerCase();
const empty = () => ({ tracks: [], source: 'lastfm' });

export function createTopTracks({ spotify, apiKey = '', fetchImpl = fetch }) {
  const cache = new Map();

  async function matchOnSpotify(title, artistName, country) {
    try {
      const results = await spotify.songs(`track:"${title}" artist:"${artistName}"`, country);
      // Only accept a result whose title matches and that lists this artist.
      return results.find(song => normalize(song.title) === normalize(title)
        && song.artist.split(', ').some(name => normalize(name) === normalize(artistName))) || null;
    } catch {
      return null;
    }
  }

  async function lookup(id, country) {
    try {
      const artist = await spotify.profile(id);
      const params = new URLSearchParams({ method: 'artist.getTopTracks', artist: artist.name, api_key: apiKey, format: 'json', autocorrect: '0', limit: '10' });
      const response = await fetchImpl(`https://ws.audioscrobbler.com/2.0/?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return empty();
      const data = await response.json();
      const list = data.toptracks?.track;
      if (data.error || !Array.isArray(list)) return empty();
      const seen = new Set();
      const candidates = [];
      for (const item of list) {
        if (typeof item?.name !== 'string' || !item.name.trim()) continue;
        const key = normalize(item.name);
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ title: item.name, listeners: Number(item.listeners) || 0 });
      }
      const matches = await Promise.all(candidates.map(c => matchOnSpotify(c.title, artist.name, country)));
      const tracks = candidates.map((c, i) => ({ ...c, spotifyId: matches[i]?.id || '', url: matches[i]?.url || '', image: matches[i]?.image || '', durationMs: matches[i]?.durationMs || 0 }))
        .sort((a, b) => b.listeners - a.listeners);
      return { tracks, source: 'lastfm', sourceUrl: `https://www.last.fm/music/${encodeURIComponent(artist.name)}/+tracks` };
    } catch {
      // Never expose upstream URLs, which contain the API key.
      return empty();
    }
  }

  return async function topTracks(id, country) {
    if (!apiKey) return empty();
    const key = `${id}:${country}`;
    const entry = cache.get(key);
    if (entry && entry.until > Date.now()) return entry.promise;
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    const record = { promise: lookup(id, country), until: Date.now() + 3600000 };
    cache.set(key, record);
    const result = await record.promise;
    if (!result.tracks.length) record.until = Date.now() + 60000;
    return result;
  };
}
