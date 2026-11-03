import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify } from './spotify.js';
const ok = data => ({ ok: true, json: async () => data });
const limited = () => ({ ok: false, status: 429, headers: { get: () => '77548' } });
function memoryStore(now) {
  const rows = new Map();
  return { get: async key => { const row = rows.get(key); return row?.until > now() ? row.value : null; }, set: async (key, value, until) => { rows.set(key, { value, until }); } };
}
test('catalog and cooldown survive restarts, stale results work, expired results do not', async () => {
  let clock = 1000, calls = 0, blocked = false;
  const store = memoryStore(() => clock);
  const options = { store, now: () => clock, requestGapMs: 0, spotifyId: 'test', spotifySecret: 'test', fetchImpl: async url => {
    calls++;
    if (url.includes('/api/token')) return ok({ access_token: 'test', expires_in: 3600 });
    return blocked ? limited() : ok({ tracks: { items: [{ id: 'public-track' }] } });
  } };
  const first = createSpotify(options);
  const result = await first.catalog('search?q=known');
  clock += 3600001; blocked = true;
  await assert.rejects(first.catalog('search?q=unknown'), e => e.status === 429);
  const requests = calls;
  const restarted = createSpotify(options);
  assert.deepEqual(await restarted.catalog('search?q=known'), result);
  await assert.rejects(restarted.catalog('search?q=unknown'), e => e.status === 429);
  assert.equal(calls, requests);
  clock += 86400001;
  await assert.rejects(createSpotify(options).catalog('search?q=known'), e => e.status === 429);
});
test('queued catalog requests stop after the first rate limit', async () => {
  let calls = 0;
  const client = createSpotify({ requestGapMs: 0, spotifyId: 'test', spotifySecret: 'test', fetchImpl: async url => {
    if (url.includes('/api/token')) return ok({ access_token: 'test', expires_in: 3600 });
    calls++; return limited();
  } });
  const results = await Promise.allSettled(['a','b','c'].map(q => client.search(q, 'US')));
  assert.equal(calls, 1);
  assert.ok(results.every(r => r.status === 'rejected' && r.reason.status === 429));
});
test('discovery restores a saved country pool after deployment during cooldown', async () => {
  let clock = 1000, blocked = false;
  const store = memoryStore(() => clock);
  const options = { store, now: () => clock, requestGapMs: 0, spotifyId: 'test', spotifySecret: 'test', fetchImpl: async url => {
    if (url.includes('/api/token')) return ok({ access_token: 'test', expires_in: 3600 });
    return blocked ? limited() : ok({ artists: { items: [{ id: 'a'.repeat(22), name: 'Artist', genres: [] }] } });
  } };
  const first = await createSpotify(options).discover('US');
  clock += 3600001; blocked = true;
  assert.deepEqual(await createSpotify(options).discover('US'), first);
  await assert.rejects(createSpotify(options).discover('GB'), e => e.status === 429);
});
