// Public search results only. Bounded, country-specific and short lived.
const results = new Map();
export const suggestionKey = (kind, country, query) => `${kind}:${country}:${query.trim().toLowerCase()}`;
export function readSuggestions(key, now = Date.now()) {
  const entry = results.get(key);
  if (entry?.until > now) return entry.items;
  results.delete(key);
  return null;
}
export function saveSuggestions(key, items, now = Date.now()) {
  if (results.size >= 100) results.delete(results.keys().next().value);
  results.set(key, { items, until: now + 300000 });
}
