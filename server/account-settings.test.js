import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { accountSettingsRouter } from './account-settings.js';

async function fixture(t, { invalidToken = false, wrongPassword = false, storageFailure = false, configured = true } = {}) {
  const calls = [];
  let listed = false;
  const admin = {
    auth: { getUser: async () => ({ data: { user: invalidToken ? null : { id: 'owner', email: 'owner@example.com' } }, error: null }), admin: { deleteUser: async id => { calls.push(['delete', id]); return {}; } } },
    storage: { from: () => ({ list: async () => {
      if (storageFailure) return { error: new Error('storage') };
      if (listed) return { data: [] };
      listed = true; return { data: [{ id: 'photo-id', name: 'photo.png' }] };
    }, remove: async paths => { calls.push(['remove', paths]); return {}; } }) },
  };
  const verifier = { auth: { signInWithPassword: async () => ({ data: { user: { id: wrongPassword ? 'someone-else' : 'owner' } } }), signOut: async () => ({}) } };
  const app = express();
  app.use('/api/account', accountSettingsRouter(configured ? { url: 'https://example.supabase.co', secret: 'secret', publicKey: 'public', clientFactory: (_url, key) => key === 'secret' ? admin : verifier } : {}));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (body = { password: 'current-password', confirmation: 'DELETE', userId: 'victim' }, token = 'valid-token') => fetch(`http://127.0.0.1:${server.address().port}/api/account`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { calls, request };
}

test('deletion only removes authenticated owner and cleans avatars first', async t => {
  const { request, calls } = await fixture(t);
  const response = await request(); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true });
  assert.deepEqual(calls, [['remove', ['owner/photo.png']], ['delete', 'owner']]);
});
test('deletion rejects unauthenticated requests and missing confirmation', async t => {
  const { request, calls } = await fixture(t);
  assert.equal((await request({}, '')).status, 401);
  assert.equal((await request({ password: 'x' })).status, 400);
  assert.deepEqual(calls, []);
});
test('invalid sessions never reach deletion', async t => {
  const { request, calls } = await fixture(t, { invalidToken: true });
  assert.equal((await request()).status, 401); assert.deepEqual(calls, []);
});
test('password identity mismatch blocks deletion and retries are limited', async t => {
  const { request, calls } = await fixture(t, { wrongPassword: true });
  assert.equal((await request()).status, 403);
  assert.equal((await request()).status, 429); assert.deepEqual(calls, []);
});
test('storage failure prevents auth deletion', async t => {
  const { request, calls } = await fixture(t, { storageFailure: true });
  assert.equal((await request()).status, 502); assert.deepEqual(calls, []);
});
test('missing server credentials fails closed', async t => {
  const { request, calls } = await fixture(t, { configured: false });
  assert.equal((await request()).status, 503); assert.deepEqual(calls, []);
});
