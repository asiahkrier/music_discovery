import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { spotifyAccountRouter } from './spotify-account.js';
import { tokenVault } from './spotify-vault.js';
const key = Buffer.alloc(32, 7).toString('base64');
const scopes = 'user-library-read user-library-modify user-top-read user-read-recently-played playlist-read-private playlist-read-collaborative playlist-modify-private';
function database() {
  const tables = { spotify_connections: [], spotify_oauth_states: [], library_items: [] };
  return { tables, auth: { getUser: async token => ({ data: { user: token === 'invalid' ? null : { id: token } } }) }, from(name) {
    let mode = 'select', value, filters = [], single = false;
    const query = {
      select() { return query; }, maybeSingle() { single = true; return query; },
      eq(k, v) { filters.push(r => r[k] === v); return query; },
      gt(k, v) { filters.push(r => r[k] > v); return query; },
      lt(k, v) { filters.push(r => r[k] < v); return query; },
      order() { return query; }, limit() { return query; },
      delete() { mode = 'delete'; return query; }, update(v) { mode = 'update'; value = v; return query; }, upsert(v) { mode = 'upsert'; value = v; return query; },
      then(resolve, reject) {
        try {
          let rows = tables[name].filter(r => filters.every(f => f(r)));
          if (mode === 'upsert') { tables[name] = tables[name].filter(r => r.user_id !== value.user_id); tables[name].push(structuredClone(value)); rows = [value]; }
          if (mode === 'delete') tables[name] = tables[name].filter(r => !rows.includes(r));
          if (mode === 'update') rows.forEach(r => Object.assign(r, structuredClone(value)));
          return Promise.resolve({ data: structuredClone(single ? rows[0] || null : rows), error: null }).then(resolve, reject);
        } catch (e) { return Promise.reject(e).then(resolve, reject); }
      },
    }; return query;
  } };
}
async function fixture(t, upstream) {
  const db = database(), calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (upstream) return upstream(url, options);
    if (url.includes('/api/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, scope: scopes });
    if (url.endsWith('/v1/me')) return Response.json({ id: 'spotify-owner', display_name: 'Listener' });
    return new Response(null, { status: 200 });
  };
  const app = express();
  app.use('/api/spotify', spotifyAccountRouter({ url: 'https://example.supabase.co', secret: 'server', clientId: 'client', clientSecret: 'secret', encryptionKey: key, redirectUri: 'http://127.0.0.1:3006/api/spotify/callback', clientFactory: () => db, fetchImpl, related: async () => ({ artists: [] }) }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, { method = 'GET', body, user = 'alice', cookie } = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/spotify/${path}`, { method, redirect: 'manual', headers: { ...(user ? { Authorization: `Bearer ${user}` } : {}), ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  function connectRow(owner = 'alice', expired = false) {
    db.tables.spotify_connections.push({ user_id: owner, credentials: tokenVault(key).seal({ access_token: 'old', refresh_token: 'refresh', expires: expired ? 0 : Date.now() + 3600000 }, owner), preferences: {}, display_name: owner, spotify_user_id: 'spotify-owner', mix: null });
  }
  return { db, calls, request, connectRow };
}

test('linking requires an authenticated Ripple user', async t => {
  const { request, db } = await fixture(t);
  assert.equal((await request('connect', { method: 'POST', body: {}, user: '' })).status, 401);
  assert.equal((await request('status', { user: 'invalid' })).status, 401);
  assert.equal(db.tables.spotify_oauth_states.length, 0);
});
test('OAuth is browser-bound, single-use, and stores encrypted credentials only', async t => {
  const { request, db, calls } = await fixture(t);
  const start = await request('connect', { method: 'POST', body: {} });
  const cookie = start.headers.get('set-cookie').split(';')[0];
  const authorize = new URL((await start.json()).url);
  assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  const state = authorize.searchParams.get('state');
  const wrong = await request(`callback?state=${state}&code=code`, { user: '', cookie: 'ripple_spotify_oauth=wrong' });
  assert.ok(wrong.headers.get('location').endsWith('spotify=failed'));
  assert.equal(calls.length, 0);
  const response = await request(`callback?state=${state}&code=code`, { user: '', cookie });
  assert.ok(response.headers.get('location').endsWith('spotify=connected'));
  assert.equal(db.tables.spotify_oauth_states.length, 0);
  assert.ok(!db.tables.spotify_connections[0].credentials.includes('refresh'));
  const replay = await request(`callback?state=${state}&code=code`, { user: '', cookie });
  assert.ok(replay.headers.get('location').endsWith('spotify=failed'));
  const status = await (await request('status')).json();
  assert.equal(status.connected, true); assert.ok(!JSON.stringify(status).includes('credentials'));
  assert.equal((await (await request('status', { user: 'bob' })).json()).connected, false);
});
test('disconnect removes connection, pending login and mix but keeps Ripple saves', async t => {
  const { request, db, connectRow } = await fixture(t);
  connectRow(); connectRow('bob'); db.tables.library_items.push({ user_id: 'alice', name: 'Saved song' });
  await request('connect', { method: 'POST', body: {} });
  assert.equal((await request('connection', { method: 'DELETE', body: { user_id: 'bob' } })).status, 200);
  assert.equal(db.tables.spotify_connections.length, 1); assert.equal(db.tables.spotify_connections[0].user_id, 'bob');
  assert.equal(db.tables.spotify_oauth_states.length, 0); assert.equal(db.tables.library_items.length, 1);
});
test('save refreshes expired token and uses current library endpoint with authenticated owner', async t => {
  const { request, calls, connectRow } = await fixture(t); connectRow('alice', true);
  const id = 'a'.repeat(22);
  const response = await request('saved-song', { method: 'PUT', body: { id, user_id: 'bob' } });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].options.body.toString().includes('grant_type=refresh_token'));
  assert.ok(calls[1].url.includes('/me/library?uris=spotify%3Atrack%3A'));
  assert.equal(calls[1].options.method, 'PUT');
  assert.equal((await request('saved-song', { method: 'PUT', body: { id: '../evil' } })).status, 400);
});
test('Spotify failures have useful messages without exposing upstream secrets', async t => {
  const { request, connectRow } = await fixture(t, async () => new Response('sensitive upstream response', { status: 429 })); connectRow();
  const response = await request('saved-song', { method: 'PUT', body: { id: 'a'.repeat(22) } });
  assert.equal(response.status, 429); const body = await response.text();
  assert.match(body, /wait/); assert.ok(!body.includes('sensitive'));
});
test('declined or expired authorization never creates a connection', async t => {
  const { request, db } = await fixture(t);
  const start = await request('connect', { method: 'POST', body: {} });
  const state = new URL((await start.json()).url).searchParams.get('state');
  const cookie = start.headers.get('set-cookie').split(';')[0];
  const response = await request(`callback?state=${state}&error=access_denied`, { cookie, user: '' });
  assert.ok(response.headers.get('location').endsWith('spotify=declined'));
  assert.equal(db.tables.spotify_connections.length, 0);
});
test('private export retries reuse the created playlist and replace exact mix items', async t => {
  let created = 0, writes = 0;
  const { request, connectRow, db } = await fixture(t, async (url, options) => {
    if (url.endsWith('/me/playlists')) {
      assert.equal(JSON.parse(options.body).public, false); created++;
      return Response.json({ id: 'p'.repeat(22) });
    }
    if (url.includes('/playlists/')) {
      assert.equal(options.method, 'PUT');
      assert.deepEqual(JSON.parse(options.body).uris, ['spotify:track:' + 't'.repeat(22)]);
      writes++; return writes === 1 ? new Response('', { status: 503 }) : Response.json({ snapshot_id: 'snapshot' });
    }
    throw new Error('Unexpected export request');
  });
  connectRow(); db.tables.spotify_connections[0].mix = { tracks: [{ id: 't'.repeat(22) }] };
  assert.equal((await request('export', { method: 'POST', body: {} })).status, 502);
  const response = await request('export', { method: 'POST', body: {} });
  assert.equal(response.status, 200); assert.equal(created, 1); assert.equal(writes, 2);
});
test('weekly mix reuses stored snapshot and never reads another user library', async t => {
  const { request, connectRow, db, calls } = await fixture(t); connectRow();
  const mix = { week: Math.floor((Date.now() - Date.UTC(2026, 0, 5)) / 604800000), tracks: [{ id: 'x'.repeat(22) }] };
  db.tables.spotify_connections[0].mix = mix;
  const response = await request('mix', { method: 'POST', body: { user_id: 'bob' } });
  assert.deepEqual((await response.json()).mix, mix); assert.equal(calls.length, 0);
  assert.equal((await request('mix', { method: 'POST', body: {}, user: 'bob' })).status, 409);
});
test('expired state is rejected before token exchange', async t => {
  const { request, db, calls } = await fixture(t);
  const start = await request('connect', { method: 'POST', body: {} });
  const state = new URL((await start.json()).url).searchParams.get('state');
  db.tables.spotify_oauth_states[0].expires_at = '2020-01-01T00:00:00Z';
  const response = await request(`callback?state=${state}&code=test`, { cookie: start.headers.get('set-cookie').split(';')[0], user: '' });
  assert.ok(response.headers.get('location').endsWith('spotify=failed')); assert.equal(calls.length, 0);
});
