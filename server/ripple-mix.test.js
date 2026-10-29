import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenVault } from './spotify-vault.js';
import { rankMix, mixPreferences, buildMix, asMixTrack } from './ripple-mix.js';
const id = n => String(n).padStart(22, '0');

test('tokens are authenticated, encrypted, and bound to one Ripple user', () => {
  const vault = tokenVault(Buffer.alloc(32, 9).toString('base64'));
  const encrypted = vault.seal({ refresh_token: 'secret-refresh-token' }, 'alice');
  assert.ok(!encrypted.includes('secret-refresh-token'));
  assert.equal(vault.open(encrypted, 'alice').refresh_token, 'secret-refresh-token');
  assert.throws(() => vault.open(encrypted, 'bob'));
  assert.throws(() => vault.open(encrypted.slice(0, -5) + 'AAAAA', 'alice'));
  assert.throws(() => tokenVault('short'));
});
test('mix suppresses duplicates and dismissals and caps each artist at two songs', () => {
  const input = Array.from({ length: 10 }, (_, i) => ({ id: id(i), artistId: id(100 + Math.floor(i / 4)), relevance: 0.8 }));
  const result = rankMix([...input, input[0]], { dismissed: [id(0)], seed: 'week1' });
  assert.ok(!result.some(t => t.id === id(0)));
  assert.equal(new Set(result.map(t => t.id)).size, result.length);
  for (const artist of new Set(result.map(t => t.artistId))) assert.ok(result.filter(t => t.artistId === artist).length <= 2);
  assert.deepEqual(result, rankMix([...input, input[0]], { dismissed: [id(0)], seed: 'week1' }));
});
test('adventurous mix boosts relevant smaller artists but excludes irrelevant matches', () => {
  const common = { id: id(1), artistId: id(10), relevance: 0.9 };
  const small = { id: id(2), artistId: id(20), relevance: 0.75, smallerAudience: true };
  const unrelated = { id: id(3), artistId: id(30), relevance: 0.01, smallerAudience: true };
  const options = { knownArtists: [id(10)], knownTracks: [id(1)], seed: 'test' };
  assert.equal(rankMix([common, small, unrelated], { ...options, adventure: 0 })[0].id, common.id);
  assert.equal(rankMix([common, small, unrelated], { ...options, adventure: 100 })[0].id, small.id);
  assert.ok(!rankMix([unrelated]).length);
});
test('preferences bound input and unavailable songs cannot enter the mix', () => {
  assert.equal(mixPreferences({ adventure: 'bogus' }).adventure, 60);
  assert.equal(mixPreferences({ adventure: 900 }).adventure, 100);
  assert.equal(mixPreferences({ playlists: ['invalid', id(1), id(2), id(3), id(4)] }).playlists.length, 3);
  assert.equal(asMixTrack({ type: 'episode', id: id(1) }), null);
  assert.equal(asMixTrack({ type: 'track', id: id(1), is_local: true }), null);
});
test('build uses selected sources and exact Spotify artist identity for discovery songs', async () => {
  const calls = [];
  const track = (n, artistId) => ({ id: id(n), type: 'track', name: 'Song', artists: [{ id: artistId, name: 'Artist' }], album: { images: [] } });
  const result = await buildMix({
    api: async path => {
      calls.push(path);
      if (path.startsWith('search?')) return { tracks: { items: [track(5, id(50)), track(6, id(99))] } };
      throw new Error('Unexpected source read');
    },
    related: async () => ({ artists: [{ id: id(50), name: 'Artist', score: 0.8, smallerAudience: true }], sourceUrl: 'https://www.last.fm/' }),
    library: [{ kind: 'artist', spotify_id: id(1), name: 'Seed' }],
    preferences: mixPreferences({ saved: false, top: false, recent: false }), seed: 'week',
  });
  assert.equal(result.tracks.length, 1); assert.equal(result.tracks[0].id, id(5));
  assert.ok(calls.every(path => path.startsWith('search?')));
  assert.equal(result.tracks[0].smallerAudience, true);
});
