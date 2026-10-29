import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { signupAvailabilityRouter } from './signup-availability.js';
import { checkSignupAvailability } from '../client/src/account-client.js';

async function fixture(t, options = {}) {
  const calls = [];
  const app = express();
  app.use('/check', signupAvailabilityRouter({ url: 'https://example.test', secret: 'test-only', clientFactory: () => ({ rpc: async (name, params) => { calls.push({ name, params }); return { data: false }; } }), ...options }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { calls, post: body => fetch(`http://127.0.0.1:${server.address().port}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) };
}
test('duplicate username and email checks normalize case and return only availability', async t => {
  const { post, calls } = await fixture(t);
  for (const field of ['username', 'email']) {
    const response = await post({ field, value: field === 'email' ? ' Existing@Example.com ' : ' Existing_User ' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { available: false });
  }
  assert.deepEqual(calls, [{ name: 'ripple_username_available', params: { requested_username: 'existing_user' } }, { name: 'ripple_email_available', params: { requested_email: 'existing@example.com' } }]);
});
test('available values are accepted; invalid input never reaches database', async t => {
  const { post, calls } = await fixture(t, { clientFactory: () => ({ rpc: async () => ({ data: true }) }) });
  assert.deepEqual(await (await post({ field: 'username', value: 'new_user' })).json(), { available: true });
  for (const body of [{ field: 'password', value: 'abc' }, { field: 'username', value: 'x' }, { field: 'email', value: 'invalid' }]) assert.equal((await post(body)).status, 400);
  assert.equal(calls.length, 0);
});
test('database failures are generic and availability checks fail closed', async t => {
  const { post } = await fixture(t, { clientFactory: () => ({ rpc: async () => ({ error: { message: 'private database information' } }) }) });
  const response = await post({ field: 'username', value: 'existing' });
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private database/);
});
test('missing server configuration does not report a value as available', async t => {
  const { post } = await fixture(t, { secret: '' });
  assert.equal((await post({ field: 'email', value: 'user@example.com' })).status, 503);
});
test('client preserves cancellation and rejects unsuccessful availability responses', async () => {
  const signal = new AbortController().signal;
  assert.equal(await checkSignupAvailability('username', 'existing', signal, async (url, options) => {
    assert.equal(url, '/api/signup-availability'); assert.equal(options.signal, signal);
    assert.deepEqual(JSON.parse(options.body), { field: 'username', value: 'existing' });
    return { ok: true, json: async () => ({ available: false }) };
  }), false);
  await assert.rejects(checkSignupAvailability('email', 'user@example.com', signal, async () => ({ ok: false, json: async () => ({ error: 'Unavailable' }) })), /Unavailable/);
});
