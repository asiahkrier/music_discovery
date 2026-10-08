const normalize = value => value.normalize('NFKC').trim().toLowerCase();
const empty = () => ({ artists: [], method: 'lastfm', basis: 'No similar artists could be matched to Spotify right now.' });

function rankedArtists(data, name) {
  const result = data.similarartists;
  if (data.error || !Array.isArray(result?.artist)) return [];
  const sourceName = result['@attr']?.artist;
  if (typeof sourceName !== 'string' || normalize(sourceName) !== normalize(name)) return [];
  const unique = new Map();
  for (const item of result.artist) {
    if (typeof item?.name !== 'string' || !item.name.trim()) continue;
    const key = normalize(item.name);
    const score = Number(item.match);
    if (key === normalize(name) || !Number.isFinite(score) || score <= 0 || score > 1) continue;
    if (!unique.has(key) || unique.get(key).score < score) unique.set(key, { name: item.name, score });
  }
  return [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 12);
}

async function matchArtist(candidate, spotify, country) {
  try {
    const results = await spotify.search(candidate.name, country);
    const matches = new Map(results.filter(a => normalize(a.name) === normalize(candidate.name)).map(a => [a.id, a]));
    // Skip ambiguous same-name Spotify identities instead of selecting the first hit.
    if (matches.size !== 1) return null;
    return { ...matches.values().next().value, score: candidate.score };
  } catch {
    return null;
  }
}

export function createRecommendations({ spotify, apiKey = '', fetchImpl = fetch }) {
  const cache = new Map();
  async function lookup(id, country) {
    try {
      const current = await spotify.profile(id);
      const params = new URLSearchParams({ method: 'artist.getSimilar', artist: current.name, api_key: apiKey, format: 'json', autocorrect: '0', limit: '12' });
      const response = await fetchImpl(`https://ws.audioscrobbler.com/2.0/?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return empty();
      const candidates = rankedArtists(await response.json(), current.name);
      // At most three Spotify searches at once; preserve Last.fm ranking.
      const results = new Array(candidates.length);
      let next = 0;
      async function worker() {
        const index = next++;
        if (index >= candidates.length) return;
        results[index] = await matchArtist(candidates[index], spotify, country);
        return worker();
      }
      await Promise.all(Array.from({ length: 3 }, () => worker()));
      const unique = new Map();
      for (const artist of results) {
        if (artist && artist.id !== id && normalize(artist.name) !== normalize(current.name)) unique.set(artist.id, artist);
      }
      const artists = [...unique.values()].slice(0, 6);
      if (!artists.length) return empty();
      return { artists, method: 'lastfm', basis: 'Similar artists recommended by Last.fm, available on Spotify.', sourceUrl: `https://www.last.fm/music/${encodeURIComponent(current.name)}/+similar` };
    } catch {
      // Do not leak API keys in upstream URLs or block the artist player.
      return empty();
    }
  }
  return async function related(id, country) {
    if (!apiKey || !spotify.configured) return empty();
    const key = `${id}:${country}`;
    const entry = cache.get(key);
    if (entry && entry.until > Date.now()) return entry.promise;
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    const record = { promise: lookup(id, country), until: Date.now() + 3600000 };
    cache.set(key, record);
    const result = await record.promise;
    if (!result.artists.length) record.until = Date.now() + 60000;
    return result;
  };
}
