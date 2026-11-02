import test from 'node:test';
import assert from 'node:assert/strict';
import { validEmail } from '../client/src/email-validation.js';
import { inPairs } from './ripple-mix.js';
import { fakeDatabase } from './fake-supabase.js';

test('email validation accepts normal addresses and rejects malformed or oversized input', () => {
  for (const value of ['user@example.com', 'user+tag@sub.example.com']) assert.equal(validEmail(value), true);
  for (const value of ['user@@example.com', '@example.com', 'user@example', 'user@.com', 'user@example.', 'user @example.com', 'a'.repeat(255), null]) assert.equal(validEmail(value), false);
});
test('catalog batches preserve order and never exceed two concurrent actions', async () => {
  let active = 0, peak = 0;
  const output = await inPairs([1, 2, 3, 4, 5], async item => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setImmediate(resolve));
    active--; return item * 2;
  });
  assert.deepEqual(output, [2, 4, 6, 8, 10]);
  assert.equal(peak, 2);
  await assert.rejects(inPairs([1], async () => { throw new Error('catalog unavailable'); }), /catalog unavailable/);
});
test('fake database returns a native Promise and runs each mutation only once', async () => {
  const db = fakeDatabase(['items']);
  const query = db.from('items').upsert({ user_id: 'alice', name: 'saved' });
  assert.ok(query instanceof Promise);
  const first = await query;
  db.tables.items[0].name = 'changed';
  assert.deepEqual(await query, first);
  assert.equal(db.tables.items[0].name, 'changed');
  assert.equal((await db.from('items').select('*').eq('user_id', 'bob')).data.length, 0);
});
