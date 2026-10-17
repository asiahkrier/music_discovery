import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSignup } from '../client/src/account-client.js';

const valid = { username: 'Ripple_user', password: 'a-long-test-password', confirm: 'a-long-test-password' };
test('signup accepts the supported username and password format', () => {
  assert.equal(validateSignup(valid), '');
});
test('signup rejects unsupported usernames, short passwords and mismatches', () => {
  for (const username of ['ab', 'contains spaces', 'a'.repeat(25), '<script>']) assert.notEqual(validateSignup({ ...valid, username }), '');
  assert.notEqual(validateSignup({ ...valid, password: 'short', confirm: 'short' }), '');
  assert.notEqual(validateSignup({ ...valid, confirm: 'different-password' }), '');
});


test('username check normalizes case and accepts available names', async () => {
  const { checkUsernameAvailable } = await import('../client/src/account-client.js');
  await checkUsernameAvailable({ rpc: async (name, args) => {
    assert.equal(name, 'ripple_username_available');
    assert.equal(args.requested_username, 'ripple_user');
    return { data: true, error: null };
  } }, ' Ripple_User ');
});
test('taken usernames and unavailable database produce distinct feedback', async () => {
  const { checkUsernameAvailable } = await import('../client/src/account-client.js');
  await assert.rejects(checkUsernameAvailable({ rpc: async () => ({ data: false, error: null }) }, 'taken'), /That username is already taken/);
  await assert.rejects(checkUsernameAvailable({ rpc: async () => ({ data: null, error: { message: 'database unavailable' } }) }, 'test'), /couldn’t check your username/);
});
