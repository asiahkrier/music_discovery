import test from 'node:test';
import assert from 'node:assert/strict';
import { createTopTracks } from './top-tracks.js';

const spotify = {
  profile: async id => ({ id, name: 'Taylor Swift' }),
  songs: async q => {
    if (q.includes('Shake It Off')) return [{ id: 'a'.repeat(22), title: 'Shake It Off', artist: 'Taylor Swift', url: 'https://open.spotify.com/track/a' }];
    if (q.includes('Love Story')) return [{ id: 'b'.repeat(22), title: 'Love Story', artist: 'Cover Band', url: 'x' }];
    return [];
  },
};
const lastfm = body => async () => ({ ok: true, json: async () => body });
const id = '06HL4z0CvFAxyc27GXpf02';

test('ranks all-time tracks by Last.fm listeners and matches them to Spotify', async () => {
  const topTracks = createTopTracks({ spotify, apiKey: 'k', fetchImpl: lastfm({ toptracks: { track: [
    { name: 'Love Story', listeners: '900' }, { name: 'Shake It Off', listeners: '2000' }, { name: 'shake it off', listeners: '5' },
  ] } }) });
  const result = await topTracks(id, 'US');
  assert.deepEqual(result.tracks.map(t => t.title), ['Shake It Off', 'Love Story']);
  assert.equal(result.tracks[0].spotifyId, 'a'.repeat(22));
  assert.equal(result.tracks[1].spotifyId, '', 'a cover by another artist is not used as a match');
});

test('missing API key or Last.fm error returns an empty list', async () => {
  assert.deepEqual((await createTopTracks({ spotify, apiKey: '' })(id, 'US')).tracks, []);
  const failing = createTopTracks({ spotify, apiKey: 'k', fetchImpl: async () => ({ ok: false }) });
  assert.deepEqual((await failing(id, 'US')).tracks, []);
});
