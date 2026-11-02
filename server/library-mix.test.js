import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { libraryMixRouter } from './library-mix.js';
import { buildMix } from './ripple-mix.js';
import { fakeDatabase } from './fake-supabase.js';
function database() {
  return fakeDatabase(['ripple_mixes', 'library_items']);
}

async function fixture(t, builder) {
  const db = database();
  const app = express();
  app.use('/mix', libraryMixRouter({ url: 'https://example.test', secret: 'server', clientFactory: () => db, builder }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, method = 'GET', body, user = 'alice') => fetch(`http://127.0.0.1:${server.address().port}/mix/${path}`, { method, headers: { ...(user ? { Authorization: `Bearer ${user}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { db, request };
}
test('Ripple-only mix requires login but no Spotify connection; isolates users and persists weekly mix', async t => {
  let calls = 0;
  const { db, request } = await fixture(t, async ({ library, preferences }) => {
    calls++;
    assert.deepEqual(library.map(row => row.name), ['Alice artist']);
    assert.equal(preferences.saved, undefined);
    return { tracks: [{ id: 'a'.repeat(22) }], warnings: [] };
  });
  db.tables.library_items.push({ user_id: 'alice', kind: 'artist', name: 'Alice artist' }, { user_id: 'bob', name: 'Private artist' });
  assert.equal((await request('status', 'GET', null, '')).status, 401);
  assert.equal((await request('status', 'GET', null, 'invalid')).status, 401);
  assert.equal((await request('mix', 'POST', {})).status, 200);
  assert.equal((await request('mix', 'POST', {})).status, 200);
  assert.equal(calls, 1);
  assert.equal((await (await request('status', 'GET', null, 'bob')).json()).mix, null);
  assert.equal((await request('mix', 'POST', { refresh: true })).status, 429);
  await request('dismiss', 'POST', { id: 'a'.repeat(22) });
  const status = await (await request('status')).json();
  assert.equal(status.mix.tracks.length, 0);
  assert.deepEqual(status.preferences.dismissed, ['a'.repeat(22)]);
});
test('empty Ripple library returns guidance without catalog or personalized Spotify requests', async t => {
  const { request } = await fixture(t, () => { throw new Error('Should not run'); });
  const response = await request('mix', 'POST', {});
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).mix.tracks, []);
});
test('builder ignores all Spotify personal sources even if old preferences enable them', async () => {
  let calls = 0;
  const result = await buildMix({ api: async () => { calls++; throw new Error('No personal requests allowed'); }, related: async () => ({ artists: [] }), library: [], preferences: { saved: true, top: true, recent: true, playlists: ['a'.repeat(22)] }, seed: 'week' });
  assert.equal(calls, 0);
  assert.deepEqual(result.tracks, []);
});
