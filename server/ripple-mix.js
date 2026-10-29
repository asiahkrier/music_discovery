import { createHash } from 'node:crypto';

export function mixPreferences(value = {}) {
  const adventure = Number(value.adventure ?? 60);
  return {
    adventure: Number.isFinite(adventure) ? Math.min(100, Math.max(0, adventure)) : 60,
    saved: value.saved !== false, top: value.top !== false, recent: value.recent !== false,
    playlists: Array.isArray(value.playlists) ? [...new Set(value.playlists.filter(id => /^[A-Za-z0-9]{22}$/.test(id)))].slice(0, 3) : [],
    dismissed: Array.isArray(value.dismissed) ? [...new Set(value.dismissed.filter(id => /^[A-Za-z0-9]{22}$/.test(id)))].slice(-200) : [],
  };
}

// Hand-written ranking: musical relevance first, discovery second. No ML training.
export function rankMix(candidates, { knownTracks = [], knownArtists = [], dismissed = [], adventure = 60, seed = '', limit = 20 } = {}) {
  const tracks = new Set(knownTracks), artists = new Set(knownArtists), hidden = new Set(dismissed);
  const unique = new Map();
  for (const item of candidates) {
    if (!item?.id || !item.artistId || hidden.has(item.id) || hidden.has(item.artistId)) continue;
    const relevance = Math.min(1, Math.max(0, Number(item.relevance) || 0));
    if (relevance < 0.15) continue;
    const novelty = tracks.has(item.id) ? 0 : artists.has(item.artistId) ? 0.4 : 1;
    const niche = item.smallerAudience === true ? 1 : 0;
    const jitter = createHash('sha256').update(`${seed}:${item.id}`).digest().readUInt32BE(0) / 0xffffffff;
    const score = 0.65 * relevance + (adventure / 100) * (0.2 * novelty + 0.15 * niche) + 0.03 * jitter;
    const ranked = { ...item, score, newToYou: novelty === 1 };
    if (!unique.has(item.id) || unique.get(item.id).score < score) unique.set(item.id, ranked);
  }
  const counts = new Map(), result = [];
  for (const item of [...unique.values()].sort((a, b) => b.score - a.score)) {
    if ((counts.get(item.artistId) || 0) >= 2) continue;
    counts.set(item.artistId, (counts.get(item.artistId) || 0) + 1);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

export function asMixTrack(track, reason, relevance = 0.7) {
  if (!track || track.type !== 'track' || !/^[A-Za-z0-9]{22}$/.test(track.id || '') || track.is_local || track.is_playable === false || track.restrictions || !track.artists?.[0]?.id) return null;
  return { id: track.id, name: track.name, artistId: track.artists[0].id, artist: track.artists.map(a => a.name).join(', '), image: track.album?.images?.[0]?.url || '', reason, relevance };
}

export async function buildMix({ api, related, library, preferences, seed }) {
  const warnings = [], familiar = [], seeds = new Map();
  function addArtist(artist, weight, source) {
    if (!/^[A-Za-z0-9]{22}$/.test(artist?.id || '')) return;
    const prior = seeds.get(artist.id);
    seeds.set(artist.id, { ...artist, weight: (prior?.weight || 0) + weight, source: prior?.source || source });
  }
  function addTrack(track, weight, reason) {
    const normalized = asMixTrack(track, reason);
    if (!normalized) return;
    familiar.push(normalized);
    track.artists.forEach(a => addArtist(a, weight, reason));
  }
  async function source(path, label, consume) {
    try { consume(await api(path)); } catch (error) {
      if (error.status === 401 || error.status === 429) throw error;
      warnings.push(`${label} could not be included. Other selected sources were used.`);
    }
  }
  const rippleArtists = library.filter(i => i.kind === 'artist');
  rippleArtists.slice(0, 20).forEach(i => addArtist({ id: i.spotify_id, name: i.name }, 5, `Saved on Ripple: ${i.name}`));
  // Sequential bounded groups avoid a burst of catalog requests.
  await Promise.all(library.filter(i => i.kind === 'song').slice(0, 10).map(i => source(`tracks/${i.spotify_id}`, 'A Ripple saved song', t => addTrack(t, 4, 'Saved on Ripple'))));
  const reads = [];
  if (preferences.saved) reads.push(source('me/tracks?limit=50', 'Spotify saved songs', d => (d.items || []).forEach(i => addTrack(i.track, 2, 'From your Spotify saved songs'))));
  if (preferences.top) {
    reads.push(source('me/top/artists?limit=20&time_range=medium_term', 'Spotify top artists', d => (d.items || []).forEach(a => addArtist(a, 3, `You listen to ${a.name}`))));
    reads.push(source('me/top/tracks?limit=20&time_range=medium_term', 'Spotify top songs', d => (d.items || []).forEach(t => addTrack(t, 2, 'One of your Spotify favorites'))));
  }
  if (preferences.recent) reads.push(source('me/player/recently-played?limit=50', 'Recent listening', d => (d.items || []).forEach(i => addTrack(i.track, 1, 'From your recent listening'))));
  await Promise.all(reads);
  await Promise.all(preferences.playlists.map(id => source(`playlists/${id}/items?limit=50`, 'A selected playlist', d => (d.items || []).forEach(i => addTrack(i.item || i.track, 2, 'From your selected playlist')))));
  const allSeeds = [...seeds.values()].sort((a, b) => b.weight - a.weight);
  // Reserve seed space for both services so one large library cannot crowd out the other.
  const chosen = [...new Map([...allSeeds.filter(a => a.source.startsWith('Saved on Ripple')).slice(0, 3), ...allSeeds.slice(0, 8)].map(a => [a.id, a])).values()].slice(0, 8);
  const candidates = [...familiar];
  let relatedCount = 0;
  for (let group = 0; group < chosen.length; group += 2) {
    const results = await Promise.all(chosen.slice(group, group + 2).map(async artist => {
      const response = await related(artist.id, 'US');
      return { artist, response };
    }));
    for (const { artist, response } of results) {
      for (const candidate of response.artists.slice(0, 5)) {
        relatedCount++;
        candidates.push({ candidate, basedOn: artist.name, sourceUrl: response.sourceUrl });
      }
    }
  }
  const discovery = [...new Map(candidates.filter(c => c.candidate).map(c => [c.candidate.id, c])).values()]
    .sort((a, b) => (b.candidate.score + (b.candidate.smallerAudience ? preferences.adventure / 500 : 0)) - (a.candidate.score + (a.candidate.smallerAudience ? preferences.adventure / 500 : 0))).slice(0, 14);
  const discovered = [];
  for (let group = 0; group < discovery.length; group += 2) {
    await Promise.all(discovery.slice(group, group + 2).map(async ({ candidate, basedOn, sourceUrl }) => {
      const query = new URLSearchParams({ q: `artist:"${candidate.name.replaceAll('"', '')}"`, type: 'track', limit: '10' });
      await source(`search?${query}`, `Songs by ${candidate.name}`, data => {
        const tracks = (data.tracks?.items || []).filter(t => t.artists?.some(a => a.id === candidate.id)).slice(0, 2);
        for (const track of tracks) {
          const item = asMixTrack(track, `Because you like ${basedOn}`, candidate.score);
          if (item) discovered.push({ ...item, artistId: candidate.id, smallerAudience: candidate.smallerAudience === true, sourceUrl });
        }
      });
    }));
  }
  if (!relatedCount) warnings.push('No matched discoveries were available. This mix uses your selected favorites; try refreshing later.');
  const tracks = rankMix([...familiar, ...discovered], { knownTracks: familiar.map(t => t.id), knownArtists: [...seeds.keys()], ...preferences, seed });
  return { tracks, warnings: [...new Set(warnings)], generatedAt: new Date().toISOString(), seedCount: chosen.length };
}
