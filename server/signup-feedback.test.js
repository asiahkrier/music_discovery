import test from 'node:test';
import assert from 'node:assert/strict';
import { signupEmailFeedback } from '../client/src/account-client.js';
test('explicit duplicate email responses provide login guidance', () => {
  for (const code of ['email_exists', 'user_already_exists']) assert.match(signupEmailFeedback({ code }), /already in use.*Log in/);
});
test('obfuscated email responses do not assert registration as fact', () => {
  assert.match(signupEmailFeedback(null, { user: { identities: [] } }), /may already be registered/);
});
test('successful signup and unrelated failures are not mislabeled as duplicate email', () => {
  assert.equal(signupEmailFeedback(null, { user: { identities: [{}] } }), '');
  assert.equal(signupEmailFeedback({ code: 'over_email_send_rate_limit' }, { user: { identities: [] } }), '');
  assert.equal(signupEmailFeedback(null, {}), '');
});
