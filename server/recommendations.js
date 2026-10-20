const normalize = value => value.normalize('NFKC').trim().toLowerCase();
const empty = () => ({ artists: [], method: 'lastfm', basis: 'No similar artists could be matched to Spotify right now.' });

// Tags that describe the listener, not the music.
const JUNK_TAGS = new Set(['seen live', 'favorites', 'favourite', 'female vocalists', 'male vocalists', 'all']);

function cleanTags(data) {
  const tags = data?.artist?.tags?.tag;
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => normalize(String(t?.name || '')).replace(/[^\p{L}\p{N} -]/gu, '').replace(/\s+/g, ' ').trim())
    .filter(t => t && !JUNK_TAGS.has(t) && !/^\d{2,4}s$/.test(t)); // drops decade tags like "90s" or "2010s"
}

// Tags both artists have.
function sharedTags(a, b) {
  const setB = new Set(b);
  return [...new Set(a)].filter(t => setB.has(t));
}

// How much two artists' tags overlap, from 0 (none) to 1 (identical). This is called Jaccard similarity.
function tagOverlap(a, b) {
  const all = new Set([...a, ...b]).size;
  return all ? sharedTags(a, b).length / all : 0;
}

// Rewards smaller artists: about 1 if much smaller, 0.5 if the same size, close to 0 if much bigger.
function discoveryScore(candidateListeners, currentListeners) {
  if (!candidateListeners || !currentListeners) return 0.5;
  return 1 / (1 + candidateListeners / currentListeners);
}

// Ripple's own formula.
function rippleScore(similarity, overlap, discovery) {
  return 0.5 * similarity + 0.3 * overlap + 0.2 * discovery;
}

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
  return [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 30)
}

async function matchArtist(candidate, spotify, country) {
  try {
    const results = await spotify.search(candidate.name, country);
       const exact = results.filter(a => normalize(a.name) === normalize(candidate.name));
    // Same-name accounts: use Spotify's top-ranked exact match, preferring one with a photo.
    const best = exact.find(a => a.image) || exact[0];
    if (!best) return null;
    return { ...best, score: candidate.score };
  } catch {
    return null;
  }
}

export function createRecommendations({ spotify, apiKey = '', fetchImpl = fetch }) {
  const cache = new Map();

    async function artistInfo(name) {
    try {
      const params = new URLSearchParams({ method: 'artist.getInfo', artist: name, api_key: apiKey, format: 'json', autocorrect: '0' });
      const response = await fetchImpl(`https://ws.audioscrobbler.com/2.0/?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return { tags: [], listeners: 0 };
      const data = await response.json();
      return { tags: cleanTags(data), listeners: Number(data?.artist?.stats?.listeners) || 0 };
    } catch {
      return { tags: [], listeners: 0 };
    }
  }

  async function lookup(id, country) {
    try {
      const current = await spotify.profile(id);
      const params = new URLSearchParams({ method: 'artist.getSimilar', artist: current.name, api_key: apiKey, format: 'json', autocorrect: '0', limit: '30' });
      const response = await fetchImpl(`https://ws.audioscrobbler.com/2.0/?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return empty();
            const candidates = rankedArtists(await response.json(), current.name);
      const currentInfo = await artistInfo(current.name);
      // At most three candidates at once: find each on Spotify, then score it with Last.fm tags and listeners.
      const results = new Array(candidates.length);
      let next = 0;
      async function worker() {
        const index = next++;
        if (index >= candidates.length) return;
        const candidate = candidates[index];
        const artist = await matchArtist(candidate, spotify, country);
        if (artist) {
          const info = await artistInfo(candidate.name);
          const overlap = tagOverlap(currentInfo.tags, info.tags);
          const discovery = discoveryScore(info.listeners, currentInfo.listeners);
          const score = rippleScore(candidate.score, overlap, discovery);
          const shared = sharedTags(currentInfo.tags, info.tags);
          results[index] = { ...artist, score: Math.round(score * 100) / 100, recommendationReason: shared.slice(0, 2).join(', ') };
        }
        return worker();
      }
      await Promise.all(Array.from({ length: 3 }, () => worker()));
      const unique = new Map();
      for (const artist of results) {
        if (artist && artist.id !== id && normalize(artist.name) !== normalize(current.name)) unique.set(artist.id, artist);
      }
      // Rank by Ripple Score instead of Last.fm's order.
      const artists = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 12);
      if (!artists.length) return empty();
      return { artists, method: 'lastfm', basis: 'Ranked by Ripple Score: Last.fm similarity, shared tags, and a boost for smaller artists.', sourceUrl: `https://www.last.fm/music/${encodeURIComponent(current.name)}/+similar` };
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
