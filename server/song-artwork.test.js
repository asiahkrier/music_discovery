import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify } from './spotify.js';

test('saved song artwork uses the exact track and handles missing album images', async () => {
  const requested = [];
  const spotify = createSpotify({ spotifyId: 'id', spotifySecret: 'secret', fetchImpl: async url => {
    requested.push(url);
    const data = url.includes('/api/token')
      ? { access_token: 'token', expires_in: 3600 }
      : { album: { images: url.includes('missing') ? [] : [{ url: 'large.jpg' }, { url: 'cover.jpg' }] } };
    return { ok: true, json: async () => data };
  } });
  assert.deepEqual(await spotify.songArtwork('exact-track'), { image: 'cover.jpg' });
  assert.ok(requested.some(url => url.includes('/tracks/exact-track?')));
  assert.deepEqual(await spotify.songArtwork('missing'), { image: '' });
});
