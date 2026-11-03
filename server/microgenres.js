import { cleanTag } from './lastfm-tags.js';
import { matchArtist } from './recommendations.js';

const LASTFM = 'https://ws.audioscrobbler.com/2.0/';
const SIX_HOURS = 6 * 3600000;

// Broad genres are too general to be microgenres. Anything more specific
// (digicore, shoegaze, midwest emo, cloud rap...) counts as a microgenre.
const BROAD = new Set([
  'pop', 'rock', 'hip hop', 'hip-hop', 'hiphop', 'rap', 'rb', 'rnb', 'soul', 'electronic', 'electronica', 'edm',
  'dance', 'house', 'techno', 'indie', 'alternative', 'indie rock', 'indie pop', 'alternative rock', 'pop rock',
  'hard rock', 'classic rock', 'punk', 'punk rock', 'metal', 'heavy metal', 'jazz', 'folk', 'country', 'blues',
  'classical', 'reggae', 'latin', 'kpop', 'k-pop', 'jpop', 'j-pop', 'singer-songwriter', 'singer songwriter',
  'acoustic', 'instrumental', 'experimental', 'soundtrack', 'trap', 'underground', 'underground hip-hop',
  'underground hip hop', 'alternative hip-hop', 'alternative hip hop', 'funk', 'disco', 'gospel', 'world',
]);

// Tags about places, people or opinions rather than sound.
const NOT_GENRES = new Set([
  'american', 'british', 'english', 'uk', 'usa', 'us', 'canadian', 'australian', 'irish', 'scottish', 'welsh',
  'german', 'french', 'swedish', 'norwegian', 'danish', 'finnish', 'icelandic', 'dutch', 'belgian', 'spanish',
  'italian', 'portuguese', 'brazilian', 'mexican', 'argentinian', 'colombian', 'chilean', 'russian', 'polish',
  'ukrainian', 'japanese', 'korean', 'south korean', 'chinese', 'taiwanese', 'filipino', 'indian', 'nigerian',
  'ghanaian', 'south african', 'jamaican', 'new zealand', 'atlanta', 'chicago', 'london', 'los angeles',
  'new york', 'detroit', 'philadelphia', 'toronto', 'spotify', 'under 2000 listeners', 'love', 'awesome',
  'beautiful', 'cool', 'best', 'amazing', 'favorite', 'favourites', 'my favorite', 'female', 'male',
  'female vocalist', 'male vocalist', 'vocalists', 'producer', 'rapper', 'singer', 'band', 'chill', 'sad', 'happy',
]);

// Shown when someone has no saved artists yet (or is logged out).
export const STARTER_MICROGENRES = ['digicore', 'hyperpop', 'shoegaze', 'midwest emo', 'bedroom pop', 'cloud rap', 'dream pop', 'plugg'];

// Expects a cleaned tag; junk tags like "seen live" are never microgenres.
export function isMicrogenre(tag) {
  return Boolean(tag) && cleanTag(tag) === tag && tag.length >= 3 && tag.length <= 40 && !BROAD.has(tag) && !NOT_GENRES.has(tag) && !/^\d+$/.test(tag);
}

// artistTags: [{ artist: 'Lucy Bedroque', tags: [{ name: 'digicore', weight: 100 }, ...] }, ...]
// Ranks microgenres by how many of the artists have them, then by total tag weight.
export function pickMicrogenres(artistTags, limit = 8) {
  const totals = new Map();
  for (const { artist, tags } of artistTags) {
    const seen = new Set();
    for (const { name, weight } of tags) {
      const tag = cleanTag(name);
      if (!isMicrogenre(tag) || seen.has(tag)) continue;
      seen.add(tag);
      const entry = totals.get(tag) || { tag, count: 0, weight: 0, artists: [] };
      entry.count++;
      entry.weight += Number(weight) || 0;
      if (entry.artists.length < 3) entry.artists.push(artist);
      totals.set(tag, entry);
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.count - a.count || b.weight - a.weight || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map(({ tag, count, artists }) => ({ tag, count, artists }));
}

// Runs `task` on each item with at most `limit` running at once, keeping input order.
async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    if (next >= items.length) return;
    const index = next++;
    results[index] = await task(items[index], index);
    return run();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// Matches names three at a time, in order, and stops once `max` different artists are found.
// This avoids extra Spotify searches (and Spotify's rate limit) once the page has enough artists.
async function matchUntil(names, max, match) {
  const found = new Map();
  for (let start = 0; start < names.length && found.size < max; start += 3) {
    const batch = await Promise.all(names.slice(start, start + 3).map(match));
    for (const artist of batch) {
      if (artist && !found.has(artist.id) && found.size < max) found.set(artist.id, artist);
    }
  }
  return [...found.values()];
}

function cached(cache, key, ttl, load) {
  const entry = cache.get(key);
  if (entry && entry.until > Date.now()) return entry.promise;
  if (cache.size >= 300) cache.delete(cache.keys().next().value);
  const record = { promise: load(), until: Date.now() + ttl };
  cache.set(key, record);
  return record.promise;
}

export function createMicrogenres({ spotify, apiKey = '', fetchImpl = fetch }) {
  const tagCache = new Map(), artistCache = new Map();

  async function lastfm(params) {
    const query = new URLSearchParams({ ...params, api_key: apiKey, format: 'json', autocorrect: '0' });
    const response = await fetchImpl(`${LASTFM}?${query}`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Last.fm unavailable');
    const data = await response.json();
    if (data.error) throw new Error('Last.fm error');
    return data;
  }

  // An artist's strongest Last.fm tags (weight 10+ out of 100), at most 10.
  function topTags(name) {
    return cached(tagCache, name.toLowerCase(), SIX_HOURS, async () => {
      try {
        const data = await lastfm({ method: 'artist.getTopTags', artist: name });
        const tags = Array.isArray(data.toptags?.tag) ? data.toptags.tag : [];
        return tags.filter(t => Number(t?.count) >= 10).slice(0, 10).map(t => ({ name: t.name, weight: Number(t.count) }));
      } catch {
        return [];
      }
    });
  }

  const starters = () => ({ basis: 'starter', microgenres: STARTER_MICROGENRES.map(tag => ({ tag, count: 0, artists: [] })) });

  // Microgenres from a user's saved artist names; popular starters when there is nothing to go on.
  async function forArtists(names) {
    const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))].slice(0, 15);
    if (!apiKey || !unique.length) return starters();
    const artistTags = await mapLimit(unique, 3, async artist => ({ artist, tags: await topTags(artist) }));
    const microgenres = pickMicrogenres(artistTags);
    return microgenres.length ? { basis: 'saved', microgenres } : starters();
  }

  // Artists Last.fm lists for a microgenre (top 20), matched to Spotify (up to 12).
  function artistsForTag(tag, country) {
    const sourceUrl = `https://www.last.fm/tag/${encodeURIComponent(tag)}/artists`;
    if (!apiKey || !spotify.configured) return Promise.resolve({ tag, artists: [], sourceUrl });
    const key = `${tag}:${country}`;
    const promise = cached(artistCache, key, SIX_HOURS, async () => {
      try {
        const data = await lastfm({ method: 'tag.getTopArtists', tag, limit: '20' });
        const names = (Array.isArray(data.topartists?.artist) ? data.topartists.artist : [])
          .map(a => a?.name).filter(n => typeof n === 'string' && n.trim());
        const matched = await matchUntil(names, 12, name => matchArtist({ name, score: 0 }, spotify, country));
        return { tag, artists: matched.map(artist => ({ ...artist, tags: [tag] })), sourceUrl };
      } catch {
        return { tag, artists: [], sourceUrl };
      }
    });
    // Do not keep empty results for long, so a temporary outage can recover.
    return promise.then(result => {
      const entry = artistCache.get(key);
      if (!result.artists.length && entry) entry.until = Date.now() + 60000;
      return result;
    });
  }

  return { forArtists, artistsForTag };
}
