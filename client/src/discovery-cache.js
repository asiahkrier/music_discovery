const key = country => `ripple-discovery:${country}`;
const validArtist = artist => /^[A-Za-z0-9]{22}$/.test(artist?.id || '') && typeof artist.name === 'string' && Array.isArray(artist.tags);
export function readDiscovery(country, storage = globalThis.localStorage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(key(country)));
    if (!saved || !Number.isFinite(saved.until) || saved.until <= now || !Array.isArray(saved.artists)) return [];
    return saved.artists.filter(validArtist).slice(0, 80);
  } catch { return []; }
}
export function saveDiscovery(country, artists, storage = globalThis.localStorage, now = Date.now()) {
  try {
    const valid = artists.filter(validArtist).slice(0, 80);
    if (valid.length) storage.setItem(key(country), JSON.stringify({ artists: valid, until: now + 86400000 }));
  } catch { /* Discovery still works when browser storage is unavailable. */ }
}
