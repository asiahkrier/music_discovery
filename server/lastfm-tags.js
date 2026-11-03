// Shared clean-up for Last.fm tags, used by the Ripple Score and microgenre discovery.
const normalize = value => value.normalize('NFKC').trim().toLowerCase();

// Tags that describe the listener, not the music.
export const JUNK_TAGS = new Set(['seen live', 'favorites', 'favourite', 'female vocalists', 'male vocalists', 'all']);

// Lowercases, strips symbols and extra spaces, and drops junk and decade tags ("90s", "2010s").
export function cleanTag(name) {
  const tag = normalize(String(name || '')).replace(/[^\p{L}\p{N} -]/gu, '').replace(/\s+/g, ' ').trim();
  if (!tag || JUNK_TAGS.has(tag) || /^\d{2,4}s$/.test(tag)) return '';
  return tag;
}

export const cleanTags = names => names.map(cleanTag).filter(Boolean);
