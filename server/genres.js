// Public-facing categories; provider labels stay an implementation detail.
const groups = {
  'K-Pop': ['kpop', 'korean pop'],
  'J-Pop': ['jpop', 'japanese pop'],
  'Hip-Hop': ['hiphop', 'hip hop rap', 'hiphoprap', 'rap', 'alternative rap', 'underground hip hop', 'trap', 'gangsta rap'],
  'R&B': ['r&b', 'rnb', 'rbsoul', 'r&b soul', 'rhythm and blues', 'soul', 'neo soul', 'contemporary r&b', 'alternative r&b'],
  'House': ['house', 'deep house', 'tech house', 'progressive house', 'electro house', 'afro house'],
  'EDM': ['edm', 'electronic', 'electronica', 'electro', 'techno', 'trance', 'dubstep', 'drum & bass', 'drum and bass', 'breakbeat', 'idm'],
  'Dance': ['dance', 'dance pop', 'disco', 'eurodance'],
  'Pop': ['pop', 'indie pop', 'bedroom pop', 'dream pop', 'synth pop', 'synthpop', 'electropop', 'art pop', 'teen pop'],
  'Rock': ['rock', 'indie rock', 'alternative rock', 'hard rock', 'punk', 'punk rock', 'post punk', 'post rock', 'math rock', 'shoegaze', 'grunge'],
  'Alternative': ['alternative', 'indie', 'alternative indie'],
  'Metal': ['metal', 'heavy metal', 'death metal', 'metalcore'],
  'Jazz': ['jazz', 'smooth jazz', 'experimental jazz', 'contemporary jazz', 'vocal jazz'],
  'Folk': ['folk', 'folk rock', 'indie folk', 'singer songwriter', 'contemporary folk'],
  'Country': ['country', 'alternative country', 'americana'],
  'Latin': ['latin', 'latin pop', 'latin urban', 'reggaeton', 'salsa'],
  'Afrobeats': ['afrobeats', 'afrobeat', 'afro pop', 'afropop'],
  'Reggae': ['reggae', 'dancehall', 'dub'],
  'Blues': ['blues', 'contemporary blues'],
  'Classical': ['classical', 'orchestral', 'opera'],
  'Ambient': ['ambient', 'new age'],
  'Soundtrack': ['soundtrack', 'soundtracks', 'original score', 'anime'],
  'Gospel': ['gospel', 'christian', 'christian gospel', 'christian & gospel'],
  'World': ['world', 'worldwide'],
  'Easy Listening': ['easy listening', 'lounge'],
};
const key = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = new Map(Object.entries(groups).flatMap(([label, names]) => [label, ...names].map(name => [key(name), label])));
export function normalizeGenre(value) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  const parts = raw.replace(/^MZGenre\.Music\.?/i, '').split('.');
  // Prefer a recognized specific category, e.g. Electronic.House -> House.
  for (const part of [...parts].reverse()) {
    const match = aliases.get(key(part));
    if (match) return match;
  }
  // Unknown metadata and non-genre community tags are omitted, never guessed.
  return '';
}
export function normalizeTags(values) {
  return [...new Set(values.map(normalizeGenre).filter(Boolean))];
}
