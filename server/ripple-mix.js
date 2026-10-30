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
    const score = 0.65 * relevance + (adventure / 100) * (0.2 * novelty + 0.05 * niche) + 0.03 * jitter;
    const ranked = { ...item, score, newToYou: novelty === 1 };
    if (!unique.has(item.id) || unique.get(item.id).score < score) unique.set(item.id, ranked);
  }
  const ranked = [...unique.values()].sort((a, b) => b.score - a.score);
  const familiar = ranked.filter(item => artists.has(item.artistId));
  const discoveries = ranked.filter(item => !artists.has(item.artistId));
  const counts = new Map(), selected = new Set(), result = [];
  function take(items, target) {
    let added = 0;
    for (const item of items) {
      if (added >= target || result.length >= limit) break;
      if (selected.has(item.id) || (counts.get(item.artistId) || 0) >= 2) continue;
      counts.set(item.artistId, (counts.get(item.artistId) || 0) + 1);
      selected.add(item.id); result.push(item); added++;
    }
  }
  // Reserve familiar music and discoveries of different audience sizes before filling gaps.
  const familiarTarget = Math.round(limit * (0.6 - 0.3 * adventure / 100));
  const smallerTarget = Math.round(limit * (0.2 + 0.2 * adventure / 100));
  take(familiar, familiarTarget);
  take(discoveries.filter(item => !item.smallerAudience), limit - familiarTarget - smallerTarget);
  take(discoveries.filter(item => item.smallerAudience), smallerTarget);
  take(ranked.filter(item => !item.smallerAudience), limit - result.length);
  take(ranked, limit - result.length);
  result.sort((a, b) => b.score - a.score);
  return result;
}

export function asMixTrack(track, reason, relevance = 0.7) {
  if (!track || track.type !== 'track' || !/^[A-Za-z0-9]{22}$/.test(track.id || '') || track.is_local || track.is_playable === false || track.restrictions || !track.artists?.[0]?.id) return null;
  return { id: track.id, name: track.name, artistId: track.artists[0].id, artist: track.artists.map(a => a.name).join(', '), image: track.album?.images?.[0]?.url || '', reason, relevance };
}

function balancedArtists(items, limit, getArtist = item => item) {
  const ranked = [...items].sort((a, b) => getArtist(b).score - getArtist(a).score);
  const other = ranked.filter(item => !getArtist(item).smallerAudience);
  const smaller = ranked.filter(item => getArtist(item).smallerAudience);
  const chosen = [...other.slice(0, Math.ceil(limit / 2)), ...smaller.slice(0, Math.floor(limit / 2))];
  const selected = new Set(chosen);
  return [...chosen, ...ranked.filter(item => !selected.has(item))].slice(0, limit);
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
  async function songsForArtist(artist, reason, relevance, output, extra = {}) {
    const query = new URLSearchParams({ q: `artist:"${artist.name.replaceAll('"', '')}"`, type: 'track', limit: '10' });
    await source(`search?${query}`, `Songs by ${artist.name}`, data => {
      const matches = (data.tracks?.items || []).filter(t => t.artists?.some(a => a.id === artist.id));
      const playable = matches.map(t => asMixTrack(t, reason, relevance)).filter(Boolean).slice(0, 2);
      for (const item of playable) output.push({ ...item, artistId: artist.id, ...extra });
    });
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
  // Artist-only Ripple libraries also need songs from the artists the user saved.
  const knownSongs = [];
  for (let group = 0; group < chosen.length; group += 2) {
    await Promise.all(chosen.slice(group, group + 2).map(artist => songsForArtist(
      artist, 'From an artist you saved or listen to', 0.8, knownSongs,
    )));
  }
  const candidates = [];
  let relatedCount = 0;
  for (let group = 0; group < chosen.length; group += 2) {
    const results = await Promise.all(chosen.slice(group, group + 2).map(async artist => {
      const response = await related(artist.id, 'US');
      return { artist, response };
    }));
    for (const { artist, response } of results) {
      for (const candidate of balancedArtists(response.artists, 5)) {
        relatedCount++;
        candidates.push({ candidate, basedOn: artist.name, sourceUrl: response.sourceUrl });
      }
    }
  }
  const discovery = balancedArtists(
    [...new Map(candidates.map(c => [c.candidate.id, c])).values()], 14, item => item.candidate,
  );
  const discovered = [];
  for (let group = 0; group < discovery.length; group += 2) {
    await Promise.all(discovery.slice(group, group + 2).map(async ({ candidate, basedOn, sourceUrl }) => {
      await songsForArtist(candidate, `Because you like ${basedOn}`, candidate.score, discovered, {
        smallerAudience: candidate.smallerAudience === true, sourceUrl,
      });
    }));
  }
  if (!relatedCount) warnings.push('No matched discoveries were available. This mix uses your selected favorites; try refreshing later.');
  const tracks = rankMix([...familiar, ...knownSongs, ...discovered], { knownTracks: familiar.map(t => t.id), knownArtists: [...seeds.keys()], ...preferences, seed });
  return { tracks, warnings: [...new Set(warnings)], generatedAt: new Date().toISOString(), seedCount: chosen.length };
}
