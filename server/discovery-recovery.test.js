import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify } from './spotify.js';
import { readDiscovery, saveDiscovery } from '../client/src/discovery-cache.js';
const artist = { id: 'a'.repeat(22), name: 'Artist', tags: [], genres: [] };
const ok = data => ({ ok: true, json: async () => data });
test('discovery retains a recent pool through a long rate limit without more upstream calls', async () => {
  let clock = 1000, limited = false, calls = 0;
  const client = createSpotify({ spotifyId: 'test', spotifySecret: 'test', now: () => clock, fetchImpl: async url => {
    if (url.includes('/api/token')) return ok({ access_token: 'test', expires_in: 3600 });
    calls++;
    if (limited) return { ok: false, status: 429, headers: { get: () => '77548' } };
    return ok({ artists: { items: [artist] } });
  } });
  assert.equal((await client.discover('US')).length, 1);
  clock += 3600001; limited = true;
  assert.equal((await client.discover('US')).length, 1);
  const attempts = calls;
  clock += 3600001;
  assert.equal((await client.discover('US')).length, 1);
  assert.equal(calls, attempts);
  clock += 86400000;
  await assert.rejects(client.discover('US'), e => e.status === 429 && !e.message.includes('77548'));
});
test('browser discovery cache survives reload, isolates countries and expires', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  saveDiscovery('US', [artist], storage, 1000);
  assert.deepEqual(readDiscovery('US', storage, 2000), [artist]);
  assert.deepEqual(readDiscovery('GB', storage, 2000), []);
  assert.deepEqual(readDiscovery('US', storage, 86401001), []);
  values.set('ripple-discovery:US', 'broken');
  assert.deepEqual(readDiscovery('US', storage), []);
});
