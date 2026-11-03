import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify } from './spotify.js';
const ok = data => ({ ok: true, json: async () => data });
test('catalog shares in-flight requests and caches successful responses for five minutes', async () => {
  let calls = 0, clock = 1000;
  const client = createSpotify({ spotifyId: 'test', spotifySecret: 'test', now: () => clock, fetchImpl: async url => {
    if (url.includes('/api/token')) return ok({ access_token: 'test', expires_in: 3600 });
    calls++; return ok({ tracks: { items: [] } });
  } });
  await Promise.all([client.catalog('search?q=sza&type=track'), client.catalog('search?type=track&q=sza')]);
  await client.catalog('search?q=sza&type=track');
  assert.equal(calls, 1);
  clock += 300001;
  await client.catalog('search?q=sza&type=track');
  assert.equal(calls, 2);
});
test('rate limits expose actual wait, retain cached results, and allow recovery', async () => {
  let clock = 1000, limited = false, calls = 0;
  const client = createSpotify({ spotifyId: 'test', spotifySecret: 'test', now: () => clock, fetchImpl: async url => {
    if (url.includes('/api/token')) return ok({ access_token: 'test', expires_in: 3600 });
    calls++;
    if (limited) return { ok: false, status: 429, headers: { get: () => '120' } };
    return ok({ tracks: { items: [] } });
  } });
  await client.catalog('search?q=cached'); limited = true;
  await assert.rejects(client.catalog('search?q=new'), e => e.retryAfter === 120);
  clock += 1000;
  await assert.rejects(client.catalog('search?q=new'), e => e.retryAfter === 119);
  await client.catalog('search?q=cached'); assert.equal(calls, 2);
  clock += 120000; limited = false;
  await client.catalog('search?q=new'); assert.equal(calls, 3);
});
