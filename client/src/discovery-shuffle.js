// Prefer artists outside the last visible group; fill from that group only for small pools.
export function nextArtists(artists, previous = [], size = 6, random = Math.random) {
  const excluded = new Set(previous.map(a => a.id));
  const fresh = artists.filter(a => !excluded.has(a.id));
  const shuffle = items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const ordered = [...shuffle(fresh), ...shuffle(artists.filter(a => excluded.has(a.id)))];
  return ordered.slice(0, size);
}
