import { convert } from 'html-to-text';

const normalizeName = name => name.normalize('NFKC').trim().toLowerCase();
const unavailable = () => ({ text: '', sourceUrl: '' });

// Last.fm identifies artists by name; shared names cannot always be disambiguated.
export function createLastfm({ apiKey = '', fetchImpl = fetch } = {}) {
  const cache = new Map();
  async function lookup(name) {
    try {
      const params = new URLSearchParams({ method: 'artist.getInfo', artist: name, api_key: apiKey, format: 'json', lang: 'en', autocorrect: '0' });
      const response = await fetchImpl(`https://ws.audioscrobbler.com/2.0/?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) return unavailable();
      const data = await response.json();
      const artist = data.artist;
      if (data.error || typeof artist?.name !== 'string' || normalizeName(artist.name) !== normalizeName(name)) return unavailable();
      const summary = artist.bio?.summary;
      if (typeof summary !== 'string') return unavailable();
      const text = convert(summary.slice(0, 20000), {
        wordwrap: false,
        selectors: [{ selector: 'a', format: 'skip' }, { selector: 'img', format: 'skip' }],
      }).trim();
      if (!text) return unavailable();
      return { text, sourceUrl: `https://www.last.fm/music/${encodeURIComponent(artist.name)}` };
    } catch {
      // Never expose upstream URLs (which contain the API key) or block playback.
      return unavailable();
    }
  }
  return async function biography(name) {
    if (!apiKey || typeof name !== 'string' || !name.trim()) return unavailable();
    const key = normalizeName(name);
    const existing = cache.get(key);
    if (existing && existing.until > Date.now()) return existing.promise;
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    const promise = lookup(name);
    const entry = { promise, until: Date.now() + 3600000 };
    cache.set(key, entry);
    const result = await promise;
    if (!result.text) entry.until = Date.now() + 60000;
    return result;
  };
}
