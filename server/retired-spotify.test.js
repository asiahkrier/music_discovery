import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

test('personal Spotify endpoints are retired without contacting providers', async t => {
  let calls = 0;
  const server = createApp({ fetchImpl: async () => { calls++; throw new Error('Unexpected provider call'); } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const endpoints = [['status', 'GET'], ['connect', 'POST'], ['callback', 'GET'], ['connection', 'DELETE'], ['saved-song', 'PUT'], ['mix', 'POST']];
  const responses = await Promise.all(endpoints.map(([path, method]) => fetch(`http://127.0.0.1:${server.address().port}/api/spotify/${path}`, { method })));
  assert.ok(responses.every(response => response.status === 404));
  assert.equal(calls, 0);
});
